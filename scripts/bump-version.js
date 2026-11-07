// 브라우저 캐시 때문에 새 HTML과 예전 JS·CSS가 섞여 불러와지는 것을 막는다.
// 두 페이지의 로컬 .js/.css 주소 끝에 ?v=버전 을 붙이거나 새 버전으로 바꾼다.
// 사용: npm run bump   (코드를 고친 뒤 올리기 전에 실행)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const v = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12); // 예: 202611071530
for (const file of ['index.html', 'reading-sentence/index.html']) {
  const p = path.join(root, file);
  const html = fs.readFileSync(p, 'utf8').replace(
    /((?:src|href)=")((?!https?:)[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"/g,
    (_, a, url) => `${a}${url}?v=${v}"`,
  );
  fs.writeFileSync(p, html);
}
console.log('버전 ' + v + ' 으로 바꿈');
