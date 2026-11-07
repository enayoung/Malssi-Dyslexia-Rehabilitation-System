// 읽기-문장(동화) 페이지: 자소 비교와 동화 데이터 점검
const test = require('node:test');
const assert = require('node:assert/strict');
const Hangul = require('../reading-sentence/hangul.js');
const STORY = require('../reading-sentence/story.js');

test('같은 문장은 문장부호·띄어쓰기와 관계없이 도달', () => {
  const r = Hangul.compareSentence('그 씨앗은 소리를 기다렸어요.', ['그 씨앗은 소리를 기다렸어요']);
  assert.equal(r.score, 1);
  assert.ok(r.words.every((w) => w === 1));
});

test('숫자로 인식된 말도 고유어·한자어로 바꿔 비교', () => {
  const t = '나무가 그 소리를 듣고 하나 둘 깨어나더니 다시 예전의 모습처럼 돌아왔어요.';
  assert.ok(Hangul.compareSentence(t, ['나무가 그 소리를 듣고 1 2 깨어나더니 다시 예전의 모습처럼 돌아왔어요']).score >= 0.8);
});

test('잘 전달되지 않은 단어만 낮은 점수', () => {
  const r = Hangul.compareSentence('세상에는 단 하나의 씨앗만 남게 되었어요.', ['세상에는 단 하나의 사과만 남게 되었어요']);
  const low = r.words.map((w, i) => [w, i]).filter(([w]) => w < 0.75).map(([, i]) => i);
  assert.deepEqual(low, [3]);
});

test('인식 결과가 없으면 empty (무응답)', () => {
  assert.equal(Hangul.compareSentence('씨앗', []).empty, true);
});

test('동화 데이터: 7장, 장마다 3문장, 질문 관련 문장 번호가 올바름', () => {
  assert.equal(STORY.length, 7);
  STORY.forEach((c, i) => {
    assert.equal(c.id, i + 1);
    assert.equal(c.sentences.length, 3, c.title);
    assert.ok(c.quiz.options.length >= 2);
    assert.ok(c.quiz.related >= 0 && c.quiz.related < c.sentences.length, c.title);
  });
});

// reading-sentence/app.js 의 isReached 와 같은 규칙 (CFG.passScore, CFG.wordPassScore)
const src = require('fs').readFileSync(require('path').join(__dirname, '../reading-sentence/app.js'), 'utf8');
const PASS = Number(src.match(/passScore:\s*([\d.]+)/)[1]);
const WORD_PASS = Number(src.match(/wordPassScore:\s*([\d.]+)/)[1]);
const reached = (t, said) => { const r = Hangul.compareSentence(t, [said]); return !r.empty && r.score >= PASS && r.words.every((w) => w >= WORD_PASS); };

test('모든 문장: 그대로 읽으면 (문장부호·띄어쓰기 달라도) 도달', () => {
  STORY.forEach((c) => c.sentences.forEach((t) => {
    assert.ok(reached(t, t), t);
    assert.ok(reached(t, t.replace(/[^가-힣\s]/g, '')), '문장부호 없이: ' + t);
    assert.ok(reached(t, t.replace(/\s+/g, '')), '띄어쓰기 없이: ' + t);
  }));
});

test('한 낱말만 잘못 읽어도 도달하지 않음 (당신→당산)', () => {
  const t = '당신의 목소리를 듣고 씨앗이 반응했어요.';
  assert.equal(reached(t, '당산의 목소리를 듣고 씨앗이 반응했어요'), false);
  assert.equal(reached(t, '당신의 목서리를 듣고 씨앗이 반응했어요'), false);
  assert.equal(reached('그 씨앗은 소리를 기다렸어요.', '그 씨앗은 수리를 기다렸어요'), false);
  assert.equal(reached(t, '당신의 목소리를 듣고 씨앗이 반응했어요'), true);
});
