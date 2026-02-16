# How to Build Type-Safe State Machines in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, State Machines, Design Patterns, Type Safety

Description: Create compile-time verified state machines in TypeScript using discriminated unions, exhaustive checking, and the XState library integration.

---

State machines are one of the most reliable patterns for managing complex application state. When combined with TypeScript's type system, you get compile-time guarantees that invalid state transitions cannot occur. This post walks through building type-safe state machines from scratch, then shows how to integrate with XState for production use.

## Why State Machines?

Traditional boolean flags lead to impossible states. Consider a data fetching component:

```typescript
// The boolean approach - prone to bugs
interface DataState {
  isLoading: boolean;
  isError: boolean;
  data: string | null;
  error: Error | null;
}

// This allows impossible combinations like:
// { isLoading: true, isError: true, data: "hello", error: new Error() }
```

State machines eliminate this entire class of bugs by making invalid states unrepresentable.

## Modeling States with Discriminated Unions

Discriminated unions are the foundation of type-safe state machines in TypeScript. Each state gets its own type with a literal `type` property that TypeScript uses to narrow the union.

Here is a basic pattern for representing mutually exclusive states:

```typescript
// Each state is a separate interface with a literal type discriminator
interface IdleState {
  type: "idle";
}

interface LoadingState {
  type: "loading";
  startedAt: number;
}

interface SuccessState {
  type: "success";
  data: string;
  loadedAt: number;
}

interface ErrorState {
  type: "error";
  error: Error;
  retryCount: number;
}

// The union of all possible states
type FetchState = IdleState | LoadingState | SuccessState | ErrorState;
```

Now TypeScript enforces that only valid combinations exist:

```typescript
// This compiles - valid state
const validState: FetchState = {
  type: "success",
  data: "Hello World",
  loadedAt: Date.now(),
};

// This fails at compile time - 'data' doesn't exist on LoadingState
const invalidState: FetchState = {
  type: "loading",
  startedAt: Date.now(),
  data: "oops", // Error: Object literal may only specify known properties
};
```

## Type Narrowing in Transition Functions

TypeScript's control flow analysis automatically narrows discriminated unions. This lets you write transition functions that are fully type-safe.

The following function handles state transitions based on the current state and an event:

```typescript
// Define events that can trigger transitions
type FetchEvent =
  | { type: "FETCH" }
  | { type: "SUCCESS"; data: string }
  | { type: "ERROR"; error: Error }
  | { type: "RETRY" }
  | { type: "RESET" };

// Transition function with full type safety
function transition(state: FetchState, event: FetchEvent): FetchState {
  switch (state.type) {
    case "idle": {
      // TypeScript knows state is IdleState here
      if (event.type === "FETCH") {
        return { type: "loading", startedAt: Date.now() };
      }
      return state;
    }

    case "loading": {
      // TypeScript knows state is LoadingState here
      // We can access state.startedAt safely
      if (event.type === "SUCCESS") {
        return {
          type: "success",
          data: event.data,
          loadedAt: Date.now(),
        };
      }
      if (event.type === "ERROR") {
        return {
          type: "error",
          error: event.error,
          retryCount: 0,
        };
      }
      return state;
    }

    case "success": {
      // TypeScript knows state is SuccessState here
      if (event.type === "RESET") {
        return { type: "idle" };
      }
      return state;
    }

    case "error": {
      // TypeScript knows state is ErrorState here
      // We can access state.retryCount safely
      if (event.type === "RETRY") {
        return { type: "loading", startedAt: Date.now() };
      }
      if (event.type === "RESET") {
        return { type: "idle" };
      }
      return state;
    }
  }
}
```

## Exhaustive Checking with the never Type

The `never` type ensures you handle all possible states. If you add a new state but forget to handle it, TypeScript will catch this at compile time.

This helper function throws an error if an unexpected state reaches it:

