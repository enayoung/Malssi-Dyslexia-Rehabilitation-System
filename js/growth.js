/*
 * 성장 시각화부(180) — 모든 페이지가 함께 쓰는 씨앗 성장
 * 경험치는 js/store.js 저장소(localStorage) 하나에 모이므로, 단어 활동과 동화 읽기 어디서 얻어도 같은 씨앗이 자란다.
 * 페이지에 필요한 요소: #seed-name, #stage-name, #growth-fill (상단 바), svg#seed (씨앗), #overlay (자랄 때 축하 창)
 */
(function (root) {
  'use strict';
  var SG = root.SG = root.SG || {};
  var lastStage = -1;

  function $(id) { return document.getElementById(id); }

  /** 상단 바(이름·단계·막대)와 씨앗 모습을 저장된 경험치에 맞춤. force: 씨앗을 다시 그리기 */
  function update(force) {
    var st = SG.store.get(), E = SG.engine, stage = E.stageOf(st.exp);
    if ($('seed-name')) $('seed-name').textContent = st.seedName || '씨앗';
    if ($('stage-name')) $('stage-name').textContent = E.STAGES[stage];
    if ($('growth-fill')) $('growth-fill').style.width = Math.round(E.stageProgress(st.exp) * 100) + '%';
    if ($('seed') && (force || stage !== lastStage)) { SG.seed.render(stage); lastStage = stage; }
    return stage;
  }

  function celebrate(stage) {
    var ov = $('overlay');
    if (!ov) return;
    var name = SG.store.get().seedName || '씨앗';
    ov.innerHTML =
      '<div class="celebrate">' +
        '<div class="big-emoji">' + ['🌰', '🌰', '🌱', '🌿', '🪴', '🌳', '🌸'][stage] + '</div>' +
        '<p></p><p class="sub">여러 번 들려준 말들이 씨앗을 키웠어요.</p>' +
        '<button class="btn primary">좋아요</button>' +
      '</div>';
    ov.querySelector('p').textContent = SG.hangul.josa(name, '이/가') + ' ‘' + SG.engine.STAGES[stage] + '’ 모습으로 자랐어요!';
    ov.querySelector('button').addEventListener('click', function () { ov.classList.add('hidden'); });
    ov.classList.remove('hidden');
    SG.seed.react('happy');
  }

  /** 경험치 더하기 (최초 도전 +1, 재시도 +1, 완료 +2 — engine.js CONFIG.exp) */
  function addExp(n) {
    var st = SG.store.get(), E = SG.engine, before = E.stageOf(st.exp);
    st.exp += n; SG.store.save();
    var after = update();
    if (after > before) celebrate(after);
  }

  SG.growth = { update: update, addExp: addExp, celebrate: celebrate };
})(typeof window !== 'undefined' ? window : globalThis);
