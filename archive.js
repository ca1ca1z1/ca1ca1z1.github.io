(()=>{'use strict';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function type(el,text){for(const char of text){el.textContent+=char;await wait(8);}}
const entries=[
 {id:'#1',date:'2012/03/11',paragraphs:['方舟牛逼，方舟牛逼，方舟牛逼。','终末地牛逼，终末地牛逼，终末地牛逼。']},
 {id:'#3',date:'2016/09/05',paragraphs:['Placeholder: another chapter of my story.']},
 {id:'#17',date:'2021/12/30',paragraphs:['Placeholder: projects, lessons, and things I am building.']},
 {id:'???',date:'----',locked:true,paragraphs:['原神牛逼。']}
];
async function paragraphs(panel,items){for(const text of items){const p=document.createElement('p');panel.append(p);await type(p,text);}}
async function unlock(panel,entry,button){
 const progress=document.createElement('p');panel.append(progress);
 await type(progress,'> loading archive... ');
 const value=document.createElement('span');progress.append(value);
 for(let n=0;n<=99;n++){value.textContent=n+'%';await wait(n>90?35:10);}
 const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),submit=document.createElement('button');
 input.id='archive-password';input.type='password';input.autocomplete='off';input.required=true;input.setAttribute('aria-label','Archive password');label.htmlFor=input.id;submit.type='submit';
 form.append(label,input,submit);panel.append(form);input.hidden=true;submit.hidden=true;
 await type(label,'> enter password:');await type(submit,'[enter]');input.hidden=false;submit.hidden=false;
 if(!panel.hidden)input.focus({preventScroll:true});
 let busy=false;
 form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;busy=true;input.disabled=true;submit.disabled=true;
  const accepted=input.value==='0123';input.value='';
  const status=document.createElement('p');status.className=accepted?'success':'error';status.setAttribute('role','status');form.before(status);
  await type(status,accepted?'> Authentication successful.':'> Access denied.');
  if(accepted){form.remove();await paragraphs(panel,entry.paragraphs);}
  else{busy=false;input.disabled=false;submit.disabled=false;if(!panel.hidden)input.focus({preventScroll:true});}
 };
}
async function boot(){
 await type(document.querySelector('#access-text'),'> accessing □□ archive...');
 const spinner=document.querySelector('#spinner'),frames=['/','-','\\','|'];let i=0;spinner.textContent=frames[0];
 const timer=setInterval(()=>{spinner.textContent=frames[++i%frames.length];},100);await wait(1600);clearInterval(timer);spinner.textContent='';
 for(const [index,entry] of entries.entries()){
  const article=document.createElement('article'),button=document.createElement('button'),name=document.createElement('span'),date=document.createElement('span'),panel=document.createElement('div');
  article.className='entry';panel.className='content';panel.id='devlog-'+index;panel.hidden=true;button.type='button';button.disabled=true;button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',panel.id);button.append(name,date);article.append(button,panel);document.querySelector('#logs').append(article);
  await type(name,'> devlog found: '+entry.id);await type(date,'TT '+entry.date);button.disabled=false;
  let started=false;
  button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!started){started=true;if(entry.locked)unlock(panel,entry,button);else paragraphs(panel,entry.paragraphs);}};
 }
 const exit=document.querySelector('#exit'),prefix=document.createElement('span');prefix.className='prompt';exit.append(prefix);await type(prefix,'guest@caicaizi:/portfolio$ ');const command=document.createElement('span');exit.append(command);await type(command,'exit');
}
boot();
})();