```typescript
// This function should never be called - it's just for type checking
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// Updated transition function with exhaustive checking
function transitionExhaustive(
  state: FetchState,
  event: FetchEvent
): FetchState {
  switch (state.type) {
    case "idle":
      if (event.type === "FETCH") {
        return { type: "loading", startedAt: Date.now() };
      }
      return state;

    case "loading":
      if (event.type === "SUCCESS") {
        return { type: "success", data: event.data, loadedAt: Date.now() };
      }
      if (event.type === "ERROR") {
        return { type: "error", error: event.error, retryCount: 0 };
      }
      return state;

    case "success":
      if (event.type === "RESET") {
        return { type: "idle" };
      }
      return state;

    case "error":
      if (event.type === "RETRY") {
        return { type: "loading", startedAt: Date.now() };
      }
      if (event.type === "RESET") {
        return { type: "idle" };
      }
      return state;

    default:
      // If you add a new state and forget to handle it,
      // TypeScript will error here because state won't be 'never'
      return assertNever(state);
  }
}
```

Now watch what happens when you add a new state:

```typescript
// Add a new state to the union
interface CancelledState {
  type: "cancelled";
  cancelledAt: number;
}

type FetchStateV2 =
  | IdleState
  | LoadingState
  | SuccessState
  | ErrorState
  | CancelledState;

// The assertNever call will now show a compile error:
// Argument of type 'CancelledState' is not assignable to parameter of type 'never'
```

## Practical Example: Order State Machine

Let's build a real-world order processing state machine. This demonstrates how state machines handle complex business logic.

First, define all the possible states an order can be in:

```typescript
// Order states with their associated data
interface OrderDraft {
  type: "draft";
  items: OrderItem[];
  createdAt: Date;
}

interface OrderPendingPayment {
  type: "pending_payment";
  items: OrderItem[];
  total: number;
  paymentDeadline: Date;
}

interface OrderPaid {
  type: "paid";
  items: OrderItem[];
  total: number;
  paidAt: Date;
  transactionId: string;
}

interface OrderShipped {
  type: "shipped";
  items: OrderItem[];
  total: number;
  trackingNumber: string;
  shippedAt: Date;
  estimatedDelivery: Date;
}

interface OrderDelivered {
  type: "delivered";
  items: OrderItem[];
  total: number;
  deliveredAt: Date;
  signature: string;
}

interface OrderCancelled {
  type: "cancelled";
  reason: string;
  cancelledAt: Date;
  refundAmount?: number;
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

type OrderState =
  | OrderDraft
  | OrderPendingPayment
  | OrderPaid
  | OrderShipped
  | OrderDelivered
  | OrderCancelled;
```

Next, define the events that can occur:

```typescript
// Events that can trigger order state transitions
type OrderEvent =
  | { type: "SUBMIT"; paymentDeadline: Date }
  | { type: "PAY"; transactionId: string }
  | { type: "PAYMENT_FAILED"; reason: string }
  | { type: "SHIP"; trackingNumber: string; estimatedDelivery: Date }
  | { type: "DELIVER"; signature: string }
  | { type: "CANCEL"; reason: string }
  | { type: "ADD_ITEM"; item: OrderItem }
  | { type: "REMOVE_ITEM"; productId: string };
```

Now implement the transition function with all business rules:

```typescript
function orderTransition(state: OrderState, event: OrderEvent): OrderState {
  switch (state.type) {
    case "draft": {
      switch (event.type) {
        case "ADD_ITEM":
          return {
            ...state,
            items: [...state.items, event.item],
          };

        case "REMOVE_ITEM":
          return {
            ...state,
            items: state.items.filter((i) => i.productId !== event.productId),
          };

        case "SUBMIT":
          if (state.items.length === 0) {
            // Cannot submit empty order - return unchanged
            return state;
          }
          const total = state.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          return {
            type: "pending_payment",
            items: state.items,
            total,
            paymentDeadline: event.paymentDeadline,
          };

        case "CANCEL":
          return {
            type: "cancelled",
            reason: event.reason,
            cancelledAt: new Date(),
          };

        default:
          return state;
      }
    }

    case "pending_payment": {
      switch (event.type) {
        case "PAY":
          return {
            type: "paid",
            items: state.items,
            total: state.total,
            paidAt: new Date(),
            transactionId: event.transactionId,
          };

        case "PAYMENT_FAILED":
        case "CANCEL":
          return {
            type: "cancelled",
            reason: event.type === "CANCEL" ? event.reason : "Payment failed",
            cancelledAt: new Date(),
          };

        default:
          return state;
      }
    }

    case "paid": {
      switch (event.type) {
        case "SHIP":
          return {
            type: "shipped",
            items: state.items,
            total: state.total,
            trackingNumber: event.trackingNumber,
            shippedAt: new Date(),
            estimatedDelivery: event.estimatedDelivery,
          };

        case "CANCEL":
          return {
            type: "cancelled",
            reason: event.reason,
            cancelledAt: new Date(),
            refundAmount: state.total,
          };

        default:
          return state;
      }
    }

    case "shipped": {
      switch (event.type) {
        case "DELIVER":
          return {
            type: "delivered",
            items: state.items,
            total: state.total,
            deliveredAt: new Date(),
            signature: event.signature,
          };

        default:
          return state;
      }
    }

    case "delivered":
    case "cancelled":
      // Terminal states - no transitions allowed
      return state;

    default:
      return assertNever(state);
  }
}
```

