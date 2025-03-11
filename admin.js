// Firebase configuration (replace with your own project settings)
const firebaseConfig = {
  apiKey: "AIzaSyC4zQrhFaTyRLUnvJzqCdJpGjPFZF6oRGQ",
  authDomain: "ecom-d1be2.firebaseapp.com",
  projectId: "ecom-d1be2",
  storageBucket: "ecom-d1be2.firebasestorage.app",
  messagingSenderId: "774182684136",
  appId: "1:774182684136:web:6c8365300a719f68fb105d",
  measurementId: "G-7WTJ6LVT0F"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// Add this at the top of app.js, after Firebase initialization
document.addEventListener("DOMContentLoaded", () => {
  console.log("Checking for cartList:", document.getElementById("cartList")); // Debug log
  const categorySelect = document.getElementById("categorySelect");
  if (categorySelect) {
    categorySelect.addEventListener("change", debounce(loadProducts, 300));
    db.collection("products")
      .where("active", "==", true)
      .get()
      .then((snapshot) => {
        const categories = new Set(["all"]);
        snapshot.forEach((doc) => categories.add(doc.data().category));
        categorySelect.innerHTML = [...categories]
          .map((cat) => `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`)
          .join("");
      })
      .catch((err) => console.error("Error loading categories:", err));
  }
});

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Load all reports
async function loadReports() {
  await loadTop10Orders();
  await loadTop10Products();
  await loadTop10Customers();
  await loadGeneralOrders();
  await loadGeneralProducts();
  await loadCustomerReport();
}

// Top 10 Orders
async function loadTop10Orders() {
  const tbody = document.querySelector('#top10OrdersTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  try {
    const snapshot = await db.collection('orders')
      .orderBy('amountPaid', 'desc')
      .limit(10)
      .get();
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="4">No orders found.</td></tr>';
      return;
    }
    snapshot.forEach(doc => {
      const data = doc.data();
      const orderDate = data.orderDate ? new Date(data.orderDate.seconds * 1000).toLocaleString() : 'N/A';
      tbody.innerHTML += `
        <tr>
          <td>${doc.id}</td>
          <td>${data.userId || 'N/A'}</td>
          <td>${data.amountPaid || 'N/A'}</td>
          <td>${orderDate}</td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Error: ${err.message}</td></tr>`;
    console.error("Error loading top 10 orders:", err);
  }
}

// Top 10 Products Frequently Sold
async function loadTop10Products() {
  const tbody = document.querySelector('#top10ProductsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  try {
    const ordersSnapshot = await db.collection('orders').get();
    const productSales = {};
    ordersSnapshot.forEach(doc => {
      const items = doc.data().items || [];
      items.forEach(item => {
        productSales[item.productId] = productSales[item.productId] || { name: item.name, total: 0 };
        productSales[item.productId].total += item.quantity;
      });
    });
    const sortedProducts = Object.entries(productSales)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);
    if (sortedProducts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No products sold.</td></tr>';
      return;
    }
    sortedProducts.forEach(([productId, data]) => {
      tbody.innerHTML += `
        <tr>
          <td>${productId}</td>
          <td>${data.name}</td>
          <td>${data.total}</td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3">Error: ${err.message}</td></tr>`;
    console.error("Error loading top 10 products:", err);
  }
}

// Top 10 Customers
async function loadTop10Customers() {
  const tbody = document.querySelector('#top10CustomersTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  try {
    const ordersSnapshot = await db.collection('orders').get();
    const customerOrders = {};
    ordersSnapshot.forEach(doc => {
      const userId = doc.data().userId;
      customerOrders[userId] = (customerOrders[userId] || 0) + 1;
    });
    const sortedCustomers = Object.entries(customerOrders)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    if (sortedCustomers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No customers found.</td></tr>';
      return;
    }
    for (const [userId, totalOrders] of sortedCustomers) {
      const userDoc = await db.collection('users').doc(userId).get();
      const email = userDoc.exists ? userDoc.data().email : 'N/A';
      tbody.innerHTML += `
        <tr>
          <td>${userId}</td>
          <td>${email}</td>
          <td>${totalOrders}</td>
        </tr>
      `;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3">Error: ${err.message}</td></tr>`;
    console.error("Error loading top 10 customers:", err);
  }
}

// General Orders Report (all orders)
async function loadGeneralOrders() {
  const tbody = document.querySelector('#generalOrdersTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  try {
    const snapshot = await db.collection('orders').get();
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="4">No orders found.</td></tr>';
      return;
    }
    snapshot.forEach(doc => {
      const data = doc.data();
      const orderDate = data.orderDate ? new Date(data.orderDate.seconds * 1000).toLocaleString() : 'N/A';
      tbody.innerHTML += `
        <tr>
          <td>${doc.id}</td>
          <td>${data.userId || 'N/A'}</td>
          <td>${data.amountPaid || 'N/A'}</td>
          <td>${orderDate}</td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Error: ${err.message}</td></tr>`;
    console.error("Error loading general orders:", err);
  }
}

// General Product Report (all products sold)
async function loadGeneralProducts() {
  const tbody = document.querySelector('#generalProductsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  try {
    const ordersSnapshot = await db.collection('orders').get();
    const productSales = {};
    ordersSnapshot.forEach(doc => {
      const items = doc.data().items || [];
      items.forEach(item => {
        productSales[item.productId] = productSales[item.productId] || { name: item.name, total: 0 };
        productSales[item.productId].total += item.quantity;
      });
    });
    const sortedProducts = Object.entries(productSales).sort((a, b) => b[1].total - a[1].total);
    if (sortedProducts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No products sold.</td></tr>';
      return;
    }
    sortedProducts.forEach(([productId, data]) => {
      tbody.innerHTML += `
        <tr>
          <td>${productId}</td>
          <td>${data.name}</td>
          <td>${data.total}</td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3">Error: ${err.message}</td></tr>`;
    console.error("Error loading general products:", err);
  }
}

// Customer Report (all customers)
async function loadCustomerReport() {
  const tbody = document.querySelector('#customerReportTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  try {
    const ordersSnapshot = await db.collection('orders').get();
    const customerOrders = {};
    ordersSnapshot.forEach(doc => {
      const userId = doc.data().userId;
      customerOrders[userId] = (customerOrders[userId] || 0) + 1;
    });
    const sortedCustomers = Object.entries(customerOrders).sort((a, b) => b[1] - a[1]);
    if (sortedCustomers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No customers found.</td></tr>';
      return;
    }
    for (const [userId, totalOrders] of sortedCustomers) {
      const userDoc = await db.collection('users').doc(userId).get();
      const email = userDoc.exists ? userDoc.data().email : 'N/A';
      tbody.innerHTML += `
        <tr>
          <td>${userId}</td>
          <td>${email}</td>
          <td>${totalOrders}</td>
        </tr>
      `;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3">Error: ${err.message}</td></tr>`;
    console.error("Error loading customer report:", err);
  }
}

// At the top of admin.js, add a function to ensure scripts are loaded
function waitForScripts() {
  return new Promise((resolve, reject) => {
    const checkScripts = () => {
      if (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF.prototype.autoTable === 'function') {
        resolve();
      } else {
        setTimeout(checkScripts, 100); // Check every 100ms
      }
    };
    checkScripts();
  });
}



function downloadPDF(tableId, fileName) {
  // Use window.jspdf to access jsPDF correctly
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    console.error("jsPDF library is not loaded.");
    return;
  }

  const doc = new jsPDF();
  const table = document.getElementById(tableId);
  
  if (!table) {
    console.error(`Table with ID ${tableId} not found`);
    return;
  }

  doc.autoTable({
    html: `#${tableId}`, // Directly pass table
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [76, 175, 80] },
  });

  doc.save(`${fileName}.pdf`);
}


// Function to show the appropriate section based on authentication state
function checkAuthState() {
  auth.onAuthStateChanged(user => {
    console.log("Auth State Changed:", user);
    document.getElementById('loadingSection').classList.remove('active');
    if (user) {
      currentUser = user;
      console.log("User logged in:", user.email);
      document.getElementById('loginSection').classList.remove('active');
      document.getElementById('adminPanel').classList.add('active');
      loadTables();
    } else {
      console.log("No user logged in.");
      document.getElementById('loginSection').classList.add('active');
      document.getElementById('adminPanel').classList.remove('active');
    }
  });
}

// Handle Admin Login
document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  auth.signInWithEmailAndPassword(email, password)
    .then(cred => {
      currentUser = cred.user;
      document.getElementById('loginMessage').innerText = "Login successful!";
      document.getElementById('loginSection').classList.remove('active');
      document.getElementById('adminPanel').classList.add('active');
      loadTables();
    })
    .catch(err => {
      document.getElementById('loginMessage').innerText = err.message;
    });
});

// Handle Sign Out
function signOut() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  }).catch(err => {
    console.error("Error signing out:", err);
  });
}

// Handle Add Product Form submission
document.getElementById('addProductForm').addEventListener('submit', function (e) {
  e.preventDefault();
  
  const name = document.getElementById('productName').value.trim();
  const price = document.getElementById('productPrice').value.trim();
  const credit = document.getElementById('productCredit').value.trim();
  const stock = document.getElementById('productStock').value.trim();
  const imageUrl = document.getElementById('productImageUrl').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  
  let isValid = true;
  
  // Clear previous error messages
  document.getElementById('priceError').innerText = "";
  document.getElementById('creditError').innerText = "";
  document.getElementById('stockError').innerText = "";
  document.getElementById('productMessage').innerText = "";

  // Function to validate positive integer values
  function validatePositiveNumber(value, errorElement) {
    if (!/^\d+$/.test(value) || parseInt(value, 10) <= 0) {
      document.getElementById(errorElement).innerText = "Negative values and zero are not accepted!";
      return false;
    }
    return true;
  }

  // Validate price, credit, and stock fields
  if (!validatePositiveNumber(price, 'priceError')) isValid = false;
  if (!validatePositiveNumber(credit, 'creditError')) isValid = false;
  if (!validatePositiveNumber(stock, 'stockError')) isValid = false;

  // Validate required fields
  if (!name || !imageUrl || !category) {
    document.getElementById('productMessage').innerText = "Please provide all product details including category.";
    return;
  }

  if (!isValid) return;

  db.collection('products')
    .add({
      name: name,
      price: parseInt(price, 10),
      credit: parseInt(credit, 10),
      stock: parseInt(stock, 10),
      imageUrl: imageUrl,
      category: category,
      active: true,
      createdAt: new Date(),
    })
    .then(() => {
      document.getElementById('productMessage').innerText = "Product added successfully!";
      document.getElementById('addProductForm').reset();
      loadProducts();
    })
    .catch((err) => {
      document.getElementById('productMessage').innerText = err.message;
    });
});


// Handle Update Product Form submission
document.getElementById('updateProductForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const productId = document.getElementById('updateProductId').value;
  const name = document.getElementById('updateProductName').value.trim();
  const price = document.getElementById('updateProductPrice').value.trim();
  const credit = document.getElementById('updateProductCredit').value.trim();
  const stock = document.getElementById('updateProductStock').value.trim();
  const imageUrl = document.getElementById('updateProductImageUrl').value.trim();
  const category = document.getElementById('updateProductCategory').value.trim();

  let isValid = true;

  // Clear previous error messages
  document.getElementById('updatePriceError').innerText = "";
  document.getElementById('updateCreditError').innerText = "";
  document.getElementById('updateStockError').innerText = "";
  document.getElementById('updateProductMessage').innerText = "";

  // Function to validate positive integer values
  function validatePositiveNumber(value, errorElement) {
    if (!/^\d+$/.test(value) || parseInt(value, 10) <= 0) {
      document.getElementById(errorElement).innerText = "Negative values and zero are not accepted!";
      return false;
    }
    return true;
  }

  // Validate price, credit, and stock fields
  if (!validatePositiveNumber(price, 'updatePriceError')) isValid = false;
  if (!validatePositiveNumber(credit, 'updateCreditError')) isValid = false;
  if (!validatePositiveNumber(stock, 'updateStockError')) isValid = false;

  // Validate required fields
  if (!name || !category) {
    document.getElementById('updateProductMessage').innerText = "Please provide all product details including category.";
    return;
  }

  if (!isValid) return;

  db.collection('products')
    .doc(productId)
    .update({
      name: name,
      price: parseInt(price, 10),
      credit: parseInt(credit, 10),
      stock: parseInt(stock, 10),
      imageUrl: imageUrl || null,
      category: category,
      updatedAt: new Date(),
    })
    .then(() => {
      document.getElementById('updateProductMessage').innerText = "Product updated successfully!";
      document.getElementById('updateProductForm').reset();
      showSection('productsSection');
      loadProducts();
    })
    .catch((err) => {
      document.getElementById('updateProductMessage').innerText = err.message;
    });
});

