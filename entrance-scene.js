/* One beat is one discrete LOGIN-row shift, not a display refresh frame.
   All choreography is a pure function of elapsed time: seeking, resize and
   low refresh rates cannot accumulate timing errors. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortfolioEntrance = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const BEAT_MS = 140;
  const T = Object.freeze({grid:15, gridFull:20, corners:20, login:24, top:29,
    bottom:30.5, systemFull:32, rails:32, railsFull:35, password:40,
    passwordFull:46, flash:47, passwordGone:49, roll:47, blue:48,
    circles:52, clearBlue:56, green:59, clearGeometry:61, allGreen:63,
    fan:64, fanPeak:67, noGuides:69, noChecks:70, fanEnd:72,
    inverse:82, normal:83, greenFlash:84, clear:85, end:86.5});
  const WHITE='#f3f3ed', BLACK='#101010', BLUE='#182bff', GREEN='#a3ff77';
  const CELL=31, SIZE=CELL*5, HALF=SIZE/2;
  const clamp=x=>Math.max(0,Math.min(1,x));
  const out=x=>1-Math.pow(1-clamp(x),3);
  function progressAt(f) {
    if(f<40)return .6*out(f/40);
    if(f<46)return .6;
    if(f<67)return .6+.3*out((f-46)/21);
    if(f<73)return .9;
    if(f<82)return .9+.1*out((f-73)/9);
    return 1;
  }
  const QUADS=[{c:0,r:3,label:'COM'},{c:3,r:3,label:'AUT'},
    {c:0,r:0,label:'VER'},{c:3,r:0,label:'SUB'}];
  const CHECKS=['CHECK 23','CHECK 4','CHECK 8','CHECK 11','LOGS 5'];
  const PASSWORD_AT=[40,41.25,43.5,44.75,46];
  const CORNERS=[{c:0,r:0,char:'C',on:20,off:26.5},
    {c:4,r:0,char:'A',on:20.75,off:28},
    {c:0,r:4,char:'0',on:21.5,off:24},
    {c:4,r:4,char:'1',on:22.25,off:25}];
  function stateAt(f) {
    const cells=[];
    for(let r=0;r<5;r++) for(let c=0;c<5;c++) {
      const ring=Math.min(r,4-r)+Math.min(c,4-c);
      let reveal=out((f-T.grid-ring*.65)/1.6);
      if(r===2 && f>=T.login+c) reveal=0;
      if(r===0 && c%2===0 && f>=T.top+(4-c)*.25) reveal=0;
      if(r===4 && c%2===0 && f>=T.bottom+(4-c)*.25) reveal=0;
      if(f>=T.clearBlue) reveal=0;
      cells.push({r,c,reveal});
    }
    const rollStep=Math.floor(f-T.roll);
    // 11011 -> 01101 -> 10110, preserving the stationary LOGIN below.
    const rolling=Array.from({length:5},(_,c)=>((c-rollStep)%3+3)%3!==2);
    const fan=Array.from({length:5},(_,c)=>{
      const start=T.fan+(4-c)*.5, age=f-start;
      return {c,start,peak:start+3,end:start+6,
        height:age<0?0:age<=3?SIZE*out(age/3):SIZE*(1-Math.pow(clamp((age-3)/3),3))};
    });
    return {f,cells,rolling,fan,
      corners:CORNERS.filter(c=>f>=c.on&&f<c.off),
      passwordCount:PASSWORD_AT.filter(at=>f>=at).length,
      passwordVisible:f<T.passwordGone&&(f<T.flash||Math.floor((f-T.flash)*2)%2===0),
      passwordBlue:f>=T.flash,
      railReveal:out((f-T.rails)/3),
      railErase:clamp((f-T.clearGeometry)/(T.fanPeak-T.clearGeometry)),
      greenCount:Math.min(5,Math.max(0,Math.floor(f-T.green)+1)),
      guides:f>=T.clearBlue&&f<T.noGuides,
      guideProgress:out((f-T.clearBlue)/(T.allGreen-T.clearBlue)),
      welcome:f<T.fanPeak||f>=T.clear?'none':f<T.inverse?'white':f<T.normal?'inverse':f<T.greenFlash?'white':'green',
      progress:progressAt(f)};
  }
  function render(ctx,width,height,f) {
    const s=stateAt(f);
    function rect(x,y,w,h,color=WHITE){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
    function text(value,x,y,size=9,color=WHITE,align='center'){
      ctx.fillStyle=color;ctx.font=`500 ${size}px "Courier New", monospace`;
      ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(value,x,y);
    }
    function line(x,y,X,Y,color=WHITE){ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke();}
    ctx.globalAlpha=1;rect(0,0,width,height,BLACK);
    if(f>=T.clear)return; // Pure background, including removal of the HUD.
    const margin=width<600?24:48;
    text('CAI / PERSONAL ARCHIVE',margin,32,9,'#777','left');
    text('INTRO SEQUENCE',width-margin,32,9,'#777','right');
    // Existing progress-bar dimensions, labels and fill style are unchanged.
    const count=28,unit=Math.min(10,(width-80)/count),x=width/2-count*unit/2;
    const y=height-(width<600?110:72);
    for(let i=0;i<count;i++){
      ctx.strokeStyle='#2e2e2e';ctx.lineWidth=.6;ctx.strokeRect(x+i*unit,y,unit,17);
      if(i<s.progress*count)rect(x+i*unit+3,y+6,2,5,i%4===0?WHITE:'#666');
    }
    text(String(Math.floor(s.progress*100)).padStart(3,'0'),x,y-12,8,'#9b9b9b','left');
    text('PORTFOLIO / 001',x+count*unit,y-12,8,'#777','right');
    const scale=Math.min(1.2,Math.max(.75,width/1100),height/620,(width-40)/320);
    const centerY=height*.47;
    ctx.save();ctx.translate(width/2,centerY);ctx.scale(scale,scale);
    if(f<T.grid){
      ctx.globalAlpha=1-clamp((f-12)/3);
      const first='CAICAIZI',second='PERSONAL PORTFOLIO';
      const n=Math.min(first.length,Math.floor(Math.max(0,f-.5)*2));
      const m=Math.min(second.length,Math.floor(Math.max(0,f-5)*3));
      text(first.slice(0,n),0,-9,17);
      text(second.slice(0,m),0,14,7,'#aaa');
      // Insert-mode caret follows the typed text, without the old CA emblem.
      if(f<10.8 && Math.floor(f*2)%2===0){
        const size=n<first.length?17:7, value=n<first.length?first.slice(0,n):second.slice(0,m);
        const cy=n<first.length?-9:14;
        ctx.font=`500 ${size}px "Courier New", monospace`;
        const end=ctx.measureText(value).width/2;
        rect(end+2,cy-size/2,1,size);
      }
      ctx.restore();ctx.globalAlpha=1;return;
    }
    // Stationary lettering sits underneath all white and blue geometry.
    function systemLetters(){
      for(let c=0;c<5;c++)if(f<s.fan[c].peak){
        if(f>=T.top)text('S-Y-S'[c],(c-2)*CELL,-2*CELL,10);
        if(f>=T.bottom)text('T-E-M'[c],(c-2)*CELL,2*CELL,10);
      }
    }
    systemLetters();
    if(f>=T.login&&f<T.clearBlue)for(let c=0;c<5;c++)text('LOGIN'[c],(c-2)*CELL,0,7);
    // Every tile opens from its own vertical centerline; rings start at corners.
    for(const {r,c,reveal} of s.cells)if(reveal>0){
      const w=(CELL-1)*reveal;
      rect((c-2)*CELL-w/2,(r-2.5)*CELL,w,CELL-1);
    }
    for(const corner of s.corners)text(corner.char,(corner.c-2)*CELL,(corner.r-2)*CELL,9,BLACK);
    if(f>=T.login&&f<T.passwordGone){
      const caption='Use Authenticator Code';
      const n=Math.floor(caption.length*clamp((f-T.login)/(T.systemFull-T.login)));
      ctx.font='500 6px "Courier New", monospace';
      const left=-ctx.measureText(caption).width/2;
      text(caption.slice(0,n),left,103,6,'#777','left');
    }
    if(s.passwordVisible)for(let c=0;c<s.passwordCount;c++)text('*',(c-2)*CELL,CELL+3,23,s.passwordBlue?BLUE:BLACK);
    // LOGIN blocks jump by whole cells; the letters underneath never move.
    if(f>=T.roll&&f<T.clearGeometry)for(let c=0;c<5;c++)if(s.rolling[c])rect((c-2.5)*CELL,-CELL/2,CELL-1,CELL-1);
    // Four corner groups: COM -> AUT -> VER -> SUB, one group per beat.
    for(let i=0;i<QUADS.length;i++){
      const q=QUADS[i],qx=(q.c-2.5)*CELL,qy=(q.r-2.5)*CELL;
      if(f>=T.blue+i&&f<T.clearBlue){
        rect(qx,qy,CELL*2-1,CELL*2-1,BLUE);
        text('/',qx+CELL,qy+CELL,32);
        const n=Math.min(3,Math.floor(clamp(f-T.blue-i)*3));
        ctx.font='500 5px "Courier New", monospace';
        text(q.label.slice(0,n),qx+CELL*2-4-ctx.measureText(q.label).width,qy+CELL*2-6,5,WHITE,'left');
      }
      if(f>=T.circles+i&&f<T.clearGeometry){
        for(let r=0;r<2;r++)for(let c=0;c<2;c++){
          ctx.beginPath();ctx.arc(qx+CELL*(c+.5)-.5,qy+CELL*(r+.5)-.5,(CELL-1)/2,0,Math.PI*2);ctx.fillStyle=WHITE;ctx.fill();
        }
      }
    }
    // Top-to-bottom reveal, upward-scrolling type, then top-to-bottom erasure.
    if(f>=T.rails&&f<T.fanPeak){
      const top=-HALF+SIZE*s.railErase,bottom=-HALF+SIZE*s.railReveal;
      for(const rx of [-92,92])if(bottom>top){
        ctx.save();ctx.beginPath();ctx.rect(rx-5,top,10,bottom-top);ctx.clip();
        rect(rx-5,-HALF,10,SIZE);
        const label='GET PERMISSIONS ';
        ctx.font='500 7px "Courier New", monospace';const span=ctx.measureText(label).width;
        const travel=((f-T.rails)*3)%span;
        ctx.translate(rx,-HALF-travel);ctx.rotate(Math.PI/2);
        for(let k=0;k<6;k++)text(label,k*span,0,7,BLACK,'left');
        ctx.restore();
      }
    }
    // CHECK rows use deliberate blank-line spacing, matching the reference.
    if(f>=T.circles&&f<T.noChecks){
      const rows=[-22,-14,-6,10,24],total=CHECKS.reduce((a,b)=>a+b.length,0);
      let budget=Math.floor(clamp((f-T.circles)/3)*total);
      for(let i=0;i<5;i++){
        const full=CHECKS[i],prefix=i===4?'LOGS':'CHECK',number=full.split(' ')[1];
        const n=Math.max(0,Math.min(full.length,budget));budget-=full.length;
        if(f<T.noGuides)text(prefix.slice(0,n),-143,rows[i],5.3,WHITE,'left');
        const digits=Math.max(0,n-prefix.length-1);
        text(i<s.greenCount?'GREEN':number.slice(0,digits),-119,rows[i],5.3,i<s.greenCount?GREEN:WHITE,'left');
      }
    }
    if(s.guides){
      const top=-centerY/scale,bottom=(height-centerY)/scale;
      const a=top+(-150-top)*s.guideProgress,b=bottom+(150-bottom)*s.guideProgress;
      line(0,top,0,a);line(0,bottom,0,b);
      text('+',0,a+4,12,GREEN);text('+',0,b-4,12,GREEN);
    }
    // Welcome is behind the columns, becoming exposed as each column retracts.
    if(s.welcome!=='none'){
      const message='welcome! □□';ctx.font='500 12px "Courier New", monospace';
      const w=ctx.measureText(message).width+12;
      if(s.welcome==='inverse')rect(-w/2,-9,w,18);
      if(s.welcome==='green')rect(-w/2-7,-9,w+14,18,GREEN);
      else text(message,0,0,12,s.welcome==='inverse'?BLACK:WHITE);
    }
    for(const col of s.fan)if(col.height>0)rect((col.c-2.5)*CELL,-col.height/2,CELL-1,col.height);
    ctx.restore();ctx.globalAlpha=1;
  }
  return Object.freeze({BEAT_MS,T,stateAt,render,durationMs:T.end*BEAT_MS});
});
