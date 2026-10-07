'use strict';
/* =====================================================================
   START
   ===================================================================== */
Speech.init();
applyLang();
labelMascot();
loadClips(LANG);   // the page loaded the clip list it guessed; this makes sure it is the right language's
// Browsers only allow sound after a tap. The first tap turns it on (pages opened without the start
// screen), and a tap after iOS blocked audio (a call, time in the background) turns it back on.
// Only these events count as a tap for that: pointerdown does not for touch.
const activateAudio = () => {
  if (!audioUnlocked){
    audioUnlocked = true; Speech.unlock(); Sfx.ensure();
    Speech.preload(globalPhrases());
  } else if (Speech.blocked){ Speech.blocked = false; Speech.unlock(); Sfx.ensure(); }
  else Sfx.ensure();   // resumes the audio if the phone paused it
  Music.start();       // nothing happens when it is already playing or switched off
};
['pointerup', 'touchend', 'click', 'keydown'].forEach(t => document.addEventListener(t, activateAudio, true));
if (/[?&]v=\d+/.test(location.search)) try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => { if (document.hidden){ Speech.stop(); Music.stop(); } else { Music.start(); checkUpdate(); } });
route();
if (!/^#\/(parents|start)/.test(location.hash)) showStart();   // #/start shows it via route()
checkUpdate();
// IndexedDB may still have progress the other two copies lost: redraw the screen if it brought anything back
// (under the start screen, 开始 redraws it anyway)
restoreSaved(() => {
  if (state.settings.lang !== LANG){ LANG = state.settings.lang; applyLang(); labelMascot(); loadClips(LANG); }
  if (!overlayEl && !/^#\/lesson\/\d+\/./.test(location.hash)) route();
});
