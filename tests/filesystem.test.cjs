const test=require('node:test'),assert=require('node:assert/strict');
const files=require('../filesystem.js');
test('root list and command suggestions separate files and directories',()=>{
 assert.deepEqual(files.list([]),['SKILLS/','EXPERIENCE/','PROJECTS/','PUBLICATIONS/','README.md']);
 assert.deepEqual(files.candidates([],'cd',''),['SKILLS','EXPERIENCE','PROJECTS','PUBLICATIONS']);
 assert.deepEqual(files.candidates([],'cat',''),['README.md']);
});
test('nested navigation, parent paths and case sensitivity',()=>{
 assert.deepEqual(files.resolve([],'SKILLS/3D-MODELING').path,['SKILLS','3D-MODELING']);
 assert.deepEqual(files.resolve(['SKILLS','HARDWARE'],'..').path,['SKILLS']);
 assert.deepEqual(files.resolve(['SKILLS'],'/portfolio/EXPERIENCE/PROFESSIONAL-EXPERIENCE').path,['EXPERIENCE','PROFESSIONAL-EXPERIENCE']);
 assert.equal(files.resolve([],'skills'),null);assert.equal(files.resolve([],'missing'),null);
 assert.equal(files.resolve(['SKILLS'],'../README.md').node.url,'./readme.html');
});
test('completion supports child directories and path prefixes',()=>{
 assert.deepEqual(files.candidates(['SKILLS'],'cd','M'),['MANUFACTURING','MACHINE-LEARNING']);
 assert.deepEqual(files.candidates([],'cd','SKILLS/3'),['SKILLS/3D-MODELING']);
 assert.deepEqual(files.candidates(['EXPERIENCE'],'cd','P'),['PROFESSIONAL-EXPERIENCE']);
 assert.deepEqual(files.candidates(['PROJECTS'],'cd',''),['..']);
});
test('removal log covers every listed entry exactly once, children before parent',()=>{
 const log=files.removalLog();const expected=[];
 function walk(node,path){for(const [name,child] of Object.entries(node.children||{})){walk(child,path+'/'+name);}expected.push((node.type==='directory'?"removed directory '":"removed '")+path+"'");}
 walk(files.tree,'/portfolio');assert.deepEqual(log,[...expected,'Session terminated.']);assert.equal(new Set(log).size,log.length);
 assert.ok(log.indexOf("removed directory '/portfolio/SKILLS/HARDWARE'")<log.indexOf("removed directory '/portfolio/SKILLS'"));
});
