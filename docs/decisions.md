# Decisions

## Decision 1: Authentication State
- **Chose:** Stateless JWT (JSON Web Tokens) passed in the `Authorization: Bearer` header.
- **Rejected:** Session-based cookies (express-session).
- **Why:** Since the frontend and backend are intended to be deployed on separate domains (e.g., Vercel and Render), dealing with cross-origin cookie credentials and Safari's strict ITP (Intelligent Tracking Prevention) adds unnecessary friction. JWTs stored in `localStorage` are simpler for a 12-hour take-home project.

## Decision 2: Order Pricing History
- **Chose:** Snapshotting `unit_price` directly onto the `order_line` row at the moment the item is added to the order.
- **Rejected:** Dynamically calculating the order total by `JOIN`ing the current `menu_item` price.
- **Why:** Requirements explicitly stated that totals are calculated "from the menu items' current prices at the time each line was added." If a manager changes a price on Tuesday, Monday's receipts shouldn't change.

## Decision 3: Voiding vs. Deleting Lines
- **Chose:** Soft-deleting order lines by toggling an `is_void` boolean and requiring a `void_reason`.
- **Rejected:** Using a `DELETE` SQL statement.
- **Why:** The requirements dictate that "the order's original record stays intact". Keeping the row preserves the immutable history and allows management to run reports on *why* items are being voided.

## Decision 4: Alert Reappearance (Goal 10)
- **Chose:** Setting a `reappear_after` timestamp on the `alert` record when acknowledged, and using a NodeJS `setInterval` loop to reactivate it when the time passes.
- **Rejected:** Creating a complex background job queue (BullMQ/Redis) or DB triggers.
- **Why:** A simple in-memory polling loop is sufficient for a standalone backend in a take-home assignment context. It avoids introducing Redis as a dependency. 
- **Later reversed (Mental model):** I initially considered just calculating the time difference dynamically on the `GET /alerts` endpoint (e.g. `WHERE acknowledged_at < NOW() - 10 min`). However, I rejected this because the badge count in the navigation bar needed a single source of truth for "active" alerts, making a hard `isActive` toggle managed by a background worker much more reliable to query against.

## Decision 5: Order History Implementation
- **Chose:** A dedicated `order_history` relational table where every action explicitly inserts a new row.
- **Rejected:** Relying solely on `updated_at` timestamps or using a JSONB "event log" column on the order itself.
- **Why:** A dedicated table with typed columns (`old_value`, `new_value`, `action`) makes it trivial to render the "History you cannot rewrite" timeline (Goal 9) in the UI, and makes it highly queryable.

## Decision 6: Kitchen Display & WebSockets (Stretch Goal)
- **Chose:** Implemented a real-time Kitchen Display Screen (KDS) powered by `socket.io`.
- **Rejected:** Having the kitchen staff rely on HTTP polling or manual page refreshes.
- **Why:** The assignment explicitly called out "corkboards and paper tickets" as a major pain point. A real-time Kanban board that auto-updates when waiters accept orders represents a massive quality-of-life improvement for the business and demonstrates event-driven full-stack architecture.

## Decision 7: UI Redesign & Glassmorphism Theme
- **Chose:** A fully custom dark glassmorphism theme (`bg-[#0a0a0f]`, `backdrop-blur-xl`) with custom mobile-responsive tables and a heavily styled mockup-matching login page.
- **Rejected:** Sticking to default Tailwind `bg-white` and standard block components.
- **Why:** To make the application feel more like a premium, modern "RestaurantOS". A dark theme with frosted glass elements also performs well in low-light environments (like a dim restaurant floor or busy kitchen). Added extensive responsive breakpoints (horizontal scroll for tables, vertical stacking for Kanban columns, flex-wrapping headers) to ensure it works beautifully on tablets and phones out-of-the-box.
