/*
 * ✏️ 쓰기 — 단어 콘텐츠
 * target: 만들 낱말, contrast: 비교할 비슷한 소리 낱말
 * tiles: 첫소리(cho)·가운데 소리(jung)·끝소리(jong) 후보. 목표 자소가 꼭 들어 있어야 하고 '' 는 끝소리 없음
 */
(function (root) {
  'use strict';
  var SG = root.SG = root.SG || {};
  SG.data = SG.data || {};

  /* 단어 쓰기 (310): 유사 음소 두 단어 비교(311) 후 자소 타일로 만들기(312) */
  SG.data.WORD_WRITING = [
    { id: 'ww-발', target: '발', contrast: '벌', tiles: { cho: ['ㅂ', 'ㅍ', 'ㅁ'], jung: ['ㅏ', 'ㅓ', 'ㅕ'], jong: ['ㄹ', 'ㄴ', ''] } },
    { id: 'ww-공', target: '공', contrast: '곰', tiles: { cho: ['ㄱ', 'ㅋ', 'ㄷ'], jung: ['ㅗ', 'ㅜ', 'ㅏ'], jong: ['ㅇ', 'ㅁ', ''] } },
    { id: 'ww-달', target: '달', contrast: '돌', tiles: { cho: ['ㄷ', 'ㄸ', 'ㅌ'], jung: ['ㅏ', 'ㅗ', 'ㅓ'], jong: ['ㄹ', 'ㅇ', ''] } },
    { id: 'ww-물', target: '물', contrast: '문', tiles: { cho: ['ㅁ', 'ㅂ', 'ㄴ'], jung: ['ㅜ', 'ㅗ', 'ㅡ'], jong: ['ㄹ', 'ㄴ', ''] } },
    { id: 'ww-밤', target: '밤', contrast: '뱀', tiles: { cho: ['ㅂ', 'ㅃ', 'ㅁ'], jung: ['ㅏ', 'ㅐ', 'ㅓ'], jong: ['ㅁ', 'ㅇ', ''] } },
    { id: 'ww-불', target: '불', contrast: '풀', tiles: { cho: ['ㅂ', 'ㅍ', 'ㅃ'], jung: ['ㅜ', 'ㅗ', 'ㅡ'], jong: ['ㄹ', 'ㄴ', ''] } },
    { id: 'ww-개', target: '개', contrast: '게', tiles: { cho: ['ㄱ', 'ㅋ', 'ㄲ'], jung: ['ㅐ', 'ㅔ', 'ㅏ'], jong: ['', 'ㅇ', 'ㄴ'] } },
    { id: 'ww-별', target: '별', contrast: '벌', tiles: { cho: ['ㅂ', 'ㅍ', 'ㅁ'], jung: ['ㅕ', 'ㅓ', 'ㅑ'], jong: ['ㄹ', 'ㅇ', ''] } }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
