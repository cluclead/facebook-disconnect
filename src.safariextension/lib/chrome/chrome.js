'use strict';

var app = new EventEmitter();
app.on('load', function () {
  var script = document.createElement('script');
  document.body.appendChild(script);
  script.src = '../common.js';
});

app.Promise = Promise;

app.storage = (function () {
  var objs = {};
  chrome.storage.local.get(null, function (o) {
    objs = o;
    app.emit('load');
  });
  return {
    read: function (id) {
      return objs[id] + '';
    },
    write: function (id, data) {
      objs[id] = data;
      var tmp = {};
      tmp[id] = data;
      chrome.storage.local.set(tmp, function () {});
    }
  };
})();

app.button = (function () {
  var onCommand;
  chrome.browserAction.onClicked.addListener(function () {
    if (onCommand) {
      onCommand();
    }
  });
  return {
    onCommand: function (c) {
      onCommand = c;
    },
    set icon (obj) {
      chrome.browserAction.setIcon(obj);
    },
    set label (label) {
      chrome.browserAction.setTitle({
        title: label
      });
    },
    set badge (num) {
      chrome.browserAction.setBadgeText({
        text: num ? num + '' : ''
      });
      chrome.browserAction.setBadgeBackgroundColor({
        color: config.ui.backgroundColor
      });
    }
  };
})();

app.tabs = (function () {
  var tmp = new EventEmitter();
  tmp.open = function (url, inBackground, inCurrent) {
    if (inCurrent) {
      chrome.tabs.update(null, {url: url});
    }
    else {
      chrome.tabs.create({
        url: url,
        active: typeof inBackground === 'undefined' ? true : !inBackground
      });
    }
  };
  tmp.activeId = function () {
    return new app.Promise(function (resolve) {
      chrome.tabs.query({active: true}, function (tabs) {
        var activeTab = tabs.reduce(function (p, c) {
          return p || (c.selected ? c : null);
        }, null) || tabs[0];
        resolve(activeTab ? activeTab.id : -1);
      });
    });
  };
  chrome.tabs.onActivated.addListener(function (activeInfo) {
    tmp.emit('activate', activeInfo.tabId);
  });
  chrome.tabs.onUpdated.addListener(function (tabId) {
    tmp.emit('ready', tabId);
  });
  return tmp;
})();

app.get = function (url) {
  var xhr = new XMLHttpRequest();
  var d = app.Promise.defer();
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status !== 200) {
        d.reject(new Error(xhr.statusText));
      }
      else {
        d.resolve(xhr.responseText);
      }
    }
  };
  xhr.open('GET', url, true);
  xhr.send();
  return d.promise;
};

app.version = function () {
  return chrome[chrome.runtime && chrome.runtime.getManifest ? 'runtime' : 'extension'].getManifest().version;
};

app.timer = window;

app.getURL = function (path) {
  return chrome.extension.getURL(path);
};

app.block = (function () {
  var block, uris = {};
  var listener = function (details) {
    var url = details.url, host = url.split('//').slice(0,2).pop().split('/').shift();
    // detect top level url
    if (details.type === 'main_frame') {
      uris[details.tabId] = {url: url, host: host};
    }
    if (block && uris[details.tabId] && block({url: url, host: host, tabId: details.tabId}, uris[details.tabId])) {
      return {cancel: true};
    }
  };
  function refresh () {
    if (app.storage.read('enabled') === 'true') {
      chrome.webRequest.onBeforeRequest.addListener(listener, {urls: ['<all_urls>']}, ['blocking']);
    }
    else {
      chrome.webRequest.onBeforeRequest.removeListener(listener);
    }
  }

  app.on('load', refresh);
  chrome.storage.onChanged.addListener(function (changes) {
    if (changes.enabled) {
      refresh();
    }
  });

  return function (c) {
    block = c;
  };
})();