// Populate Update Form
function populateUpdateForm(productId) {
  db.collection('products')
    .doc(productId)
    .get()
    .then((doc) => {
      if (doc.exists) {
        const data = doc.data();
        document.getElementById('updateProductId').value = doc.id;
        document.getElementById('updateProductName').value = data.name || '';
        document.getElementById('updateProductPrice').value = data.price || '';
        document.getElementById('updateProductCredit').value = data.credit || '';
        document.getElementById('updateProductStock').value = data.stock || '';
        document.getElementById('updateProductImageUrl').value = data.imageUrl || '';
        document.getElementById('updateProductCategory').value = data.category || '';

        const preview = document.getElementById('updateProductPreview');
        if (preview) preview.src = data.imageUrl || 'assets/images/nothing.png';

        showSection('updateProductSection');
      }
    })
    .catch((err) => {
      console.error("Error fetching product:", err);
    });
}


// Cancel Update
document.getElementById('cancelUpdateButton').addEventListener('click', function() {
  document.getElementById('updateProductForm').reset();
  document.getElementById('updateProductMessage').innerText = '';
  showSection('productsSection');
});

// Delete Product
function deleteProduct(productId) {
  if (confirm("Are you sure you want to delete this product?")) {
    db.collection('products').doc(productId).delete()
      .then(() => {
        alert("Product deleted successfully.");
        loadProducts();
      })
      .catch(err => {
        console.error("Error deleting product:", err);
      });
  }
}

