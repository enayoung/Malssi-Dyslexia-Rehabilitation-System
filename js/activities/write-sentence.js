/*
 * 🧩 쓰기 — 문장 (문장 쓰기 훈련 320)
 *  빈칸 채우기(321) / 카드 늘어놓기(322) / 그림 보고 만들기(323) / 이상한 말 찾기
 *  콘텐츠(문장 과제): js/content/write-sentence.js
 */
(function () {
  'use strict';
  var H = SG.hangul, D = SG.data, E = SG.engine, S = SG.speech, ST = SG.store, SEED = SG.seed, C = SG.core;
  var T = E.TYPE;
  var el = C.el, shuffle = C.shuffle, wait = C.wait, img = C.img, panel = C.panel, inputMode = C.inputMode, addExp = C.addExp;
  var TargetDisplay = C.TargetDisplay, modelVoice = C.modelVoice, TaskRun = C.TaskRun;
  var activityHeader = C.activityHeader, exitCurrent = C.exitCurrent, micButton = C.micButton, runQueue = C.runQueue;
  var heldFirst = C.heldFirst, isHeld = C.isHeld, roundDone = C.roundDone, goHome = C.goHome;

  function startSentenceWriting() {
    exitCurrent();
    var order = { blank: 0, arrange: 1, picture: 2, odd: 3 };
    var held = ST.heldIds('sw');
    var byKind = {};
    shuffle(D.SENTENCE_WRITING).forEach(function (t) { (byKind[t.kind] = byKind[t.kind] || []).push(t); });
    // 보류 과제 먼저, 그다음 단계별 하나씩
    var tasks = D.SENTENCE_WRITING.filter(function (t) { return held.indexOf(t.id) >= 0; });
    Object.keys(order).forEach(function (k) {
      var t = (byKind[k] || []).filter(function (x) { return tasks.indexOf(x) < 0; })[0];
      if (t) tasks.push(t);
    });
    runQueue(tasks, function (t, next) { sentenceWriteTask(t, next); },
      function () { roundDone('씨앗이 문장을 배웠어요!', startSentenceWriting); });
  }

  function sentenceWriteTask(task, next) {
    panel.innerHTML = '';
    var titles = { blank: '빈칸 채우기', arrange: '카드 늘어놓기', picture: '그림 보고 문장 만들기', odd: '이상한 말 찾기' };
    panel.appendChild(activityHeader('문장 쓰기 · ' + titles[task.kind]));
    var fbSlot = el('div', { class: 'fb-slot' });
    var body = el('div', { class: 'sw-body' });
    var reveal = el('div', { class: 'reveal' });
    var display = null;
    var picEl = el('div', { class: 'pic small', text: task.kind === 'odd' ? '🔎' : task.img });
    if (task.kind === 'picture') picEl.classList.add('big');
    panel.appendChild(el('div', { class: 'card task' }, [picEl, body, reveal, fbSlot]));

    var targetSentence = task.kind === 'odd'
      ? task.sentence.map(function (w, i) { return i === task.oddIndex ? task.target : w; }).join(' ')
      : task.target;

    var run = new TaskRun({
      activity: 'sw', id: task.id, target: targetSentence, sayTarget: '내가 궁금한 말', sentence: true, fbSlot: fbSlot, noRespMs: 20000,
      view: {
        emphasize: function (info, pointing) {
          body.classList.add('assist');
          // 혼동되는 낱말 카드의 다른 글자를 굵게
          if (info.word) {
            body.querySelectorAll('.wcard').forEach(function (c) {
              var w = c.getAttribute('data-w');
              if (H.jamoDistance(w.slice(0, info.word.length), info.word) <= 2) {
                c.innerHTML = '';
                w.split('').forEach(function (ch, i) {
                  var hit = (info.jamo || []).some(function (j) { return j.index - targetSentence.indexOf(info.word) === i; });
                  c.appendChild(el('span', { class: hit ? 'emph' : '', text: ch }));
                });
                if (pointing) c.classList.add('pointed');
              }
            });
          }
        },
        revealTarget: function () {
          reveal.innerHTML = '';
          display = TargetDisplay(targetSentence, { sentence: true });
          run.o.display = display;
          reveal.appendChild(display.el); reveal.classList.add('show');
        },
        onReached: function () { picEl.textContent = task.img; picEl.classList.add('pop'); }
      },
      onDone: next
    });

    function respondBuilt(built) {
      run.respond(E.classifySentence([built], targetSentence, D.VOCAB, { alternates: task.alternates, accept: task.accept, exact: true }));
    }

    if (task.kind === 'blank') {
      var blank = el('span', { class: 'blank', text: '　　' });
      var chosen = null;
      var line = el('div', { class: 'frame' }, task.frame.map(function (w) { return w === '___' ? blank : el('span', { text: w }); }));
      var send = el('button', { class: 'btn primary', text: '씨앗에게 보여주기', disabled: 'disabled' });
      var cards = el('div', { class: 'cards' }, shuffle(task.candidates).map(function (w) {
        return el('button', { class: 'wcard', 'data-w': w, text: w, onclick: function () {
          run.poke(); chosen = w; blank.textContent = w; blank.classList.add('filled'); send.removeAttribute('disabled');
        } });
      }));
      send.addEventListener('click', function () {
        if (!chosen) return;
        respondBuilt(task.frame.map(function (w) { return w === '___' ? chosen : w; }).join(' '));
      });
      body.appendChild(line); body.appendChild(cards); body.appendChild(send);
      SEED.say('빈칸에 어떤 말이 들어가면 좋을까?', { intent: 'generic' }).then(function () { if (C.isCurrent(run)) run.arm(); });
    } else if (task.kind === 'arrange' || task.kind === 'picture') {
      var answer = el('div', { class: 'answer-line' });
      var pool = el('div', { class: 'cards' });
      var send2 = el('button', { class: 'btn primary', text: '씨앗에게 보여주기', disabled: 'disabled' });
      var picked = [];
      function refresh() {
        answer.innerHTML = '';
        if (!picked.length) answer.appendChild(el('span', { class: 'muted', text: '카드를 눌러 순서대로 놓아요' }));
        picked.forEach(function (w, i) {
          answer.appendChild(el('button', { class: 'wcard placed', 'data-w': w, text: w, onclick: function () { run.poke(); picked.splice(i, 1); refresh(); } }));
        });
        pool.querySelectorAll('.wcard').forEach(function (c) { c.disabled = picked.indexOf(c.getAttribute('data-w')) >= 0; });
        var ready = task.kind === 'arrange' ? picked.length === task.cards.length : picked.length >= 2;
        if (ready) send2.removeAttribute('disabled'); else send2.setAttribute('disabled', 'disabled');
      }
      shuffle(task.cards).forEach(function (w) {
        pool.appendChild(el('button', { class: 'wcard', 'data-w': w, text: w, onclick: function () { run.poke(); if (picked.indexOf(w) < 0) { picked.push(w); refresh(); } } }));
      });
      send2.addEventListener('click', function () { respondBuilt(picked.join(' ')); });
      refresh();
      body.appendChild(answer); body.appendChild(pool); body.appendChild(send2);
      SEED.say(task.kind === 'arrange' ? '카드를 순서대로 놓아서 문장을 만들어 줄래?' : '그림을 보고 어떤 일이 있는지 문장으로 알려줘!', { intent: 'generic' })
        .then(function () { if (C.isCurrent(run)) run.arm(); });
    } else if (task.kind === 'odd') {
      var phase = 'find';
      var words = el('div', { class: 'frame odd' });
      var cands = el('div', { class: 'cards' });
      task.sentence.forEach(function (w, i) {
        words.appendChild(el('button', { class: 'oddw', text: w, onclick: function () {
          if (phase !== 'find') return;
          run.poke();
          if (i === task.oddIndex) {
            phase = 'fix';
            this.classList.add('found');
            SEED.react('surprise');
            SEED.say('아, 이 말이 이상했구나! 어떤 말로 바꿔 줄까?', { intent: 'generic' });
            task.candidates.forEach(function (c) {
              cands.appendChild(el('button', { class: 'wcard', 'data-w': c, text: c, onclick: function () { pickFix(c); } }));
            });
          } else {
            SEED.react('tilt');
            SEED.say('음, 그 말은 괜찮은 것 같아. 다른 말도 살펴볼까?', { intent: 'generic' });
          }
        } }));
      });
      function pickFix(c) {
        run.poke();
        var built = task.sentence.map(function (w, i) { return i === task.oddIndex ? c : w; }).join(' ');
        if (c === task.target) { run.respond({ type: T.REACHED }); return; }
        var alt = task.alternates[c];
        var tw = E.stemOf(task.target, D.VOCAB);
        if (alt) {
          run.respond({ type: T.MEANINGFUL, heard: built, word: alt.word, targetWord: tw, image: alt.img, diffs: H.diffJamo(tw, alt.word) });
        } else {
          run.respond({ type: T.NONSENSE, heard: built, diffs: [] });
        }
      }
      body.appendChild(words); body.appendChild(cands);
      SEED.say('이 문장에 어색한 말이 하나 숨어 있어. 찾아 줄래?', { intent: 'generic' }).then(function () { if (C.isCurrent(run)) run.arm(); });
    }
  }

  SG.registerActivity({ key: 'write-sentence', order: 4, icon: '🧩', title: '문장 쓰기', desc: '낱말 카드로 문장을 만들어요', start: startSentenceWriting });
})();
