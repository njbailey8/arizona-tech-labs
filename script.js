// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Reveal-on-scroll
const revealTargets = document.querySelectorAll(
  '.card, .compare-card, .objection, .founder-grid, .local-inner, .hero-inner'
);
revealTargets.forEach((el) => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach((el) => observer.observe(el));

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile sticky CTA: show it once the hero's own buttons have scrolled away,
// hide it again over the chat form so it never covers the input.
(function initMobileCta() {
  const bar = document.getElementById('mobile-cta');
  const hero = document.querySelector('.hero');
  const chat = document.getElementById('chat-form');
  if (!bar || !hero) return;

  let pastHero = false;
  let atForm = false;
  const sync = () => bar.classList.toggle('is-visible', pastHero && !atForm);

  new IntersectionObserver(
    ([entry]) => { pastHero = !entry.isIntersecting; sync(); },
    { threshold: 0 }
  ).observe(hero);

  if (chat) {
    new IntersectionObserver(
      ([entry]) => { atForm = entry.isIntersecting; sync(); },
      { threshold: 0.2 }
    ).observe(chat);
  }
})();

// Hero video: soft fade through the loop point instead of a hard jump-cut
(function initHeroVideo() {
  const video = document.getElementById('hero-video');
  if (!video) return;

  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const remaining = video.duration - video.currentTime;
    if (remaining < 0.35) {
      video.classList.add('is-looping');
    } else if (video.currentTime > 0.35) {
      video.classList.remove('is-looping');
    }
  });
})();

