/* Aides de consultation et décisions explicites, indépendantes des calculs. */
(() => {
  let goals = [];
  let panel;
  const clone = value => JSON.parse(JSON.stringify(value));
  const make = (tag, cls, text) => {const el=document.createElement(tag); if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const save = () => window.sauvegarderDossierAutomatiquement?.();
  const render = () => {
    if (!panel) return;
    const list=panel.querySelector('.clinical-goals-list');
    list.replaceChildren();
    if (!goals.length) list.append(make('p','clinical-empty-goals','Aucun objectif retenu. Sélectionnez une proposition ci-dessous ou ajoutez votre propre objectif.'));
    goals.forEach((goal,index)=>{
      const row=make('div','clinical-goal');
      const label=make('label','','Objectif '+(index+1));
      const field=make('textarea');field.value=goal.text;field.rows=2;field.maxLength=4000;
      field.addEventListener('input',()=>{goal.text=field.value;save();});
      label.append(field);row.append(label);
      if(goal.source)row.append(make('small','','Issu de : '+goal.source));
      const remove=make('button','btn-secondary','Retirer');remove.type='button';remove.setAttribute('aria-label','Retirer l’objectif '+(index+1));
      remove.onclick=()=>{goals.splice(index,1);render();save();panel.querySelector('[data-add-goal]').focus();};row.append(remove);list.append(row);
    });
  };
  window.clinicalGoals = {
    get:()=>clone(goals),
    set(value){goals=Array.isArray(value)?value.filter(g=>g&&typeof g.text==='string').map(g=>({text:g.text,source:typeof g.source==='string'?g.source:''})):[];render();}
  };
  function goTo(tabId, fieldId) {
    window.ouvrirOnglet(tabId,document.querySelector(`[aria-controls="${tabId}"]`));
    requestAnimationFrame(()=>{
      const target=document.getElementById(fieldId)||document.getElementById(tabId);
      for(let node=target.parentElement;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
      const focus=target.matches('input,select,textarea,button')?target:target.querySelector('input:not([type="hidden"]),select,button');
      target.scrollIntoView({block:'center',behavior:'instant'});focus?.focus({preventScroll:true});
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const care=document.getElementById('priseEnChargePathologies');
    if(care){
      panel=make('section','nutrition-calc-card clinical-goals');panel.id='clinicalGoals';
      panel.append(make('h3','','Objectifs retenus en consultation'),make('p','','Décisions du diététicien, enregistrées dans ce dossier. Les propositions automatiques restent présentées séparément.'));
      const list=make('div','clinical-goals-list');panel.append(list);
      const add=make('button','btn-secondary','Ajouter un objectif');add.type='button';add.dataset.addGoal='';
      add.onclick=()=>{goals.push({text:'',source:''});render();list.querySelector('.clinical-goal:last-child textarea').focus();save();};panel.append(add);care.before(panel);render();
      const enhance=()=>care.querySelectorAll('.pec-diabetes-objective').forEach(objective=>{
        if(objective.querySelector('[data-retain-goal]'))return;
        const button=make('button','clinical-retain-goal','Retenir cet objectif');button.type='button';button.dataset.retainGoal='';
        button.onclick=()=>{
          const value=objective.querySelector('span')?.textContent.trim()||[...objective.children].filter(el=>el!==button&&el.tagName!=='STRONG').map(el=>el.textContent.trim()).join(' ');
          if(!value)return;
          const source=objective.closest('article')?.querySelector('h4')?.textContent.trim()||'Proposition nutritionnelle';
          if(!goals.some(g=>g.text===value&&g.source===source)){goals.push({text:value,source});render();save();}
          panel.scrollIntoView({block:'start',behavior:'instant'});panel.querySelector('textarea')?.focus({preventScroll:true});
        };objective.append(button);
      });
      let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance();});}).observe(care,{childList:true,subtree:true});enhance();
    }

    const plan=document.getElementById('plan');
    if(plan){
      const links=make('nav','clinical-complete-links');links.setAttribute('aria-label','Compléter les données du dossier');
      const configs=[['Compléter l’anamnèse','anamnese','anm-repas-container'],['Renseigner le bilan lipidique','patient','bioLdl'],['Compléter poids et taille','patient','poids']];
      configs.forEach(([label,tab,field])=>{const b=make('button','btn-secondary',label);b.type='button';b.onclick=()=>goTo(tab,field);links.append(b);});
      plan.querySelector('.module-header')?.after(links);
    }

    const tables=()=>document.querySelectorAll('.nutrition-reference-table-wrapper, .hta-analysis-table-wrap, .dyslip-table-wrap').forEach(wrap=>{
      if(wrap.classList.contains('clinical-table-scroll'))return;
      wrap.classList.add('clinical-table-scroll');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',wrap.querySelector('table')?.getAttribute('aria-label')||'Tableau nutritionnel défilant');
    });
    let pending=false;new MutationObserver(()=>{
      if(pending)return;
      pending=true;requestAnimationFrame(()=>{pending=false;tables();});
    }).observe(document.querySelector('.workspace'),{subtree:true,childList:true});tables();
  });
})();
