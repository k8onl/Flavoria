// Change this to your AWS EC2 Public IP later!
const API_BASE_URL = 'http://54.162.239.164:5000';

// Food data
const foodData = [
    {
        id: 1,
        name: "Margherita Pizza",
        price: 12.99,
        category: "pizza",
        image: "img/food/margpizza.jpg",
        description: "Classic pizza with tomato sauce, mozzarella, and basil",
        rating: 4.8,
        inStock: false 
    },
    {
        id: 2,
        name: "Pepperoni Pizza",
        price: 14.99,
        category: "pizza",
        image: "img/food/pizza2.jpg",
        description: "Pizza topped with pepperoni and mozzarella cheese",
        rating: 4.6
    },
    {
        id: 3,
        name: "Cheeseburger",
        price: 9.99,
        category: "burger",
        image: "img/food/cheeseburger.jpg",
        description: "Juicy beef burger with cheese, lettuce, and tomato",
        rating: 4.7
    },
    {
        id: 4,
        name: "Chicken Burger",
        price: 10.99,
        category: "burger",
        image: "img/food/chickenburger.jpg",
        description: "Grilled chicken breast with special sauce",
        rating: 4.5
    },
    {
        id: 5,
        name: "Club Sandwich",
        price: 8.99,
        category: "sandwich",
        image: "img/food/clubsand.jpg",
        description: "Triple-decker sandwich with turkey, bacon, and vegetables",
        rating: 4.4
    },
    {
        id: 6,
        name: "Veggie Sandwich",
        price: 7.99,
        category: "sandwich",
        image: "img/food/veggisand.jpg",
        description: "Fresh vegetables with hummus and sprouts",
        rating: 4.9
    }
];

// Cart array
let cart = [];
let lastRemovedCartItem = null;
let removeUndoTimer = null;

