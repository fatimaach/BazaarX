const token = localStorage.getItem('bazaarx_token');
const storedUser = localStorage.getItem('bazaarx_user');

const userName = document.getElementById('user-name');
const userRole = document.getElementById('user-role');
const userTenant = document.getElementById('user-tenant');

const adminPanel = document.getElementById('admin-panel');
const sellerPanel = document.getElementById('seller-panel');

const tenantForm = document.getElementById('tenant-form');
const tenantMessage = document.getElementById('tenant-message');
const tenantSubmit = document.getElementById('tenant-submit');

const productForm = document.getElementById('product-form');
const productMessage = document.getElementById('product-message');
const productSubmit = document.getElementById('product-submit');

const productsTenantInput = document.getElementById('products-tenant');
const productsSubmit = document.getElementById('products-submit');
const productsMessage = document.getElementById('products-message');
const productsLoader = document.getElementById('products-loader');
const productGrid = document.getElementById('product-grid');
const tenantDeleteButton = document.getElementById('tenant-delete');
let currentProductsTenantId = null;

const logoutBtn = document.getElementById('logout-btn');

if (!token || !storedUser) {
  window.location.href = 'login.html';
}

const user = storedUser ? JSON.parse(storedUser) : {};

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

function formatPrice(price) {
  const value = Number(price);
  if (Number.isNaN(value)) {
    return price;
  }

  return new Intl.NumberFormat('en-US').format(value);
}

function renderProducts(products, tenantId) {
  productGrid.innerHTML = '';
  currentProductsTenantId = tenantId;

  if (!products.length) {
    productGrid.innerHTML = '<p>No products found for this tenant.</p>';
    return;
  }

  products.forEach((product, index) => {
    const card = document.createElement('div');
    card.className = 'product-card fade-in';
    card.style.animationDelay = `${index * 80}ms`;

    const adminActions =
      user.role === 'ADMIN'
        ? `
      <div class="product-actions">
        <button class="secondary danger product-delete" data-product-id="${product.id}">
          Delete
        </button>
      </div>
    `
        : '';

    card.innerHTML = `
      <h4>${product.name}</h4>
      <div class="product-meta">
        <span>Price: ${formatPrice(product.price)}</span>
        <span>Stock: ${product.stock ?? 0}</span>
        <span>Tenant: ${tenantId}</span>
      </div>
      ${adminActions}
    `;

    productGrid.appendChild(card);
  });
}

function applyRoleUI() {
  const role = user.role || 'CUSTOMER';
  userName.textContent = user.name || 'User';
  userRole.textContent = role;
  if (role === 'CUSTOMER') {
    userTenant.textContent = 'Tenant: Marketplace Buyer';
  } else {
    userTenant.textContent = `Tenant: ${user.tenantId || 'N/A'}`;
  }

  adminPanel.style.display = role === 'ADMIN' ? 'block' : 'none';
  sellerPanel.style.display = role === 'SELLER' ? 'block' : 'none';

  if (tenantDeleteButton) {
    tenantDeleteButton.style.display = role === 'ADMIN' ? 'inline-flex' : 'none';
  }

  if (role === 'SELLER' && user.tenantId) {
    productsTenantInput.value = user.tenantId;
  }
}

async function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });
}

applyRoleUI();

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('is-ready');
});

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('bazaarx_token');
    localStorage.removeItem('bazaarx_user');
    window.location.href = 'login.html';
  });
}

// Admin: create tenant
if (tenantForm) {
  tenantForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(tenantMessage, '', null);
    setLoading(tenantSubmit, true, 'Creating...');

    const formData = new FormData(tenantForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await authFetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tenant');
      }

      setMessage(tenantMessage, 'Tenant created successfully.', 'success');
      tenantForm.reset();
    } catch (error) {
      setMessage(tenantMessage, error.message, 'error');
    } finally {
      setLoading(tenantSubmit, false, 'Create Tenant');
    }
  });
}

// Seller: add product
if (productForm) {
  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(productMessage, '', null);
    setLoading(productSubmit, true, 'Saving...');

    const formData = new FormData(productForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await authFetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': user.tenantId
        },
        body: JSON.stringify({
          name: payload.name,
          price: payload.price,
          stock: payload.stock
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add product');
      }

      setMessage(productMessage, 'Product added successfully.', 'success');
      productForm.reset();

      if (user.tenantId) {
        productsTenantInput.value = user.tenantId;
        await fetchProducts(user.tenantId);
      }
    } catch (error) {
      setMessage(productMessage, error.message, 'error');
    } finally {
      setLoading(productSubmit, false, 'Add Product');
    }
  });
}

async function fetchProducts(tenantId) {
  setMessage(productsMessage, '', null);
  productsLoader.classList.add('active');

  try {
    const response = await authFetch('/api/products', {
      headers: {
        'x-tenant-id': tenantId
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load products');
    }

    renderProducts(data.products || [], tenantId);
  } catch (error) {
    setMessage(productsMessage, error.message, 'error');
    productGrid.innerHTML = '';
  } finally {
    productsLoader.classList.remove('active');
  }
}

if (productsSubmit) {
  productsSubmit.addEventListener('click', async () => {
    const tenantId = productsTenantInput.value.trim();

    if (!tenantId) {
      setMessage(productsMessage, 'Please enter a tenant ID.', 'error');
      return;
    }

    setLoading(productsSubmit, true, 'Loading...');
    await fetchProducts(tenantId);
    setLoading(productsSubmit, false, 'Get Products');
  });
}

if (productGrid) {
  productGrid.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('.product-delete');

    if (!deleteButton || user.role !== 'ADMIN') {
      return;
    }

    const productId = deleteButton.dataset.productId;
    const tenantId = currentProductsTenantId || productsTenantInput.value.trim();

    if (!tenantId) {
      setMessage(productsMessage, 'Please enter a tenant ID.', 'error');
      return;
    }

    const card = deleteButton.closest('.product-card');
    const productName = card?.querySelector('h4')?.textContent?.trim() || 'this product';
    const confirmed = window.confirm(`Delete ${productName} from tenant "${tenantId}"?`);

    if (!confirmed) {
      return;
    }

    setMessage(productsMessage, '', null);
    setLoading(deleteButton, true, 'Deleting...');

    try {
      const response = await authFetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      setMessage(productsMessage, 'Product deleted successfully.', 'success');
      if (card) {
        card.remove();
      }
    } catch (error) {
      setMessage(productsMessage, error.message, 'error');
    } finally {
      setLoading(deleteButton, false, 'Delete');
    }
  });
}

if (tenantDeleteButton) {
  tenantDeleteButton.addEventListener('click', async () => {
    const tenantId = productsTenantInput.value.trim();

    if (!tenantId) {
      setMessage(productsMessage, 'Please enter a tenant ID.', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Delete tenant "${tenantId}"? This will remove all products for that tenant.`
    );

    if (!confirmed) {
      return;
    }

    setMessage(productsMessage, '', null);
    setLoading(tenantDeleteButton, true, 'Deleting...');

    try {
      const response = await authFetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete tenant');
      }

      setMessage(productsMessage, 'Tenant deleted successfully.', 'success');
      productGrid.innerHTML = '';
    } catch (error) {
      setMessage(productsMessage, error.message, 'error');
    } finally {
      setLoading(tenantDeleteButton, false, 'Delete Tenant');
    }
  });
}
