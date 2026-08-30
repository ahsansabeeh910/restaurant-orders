# Architecture

- **What are the moving pieces, and how do they talk to each other?**
  The system consists of a React 18 single-page application (frontend), an Express.js REST API (backend), and a PostgreSQL database. The frontend communicates with the backend via HTTP JSON requests, authenticated using stateless JWTs sent in the `Authorization` header. The backend interacts with the PostgreSQL database using Prisma ORM.

- **Where does each piece run?**
  - **Frontend:** Built with Vite and intended to run on a static host like Vercel.
  - **Backend:** Node.js Express server intended to run on Render or a similar platform.
  - **Database:** Hosted on Supabase (PostgreSQL), accessed via a connection pooler.

- **What is the request path for one representative user action, end to end?**
  *Action: Waiter changes order status to ACCEPTED.*
  1. User clicks "Accept" on the React UI.
  2. Axios sends a `PATCH /api/orders/:id/status` request with the JWT token.
  3. Express receives the request. The auth middleware validates the JWT.
  4. The service layer executes a Prisma update to change the status and log the history.
  5. The backend emits an `order_updated` event via **Socket.io** to the `kitchen_display` room.
  6. The HTTP response returns to the Waiter, updating their UI.
  7. Instantly, the Kitchen Display Screen (React component) receives the WebSocket event and moves the order card into the "Accepted" Kanban column without a page refresh.

- **What did you decide *not* to build, and why?**
  I decided *not* to build split checks or ingredient-level inventory tracking. While both are great stretch goals, the Kitchen Display Screen (KDS) provided the most immediate value for solving the "lost paper tickets" problem mentioned in the prompt. I focused on making the core state machine and real-time WebSocket sync flawless rather than expanding the scope to billing.
