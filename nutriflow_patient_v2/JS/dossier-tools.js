/* Sauvegardes portables et reprise de consultation, sans service distant. */
(function(global) {
  'use strict';
  function validateBackup(value) {
    if (!value || value.format !== 'NutriFlow' || value.version !== 1 || !Array.isArray(value.patients)) throw Error('Format de sauvegarde non reconnu.');
    const ids = new Set();
    for (const patient of value.patients) {
      if (!patient || !Number.isSafeInteger(patient.id) || patient.id <= 0 || ids.has(patient.id) || typeof patient.nom !== 'string' || !patient.nom.trim() || typeof patient.prenom !== 'string' || !patient.prenom.trim()) throw Error('Dossier invalide ou identifiant dupliqué.');
      ids.add(patient.id);
      if (patient.formulaire != null && (typeof patient.formulaire !== 'object' || Array.isArray(patient.formulaire))) throw Error('Champs de dossier invalides.');
      for (const key of ['anamnese','allergies','pathologies','objectifsRetenusConsultation']) if (patient[key] != null && !Array.isArray(patient[key])) throw Error('Liste de dossier invalide : '+key);
      for (const key of ['allergies','pathologies']) if (patient[key]?.some(item=>typeof item!=='string')) throw Error('Valeur de dossier invalide : '+key);
      for (const field of Object.values(patient.formulaire || {})) {
        if (!field || typeof field!=='object' || Array.isArray(field) || ('value' in field && typeof field.value!=='string') || ('values' in field && (!Array.isArray(field.values)||field.values.some(x=>typeof x!=='string')))) throw Error('Valeur de formulaire invalide.');
      }
      if(patient.objectifsRetenusConsultation?.some(goal=>!goal||typeof goal.text!=='string'||(goal.source!=null&&typeof goal.source!=='string')))throw Error('Objectif retenu invalide.');
      if(patient.anamnese?.some(row=>!row||typeof row!=='object'||!Number.isFinite(row.id)||!Number.isInteger(row.meal)||row.meal<0||row.meal>20||(row.foodName!=null&&typeof row.foodName!=='string')))throw Error('Ligne alimentaire invalide.');
    }
    const inspect = (obj, depth=0) => {
      if(depth>30)throw Error('Structure de sauvegarde trop profonde.');
      if(!obj || typeof obj!=='object')return;
      for(const [key,item]of Object.entries(obj)){
        if(['__proto__','prototype','constructor'].includes(key))throw Error('Structure de sauvegarde interdite.');
        inspect(item,depth+1);
      }
    };
    inspect(value);
    return value.patients;
  }
  if(typeof module!=='undefined' && module.exports)module.exports={validateBackup};
  if(!global.document)return;
  const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  function download(value,name) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
    const link=el('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  global.nutriFlowBackup={validateBackup};

  // Les préférences ne contiennent ni valeurs cliniques ni identité nominative.
  let restoring=false;
  let timer;
  const key='nutriflow_consultation_v1';
  const readViews=()=>{try{const value=JSON.parse(sessionStorage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}};
  const detailKey=detail=>detail.id||detail.querySelector('input[id],select[id],textarea[id]')?.id||detail.querySelector('summary')?.textContent.trim();
  const capture=()=>{
    if(restoring || typeof patientActif==='undefined' || !patientActif?.id)return;
    const active=document.querySelector('.tab-content.active');if(!active)return;
    const views=readViews();
    views[patientActif.id]={tab:active.id,scroll:Math.max(0,window.scrollY),details:[...document.querySelectorAll('.workspace details')].map(detail=>({key:detailKey(detail),open:detail.open})).filter(x=>x.key)};
    try{sessionStorage.setItem(key,JSON.stringify(views));}catch{/* La consultation reste utilisable si le stockage est indisponible. */}
  };
  global.clinicalSession={capture,beginRestore(){restoring=true;},restore(id){
    clearTimeout(timer);
    const view=readViews()[id];if(!view || !document.getElementById(view.tab)?.classList.contains('tab-content')){restoring=false;return;}
    restoring=true;
    ouvrirOnglet(view.tab,document.querySelector(`.nav-tab[aria-controls="${view.tab}"]`));
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const states=new Map((view.details||[]).map(item=>[item.key,item.open]));
      document.querySelectorAll('.workspace details').forEach(detail=>{const saved=states.get(detailKey(detail));if(typeof saved==='boolean')detail.open=saved;});
      window.scrollTo({top:Math.max(0,Number(view.scroll)||0),behavior:'instant'});
      requestAnimationFrame(()=>{restoring=false;});
    }));
  }};
  window.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(capture,180);},{passive:true});
  document.addEventListener('toggle',()=>{clearTimeout(timer);timer=setTimeout(capture,100);},true);
  window.addEventListener('pagehide',capture);

  document.addEventListener('DOMContentLoaded',()=>{
    const dialog=el('dialog');dialog.className='dossier-backup-dialog';dialog.setAttribute('aria-labelledby','backupTitle');
    const title=el('h2','Sauvegarde des dossiers');title.id='backupTitle';
    const message=el('p','Exportez vos dossiers dans un fichier JSON. Ce fichier contient les données des patients : conservez-le dans un emplacement protégé.');
    const status=el('p');status.setAttribute('role','status');status.className='backup-status';
    const exportButton=el('button','Exporter les dossiers');exportButton.type='button';exportButton.className='btn-primary';
    exportButton.onclick=()=>{if(!finaliserSauvegardeEnAttente()){status.textContent='Enregistrement impossible. Corrigez le dossier ou exportez les modifications en attente ci-dessous.';return;}download({format:'NutriFlow',version:1,exportedAt:new Date().toISOString(),patients},'NutriFlow-'+new Date().toISOString().slice(0,10)+'.json');status.textContent=patients.length+' dossier(s) exporté(s).';};
    const rescue=el('button','Exporter les modifications en attente');rescue.type='button';rescue.className='btn-secondary';
    rescue.onclick=()=>{const data=collecterDonneesPatient();if(!data.nom||!data.prenom){status.textContent='Renseignez le nom et le prénom avant cet export.';return;}const current={...patientActif,...data,id:patientActif?.id||Date.now(),dateModification:new Date().toISOString()};download({format:'NutriFlow',version:1,exportedAt:new Date().toISOString(),patients:[current]},'NutriFlow-dossier-en-attente.json');status.textContent='Copie du dossier courant exportée. Cet export ne remplace pas l’enregistrement local.';};
    const label=el('label','Choisir une sauvegarde à restaurer');
    const input=el('input');input.type='file';input.accept='.json,application/json';label.append(input);
    const replaceLabel=el('label');replaceLabel.className='backup-replace-option';const replace=el('input');replace.type='checkbox';replaceLabel.append(replace,el('span','Remplacer aussi les dossiers portant le même identifiant (sinon, ils sont conservés).'));
    const apply=el('button','Restaurer les dossiers affichés');apply.type='button';apply.disabled=true;apply.className='btn-primary';
    let incoming=null;
    const preview=()=>{if(!incoming)return;const conflicts=incoming.filter(p=>patients.some(old=>old.id===p.id)).length;status.textContent=`${incoming.length} dossier(s) lu(s) : ${incoming.length-conflicts} nouveau(x), ${conflicts} déjà présent(s) ${replace.checked?'à remplacer':'conservé(s)'}. Les autres dossiers locaux seront conservés.`;};
    replace.onchange=preview;
    input.onchange=async()=>{incoming=null;apply.disabled=true;const file=input.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('Fichier trop volumineux (20 Mo maximum).');incoming=validateBackup(JSON.parse(await file.text()));preview();apply.disabled=false;}catch(error){status.textContent=error.message;}};
    apply.onclick=()=>{
      if(!incoming)return;
      const recovery=erreurChargementPatients;
      if(recovery){
        if(!confirm('Le stockage actuel est illisible. Restaurer cette sauvegarde à sa place ? Une copie brute du stockage actuel sera conservée avant remplacement.'))return;
        if(!Stockage.ecrire('nutriflow_corrupt_before_restore_v1',{raw:localStorage.getItem(PATIENTS_STORAGE_KEY),savedAt:new Date().toISOString()})){status.textContent='Récupération annulée : copie brute impossible.';return;}
      } else if(!finaliserSauvegardeEnAttente()){status.textContent='La restauration attend l’enregistrement du dossier courant.';return;}
      const previous=patients.slice();const map=new Map(previous.map(p=>[p.id,p]));
      incoming.forEach(p=>{if(replace.checked||!map.has(p.id))map.set(p.id,p);});
      if(!Stockage.ecrire('nutriflow_before_restore_v1',{format:'NutriFlow',version:1,exportedAt:new Date().toISOString(),patients:previous})){status.textContent='Restauration annulée : impossible de conserver la copie de sécurité.';return;}
      patients=[...map.values()];
      if(recovery)erreurChargementPatients=false;
      if(!sauvegarderPatients()){patients=previous;erreurChargementPatients=recovery;status.textContent='Restauration annulée. Le stockage local n’a pas été remplacé.';return;}
      const activeId=patientActif?.id;
      if(activeId)ouvrirPatient(activeId);else afficherPatients();
      status.textContent='Restauration terminée. Une copie de l’état précédent reste disponible ci-dessous.';incoming=null;apply.disabled=true;
    };
    const previous=el('button','Télécharger la copie avant restauration');previous.type='button';previous.className='btn-secondary';previous.onclick=()=>{const saved=Stockage.lire('nutriflow_before_restore_v1',null);if(!saved){status.textContent='Aucune restauration précédente.';return;}download(saved,'NutriFlow-avant-restauration.json');};
    const rawCopy=el('button','Télécharger la copie du stockage endommagé');rawCopy.type='button';rawCopy.className='btn-secondary';rawCopy.onclick=()=>{const saved=Stockage.lire('nutriflow_corrupt_before_restore_v1',null);if(!saved){status.textContent='Aucune récupération de stockage endommagé.';return;}download(saved,'NutriFlow-recuperation-brute.json');};
    const close=el('button','Fermer');close.type='button';close.className='btn-secondary';close.onclick=()=>dialog.close();
    dialog.append(title,message,exportButton,rescue,label,replaceLabel,status,apply,previous,rawCopy,close);document.body.append(dialog);
    const open=el('button','Sauvegarde des dossiers');open.type='button';open.className='clinical-backup-open';open.onclick=()=>dialog.showModal();document.querySelector('.patients-sidebar').append(open);
    const plan=document.getElementById('plan');
    const provenance=el('aside');provenance.className='clinical-provenance';provenance.setAttribute('aria-label','Provenance des informations');
    const legend=el('p','Données saisies : dossier et bilan · Apports calculés : anamnèse · Repères : références affichées · Décisions : objectifs retenus en consultation.');
    const dates=el('p');provenance.append(legend,dates);plan.querySelector('.module-header').after(provenance);
    const updateDates=()=>{
      const inputs=[...document.querySelectorAll('.biology-card input[type="date"]')].filter(i=>i.value);
      const values=[...new Set(inputs.map(i=>i.value))].sort();
      if(!values.length){dates.textContent='Biologie : aucune date de bilan renseignée.';return;}
      const today=new Date();const format=value=>new Date(value+'T12:00:00').toLocaleDateString('fr-FR');
      const oldest=new Date(values[0]+'T12:00:00');const days=Math.floor((today-oldest)/86400000);
      const future=values.some(value=>new Date(value+'T00:00:00')>today);
      dates.textContent=(values.length===1?'Date de bilan renseignée : '+format(values[0]):'Dates de biologie renseignées : du '+format(values[0])+' au '+format(values.at(-1)))+(future?' · Date future à vérifier.':days>180?' · Au moins un bilan date de plus de 6 mois : actualité à vérifier selon le contexte.':'')+' Les dates propres à chaque résultat restent consultables dans Biologie sanguine.';
    };
    document.addEventListener('patient-save-status',updateDates);document.addEventListener('change',updateDates);updateDates();
    // Navigation clavier standard de la barre d’onglets.
    document.querySelector('.main-nav').addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!event.target.matches('.nav-tab'))return;
      const tabs=[...document.querySelectorAll('.main-nav .nav-tab')];const i=tabs.indexOf(event.target);
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      event.preventDefault();tabs[next].click();tabs[next].focus();
    });
  });
})(typeof window==='undefined'?globalThis:window);