Here is how you would use this state machine:

```typescript
// Create a new order
let order: OrderState = {
  type: "draft",
  items: [],
  createdAt: new Date(),
};

// Add items
order = orderTransition(order, {
  type: "ADD_ITEM",
  item: { productId: "SKU-001", quantity: 2, price: 29.99 },
});

order = orderTransition(order, {
  type: "ADD_ITEM",
  item: { productId: "SKU-002", quantity: 1, price: 49.99 },
});

// Submit for payment
order = orderTransition(order, {
  type: "SUBMIT",
  paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
});

// Process payment
if (order.type === "pending_payment") {
  order = orderTransition(order, {
    type: "PAY",
    transactionId: "TXN-123456",
  });
}

// TypeScript knows the possible states after each transition
console.log(order);
```

## Practical Example: Authentication Flow

Authentication is another common use case for state machines. This example shows login, logout, and session refresh flows.

Define the authentication states:

```typescript
interface AuthUnauthenticated {
  type: "unauthenticated";
}

interface AuthAuthenticating {
  type: "authenticating";
  method: "password" | "oauth" | "magic_link";
  attemptedAt: Date;
}

interface AuthAuthenticated {
  type: "authenticated";
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface AuthRefreshing {
  type: "refreshing";
  user: User;
  refreshToken: string;
}

interface AuthError {
  type: "auth_error";
  error: string;
  failedAttempts: number;
  lockedUntil?: Date;
}

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

type AuthState =
  | AuthUnauthenticated
  | AuthAuthenticating
  | AuthAuthenticated
  | AuthRefreshing
  | AuthError;
```

Define authentication events:

```typescript
type AuthEvent =
  | { type: "LOGIN_START"; method: "password" | "oauth" | "magic_link" }
  | { type: "LOGIN_SUCCESS"; user: User; accessToken: string; refreshToken: string; expiresAt: Date }
  | { type: "LOGIN_FAILURE"; error: string }
  | { type: "LOGOUT" }
  | { type: "TOKEN_EXPIRED" }
  | { type: "REFRESH_START" }
  | { type: "REFRESH_SUCCESS"; accessToken: string; expiresAt: Date }
  | { type: "REFRESH_FAILURE"; error: string }
  | { type: "CLEAR_ERROR" };
```

Implement the authentication state machine:

