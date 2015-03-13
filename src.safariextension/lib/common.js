'use strict';
// definitions:
// http://sub.name.co.uk/index.html
// domain: name.co.uk
// host: sub.name.co.uk

/**** wrapper (start) ****/
var isFirefox = typeof require !== 'undefined';

if (isFirefox) {
  var app = require('./firefox/firefox');
  var config = require('./config');
  var filter = require('./utils/filter');
}
/**** wrapper (end) ****/
var blocks = {}, tops = {};

// welcome
(function () {
  var version = config.welcome.version;
  if (app.version() !== version) {
    app.timer.setTimeout(function () {
      app.tabs.open(
        config.urls.welcome + '?v=' + app.version() +
        (version && version !== 'undefined' ? '&p=' + version + '&type=upgrade' : '&type=install')
      );
      config.welcome.version = app.version();
    }, config.welcome.timeout * 1000);
  }
})();

var onCommand = (function () {
  var state = true;
  return function (e, s) {
    if (typeof s !== 'undefined') {
      state = s;
    }
    else {
      state = !state;
    }
    var path = './icons' + (state ? '' : '/disabled');
    app.button.icon =
    isFirefox ? {
      '16': path + '/16.png',
      '32': path + '/32.png',
      '64': path + '/64.png'
    } : {
      path: '../../data/' + path + '/38.png'
    };
    app.button.label = 'Facebook™ Disconnect ' + (state ? '(enabled)' : '(disabled)');
    app.storage.write('enabled', state);
    app.emit('update-badge');
  };
})();
app.button.onCommand(onCommand);

app.on('update-badge', function () {
  if (app.storage.read('enabled') === 'false') {
    blocks = {};
    app.button.badge = 0;
    return;
  }
  app.tabs.activeId().then(function (tabId) {
    app.button.badge = blocks[tabId];
  });
});
app.tabs.on('activate', function () {
  app.emit('update-badge');
});
app.tabs.on('ready', function () {
  app.emit('update-badge');
});
app.once('install-blocker', function () {
  app.block(function (u, t) {
    // reset badge if page is reloading
    if (tops[u.tabId] !== t.url || t.url === u.url) {
      console.error('-- Tab is refreshed --', u.tabId);
      blocks[u.tabId] = 0;
      tops[u.tabId] = t.url;
      app.emit('update-badge');
    }
    // filter selection
    var keywords = filter.match(u.url);
    if (keywords.black.length) {
      if (filter.block(keywords, u, t)) {
        blocks[u.tabId] = blocks[u.tabId] ? blocks[u.tabId] + 1 : 1;
        app.emit('update-badge');
        return true;
      }
      else {
        return false;
      }
    }
  });
});

filter.initialize().then(function () {
  onCommand(null, app.storage.read('enabled') === 'false' ? false : true);
  app.emit('install-blocker');
});
