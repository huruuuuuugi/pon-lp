'use strict';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------
   見出しを1文字ずつ <span> に分ける
   - HTMLの <wbr>・<br> で区切られた部分を「文節」とし、
     文節ごとに .split__phrase で包んで、文節の途中で改行させない
   - 読み上げ用に元の文章を .visually-hidden で残し、
     分割した見た目のほうは aria-hidden で読ませない
--------------------------------------------- */
const splitChars = (el) => {
  const label = document.createElement('span');
  label.className = 'visually-hidden';
  label.textContent = el.textContent.trim();

  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  let i = 0;

  [...el.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) {
      visual.append(node); // <br>・<wbr> はそのまま残す
      return;
    }

    const text = node.textContent.trim();
    if (!text) return;

    const phrase = document.createElement('span');
    phrase.className = 'split__phrase';
    for (const char of text) {
      const span = document.createElement('span');
      span.className = 'char';
      span.style.setProperty('--i', i++);
      span.textContent = char;
      phrase.append(span);
    }
    visual.append(phrase);
  });

  el.replaceChildren(label, visual);
};

document.querySelectorAll('[data-split]').forEach(splitChars);

/* ---------------------------------------------
   [data-stagger] の子要素に順番（--i）を振る
--------------------------------------------- */
document.querySelectorAll('[data-stagger]').forEach((parent) => {
  [...parent.children].forEach((child, i) => child.style.setProperty('--i', i));
});

/* ---------------------------------------------
   スクロールで表示（1回だけ）
--------------------------------------------- */
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(({ isIntersecting, target }) => {
    if (!isIntersecting) return;

    target.classList.add('is-inview');
    observer.unobserve(target);
  });
}, { rootMargin: '0px 0px -12% 0px' });

document.querySelectorAll('[data-reveal], [data-split]').forEach((el) => revealObserver.observe(el));

/* ---------------------------------------------
   泡の位置決め（動きではないので「動きを減らす」設定でも行う）
--------------------------------------------- */
const bubbleBands = placeBubbles();

/* ---------------------------------------------
   ここから下は「動きを減らす」設定なら何もしない
--------------------------------------------- */
if (!reduceMotion) {
  initTilt();
  initBubbles(bubbleBands);
}

/* ---------------------------------------------
   フレーバー画像：マウスの位置に合わせて傾く
--------------------------------------------- */
function initTilt() {
  if (!matchMedia('(hover: hover)').matches) return;

  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const { left, top, width, height } = el.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;
      el.style.setProperty('--ry', `${x * 14}deg`);
      el.style.setProperty('--rx', `${y * -14}deg`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    });
  });
}

/* ---------------------------------------------
   泡を置く帯を決め、Figmaの泡（HTMLに直書き）をそこへ寄せる
   帯 = 文字の入る .container の外側（左右の余白）。[[左の帯の最小%, 最大%], [右の帯の最小%, 最大%]] を返す
--------------------------------------------- */
function placeBubbles() {
  const section = document.querySelector('.secret');
  const container = section?.querySelector('.bubbles');
  if (!section || !container) return null;

  let bands;
  if (matchMedia('(min-width: 768px)').matches) {
    // PC：大きい泡の幅（37px）＋揺れ幅（14px）＝51px ぶん、文字から離す
    const s = section.getBoundingClientRect();
    const c = section.querySelector('.container').getBoundingClientRect();
    const toPercent = (px) => (px / s.width) * 100;
    bands = [
      [0, Math.max(0, toPercent(c.left - s.left - 51))],
      [toPercent(c.right - s.left + 14), 98],
    ];
  } else {
    // SP：左右の余白（20px）に小さい泡だけ
    bands = [[0, 2], [95, 97]];
  }

  // 左半分の泡 → 左の帯、右半分の泡 → 右の帯へ、並び順を保ったまま縮めて寄せる
  const [[lMin, lMax], [rMin, rMax]] = bands;
  container.querySelectorAll('.bubble').forEach((bubble) => {
    const x = parseFloat(bubble.style.getPropertyValue('--x'));
    const mapped = x < 50
      ? lMin + (x / 50) * (lMax - lMin)
      : rMin + ((x - 50) / 50) * (rMax - rMin);
    bubble.style.setProperty('--x', `${mapped}%`);
  });

  return bands;
}

/* ---------------------------------------------
   炭酸の泡
   1. Figmaの泡に加えて、ランダムな泡を帯の中に足して密度を出す
   2. セクションをクリック／タップすると、その場所から泡が湧く
--------------------------------------------- */
function initBubbles(bands) {
  const section = document.querySelector('.secret');
  const container = section?.querySelector('.bubbles');
  if (!section || !container || !bands) return;

  const random = (min, max) => Math.random() * (max - min) + min;
  const isPC = matchMedia('(min-width: 768px)').matches;
  // SPは大きい泡を出さない（CSSでも非表示）ので、小さい泡だけを足す
  const sizes = isPC ? ['s', 's', 's', 'm', 'l'] : ['s'];

  const randomX = () => {
    const [min, max] = bands[Math.floor(Math.random() * bands.length)];
    return random(min, max);
  };

  // スマホは画面が狭く文字と重なりやすいので、追加する泡を少なめにする
  const extraCount = isPC ? 16 : 4;

  for (let i = 0; i < extraCount; i++) {
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const bubble = document.createElement('span');
    bubble.className = `bubble bubble--${size}`;
    bubble.style.setProperty('--x', `${randomX()}%`);
    bubble.style.setProperty('--p', random(0, 1).toFixed(2));
    bubble.style.setProperty('--dur', `${random(size === 'l' ? 10 : 6, size === 'l' ? 14 : 10).toFixed(1)}s`);
    container.append(bubble);
  }

  // 画面外では泡のアニメーションを止めて負荷を減らす（止め方はCSSの .secret.is-paused）
  new IntersectionObserver(([entry]) => {
    section.classList.toggle('is-paused', !entry.isIntersecting);
  }).observe(section);

  // pointerdownだとスワイプでスクロールし始めただけで発火するため、clickで受ける
  section.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;

    const rect = section.getBoundingClientRect();
    const originX = e.clientX - rect.left;
    const originY = e.clientY - rect.top;

    for (let i = 0; i < 7; i++) {
      const size = random(8, 26);
      const bubble = document.createElement('span');
      bubble.className = 'bubble-burst';
      bubble.style.setProperty('--size', `${size}px`);
      bubble.style.left = `${originX - size / 2}px`;
      bubble.style.top = `${originY - size / 2}px`;
      section.append(bubble);

      const driftX = random(-60, 60);
      const rise = random(120, 260);
      bubble.animate(
        [
          { transform: 'translate(0, 0) scale(0)', opacity: 1 },
          { transform: `translate(${driftX * 0.4}px, ${-rise * 0.4}px) scale(1)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${driftX}px, ${-rise}px) scale(1.3)`, opacity: 0 },
        ],
        { duration: random(900, 1600), delay: i * 40, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' },
      ).finished.then(() => bubble.remove());
    }
  });
}
