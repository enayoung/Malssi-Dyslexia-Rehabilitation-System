/*
 * ✏️ 쓰기 — 단어 (단어 쓰기 훈련 310)
 *  비슷한 소리 두 낱말 비교(311) → 자음·모음 타일로 만들기(312) → 뜻 있는 다른 낱말이면 그림 피우기(313)
 *  콘텐츠(낱말·타일): js/content/write-word.js
 */
(function () {
  'use strict';
  var H = SG.hangul, D = SG.data, E = SG.engine, S = SG.speech, ST = SG.store, SEED = SG.seed, C = SG.core;
  var T = E.TYPE;
  var el = C.el, shuffle = C.shuffle, wait = C.wait, img = C.img, panel = C.panel, inputMode = C.inputMode, addExp = C.addExp;
  var TargetDisplay = C.TargetDisplay, modelVoice = C.modelVoice, TaskRun = C.TaskRun;
  var activityHeader = C.activityHeader, exitCurrent = C.exitCurrent, micButton = C.micButton, runQueue = C.runQueue;
  var heldFirst = C.heldFirst, isHeld = C.isHeld, roundDone = C.roundDone, goHome = C.goHome;

  function startWordWriting() {
    exitCurrent();
    var tasks = heldFirst('ww', D.WORD_WRITING, 4);
    runQueue(tasks, function (t, next) { wordCompare(t, next); },
      function () { roundDone('씨앗이 글자를 배웠어요!', startWordWriting); });
  }

  /** 311: 유사 음소 두 단어 비교 */
  function wordCompare(task, next) {
    panel.innerHTML = '';
    panel.appendChild(activityHeader('단어 쓰기'));
    var diffs = H.diffJamo(task.target, task.contrast);
    var cmp = el('div', { class: 'compare intro' });
    [task.target, task.contrast].forEach(function (w, k) {
      var d = H.decompose(w);
      var jr = el('div', { class: 'cmp-jamo big' }, ['cho', 'jung', 'jong'].filter(function (p) { return d[p]; }).map(function (p) {
        return el('span', { class: diffs.some(function (x) { return x.pos === p; }) ? 'hit' : '', text: d[p] });
      }));
      cmp.appendChild(el('div', { class: 'cmp-side' }, [
        el('div', { class: 'cmp-img', text: img(w) }), el('div', { class: 'cmp-word' }, [el('b', { text: w })]), jr,
        el('button', { class: 'mini', text: '🔊', onclick: function () { S.speak(w, 'model'); } })
      ]));
      if (k === 0) cmp.appendChild(el('div', { class: 'cmp-vs', text: '↔' }));
    });
    panel.appendChild(el('div', { class: 'card task' }, [cmp,
      el('button', { class: 'btn primary', text: '‘' + task.target + '’ 만들러 가기 ✏️', onclick: function () { wordBuild(task, next); } })]));
    SEED.say('‘' + task.target + '’' + (H.hasJong(task.target) ? '과' : '와') + ' ‘' + task.contrast + '’, 소리가 조금 달라. 들어 볼래?', { intent: 'generic' });
  }

  /** 312~313: 자소 타일로 단어 만들기 */
  function wordBuild(task, next) {
    panel.innerHTML = '';
    panel.appendChild(activityHeader('단어 쓰기'));
    var sel = { cho: null, jung: null, jong: null };
    var preview = el('div', { class: 'preview', text: '　' });
    var reveal = el('div', { class: 'reveal' });
    var fbSlot = el('div', { class: 'fb-slot' });
    var rows = {};
    var send = el('button', { class: 'btn primary', text: '씨앗에게 보여주기', disabled: 'disabled' });
    var tilesWrap = el('div', { class: 'tiles' });
    var labels = { cho: '첫소리', jung: '가운데 소리', jong: '끝소리' };
    ['cho', 'jung', 'jong'].forEach(function (pos) {
      var r = el('div', { class: 'tile-row' }, [el('span', { class: 'tile-label', text: labels[pos] })]);
      shuffle(task.tiles[pos]).forEach(function (j) {
        var b = el('button', { class: 'tile' + (j ? '' : ' txt'), text: j || '없음', 'aria-label': labels[pos] + ' ' + (j || '없음') });
        b.addEventListener('click', function () {
          run.poke();
          sel[pos] = j;
          r.querySelectorAll('.tile').forEach(function (x) { x.classList.remove('sel'); });
          b.classList.add('sel');
          update();
        });
        r.appendChild(b);
      });
      rows[pos] = r; tilesWrap.appendChild(r);
    });
    function composed() { return sel.cho && sel.jung ? H.compose(sel.cho, sel.jung, sel.jong || '') : null; }
    function update() {
      var c = composed();
      preview.textContent = c || ((sel.cho || '') + (sel.jung || '') + (sel.jong || '')) || '　';
      if (c && sel.jong !== null) send.removeAttribute('disabled'); else send.setAttribute('disabled', 'disabled');
    }
    panel.appendChild(el('div', { class: 'card task' }, [
      // 그림·소리 듣기 | 만든 글자를 나란히 두어 화면 높이를 줄임
      el('div', { class: 'build-top' }, [
        el('div', { class: 'build-hint' }, [
          el('div', { class: 'pic', text: img(task.target) }),
          el('button', { class: 'btn ghost small', text: '🔊 소리 듣기', onclick: function () { run.poke(); S.speak(task.target, 'model'); } })
        ]),
        el('span', { class: 'build-arrow', text: '→' }),
        preview
      ]),
      reveal, tilesWrap, send, fbSlot
    ]));
    var run = new TaskRun({
      activity: 'ww', id: task.id, target: task.target, fbSlot: fbSlot, word: task.target, noRespMs: 15000,
      view: {
        emphasize: function (info, pointing) {
          tilesWrap.classList.add('assist');
          Object.keys(rows).forEach(function (p) { rows[p].classList.remove('emph', 'pointed'); });
          var poss = (info.jamo || []).map(function (j) { return j.pos; });
          if (!poss.length) poss = ['cho', 'jung', 'jong'];
          poss.forEach(function (p) { if (rows[p]) { rows[p].classList.add('emph'); if (pointing) rows[p].classList.add('pointed'); } });
        },
        revealTarget: function () { reveal.textContent = task.target; reveal.classList.add('show'); },
        onReached: function () { preview.classList.add('pop'); reveal.textContent = ''; }
      },
      onDone: next
    });
    send.addEventListener('click', function () {
      var c = composed(); if (!c) return;
      var res = E.classifyWord([c], task.target, D.VOCAB);
      run.respond(res);
    });
    SEED.say('‘' + task.target + '’' + (H.hasJong(task.target) ? '을' : '를') + ' 만들어 줄래? 소리 조각을 골라 봐!', { intent: 'generic' })
      .then(function () { if (C.isCurrent(run)) run.arm(); });
  }

  /* ================= 문장 쓰기 (320) ================= */

  SG.registerActivity({ key: 'write-word', order: 3, icon: '✏️', title: '단어 쓰기', desc: '소리 조각으로 낱말을 만들어요', start: startWordWriting });
})();