```typescript
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function authTransition(state: AuthState, event: AuthEvent): AuthState {
  switch (state.type) {
    case "unauthenticated": {
      if (event.type === "LOGIN_START") {
        return {
          type: "authenticating",
          method: event.method,
          attemptedAt: new Date(),
        };
      }
      return state;
    }

    case "authenticating": {
      switch (event.type) {
        case "LOGIN_SUCCESS":
          return {
            type: "authenticated",
            user: event.user,
            accessToken: event.accessToken,
            refreshToken: event.refreshToken,
            expiresAt: event.expiresAt,
          };

        case "LOGIN_FAILURE":
          return {
            type: "auth_error",
            error: event.error,
            failedAttempts: 1,
          };

        default:
          return state;
      }
    }

    case "authenticated": {
      switch (event.type) {
        case "LOGOUT":
          return { type: "unauthenticated" };

        case "TOKEN_EXPIRED":
        case "REFRESH_START":
          return {
            type: "refreshing",
            user: state.user,
            refreshToken: state.refreshToken,
          };

        default:
          return state;
      }
    }

    case "refreshing": {
      switch (event.type) {
        case "REFRESH_SUCCESS":
          return {
            type: "authenticated",
            user: state.user,
            accessToken: event.accessToken,
            refreshToken: state.refreshToken,
            expiresAt: event.expiresAt,
          };

        case "REFRESH_FAILURE":
          // Refresh failed - user must log in again
          return { type: "unauthenticated" };

        default:
          return state;
      }
    }

    case "auth_error": {
      switch (event.type) {
        case "CLEAR_ERROR":
        case "LOGOUT":
          return { type: "unauthenticated" };

        case "LOGIN_START":
          // Check if account is locked
          if (
            state.lockedUntil &&
            new Date() < state.lockedUntil
          ) {
            return state; // Still locked
          }
          return {
            type: "authenticating",
            method: event.method,
            attemptedAt: new Date(),
          };

        case "LOGIN_FAILURE":
          const newAttempts = state.failedAttempts + 1;
          return {
            type: "auth_error",
            error: event.error,
            failedAttempts: newAttempts,
            lockedUntil:
              newAttempts >= MAX_LOGIN_ATTEMPTS
                ? new Date(Date.now() + LOCKOUT_DURATION_MS)
                : undefined,
          };

        default:
          return state;
      }
    }

    default:
      return assertNever(state);
  }
}
```

## Creating a State Machine Class

Wrapping the transition logic in a class provides a cleaner API and enables features like event subscriptions.

```typescript
type Listener<St> = (state: St) => void;

class StateMachine<State, Event> {
  private state: State;
  private listeners: Set<Listener<State>> = new Set();

  constructor(
    initialState: State,
    private transitionFn: (state: State, event: Event) => State
  ) {
    this.state = initialState;
  }

  getState(): State {
    return this.state;
  }

  send(event: Event): void {
    const previousState = this.state;
    this.state = this.transitionFn(this.state, event);

    // Only notify if state actually changed
    if (this.state !== previousState) {
      this.listeners.forEach((listener) => listener(this.state));
    }
  }

  subscribe(listener: Listener<State>): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  // Type-safe state matching
  matches<T extends State["type"]>(
    type: T
  ): this is StateMachine<Extract<State, { type: T }>, Event> {
    return (this.state as { type: string }).type === type;
  }
}

// Usage example
const authMachine = new StateMachine<AuthState, AuthEvent>(
  { type: "unauthenticated" },
  authTransition
);

// Subscribe to state changes
const unsubscribe = authMachine.subscribe((state) => {
  console.log("Auth state changed:", state.type);
});

// Send events
authMachine.send({ type: "LOGIN_START", method: "password" });
authMachine.send({
  type: "LOGIN_SUCCESS",
  user: { id: "1", email: "user@example.com", name: "John", roles: ["user"] },
  accessToken: "abc123",
  refreshToken: "xyz789",
  expiresAt: new Date(Date.now() + 3600000),
});

// Clean up
unsubscribe();
```

## Comparison: Manual vs XState

Here is a comparison of building state machines manually versus using XState:

| Feature | Manual Implementation | XState |
|---------|----------------------|--------|
| Type Safety | Full control over types | Built-in TypeScript support |
| Bundle Size | Zero dependencies | ~15KB minified |
| Visualization | None | XState Visualizer tool |
| DevTools | Custom implementation | Chrome extension available |
| Hierarchical States | Manual implementation | Built-in support |
| Parallel States | Complex to implement | Built-in support |
| Guards | Manual if statements | Declarative configuration |
| Actions/Side Effects | Manual handling | Built-in action system |
| Learning Curve | Lower | Moderate |
| Testing | Standard unit tests | @xstate/test package |

## XState Integration Basics

XState is the industry standard library for state machines in JavaScript and TypeScript. Here is how to model the fetch example in XState:

