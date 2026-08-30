# Schema

- **Table by table: what columns and types does each one have?**
  - `users`: id (uuid), email (string, unique), password_hash (string), name (string), role (enum: MANAGER, WAITER, KITCHEN), created_at (timestamp).
  - `menu_items`: id (uuid), name (string), price (decimal 10,2), is_available (boolean), is_archived (boolean).
  - `orders`: id (uuid), table_number (int), status (enum), primary_waiter_id (uuid FK), is_archived (boolean), total (decimal 10,2), placed_at (timestamp).
  - `order_lines`: id (uuid), order_id (uuid FK), menu_item_id (uuid FK), quantity (int), special_instructions (text), unit_price (decimal 10,2), is_void (boolean), void_reason (text).
  - `order_collaborators`: order_id (FK), user_id (FK) — composite primary key.
  - `order_history`: id (uuid), order_id (FK), performed_by (FK), action (enum), old_value (text), new_value (text), details (text).
  - `alerts`: id (uuid), order_id (FK), acknowledged_by (FK), acknowledged_at (timestamp), reappear_after (timestamp), is_active (boolean).

- **Which relationships are one-to-many, and which are many-to-many?**
  - **One-to-many:** `users` to `orders` (primary waiter), `orders` to `order_lines`, `orders` to `order_history`, `menu_items` to `order_lines`.
  - **Many-to-many:** `users` to `orders` as collaborators (facilitated by the `order_collaborators` join table).

- **Which constraints are enforced by the database, and which by application code — and why did you draw the line there?**
  - **Database:** Foreign key referential integrity (an order line can't reference a non-existent item) and unique constraints (emails). 
  - **Application Code:** The state machine transitions (e.g., preventing a 'Preparing' order from being cancelled) and access control (waiters only seeing their own orders). 
  - *Why:* Pure structural integrity belongs in the DB so data can never be corrupted, even if manipulated directly. Complex business logic (state machines, role permissions) belongs in the application where it's easier to write tests, version control, and return readable error messages to the user.

- **What did you deliberately denormalise?**
  - `unit_price` on `order_lines`: Prices are copied from `menu_items` at the time of creation. This is critical so that historical orders don't magically change totals when a manager updates a menu price.
  - `total` on `orders`: It is a cached sum of the non-voided order lines. This speeds up dashboard queries and the main order list query, preventing the need to aggregate lines on every request.

- **What would break first if this had 100x the data?**
  The `GET /api/orders` endpoint. While it has pagination, the text search over `table_number` and sorting/filtering on large datasets would require proper database indexes (B-tree on `placed_at`, `status`, and `primary_waiter_id`). Also, the dashboard aggregation queries (calculating revenue/orders for the day) would lock up or timeout; they would need to be moved to materialized views or cached in a layer like Redis.
