# How to Implement State Machines in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, State Machines, Type State, Design Patterns, Enums

Description: A practical guide to implementing type-safe state machines in Rust using enums and the typestate pattern.

---

State machines are everywhere in software - from parsing protocols to managing UI workflows to processing orders. The problem is that most implementations leave state validation to runtime, which means bugs slip through. Rust gives us something better: the ability to catch invalid state transitions at compile time.

This post walks through two approaches to implementing state machines in Rust. We will start with the straightforward enum-based approach, then level up to the typestate pattern that leverages Rust's type system for compile-time guarantees.

## Why State Machines Matter

Before diving into code, let's be clear about what we're solving. A state machine has:

- A finite set of states
- A set of transitions between states
- Rules about which transitions are valid from which states

The classic bug happens when code tries to perform an action that doesn't make sense for the current state - like shipping an order that hasn't been paid for, or closing an already-closed connection. Runtime checks catch these, but only when you hit that code path. Compile-time checks catch them before you ship.

## Approach 1: Enum-Based State Machines

The most intuitive approach uses Rust enums to represent states. Each variant is a state, and pattern matching handles transitions.

Here's an order processing example. Orders move through a predictable flow: created, paid, shipped, delivered - or cancelled at certain points.

```rust
// Define all possible states an order can be in.
// Each variant can carry data relevant to that state.
#[derive(Debug, Clone)]
enum OrderState {
    Created { items: Vec<String>, total: f64 },
    Paid { items: Vec<String>, total: f64, payment_id: String },
    Shipped { items: Vec<String>, tracking_number: String },
    Delivered { delivered_at: String },
    Cancelled { reason: String },
}

// The order struct wraps the state enum.
#[derive(Debug)]
struct Order {
    id: String,
    state: OrderState,
}
```

Now we implement transitions as methods. Each method consumes the current state and returns the new state, preventing use of stale state references.

```rust
impl Order {
    // Create a new order in the Created state.
    fn new(id: String, items: Vec<String>, total: f64) -> Self {
        Order {
            id,
            state: OrderState::Created { items, total },
        }
    }

    // Attempt to pay for the order.
    // Only valid when in Created state - returns Result to handle invalid transitions.
    fn pay(self, payment_id: String) -> Result<Self, &'static str> {
        match self.state {
            OrderState::Created { items, total } => Ok(Order {
                id: self.id,
                state: OrderState::Paid { items, total, payment_id },
            }),
            _ => Err("Can only pay for orders in Created state"),
        }
    }

    // Ship the order - only valid after payment.
    fn ship(self, tracking_number: String) -> Result<Self, &'static str> {
        match self.state {
            OrderState::Paid { items, .. } => Ok(Order {
                id: self.id,
                state: OrderState::Shipped { items, tracking_number },
            }),
            _ => Err("Can only ship paid orders"),
        }
    }

    // Mark as delivered - only valid after shipping.
    fn deliver(self, delivered_at: String) -> Result<Self, &'static str> {
        match self.state {
            OrderState::Shipped { .. } => Ok(Order {
                id: self.id,
                state: OrderState::Delivered { delivered_at },
            }),
            _ => Err("Can only deliver shipped orders"),
        }
    }

    // Cancel the order - only valid before shipping.
    fn cancel(self, reason: String) -> Result<Self, &'static str> {
        match self.state {
            OrderState::Created { .. } | OrderState::Paid { .. } => Ok(Order {
                id: self.id,
                state: OrderState::Cancelled { reason },
            }),
            _ => Err("Cannot cancel orders that have shipped"),
        }
    }
}
```

Using this looks clean and the ownership model prevents double-transitions:

```rust
fn main() {
    let order = Order::new(
        "ORD-001".to_string(),
        vec!["Widget".to_string(), "Gadget".to_string()],
        99.99
    );

    // Chain transitions - each consumes the previous state.
    let order = order.pay("PAY-123".to_string()).unwrap();
    let order = order.ship("TRACK-456".to_string()).unwrap();
    let order = order.deliver("2026-02-01".to_string()).unwrap();

    println!("Final state: {:?}", order);
}
```

This approach works well and is easy to understand. The downside? Invalid transitions are caught at runtime, not compile time. The `Result` types and error messages are fine for production, but wouldn't it be nice to make invalid states unrepresentable?

## Approach 2: The Typestate Pattern

The typestate pattern encodes state in the type itself using generics. This means the compiler rejects invalid transitions before your code ever runs.

The key insight is that instead of one `Order` type with a state field, we have `Order<Created>`, `Order<Paid>`, `Order<Shipped>` - distinct types at the compiler level.

