/*
 * 🧩 쓰기 — 문장 콘텐츠
 * kind: 'blank' 빈칸 채우기 / 'arrange' 카드 늘어놓기 / 'picture' 그림 보고 만들기 / 'odd' 이상한 말 찾기
 * target: 목표 문장, accept: 어순만 다른 같은 뜻 문장(목표 도달로 인정)
 * alternates: 목표와 다르지만 뜻이 있는 문장 → 그림이 피어나는 유의미 대체(B)
 */
(function (root) {
  'use strict';
  var SG = root.SG = root.SG || {};
  SG.data = SG.data || {};

  SG.data.SENTENCE_WRITING = [
    { id: 'sw-발', kind: 'blank', frame: ['내', '___', '간지러워'], target: '내 발이 간지러워', img: '🦶😆',
      candidates: ['발이', '벌이', '뱔이'],
      alternates: { '내 벌이 간지러워': { img: '🐝😆', word: '벌' } } },
    { id: 'sw-곰', kind: 'blank', frame: ['___', '꿀을', '먹어요'], target: '곰이 꿀을 먹어요', img: '🐻🍯',
      candidates: ['곰이', '공이', '굠이'],
      alternates: { '공이 꿀을 먹어요': { img: '⚽🍯', word: '공' } } },
    { id: 'sw-달', kind: 'blank', frame: ['밤하늘에', '___', '떴어요'], target: '밤하늘에 달이 떴어요', img: '🌃🌙',
      candidates: ['돌이', '달이', '댤이'],
      alternates: { '밤하늘에 돌이 떴어요': { img: '🌃🪨', word: '돌' } } },
    { id: 'sw-토끼', kind: 'arrange', target: '토끼가 풀을 먹어요', img: '🐰🌿',
      cards: ['토끼가', '풀을', '먹어요'], accept: ['풀을 토끼가 먹어요'],
      alternates: {} },
    { id: 'sw-새', kind: 'arrange', target: '새가 나무에 앉았어요', img: '🐦🌳',
      cards: ['새가', '나무에', '앉았어요'], accept: ['나무에 새가 앉았어요'],
      alternates: {} },
    { id: 'sw-곰공', kind: 'picture', target: '곰이 공을 차요', img: '🐻⚽',
      cards: ['곰이', '공이', '공을', '곰을', '차요', '자요'], accept: ['공을 곰이 차요'],
      alternates: { '공이 곰을 차요': { img: '⚽🦶🐻' } } },
    { id: 'sw-개', kind: 'picture', target: '개가 물을 마셔요', img: '🐶💧',
      cards: ['개가', '게가', '물을', '불을', '마셔요'], accept: ['물을 개가 마셔요'],
      alternates: { '게가 물을 마셔요': { img: '🦀💧' }, '개가 불을 마셔요': { img: '🐶🔥😮' } } },
    { id: 'sw-말', kind: 'odd', sentence: ['오늘', '목장에', '달이', '빠르게', '달려요.'], oddIndex: 2,
      target: '말이', img: '🐴💨', candidates: ['말이', '탈이', '달이'],
      alternates: { '탈이': { img: '🎭💨', word: '탈' }, '달이': { img: '🌙💨', word: '달' } } }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
