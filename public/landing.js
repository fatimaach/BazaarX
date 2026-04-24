const heroTitle = document.querySelector('.hero-title');
const heroSubtitle = document.querySelector('.hero-subtitle');
const heroCta = document.querySelector('.hero-cta');
const bars = document.querySelectorAll('.hero-graph .bar');
const reveals = document.querySelectorAll('.reveal');

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animateHero() {
  if (!heroTitle) {
    return;
  }

  heroTitle.classList.add('fade-up');
  if (heroSubtitle) {
    heroSubtitle.classList.add('fade-up', 'delay-1');
  }
  if (heroCta) {
    heroCta.classList.add('fade-up', 'delay-2');
  }

  if (!prefersReducedMotion()) {
    bars.forEach((bar, index) => {
      bar.style.animationDelay = `${index * 120}ms`;
      bar.classList.add('bar-animate');
    });
  } else {
    bars.forEach((bar) => {
      bar.classList.add('bar-static');
    });
  }
}

function setupReveal() {
  if (prefersReducedMotion()) {
    reveals.forEach((el) => el.classList.add('reveal-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  reveals.forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  animateHero();
  setupReveal();
});
