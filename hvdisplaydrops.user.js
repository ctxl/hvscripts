// ==UserScript==
// @name           HV - Display Drops
// @description    simple native JS companion for Track Drops
// @version        0.82.1
// @match          http://hentaiverse.org/*
// @match          http://alt.hentaiverse.org/*
// @grant          none
// @run-at         document-end
// ==/UserScript==

(function(window, document) {
  'use strict';

  var hv = {};

  hv.stamina = document.querySelector('img[title^="Stamina"]');

  // no stamina icon = nothing to do
  if (!hv.stamina) { return; }

  hv.stamina.style.cursor = 'pointer';

  hv.ui = {
    components: document.querySelectorAll('.stuffbox > div'),
    stuffbox: document.querySelector('.stuffbox'),
    trackdrops: {
      drops: document.createElement('div'),
      buttons: document.createElement('div')
    },
    visibility: {
      hide: function(_elements) {
        [].slice.call(_elements).forEach(function(_element) {
          _element.style.display = 'none';
        });
      },

      show: function(_elements) {
        [].slice.call(_elements).forEach(function(_element) {
          _element.style.display = null;
        });
      }
    }
  };

  hv.ui.trackdrops.drops.style.textAlign = 'left';
  hv.ui.trackdrops.buttons.style.textAlign = 'right';
  hv.ui.trackdrops.close =  function(e) {
    if (e.which !== 1) { return; }

    if (e.target.textContent === 'Reset') {
      if (!confirm('Are you sure?')) { return; }

      window.localStorage.removeItem('_hvtd-data');
    }

    while (hv.ui.trackdrops.buttons.firstChild) {
      hv.ui.trackdrops.buttons.removeChild(hv.ui.trackdrops.buttons.firstChild);
    }

    while (hv.ui.trackdrops.drops.firstChild) {
      hv.ui.trackdrops.drops.removeChild(hv.ui.trackdrops.drops.firstChild);
    }

    hv.ui.stuffbox.removeChild(hv.ui.trackdrops.drops);
    hv.ui.visibility.show(hv.ui.components);
  };

  // hv.equipment = {
  //   trash: ['Crude',
  //           'Fair',
  //           'Average',
  //           'Superior']
  // };

  hv.drops = {
    // A89000': 'Credits',
    // 00B000': 'Potions',
    // BA05B4': 'Crystals',
    // FF0000': 'Equipment',
    // 489EFF': 'Monster Food', // and pills
    // 0000FF': 'Artifacts', // and collectibles
    // 254117': 'Tokens', // and soul fragments (+ materials?)
    // 461B7E': 'Trophies',
    parse: function(_data) {
      var _drops = {};

      _data.forEach(function(_entry) {

        var _difficulty = _entry.d;
        var _origin = _entry.o;
        var _drop = _entry.r;

        _drop.forEach(function(_item) {

          var _text = _item.t;

          // battle drop
          if (_difficulty) {

            if (!_drops[_difficulty]) { _drops[_difficulty] = {}; }

            var _color = _item.c;
            if (!_drops[_difficulty][_color]) { _drops[_difficulty][_color] = {}; }

            _drops[_difficulty][_color][_text] = (_drops[_difficulty][_color][_text] || 0) + 1;

          } else

          // out-of-battle drop
          if (_origin) {

            if (!_drops[_origin]) { _drops[_origin] = {}; }

            _drops[_origin][_text] = (_drops[_origin][_text] || 0) + 1;

          }

        });
      });

      return _drops;
    }
  };

  hv.stamina.addEventListener('click', function(e) {

    if (e.which !== 1) { return; }

    hv.ui.visibility.hide(hv.ui.components);

    var _data = JSON.parse(localStorage.getItem('_hvtd-data')) || [];

    if (_data.length === 0) {

      var _nodrops = document.createElement('div');
      _nodrops.textContent = 'no drops :(';
      _nodrops.style.cssText = 'font-size:15pt;padding:30px;';

      hv.ui.trackdrops.drops.appendChild(_nodrops);
      hv.ui.stuffbox.appendChild(hv.ui.trackdrops.drops);

      window.setTimeout(function() {
        hv.ui.trackdrops.drops.removeChild(_nodrops);
        hv.ui.stuffbox.removeChild(hv.ui.trackdrops.drops);
        hv.ui.visibility.show(hv.ui.components);
      }, 2000);

    } else {

      var _drops = hv.drops.parse(_data);
      var _sections = {};

      // difficulty, salvage, snowflake, etc
      for (var _source in _drops) {

        // create source (difficulty/shrine/etc) container
        if (!_sections[_source]) {
          _sections[_source] = document.createElement('ul');
          _sections[_source].style.listStyle = 'none';
          _sections[_source].style.paddingLeft = '0';
        }

        var _items = [];

        // _item can be a string (drop) or object (drop category)
        for (var _item in _drops[_source]) {
          var _count;
          var _text;

          // drop category (credits, potions, etc.)
          if (typeof _drops[_source][_item] === 'object') {
            var _color = _item;

            for (var _drop in _drops[_source][_item]) {
              _count = _drops[_source][_item][_drop];
              _text = '<span style="font-weight:bold;color:#' + _color + '">' + _drop +
                      '</span> (' + _count + ')';

              _items.push(_text);
            }

          } else { // otherwise a drop
            _count = _drops[_source][_item];
            _text = '<span style="font-weight:bold;">' + _item + '</span> (' + _count + ')';
            _items.push(_text);
          }

        }

        _sections[_source].innerHTML = '<li>' + _items.join('</li><li>') + '</li>';

      }

      for (var _section in _sections) {

        var _container = document.createElement('ul');
        _container.style.display = 'inline';
        _container.style.float = 'left';
        _container.style.listStyle = 'none';
        _container.style.paddingLeft = '10px';

        var _label = document.createElement('li');
        _label.textContent = _section;
        _label.style.textDecoration = 'underline';

        _container.appendChild(_label);
        _container.appendChild(_sections[_section]);

        hv.ui.trackdrops.drops.appendChild(_container);

      }

      var _reset = document.createElement('a'); _reset.textContent = 'Reset';
      var _close = document.createElement('a'); _close.textContent = 'Close';

      _reset.style.cssText = _close.style.cssText = 'cursor:pointer;text-decoration:underline;margin:5px;';

      [_reset, _close].forEach(function(_button) {
        _button.addEventListener('click', hv.ui.trackdrops.close, false);
        hv.ui.trackdrops.buttons.appendChild(_button);
      });

      hv.ui.trackdrops.drops.appendChild(hv.ui.trackdrops.buttons);

      hv.ui.stuffbox.appendChild(hv.ui.trackdrops.drops);

    }

  });

})(window, document);