// Toggle Product Status
function toggleProductStatus(productId, activate) {
  db.collection('products').doc(productId).update({
    active: activate,
    updatedAt: new Date()
  })
  .then(() => {
    loadProducts();
  })
  .catch(err => {
    console.error("Error toggling product status:", err);
  });
}

// Function to switch between sections
function showSection(sectionId) {
  const sections = ['addProductSection', 'productsSection', 'usersSection', 'ordersSection', 'updateProductSection', 'reportsSection'];
  sections.forEach(id => {
    const section = document.getElementById(id);
    if (section) {
      if (id === sectionId) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    }
  });
  if (sectionId === 'reportsSection') {
    loadReports();
  }
}

// Load data into tables
function loadTables() {
  loadProducts();
  loadUsers();
  loadOrders();
  loadReports();
}

// Load Products with Debounce
const loadProducts = debounce(function () {
  const tbody = document.querySelector('#productsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  db.collection('products').get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="9">No products found.</td></tr>';
        return;
      }
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'N/A';
        const statusButton = data.active 
          ? `<button onclick="toggleProductStatus('${doc.id}', false)">Deactivate</button>` 
          : `<button onclick="toggleProductStatus('${doc.id}', true)">Activate</button>`;
        tbody.innerHTML += `
          <tr>
            <td>${doc.id}</td>
            <td>${data.name || 'N/A'}</td>
            <td>${data.price || 'N/A'}</td>
            <td>${data.credit || 'N/A'}</td>
            <td>${data.stock || 'N/A'}</td>
            <td>${data.category || 'N/A'}</td>
            <td>${createdAt}</td>
            <td>
              <button onclick="populateUpdateForm('${doc.id}')">Update</button>
              <button onclick="deleteProduct('${doc.id}')">Delete</button>
            </td>
            <td>${statusButton}</td>
          </tr>
        `;
      });
    })
    .catch(err => {
      console.error("Error loading products:", err);
      tbody.innerHTML = `<tr><td colspan="9">Error loading products: ${err.message}</td></tr>`;
    });
}, 300);