// Favorites array & Initialization
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Toggle Favorite Logic
function toggleFavorite(foodId, btnElement) {
    if (localStorage.getItem('loggedIn') !== 'true') {
        showToast('Please login to save favorites!', 'warning');
        return;
    }

    const index = favorites.indexOf(foodId);
    const icon = btnElement.querySelector('i');

    if (index === -1) {
        // Add to favorites
        favorites.push(foodId);
        btnElement.classList.add('active');
        icon.classList.remove('far');
        icon.classList.add('fas');
        showToast('Added to favorites!', 'success');
    } else {
        // Remove from favorites
        favorites.splice(index, 1);
        btnElement.classList.remove('active');
        icon.classList.remove('fas');
        icon.classList.add('far');
        showToast('Removed from favorites.', 'error');
        
        // If we are on the favorites page, refresh the list visually
        if (document.getElementById('favoritesList')) {
            displayFavorites();
        }
    }
    
    // 1. Save to local browser memory
    localStorage.setItem('favorites', JSON.stringify(favorites));

    // 2. Sync with Python Database (Moved here so it runs after a successful toggle!)
    fetch(`${API_BASE_URL}/update-favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            email: localStorage.getItem('userEmail'), 
            favorites: favorites 
        })
    }).catch(err => console.error("Error saving favorites to database:", err));
}

// DOM Elements
const cartLink = document.getElementById('cartLink');
const cartModal = document.getElementById('cartModal');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.querySelector('.cart-count');
const featuredFoods = document.getElementById('featuredFoods');
const checkoutBtn = document.getElementById('checkoutBtn');

// Function to dynamically build and show the custom logout modal
function showLogoutModal() {
    // Check if modal already exists so we don't create duplicates
    let modal = document.getElementById('logoutModal');
    
    if (!modal) {
        // Create the background overlay
        modal = document.createElement('div');
        modal.id = 'logoutModal';
        modal.className = 'custom-modal';

        // Add the HTML content inside the overlay
        modal.innerHTML = `
            <div class="custom-modal-content">
                <h3>Sign Out</h3>
                <p>Are you sure you want to log out of your Flavoria account?</p>
                <div class="modal-actions">
                    <button id="cancelLogout" class="btn-cancel">Cancel</button>
                    <button id="confirmLogout" class="btn-primary">Logout</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add logic for the Cancel button
        document.getElementById('cancelLogout').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Add logic for the Logout button
        // Add logic for the Logout button
        document.getElementById('confirmLogout').addEventListener('click', () => {
            // Clearing localStorage entirely wipes out cart, orders, favorites, and login state from the local machine!
            localStorage.clear(); 
            location.reload();
        });

        // Allow users to close the modal by clicking the dark background outside the box
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Show the modal
    modal.style.display = 'flex';
}

// Update navigation based on login status and add dropdown
function updateNavForLogin() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        // Find the list item containing the login link or the active dropdown
        const loginLi = navLinks.querySelector('a[href="login.html"]')?.parentElement || 
                        document.getElementById('myAccountDropdown')?.parentElement;

        if (!loginLi) return;

        if (localStorage.getItem('loggedIn') === 'true') {
            const userName = localStorage.getItem('userName') || 'User';
            const userEmail = localStorage.getItem('userEmail') || '';
            
            // Get the total number of orders to show in the badge
            const orders = JSON.parse(localStorage.getItem('orders')) || [];
            const orderCount = orders.length;

            // Add the dropdown structure
            // Add the dropdown structure
            loginLi.classList.add('dropdown-container');
            loginLi.innerHTML = `
                <button class="nav-btn" id="myAccountDropdown">
                    <i class="fas fa-user"></i> My Account <i class="fas fa-chevron-down" style="font-size: 0.7em; margin-left: 4px;"></i>
                </button>
                <div class="dropdown-menu" id="profileMenu">
                    <div class="dropdown-header">
                        <strong>${userName}</strong>
                        <small>${userEmail}</small>
                    </div>
                    <hr class="dropdown-divider">
                    <a href="orders.html" class="dropdown-item">
                        <i class="fas fa-shopping-bag"></i> My Orders 
                        <span class="dropdown-badge" style="display: ${orderCount > 0 ? 'grid' : 'none'};">${orderCount}</span>
                    </a>
                    <a href="favorites.html" class="dropdown-item"><i class="fas fa-heart"></i> Favorites</a>
                    <hr class="dropdown-divider">
                    <a href="#" id="dropdownLogout" class="dropdown-item text-danger"><i class="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            `;

            const myAccountBtn = document.getElementById('myAccountDropdown');
            const profileMenu = document.getElementById('profileMenu');

            // Toggle dropdown on click
            myAccountBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); 
                profileMenu.classList.toggle('show');
            });

            // Close dropdown when clicking anywhere outside of it
            document.addEventListener('click', function(e) {
                if (!loginLi.contains(e.target)) {
                    profileMenu.classList.remove('show');
                }
            });

            // Attach the existing custom logout modal to the new logout button
            document.getElementById('dropdownLogout').addEventListener('click', function(e) {
                e.preventDefault();
                profileMenu.classList.remove('show');
                showLogoutModal(); 
            });

        } else {
            // Revert to normal login link if not logged in
            loginLi.className = '';
            loginLi.innerHTML = '<a href="login.html">Login</a>';
        }
    }
}
// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Frontend validation for missing info (RED BAR)
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, { // <-- Notice the backticks here!
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Login successful
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userName', data.user.name);
            // Load saved database info into the frontend
            localStorage.setItem('favorites', JSON.stringify(data.favorites || []));
            localStorage.setItem('orders', JSON.stringify(data.orders || []));
            localStorage.setItem('cart', JSON.stringify(data.cart || [])); 
            
            showMessage(data.message, 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            // Check the specific error type sent by Python
            if (data.error === 'not_found') {
                // Email doesn't exist in CSV (YELLOW BAR)
                showMessage(data.message, 'warning'); 
            } else {
                // Missing info or wrong password (RED BAR)
                showMessage(data.message, 'error'); 
            }
        }
    } catch (error) {
        showMessage('Failed to connect to the server.', 'error');
    }
}
// Show register form
function showRegisterForm(e) {
    e.preventDefault();
    
    const authPanel = document.querySelector('.auth-panel');
    authPanel.innerHTML = `
        <h2>Create Your Account</h2>
        <div id="message" class="message" style="display: none;"></div>
        <form id="registerForm">
            <div class="form-group">
                <label for="regName">Full Name</label>
                <input type="text" id="regName" name="name" required>
            </div>
            <div class="form-group">
                <label for="regEmail">Email Address</label>
                <input type="email" id="regEmail" name="email" required>
            </div>
            <div class="form-group">
                <label for="regPassword">Password</label>
                <input type="password" id="regPassword" name="password" required>
            </div>
            <div class="form-group">
                <label for="regConfirmPassword">Confirm Password</label>
                <input type="password" id="regConfirmPassword" name="confirmPassword" required>
            </div>
            <button type="submit" class="btn-primary">Register</button>
        </form>
        <p class="register-link">Already have an account? <a href="#" id="loginLink">Login here</a></p>
    `;
    
    // Add event listeners for the new form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('loginLink').addEventListener('click', showLoginForm);
}

