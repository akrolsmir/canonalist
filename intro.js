function runIntro(firstRunOnly = false) {
  if (firstRunOnly && introDone()) {
    return;
  }
  firebase.analytics().logEvent('tutorial_begin');

  const intro = introJs();
  // Save a cookie when we finish or exit the intro tour.
  intro.oncomplete(function() {
    firebase.analytics().logEvent('tutorial_complete');
    localStorage.setItem('introDone', 'true');
  })
  intro.onexit(function() {
    localStorage.setItem('introDone', 'true');
  });

  intro.setOptions({
    steps: [
      {
        element: document.querySelector('#scrollport'),
        intro: "Welcome to scanlate.io!<br/><br/>You can drag and drop your own manga page here."
      },
      {
        element: document.querySelector('#detectjp'),
        intro: "Automatically detect all bubbles with machine learning!<br/>(You may have to wait a bit.)",
      },
      {
        element: document.querySelector('#makebubbles'),
        intro: "Then translate them all to English with this button."
      },
      {
        element: document.querySelector('#selectbox'),
        intro: "Or use this tool to scanlate a single bubble.<br/>(Then click on a corner of the bubble, and on the opposite corner.)",
      },
      {
        intro: "Now edit, resize, and move the text boxes to your liking."
      },
      {
        element: document.querySelector('#saveimage'),
        intro: "Finally, save and download your work!"
      }
    ]
  });
  intro.start();
}

function introDone() {
  return localStorage.getItem('introDone') ? true : false;
}
