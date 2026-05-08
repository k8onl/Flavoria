from flask import Flask, request, jsonify
from flask_cors import CORS
import csv
import os
import json
import uuid


app = Flask(__name__)
CORS(app)

# 1. Get the absolute path of the folder where server.py currently lives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_DIR = os.path.join(BASE_DIR, 'database')

# 2. Lock the CSV file paths to that specific database folder
USERS_FILE = os.path.join(DATABASE_DIR, 'users.csv')
FAV_FILE = os.path.join(DATABASE_DIR, 'favorites.csv')
ORDERS_FILE = os.path.join(DATABASE_DIR, 'orders.csv')
CART_FILE = os.path.join(DATABASE_DIR, 'cart.csv')

# Initialize the "Excel" CSV databases
def init_csv():
    # 3. Create the folder using the locked path
    os.makedirs(DATABASE_DIR, exist_ok=True)
    
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, mode='w', newline='', encoding='utf-8') as file:
            csv.writer(file).writerow(['name', 'email', 'password'])
            
    if not os.path.exists(FAV_FILE):
        with open(FAV_FILE, mode='w', newline='', encoding='utf-8') as file:
            csv.writer(file).writerow(['email', 'food_ids'])
            
    if not os.path.exists(ORDERS_FILE):
        with open(ORDERS_FILE, mode='w', newline='', encoding='utf-8') as file:
            csv.writer(file).writerow(['order_id', 'email', 'items_json', 'total', 'status', 'timestamp'])
            
    if not os.path.exists(CART_FILE):
        with open(CART_FILE, mode='w', newline='', encoding='utf-8') as file:
            csv.writer(file).writerow(['email', 'cart_json'])
init_csv()

# --- REGISTER ENDPOINT ---
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({'error': 'Missing data'}), 400

    with open(USERS_FILE, mode='r', encoding='utf-8') as file:
        for row in csv.DictReader(file):
            if row['email'] == email:
                return jsonify({'error': 'Email is already registered.'}), 400

    with open(USERS_FILE, mode='a', newline='', encoding='utf-8') as file:
        csv.writer(file).writerow([name, email, password])

    return jsonify({'message': 'Registration successful!'}), 201


# --- LOGIN ENDPOINT (Pulls Orders & Favorites from DB) ---
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'missing_info', 'message': 'Please fill in all fields.'}), 400

    user_found = False
    user_name = ""

    # 1. Authenticate User
    with open(USERS_FILE, mode='r', encoding='utf-8') as file:
        for row in csv.DictReader(file):
            if row['email'] == email:
                user_found = True
                if row['password'] == password:
                    user_name = row['name']
                    break
                else:
                    return jsonify({'error': 'wrong_password', 'message': 'Incorrect password.'}), 401

    if not user_found:
        return jsonify({'error': 'not_found', 'message': 'Account not found. Please register first.'}), 404

    # 2. Fetch User's Favorites from Excel
    favs = []
    with open(FAV_FILE, mode='r', encoding='utf-8') as file:
        for row in csv.DictReader(file):
            if row['email'] == email:
                favs = json.loads(row['food_ids'])
                break
                
    # 3. Fetch User's Orders from Excel
    orders = []
    with open(ORDERS_FILE, mode='r', encoding='utf-8') as file:
        for row in csv.DictReader(file):
            if row['email'] == email:
                orders.append({
                    'id': row['order_id'],
                    'items': json.loads(row['items_json']),
                    'total': float(row['total']),
                    'status': row['status'],
                    'timestamp': row['timestamp']
                })

    # 4. Fetch User's Cart from Excel
    cart_items = []
    with open(CART_FILE, mode='r', encoding='utf-8') as file:
        for row in csv.DictReader(file):
            if row['email'] == email:
                cart_items = json.loads(row['cart_json'])
                break

    return jsonify({
        'message': 'Login successful!',
        'user': {'name': user_name, 'email': email},
        'favorites': favs,
        'orders': orders,
        'cart': cart_items # <--- Add the cart to the response here
    }), 200


