//! Initialisation et événements //

(() => {
  const field = id => document.getElementById(id);
  const value = id => {
    const control = field(id);
    if (!control?.value) return '';
    return control.tagName === 'SELECT' ? control.selectedOptions[0].textContent.trim() : control.value.trim();
  };
  let cards = [];
  let conditions = [];

  function refresh() {
    if (!field('patient-overview')) return;
    field('overview-age').textContent = value('age') ? value('age') + ' ans' : 'Âge non renseigné';
    field('overview-motif').textContent = value('motifConsultation') || 'Motif à renseigner';
    field('overview-objectif').textContent = value('objectif') || 'Objectif à définir';
    field('overview-date').textContent = patientActif?.dateModification ? new Date(patientActif.dateModification).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }) : patientActif ? 'Date non disponible' : 'Pas encore enregistré';
    cards.forEach(({
      card,
      preview
    }) => {
      const values = [...card.querySelectorAll('input, select, textarea')].filter(control => !control.disabled && control.value && control.id !== 'diabeteGlycemieUnite' && !control.closest('[hidden]') && ![...function* () {
        for (let parent = control.parentElement; parent && parent !== card; parent = parent.parentElement) yield parent;
      }()].some(parent => getComputedStyle(parent).display === 'none') && (!['checkbox', 'radio'].includes(control.type) || control.checked)).map(control => {
        if (control.tagName === 'SELECT') return control.selectedOptions[0].textContent.trim();
        if (control.type === 'checkbox' || control.type === 'radio') return control.value;
        const label = control.labels?.[0]?.textContent.trim().replace(/\s+/g, ' ');
        return label ? `${label} : ${control.value}` : control.value;
      });

      preview.textContent = values.length ? values.slice(0).join(' · ') + (values.length > 2 ? ` · +${values.length - 2}` : '') : 'À renseigner';
      preview.title = preview.textContent;
    });

    conditions.forEach(({
      controller,
      target,
      label,
      trigger
    }) => {

      const visible = Boolean(target.value.trim()) || trigger(controller.value);
      target.hidden = label.hidden = !visible;
      const wrapper = target.closest('.patient-field');
      if (wrapper) wrapper.hidden = !visible;
      controller.setAttribute('aria-controls', target.id);
    });


    const sexe = field('sexe')?.value || '';
    const champsFemme = [
      'grossesseActuelle', 'nombreGrossesses', 'desirGrossesse', 'toxoplasmoseImmunisee',
      'termeGrossesse', 'poidsAvantGrossesse', 'prisePoidsGrossesseActuelle',
      'prisePoidsGrossesses', 'antecedentDiabeteGestationnel', 'antecedentPreeclampsie',
      'poidsTailleNaissance', 'deroulementGrossesses', 'menopause', 'ageMenopause',
      'traitementHormonalMenopause', 'detailsTraitementHormonalMenopause'
    ];

    const champsHomme = ['projetPaternite', 'antecedentsUrologiques', 'traitementHormonalMasculin'];
    const appliquerVisibiliteSexe = (ids, visible) => ids.forEach(id => {
      const control = field(id);
      const label = control?.labels?.[0];
      if (!control || !label) return;
      control.hidden = label.hidden = !visible;
      const wrapper = control.closest('.patient-field');
      if (wrapper) wrapper.hidden = !visible;
    });
    appliquerVisibiliteSexe(champsFemme, sexe === 'femme');
    appliquerVisibiliteSexe(champsHomme, sexe === 'homme');

    if (sexe === 'femme') {
      
      const conditionner = (id, visible) => {
        const control = field(id);
        const label = control?.labels?.[0];
        if (!control || !label) return;
        control.hidden = label.hidden = !visible;
        const wrapper = control.closest('.patient-field');
        if (wrapper) wrapper.hidden = !visible;
      };
      const grossesse = field('grossesseActuelle')?.value === 'oui';
      conditionner('termeGrossesse', grossesse);
      conditionner('poidsAvantGrossesse', grossesse);
      conditionner('prisePoidsGrossesseActuelle', grossesse);
      const grossessesAnterieures = Number(field('nombreGrossesses')?.value || 0) > (grossesse ? 1 : 0);
      ['prisePoidsGrossesses', 'antecedentDiabeteGestationnel', 'antecedentPreeclampsie', 'poidsTailleNaissance', 'deroulementGrossesses']
        .forEach(id => conditionner(id, grossessesAnterieures));
      const menopause = field('menopause')?.value === 'oui';
      conditionner('ageMenopause', menopause);
      conditionner('traitementHormonalMenopause', menopause);
      conditionner('detailsTraitementHormonalMenopause', menopause && field('traitementHormonalMenopause')?.value === 'oui');
    }
  }

  window.actualiserResumePatient = refresh;
  document.addEventListener('DOMContentLoaded', () => {

    const patient = field('patient');
    const overview = document.createElement('section');
    overview.id = 'patient-overview';
    overview.setAttribute('aria-label', 'Résumé du dossier patient');
    overview.innerHTML = `<div class="patient-overview-heading"><h2>Vue d’ensemble</h2></div>
            <dl class="patient-overview-grid"><div><dt>Âge</dt><dd id="overview-age"></dd></div><div><dt>Motif de consultation</dt><dd id="overview-motif"></dd></div><div><dt>Objectif principal</dt><dd id="overview-objectif"></dd></div><div><dt>Dernier enregistrement</dt><dd id="overview-date"></dd></div></dl>`;
    patient.prepend(overview);

    const familyField = field('antecedentsFamiliaux');
    const medicalCard = field('antecedentsMedicaux')?.closest('details');
    if (familyField && medicalCard && familyField.closest('details') === medicalCard) {
      const familyCard = document.createElement('details');
      const familySummary = document.createElement('summary');
      familySummary.textContent = 'Antécédents familiaux';
      const familyContent = document.createElement('div');
      familyContent.className = 'section-content';
      const familyLabel = familyField.labels?.[0];
      if (familyLabel) familyContent.append(familyLabel);
      familyContent.append(familyField);
      familyCard.append(familySummary, familyContent);
      medicalCard.after(familyCard);
    }
    const groups = [['Informations générales', ['nom', 'motifConsultation', 'objectif']], ['Contexte de vie et organisation', ['profession', 'hobbies', 'transitFrequence', 'repas']], ['Poids et mesures', ['poidsHabituel', 'tourTaille']], ['Antécédents et traitements', ['antecedentsMedicaux', 'antecedentsFamiliaux', 'autresAllergies', 'autresPathologies', 'traitements']], ['État nutritionnel', ['biologieDateBilan', 'denutPoidsHabituel']]];
    let anchor = overview;
    groups.forEach(([title, ids], index) => {
      const group = document.createElement('section');
      group.className = 'patient-section-group';
      group.setAttribute('aria-labelledby', `patient-group-${index}`);
      const heading = document.createElement('h2');
      heading.id = `patient-group-${index}`;
      heading.textContent = title;
      const grid = document.createElement('div');
      grid.className = 'patient-cards-grid';
      group.append(heading, grid);
      anchor.after(group);
      anchor = group;
      ids.forEach(id => {
        const card = field(id)?.closest('details');
        if (!card) return;
        grid.append(card);
        card.classList.add('patient-experience-card');
        if (['nom', 'profession', 'repas', 'antecedentsMedicaux', 'autresPathologies', 'traitements', 'biologieDateBilan', 'denutPoidsHabituel'].includes(id)) card.classList.add('patient-card-wide');
        const summary = card.querySelector(':scope > summary');
        const body = document.createElement('span');
        body.className = 'patient-summary-body';
        while (summary.firstChild) body.append(summary.firstChild);
        const preview = document.createElement('span');
        preview.className = 'patient-section-preview';
        body.append(preview);
        summary.append(body);
        cards.push({
          card,
          preview
        });

        const content = card.querySelector(':scope > .section-content');
        if (content && [...content.children].every(child => ['LABEL', 'INPUT', 'SELECT', 'TEXTAREA'].includes(child.tagName))) {
          content.classList.add('patient-fields-grid');
          [...content.querySelectorAll(':scope > label[for]')].forEach(label => {
            const control = field(label.htmlFor);
            if (!control || control.parentElement !== content) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'patient-field' + (control.tagName === 'TEXTAREA' ? ' patient-field-wide' : '');
            label.before(wrapper);
            wrapper.append(label, control);
          });
        }
      });
    });

    patient.querySelectorAll(':scope > .patient-two-columns').forEach(group => {
      if (!group.children.length) group.remove();
    });
    [['motifConsultation', 'motifConsultationDetails', val => !!val], ['objectif', 'objectifDetails', val => !!val], ['nombreEnfants', 'agesEnfants', val => Number(val) > 0], ['animauxCompagnie', 'promenadeChien', val => val === 'chien'], ['sportPratique', 'sportType', val => val === 'oui'], ['sportPratique', 'sportFrequence', val => val === 'oui'], ['sportPratique', 'sportDuree', val => val === 'oui'], ['sportPratique', 'sportMoment', val => val === 'oui'], ['grossesseActuelle', 'termeGrossesse', val => val === 'oui'], ['grossesseActuelle', 'poidsAvantGrossesse', val => val === 'oui'], ['grossesseActuelle', 'prisePoidsGrossesseActuelle', val => val === 'oui'], ['menopause', 'ageMenopause', val => val === 'oui'], ['menopause', 'traitementHormonalMenopause', val => val === 'oui'], ['traitementHormonalMenopause', 'detailsTraitementHormonalMenopause', val => val === 'oui'], ['dt1Hypoglycemies', 'dt1HypoglycemiesDetails', val => !!val && val !== 'non'], ['dt2Hypoglycemies', 'dt2HypoglycemiesDetails', val => !!val && val !== 'non']].forEach(([source, id, trigger]) => {
      const target = field(id),
        controller = field(source),
        label = target?.labels?.[0];
      if (target && controller && label) conditions.push({
        controller,
        target,
        label,
        trigger
      });
    });

    patient.addEventListener('input', refresh);
    patient.addEventListener('change', refresh);
    document.addEventListener('patient-save-status', refresh);
    refresh();
  });

})();

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.patients-sidebar');
  const list = document.getElementById('patients-list');
  if (!sidebar || !list) return;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'sidebar-collapse-button';
  sidebar.id ||= 'patients-sidebar';
  toggle.setAttribute('aria-controls', sidebar.id);
  sidebar.querySelector('.sidebar-brand').append(toggle);
  function setCollapsed(collapsed) {
    document.body.classList.toggle('sidebar-compact', collapsed);
    toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (collapsed ? 'm9 5 7 7-7 7' : 'm15 5-7 7 7 7') + '"/></svg>';
    toggle.title = collapsed ? 'Déplier le panneau des patients' : 'Replier le panneau des patients';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-expanded', String(!collapsed));
  }

  let collapsed = false;
  try {
    collapsed = localStorage.getItem('nutriflowSidebarCompact') === 'true';
  } catch {}
  setCollapsed(collapsed);
  toggle.addEventListener('click', () => {
    collapsed = !document.body.classList.contains('sidebar-compact');
    setCollapsed(collapsed);
    try {
      localStorage.setItem('nutriflowSidebarCompact', String(collapsed));
    } catch {}
    window.dispatchEvent(new Event('resize'));
  });

  const quickSearch = document.createElement('button');
  quickSearch.type = 'button';
  quickSearch.className = 'sidebar-compact-search';
  quickSearch.title = 'Rechercher un patient';
  quickSearch.setAttribute('aria-label', 'Rechercher un patient');
  quickSearch.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>';
  sidebar.querySelector('.sidebar-section-title').after(quickSearch);
  quickSearch.addEventListener('click', () => {
    if (collapsed) toggle.click();
    fieldSearchFocus();
  });

  function fieldSearchFocus() {
    document.getElementById('recherchePatient')?.focus({preventScroll: true});
  }

  const backButton = sidebar.querySelector('.sidebar-back-button');
  if (backButton) {
    backButton.title = 'Liste des patients';
    backButton.setAttribute('aria-label', 'Liste des patients');
    backButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg><span class="sidebar-back-label">Liste des patients</span>';
  }

  const newButton = sidebar.querySelector('.sidebar-new-button');
  newButton.innerHTML = '<span aria-hidden="true">+</span><span class="sidebar-new-label">Nouveau</span>';
  document.getElementById('recherchePatient').setAttribute('aria-label', 'Rechercher un patient');

  const enrichRows = () => list.querySelectorAll('.patient-list-item').forEach(row => {
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    const name = row.querySelector('.patient-list-info strong')?.textContent.trim() || 'Patient';
    row.setAttribute('aria-label', 'Ouvrir le dossier de ' + name);
    row.setAttribute('aria-current', row.classList.contains('patient-active') ? 'true' : 'false');
    row.title = name;
    const more = row.querySelector('.patient-more-button');
    if (more && more.textContent.trim() !== '⋯') more.textContent = '⋯';
  });

  enrichRows();
  new MutationObserver(enrichRows).observe(list, {
    childList: true
  });

  list.addEventListener('keydown', event => {
    if (event.target.matches('.patient-list-item') && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      event.target.click();
    }
  });

  const mobileToggle = document.querySelector('.mobile-sidebar-toggle');
  const closeMobile = document.createElement('button');
  closeMobile.type = 'button';
  closeMobile.className = 'sidebar-mobile-close';
  closeMobile.textContent = 'Fermer';
  closeMobile.addEventListener('click', () => {
    fermerSidebarMobile();
    mobileToggle?.focus();
  });

  sidebar.querySelector('.sidebar-footer').append(closeMobile);
  sidebar.addEventListener('keydown', event => {
    if (event.key === 'Escape' && matchMedia('(max-width: 780px)').matches) {
      fermerSidebarMobile();
      mobileToggle?.focus();
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const patient = document.getElementById('patient');
  patient?.addEventListener('click', event => {
    const summary = event.target.closest('summary');
    const card = summary?.parentElement;
    if (!card?.matches('details.patient-experience-card') || card.open) return;
    requestAnimationFrame(() => {
      if (!card.open || !patient.classList.contains('active')) return;
      const rect = card.getBoundingClientRect();
      const nav = document.querySelector('.main-nav');
      // La navigation atteint 60 px une fois étendue.
      const top = Math.max(60, nav?.getBoundingClientRect().height || 0) + 16;
      const bottom = window.innerHeight - 20;
      let offset = 0;
      if (rect.height > bottom - top || rect.top < top) {
        offset = rect.top - top;
      } else if (rect.bottom > bottom) {
        offset = rect.bottom - bottom;
      }
      if (Math.abs(offset) < 2) return;
      window.scrollTo({
        top: Math.max(0, window.scrollY + offset),
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
    });
  });
});
