import { chromium } from '@playwright/test';
const [,, base, out] = process.argv;
const routes = {home:'/',pricing:'/pricing',features:'/features',contact:'/contact',faq:'/faq',docs:'/docs',blog:'/blog','blog-post':'/blog/getting-started','sign-in':'/sign-in','404':'/nope-xyz-404'};
const b = await chromium.launch();
for (const theme of ['light','dark']) {
  const ctx = await b.newContext({viewport:{width:1440,height:900}, colorScheme:theme});
  await ctx.addInitScript(t=>{try{localStorage.setItem('theme',t)}catch{}}, theme);
  const p = await ctx.newPage();
  for (const [n,r] of Object.entries(routes)) {
    try { await p.goto(base+r,{waitUntil:'load',timeout:60000}); await p.waitForTimeout(3500);
      await p.screenshot({path:`${out}/${n}-${theme}.png`,fullPage:true,timeout:120000}); } catch(e){console.log('fail',n,theme,e.message.slice(0,80))}
  }
  if (true) { const m = await ctx.newPage(); await m.setViewportSize({width:390,height:844});
    await m.goto(base+'/',{waitUntil:'load'}); await m.waitForTimeout(3500); await m.screenshot({path:`${out}/home-${theme}-mobile.png`,fullPage:true,timeout:120000}); }
  await ctx.close();
}
await b.close();
