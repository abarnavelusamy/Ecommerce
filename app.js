// Global state
let currentProducts = []; // Holds all products loaded from Firestore
let currentPage = 1;
const pageSize = 10;
let currentUser = null;
let currentProduct = null; // For modal/popup use
const currentDate = new Date().toLocaleDateString();

// Firebase configuration
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

// Utility Functions
function showMessage(elementId, message, duration = 3000) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    setTimeout(() => (element.textContent = ""), duration);
  }
}

function showPopupMessage(message, duration = 3000) {
  const existingPopup = document.querySelector(".popup-message");
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement("div");
  popup.className = "popup-message";
  popup.innerHTML = `<div class="popup-content">${message}</div>`;
  document.body.appendChild(popup);
  popup.style.display = "block";
  setTimeout(() => popup.remove(), duration);
}

function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Navigation
function showSection(sectionId) {
  document.querySelectorAll(".section").forEach((sec) => sec.classList.remove("active"));
  const section = document.getElementById(sectionId);
  if (!section) {
    console.error(`Section '${sectionId}' not found`);
    return;
  }
  section.classList.add("active");

  document.querySelectorAll('[id$="Message"]').forEach((elem) => {
    if (elem.id !== "productMessage" || sectionId === "cart") elem.textContent = "";
  });

  const actions = {
    products: loadProducts,
    cart: loadCart,
    history: loadHistory,
    bills: loadBills,
  };
  if (actions[sectionId]) actions[sectionId]();
}

// Authentication
document.getElementById("registerForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;

  auth
    .createUserWithEmailAndPassword(email, password)
    .then((cred) => {
      showMessage("regMessage", "Registration successful!");
      return db.collection("users").doc(cred.user.uid).set({ email, credit: 0 });
    })
    .then(() => auth.signOut())
    .then(() => showSection("login"))
    .catch((err) => showMessage("regMessage", err.message));
});

document.getElementById("loginForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  auth
    .signInWithEmailAndPassword(email, password)
    .then((cred) => {
      currentUser = cred.user;
      showMessage("loginMessage", "Login successful!");
      if (cred.user.email === "abarna01@gmail.com") {
        window.location.href = "admin.html";
      } else {
        showSection("home");
      }
    })
    .catch((err) => showMessage("loginMessage", err.message));
});

function logout() {
  cleanupUI();
  auth.signOut()
    .then(() => {
      currentUser = null;
      showMessage("loginMessage", "Logged out successfully", 2000);
      showSection("login");
    })
    .catch((err) => showPopupMessage(err.message));
}

// Products
function loadProducts() {
  const productsList = document.getElementById("productsList");
  if (!productsList) return;

  productsList.innerHTML = '<div class="spinner">Loading products...</div>';
  const selectedCategory = document.getElementById("categorySelect")?.value || "all";

  let query = db
    .collection("products")
    .where("active", "==", true)
    .limit(pageSize * 3);

  if (selectedCategory !== "all") {
    query = query.where("category", "==", selectedCategory);
  }

  console.log("Fetching products with query:", { active: true, category: selectedCategory });

  query
    .get()
    .then((snapshot) => {
      console.log("Products fetched:", snapshot.size, "documents");
      currentProducts = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
      currentPage = 1;
      renderProducts();
    })
    .catch((err) => {
      console.error("Error loading products:", err);
      productsList.innerHTML = "Error loading products.";
    });
}

