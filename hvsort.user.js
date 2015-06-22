// ==UserScript==
// @name           HV - Sort
// @description    a b c 1 2 3 sorts shop equips and etc.
// @version        0.82.5
// @match          http://hentaiverse.org/?s=Bazaar&ss=es*
// @match          http://alt.hentaiverse.org/?s=Bazaar&ss=es*
// @grant          none
// @run-at         document-end
// ==/UserScript==

// NOTE: only applies to Bazaar -> Equipment Shop pages
// NOTE: the UI only supports one 'hide' option

// default shop pane behavior
// - hide untradable items and those with level gap over ±50,
// - everything that isn't hidden is sorted by descending quality

// default player pane behavior
// - sorts player inventory by descending quality
// - doesn't hide any items

(function() {
  'use strict';

  // NOTE: you can change the default behavior here
  // NOTE: you can specify multiple 'hide' options here
  var config = {
    playerPane: {
      sortBy: ['quality'],
      hide: ['none']
    },
    shopPane: {
      sortBy: ['quality'],
      hide: ['level gap over ±50', 'untradeable']
    }
  };

  var shop = {
    items: {},
    pane: document.getElementById('shop_pane'),
    header: document.querySelector('#rightpane .fd4 div')
  };

  var player = {
    items: {},
    pane: document.getElementById('item_pane'),
    header: document.querySelector('#leftpane .fd4 div'),
    level: document
      .querySelector('.clb .cit[style="position:relative; z-index:999"] + .cit + .cit')
        .textContent.split(' ')[1]
  };

  shop.items.list = shop.pane.querySelectorAll('.eqp, .eqpp');
  player.items.list = player.pane.querySelectorAll('.eqp, .eqpp');
  player.level = parseInt(player.level, 10);

  function r(q) {
    var s = q.match(/[^\s]+/)[0];
    switch (true) {
      case (s === 'Peerless'): return 'a' + q;
      case (s === 'Legendary'): return 'b' + q;
      case (s === 'Magnificent'): return 'c' + q;
      case (s === 'Exquisite'): return 'd' + q;
      case (s === 'Superior'): return 'e' + q;
      case (s === 'Fine'): return 'f' + q;
      case (s === 'Average'): return 'g' + q;
      case (s === 'Fair'): return 'h' + q;
      case (s === 'Crude'): return 'i' + q;
      default: return q;
    }
  }

  var sort = {
    menu: {
      player: document.createElement('span'),
      shop: document.createElement('span'),
      addText: function(_node, _text) {
        _node.appendChild(document.createTextNode(_text));
      }
    },

    hide: {
      options: ['tradeable', 'untradeable', 'level assigned', 'level unassigned', 'level gap over ±50', 'none'],
      tradeable: function(e) {
        return !!~e.childNodes[1].onmouseover.toString().indexOf('Tradeable');
      },

      untradeable: function(e) {
        return !!~e.childNodes[1].onmouseover.toString().indexOf('Untradeable');
      },

      'level assigned': function(e) {
        return !~e.childNodes[1].onmouseover.toString().indexOf('Unassigned');
      },

      'level unassigned': function(e) {
        return !!~e.childNodes[1].onmouseover.toString().indexOf('Unassigned');
      },

      'level gap over ±50': function(e) {
        var _level = e.childNodes[1].onmouseover.toString().split('&nbsp; ')[2].split(' ')[1];

        if (_level !== 'Unassigned') {
          _level = parseInt(_level, 10);
          var _diff = player.level - _level;

          if (_diff > 50 || _diff < -50) { return true; }
        }

        return false; // doesn't hide level unassigned
      },

      none: function(e) {
        return false;
      }
    },

    by: {
      options: ['quality', 'default'],
      quality: function(a, b) {
        return ((r(a.textContent) < r(b.textContent)) ? -1 : ((r(a.textContent) > r(b.textContent)) ? 1 : 0));
      },

      default: function(a, b) { return a - b; } // just for show; default sort has special handling
    },

    apply: function(_pane, _hide, _sort) {
      var _items = [].slice.call(_pane.items.list);

      if (_sort !== 'default') {
        _items.sort(sort.by[_sort]);
      }

      _items.forEach(function(e) {
        if (e.className === 'eqpp') { e.style.width = '557px'; } // default: 558px

        e.style.display = null;
      });

      _items.forEach(function(e) {
        _hide.forEach(function(d) {
          if (sort.hide[d](e)) {
            e.style.display = 'none';
          }
        });
      });

      _items.forEach(function(e) {
        if (_sort[0] !== 'default') {
          e.className = 'eqp';
        } else {
          if (e.style.width === '557px') { e.className = 'eqpp'; } // restores default spacing
        }

        if (_pane === player) { e.firstChild.className = 'iu'; }

        _pane.pane.appendChild(e);
      });

      if (_hide.length > 1) {
        shop.header.querySelector('span > span > span').innerHTML = _hide.join(', ');
      }
    },

    update: function(y) {
      var _options = y.target;
      var z = _options.parentNode;

      z.firstChild.style.display = null;
      z.firstChild.innerHTML = _options.children[_options.selectedIndex].innerHTML;

      var _header = _options.parentNode.parentNode;
      var _hide = _header.childNodes[1].childNodes[0].innerHTML.split(', ');
      var _sort = _header.childNodes[3].childNodes[0].innerHTML;

      if (_header.parentNode.parentNode.parentNode.parentNode.id === 'rightpane') {
        sort.apply(shop, _hide, [_sort]);
      } else {
        sort.apply(player, _hide, [_sort]);
      }

      z.removeChild(_options);
    }
  };

  (function(m, n, o) {

    sort.menu[m].hide = document.createElement('span');
    sort.menu[m].hideoption = document.createElement('span');

    sort.menu.addText(sort.menu[m], ' (hide: ');
    sort.menu.addText(sort.menu[m].hideoption, n);

    sort.menu[m].hide.appendChild(sort.menu[m].hideoption);
    sort.menu[m].hide.style.cursor = 'pointer';

    sort.menu[m].appendChild(sort.menu[m].hide);

    sort.menu.addText(sort.menu[m], ' | sort: ');

    sort.menu[m].sort = document.createElement('span');
    sort.menu[m].sortoption = document.createElement('span');

    sort.menu.addText(sort.menu[m].sortoption, o);

    sort.menu[m].sort.appendChild(sort.menu[m].sortoption);
    sort.menu[m].sort.style.cursor = 'pointer';

    ['hideoption', 'sortoption'].forEach(function(z) {
      sort.menu[m][z].addEventListener('click', function(e) {
        if (e.which !== 1) { return; }

        var x = this.parentNode.appendChild(document.createElement('select'));
        var b = (z === 'hideoption' ? 'hide' : 'by');

        sort[b].options.forEach(function(d) {
          x.appendChild(document.createElement('option')).innerHTML = d;
        });

        x.addEventListener('change', function(y) { sort.update(y); }, false);

        x.selectedIndex = sort[b].options.indexOf(this.textContent);
        this.style.display = 'none';
      });
    });

    sort.menu[m].appendChild(sort.menu[m].sort);

    sort.menu.addText(sort.menu[m], ')');

    var p = {shop: shop.header};
    p[m].appendChild(sort.menu[m]);

  })('shop', 'untradeable', 'quality');

  sort.apply(player, config.playerPane.hide, config.playerPane.sortBy);

  sort.apply(shop, config.shopPane.hide, config.shopPane.sortBy);

})();
