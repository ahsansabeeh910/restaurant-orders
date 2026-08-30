# AI prompts

## Creating the Prisma Schema

### Prompt
> "I need a Prisma schema for a restaurant order system. I need a User table with MANAGER and WAITER roles. A MenuItem table. An Order table that belongs to a primary waiter. An OrderLine table for items in the order. An OrderCollaborator join table to allow multiple waiters on an order. An OrderHistory table that tracks every state change and line addition immutably."

### What I got
I got a solid baseline schema, but the AI missed capturing the historical price of a menu item on the `OrderLine` table. It just linked the `menuItemId`.

### What I corrected
I manually added a `unitPrice` Decimal column to the `OrderLine` model. The project requirements state that the total must be "calculated by the server from the menu items' current prices at the time each line was added." If I didn't snapshot the price, a future menu price change would alter past receipts.

## Building the Order Lifecycle State Machine

### Prompt
> "Write a utility function in JavaScript that validates order state transitions. The valid flow is Placed -> Accepted -> Preparing -> Ready -> Served. It can be Cancelled only if it is Placed or Accepted."

### What I got
The AI provided a good dictionary mapping of valid states, but didn't account for the fact that an order cannot be transitioned once it reaches a terminal state (`SERVED` or `CANCELLED`).

### What I corrected
I added explicit guards to return descriptive error messages (e.g., "Cannot change status of an order that is SERVED. This order is closed.") as required by Goal 4 which states: "Any other move must be rejected by the server with a message explaining why."