First, define marker types for each state. These are zero-sized types that exist purely for the type system.

```rust
// Marker types for each state.
// PhantomData lets us use these types without runtime cost.
use std::marker::PhantomData;

// State markers - these carry no data, just type information.
struct Created;
struct Paid;
struct Shipped;
struct Delivered;
struct Cancelled;
```

Now define the order with a generic state parameter:

```rust
// The order is generic over its state.
// PhantomData tells the compiler we "use" the State type
// even though we don't store it directly.
struct Order<State> {
    id: String,
    items: Vec<String>,
    total: f64,
    // Additional fields that all states need
    _state: PhantomData<State>,
}

// State-specific data lives in separate wrapper types or
// is added via impl blocks for specific states.
struct PaidOrder<State> {
    order: Order<State>,
    payment_id: String,
}

struct ShippedOrder {
    id: String,
    items: Vec<String>,
    tracking_number: String,
}

struct DeliveredOrder {
    id: String,
    delivered_at: String,
}

struct CancelledOrder {
    id: String,
    reason: String,
}
```

Here's a cleaner approach that keeps everything in one struct but uses state-specific impl blocks:

```rust
use std::marker::PhantomData;

// State markers
struct Created;
struct Paid { payment_id: String }
struct Shipped { tracking_number: String }
struct Delivered { delivered_at: String }
struct Cancelled { reason: String }

// Generic order that carries state as a type parameter.
struct Order<S> {
    id: String,
    items: Vec<String>,
    total: f64,
    state_data: S,
}

// Implementation only available when Order is in Created state.
impl Order<Created> {
    fn new(id: String, items: Vec<String>, total: f64) -> Self {
        Order {
            id,
            items,
            total,
            state_data: Created,
        }
    }

    // Transition to Paid - consumes Order<Created>, returns Order<Paid>.
    // This method simply doesn't exist on Order<Paid> or Order<Shipped>.
    fn pay(self, payment_id: String) -> Order<Paid> {
        Order {
            id: self.id,
            items: self.items,
            total: self.total,
            state_data: Paid { payment_id },
        }
    }

    // Cancel is available from Created state.
    fn cancel(self, reason: String) -> Order<Cancelled> {
        Order {
            id: self.id,
            items: self.items,
            total: self.total,
            state_data: Cancelled { reason },
        }
    }
}

// Implementation only available when Order is in Paid state.
impl Order<Paid> {
    fn ship(self, tracking_number: String) -> Order<Shipped> {
        Order {
            id: self.id,
            items: self.items,
            total: self.total,
            state_data: Shipped { tracking_number },
        }
    }

    // Cancel is also available from Paid state.
    fn cancel(self, reason: String) -> Order<Cancelled> {
        Order {
            id: self.id,
            items: self.items,
            total: self.total,
            state_data: Cancelled { reason },
        }
    }

    fn payment_id(&self) -> &str {
        &self.state_data.payment_id
    }
}

// Implementation only available when Order is in Shipped state.
impl Order<Shipped> {
    fn deliver(self, delivered_at: String) -> Order<Delivered> {
        Order {
            id: self.id,
            items: self.items,
            total: self.total,
            state_data: Delivered { delivered_at },
        }
    }

    fn tracking_number(&self) -> &str {
        &self.state_data.tracking_number
    }
}
```

Now look what happens when you try an invalid transition:

```rust
fn main() {
    let order = Order::new(
        "ORD-001".to_string(),
        vec!["Widget".to_string()],
        49.99
    );

    // This works - Created -> Paid
    let paid_order = order.pay("PAY-123".to_string());

    // This works - Paid -> Shipped
    let shipped_order = paid_order.ship("TRACK-456".to_string());

    // This would NOT compile - ship() doesn't exist on Order<Created>
    // let bad = order.ship("TRACK-789".to_string());

    // This would NOT compile - pay() doesn't exist on Order<Shipped>
    // let also_bad = shipped_order.pay("PAY-456".to_string());
}
```

The compiler error for invalid transitions is clear and immediate. You literally cannot call methods that don't make sense for the current state because those methods don't exist on that type.

## Adding Shared Behavior with Traits

Both approaches benefit from traits for shared functionality. Define what operations are available in any state:

