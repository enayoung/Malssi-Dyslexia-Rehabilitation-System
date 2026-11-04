/*
 * 📚 읽기 — 문장 (동화 문장 읽기 훈련 220)
 *  문장 하나씩 읽기(221·222) → 동화 완성(223) → 이해 질문(224) → 다른 답이면 관련 문장 재읽기(225)
 *  콘텐츠(동화·질문): js/content/read-sentence.js
 */
(function () {
  'use strict';
  var H = SG.hangul, D = SG.data, E = SG.engine, S = SG.speech, ST = SG.store, SEED = SG.seed, C = SG.core;
  var T = E.TYPE;
  var el = C.el, shuffle = C.shuffle, wait = C.wait, img = C.img, panel = C.panel, inputMode = C.inputMode, addExp = C.addExp;
  var TargetDisplay = C.TargetDisplay, modelVoice = C.modelVoice, TaskRun = C.TaskRun;
  var activityHeader = C.activityHeader, exitCurrent = C.exitCurrent, micButton = C.micButton, runQueue = C.runQueue;
  var heldFirst = C.heldFirst, isHeld = C.isHeld, roundDone = C.roundDone, goHome = C.goHome;

  function showStoryMenu() {
    exitCurrent();
    panel.innerHTML = '';
    panel.appendChild(activityHeader('동화 읽기'));
    panel.appendChild(el('div', { class: 'stage-list' }, D.STORIES.map(function (s) {
      return el('button', { class: 'act-tile wide', onclick: function () { startStory(s); } }, [el('span', { class: 'act-ic', text: s.cover }), el('b', { text: s.title })]);
    })));
    SEED.say('어떤 이야기를 읽어 줄래?', { intent: 'generic', voice: false });
  }

  function startStory(story) {
    var done = [];
    var book = el('div', { class: 'book' });
    var idx = 0;
    (function nextSentence() {
      if (idx >= story.sentences.length) { storyComplete(story, book); return; }
      var s = story.sentences[idx], i = idx;
      idx++;
      sentenceTask(story, s, i, book, function (outcome) {
        book.appendChild(el('p', { class: 'book-line' + (outcome === 'held' ? ' faded' : '') }, [el('span', { text: s.img + ' ' }), s.text]));
        done.push(outcome);
        nextSentence();
      });
    })();
  }

  /** 문장 하나 읽기. opt.reread: 이해 질문 후 재읽기 */
  function sentenceTask(story, s, i, book, onDone, opt) {
    opt = opt || {};
    panel.innerHTML = '';
    panel.appendChild(activityHeader('동화 읽기 · ' + story.title));
    if (book.childNodes.length && !opt.reread) panel.appendChild(el('details', { class: 'card book-wrap' }, [el('summary', { text: '지금까지 읽은 이야기' }), book]));
    var display = TargetDisplay(s.text, { sentence: true });
    if (opt.emphasizeWord) {
      var at = s.text.indexOf(opt.emphasizeWord);
      if (at >= 0) display.emphasize({ indexes: opt.emphasizeWord.split('').map(function (_, k) { return at + k; }), jamo: [] }, true);
    }
    var fbSlot = el('div', { class: 'fb-slot' });
    var controls = el('div', { class: 'controls' });
    panel.appendChild(el('div', { class: 'card task' }, [el('div', { class: 'pic small', text: s.img }), display.el, controls, fbSlot]));
    var id = story.id + '-' + i;
    var run = new TaskRun({
      activity: 'sr', id: id, target: s.text, sayTarget: '이 문장', sentence: true, display: display, fbSlot: fbSlot,
      view: { emphasize: function (info, p) { display.emphasize(info, p); } },
      onDone: onDone
    });
    function buildControls() {
      controls.innerHTML = '';
      controls.appendChild(el('button', { class: 'btn ghost', text: '🔊 들어 보기', onclick: function () { run.poke(); modelVoice(s.text, display); } }));
      if (inputMode() === 'voice') {
        var onHeard = function (alts) { run.respond(E.classifySentence(alts, s.text, D.VOCAB, {})); };
        onHeard.fallback = buildControls;
        controls.appendChild(micButton('소리 내어 읽어 주기', onHeard, run));
      } else {
        controls.appendChild(el('button', { class: 'btn primary', text: '소리 내어 다 읽었어요 ✔', onclick: function () { run.respond({ type: T.REACHED }); } }));
      }
    }
    buildControls();
    SEED.say(opt.reread ? '이 부분을 한 번 더 읽어줄래?' : (i === 0 ? '이야기를 한 줄씩 읽어 줘!' : '다음 이야기가 궁금해!'), { intent: 'reread' })
      .then(function () { if (C.isCurrent(run)) run.arm(); });
  }

  function storyComplete(story, book) {
    panel.innerHTML = '';
    panel.appendChild(activityHeader('동화 읽기 · ' + story.title));
    panel.appendChild(el('div', { class: 'card' }, [el('h3', { text: '📖 ' + story.title + ' — 완성!' }), book]));
    panel.appendChild(el('div', { class: 'row' }, [el('button', { class: 'btn primary', text: '씨앗의 질문 듣기', onclick: function () { askQuestions(story, book); } })]));
    SEED.react('happy');
    SEED.say('우리가 같이 이야기를 완성했어! 궁금한 게 있는데 물어봐도 돼?', { intent: 'generic' });
  }

  function askQuestions(story, book) {
    var qi = 0;
    (function nextQ() {
      if (qi >= story.questions.length) { roundDone('이야기를 함께 나눴어요!', function () { startStory(story); }); return; }
      var q = story.questions[qi++];
      askOne(story, q, book, 0, nextQ);
    })();
  }

  function askOne(story, q, book, tries, done) {
    panel.innerHTML = '';
    panel.appendChild(activityHeader('씨앗의 질문'));
    var choices = el('div', { class: 'choice-row' }, shuffle(q.choices).map(function (c) {
      return el('button', { class: 'choice', onclick: function () { pickAnswer(c[0]); } }, [el('span', { class: 'cmp-img', text: c[1] }), el('b', { text: c[0] })]);
    }));
    panel.appendChild(el('div', { class: 'card task' }, [el('h3', { class: 'q', text: q.q }), choices]));
    SEED.say(q.q, { intent: 'generic' });
    var started = Date.now(); var first = tries === 0;
    function pickAnswer(a) {
      choices.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      addExp(first ? E.CONFIG.exp.firstTry : E.CONFIG.exp.retry);
      C.session().attempts++;
      if (a === q.answer) {
        addExp(E.CONFIG.exp.complete); C.session().completed++; C.session().reachCount++; C.session().totalReachMs += Date.now() - started;
        SEED.react('nod');
        SEED.say('아, 그렇구나! 알려줘서 고마워!', { intent: 'reached' }).then(function () { wait(400).then(done); });
      } else if (tries >= 2) {
        SEED.react('hug');
        SEED.say('이 질문은 씨앗이 꼭 기억해 둘게. 다음에 또 이야기해 줘!', { intent: 'hold' }).then(done);
      } else {
        // 오답 표시 없이 관련 문장 재읽기 요청 (225)
        C.session().retries++;
        SEED.react('tilt');
        SEED.say('음… 내가 헷갈렸나 봐.', { intent: 'reread' }).then(function () {
          var s = story.sentences[q.ref];
          sentenceTask(story, s, q.ref, book, function () { askOne(story, q, book, tries + 1, done); },
            { reread: true, emphasizeWord: tries >= 1 ? q.answer : null });
        });
      }
    }
  }

  /* ================= 단어 쓰기 (310) ================= */

  SG.registerActivity({ key: 'read-sentence', order: 2, icon: '📚', title: '동화 읽기', desc: '문장을 읽어 동화를 완성해요', start: showStoryMenu });
})();