# --- SYNC CART ENDPOINT ---
@app.route('/update-cart', methods=['POST'])
def update_cart():
    data = request.get_json()
    email = data.get('email')
    cart_data = data.get('cart', [])
    
    rows = []
    found = False
    with open(CART_FILE, 'r', encoding='utf-8') as file:
        rows = list(csv.DictReader(file))
        
    for r in rows:
        if r['email'] == email:
            r['cart_json'] = json.dumps(cart_data)
            found = True
            break
            
    if not found:
        rows.append({'email': email, 'cart_json': json.dumps(cart_data)})
        
    with open(CART_FILE, 'w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=['email', 'cart_json'])
        writer.writeheader()
        writer.writerows(rows)
        
    return jsonify({'message': 'Cart saved to database'})

# --- SYNC FAVORITES ENDPOINT ---
@app.route('/update-favorites', methods=['POST'])
def update_favorites():
    data = request.get_json()
    email = data.get('email')
    favs = data.get('favorites', [])
    
    rows = []
    found = False
    with open(FAV_FILE, 'r', encoding='utf-8') as file:
        rows = list(csv.DictReader(file))
        
    for r in rows:
        if r['email'] == email:
            r['food_ids'] = json.dumps(favs)
            found = True
            break
            
    if not found:
        rows.append({'email': email, 'food_ids': json.dumps(favs)})
        
    with open(FAV_FILE, 'w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=['email', 'food_ids'])
        writer.writeheader()
        writer.writerows(rows)
        
    return jsonify({'message': 'Favorites saved to database'})


# --- SYNC NEW ORDER ENDPOINT ---
@app.route('/add-order', methods=['POST'])
def add_order():
    data = request.get_json()
    email = data.get('email')
    order = data.get('order')
    order_id = str(uuid.uuid4())[:8] # Generate a unique ID
    
    with open(ORDERS_FILE, 'a', newline='', encoding='utf-8') as file:
        csv.writer(file).writerow([
            order_id, 
            email, 
            json.dumps(order['items']), 
            order['total'], 
            order.get('status', 'Pending'), 
            order['timestamp']
        ])
    return jsonify({'message': 'Order saved to database'})


# --- VODAFONE CASH PAYMENT & EMAIL ENDPOINT ---
@app.route('/pay-vodafone', methods=['POST'])
def pay_vodafone():
    data = request.get_json()
    user_email = data.get('email')
    user_name = data.get('name')
    phone = data.get('phone')
    order = data.get('order')

    if not user_email or not order:
        return jsonify({'error': 'Missing order details'}), 400
        
    timestamp = order.get('timestamp')
    
    # Update Order Status in Excel
    rows = []
    with open(ORDERS_FILE, 'r', encoding='utf-8') as file:
        rows = list(csv.DictReader(file))
        
    for r in rows:
        if r['email'] == user_email and r['timestamp'] == timestamp:
            r['status'] = 'Paid'
            
    with open(ORDERS_FILE, 'w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=['order_id', 'email', 'items_json', 'total', 'status', 'timestamp'])
        writer.writeheader()
        writer.writerows(rows)

    # SIMULATE SENDING EMAIL 
    print("\n" + "="*50)
    print(f"📧 SENDING EMAIL TO: {user_email}")
    print("="*50)
    print(f"Subject: Your Flavoria Receipt - Payment Successful!\n")
    print(f"Hi {user_name},\n")
    print(f"Thank you for your order! We received your payment of ${order['total']} via Vodafone Cash (from number: {phone}).\n")
    print("ORDER DETAILS:")
    for item in order['items']:
        print(f"- {item['quantity']}x {item['name']} ({item['size']})")
    print(f"\nTotal Paid: ${order['total']}")
    print("\nWe are preparing your food now and it will be out for delivery soon.")
    print("="*50 + "\n")

    return jsonify({'message': 'Payment successful, receipt emailed!'}), 200

if __name__ == '__main__':
    # host='0.0.0.0' allows the Docker container to receive outside traffic
    app.run(host='0.0.0.0', port=5000)