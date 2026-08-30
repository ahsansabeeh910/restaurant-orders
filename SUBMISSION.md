# Submission

## Links

- **GitHub repository:** [TO BE FILLED BY USER]
- **Live application:** [TO BE FILLED BY USER]

## Notes for the reviewer

The backend is hosted on Render's free tier. **It spins down after 15 minutes of inactivity.** Please allow up to 60 seconds for the very first API request (like logging in) to respond while the server wakes up. 

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | manager@restaurant.com | password123 |
| Waiter | waiter1@restaurant.com | password123 |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React 18, Vite, Tailwind CSS | Fast compilation, simple component styling, responsive out of the box. |
| Backend | Node.js, Express, Socket.io | Standard, fast to build REST APIs, with WebSockets for real-time kitchen updates. |
| Database | PostgreSQL (Prisma ORM) | Relational integrity for orders/history, excellent type-safety with Prisma. |
| Hosting | Supabase (DB), Render (API), Vercel (UI) | Best-in-class free tiers for a decoupled full-stack architecture. |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Server-side role middleware guards endpoints. (Added KITCHEN role). |
| 2 | Orders | Done | Archived orders filtered out of main view. |
| 3 | Order lines | Done | Server snapshots price at insertion time. |
| 4 | Order lifecycle with rules | Done | Strict state machine on the backend rejects invalid moves. |
| 5 | Collaborators | Done | Waiters can see orders where they are primary or a collaborator. |
| 6 | Finding orders | Done | Server-side search, filter, sort, and pagination. |
| 7 | Acting on many menu items at once | Done | Bulk endpoint returns per-item success/failure. CSV export included. |
| 8 | A dashboard | Done | Stats, status breakdown, and a 14-day Recharts bar chart. |
| 9 | History you cannot rewrite | Done | Dedicated `order_history` table; UI renders it as a timeline. |
| 10| Slow-order alerts | Done | Node.js `setInterval` polls DB for slow orders, handles reappearance. |
| 11| **STRETCH: Kitchen Display** | **Done** | Real-time Kanban board for the kitchen using WebSockets (`socket.io`). |

## How much time did you actually spend?
Roughly 13 hours (including the stretch goal implementation).

## What would you do next, with another 12 hours?
Since I already built the Kitchen Display Screen (KDS) stretch goal, I would focus next on **Split Checks** and **Ingredient-level Inventory Tracking**. I would also add proper Dockerization for easier local onboarding.

## What are you least happy with in this codebase, and why?
The slow-order alert mechanism uses `setInterval` running in memory on the Express server. While this works perfectly for a single-instance free-tier deployment, it does not scale horizontally. If we deployed 3 instances of the backend, the checker would run 3 times. I would prefer to move this to a proper background job queue like BullMQ backed by Redis, or trigger it via an external cron service (like GitHub Actions or Vercel Cron).
