const signupForm = document.getElementById('signup-form');
const signupMessage = document.getElementById('signup-message');
const signupSubmit = document.getElementById('signup-submit');
const signupRole = document.getElementById('signup-role');
const signupTenant = document.getElementById('signup-tenant');
const tenantHelper = document.getElementById('tenant-helper');
const tenantField = document.getElementById('tenant-field');

const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const loginSubmit = document.getElementById('login-submit');

function setMessage(element, message, type) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.remove('success', 'error');
  element.classList.remove('show');
  if (type) {
    element.classList.add(type);
  }
  if (message) {
    requestAnimationFrame(() => {
      element.classList.add('show');
    });
  }
}

function setLoading(button, isLoading, loadingText) {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }

  button.disabled = isLoading;
  button.classList.toggle('is-loading', isLoading);
  button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

function updateTenantField() {
  if (!signupRole || !signupTenant) {
    return;
  }

  const role = signupRole.value;
  const isSeller = role === 'SELLER';
  const isCustomer = role === 'CUSTOMER';

  if (tenantField) {
    tenantField.hidden = isCustomer;
  }

  signupTenant.required = isSeller;

  if (isCustomer) {
    signupTenant.value = '';
  }

  if (!tenantHelper) {
    return;
  }

  if (isSeller) {
    tenantHelper.textContent = 'Required for SELLER';
  } else {
    tenantHelper.textContent =
      'Optional for first ADMIN. Required after first ADMIN exists.';
  }
}

if (signupRole) {
  signupRole.addEventListener('change', updateTenantField);
  updateTenantField();
}

// Signup handler
if (signupForm) {
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(signupMessage, '', null);
    setLoading(signupSubmit, true, 'Creating...');

    const formData = new FormData(signupForm);
    const payload = Object.fromEntries(formData.entries());

    if (payload.tenantId === '') {
      delete payload.tenantId;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setMessage(signupMessage, 'Signup successful! Please login.', 'success');
      signupForm.reset();
      updateTenantField();
    } catch (error) {
      setMessage(signupMessage, error.message, 'error');
    } finally {
      setLoading(signupSubmit, false, 'Sign Up');
    }
  });
}

// Login handler
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(loginMessage, '', null);
    setLoading(loginSubmit, true, 'Logging in...');

    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('bazaarx_token', data.token);
      localStorage.setItem('bazaarx_user', JSON.stringify(data.user));

      window.location.href = 'dashboard.html';
    } catch (error) {
      setMessage(loginMessage, error.message, 'error');
    } finally {
      setLoading(loginSubmit, false, 'Login');
    }
  });
}