// Handle register form submission
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        // Pointing to the Flask server on port 5000
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(data.message, 'success');
            setTimeout(() => {
                showLoginForm();
            }, 2000);
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Failed to connect to the server.', 'error');
    }
}
// Show login form
function showLoginForm() {
    const authPanel = document.querySelector('.auth-panel');
    authPanel.innerHTML = `
        <h2>Login to Your Account</h2>
        <div id="message" class="message" style="display: none;"></div>
        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="btn-primary">Login</button>
        </form>
        <p class="register-link">Don't have an account? <a href="#" id="registerLink">Register here</a></p>
    `;
    
    // Add event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerLink').addEventListener('click', showRegisterForm);
}

// Show message function
function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadCartFromLocalStorage();
    if (featuredFoods) {
        displayFeaturedFoods();
    }
    updateCartUI();
    updateNavForLogin(); // Check login status on load
    
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register link handler
    const registerLink = document.getElementById('registerLink');
    if (registerLink) {
        registerLink.addEventListener('click', showRegisterForm);
    }
    
    // Event Listeners
    if (cartLink) {
        // Cart link now navigates to cart.html instead of opening modal
        // No event listener needed for navigation
    }
    if (closeCart) closeCart.addEventListener('click', closeCartModal);
    if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === cartModal) {
            closeCartModal();
        }
    });
});

// Display featured foods
function displayFeaturedFoods() {
    featuredFoods.innerHTML = '';
    
    // Get first 3 items as featured
    const featuredItems = foodData.slice(0, 3);
    
    featuredItems.forEach(food => {
        const foodCard = document.createElement('div');
        foodCard.className = 'food-card';
        foodCard.innerHTML = `
            <button class="fav-btn ${favorites.includes(food.id) ? 'active' : ''}" data-id="${food.id}">
                <i class="${favorites.includes(food.id) ? 'fas' : 'far'} fa-heart"></i>
            </button>
            <img src="${food.image}" alt="${food.name}">
            <div class="food-info">
                <h3>${food.name}</h3>
                <p>${food.description}</p>
                <div class="rating">
                    <span class="rating-stars">${renderRatingStars(food.rating)}</span>
                    <span class="rating-value">${food.rating.toFixed(1)}</span>
                </div>
                <span class="price">$${food.price.toFixed(2)}</span>
                <button class="add-to-cart" data-id="${food.id}">Add to Cart</button>
            </div>
        `;
        featuredFoods.appendChild(foodCard);
    });
    
    // Add event listeners to add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const foodId = parseInt(this.getAttribute('data-id'));
            addToCart(foodId);
        });
    });

    // Add event listeners to favorite buttons
    document.querySelectorAll('.fav-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevents clicking the card background
            const foodId = parseInt(this.getAttribute('data-id'));
            toggleFavorite(foodId, this);
        });
    });
}

// Function to generate custom toast notifications
function showToast(message, type = 'success') {
    // 1. Find or create the container
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // 2. Create the toast element
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    
    // 3. Set the proper icon based on the type
    let iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    
    const icon = `<i class="fas ${iconClass}"></i>`;
    
    // 4. Build the HTML inside the toast
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    // 5. Trigger the slide-in animation
    setTimeout(() => toast.classList.add('show'), 10);

    // 6. Automatically remove the toast after 3.5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Wait for animation to finish before deleting
    }, 3500);
}

