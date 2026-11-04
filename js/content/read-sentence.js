/*
 * 📚 읽기 — 문장(동화) 콘텐츠
 * sentences: 한 줄씩 읽을 문장과 그림
 * questions: 이해 질문. answer는 choices 중 하나, ref는 답이 들어 있는 문장 번호(0부터)
 */
(function (root) {
  'use strict';
  var SG = root.SG = root.SG || {};
  SG.data = SG.data || {};

  /* 동화 (문장 읽기 220). 이해 확인 질문(224)은 관련 문장 번호를 가진다. */
  SG.data.STORIES = [
    {
      id: 'st-spring', title: '씨앗의 첫 봄', cover: '🌱',
      sentences: [
        { text: '작은 씨앗이 땅속에서 잠을 잤어요.', img: '🌰😴' },
        { text: '따뜻한 해가 씨앗을 깨웠어요.', img: '☀️🌰' },
        { text: '비가 내려서 씨앗이 물을 마셨어요.', img: '🌧️💧' },
        { text: '씨앗은 초록 새싹이 되었어요.', img: '🌱' },
        { text: '나비가 날아와 새싹에게 인사했어요.', img: '🦋🌱' }
      ],
      questions: [
        { q: '씨앗을 깨운 것은 누구일까?', choices: [['해', '☀️'], ['달', '🌙'], ['벌', '🐝']], answer: '해', ref: 1 },
        { q: '새싹에게 인사한 친구는 누구일까?', choices: [['나무', '🌳'], ['나비', '🦋'], ['토끼', '🐰']], answer: '나비', ref: 4 }
      ]
    },
    {
      id: 'st-ball', title: '곰과 공', cover: '🐻',
      sentences: [
        { text: '곰이 공을 찾고 있어요.', img: '🐻🔍' },
        { text: '공은 풀 속에 숨어 있었어요.', img: '🌿⚽' },
        { text: '토끼가 공을 찾아 주었어요.', img: '🐰⚽' },
        { text: '곰과 토끼는 같이 공을 찼어요.', img: '🐻⚽🐰' }
      ],
      questions: [
        { q: '공은 어디에 숨어 있었을까?', choices: [['풀', '🌿'], ['불', '🔥'], ['물', '💧']], answer: '풀', ref: 1 },
        { q: '공을 찾아 준 친구는 누구일까?', choices: [['오리', '🦆'], ['고래', '🐳'], ['토끼', '🐰']], answer: '토끼', ref: 2 }
      ]
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
