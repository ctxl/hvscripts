// ==UserScript==
// @name           HV - Track Drops
// @description    requires a Display Drops companion userscript
// @version        0.82.2
// @match          http://hentaiverse.org/*
// @match          http://alt.hentaiverse.org/*
// @grant          none
// @run-at         document-start
// ==/UserScript==

(function(window, document) {
  'use strict';

  var hv = {};

  document.addEventListener('DOMContentLoaded', function(e) {

    hv.stamina = document.querySelector('img[title^="Stamina"]');

    // no stamina icon = nothing to do
    if (!hv.stamina) { return; }

    hv.battle = {
      log: document.getElementById('togpane_log')
    };

    hv.message = {
      box: document.getElementById('messagebox'),
      contains: function(_value, _text) {
        return !!~_text.indexOf(_value);
      }
    };

    // not a page with drops
    if (!hv.battle.log && !hv.message.box) { return; }

    var _drops = [];
    var _timestamp = e.timeStamp;

    if (hv.message.box) {

      // use recovery form for cache reload detection
      hv.recover = {
        form: document.getElementById('recover') // null
      };

      if (hv.recover.form &&
          hv.recover.form.value !== '') { return; }

      // change form value to flag it as stale when reloaded from cache
      window.addEventListener('beforeunload', function() {
        hv.recover.form.value = '0';
      });

      hv.message.lines = hv.message.box.querySelectorAll('.fd2 div');
      hv.message.header = hv.message.lines[1].textContent.split(' ');

      hv.message.origin = function(_header, _numlines) {
        var _origin = 'Unknown';

        var _firstword = _header[0];
        var _length = _header.length - 1;
        var _lastword = _header[_length];

        // '... brought you a gift!'
        if (_lastword === 'gift!') { _origin = 'Monster Lab'; } else

        if (_firstword === 'Snowflake') {
          // Snowflake has blessed you with some of her power!
          if (_numlines === 3) { _origin = 'Artifact'; }

          // Snowflake has blessed you with an item!
          if (_numlines === 5) { _origin = 'Trophy'; }
        } else

        // Received 1x High-Grade ...
        if (_firstword === 'Received') { _origin = 'Figurine'; } else

        // Equipment salvaging results: 'Salvaged Mid-Grade Metals' ...
        if (_firstword === 'Equipment') { _origin = 'Salvage'; }

        return _origin;
      };

      hv.message.result = function(_origin, _lines) {
        var _results = [];

        if (_origin === 'Artifact') { _results.push(_lines[2].textContent); }

        if (_origin === 'Trophy') { _results.push(_lines[3].textContent); }

        if (_origin === 'Figurine' ||
            _origin === 'Salvage' ||
            _origin === 'Monster Lab') {

          for (var _result = _lines.length - 1; _result > 0; _result--) {
            var _text = _lines[_result].textContent;

            if (hv.message.contains('Received', _text) ||
                hv.message.contains('Salvaged', _text) ||
                hv.message.contains('Returned', _text)) {
              _results.push(_text);
            }

          }

        }

        return _results;

      };

      hv.message.drops = function(_origin, _lines, _drops) {

        var _results = hv.message.result(_origin, _lines);

        var _drop = {o: _origin,
                     t: _timestamp,
                     r: []};

        _results.forEach(function(_text) {
          var _result = {t: _text};

          if (_origin === 'Monster Lab') {
            var _monster = document
              .querySelector('.ms.msa > div + div > div.fd4 > div').textContent;

            _result.m = _monster;
          }

          _drop.r.push(_result);
        });

        if (_drop.r.length > 0) { _drops.push(_drop); }

      };

      var _origin = hv.message.origin(hv.message.header, hv.message.lines.length);

      hv.message.drops(_origin, hv.message.lines, _drops);

    }

    if (hv.battle.log) {

      hv.battle.button = {
        next: document.getElementById('ckey_continue')
      };

      // not a battle page with drops, exit
      if (!hv.battle.button.next) { return; }

      // challenge cleared
      if (hv.battle.button.next.tagName === 'DIV') { hv.battle.end = true; }

      // check if loaded from cache, chrome/backup method
      hv.battle.form = {
        action: document.getElementById('battleaction'), // 0
        mode: document.getElementById('battle_targetmode'), // null
        target: document.getElementById('battle_target'), // null
        subattack: document.getElementById('battle_subattack') // null
      };

      // exit if page has battle form pre-filled with non-default values
      if (hv.battle.form.action.value !== '0' ||
          hv.battle.form.mode.value !== '' ||
          hv.battle.form.target.value !== '' ||
          hv.battle.form.subattack.value !== '') { return; }

      // change form value to flag it as stale when reloaded from cache
      window.addEventListener('beforeunload', function() {
        hv.battle.form.action.value = '';
      });

      var _difficulty = document.querySelector('.cit + .cit tr + tr').textContent;

      var _round = hv.battle.log.querySelector('td').textContent;
      var _turns = hv.battle.log.querySelectorAll('tr');

      var _drop = {d: _difficulty,
                   t: _timestamp,
                   r: []};

      for (var _turn = 0; _turn < _turns.length; _turn++) {

        var _line = _turns[_turn].cells[2];

        // parse exp and clear credits
        if (_line.textContent.slice(0, 8) === 'You gain') {

          var _amount = _line.textContent.split(' ');
          _amount = parseInt(_amount[_amount.length - 2], 10);

          if (!isNaN(_amount) && _amount > 0) {

            if (_line.textContent.slice(-4) === 'EXP!') { _drop.e = _amount; } else

            if (_line.textContent.slice(-8) === 'Credits!') {
              var _credits = '[' + _amount + ' Credits]';

              var _bonus = {t: _credits,
                            c: 'A89000',
                            a: true};

              _drop.r.push(_bonus);
            }
          }
        }

        // only parse lines from current round
        if (_turns[_turn].cells[0].textContent !== _round) { break; }

        var _item = _line.querySelector('span');

        if (_item) {

          var _text = _item.textContent;
          var _color = _item.getAttribute('style');

          var _result = {t: _text};

          if (_color && _color.length > 0 && hv.message.contains('color:#', _color)) {
            _result.c = _color.replace('color:#', '');
          }

          var _monster = _item.parentNode.childNodes[0];

          if (_monster.nodeType === 3) { // text node
            _monster = _monster.nodeValue;

            if (hv.message.contains(' dropped ', _monster)) {
              _monster = _monster.replace(' dropped ', '');
              _result.m = _monster;
            } else

            if (hv.message.contains('Arena Token Bonus!', _monster) ||
                hv.message.contains('Arena Clear Bonus!', _monster)) {
              _result.a = true;
            }
          }

          _drop.r.push(_result);

        }
      }

      if (_drop.e || _drop.r.length > 0) { _drops.push(_drop); }

    }

    if (_drops.length > 0) {
      var _data = JSON.parse(window.localStorage.getItem('_hvtd-data')) || [];

      _data = _data.concat(_drops);
      _data = JSON.stringify(_data);

      window.localStorage.setItem('_hvtd-data', _data);

      // no popup, only for fresh round clears
      // to enable, console -> localStorage.setItem('_hvtd-nopopup', 'true');
      if (window.localStorage.getItem('_hvtd-nopopup') === 'true' &&
          hv.battle.log &&
          hv.battle.button.next &&
          hv.battle.button.next.getAttribute('onclick') &&
          !hv.battle.end) {
        // 1ms delay to preserve history entry
        window.setTimeout(function() {
          hv.battle.button.next.click();
        }, 1);
      }

    }

  });

})(window, document);
