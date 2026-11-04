// node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/hangul.js');
['vocab', 'read-word', 'write-word', 'write-sentence'].forEach((f) => require('../js/content/' + f + '.js'));
require('../js/engine.js');
const { hangul: H, engine: E, data: D } = globalThis.SG;
const { TYPE } = E;

test('자소 분해·조합', () => {
  assert.deepEqual(H.decompose('발'), { cho: 'ㅂ', jung: 'ㅏ', jong: 'ㄹ' });
  assert.equal(H.compose('ㅂ', 'ㅓ', 'ㄹ'), '벌');
  assert.equal(H.compose('ㄱ', 'ㅐ', ''), '개');
});

test('자소 단위 비교: 발→벌 은 중성 ㅏ→ㅓ 혼동', () => {
  assert.deepEqual(H.diffJamo('발', '벌'), [{ index: 0, pos: 'jung', target: 'ㅏ', heard: 'ㅓ' }]);
});

test('조사 처리', () => {
  assert.equal(H.josa('벌', '이/가'), '벌이');
  assert.equal(H.josa('개', '이/가'), '개가');
});

test('응답 유형 분류 (도 7 예시)', () => {
  assert.equal(E.classifyWord(['발'], '발', D.VOCAB).type, TYPE.REACHED);
  assert.equal(E.classifyWord(['발이요.'], '발', D.VOCAB).type, TYPE.REACHED);
  const b = E.classifyWord(['벌'], '발', D.VOCAB);
  assert.equal(b.type, TYPE.MEANINGFUL);
  assert.equal(b.image, '🐝');
  assert.equal(b.diffs[0].pos, 'jung');
  assert.equal(E.classifyWord(['뱔'], '발', D.VOCAB).type, TYPE.NONSENSE);
  assert.equal(E.classifyWord([], '발', D.VOCAB).type, TYPE.NONSENSE); // 인식 결과 없음
  assert.equal(E.classifyWord(null, '발', D.VOCAB, { timedOut: true }).type, TYPE.NO_RESPONSE);
});

test('여러 인식 후보 중 목표와 자소상 가까운 유의미 대체를 고른다', () => {
  const r = E.classifyWord(['사과', '벌'], '발', D.VOCAB);
  assert.equal(r.heard, '벌');
});

test('문장 분류: 읽기는 유사도 허용, 쓰기는 정확 일치', () => {
  const t = '토끼가 공을 찾아 주었어요.';
  assert.equal(E.classifySentence(['토끼가 공을 찾아주었어요'], t, D.VOCAB).type, TYPE.REACHED);
  assert.equal(E.classifySentence(['내 뱔이 간지러워'], '내 발이 간지러워', D.VOCAB, { exact: true }).type, TYPE.NONSENSE);
  const alt = E.classifySentence(['내 벌이 간지러워'], '내 발이 간지러워', D.VOCAB,
    { exact: true, alternates: { '내 벌이 간지러워': { img: '🐝😆', word: '벌' } } });
  assert.equal(alt.type, TYPE.MEANINGFUL);
  assert.equal(alt.targetWord, '발');
  assert.equal(E.classifySentence(['풀을 토끼가 먹어요'], '토끼가 풀을 먹어요', D.VOCAB, { exact: true, accept: ['풀을 토끼가 먹어요'] }).type, TYPE.REACHED);
});

test('문장 읽기 중 어휘 단어 대체 감지 (벌이 간지러워)', () => {
  const r = E.classifySentence(['벌이 간지러워'], '내 발이 간지러워', D.VOCAB);
  assert.equal(r.type, TYPE.MEANINGFUL);
  assert.equal(r.word, '벌');
  assert.equal(r.targetWord, '발');
});

test('지원 수준: 재시도 횟수에 따라 L1→L2→L3→L4(보류)', () => {
  assert.equal(E.decideLevel({ type: 'C', retries: 1 }), 1);
  assert.equal(E.decideLevel({ type: 'C', retries: 2 }), 2);
  assert.equal(E.decideLevel({ type: 'B', retries: 3 }), 3);
  assert.equal(E.decideLevel({ type: 'C', retries: 4 }), 4);
  assert.equal(E.decideLevel({ type: 'C', retries: 1, elapsedMs: 999999 }), 4);
  assert.equal(E.decideLevel({ type: 'A', retries: 3 }), 0);
});

