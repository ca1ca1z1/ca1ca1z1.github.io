(()=>{'use strict';
  const key='portfolio:locked-until';
  const is404=location.pathname==='/404.html';
  function expiry(){
    let until=0;
    for(const storage of ['localStorage','sessionStorage'])try{
      const value=Number(window[storage].getItem(key));
      if(Number.isFinite(value))until=Math.max(until,value);
      if(value<=Date.now())window[storage].removeItem(key);
    }catch{}
    return until;
  }
  function check(){if(!is404&&expiry()>Date.now())location.replace('/404.html');}
  window.portfolioAccess={lock(){
    const until=String(Date.now()+60000);
    for(const storage of ['localStorage','sessionStorage'])try{window[storage].setItem(key,until);}catch{}
    return until;
  }};
  check();
  addEventListener('pageshow',check);
  addEventListener('storage',event=>{if(event.key===key)check();});
})();
