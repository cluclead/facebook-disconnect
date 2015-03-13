'use strict';
// Load Firefox based resources
var self = require('sdk/self'),
    sp = require('sdk/simple-prefs'),
    buttons = require('sdk/ui/button/action'),
    tabs = require('sdk/tabs'),
    timers = require('sdk/timers'),
    loader = require('@loader/options'),
    unload = require('sdk/system/unload'),
    utils = require('sdk/tabs/utils'),
    tbExtra = require('./tbExtra'),
    {on, off, once, emit} = require('sdk/event/core'),
    {Cc, Ci, Cu, Cr} = require('chrome'),
    prefs = sp.prefs;

Cu.import('resource://gre/modules/Promise.jsm');

// Promise
exports.Promise = Promise;

// Event Emitter
exports.on = on.bind(null, exports);
exports.once = once.bind(null, exports);
exports.emit = emit.bind(null, exports);
exports.removeListener = function removeListener (type, listener) {
  off(exports, type, listener);
};

//toolbar button
exports.button = (function () {
  var onClick;
  var button = buttons.ActionButton({
    id: self.name,
    label: 'Facebook™ Seen Blocker',
    icon: {
      '16': './icons/disabled/16.png',
      '32': './icons/disabled/32.png'
    },
    onClick: function (e) {
      if (onClick) {
        onClick(e);
      }
    }
  });
  tbExtra.setButton(button);
  return {
    onCommand: function (c) {
      onClick = c;
    },
    set icon (obj) { // jshint ignore:line
      button.icon = obj;
    },
    set label (label) { // jshint ignore:line
      button.label = label;
    },
    set badge (num) { // jshint ignore:line
      tbExtra.setBadge(num);
    }
  };
})();

exports.storage = {
  read: function (id) {
    return (prefs[id] || prefs[id] + '' === 'false' || !isNaN(prefs[id])) ? (prefs[id] + '') : null;
  },
  write: function (id, data) {
    data = data + '';
    if (data === 'true' || data === 'false') {
      prefs[id] = data === 'true' ? true : false;
    }
    else if (parseInt(data) + '' === data) {
      prefs[id] = parseInt(data);
    }
    else {
      prefs[id] = data + '';
    }
  }
};

exports.tabs = (function () {
  var tmp = {};
  tmp.on = on.bind(null, tmp);
  tmp.open = function (url, inBackground, inCurrent) {
    if (inCurrent) {
      tabs.activeTab.url = url;
    }
    else {
      tabs.open({
        url: url,
        inBackground: typeof inBackground === 'undefined' ? false : inBackground
      });
    }
  };
  tmp.activeId = function () {
    return Promise.resolve(tabs.activeTab.id);
  };
  tabs.on('activate', function (tab) {
    emit(tmp, 'activate', tab.id);
  });
  tabs.on('ready', function (tab) {
    emit(tmp, 'ready', tab.id);
  });
  return tmp;
})();

exports.get = function (url) {
  var d = new Promise.defer();
  var req = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
    .createInstance(Ci.nsIXMLHttpRequest);
  req.open('GET', url, true);
  req.onreadystatechange = function () {
    if (req.readyState === 4) {
      if (req.status !== 200) {
        d.reject(new Error(req.statusText));
      }
      else {
        d.resolve(req.responseText);
      }
    }
  };
  req.send();
  return d.promise;
};

exports.version = function () {
  return self.version;
};

exports.timer = timers;

exports.getURL = function (path) {
  return loader.prefixURI + loader.name + '/' + path;
};

exports.block = (function () {
  var block, registered = false, observerService = Cc['@mozilla.org/observer-service;1']
    .getService(Ci.nsIObserverService);
  var httpRequestObserver = {
    observe: function (subject, topic, data) { // jshint ignore:line
      if (!block) {
        return;
      }
      var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (!httpChannel.notificationCallbacks) {
        return;
      }
      var interfaceRequestor = httpChannel.notificationCallbacks.QueryInterface(Ci.nsIInterfaceRequestor);
      var loadContext;
      try {
        loadContext = interfaceRequestor.getInterface(Ci.nsILoadContext);
      }
      catch (ex) {
        try {
          loadContext = subject.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext);
        }
        catch (ex2) {
          loadContext = null;
        }
      }
      if (loadContext) {
        var contentWindow = loadContext.associatedWindow;
        var tab = utils.getTabForContentWindow(contentWindow.top);
        var tabId = utils.getTabId(tab);
        var loc = contentWindow.top.document.location;

        if (block(
          {url: httpChannel.URI.spec, host: httpChannel.URI.host, tabId: tabId},
          {url: loc.href, host: loc.host})
        ) {
          subject.cancel(Cr.NS_BINDING_ABORTED);
        }
      }
    }
  };

  function refresh (e, unload) {
    if (prefs.enabled && !unload) {
      registered = true;
      observerService.addObserver(httpRequestObserver, 'http-on-modify-request', false);
    }
    else {
      if (registered) {
        observerService.removeObserver(httpRequestObserver, 'http-on-modify-request');
      }
      registered = false;
    }
  }
  unload.when(function () {
    refresh(null, true);
  });
  sp.on('enabled', refresh);
  refresh();
  return function (c) {
    block = c;
  };
})();
