/*
 * 📖 읽기 — 단어 (단어 읽기 훈련 210)
 *  1단계(211) 그림·글자·소리 함께 / 2단계(212) 그림·글자 + 소리 힌트 / 3단계(213) 글자 먼저, 그림은 나중
 *  콘텐츠(낱말 목록, 비슷한 소리 후보): js/content/read-word.js
 */
(function () {
  'use strict';
  var H = SG.hangul, D = SG.data, E = SG.engine, S = SG.speech, ST = SG.store, SEED = SG.seed, C = SG.core;
  var T = E.TYPE;
  var el = C.el, shuffle = C.shuffle, wait = C.wait, img = C.img, panel = C.panel, inputMode = C.inputMode, addExp = C.addExp;
  var TargetDisplay = C.TargetDisplay, modelVoice = C.modelVoice, TaskRun = C.TaskRun;
  var activityHeader = C.activityHeader, exitCurrent = C.exitCurrent, micButton = C.micButton, runQueue = C.runQueue;
  var heldFirst = C.heldFirst, isHeld = C.isHeld, roundDone = C.roundDone, goHome = C.goHome;

  /* ================= 단어 읽기 (210) ================= */
  function showWordReadingMenu() {
    exitCurrent();
    panel.innerHTML = '';
    panel.appendChild(activityHeader('단어 읽기'));
    var stages = [
      [1, '1단계', '그림·글자·소리를 함께 보고 따라 읽어요'],
      [2, '2단계', '그림과 글자를 보고 읽어요 (소리 힌트 있음)'],
      [3, '3단계', '글자를 먼저 읽고 그림으로 확인해요']
    ];
    panel.appendChild(el('div', { class: 'stage-list' }, stages.map(function (s) {
      return el('button', { class: 'act-tile wide', onclick: function () { startWordReading(s[0]); } }, [el('b', { text: s[1] }), el('small', { text: s[2] })]);
    })));
    SEED.say('어떤 방법으로 알려줄래?', { intent: 'generic', voice: false });
  }

  function startWordReading(stage) {
    var tasks = heldFirst('wr', D.WORD_READING, 5);
    runQueue(tasks, function (task, next) { wordReadingTask(task, stage, next); },
      function () { roundDone('씨앗이 새로운 말을 배웠어요!', function () { startWordReading(stage); }); });
  }

  function wordReadingTask(task, stage, next) {
    var word = task.word, mode = inputMode();
    panel.innerHTML = '';
    panel.appendChild(activityHeader('단어 읽기 · ' + stage + '단계'));
    var pic = el('div', { class: 'pic' + (stage === 3 ? ' hidden-pic' : ''), text: stage === 3 ? '❔' : img(word) });
    var display = TargetDisplay(word);
    var fbSlot = el('div', { class: 'fb-slot' });
    var controls = el('div', { class: 'controls' });
    panel.appendChild(el('div', { class: 'card task' }, [pic, display.el, controls, fbSlot]));

    var run = new TaskRun({
      activity: 'wr', id: task.id, target: word, display: display, fbSlot: fbSlot, word: word,
      view: {
        emphasize: function (info, p) { display.emphasize(info, p); },
        onReached: function () { pic.textContent = img(word); pic.classList.remove('hidden-pic'); pic.classList.add('pop'); }
      },
      onDone: next
    });

    function buildControls() {
      controls.innerHTML = '';
      var m = inputMode();
      if (stage <= 2) controls.appendChild(el('button', { class: 'btn ghost', text: stage === 1 ? '🔊 다시 듣기' : '🔊 소리 힌트', onclick: function () { run.poke(); modelVoice(word, display); } }));
      if (m === 'voice') {
        var onHeard = function (alts) { run.respond(E.classifyWord(alts, word, D.VOCAB)); };
        onHeard.fallback = buildControls;
        controls.appendChild(micButton('씨앗에게 들려주기', onHeard, run));
      } else {
        // 누르기: 글자를 보고 맞는 소리를 골라 들려주기 (글자-소리 대응)
        var opts = shuffle([word].concat(D.NEIGHBORS[word] || []));
        var chosen = null;
        var row = el('div', { class: 'sound-row' });
        var send = el('button', { class: 'btn primary', text: '이 소리를 들려줄래요', disabled: 'disabled' });
        opts.forEach(function (w, i) {
          var b = el('button', { class: 'sound-btn', 'aria-label': (i + 1) + '번 소리', text: '🔊 ' + (i + 1) });
          b.addEventListener('click', function () {
            run.poke(); chosen = w;
            row.querySelectorAll('.sound-btn').forEach(function (x) { x.classList.remove('sel'); });
            b.classList.add('sel'); send.removeAttribute('disabled');
            S.speak(w, 'model');
          });
          row.appendChild(b);
        });
        send.addEventListener('click', function () { if (chosen) run.respond(E.classifyWord([chosen], word, D.VOCAB)); });
        controls.appendChild(el('p', { class: 'muted', text: '소리를 들어 보고, 글자와 같은 소리를 골라 줘요.' }));
        controls.appendChild(row); controls.appendChild(send);
      }
    }
    buildControls();
    var intro = isHeld('wr', task.id) ? '지난번에 기억해 둔 말이야. 다시 알려줄래?'
      : stage === 1 ? '이게 뭐야? 같이 들어 볼까?' : stage === 2 ? '이 글자는 어떻게 읽어?' : '이 글자를 읽어 주면 무엇인지 보여줄게!';
    SEED.react('sing');
    SEED.say(intro, { intent: 'generic' }).then(function () { if (stage === 1 && C.isCurrent(run)) return modelVoice(word, display); })
      .then(function () { if (C.isCurrent(run)) run.arm(); });
  }

  /* ================= 동화 읽기 (220) ================= */

  SG.registerActivity({ key: 'read-word', order: 1, icon: '📖', title: '단어 읽기', desc: '씨앗에게 낱말 소리를 들려줘요', start: showWordReadingMenu });
})();