// Add item to cart
function addToCart(foodId) {
    const food = foodData.find(item => item.id === foodId);
    
    if (food) {
        // --- NEW OUT OF STOCK CHECK ---
        // Assuming you add an 'inStock' property to your foodData items (e.g., inStock: false)
        // If an item explicitly has inStock set to false, show the red error!
        if (food.inStock === false) {
            showToast(`Sorry, ${food.name} is currently out of stock!`, 'error');
            return; // Stop the function here so it doesn't get added to the cart
        }
        
        // Check if item already in cart
        const existingItem = cart.find(item => item.id === foodId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: food.id,
                name: food.name,
                price: food.price,
                image: food.image,
                quantity: 1,
                size: 'Medium',
                extra: 'None',
                drink: 'None',
                note: ''
            });
        }
        
        saveCartToLocalStorage();
        updateCartUI();
        
        // --- NEW NOTIFICATION ---
        // Call our custom toast instead of alert()
        showToast(`${food.name} added to cart!`, 'success');
    }
}
// Remove item from cart
function removeFromCart(foodId) {
    const removedItem = cart.find(item => item.id === foodId);
    if (removedItem) {
        lastRemovedCartItem = { ...removedItem };
        if (removeUndoTimer) clearTimeout(removeUndoTimer);
        removeUndoTimer = setTimeout(() => {
            lastRemovedCartItem = null;
            removeUndoTimer = null;
            hideUndoNotice();
        }, 5000);

        cart = cart.filter(item => item.id !== foodId);
        saveCartToLocalStorage();
        updateCartUI();
        showUndoNotice();
    }
}

function undoLastDelete() {
    if (!lastRemovedCartItem) return;
    const existing = cart.find(item => item.id === lastRemovedCartItem.id);
    if (existing) {
        existing.quantity += lastRemovedCartItem.quantity;
    } else {
        cart.push(lastRemovedCartItem);
    }
    saveCartToLocalStorage();
    updateCartUI();
    lastRemovedCartItem = null;
    if (removeUndoTimer) {
        clearTimeout(removeUndoTimer);
        removeUndoTimer = null;
    }
    hideUndoNotice();
}

function showUndoNotice() {
    const undoToast = document.getElementById('undoToast');
    if (!undoToast) return;
    undoToast.classList.add('visible');
}

function hideUndoNotice() {
    const undoToast = document.getElementById('undoToast');
    if (!undoToast) return;
    undoToast.classList.remove('visible');
}

// Update item quantity
function updateQuantity(foodId, change) {
    const item = cart.find(item => item.id === foodId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(foodId);
        } else {
            saveCartToLocalStorage();
            updateCartUI();
        }
    }
}

// Update cart UI
function updateCartUI() {
    // Update cart count
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
    }
    
    if (!cartItems || !cartTotal) {
        return;
    }
    
    // Update cart modal/UI if present
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart-message">Your cart is empty</p>';
        cartTotal.textContent = '0.00';
        return;
    }
    
    cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="item-info">
                <h4>${item.name}</h4>
                <p class="item-price">$${item.price.toFixed(2)} each</p>
            </div>
            <div class="item-quantity">
                <button class="quantity-btn minus" data-id="${item.id}">-</button>
                <span class="quantity">${item.quantity}</span>
                <button class="quantity-btn plus" data-id="${item.id}">+</button>
            </div>
            <p class="item-total">$${itemTotal.toFixed(2)}</p>
            <button class="remove-item" data-id="${item.id}">×</button>
        `;
        
        cartItems.appendChild(cartItem);
    });
    
    cartTotal.textContent = total.toFixed(2);
    
    // Add event listeners to cart buttons
    document.querySelectorAll('.quantity-btn.minus').forEach(button => {
        button.addEventListener('click', function() {
            const foodId = parseInt(this.getAttribute('data-id'));
            updateQuantity(foodId, -1);
        });
    });
    
    document.querySelectorAll('.quantity-btn.plus').forEach(button => {
        button.addEventListener('click', function() {
            const foodId = parseInt(this.getAttribute('data-id'));
            updateQuantity(foodId, 1);
        });
    });
    
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', function() {
            const foodId = parseInt(this.getAttribute('data-id'));
            removeFromCart(foodId);
        });
    });
}

// Open cart modal
function openCart() {
    cartModal.style.display = 'flex';
}

// Close cart modal
function closeCartModal() {
    cartModal.style.display = 'none';
}

// Checkout function
function checkout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    // Save order to localStorage
    const order = {
        items: [...cart],
        total: parseFloat(cartTotal.textContent),
        timestamp: new Date().toISOString()
    };
    
    // Get existing orders or initialize empty array
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    
    // Generate bill preview
    generateBillPreview(order);
    
    // Clear cart
    cart = [];
    saveCartToLocalStorage();
    updateCartUI();
    closeCartModal();
}

// Generate bill preview
function generateBillPreview(order) {
    // Create bill content
    let billContent = `
