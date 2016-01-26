'use strict';
// Load Firefox based resources
var self = require('sdk/self'),
    sp = require('sdk/simple-prefs'),
    tabs = require('sdk/tabs'),
    timers = require('sdk/timers'),
    loader = require('@loader/options'),
    unload = require('sdk/system/unload'),
    tUtils = require('sdk/tabs/utils'),
    wUtils = require('sdk/window/utils'),
    buttons = require('sdk/ui/button/action'),
    {resolve} = require('sdk/core/promise'),
    {viewFor} = require('sdk/view/core'),
    {on, off, once, emit} = require('sdk/event/core'),
    {Cu} = require('chrome'),
    prefs = sp.prefs;

var {WebRequest} = Cu.import('resource://gre/modules/WebRequest.jsm', {});

// Promise
exports.Promise = {resolve};

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
    badgeColor: '#1f88e1',
    onClick: function (e) {
      if (onClick) {
        onClick(e);
      }
    }
  });

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
      button.state('window', {
        badge: num || ''
      });
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
  var cache = new WeakMap();
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
    let tab = tabs.activeTab;
    if (cache.get(tab)) {
      return resolve(cache.get(tab));
    }
    if (tab) {
      let win = tUtils.getTabContentWindow(viewFor(tab));
      if (win) {
        let id = wUtils.getOuterId(win);
        if (id) {
          cache.set(tab, id);
        }
        return resolve(id);
      }
    }
    return null;
  };
  tabs.on('activate', function (tab) {
    emit(tmp, 'activate', tab.id);
  });
  tabs.on('ready', function (tab) {
    emit(tmp, 'ready', tab.id);
  });
  return tmp;
})();

exports.version = function () {
  return self.version;
};

exports.timer = timers;

exports.getURL = function (path) {
  return loader.prefixURI + loader.name + '/' + path;
};

exports.block = (function () {
  let block, uris = {};
  let listener = function (details) {
    if (!details.browser) {
      return;
    }
    let url = details.url, host = url.split('//').slice(0,2).pop().split('/').shift();
    // detect top level url
    if (details.type === 'main_frame') {
      uris[details.windowId] = {url: url, host: host};
    }
    if (block && uris[details.windowId] && block({url: url, host: host, tabId: details.windowId}, uris[details.windowId])) {
      return {cancel: true};
    }
  };
  function refresh () {
    if (prefs.enabled) {
      WebRequest.onBeforeRequest.addListener(listener, {}, ['blocking']);
    }
    else {
      WebRequest.onBeforeRequest.removeListener(listener);
    }
  }

  refresh();
  sp.on('enabled', refresh);
  unload.when(() => WebRequest.onBeforeRequest.removeListener(listener));

  return function (c) {
    block = c;
  };
})();
