'use strict';

var isFirefox = typeof require !== 'undefined';
var filter;
if (isFirefox) {
  filter = exports;
  var app = require('../firefox/firefox');
}
else {
  filter = {};
}

(function () {
  var keywords;

  function toDomain (url) {
    var host = url.split('//').slice(0, 2).pop().split('/').shift();
    var domain = /[\w\-]+((\.\w{2,3})+)$/.exec(host);
    return domain && domain.length ? domain[0].replace(/\^/g, '').replace(/\*/g, '') : host;
  }

  function check (rule, u, t) {
    var code = rule[0],
      exceptions = rule[1],
      ud = toDomain(u.host),
      td = toDomain(t.host);

    if (exceptions.length) { // there are exceptions
      if (exceptions.indexOf('third-party') !== -1) {
        if (ud === td) {
          return false;
        }
      }
      if (exceptions.indexOf('~third-party') !== -1) {
        if (ud !== td) {
          return false;
        }
      }
      var dEx = exceptions.filter(function (e) {
        return e.indexOf('domain=') !== -1;
      })[0];
      if (dEx) {
        var domains = dEx.substr(7).split('|');
        var w = domains.filter(function (d) {
          return d[0] === '~';
        })
        .map(function (d) {
          return d.substr(1);
        });
        if (w.length && w.indexOf(td) !== -1) {
          return false;
        }
        var b = domains.filter(function (d) {
          return d[0] !== '~';
        });
        if (b.length && b.indexOf(td) === -1) {
          return false;
        }
      }
    }
    code = code.replace(/([\:\/\.\?])/g, '\\$1') // special chars
      .replace(/^\|\|/, '[\\.\\/]')  // ||
      .replace(/\^/g, '[^\\w\\d\\_\\-\\.\\%]') // ^
      .replace(/\*/g, '.*') // *
      .replace(/^\|/, '^')  // |...
      .replace(/\|$/, '$'); // ...|
    return new RegExp(code, 'i').test(u.url);
  }

  filter.initialize = function () {
    keywords = {
      "api-read.":{"api-read.facebook.com/restserver.php?api_key=":[[],[["||api-read.facebook.com/restserver.php?api_key=",["third-party"]]]]},
      "api.faceb":{"api.facebook.com":[[],[["||api.facebook.com^",["third-party"]]]]},"badge.fac":{"badge.facebook.com":[[],[["||badge.facebook.com^",["third-party"]]]]},
      "connect.f":{"connect.facebook.com":[[],[["||connect.facebook.com^",["third-party","domain=~facebook.net|~fb.com"]]]],"connect.facebook.net":[[["||connect.facebook.net*/all.js",["domain=salon.com|damnyouautocorrect.com|southpark.cc.com|sci2.tv|pogo.com|adultswim.com|interviewmagazine.com"]]],[["||connect.facebook.net^",["third-party","domain=~facebook.com|~fb.com"]]]]},
      "facebook.":{"facebook.com/connect/":[[],[["||facebook.com/connect/",["third-party"]]]],"facebook.com/dialog/oauth?display=popup":[[],[["||facebook.com/dialog/oauth?display=popup",["popup","domain=humorhub.org"]]]],"facebook.com/plugins/activity.php?":[[],[["||facebook.com/plugins/activity.php?",["third-party"]]]],"facebook.com/plugins/comments.php?":[[],[["||facebook.com/plugins/comments.php?",["third-party"]]]],"facebook.com/plugins/facepile.php?":[[],[["||facebook.com/plugins/facepile.php?",["third-party"]]]],"facebook.com/plugins/fan.php?":[[],[["||facebook.com/plugins/fan.php?",["third-party"]]]],"facebook.com/plugins/follow.php":[[],[["||facebook.com/plugins/follow.php",["third-party"]]]],"facebook.com/plugins/like.php?":[[],[["||facebook.com/plugins/like.php?",["third-party"]]]],"facebook.com/plugins/like_box.php":[[],[["||facebook.com/plugins/like_box.php",["third-party"]]]],"facebook.com/plugins/likebox.php?":[[],[["||facebook.com/plugins/likebox.php?",["third-party"]]]],"facebook.com/plugins/recommendations.php?":[[],[["||facebook.com/plugins/recommendations.php?",["third-party"]]]],"facebook.com/plugins/recommendations_bar.php?":[[],[["||facebook.com/plugins/recommendations_bar.php?",["third-party"]]]],"facebook.com/plugins/send.php?":[[],[["||facebook.com/plugins/send.php?",["third-party"]]]],"facebook.com/plugins/share_button.php?":[[],[["||facebook.com/plugins/share_button.php?",["third-party"]]]],"facebook.com/plugins/subscribe.php":[[],[["||facebook.com/plugins/subscribe.php",["third-party"]]]],"facebook.com/plugins/subscribe?":[[],[["||facebook.com/plugins/subscribe?",["third-party"]]]],"facebook.com/restserver.php?":[[],[["||facebook.com/restserver.php?*.getStats&",["third-party"]]]],"facebook.com/whitepages/wpminiprofile.php":[[],[["||facebook.com/whitepages/wpminiprofile.php",["third-party"]]]],"facebook.com/widgets/activity.php?":[[],[["||facebook.com/widgets/activity.php?",["third-party"]]]],"facebook.com/widgets/fan.php?":[[],[["||facebook.com/widgets/fan.php?",["third-party"]]]],"facebook.com/widgets/like.php?":[[],[["||facebook.com/widgets/like.php?",["third-party"]]]],"facebook.com/widgets/recommendations.php?":[[],[["||facebook.com/widgets/recommendations.php?",["third-party"]]]],"fbcdn-profile-a.akamaihd.net":[[],[["||fbcdn-profile-a.akamaihd.net^",["third-party","domain=~facebook.com"]]]],"graph.facebook.com/?id=":[[],[["||graph.facebook.com/?id=",["third-party"]]]],"graph.facebook.com":[[["||graph.facebook.com^",["xmlhttprequest","domain=theguardian.com"]]],[["||graph.facebook.com^",["xmlhttprequest","third-party"]]]],"profile.ak.fbcdn.net":[[],[["||profile.ak.fbcdn.net^",["third-party","domain=~facebook.com"]]]],"scontent-a.":[[],[["||scontent-a.*.fbcdn.net^",["third-party","domain=~facebook.com"]]]],"static.ak.fbcdn.net":[[],[["||static.ak.fbcdn.net^",["third-party","domain=~facebook.com"]]]],"akamaihd.net/rsrc.php/":[[["||akamaihd.net/rsrc.php/",["domain=facebook.com"]]],[]],"channel.facebook.com":[[["||channel.facebook.com^",["domain=facebook.com"]]],[]],"facebook.com/ajax/browse/":[[["||facebook.com/ajax/browse/",["domain=facebook.com"]]],[]],"facebook.com/ajax/bz":[[["||facebook.com/ajax/bz",["domain=facebook.com"]]],[]],"facebook.com/ajax/chat/buddy_list.php":[[["||facebook.com/ajax/chat/buddy_list.php",["domain=facebook.com"]]],[]],"facebook.com/ajax/chat/hovercard/":[[["||facebook.com/ajax/chat/hovercard/",["domain=facebook.com"]]],[]],"facebook.com/ajax/hovercard/":[[["||facebook.com/ajax/hovercard/",["domain=facebook.com"]]],[]],"facebook.com/ajax/litestand/":[[["||facebook.com/ajax/litestand/",["domain=facebook.com"]]],[]],"facebook.com/ajax/notifications/":[[["||facebook.com/ajax/notifications/",["domain=facebook.com"]]],[]],"facebook.com/ajax/pagelet/":[[["||facebook.com/ajax/pagelet/",["domain=facebook.com"]]],[]],"facebook.com/ajax/photos/":[[["||facebook.com/ajax/photos/",["domain=facebook.com"]]],[]],"facebook.com/ajax/presence/":[[["||facebook.com/ajax/presence/",["domain=facebook.com"]]],[]],"facebook.com/ajax/typeahead/":[[["||facebook.com/ajax/typeahead/",["domain=facebook.com"]]],[]],"facebook.com/ajax/webstorage/":[[["||facebook.com/ajax/webstorage/",["domain=facebook.com"]]],[]],"facebook.com/chat/":[[["||facebook.com/chat/",["domain=facebook.com"]]],[]],"facebook.com/images/":[[["||facebook.com/images/",["domain=facebook.com"]]],[]],"fbcdn-photos-":[[["||fbcdn-photos-*.akamaihd.net^",["domain=facebook.com"]]],[]],"fbcdn-profile-":[[["||fbcdn-profile-*.akamaihd.net^",["domain=facebook.com"]]],[]],"fbcdn-sphotos-":[[["||fbcdn-sphotos-*.akamaihd.net^",["domain=facebook.com"]]],[]],"fbexternal-":[[["||fbexternal-*.akamaihd.net^",["domain=facebook.com"]]],[]],"scontent-":[[["||scontent-*.fbcdn.net^",["domain=facebook.com"]]],[]]},
      "google.co":{"google.com/js/plusone.js":[[["||google.com/js/plusone.js",["domain=abcnews.go.com|watch.nba.com"]]],[["||google.com/js/plusone.js",["third-party"]]]]},
      "spot.im/e":{"spot.im/embed/scripts/launcher.js":[[],[["||spot.im/embed/scripts/launcher.js",["third-party"]]]]}
    };
    return app.Promise.resolve();
  };

  filter.match = function (url) {
    var n = url.length - 8; // keyword length is 8
    var black = [], white = [];
    for (var i = 0; i < n; i++) {
      var keyword = keywords[url.substr(i, 9)];
      if (keyword) {
        for (var fullKeyword in keyword) {
          if (url.indexOf(fullKeyword) !== -1) {
            white = white.concat(keyword[fullKeyword][0]);
            black = black.concat(keyword[fullKeyword][1]);
          }
        }
      }
    }
    return {
      black: black,
      white: white
    };
  };

  filter.block = function (keywords, u, t) {
    for (var j = 0; j < keywords.white.length; j++) {
      if (check(keywords.white[j], u, t)) {
        console.error('[passed]', keywords.white[j], u.url);
        return false;
      }
    }
    for (var l = 0; l < keywords.black.length; l++) {
      if (check(keywords.black[l], u, t)) {
        console.error('[blocked]', keywords.black[l], u.url);
        return true;
      }
    }
    return false;
  };
})();
