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

const API_BASE = '';

function setMessage(element, message, type) {
  element.textContent = message;
  element.classList.remove('success', 'error');

  if (type) {
    element.classList.add(type);
  }
}

function setLoading(button, isLoading, loadingText) {
  if (!button) {
    return;
  }

  button.disabled = isLoading;
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

  if (!products.length) {
    productGrid.innerHTML = '<p>No products found for this tenant.</p>';
    return;
  }

  products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <h4>${product.name}</h4>
      <div class="product-meta">
        <span>Price: ${formatPrice(product.price)}</span>
        <span>Stock: ${product.stock ?? 'N/A'}</span>
        <span>Tenant: ${tenantId}</span>
      </div>
    `;

    productGrid.appendChild(card);
  });
}

// Create tenant
if (tenantSubmit) {
  tenantSubmit.dataset.defaultText = tenantSubmit.textContent;
}

tenantForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(tenantMessage, '', null);
  setLoading(tenantSubmit, true, 'Creating...');

  const formData = new FormData(tenantForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch(`${API_BASE}/api/tenants`, {
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

// Add product
if (productSubmit) {
  productSubmit.dataset.defaultText = productSubmit.textContent;
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(productMessage, '', null);
  setLoading(productSubmit, true, 'Saving...');

  const formData = new FormData(productForm);
  const payload = Object.fromEntries(formData.entries());
  const tenantId = payload.tenantId;

  try {
    const response = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId
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

    if (tenantId) {
      productsTenantInput.value = tenantId;
      await fetchProducts(tenantId);
    }
  } catch (error) {
    setMessage(productMessage, error.message, 'error');
  } finally {
    setLoading(productSubmit, false, 'Add Product');
  }
});

// Fetch products
if (productsSubmit) {
  productsSubmit.dataset.defaultText = productsSubmit.textContent;
}

async function fetchProducts(tenantId) {
  setMessage(productsMessage, '', null);
  productsLoader.classList.add('active');

  try {
    const response = await fetch(`${API_BASE}/api/products`, {
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