// ---------- Conversational contact form ----------
(function initChatForm() {
  const log = document.getElementById('chat-log');
  const progressBar = document.getElementById('chat-progress-bar');
  const form = document.getElementById('chat-input-form');
  const textInput = document.getElementById('chat-input');
  const textarea = document.getElementById('chat-textarea');
  const sendBtn = document.getElementById('chat-send');
  const skipBtn = document.getElementById('chat-skip');
  const hint = document.querySelector('.chat-hint');

  if (!log || !form) return;

  const steps = [
    {
      key: 'name',
      type: 'text',
      autocomplete: 'name',
      required: true,
      bot: () => "Hi! A few quick questions and we'll get back to you with what a first prototype would look like. What's your name?",
    },
    {
      key: 'business',
      type: 'text',
      autocomplete: 'organization',
      required: true,
      bot: (a) => `Nice to meet you, ${a.name}. What's the name of your business?`,
    },
    {
      key: 'email',
      type: 'email',
      autocomplete: 'email',
      required: true,
      bot: () => "What's the best email to reach you at?",
      validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'That doesn’t look like a valid email. Mind trying again?',
    },
    {
      key: 'phone',
      type: 'tel',
      autocomplete: 'tel',
      required: false,
      bot: () => 'And a phone number, if you’d like a call back?',
    },
    {
      key: 'message',
      type: 'textarea',
      autocomplete: 'off',
      required: true,
      bot: () => 'Last one. What’s eating the most time right now? Plain words are fine.',
    },
  ];

  const answers = {};
  let stepIndex = 0;

  // ---- Email reporting (Formspree) ----
  // Sends whatever's been collected so far: on normal completion via fetch,
  // or via sendBeacon if the visitor closes/leaves the tab mid-chat, so
  // partial sessions still reach the inbox.
  // Tracked separately: a partial beacon must never suppress the completed
  // submission. Sharing one flag meant a visitor who tabbed away mid-chat and
  // came back to finish had their finished answers dropped silently.
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xbdnekda';
  let completedSent = false;
  let abandonedSent = false;

  function buildReportData(status) {
    const fd = new FormData();
    fd.append('status', status);
    fd.append('step', `${stepIndex} of ${steps.length}`);
    fd.append('name', answers.name || '');
    fd.append('business', answers.business || '');
    fd.append('email', answers.email || '');
    fd.append('phone', answers.phone || '');
    fd.append('message', answers.message || '');
    fd.append('_subject', `Chat ${status}: ${answers.business || answers.name || 'anonymous visitor'}`);
    return fd;
  }

  function sendCompletedReport() {
    if (completedSent) return;
    completedSent = true;
    fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: buildReportData('completed'),
      keepalive: true,
    }).catch(() => {});
  }

  function sendAbandonedReportIfNeeded() {
    if (completedSent || abandonedSent) return;
    if (!answers.name && !answers.email) return;
    abandonedSent = true;
    navigator.sendBeacon(FORMSPREE_ENDPOINT, buildReportData('abandoned'));
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sendAbandonedReportIfNeeded();
  });
  window.addEventListener('pagehide', sendAbandonedReportIfNeeded);

  function scrollLogToBottom() {
    log.scrollTop = log.scrollHeight;
  }

  function addBubble(text, who) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-${who}`;
    bubble.textContent = text;
    log.appendChild(bubble);
    scrollLogToBottom();
    return bubble;
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.id = 'chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(typing);
    scrollLogToBottom();
  }

  function removeTyping() {
    const typing = document.getElementById('chat-typing');
    if (typing) typing.remove();
  }

  // The one input is reused for every question, so the autofill hint has to be
  // set per step. Without it the browser has no idea the field wants a name,
  // an email or a phone number, and offers nothing.
  function setActiveInputType(step) {
    const hint = step.autocomplete || 'off';
    if (step.type === 'textarea') {
      textInput.hidden = true;
      textarea.hidden = false;
      textarea.value = '';
      textarea.setAttribute('autocomplete', hint);
      textarea.focus({ preventScroll: true });
    } else {
      textarea.hidden = true;
      textInput.hidden = false;
      textInput.type = step.type;
      textInput.value = '';
      textInput.setAttribute('autocomplete', hint);
      textInput.focus({ preventScroll: true });
    }
  }

  function currentValue() {
    const step = steps[stepIndex];
    return (step.type === 'textarea' ? textarea.value : textInput.value).trim();
  }

  function updateProgress() {
    progressBar.style.width = `${(stepIndex / steps.length) * 100}%`;
  }

  function askStep() {
    if (stepIndex >= steps.length) {
      finish();
      return;
    }
    const step = steps[stepIndex];
    skipBtn.hidden = step.required;
    updateProgress();
    showTyping();
    window.setTimeout(() => {
      removeTyping();
      addBubble(step.bot(answers), 'bot');
      setActiveInputType(step);
    }, 450);
  }

  function advance(value) {
    const step = steps[stepIndex];
    answers[step.key] = value;
    addBubble(value || '(skipped)', 'user');
    stepIndex += 1;
    askStep();
  }

  const chatMeta = document.querySelector('.chat-meta');

  function finish() {
    progressBar.style.width = '100%';
    form.style.display = 'none';
    chatMeta.style.display = 'none';

    sendCompletedReport();

    showTyping();
    window.setTimeout(() => {
      removeTyping();
      addBubble(
        `Thanks, ${answers.name}! We've got your details and will be in touch soon. Prefer to also send this from your own inbox?`,
        'bot'
      );

      const subject = encodeURIComponent(`Prototype Sprint inquiry: ${answers.business}`);
      const bodyLines = [
        `Name: ${answers.name}`,
        `Business: ${answers.business}`,
        `Email: ${answers.email}`,
        `Phone: ${answers.phone || 'n/a'}`,
        '',
        `What's slowing them down:`,
        answers.message,
      ];
      const body = encodeURIComponent(bodyLines.join('\n'));

      const actions = document.createElement('div');
      actions.className = 'chat-actions';

      const mailLink = document.createElement('a');
      mailLink.href = `mailto:nathan@arizonatechlabs.com?subject=${subject}&body=${body}`;
      mailLink.className = 'btn btn-primary';
      mailLink.textContent = 'Send via email';
      actions.appendChild(mailLink);

      const restart = document.createElement('button');
      restart.type = 'button';
      restart.className = 'chat-restart';
      restart.textContent = 'Start over';
      restart.addEventListener('click', resetChat);
      actions.appendChild(restart);

      log.appendChild(actions);
      scrollLogToBottom();
    }, 450);
  }

  function resetChat() {
    log.innerHTML = '';
    Object.keys(answers).forEach((k) => delete answers[k]);
    stepIndex = 0;
    completedSent = false;
    abandonedSent = false;
    form.style.display = '';
    chatMeta.style.display = '';
    askStep();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const step = steps[stepIndex];
    const value = currentValue();

    if (step.required && !value) {
      const target = textInput.hidden ? textarea : textInput;
      target.focus({ preventScroll: true });
      return;
    }
    if (value && step.validate) {
      const result = step.validate(value);
      if (result !== true) {
        addBubble(value, 'user');
        showTyping();
        window.setTimeout(() => {
          removeTyping();
          addBubble(typeof result === 'string' ? result : 'Mind double-checking that?', 'bot');
          setActiveInputType(step);
        }, 400);
        return;
      }
    }
    advance(value);
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  skipBtn.addEventListener('click', () => advance(''));

  // Kick off the conversation
  askStep();
})();
