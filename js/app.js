/* 처리 제어부(190): 화면 흐름, 과제 진행, 피드백 실행 */
(function () {
  'use strict';
  var H = SG.hangul, D = SG.data, E = SG.engine, S = SG.speech, ST = SG.store, SEED = SG.seed;
  var T = E.TYPE;

  /* ---------------- 작은 도구들 ---------------- */
  function $(sel) { return document.querySelector(sel); }
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      if (k === 'class') n.className = props[k];
      else if (k === 'text') n.textContent = props[k];
      else if (k === 'html') n.innerHTML = props[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), props[k]);
      else n.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function img(word) { return D.VOCAB[word] || '🌱'; }
  var panel = $('#panel');

  function inputMode() {
    var m = ST.get().settings.inputMode;
    if (m === 'auto') return S.recognitionSupported() ? 'voice' : 'tap';
    return m;
  }

  /* ---------------- 세션 기록 (과정 메시지용) ---------------- */
  var session;
  function newSession() {
    session = { attempts: 0, retries: 0, completed: 0, held: 0, quitEarly: false, totalReachMs: 0, reachCount: 0, bloomed: 0 };
  }
  newSession();

  /* ---------------- 성장 시각화부 ---------------- */
  var lastStage = -1;
  function updateGrowth() {
    var st = ST.get(), stage = E.stageOf(st.exp);
    $('#seed-name').textContent = st.seedName || '씨앗';
    $('#stage-name').textContent = E.STAGES[stage];
    $('#growth-fill').style.width = Math.round(E.stageProgress(st.exp) * 100) + '%';
    if (stage !== lastStage) { SEED.render(stage); lastStage = stage; }
  }
  function addExp(n) {
    var st = ST.get(), before = E.stageOf(st.exp);
    st.exp += n; ST.save();
    updateGrowth();
    var after = E.stageOf(st.exp);
    if (after > before) celebrate(after);
  }
  function celebrate(stage) {
    var ov = $('#overlay');
    ov.innerHTML = '';
    ov.appendChild(el('div', { class: 'celebrate' }, [
      el('div', { class: 'big-emoji', text: ['🌰', '🌰', '🌱', '🌿', '🪴', '🌳', '🌸'][stage] }),
      el('p', { text: '' }),
      el('p', { class: 'sub', text: '여러 번 들려준 말들이 씨앗을 키웠어요.' }),
      el('button', { class: 'btn primary', text: '좋아요', onclick: function () { ov.classList.add('hidden'); } })
    ]));
    ov.querySelector('p').textContent = H.josa(ST.get().seedName || '씨앗', '이/가') + ' ‘' + E.STAGES[stage] + '’ 모습으로 자랐어요!';
    ov.classList.remove('hidden');
    SEED.react('happy');
  }

  function renderGarden() {
    var st = ST.get(), g = $('#garden');
    g.innerHTML = '';
    var items = st.garden.slice(-12).map(function (x) { return { w: x.word, i: x.img, b: false }; })
      .concat(st.bloomed.slice(-6).map(function (x) { return { w: x.word, i: x.img, b: true }; }));
    items.forEach(function (it, k) {
      var s = el('span', { class: 'g-item' + (it.b ? ' bloomed' : ''), title: it.w, text: it.i });
      // 씨앗 양옆 정원에 심기 (가운데 씨앗 자리는 비워 둠)
      var side = k % 2 ? 1 : -1, col = Math.floor(k / 2);
      s.style.setProperty('--x', (50 + side * (22 + (col * 9) % 26)) + '%');
      s.style.setProperty('--y', (58 + (col * 17) % 30) + '%');
      g.appendChild(s);
    });
  }

  /* 유의미 대체 응답의 의미 이미지가 씨앗 주변에 '피어나는' 연출 */
  function bloomAt(emoji) {
    var layer = $('#bloom-layer');
    var b = el('span', { class: 'bloom', text: emoji });
    layer.appendChild(b);
    setTimeout(function () { b.remove(); }, 2600);
  }

  /* ---------------- 목표 표현 표시 (적응형 지원부 160) ---------------- */
  function TargetDisplay(text, opt) {
    opt = opt || {};
    var wrap = el('div', { class: 'target' + (opt.sentence ? ' sentence' : '') });
    var line = el('div', { class: 'target-line' });
    var spans = text.split('').map(function (ch) {
      var s = el('span', { class: ch === ' ' ? 'sp' : 'syl', text: ch === ' ' ? ' ' : ch });
      line.appendChild(s);
      return s;
    });
    var jamoRow = el('div', { class: 'jamo-row' });
    wrap.appendChild(line); wrap.appendChild(jamoRow);
    return {
      el: wrap, text: text,
      emphasize: function (info, pointing) {
        wrap.classList.add('assist');
        spans.forEach(function (s) { s.classList.remove('emph', 'pointed'); });
        jamoRow.innerHTML = '';
        var idx = info.indexes && info.indexes.length ? info.indexes : spans.map(function (_, i) { return i; }).filter(function (i) { return H.isSyllable(text[i]); });
        idx.forEach(function (i) { if (spans[i]) spans[i].classList.add('emph'); });
        if (pointing && spans[idx[0]]) spans[idx[0]].classList.add('pointed');
        // 강조된 음절을 자소로 풀어서 다른 자소 하이라이트
        var uniq = idx.filter(function (v, k) { return idx.indexOf(v) === k; }).slice(0, 3);
        uniq.forEach(function (i) {
          var d = H.decompose(text[i]); if (!d) return;
          var box = el('span', { class: 'jamo-box' });
          ['cho', 'jung', 'jong'].forEach(function (pos) {
            if (!d[pos]) return;
            var hit = (info.jamo || []).some(function (j) { return j.index === i && j.pos === pos; });
            box.appendChild(el('span', { class: 'jamo' + (hit ? ' hit' : ''), text: d[pos] }));
          });
          jamoRow.appendChild(box);
        });
      },
      clear: function () {
        wrap.classList.remove('assist'); jamoRow.innerHTML = '';
        spans.forEach(function (s) { s.classList.remove('emph', 'pointed', 'karaoke'); });
      },
      karaoke: function (msPer) {
        var i = 0, syl = spans.filter(function (s) { return s.className.indexOf('syl') >= 0; });
        return new Promise(function (resolve) {
          (function step() {
            syl.forEach(function (s) { s.classList.remove('karaoke'); });
            if (i >= syl.length) { resolve(); return; }
            syl[i].classList.add('karaoke'); i++;
            setTimeout(step, msPer || 420);
          })();
        });
      }
    };
  }

  /** 모델 음성 + 글자 하이라이트 */
  function modelVoice(text, display) {
    var p1 = S.speak(text, 'model');
    var p2 = display ? display.karaoke(Math.max(300, 2600 / Math.max(1, H.normalize(text).length))) : Promise.resolve();
    return Promise.all([p1, p2]);
  }

  /* ---------------- 비교 카드 (유의미 대체 응답) ---------------- */
  function compareCard(targetWord, heardWord, heardImg, diffs) {
    function side(word, emoji, which) {
      var w = el('div', { class: 'cmp-word' });
      word.split('').forEach(function (ch, i) {
        var d = H.decompose(ch);
        var hit = diffs.some(function (x) { return x.index === i; });
        var syl = el('span', { class: 'cmp-syl' + (hit ? ' hit' : '') }, [el('b', { text: ch })]);
        if (d && hit) {
          var jr = el('small', { class: 'cmp-jamo' });
          ['cho', 'jung', 'jong'].forEach(function (pos) {
            if (!d[pos]) return;
            var jh = diffs.some(function (x) { return x.index === i && x.pos === pos; });
            jr.appendChild(el('span', { class: jh ? 'hit' : '', text: d[pos] }));
          });
          syl.appendChild(jr);
        }
        w.appendChild(syl);
      });
      return el('div', { class: 'cmp-side ' + which }, [
        el('div', { class: 'cmp-img', text: emoji }), w,
        el('button', { class: 'mini', text: '🔊', 'aria-label': word + ' 듣기', onclick: function () { S.speak(word, 'model'); } })
      ]);
    }
    return el('div', { class: 'compare' }, [
      side(heardWord, heardImg, 'heard'),
      el('div', { class: 'cmp-vs', text: '↔' }),
      side(targetWord, '❔', 'goal')
    ]);
  }

  /* ================= 과제 진행기 (S500~S560) ================= */
  /**
   * o: {activity, id, target, sentence:bool, display:TargetDisplay|null, fbSlot:Element,
   *     view:{emphasize(info,pointing), onReached(res), revealTarget()}, noRespMs, gardenWord, gardenImg, onDone(outcome)}
   */
  function TaskRun(o) {
    this.o = o;
    this.attempts = 0; this.retries = 0;
    this.start = Date.now();
    this.finished = false; this.busy = false;
    this.noRespMs = o.noRespMs || (o.sentence ? E.CONFIG.noResponseSentenceMs : E.CONFIG.noResponseMs);
    this.confused = E.confusedJamoIn(o.target, ST.get().confusion);
    current = this;
    if (this.confused.length && o.view && o.view.emphasize) {
      // 혼동 음소 이력 → 처음부터 제2수준 강조 (도 6, [0047])
      o.view.emphasize({ indexes: this.confused.map(function (c) { return c.index; }), jamo: this.confused }, false);
    }
    this.arm();
  }
  var current = null;

  TaskRun.prototype.arm = function () {
    var self = this;
    clearTimeout(this.timer);
    if (this.finished) return;
    this.timer = setTimeout(function () {
      if (!self.busy && !self.finished && current === self) self.respond({ type: T.NO_RESPONSE });
    }, this.noRespMs);
  };
  TaskRun.prototype.poke = function () { this.arm(); };
  TaskRun.prototype.stop = function () { this.finished = true; clearTimeout(this.timer); if (current === this) current = null; };

  /** 사용자 이탈: 과제를 보류 목록에 저장 */
  TaskRun.prototype.abandon = function () {
    if (this.finished) return;
    ST.addHold(this.o.activity, this.o.id);
    session.quitEarly = true;
    this.record(false, true);
    this.stop();
  };

  TaskRun.prototype.record = function (reached, held) {
    ST.addHistory({ activity: this.o.activity, id: this.o.id, attempts: this.attempts, retries: this.retries,
      reached: reached, held: held, ms: Date.now() - this.start, at: new Date().toISOString() });
  };

  TaskRun.prototype.respond = function (res) {
    if (this.finished || this.busy) return Promise.resolve();
    clearTimeout(this.timer);
    var self = this, o = this.o;
    var isD = res.type === T.NO_RESPONSE;
    if (!isD) {
      this.attempts++; session.attempts++;
      if (this.attempts === 1) addExp(E.CONFIG.exp.firstTry);
      else { addExp(E.CONFIG.exp.retry); session.retries++; }
    }
    if (res.type !== T.REACHED && res.diffs && res.diffs.length) ST.recordConfusion(res.diffs);
    if (o.fbSlot) o.fbSlot.innerHTML = '';

    /* ----- 목표 도달 (A) ----- */
    if (res.type === T.REACHED) {
      this.busy = true;
      var ms = Date.now() - this.start;
      session.completed++; session.reachCount++; session.totalReachMs += ms;
      addExp(E.CONFIG.exp.complete);
      if (o.gardenWord) { ST.addGarden(o.gardenWord, o.gardenImg || img(o.gardenWord)); renderGarden(); }
      ST.removeHold(o.activity, o.id);
      this.record(true, false);
      var fb = E.buildFeedback({ type: T.REACHED, target: o.gardenWord || o.target, attempt: o.sentence ? 0 : this.attempts });
      SEED.react(fb.anim);
      if (o.view && o.view.onReached) o.view.onReached(res);
      if (o.display) o.display.clear();
      return SEED.say(fb.text, { intent: fb.intent }).then(function () { return wait(500); }).then(function () {
        self.stop(); o.onDone('reached');
      });
    }

    /* ----- 목표 미도달 (B/C/D): 지원 수준 결정 후 간접 피드백 ----- */
    this.retries++;
    var level = E.decideLevel({ type: res.type, retries: this.retries, elapsedMs: Date.now() - this.start, confusedHit: this.confused.length > 0 });
    var fb2 = E.buildFeedback({ type: res.type, level: level, target: o.sayTarget || o.target, heard: res.heard, word: res.word,
      targetWord: res.targetWord, attempt: this.retries });
    this.busy = true;
    var acts = fb2.actions;
    var chain = Promise.resolve();

    if (acts.indexOf('hold') >= 0) {
      ST.addHold(o.activity, o.id); session.held++;
      this.record(false, true);
      SEED.react('hug');
      return SEED.say(fb2.text, { intent: 'hold' }).then(function () { return wait(400); }).then(function () {
        self.stop(); o.onDone('held');
      });
    }

    SEED.react(fb2.anim);
    if (acts.indexOf('bloom') >= 0 && res.image) {
      bloomAt(res.image);
      ST.addBloom(res.word || res.heard, res.image); session.bloomed++; renderGarden();
    }
    if (acts.indexOf('compare') >= 0 && o.fbSlot) {
      var tw = res.targetWord || (o.sentence ? null : o.target);
      var hw = res.word || res.heard;
      if (tw && H.normalize(hw).length === H.normalize(tw).length) {
        o.fbSlot.appendChild(compareCard(tw, H.normalize(hw), res.image || img(hw), res.diffs || []));
      } else if (res.image) {
        o.fbSlot.appendChild(el('div', { class: 'scene-card' }, [el('div', { class: 'cmp-img', text: res.image }), el('p', { text: res.heard })]));
      }
    }
    if (acts.indexOf('emphasize') >= 0 && o.view && o.view.emphasize) {
      var info = emphasisInfo(o, res, this.confused);
      o.view.emphasize(info, acts.indexOf('point') >= 0);
      if (acts.indexOf('point') >= 0) SEED.react('point');
    }
    if (acts.indexOf('modelVoice') >= 0) {
      chain = chain.then(function () { return SEED.say('내가 먼저 들려줄게.', { intent: 'model' }); })
        .then(function () { if (o.view && o.view.revealTarget) o.view.revealTarget(); return modelVoice(o.target, o.display); })
        .then(function () { return SEED.say(fb2.text, { intent: fb2.intent }); });
    } else {
      chain = chain.then(function () { return SEED.say(fb2.text, { intent: fb2.intent }); });
    }
    return chain.then(function () {
      self.busy = false;
      if (isD) self.noRespMs = Math.min(self.noRespMs * 2, 30000); // 생각할 시간을 넉넉히
      self.arm();
    });
  };

  function emphasisInfo(o, res, confused) {
    var diffs = res.diffs || [];
    if (diffs.length) {
      var off = 0;
      if (o.sentence && res.targetWord) off = Math.max(0, o.target.indexOf(res.targetWord));
      else if (o.sentence) off = -1;
      if (off >= 0) return { indexes: diffs.map(function (d) { return d.index + off; }), jamo: diffs.map(function (d) { return { index: d.index + off, pos: d.pos }; }), word: res.targetWord };
    }
    if (confused.length) return { indexes: confused.map(function (c) { return c.index; }), jamo: confused };
    return { indexes: [], jamo: [] };
  }

  /* ---------------- 공통 화면 조각 ---------------- */
  function activityHeader(title, onExit) {
    return el('div', { class: 'act-head' }, [
      el('h2', { text: title }),
      el('button', { class: 'btn ghost small', text: '정원으로 🏡', onclick: function () { if (onExit) onExit(); goHome(); } })
    ]);
  }
  function exitCurrent() { if (current) current.abandon(); S.stopSpeaking(); S.stopListening(); }

  /** 음성 입력 버튼. onHeard(alternatives, error) */
  function micButton(label, onHeard, run) {
    var b = el('button', { class: 'btn mic', 'aria-label': label }, [el('span', { class: 'mic-ic', text: '🎤' }), el('span', { text: label })]);
    b.addEventListener('click', function () {
      if (b.disabled || (run && run.busy)) return;
      if (run) run.poke();
      b.disabled = true; b.classList.add('listening');
      SEED.react('listen');
      S.listen({ maxMs: 7000 }).then(function (r) {
        b.disabled = false; b.classList.remove('listening');
        SEED.react(null);
        if (r.error === 'not-allowed' || r.error === 'service-not-allowed' || r.error === 'network' || r.error === 'unsupported' || r.error === 'start-failed') {
          SEED.say('마이크 소리가 들리지 않아. 누르기 방법으로 알려줄래?', { intent: 'generic' });
          ST.get().settings.inputMode = 'tap'; ST.save(); updateModeBtn();
          if (onHeard.fallback) onHeard.fallback();
          return;
        }
        onHeard(r.alternatives || [], r.error);
      });
    });
    return b;
  }

  function runQueue(list, runOne, onFinish) {
    var i = 0;
    (function next() {
      if (i >= list.length) { onFinish(); return; }
      var item = list[i++];
      runOne(item, next);
    })();
  }

  function heldFirst(activity, all, n) {
    var held = ST.heldIds(activity);
    var heldTasks = all.filter(function (t) { return held.indexOf(t.id) >= 0; });
    var rest = shuffle(all.filter(function (t) { return held.indexOf(t.id) < 0; }));
    return heldTasks.concat(rest).slice(0, Math.max(n, heldTasks.length));
  }
  function isHeld(activity, id) { return ST.heldIds(activity).indexOf(id) >= 0; }

  function roundDone(title, again) {
    panel.innerHTML = '';
    panel.appendChild(el('div', { class: 'card center' }, [
      el('div', { class: 'big-emoji', text: '🌼' }),
      el('h2', { text: title }),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn primary', text: '한 번 더 할래요', onclick: again }),
        el('button', { class: 'btn', text: '정원으로 🏡', onclick: goHome })
      ])
    ]));
    SEED.react('happy');
    SEED.say('오늘 알려준 말, 잘 기억해 둘게!', { intent: 'generic' });
  }

  /* ================= 이름 짓기 (도입 활동) ================= */
  function showNaming() {
    panel.innerHTML = '';
    var input = el('input', { class: 'name-input', type: 'text', maxlength: '12', placeholder: '이름을 써 주세요', 'aria-label': '씨앗 이름' });
    function accept(name) {
      name = (name || '').trim() || '새싹이';
      ST.get().seedName = name; ST.save(); updateGrowth();
      SEED.react('happy');
      addExp(E.CONFIG.exp.firstTry);
      SEED.say('와, 내 이름은 ' + name + '! 정말 마음에 들어. 고마워!', { intent: 'reached' }).then(goHome);
    }
    var kids = [
      el('h2', { text: '씨앗에게 이름을 지어 주세요' }),
      el('p', { class: 'muted', text: '어떤 이름이든 좋아요.' })
    ];
    if (inputMode() === 'voice') {
      kids.push(micButton('이름 말해 주기', function (alts) { if (alts.length) accept(alts[0].replace(/[.?!]/g, '')); else SEED.say('조금 더 크게 들려줄래? 써 줘도 좋아!', { intent: 'retry' }); }));
    }
    kids.push(el('div', { class: 'row' }, [input, el('button', { class: 'btn primary', text: '이 이름으로 할래요', onclick: function () { accept(input.value); } })]));
    panel.appendChild(el('div', { class: 'card center' }, kids));
    SEED.react('sing');
    SEED.say('안녕! 나는 말을 잃은 세상에 남은 아기 씨앗이야. 내 이름을 지어 줄래?', { intent: 'generic' });
  }

  /* ================= 정원 (홈) ================= */
  function goHome() {
    exitCurrent();
    panel.innerHTML = '';
    var st = ST.get();
    var acts = [
      ['📖', '단어 읽기', '씨앗에게 낱말 소리를 들려줘요', showWordReadingMenu],
      ['📚', '동화 읽기', '문장을 읽어 동화를 완성해요', showStoryMenu],
      ['✏️', '단어 쓰기', '소리 조각으로 낱말을 만들어요', function () { startWordWriting(); }],
      ['🧩', '문장 쓰기', '낱말 카드로 문장을 만들어요', function () { startSentenceWriting(); }]
    ];
    var grid = el('div', { class: 'act-grid' }, acts.map(function (a) {
      return el('button', { class: 'act-tile', onclick: a[3] }, [el('span', { class: 'act-ic', text: a[0] }), el('b', { text: a[1] }), el('small', { text: a[2] })]);
    }));
    var learned = st.garden.map(function (x) { return x.img + ' ' + x.word; });
    var bloomed = st.bloomed.map(function (x) { return x.img + ' ' + x.word; });
    panel.appendChild(el('div', { class: 'home' }, [
      grid,
      el('details', { class: 'card words' }, [
        el('summary', { text: '씨앗이 배운 말 보기' }),
        el('p', { class: 'muted', text: '정원에 심은 말' }),
        el('div', { class: 'chips' }, learned.length ? learned.map(function (t) { return el('span', { class: 'chip', text: t }); }) : [el('span', { class: 'muted', text: '아직 비어 있어요' })]),
        el('p', { class: 'muted', text: '함께 피어난 말' }),
        el('div', { class: 'chips' }, bloomed.length ? bloomed.map(function (t) { return el('span', { class: 'chip bloom-chip', text: t }); }) : [el('span', { class: 'muted', text: '아직 비어 있어요' })]),
        st.hold.length ? el('p', { class: 'muted', text: '씨앗이 기억해 둔 말이 있어요. 다음에 먼저 다시 만나요.' }) : null
      ]),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn', text: '오늘은 여기까지 🌙', onclick: endSession }),
        el('button', { class: 'btn ghost small', text: '설정 ⚙️', onclick: showSettings })
      ])
    ]));
    SEED.react(null);
    SEED.say(pickHello(), { intent: 'generic', voice: false });
  }
  function pickHello() {
    var n = ST.get().seedName || '씨앗';
    return ['오늘은 어떤 말을 알려줄래?', '나 ' + n + '! 새로운 소리가 궁금해.', '같이 놀자! 무엇부터 할까?'][Math.floor(Math.random() * 3)];
  }

  /* ================= 세션 종료: 과정 메시지 ================= */
  function endSession() {
    exitCurrent();
    var msgs = E.processMessages(session);
    panel.innerHTML = '';
    panel.appendChild(el('div', { class: 'card center' }, [
      el('div', { class: 'big-emoji', text: '🌙' }),
      el('h2', { text: '오늘의 정원 이야기' }),
      el('ul', { class: 'process' }, msgs.map(function (m) { return el('li', { text: m }); })),
      el('button', { class: 'btn primary', text: '정원으로 🏡', onclick: function () { newSession(); goHome(); } })
    ]));
    SEED.react('sing');
    SEED.say(msgs[0], { intent: 'session' });
  }

  function showSettings() {
    var st = ST.get();
    panel.innerHTML = '';
    function toggle(label, key) {
      var cb = el('input', { type: 'checkbox' });
      cb.checked = !!st.settings[key];
      cb.addEventListener('change', function () { st.settings[key] = cb.checked; ST.save(); applyText(); });
      return el('label', { class: 'toggle' }, [cb, el('span', { text: label })]);
    }
    panel.appendChild(el('div', { class: 'card' }, [
      el('h2', { text: '설정' }),
      toggle('씨앗 목소리로 말하기', 'seedVoice'),
      toggle('글자 크게 보기', 'bigText'),
      el('p', { class: 'muted', text: '음성 인식: ' + (S.recognitionSupported() ? '이 브라우저에서 사용할 수 있어요 (크롬·엣지 권장)' : '이 브라우저에서는 쓸 수 없어 누르기 방법으로 진행해요') }),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn', text: '돌아가기', onclick: goHome }),
        el('button', { class: 'btn ghost small', text: '처음부터 새로 시작', onclick: function () {
          if (confirm('씨앗과 정원을 모두 새로 시작할까요?')) { ST.reset(); newSession(); lastStage = -1; updateGrowth(); renderGarden(); applyText(); updateModeBtn(); showNaming(); }
        } })
      ])
    ]));
  }

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
      activity: 'wr', id: task.id, target: word, display: display, fbSlot: fbSlot, gardenWord: word,
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
    SEED.say(intro, { intent: 'generic' }).then(function () { if (stage === 1 && current === run) return modelVoice(word, display); })
      .then(function () { if (current === run) run.arm(); });
  }

  /* ================= 동화 읽기 (220) ================= */
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
      .then(function () { if (current === run) run.arm(); });
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
      session.attempts++;
      if (a === q.answer) {
        addExp(E.CONFIG.exp.complete); session.completed++; session.reachCount++; session.totalReachMs += Date.now() - started;
        SEED.react('nod');
        SEED.say('아, 그렇구나! 알려줘서 고마워!', { intent: 'reached' }).then(function () { wait(400).then(done); });
      } else if (tries >= 2) {
        SEED.react('hug');
        SEED.say('이 질문은 씨앗이 꼭 기억해 둘게. 다음에 또 이야기해 줘!', { intent: 'hold' }).then(done);
      } else {
        // 오답 표시 없이 관련 문장 재읽기 요청 (225)
        session.retries++;
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
      el('div', { class: 'pic', text: img(task.target) }),
      el('button', { class: 'btn ghost', text: '🔊 소리 듣기', onclick: function () { run.poke(); S.speak(task.target, 'model'); } }),
      preview, reveal, tilesWrap, send, fbSlot
    ]));
    var run = new TaskRun({
      activity: 'ww', id: task.id, target: task.target, fbSlot: fbSlot, gardenWord: task.target, noRespMs: 15000,
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
      .then(function () { if (current === run) run.arm(); });
  }

  /* ================= 문장 쓰기 (320) ================= */
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
      SEED.say('빈칸에 어떤 말이 들어가면 좋을까?', { intent: 'generic' }).then(function () { if (current === run) run.arm(); });
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
        .then(function () { if (current === run) run.arm(); });
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
      SEED.say('이 문장에 어색한 말이 하나 숨어 있어. 찾아 줄래?', { intent: 'generic' }).then(function () { if (current === run) run.arm(); });
    }
  }

  /* ================= 상단 버튼 ================= */
  function updateModeBtn() {
    var b = $('#btn-mode');
    var m = inputMode();
    b.textContent = m === 'voice' ? '🎤' : '👆';
    b.setAttribute('aria-label', m === 'voice' ? '지금은 말하기 방법 (누르기로 바꾸기)' : '지금은 누르기 방법 (말하기로 바꾸기)');
  }
  $('#btn-mode').addEventListener('click', function () {
    var st = ST.get();
    var m = inputMode();
    if (m === 'tap' && !S.recognitionSupported()) { SEED.say('이 브라우저에서는 말하기를 쓸 수 없어. 크롬에서 열어 줄래?', { intent: 'generic' }); return; }
    st.settings.inputMode = m === 'voice' ? 'tap' : 'voice'; ST.save(); updateModeBtn();
    SEED.say(st.settings.inputMode === 'voice' ? '이제 말로 들려줘!' : '이제 눌러서 알려줘!', { intent: 'generic', voice: false });
  });
  function applyText() { document.body.classList.toggle('big-text', !!ST.get().settings.bigText); }
  $('#btn-text').addEventListener('click', function () { var st = ST.get(); st.settings.bigText = !st.settings.bigText; ST.save(); applyText(); });
  $('#btn-home').addEventListener('click', function () { if (ST.get().seedName) goHome(); });
  $('#seed').addEventListener('click', function () { SEED.react('happy'); });

  /* 활동 이탈(탭 닫기)도 보류로 기록 */
  window.addEventListener('pagehide', function () { if (current) current.abandon(); });

  /* ================= 시작 ================= */
  ST.load();
  updateGrowth(); renderGarden(); applyText(); updateModeBtn();
  if (!ST.get().seedName) showNaming(); else goHome();

  SG.app = { goHome: goHome, endSession: endSession, session: function () { return session; } };
})();
