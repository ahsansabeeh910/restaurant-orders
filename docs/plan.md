# Plan

- **How did you break the work into sessions?**
  I broke the work into two major sessions. 
  1. **Session 1 (Backend & DB):** Focus on the Prisma schema, Express endpoints, JWT auth, and the complex state machine rules for the order lifecycle. This had to come first since the frontend relies heavily on server-side validations.
  2. **Session 2 (Frontend & Integration):** Scaffolding the React app, building the UI components (Tailwind), integrating with the API, and building the dashboard charts.

- **What order did you build in, and why that order?**
  1. Database Schema (Prisma) -> The foundation of the app.
  2. Core API (Menu & Orders) -> Needed to enforce the rules from Goal 4.
  3. Frontend skeleton & Auth -> To allow testing roles (Manager vs. Waiter).
  4. Frontend UI pages -> Hooking up the React views to the endpoints.
  5. **Stretch Goal:** Kitchen Display Screen (KDS) & WebSockets -> Built last as a progressive enhancement.
  I built in this order because building UI without a working API usually leads to rewriting state logic once the real API is hooked up. Adding WebSockets last ensured the core REST architecture was sound first.

- **What did you estimate versus what it actually took?**
  I estimated about 12 hours total for the core requirements. Setting up the DB schema and backend endpoints took roughly 5 hours. The frontend UI took about 5 hours. The final 2 hours were spent on Dashboard charts and alerts. I spent an additional 1-2 hours implementing the KDS stretch goal with WebSockets.

- **What did you cut when you ran short?**
  I explicitly cut the split-check and inventory tracking stretch goals to ensure the core requirements—and the real-time KDS board—were rock solid and bug-free.