=====================================
          FOODIE DELIGHT
      ORDER RECEIPT & BILL
=====================================

Date: ${new Date(order.timestamp).toLocaleString()}

Items:
-------------------------------------
`;
    
    order.items.forEach(item => {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        billContent += `${item.name}
  Price: $${item.price.toFixed(2)} x ${item.quantity} = $${itemTotal}
-------------------------------------
`;
    });
    
    billContent += `
Total Amount: $${order.total.toFixed(2)}

=====================================
    Thank you for your order!
  Visit us again at Foodie Delight
=====================================
`;
    
    // Show bill preview modal
    showBillPreview(billContent, order);
}

// Show bill preview modal
function showBillPreview(billContent, order) {
    // Create modal if it doesn't exist
    let billModal = document.getElementById('billModal');
    if (!billModal) {
        billModal = document.createElement('div');
        billModal.id = 'billModal';
        billModal.className = 'cart-modal';
        billModal.innerHTML = `
            <div class="cart-content" style="width: 90%; max-width: 700px;">
                <div class="cart-header">
                    <h2>Order Bill Preview</h2>
                    <span class="close-btn" id="closeBill">&times;</span>
                </div>
                <div class="cart-body" style="padding: 20px;">
                    <div id="billPreview" style="white-space: pre-wrap; font-family: monospace; background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
                        <!-- Bill content will be inserted here -->
                    </div>
                    <div class="cart-footer" style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn-primary" id="downloadTxt" style="background: #28a745;">Download as TXT</button>
                        <button class="btn-primary" id="downloadPdf" style="background: #dc3545;">Download as PDF</button>
                        <button class="btn-primary" id="closeBillBtn">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(billModal);
        
        // Add event listeners
        document.getElementById('closeBill').addEventListener('click', () => {
            billModal.style.display = 'none';
        });
        
        document.getElementById('closeBillBtn').addEventListener('click', () => {
            billModal.style.display = 'none';
        });
        
        document.getElementById('downloadTxt').addEventListener('click', () => {
            downloadBillAsTxt(billContent, order);
        });
        
        document.getElementById('downloadPdf').addEventListener('click', () => {
            downloadBillAsPdf(billContent, order);
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === billModal) {
                billModal.style.display = 'none';
            }
        });
    }
    
    // Update bill content
    document.getElementById('billPreview').textContent = billContent;
    
    // Show modal
    billModal.style.display = 'flex';
}