// Load Users
function loadUsers() {
  const tbody = document.querySelector('#usersTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  db.collection('users').get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="3">No users found.</td></tr>';
        return;
      }
      querySnapshot.forEach(doc => {
        const data = doc.data();
        tbody.innerHTML += `
          <tr>
            <td>${doc.id}</td>
            <td>${data.email || 'N/A'}</td>
            <td>${data.credit || '0'}</td>
          </tr>
        `;
      });
    })
    .catch(err => {
      console.error("Error loading users:", err);
      tbody.innerHTML = `<tr><td colspan="3">Error loading users: ${err.message}</td></tr>`;
    });
}

// Load Orders
async function loadOrders() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  try {
    const snapshot = await db.collection('orders').get();
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="10">No orders found.</td></tr>';
      return;
    }
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const orderDate = data.orderDate ? new Date(data.orderDate.seconds * 1000).toLocaleString() : 'N/A';
      const discountApplied = data.discountApplied || 0;
      const amountPaid = data.amountPaid || 'N/A';
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          tbody.innerHTML += `
            <tr>
              <td>${doc.id}</td>
              <td>${data.userId || 'N/A'}</td>
              <td>${item.productId || 'N/A'}</td>
              <td>${item.name || 'N/A'}</td>
              <td>${item.price || 'N/A'}</td>
              <td>${item.credit || 'N/A'}</td>
              <td>${item.quantity || 'N/A'}</td>
              <td>${orderDate}</td>
              <td>${discountApplied}</td>
              <td>${amountPaid}</td>
            </tr>
          `;
        }
      } else {
        tbody.innerHTML += `
          <tr>
            <td>${doc.id}</td>
            <td>${data.userId || 'N/A'}</td>
            <td>${data.productId || 'N/A'}</td>
            <td>N/A</td>
            <td>N/A</td>
            <td>N/A</td>
            <td>N/A</td>
            <td>${orderDate}</td>
            <td>${discountApplied}</td>
            <td>${amountPaid}</td>
          </tr>
        `;
      }
    }
  } catch (err) {
    console.error("Error loading orders:", err);
    tbody.innerHTML = `<tr><td colspan="10">Error loading orders: ${err.message}</td></tr>`;
  }
}

// Initialize authentication state check
checkAuthState();