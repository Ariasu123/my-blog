/**
 * portfolio.js — 全站克制动效
 * 仅包含:IntersectionObserver 进入淡入。
 * prefers-reduced-motion 下完全降级(不做任何隐藏/动画)。
 * 脚本在 body 末尾加载:立即为 <html> 标记 pf-reveal-armed,
 * CSS 依据该标记对 [data-reveal] 应用入场前状态,避免无 JS 时内容不可见。
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var targets = document.querySelectorAll('[data-reveal]');

  if (!targets.length) {
    return;
  }

  var reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 降级模式或浏览器不支持 IntersectionObserver:不做隐藏,直接返回
  if (reducedMotion || !('IntersectionObserver' in window)) {
    return;
  }

  root.classList.add('pf-reveal-armed');

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );

  targets.forEach(function (target) {
    observer.observe(target);
  });
})();