```typescript
import { createMachine, assign } from "xstate";

// Define the context (extended state)
interface FetchContext {
  data: string | null;
  error: Error | null;
  retryCount: number;
}

// Define events with their payloads
type FetchMachineEvent =
  | { type: "FETCH" }
  | { type: "SUCCESS"; data: string }
  | { type: "ERROR"; error: Error }
  | { type: "RETRY" }
  | { type: "RESET" };

// Create the machine with full type safety
const fetchMachine = createMachine({
  id: "fetch",
  initial: "idle",
  types: {} as {
    context: FetchContext;
    events: FetchMachineEvent;
  },
  context: {
    data: null,
    error: null,
    retryCount: 0,
  },
  states: {
    idle: {
      on: {
        FETCH: { target: "loading" },
      },
    },
    loading: {
      on: {
        SUCCESS: {
          target: "success",
          actions: assign({
            data: ({ event }) => event.data,
            error: null,
          }),
        },
        ERROR: {
          target: "error",
          actions: assign({
            error: ({ event }) => event.error,
          }),
        },
      },
    },
    success: {
      on: {
        RESET: { target: "idle" },
      },
    },
    error: {
      on: {
        RETRY: {
          target: "loading",
          actions: assign({
            retryCount: ({ context }) => context.retryCount + 1,
          }),
        },
        RESET: {
          target: "idle",
          actions: assign({
            error: null,
            retryCount: 0,
          }),
        },
      },
    },
  },
});
```

Using the XState machine with the actor model:

```typescript
import { createActor } from "xstate";

// Create an actor from the machine
const fetchActor = createActor(fetchMachine);

// Subscribe to state changes
fetchActor.subscribe((snapshot) => {
  console.log("Current state:", snapshot.value);
  console.log("Context:", snapshot.context);
});

// Start the actor
fetchActor.start();

// Send events
fetchActor.send({ type: "FETCH" });

// Simulate async operation
setTimeout(() => {
  fetchActor.send({ type: "SUCCESS", data: "Loaded data!" });
}, 1000);
```

## XState with Guards and Actions

Guards are conditions that must be true for a transition to occur. Actions are side effects that run during transitions.

```typescript
import { createMachine, assign } from "xstate";

interface OrderContext {
  items: Array<{ id: string; quantity: number; price: number }>;
  total: number;
  paymentAttempts: number;
}

type OrderMachineEvent =
  | { type: "ADD_ITEM"; item: { id: string; quantity: number; price: number } }
  | { type: "SUBMIT" }
  | { type: "PAY" }
  | { type: "PAYMENT_FAILED" }
  | { type: "CANCEL" };

const orderMachine = createMachine({
  id: "order",
  initial: "draft",
  types: {} as {
    context: OrderContext;
    events: OrderMachineEvent;
  },
  context: {
    items: [],
    total: 0,
    paymentAttempts: 0,
  },
  states: {
    draft: {
      on: {
        ADD_ITEM: {
          actions: assign({
            items: ({ context, event }) => [...context.items, event.item],
            total: ({ context, event }) =>
              context.total + event.item.price * event.item.quantity,
          }),
        },
        SUBMIT: {
          target: "pending_payment",
          // Guard: only allow submit if there are items
          guard: ({ context }) => context.items.length > 0,
        },
        CANCEL: { target: "cancelled" },
      },
    },
    pending_payment: {
      on: {
        PAY: { target: "paid" },
        PAYMENT_FAILED: [
          {
            // Guard: allow retry if under 3 attempts
            guard: ({ context }) => context.paymentAttempts < 3,
            target: "pending_payment",
            actions: assign({
              paymentAttempts: ({ context }) => context.paymentAttempts + 1,
            }),
          },
          {
            // Otherwise cancel the order
            target: "cancelled",
          },
        ],
        CANCEL: { target: "cancelled" },
      },
    },
    paid: {
      type: "final",
    },
    cancelled: {
      type: "final",
    },
  },
});
```

## Testing State Machines

State machines are straightforward to test because they are pure functions (given the same state and event, they always produce the same result).