```rust
// Trait for operations available in all states.
trait OrderInfo {
    fn id(&self) -> &str;
    fn items(&self) -> &[String];
    fn total(&self) -> f64;
}

// Implement for our generic Order type.
impl<S> OrderInfo for Order<S> {
    fn id(&self) -> &str {
        &self.id
    }

    fn items(&self) -> &[String] {
        &self.items
    }

    fn total(&self) -> f64 {
        self.total
    }
}

// Trait for states that can be cancelled.
trait Cancellable {
    fn cancel(self, reason: String) -> Order<Cancelled>;
}

// Implement cancellation for both Created and Paid states.
impl Cancellable for Order<Created> {
    fn cancel(self, reason: String) -> Order<Cancelled> {
        Order {
            id: self.id,
            items: self.items,
            total: self.total,
            state_data: Cancelled { reason },
        }
    }
}

impl Cancellable for Order<Paid> {
    fn cancel(self, reason: String) -> Order<Cancelled> {
        Order {
            id: self.id,
            items: self.items,
            total: self.total,
            state_data: Cancelled { reason },
        }
    }
}
```

## Handling Events with the State Machine

Real applications often need to process events that may or may not trigger transitions. Here's a pattern that combines enums for events with typestate for the machine:

```rust
// Events that can occur in the order system.
enum OrderEvent {
    PaymentReceived { payment_id: String },
    ShipmentDispatched { tracking_number: String },
    DeliveryConfirmed { timestamp: String },
    CancellationRequested { reason: String },
}

// A wrapper that handles the "current state could be anything" problem.
// Useful when loading from a database or processing async events.
enum AnyOrder {
    Created(Order<Created>),
    Paid(Order<Paid>),
    Shipped(Order<Shipped>),
    Delivered(Order<Delivered>),
    Cancelled(Order<Cancelled>),
}

impl AnyOrder {
    // Process an event, returning the new state or an error.
    fn process_event(self, event: OrderEvent) -> Result<AnyOrder, String> {
        match (self, event) {
            (AnyOrder::Created(order), OrderEvent::PaymentReceived { payment_id }) => {
                Ok(AnyOrder::Paid(order.pay(payment_id)))
            }
            (AnyOrder::Created(order), OrderEvent::CancellationRequested { reason }) => {
                Ok(AnyOrder::Cancelled(order.cancel(reason)))
            }
            (AnyOrder::Paid(order), OrderEvent::ShipmentDispatched { tracking_number }) => {
                Ok(AnyOrder::Shipped(order.ship(tracking_number)))
            }
            (AnyOrder::Paid(order), OrderEvent::CancellationRequested { reason }) => {
                Ok(AnyOrder::Cancelled(order.cancel(reason)))
            }
            (AnyOrder::Shipped(order), OrderEvent::DeliveryConfirmed { timestamp }) => {
                Ok(AnyOrder::Delivered(order.deliver(timestamp)))
            }
            (state, event) => {
                Err(format!("Invalid event {:?} for current state", event))
            }
        }
    }
}
```

This gives you the best of both worlds: compile-time safety when you know the state statically, and runtime flexibility when you need to handle dynamic state from external sources.

## When to Use Which Approach

The enum-based approach makes sense when:

- You're prototyping and want simplicity
- States are truly dynamic (loaded from storage, received over network)
- You need to store mixed-state items in collections
- Team members are new to Rust's type system

The typestate pattern shines when:

- Invalid transitions are critical bugs (financial systems, safety-critical code)
- You want IDE autocomplete to only show valid operations
- The state flow is known at compile time
- You're building a library API that guides correct usage

In practice, many systems use both: typestate for the core logic, with an enum wrapper for persistence and external interfaces.

## Practical Considerations

A few things I've learned implementing these in production:

**Serialization gets tricky with typestate.** You can't directly serialize `Order<Paid>` because the type parameter isn't runtime data. The common solution is serializing to the enum representation and deserializing through it.

**Error messages from the typestate pattern are excellent.** When someone tries to call a method that doesn't exist on a type, Rust tells them exactly what type they have and what methods are available.

**Testing is easier with typestate.** Tests that accept `Order<Paid>` can only be called with orders in that state - no runtime assertions needed, the types enforce it.

**The enum approach has lower cognitive overhead.** New team members grasp it faster. The typestate pattern requires understanding PhantomData, generic impl blocks, and how Rust's type system works.

## Conclusion

Rust's type system lets you choose your tradeoffs. Enum-based state machines are simple and flexible with runtime checking. The typestate pattern pushes validation to compile time, making invalid states literally unrepresentable.

Start with enums when exploring a problem. Move to typestate when you've nailed down the state diagram and want the compiler to enforce it. Either way, you're getting safer state management than what most languages offer out of the box.

The code examples here are simplified - real systems need logging, metrics, async transitions, and error recovery. But the core patterns stay the same. Pick the one that matches your correctness requirements and team expertise.

---

*Monitor state transitions in your apps with [OneUptime](https://oneuptime.com) - track workflow completion and errors.*
