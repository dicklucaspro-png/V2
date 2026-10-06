/* Présentation uniquement : aucun calcul ni donnée patient n'est modifié. */
document.addEventListener('DOMContentLoaded', () => {
  const anamnese = document.getElementById('anamnese');
  const totals = anamnese?.querySelector('.anm-totals-card');
  const validation = anamnese?.querySelector('.anm-validation-card');
  const meals = document.getElementById('anm-repas-container');
  if (validation && meals) meals.after(validation);
  if (totals && validation) validation.before(totals);

  for (const id of ['recettes', 'aliments', 'suivi', 'documents']) {
    const panel = document.querySelector(`#${id} > .module-placeholder`);
    if (!panel) continue;
    const state = document.createElement('span');
    state.className = 'clinical-module-state';
    state.textContent = 'Module en préparation';
    panel.prepend(state);
  }

  const configs = {
    calculs: '#calculsNutritionnels .nutrition-calc-card',
    plan: '#recommandationsNutritionnelles > section, #plan > .analyse-pathologie-section',
    pathologies: '#priseEnChargePathologies > section'
  };
  for (const [id, selector] of Object.entries(configs)) {
    const tab = document.getElementById(id);
    const header = tab?.querySelector('.module-header');
    if (!header) continue;
    const nav = document.createElement('nav');
    nav.className = 'clinical-section-nav';
    nav.setAttribute('aria-label', 'Sections de ' + header.querySelector('h2').textContent.trim());
    header.after(nav);
    let signature = '';
    const refresh = () => {
      const sections = [...tab.querySelectorAll(selector)].filter(el => !el.hidden && el.querySelector('h3'));
      const labels = sections.map(el => el.querySelector('h3').textContent.trim());
      const next = JSON.stringify(labels);
      nav.hidden = sections.length < 2;
      if (next === signature) return;
      signature = next;
      nav.replaceChildren(...labels.map((label, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', () => {
          const target = [...tab.querySelectorAll(selector)].filter(el => !el.hidden && el.querySelector('h3'))[index];
          if (!target) return;
          const heading = target.querySelector('h3');
          heading.setAttribute('tabindex', '-1');
          heading.focus({preventScroll:true});
          target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
        });
        return button;
      }));
    };
    let pending = false;
    const observer = new MutationObserver(records => {
      if (records.every(record => nav.contains(record.target)) || pending) return;
      pending = true;
      requestAnimationFrame(() => {pending = false; refresh();});
    });
    observer.observe(tab, {childList:true, subtree:true, attributes:true, attributeFilter:['hidden']});
    refresh();
  }
});
