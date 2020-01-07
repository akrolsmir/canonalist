export function runIntro(firstRunOnly = false) {
  if (firstRunOnly && introDone()) {
    return;
  }
  firebase.analytics().logEvent('tutorial_begin');

  const intro = introJs();
  // Save a cookie when we finish or exit the intro tour.
  intro.oncomplete(function () {
    firebase.analytics().logEvent('tutorial_complete');
    localStorage.setItem('introDone', 'true');
  })
  intro.onexit(function () {
    localStorage.setItem('introDone', 'true');
  });

  intro.setOptions({
    steps: [
      {
        element: document.querySelector('#scrollport'),
        intro: "Welcome to scanlate.io!<br/><br/>Drag and drop your own manga page here."
      },
      {
        element: document.querySelector('#detectjp'),
        intro: "Detect all bubbles with machine learning!<br/>(You may have to wait a bit.)",
      },
      {
        element: document.querySelector('#makebubbles'),
        intro: "Then translate them all to English."
      },
      {
        element: document.querySelector('#selectbox'),
        intro: "Or use this tool to scanlate a single bubble.<br/><br/>Shortcut: [s]",
      },
      {
        intro: "Now edit, resize, and move the text boxes to your liking."
      },
      {
        element: document.querySelector('#painttool'),
        intro: "Draw strokes or erase mistakes with the brush tool!<br/><br/>Shortcuts: [b] or [e]"
      },
      {
        element: document.querySelector('#saveproject'),
        intro: "When you're done, save your work online, and share it with anyone!"
      },
      {
        element: document.querySelector('#exportimage'),
        intro: "Or download the page as a .png image."
      }
    ]
  });
  intro.start();
}

function introDone() {
  return localStorage.getItem('introDone') ? true : false;
}
