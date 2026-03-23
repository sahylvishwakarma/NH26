# 💼 ExpenseFlow — Multi-Tier Corporate Procurement & Expense Approval Workflow

A full-stack web portal that digitizes and enforces corporate spending policies through automated rule-based routing, strict Role-Based Access Control (RBAC), and a complete audit trail.

---

## 🏗️ Tech Stack

| Layer      | Technology                     |
|------------|-------------------------------|
| Frontend   | React 18, Vite, React Router  |
| Backend    | Node.js, Express.js           |
| Database   | SQLite (via `knex` + `sqlite3`) |
| Auth       | JWT (JSON Web Tokens)         |
| File Upload| Multer                        |

---

## ✨ Key Features

### 1. Role-Based Access Control (RBAC)
Three distinct roles with separate dashboards and permissions:

| Role            | Can Do                                                      |
|-----------------|-------------------------------------------------------------|
| **Employee**    | Submit expense claims, upload receipts, track status        |
| **Manager**     | Review pending claims, approve or reject with comments      |
| **Finance Admin** | Final approval (2nd level), organization-wide overview   |

### 2. Rule-Based Routing Engine
The backend automatically routes every expense based on its dollar amount:

| Amount            | Approval Path                                               |
|-------------------|-------------------------------------------------------------|
| **< $100**        | ✅ Auto-approved instantly — no human review               |
| **$100 – $999.99**| 1-level review: Manager must approve                       |
| **≥ $1,000**      | 2-level review: Manager → Finance Admin                    |

### 3. Digital Claim Form
- Expense title, description, amount, category
- Receipt file upload (JPG, PNG, PDF — up to 5 MB)
- Live routing policy preview as the employee types the amount

### 4. Manager Review Dashboard
- Separate view of expenses awaiting the manager's action
- Approve with optional comment, or Reject (comment required)
- Download/view attached receipts

### 5. Finance Admin Dashboard
- Organization-wide stats: total, pending, approved, rejected amounts
- Spending breakdown by department
- Final approval queue for high-value ($1,000+) expenses

### 6. Audit Trail & Status Log
Every state change is logged with:
- Who performed the action (actor name, role)
- What happened (action description)
- When it happened (timestamp)
- Status transition (from → to)
- Any comments left by reviewers

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Backend Setup

```bash
cd backend
cp .env.example .env       # copy and optionally edit config
npm install
npm start                  # starts on http://localhost:5000
```

The SQLite database is created automatically on first run with 5 demo users.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:5173
```

---

## 🔑 Demo Accounts

All accounts use the password: **`password123`**

| Email                  | Role           | Department  |
|------------------------|----------------|-------------|
| `alice@company.com`    | Employee       | Engineering |
| `bob@company.com`      | Employee       | Marketing   |
| `carol@company.com`    | Manager        | Engineering |
| `dave@company.com`     | Manager        | Marketing   |
| `eve@company.com`      | Finance Admin  | Finance     |

---

## 🔄 Workflow Walkthrough

1. **Alice (Employee)** logs in and submits an expense:
   - `$50` travel → **auto-approved** immediately
   - `$300` software → routed to **Carol (Manager)** for review
   - `$2,500` equipment → routed to **Carol (Manager)** for Level 1, then **Eve (Finance Admin)** for Level 2

2. **Carol (Manager)** logs in, sees pending items in her dashboard, reviews receipts, and clicks **Approve** or **Reject with comment**.

3. **Eve (Finance Admin)** logs in, sees high-value items escalated after manager approval, gives final approval.

4. **Alice** can check her expense's audit trail at any point to see exactly where it stands in the chain.

---

## 📁 Project Structure

```
├── backend/
│   ├── server.js              # Express app entry point
│   ├── db/database.js         # SQLite schema + seeding
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   └── rbac.js            # Role enforcement
│   ├── routes/
│   │   ├── auth.js            # Login / Register
│   │   ├── expenses.js        # Expense CRUD + approve/reject
│   │   └── users.js           # User management
│   └── services/
│       └── routingEngine.js   # Rule-based routing logic
└── frontend/
    └── src/
        ├── api/client.js      # Axios + auth interceptors
        ├── context/AuthContext.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── EmployeeDashboard.jsx
        │   ├── ManagerDashboard.jsx
        │   └── AdminDashboard.jsx
        └── components/
            ├── Navbar.jsx
            ├── ExpenseForm.jsx
            ├── ExpenseCard.jsx
            ├── AuditTrail.jsx
            └── StatusBadge.jsx
```

---

## 🔐 Security

- Passwords hashed with **bcrypt** (12 salt rounds)
- Stateless authentication with **JWT** (8h expiry)
- RBAC enforced on **every API route**
- File upload restricted to images and PDFs, max 5 MB
- CORS configured to allow only the known frontend origin
