'use strict';
var fs = require('fs');

var original = 'assets/original.txt';
var raw = 'assets/raw.txt';
var compiled = 'assets/compiled.txt';

function read (path, callback) {
  fs.readFile(original, function (err, data) {
    if (err) {
      throw err;
    }
    callback(data);
  });
}

function write (path, content, callback) {
  fs.writeFile(path, content, function (err) {
    if (err) {
      throw err;
    }
    if (callback) {
      callback();
    }
  });
}

function cleanup (list) {
  return list.filter(function (item) {
    return item && item[0] !== '[' && item[0] !== '!';
  })
  .filter(function (item) {
    return item.indexOf('##') === -1 && item.indexOf('#@#') === -1;
  })
  .filter(function (item) { // we do not accept regex patterns yet
    var tmp = item.indexOf('a-z') === -1 && item.indexOf('{2}');
    if (!tmp) {
      console.error('[regex]', item);
    }
    return tmp;
  });
}

function extractKeyword (str) {
  return str
    .split('$').shift()
    .replace('@@||', '^')
    .replace('@@|', '^')
    .replace('@@', '^')
    .replace('||', '^')
    .replace('|', '^')
    .replace('*', '^')
    .replace(',', '^')
    .split('^')
    .filter(function (q) {
      return q;
    })[0];
}

var len = 9, ignored = 0;

read(original, function (content) {
  content += '';
  var list = content.split(/\n\r?/);
  list = cleanup(list);
  write(raw, list.join('\n'));
  console.error('[1]');
  var keywords = list
    .map(extractKeyword)
    .filter(function (keyword, i) {
      var tmp = keyword.length >= len;
      if (!tmp) {
        ignored += 1;
        console.log('[ignoring]', ignored, list[i]);
      }
      return tmp;
    });
  var shortKeywords = keywords
    .map(function (keyword) {
      return keyword.substr(0, len);
    })
    .filter(function (k, i, l) {
      return l.indexOf(k) === i;
    });
  console.log('[2]');
  var objs = {};
  list.forEach(function (filter) {
    var keyword = shortKeywords.reduce(function (p, c) {
      return p || (filter.indexOf(c) !== -1 ? c : null);
    }, null);
    objs[keyword] = objs[keyword] || {};
    var qqq = extractKeyword(filter);
    objs[keyword][qqq] = objs[keyword][qqq] || [[], []];
    var tmp = filter.split('$');
    var code = tmp[0];
    var exceptions = tmp[1] ? tmp[1].split(',') : [];
    if (code.substr(0, 2) === '@@') {
      objs[keyword][qqq][0].push([code.replace('@@||', '||').replace('@@|', '||'), exceptions]);
    }
    else {
      objs[keyword][qqq][1].push([code, exceptions]);
    }
  });
  console.error('[3]');
  write(compiled, JSON.stringify(objs));
});