function renderProducts() {
  const productsList = document.getElementById("productsList");
  if (!productsList) return;

  productsList.className = "product-grid";
  productsList.innerHTML = "";
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, currentProducts.length);
  const fragment = document.createDocumentFragment();

  currentProducts.slice(startIndex, endIndex).forEach(({ id, data }) => {
    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <img src="${data.imageUrl || "assets/images/nothing.png"}" alt="${data.name}" style="max-width: 100px;" onerror="this.src='assets/images/nothing.png'">
      <strong>${data.name}</strong>
      <p>$${data.price} | Credit: ${data.credit}</p>
      <p><em>${data.category}</em></p>
      <button class="add-to-cart-btn" data-product-id="${id}" data-name="${data.name}" data-price="${data.price}" data-credit="${data.credit}">Add to Cart</button>
    `;
    fragment.appendChild(div);
  });
  productsList.appendChild(fragment);

  document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
    btn.removeEventListener("click", handleAddToCart);
    btn.addEventListener("click", handleAddToCart);
  });

  addPagination(productsList);
}

function addPagination(container) {
  const totalPages = Math.ceil(currentProducts.length / pageSize);
  if (totalPages <= 1) return;

  const pagination = document.createElement("div");
  pagination.className = "pagination";
  pagination.style.cssText = "grid-column: 1 / -1; text-align: center; margin-top: 20px;";

  if (currentPage > 1) {
    const prev = document.createElement("button");
    prev.textContent = "Prev";
    prev.onclick = () => { currentPage--; renderProducts(); };
    pagination.appendChild(prev);
  }

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.style.margin = "0 5px";
    if (i === currentPage) {
      btn.disabled = true;
      btn.style.cssText = "background-color: #3498db; color: #fff;";
    }
    btn.onclick = () => { currentPage = i; renderProducts(); };
    pagination.appendChild(btn);
  }

  if (currentPage < totalPages) {
    const next = document.createElement("button");
    next.textContent = "Next";
    next.onclick = () => { currentPage++; renderProducts(); };
    pagination.appendChild(next);
  }

  container.appendChild(pagination);
}

function handleAddToCart(event) {
  const btn = event.target;
  const product = {
    id: btn.dataset.productId,
    name: btn.dataset.name,
    price: parseFloat(btn.dataset.price),
    credit: parseInt(btn.dataset.credit, 10),
  };
  btn.disabled = true;
  showQuantityPrompt(product);
  setTimeout(() => (btn.disabled = false), 1000);
}

function showQuantityPrompt(product) {
  if (!currentUser) {
    showPopupMessage("Please login first!");
    showSection("login");
    return;
  }
  currentProduct = product;

  const popup = document.createElement("div");
  popup.className = "popup";
  popup.innerHTML = `
    <div class="popup-content">
      <p>How many ${product.name} do you want to add?</p>
      <input type="number" id="popupQuantity" value="1" min="1" />
      <br><br>
      <button onclick="confirmPopupQuantity()">Add to Cart</button>
      <button onclick="closePopup()">Cancel</button>
    </div>
  `;
  document.body.appendChild(popup);
  popup.style.display = "block";
}

window.confirmPopupQuantity = () => {
  const quantity = parseInt(document.getElementById("popupQuantity")?.value, 10);
  if (isNaN(quantity) || quantity <= 0) {
    showPopupMessage("Please enter a valid quantity greater than 0.");
    return;
  }
  closePopup();
  addToCart(quantity);
};

window.closePopup = () => {
  const popup = document.querySelector(".popup");
  if (popup) popup.remove();
};

function addToCart(quantity) {
  const { id, name, price, credit } = currentProduct;
  const cartRef = db.collection("users").doc(currentUser.uid).collection("cart");

  cartRef
    .get()
    .then((snapshot) => {
      return cartRef.add({ productId: id, name, price, credit, quantity }).then(() => {
        showPopupMessage(`${quantity} ${name}(s) added to cart.`);
        if (snapshot.size + 1 === 3) {
          setTimeout(() => showPopupMessage("You now have 3 items in your cart!"), 500);
        }
        if (document.getElementById("cart")?.classList.contains("active")) loadCart();
      });
    })
    .catch((err) => showPopupMessage(`Error: ${err.message}`));
}

async function loadCart() {
  const cartList = document.getElementById("cartList");
  const totalAmountEl = document.getElementById("totalAmount");
  const msgElement = document.getElementById("productMessage");
  
  if (!cartList) {
    console.error("cartList element not found in DOM");
    return;
  }

  if (!currentUser) {
    cartList.innerHTML = "Please login to view your cart.";
    console.log("No currentUser, prompting login");
    return;
  }

  cartList.innerHTML = "Loading cart items...";
  console.log("Loading cart for user:", currentUser.uid); // Debug log

  // Optional timeout to avoid infinite loading
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Cart loading timed out")), 10000); // 10 seconds timeout
  });

  try {
    const cartRef = db.collection("users").doc(currentUser.uid).collection("cart");
    const snapshot = await Promise.race([cartRef.get(), timeoutPromise]);
    
    console.log("Cart snapshot retrieved:", snapshot.size, "items"); // Debug log
    
    if (snapshot.empty) {
      cartList.innerHTML = "Your cart is empty.";
      if (totalAmountEl) totalAmountEl.innerHTML = "";
      console.log("Cart is empty for user:", currentUser.uid);
      return;
    }

    // Clear the loading message
    cartList.innerHTML = "";
    const fragment = document.createDocumentFragment();

    // Calculate total amount
    let totalAmount = 0;

    snapshot.forEach((doc) => {
      const item = doc.data();
      totalAmount += item.price * item.quantity;
      console.log("Rendering cart item:", item.name); // Debug log
      const div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML = `
  <span><strong>${item.name}</strong> - $${item.price} x ${item.quantity}</span>
  <button onclick="updateCartItemQuantity('${doc.id}', -1)">-</button>
  <button onclick="updateCartItemQuantity('${doc.id}', 1)">+</button>
  <button onclick="removeFromCart('${doc.id}')">Remove</button>
`;
  
      fragment.appendChild(div);
    });
    cartList.appendChild(fragment);

    // Display total amount
    if (totalAmountEl) {
      totalAmountEl.innerHTML = `Total Amount: $${totalAmount.toFixed(2)}`;
    }
  } catch (err) {
    console.error("Error loading cart:", err.message);
    cartList.innerHTML = `Error loading cart: ${err.message}`;
  }
}


window.removeFromCart = async (cartItemId) => {
  if (!currentUser) return showMessage("cart", "Please login first!");

  try {
    await db.collection("users").doc(currentUser.uid).collection("cart").doc(cartItemId).delete();
    loadCart();
  } catch (err) {
    console.error("Error removing item:", err);
    showMessage("cart", "Error removing item.");
  }
};

// Order Processing
function placeOrder() {
  if (!currentUser) {
    showMessage("cart", "Please login first!");
    showSection("login");
    return;
  }

  const cartRef = db.collection("users").doc(currentUser.uid).collection("cart");
  const userRef = db.collection("users").doc(currentUser.uid);

  cartRef.get().then(async (snapshot) => {
    if (snapshot.empty) return showMessage("cart", "Your cart is empty!");

    let orderItems = [];
    let orderTotal = 0;
    let totalCreditEarned = 0;
    const productUpdates = [];

    snapshot.forEach((doc) => {
      const item = doc.data();
      orderItems.push(item);
      orderTotal += item.price * item.quantity;
      totalCreditEarned += item.credit * item.quantity;

      productUpdates.push(
        db.collection("products").doc(item.productId).update({
          stock: firebase.firestore.FieldValue.increment(-item.quantity),
        })
      );
    });

    try {
      await Promise.all(productUpdates);
      const userDoc = await userRef.get();
      const currentCredit = userDoc.data().credit || 0;

      const handleCredit = (useCredit) => {
        const discount = useCredit ? Math.min(currentCredit, orderTotal) : 0;
        const amountToPay = orderTotal - discount;

        db.collection("orders")
          .add({
            userId: currentUser.uid,
            items: orderItems,
            orderDate: new Date(),
            total: orderTotal,
            discountApplied: discount,
            amountPaid: amountToPay,
            creditEarned: totalCreditEarned,
          })
          .then(() => {
            const newCredit = currentCredit - discount + totalCreditEarned;
            userRef.update({ credit: newCredit }).then(() => {
              cartRef.get().then((cartSnap) => {
                Promise.all(cartSnap.docs.map((doc) => doc.ref.delete())).then(() => {
                  showMessage(
                    "productMessage",
                    `Order placed! Total: $${orderTotal}, Discount: $${discount}, Paid: $${amountToPay}, Credit Earned: ${totalCreditEarned}`
                  );
                  loadCart();
                  if (document.getElementById("history")?.classList.contains("active")) loadHistory();
                });
              });
            });
          });
      };

      if (currentCredit > 0) {
        showCreditPopup(currentCredit, orderTotal, handleCredit);
      } else {
        handleCredit(false);
      }
    } catch (err) {
      showMessage("cart", `Error placing order: ${err.message}`);
    }
  });
}

async function updateCartItemQuantity(cartItemId, change, productId) {
  if (!currentUser) {
    console.error("User not logged in");
    return;
  }

  const cartItemRef = db.collection("users").doc(currentUser.uid).collection("cart").doc(cartItemId);

  try {
    const cartItem = await cartItemRef.get();

    if (!cartItem.exists) {
      console.error("Cart item not found");
      return;
    }

    let newQuantity = cartItem.data().quantity + change;

    if (newQuantity <= 0) {
      console.log("Removing item from cart...");
      await cartItemRef.delete();
    } else {
      await cartItemRef.update({ quantity: newQuantity });
    }

    console.log(`Updated quantity for item ${cartItemId}: ${newQuantity}`);

    // Reload cart UI after update
    await loadCart();
  } catch (error) {
    console.error("Error updating cart item:", error.message);
  }
}


function showCreditPopup(currentCredit, orderTotal, callback) {
  const popup = document.createElement("div");
  popup.className = "popup";
  popup.innerHTML = `
    <div class="popup-content">
      <p>You have ${currentCredit} credits. Use them for a discount (up to $${Math.min(currentCredit, orderTotal)})?</p>
      <button onclick="applyCredit(true)">Apply Credit</button>
      <button onclick="applyCredit(false)">Skip</button>
    </div>
  `;
  document.body.appendChild(popup);
  popup.style.display = "block";

  window.applyCredit = (useCredit) => {
    popup.remove();
    callback(useCredit);
  };
}

// History & Bills
function loadHistory() {
  const historyList = document.getElementById("historyList");
  if (!historyList || !currentUser) {
    if (historyList) historyList.innerHTML = "Please login to view your order history.";
    return;
  }

  historyList.innerHTML = "Loading order history...";
  db.collection("orders")
    .where("userId", "==", currentUser.uid)
    .orderBy("orderDate", "desc")
    .get()
    .then((snapshot) => {
      historyList.innerHTML = snapshot.empty ? "No orders found." : "";
      snapshot.forEach((doc) => {
        const order = doc.data();
        const date = order.orderDate.toDate().toLocaleString();
        const div = document.createElement("div");
        div.className = "order";
        div.innerHTML = `
          <h3>Order ID: ${doc.id}</h3>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Items:</strong></p>
          <ul>${order.items.map((item) => `<li>${item.name} - $${item.price} x ${item.quantity}</li>`).join("")}</ul>
          <p><strong>Total:</strong> $${order.total} | <strong>Discount:</strong> $${order.discountApplied} | <strong>Paid:</strong> $${order.amountPaid}</p>
          <hr>
        `;
        historyList.appendChild(div);
      });
    })
    .catch((err) => {
      console.error("Error loading history:", err);
      historyList.innerHTML = "Error loading history.";
    });
}

function loadBills() {
  const billsList = document.getElementById("billsList");
  if (!billsList || !currentUser) {
    if (billsList) billsList.innerHTML = "Please login to view your bills.";
    return;
  }

  billsList.innerHTML = "Loading bills...";
  db.collection("orders")
    .where("userId", "==", currentUser.uid)
    .orderBy("orderDate", "desc")
    .get()
    .then((snapshot) => {
      billsList.innerHTML = snapshot.empty ? "No bills found." : "";
      snapshot.forEach((doc) => {
        const order = doc.data();
        const date = order.orderDate.toDate().toLocaleString();
        const div = document.createElement("div");
        div.className = "bill";
        div.style.cssText = "border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 10px;";
        div.innerHTML = `
          <h3>Bill ID: ${doc.id}</h3>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Total:</strong> $${order.total} | <strong>Discount:</strong> $${order.discountApplied} | <strong>Paid:</strong> $${order.amountPaid}</p>
          <button onclick="downloadBillFromOrder('${doc.id}')">Download Bill</button>
        `;
        billsList.appendChild(div);
      });
    })
    .catch((err) => {
      console.error("Error loading bills:", err);
      billsList.innerHTML = "Error loading bills.";
    });
}

window.downloadBillFromOrder = async (orderId) => {
  try {
    const order = (await db.collection("orders").doc(orderId).get()).data();
    const date = order.orderDate.toDate().toLocaleString();
    const lines = [
      `Bill ID: ${orderId}`,
      `Order Date: ${date}`,
      `Total: $${order.total}`,
      `Discount Applied: $${order.discountApplied}`,
      `Amount Paid: $${order.amountPaid}`,
      `Credit Earned: ${order.creditEarned || 0}`,
      "Items:",
      ...order.items.map((item) => `- ${item.name} ($${item.price}) x ${item.quantity}`),
    ];

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    lines.forEach((line, i) => pdf.text(line, 10, 10 + i * 10));
    pdf.save(`bill_${orderId}.pdf`);
  } catch (err) {
    console.error("Error downloading bill:", err);
    showPopupMessage("Failed to download bill.");
  }
};

// Cleanup
function cleanupUI() {
  document.querySelectorAll('[id$="Message"]').forEach((elem) => (elem.textContent = ""));
  document.querySelector(".popup")?.remove();
  const modal = document.getElementById("quantityModal");
  if (modal) modal.style.display = "none";
  currentProduct = null;
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  const categorySelect = document.getElementById("categorySelect");
  if (categorySelect) {
    // Add event listener for category filtering
    categorySelect.addEventListener("change", debounce(loadProducts, 300));
    
    // Dynamically populate categories from Firestore
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

auth.onAuthStateChanged((user) => {
  currentUser = user;
  if (!user) {
    cleanupUI();
    showSection("home");
    ["cartList", "historyList"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
  }
});

// Global Functions
window.showSection = showSection;
window.loadProducts = loadProducts;
window.loadCart = loadCart;
window.placeOrder = placeOrder;
window.loadHistory = loadHistory;
window.loadBills = loadBills;
window.logout = logout;