// Download bill as TXT
function downloadBillAsTxt(billContent, order) {
    const blob = new Blob([billContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foodie-delight-bill-${new Date(order.timestamp).getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download bill as PDF
function downloadBillAsPdf(billContent, order) {
    // For simplicity, we'll create a print-friendly version and trigger print
    // In a real application, you might use a library like jsPDF
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Foodie Delight Bill</title>
            <style>
                body { font-family: monospace; margin: 20px; }
                pre { white-space: pre-wrap; }
            </style>
        </head>
        <body>
            <pre>${billContent}</pre>
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Save cart to localStorage and Database
function saveCartToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));

    // Sync with Python Database if logged in
    if (localStorage.getItem('loggedIn') === 'true') {
        fetch(`${API_BASE_URL}/update-cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: localStorage.getItem('userEmail'), 
                cart: cart 
            })
        }).catch(err => console.error("Error saving cart to database:", err));
    }
}
// Load cart from localStorage
function normalizeCartItem(item) {
    return {
        ...item,
        extra: item.extra || 'None',
        drink: item.drink || 'None',
        note: item.note || ''
    };
}

function loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart).map(normalizeCartItem);
    }
}

function getExtraPrice(option) {
    const extras = {
        'None': 0,
        'Extra Cheese': 1.50,
        'Avocado': 2.00,
        'Bacon': 2.50,
        'Olives': 1.00
    };
    return extras[option] || 0;
}

function getDrinkPrice(option) {
    const drinks = {
        'None': 0,
        'Coke': 1.99,
        'Juice': 2.49,
        'Water': 0.99,
        'Smoothie': 3.50
    };
    return drinks[option] || 0;
}

function renderRatingStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (rating >= i) {
            stars += '<i class="fas fa-star"></i>';
        } else if (rating >= i - 0.5) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

function getCartItemTotal(item) {
    const extraTotal = getExtraPrice(item.extra);
    const drinkTotal = getDrinkPrice(item.drink);
    return (item.price + extraTotal + drinkTotal) * item.quantity;
}

function updateCartItemCustomization(foodId, field, value) {
    const item = cart.find(item => item.id === foodId);
    if (item) {
        item[field] = value;
        saveCartToLocalStorage();
        updateCartUI();
    }
}

// Menu page functions
function displayMenuFoods(category = 'all') {
    const menuFoods = document.getElementById('menuFoods');
    if (!menuFoods) return;
    
    menuFoods.innerHTML = '';
    
    const filteredFoods = foodData.filter(food => category === 'all' || food.category === category);
    
    if (filteredFoods.length === 0) {
        menuFoods.innerHTML = '<p class="empty-menu-message">No menu items found for this category.</p>';
        return;
    }
    
    filteredFoods.forEach(food => {
        const foodCard = document.createElement('div');
        foodCard.className = 'food-card';
        foodCard.innerHTML = `
            <button class="fav-btn ${favorites.includes(food.id) ? 'active' : ''}" data-id="${food.id}">
                <i class="${favorites.includes(food.id) ? 'fas' : 'far'} fa-heart"></i>
            </button>
            <img src="${food.image}" alt="${food.name}">
            <div class="food-info">
                <h3>${food.name}</h3>
                <p>${food.description}</p>
                <div class="rating">
                    <span class="rating-stars">${renderRatingStars(food.rating)}</span>
                    <span class="rating-value">${food.rating.toFixed(1)}</span>
                </div>
                <span class="price">$${food.price.toFixed(2)}</span>
                <button class="add-to-cart" data-id="${food.id}">Add to Cart</button>
            </div>
        `;
        menuFoods.appendChild(foodCard);
    });
    
    // Add event listeners to add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const foodId = parseInt(this.getAttribute('data-id'));
            addToCart(foodId);
        });
    });

    document.querySelectorAll('#menuFoods .fav-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevents clicking the card background
            const foodId = parseInt(this.getAttribute('data-id'));
            toggleFavorite(foodId, this);
        });
    });
}

// Filter functionality for menu page
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get category and display foods
            const category = this.getAttribute('data-category');
            displayMenuFoods(category);
        });
    });
}

// Initialize menu page if on menu page
if (document.querySelector('.menu-page')) {
    document.addEventListener('DOMContentLoaded', function() {
        loadCartFromLocalStorage();
        updateCartUI();
        displayMenuFoods();
        setupFilterButtons();
        
        // No cart modal on this page; cartLink should navigate normally to cart.html
        if (closeCart) closeCart.addEventListener('click', closeCartModal);
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === cartModal) {
                closeCartModal();
            }
        });
    });
}

// Initialize about page if on about page
if (document.querySelector('.about-page')) {
    document.addEventListener('DOMContentLoaded', function() {
        loadCartFromLocalStorage();
        updateCartUI();
        
        // No cart modal on this page; cartLink should navigate normally to cart.html
        if (closeCart) closeCart.addEventListener('click', closeCartModal);
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === cartModal) {
                closeCartModal();
            }
        });
    });
}

// Initialize contact page if on contact page
if (document.querySelector('.contact-page')) {
    document.addEventListener('DOMContentLoaded', function() {
        loadCartFromLocalStorage();
        updateCartUI();
        
        // No cart modal on this page; cartLink should navigate normally to cart.html
        if (closeCart) closeCart.addEventListener('click', closeCartModal);
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === cartModal) {
                closeCartModal();
            }
        });
        
        // Form submission
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const name = document.getElementById('name').value;
                const email = document.getElementById('email').value;
                const message = document.getElementById('message').value;
                
                const contactMessage = {
                    name: name,
                    email: email,
                    message: message,
                    timestamp: new Date().toISOString()
                };
                
                const messages = JSON.parse(localStorage.getItem('contactMessages')) || [];
                messages.push(contactMessage);
                localStorage.setItem('contactMessages', JSON.stringify(messages));
                
                contactForm.reset();
                alert('Thank you for your message! We will get back to you soon.');
            });
        }
    });
}

// Initialize login page if on login page
if (document.querySelector('.login-page')) {
    document.addEventListener('DOMContentLoaded', function() {
        loadCartFromLocalStorage();
        updateCartUI();
        
        // No cart modal on this page; cartLink should navigate normally to cart.html
        if (closeCart) closeCart.addEventListener('click', closeCartModal);
        
        window.addEventListener('click', function(event) {
            if (event.target === cartModal) {
                closeCartModal();
            }
        });
    
    });
}


// Display Favorites Page Logic
function displayFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    if (!favoritesList) return;
    
    favoritesList.innerHTML = '';
    
    // Filter foodData to only include items whose ID is in the favorites array
    const favoriteFoods = foodData.filter(food => favorites.includes(food.id));
    
    if (favoriteFoods.length === 0) {
        favoritesList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="far fa-heart" style="font-size: 4rem; color: #ddd; margin-bottom: 20px;"></i>
                <h3 style="color: #666; margin-bottom: 10px;">No favorites saved yet</h3>
                <p style="color: #888; margin-bottom: 20px;">Click the heart icon on any dish to save it here!</p>
                <a href="menu.html" class="btn-primary">Explore Menu</a>
            </div>
        `;
        return;
    }
    
    // Generate the cards just like displayMenuFoods
    favoriteFoods.forEach(food => {
        const foodCard = document.createElement('div');
        foodCard.className = 'food-card';
        foodCard.innerHTML = `
            <button class="fav-btn active" data-id="${food.id}">
                <i class="fas fa-heart"></i>
            </button>
            <img src="${food.image}" alt="${food.name}">
            <div class="food-info">
                <h3>${food.name}</h3>
                <p>${food.description}</p>
                <div class="rating">
                    <span class="rating-stars">${renderRatingStars(food.rating)}</span>
                    <span class="rating-value">${food.rating.toFixed(1)}</span>
                </div>
                <span class="price">$${food.price.toFixed(2)}</span>
                <button class="add-to-cart" data-id="${food.id}">Add to Cart</button>
            </div>
        `;
        favoritesList.appendChild(foodCard);
    });
    
    // Reattach listeners for the freshly created buttons
    document.querySelectorAll('#favoritesList .add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const foodId = parseInt(this.getAttribute('data-id'));
            addToCart(foodId);
        });
    });
    
    document.querySelectorAll('#favoritesList .fav-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const foodId = parseInt(this.getAttribute('data-id'));
            toggleFavorite(foodId, this);
        });
    });
}

