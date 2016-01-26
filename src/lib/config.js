'use strict';

var isFirefox = typeof require !== 'undefined';
var config;
if (isFirefox) {
  var app = require('./firefox/firefox.js');
  config = exports;
}
else {
  config = {};
}

config.welcome = {
  get version () {
    return app.storage.read('version');
  },
  set version (val) {
    app.storage.write('version', val);
  },
  timeout: 3
};

config.filter = {
  split: 8
};

config.urls = {
  welcome: 'http://mybrowseraddon.com/facebook-disconnect.html'
};

// Complex get and set
config.get = function (name) {
  return name.split('.').reduce(function (p, c) {
    return p[c];
  }, config);
};
config.set = function (name, value) {
  function set(name, value, scope) {
    name = name.split('.');
    if (name.length > 1) {
      set.call((scope || this)[name.shift()], name.join('.'), value)
    }
    else {
      this[name[0]] = value;
    }
  }
  set(name, value, config);
};
