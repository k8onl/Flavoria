# 🍔 Flavoria - Food Ordering Web App

A responsive, full-stack food delivery platform featuring user authentication, cart management, and order tracking. The application is fully containerized using Docker and deployed on an AWS EC2 instance.

## 🚀 Tech Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend:** Python, Flask, Flask-CORS
* **Database:** Local CSV file system (Users, Favorites, Cart, Orders)
* **Deployment & DevOps:** Docker, Docker Compose, AWS EC2 (Ubuntu)

## ✨ Key Features
* **User Authentication:** Secure login and registration system.
* **Dynamic Menu & Cart:** Filter categories, customize items (size, extras, drinks), and calculate real-time totals.
* **Order Management:** Save favorite meals, track past orders, and generate downloadable order receipts (TXT/PDF).
* **Payment Integration Flow:** Includes a mock Vodafone Cash payment verification system with receipt uploads.

## 🛠️ Folder Structure
```text
food-order-web-main/
├── docker-compose.yml           # Master orchestrator
├── frontend/                    # Nginx container
│   ├── index.html, style.css, script.js...
│   └── Dockerfile               
└── backend/                     # Python Flask container
    ├── server.py                
    ├── requirements.txt         
    ├── database/                # Persistent CSV storage
    └── Dockerfile