// Trigger it to run if we are on the favorites.html page
if (document.getElementById('favoritesList')) {
    document.addEventListener('DOMContentLoaded', displayFavorites);
}

// ==========================================
// Orders Page & Vodafone Cash Logic
// ==========================================

function displayOrders() {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    const orders = JSON.parse(localStorage.getItem('orders')) || [];

    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; grid-column: 1/-1;">
                <i class="fas fa-receipt" style="font-size: 4rem; color: #ddd; margin-bottom: 20px;"></i>
                <h3 style="color: #666;">No orders found</h3>
                <p style="color: #888; margin-bottom: 20px;">You haven't placed any orders yet.</p>
                <a href="menu.html" class="btn-primary">Browse Menu</a>
            </div>
        `;
        return;
    }

    // Reverse the array so the newest orders appear at the top
    ordersList.innerHTML = [...orders].reverse().map((order, reversedIndex) => {
        const originalIndex = orders.length - 1 - reversedIndex;
        const date = new Date(order.timestamp).toLocaleDateString() + ' at ' + new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Ensure status defaults to Pending if not set
        const status = order.status || 'Pending';
        const isPaid = status === 'Paid';

        return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <span class="order-id">Order #${1000 + originalIndex + 1}</span>
                        <span class="order-date">${date}</span>
                    </div>
                    <span class="order-status ${status.toLowerCase()}">${status}</span>
                </div>
                <div class="order-items-list">
                    ${order.items.map(item => `
                        <div class="order-item-row">
                            <span>${item.quantity}x ${item.name} <small>(${item.size})</small></span>
                            <span>$${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-footer">
                    <span class="order-total">Total: $${order.total.toFixed(2)}</span>
                    ${!isPaid 
                        ? `<button class="btn-vfc" onclick="openVfcModal(${originalIndex})"><i class="fas fa-mobile-alt"></i> Pay with Vodafone Cash</button>` 
                        : `<div style="display: flex; align-items: center; gap: 16px;">
                               <span class="paid-badge"><i class="fas fa-check-circle"></i> Payment Complete</span>
                               <a href="index.html" class="btn-primary" style="padding: 10px 22px; min-width: auto; font-size: 0.95rem;">Return Home</a>
                           </div>`
                    }
                </div>
            </div>
        `;
    }).join('');
}
// Handle Vodafone Cash Payment Flow
let currentPaymentIndex = null;

function openVfcModal(orderIndex) {
    currentPaymentIndex = orderIndex;
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const order = orders[orderIndex];

    const vfcModal = document.getElementById('vfcModal');
    const vfcTotalDisplay = document.getElementById('vfcTotalDisplay');
    
    if (vfcModal && order) {
        // Inject the order total in green text
        vfcTotalDisplay.textContent = `Total: $${order.total.toFixed(2)}`;
        
        // Clear any previously uploaded file
        document.getElementById('vfcScreenshot').value = ''; 
        
        vfcModal.style.display = 'flex';
    }
}

// Setup VFC Modal Listeners
document.addEventListener('DOMContentLoaded', () => {
    // If we are on the orders page, display them
    if (document.getElementById('ordersList')) {
        displayOrders();
    }

    const cancelVfc = document.getElementById('cancelVfc');
    const confirmVfc = document.getElementById('confirmVfc');
    const vfcModal = document.getElementById('vfcModal');

    if (cancelVfc) {
        cancelVfc.addEventListener('click', () => vfcModal.style.display = 'none');
    }

    if (confirmVfc) {
        confirmVfc.addEventListener('click', async () => {
            const screenshotInput = document.getElementById('vfcScreenshot');
            
            // Validate that the user actually selected a file
            if (!screenshotInput.files || screenshotInput.files.length === 0) {
                showToast("Please upload a screenshot of your transaction.", "error");
                return;
            }

            const orders = JSON.parse(localStorage.getItem('orders')) || [];
            const order = orders[currentPaymentIndex];
            const userEmail = localStorage.getItem('userEmail');
            const userName = localStorage.getItem('userName');

            vfcModal.style.display = 'none';
            showToast("Verifying your transaction...", "success");

            try {
                // Send request to Python backend (You could theoretically pass the image file here via FormData)
                const response = await fetch(`${API_BASE_URL}/pay-vodafone`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: userEmail, 
                        name: userName,
                        order: order,
                        phone: "0105582272" // Using your set number
                    })
                });

                if (response.ok) {
                    orders[currentPaymentIndex].status = 'Paid';
                    localStorage.setItem('orders', JSON.stringify(orders));
                    displayOrders(); // Refresh the list
                    showToast("Payment successful! Receipt sent to your email.", "success");
                } else {
                    showToast("Payment failed. Please try again.", "error");
                }
            } catch (error) {
                // Fallback if backend is not running
                orders[currentPaymentIndex].status = 'Paid';
                localStorage.setItem('orders', JSON.stringify(orders));
                displayOrders();
                showToast("Paid! (Note: Server offline, email not sent)", "success");
            }
        });
    }
});