test('혼동 음소 이력이 있으면 처음부터 L2', () => {
  assert.equal(E.decideLevel({ type: 'C', retries: 1, confusedHit: true }), 2);
  const hits = E.confusedJamoIn('발', { 'ㅏ': 3 });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].pos, 'jung');
});

test('피드백: 원인을 씨앗 쪽 상태로 표현하고 평가어가 없다', () => {
  const cases = [];
  ['A', 'B', 'C', 'D'].forEach((type) => [1, 2, 3, 4].forEach((level) => {
    cases.push(E.buildFeedback({ type, level, target: '발', heard: '벌', attempt: level }));
  }));
  cases.forEach((fb) => assert.deepEqual(E.findBanned(fb.text), [], fb.text));
  const b = E.buildFeedback({ type: 'B', level: 1, target: '발', heard: '벌' });
  assert.equal(b.text, '벌이 나타났네! 그럼 ‘발’은 어떻게 말해?');
  assert.ok(b.actions.includes('bloom') && b.actions.includes('compare'));
  const c = E.buildFeedback({ type: 'C', level: 1, target: '발', attempt: 1 });
  assert.ok(c.text.includes('처음 듣는 소리'));
  const d = E.buildFeedback({ type: 'D', level: 1, target: '발' });
  assert.ok(d.actions.includes('modelVoice'));
  const hold = E.buildFeedback({ type: 'C', level: 4, target: '발' });
  assert.ok(hold.actions.includes('hold') && hold.actions.includes('next'));
});

test('평가어 검증 모듈이 평가 어휘를 대체 문장으로 교체한다', () => {
  assert.equal(E.verifyText('틀렸어! 다시 해 봐', 'retry'), '어? 잘 못 알아들었어. 한 번 더 들려줄래?');
  assert.equal(E.verifyText('정답이야!', 'reached'), '이제 알겠어. 고마워!');
  assert.equal(E.verifyText('씨앗이 기뻐해요', 'reached'), '씨앗이 기뻐해요');
});

test('과정 메시지: 숫자 없이 과정 중심', () => {
  const m = E.processMessages({ attempts: 10, retries: 5, quitEarly: true, reachCount: 2, totalReachMs: 60000, bloomed: 1, held: 1 });
  assert.ok(m.some((x) => x.includes('끝까지 여러 번')));
  assert.ok(m.some((x) => x.includes('천천히')));
  assert.ok(m.some((x) => x.includes('다음에 또')));
  m.forEach((x) => { assert.ok(!/\d/.test(x), x); assert.deepEqual(E.findBanned(x), []); });
});

test('성장 단계: 10 EXP 단위', () => {
  assert.equal(E.STAGES[E.stageOf(0)], '아기 씨앗');
  assert.equal(E.STAGES[E.stageOf(10)], '씨앗');
  assert.equal(E.STAGES[E.stageOf(25)], '발아');
  assert.equal(E.STAGES[E.stageOf(60)], '꽃·열매');
  assert.equal(E.stageProgress(15), 0.5);
});

test('콘텐츠 데이터 무결성', () => {
  D.WORD_READING.forEach((t) => assert.ok(D.VOCAB[t.word], t.word));
  D.WORD_WRITING.forEach((t) => {
    const d = H.decompose(t.target);
    assert.ok(t.tiles.cho.includes(d.cho) && t.tiles.jung.includes(d.jung) && t.tiles.jong.includes(d.jong), t.id);
    assert.ok(D.VOCAB[t.contrast], t.contrast);
  });
  // 모든 대사 문자열에 평가어 없음
  const fs = require('fs'), path = require('path');
  const files = ['core.js', 'activities/read-word.js', '../reading-sentence/app.js', 'activities/write-word.js', 'activities/write-sentence.js'];
  const src = files.map((f) => fs.readFileSync(path.join(__dirname, '../js', f), 'utf8')).join('\n');
  const strings = src.match(/'[^'\n]*[가-힣][^'\n]*'/g) || [];
  strings.forEach((s) => assert.deepEqual(E.findBanned(s), [], s));
});
