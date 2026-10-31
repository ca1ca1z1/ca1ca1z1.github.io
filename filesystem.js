(function(root){'use strict';
const directory=children=>({type:'directory',children:Object.fromEntries(Object.entries(children).sort(([a,x],[b,y])=>{
 if(x.type!==y.type)return x.type==='directory'?-1:1;
 return a<b?-1:a>b?1:0;
}))});
const tree=directory({
 SKILLS:directory({
  'PROGRAMMING_LANGUAGES':directory({}),
  HARDWARE:directory({}),
  '3D_MODELING':directory({}),
  MANUFACTURING:directory({}),
  DATABASES:directory({}),
  'MACHINE_LEARNING':directory({})
 }),
 EXPERIENCE:directory({
  'PROFESSIONAL_EXPERIENCE':directory({}),
  'ADDITIONAL_EXPERIENCE':directory({})
 }),
 PROJECTS:directory({}),
 PUBLICATIONS:directory({}),
 'README.md':{type:'file',url:'./readme.html'}
});
function nodeAt(path){let node=tree;for(const name of path){if(node.type!=='directory'||!Object.hasOwn(node.children,name))return null;node=node.children[name];}return node;}
function resolve(current,arg){
 let path=arg.startsWith('/')?[]:[...current];
 if(arg.startsWith('/')){if(arg!=='/portfolio'&&!arg.startsWith('/portfolio/'))return null;arg=arg.slice('/portfolio'.length);}
 for(const part of arg.split('/')){if(!part||part==='.')continue;if(part==='..')path.pop();else{const parent=nodeAt(path);if(parent?.type!=='directory'||!Object.hasOwn(parent.children,part))return null;path.push(part);}}
 const node=nodeAt(path);return node?{path,node}:null;
}
function list(path){const node=nodeAt(path);return node?.type==='directory'?Object.entries(node.children).map(([name,item])=>name+(item.type==='directory'?'/':'')):[];}
function candidates(path,cmd,arg){
 if(cmd!=='cd'&&cmd!=='cat')return [];
 const slash=arg.lastIndexOf('/'),prefix=slash<0?'':arg.slice(0,slash+1),fragment=arg.slice(slash+1);
 const base=prefix?resolve(path,prefix):{path,node:nodeAt(path)};
 if(base?.node.type!=='directory')return [];
 const names=Object.entries(base.node.children).filter(([,node])=>node.type===(cmd==='cd'?'directory':'file')).map(([name])=>name);
 if(cmd==='cd'&&base.path.length)names.push('..');
 return names.filter(name=>name.startsWith(fragment)).map(name=>prefix+name);
}
function removalLog(){const lines=[];function walk(node,path){if(node.type==='directory'){for(const [name,child] of Object.entries(node.children))walk(child,path+'/'+name);lines.push("removed directory '"+path+"'");}else lines.push("removed '"+path+"'");}walk(tree,'/portfolio');return [...lines,'Session terminated.'];}
const api={tree,nodeAt,resolve,list,candidates,removalLog};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.portfolioFiles=api;
})(typeof window!=='undefined'?window:globalThis);
