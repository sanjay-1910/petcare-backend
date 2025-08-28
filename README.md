# 🐾 PetCare — Backend

The backend of the **PetCare web application**, responsible for handling user data, vaccination schedules, veterinarian details, chatbot responses, and disease prediction logic.  
It connects the frontend to a secure **AWS RDS MySQL database** and provides APIs for all major features.

---

## ✨ Features

- 🔐 **Authentication & Profile Management**
  - User registration, login, and profile management APIs.
  - Secure password storage and validation.

- 💉 **Vaccination Scheduling**
  - APIs to fetch vaccines by pet type.
  - Store and retrieve scheduled vaccination dates in the database.

- 🏥 **Veterinarian Search**
  - Fetch veterinarians based on location.
  - Provide hospital details (doctor’s name, working hours, address, google map link).

- 🤖 **Chatbot**
  - Backend support for chatbot queries.
  - Provides basic responses to common pet care questions.

- 🩺 **Disease Prediction**
  - Simple logic/ML model integration to predict possible diseases based on symptoms.

---

## 🛠 Tech Stack

- **Node.js** – Server runtime  
- **Express.js** – REST API framework  
- **MySQL** (hosted on **AWS RDS**) – Database for storing user, vaccine, and veterinarian data  
- **Sequelize / MySQL2** – Database ORM/connector (if used)  
- **AWS** – Cloud infrastructure (EC2 for hosting backend, RDS for database)  

---

   git clone https://github.com/your-username/petcare-backend.git
   cd petcare-backend