```typescript
import { describe, it, expect } from "vitest";

describe("orderTransition", () => {
  const initialDraft: OrderState = {
    type: "draft",
    items: [],
    createdAt: new Date(),
  };

  it("should add items to draft order", () => {
    const item = { productId: "SKU-001", quantity: 1, price: 10 };
    const result = orderTransition(initialDraft, { type: "ADD_ITEM", item });

    expect(result.type).toBe("draft");
    if (result.type === "draft") {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(item);
    }
  });

  it("should not submit empty order", () => {
    const result = orderTransition(initialDraft, {
      type: "SUBMIT",
      paymentDeadline: new Date(),
    });

    expect(result.type).toBe("draft");
  });

  it("should transition to pending_payment when submitted with items", () => {
    const withItems: OrderState = {
      ...initialDraft,
      items: [{ productId: "SKU-001", quantity: 2, price: 25 }],
    };

    const result = orderTransition(withItems, {
      type: "SUBMIT",
      paymentDeadline: new Date(),
    });

    expect(result.type).toBe("pending_payment");
    if (result.type === "pending_payment") {
      expect(result.total).toBe(50);
    }
  });

  it("should not allow shipping before payment", () => {
    const pendingPayment: OrderState = {
      type: "pending_payment",
      items: [{ productId: "SKU-001", quantity: 1, price: 10 }],
      total: 10,
      paymentDeadline: new Date(),
    };

    const result = orderTransition(pendingPayment, {
      type: "SHIP",
      trackingNumber: "TRACK-123",
      estimatedDelivery: new Date(),
    });

    // Should remain in pending_payment state
    expect(result.type).toBe("pending_payment");
  });

  it("should allow cancellation with refund after payment", () => {
    const paid: OrderState = {
      type: "paid",
      items: [{ productId: "SKU-001", quantity: 1, price: 100 }],
      total: 100,
      paidAt: new Date(),
      transactionId: "TXN-123",
    };

    const result = orderTransition(paid, {
      type: "CANCEL",
      reason: "Customer request",
    });

    expect(result.type).toBe("cancelled");
    if (result.type === "cancelled") {
      expect(result.refundAmount).toBe(100);
    }
  });
});
```

## Visualizing State Machines

One advantage of formal state machines is the ability to generate visual diagrams. XState provides an online visualizer at stately.ai/viz.

For manual state machines, you can generate Mermaid diagrams:

```typescript
function generateMermaidDiagram(
  transitions: Array<{
    from: string;
    to: string;
    event: string;
  }>
): string {
  const lines = ["stateDiagram-v2"];

  for (const t of transitions) {
    lines.push(`    ${t.from} --> ${t.to}: ${t.event}`);
  }

  return lines.join("\n");
}

// Generate diagram for fetch machine
const fetchTransitions = [
  { from: "idle", to: "loading", event: "FETCH" },
  { from: "loading", to: "success", event: "SUCCESS" },
  { from: "loading", to: "error", event: "ERROR" },
  { from: "success", to: "idle", event: "RESET" },
  { from: "error", to: "loading", event: "RETRY" },
  { from: "error", to: "idle", event: "RESET" },
];

console.log(generateMermaidDiagram(fetchTransitions));
```

Output:

```
stateDiagram-v2
    idle --> loading: FETCH
    loading --> success: SUCCESS
    loading --> error: ERROR
    success --> idle: RESET
    error --> loading: RETRY
    error --> idle: RESET
```

## Best Practices

1. **Keep states flat when possible.** Hierarchical states add complexity. Only use them when you have genuine parent-child relationships.

2. **Name states as nouns, events as verbs.** States describe what something is (idle, loading). Events describe what happened (FETCH, SUCCESS).

3. **Use context for extended state.** The state type (idle, loading) represents the finite state. Additional data like retry counts goes in context.

4. **Make invalid transitions impossible.** If an event should not be valid in a certain state, do not handle it in that state's transitions.

5. **Test transition boundaries.** Focus tests on what happens at state boundaries, not on the happy path alone.

6. **Document state diagrams.** Whether using XState's visualizer or Mermaid, maintain visual documentation of your state machines.

## Summary

Type-safe state machines in TypeScript provide:

- Compile-time prevention of invalid states
- Self-documenting code that maps directly to business requirements
- Easy testing through pure transition functions
- Clear visualization of system behavior

Start with manual discriminated unions for simple cases. Move to XState when you need features like hierarchical states, parallel regions, or built-in DevTools. Either way, TypeScript's type system ensures your state machines are correct before your code ever runs.
