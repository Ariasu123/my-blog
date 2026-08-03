/* global mermaid */

'use strict';

(function(window, document) {
  const diagrams = Array.from(document.querySelectorAll('.mermaid'));

  if (diagrams.length === 0) {
    return;
  }

  const version = '11.16.0';
  const sources = new Map(diagrams.map((diagram) => [diagram, diagram.textContent.trim()]));
  const cdnUrls = [
    `https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/mermaid.min.js`,
    `https://unpkg.com/mermaid@${version}/dist/mermaid.min.js`
  ];
  let renderChain = Promise.resolve();
  let renderTimer = null;

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error(`无法加载 Mermaid: ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  async function loadMermaid() {
    if (window.mermaid) {
      return window.mermaid;
    }

    let lastError;

    for (const url of cdnUrls) {
      try {
        await loadScript(url);
        if (window.mermaid) {
          return window.mermaid;
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Mermaid 加载失败');
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-user-color-scheme') === 'dark'
      ? 'dark'
      : 'default';
  }

  function restoreSources() {
    diagrams.forEach((diagram) => {
      diagram.removeAttribute('data-processed');
      diagram.classList.add('mermaid-pending');
      diagram.classList.remove('mermaid-fallback');
      diagram.setAttribute('aria-busy', 'true');
      diagram.textContent = sources.get(diagram);
    });
  }

  function showFallback(error) {
    console.error('[mermaid] 流程图渲染失败', error);
    diagrams.forEach((diagram) => {
      if (!diagram.querySelector('svg')) {
        diagram.textContent = sources.get(diagram);
        diagram.classList.add('mermaid-fallback');
      }
      diagram.classList.remove('mermaid-pending');
      diagram.setAttribute('aria-busy', 'false');
    });
  }

  function renderDiagrams() {
    renderChain = renderChain
      .then(async() => {
        const runtime = await loadMermaid();
        restoreSources();
        runtime.initialize({
          startOnLoad: false,
          theme: currentTheme(),
          securityLevel: 'strict',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
          flowchart: {
            htmlLabels: true,
            useMaxWidth: true
          },
          sequence: {
            useMaxWidth: true
          }
        });
        await runtime.run({ nodes: diagrams });
        diagrams.forEach((diagram) => {
          diagram.classList.remove('mermaid-pending');
          diagram.setAttribute('aria-busy', 'false');
        });
      })
      .catch(showFallback);
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderDiagrams, 120);
  }

  const themeObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === 'data-user-color-scheme')) {
      scheduleRender();
    }
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-user-color-scheme']
  });

  renderDiagrams();
})(window, document);
