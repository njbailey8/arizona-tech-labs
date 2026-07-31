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
      required: true,
      bot: () => "Hi! I'm here to help scope your Prototype Sprint. What's your name?",
    },
    {
      key: 'business',
      type: 'text',
      required: true,
      bot: (a) => `Nice to meet you, ${a.name}. What's the name of your business?`,
    },
    {
      key: 'email',
      type: 'email',
      required: true,
      bot: () => "What's the best email to reach you at?",
      validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'That doesn’t look like a valid email — mind trying again?',
    },
    {
      key: 'phone',
      type: 'tel',
      required: false,
      bot: () => 'And a phone number, if you’d like a call back?',
    },
    {
      key: 'message',
      type: 'textarea',
      required: true,
      bot: () => 'Last thing — what’s the workflow or process that’s slowing you down most right now?',
    },
  ];

  const answers = {};
  let stepIndex = 0;

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

  function setActiveInputType(type) {
    if (type === 'textarea') {
      textInput.hidden = true;
      textarea.hidden = false;
      textarea.value = '';
      textarea.focus();
    } else {
      textarea.hidden = true;
      textInput.hidden = false;
      textInput.type = type;
      textInput.value = '';
      textInput.focus();
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
      setActiveInputType(step.type);
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

    showTyping();
    window.setTimeout(() => {
      removeTyping();
      addBubble(
        `Thanks, ${answers.name}! This site isn’t wired to a backend yet, so tap below to send everything straight to our inbox.`,
        'bot'
      );

      const subject = encodeURIComponent(`Prototype Sprint inquiry — ${answers.business}`);
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
      mailLink.href = `mailto:hello@arizonatechlabs.com?subject=${subject}&body=${body}`;
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
    form.style.display = '';
    chatMeta.style.display = '';
    askStep();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const step = steps[stepIndex];
    const value = currentValue();

    if (step.required && !value) {
      textInput.hidden ? textarea.focus() : textInput.focus();
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
          setActiveInputType(step.type);
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
