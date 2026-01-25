# How to Build Event-Sourced Apps with CQRS in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Event Sourcing, CQRS, Architecture, Domain-Driven Design

Description: A practical guide to implementing event sourcing and CQRS patterns in Rust, with working code examples for aggregates, event stores, and read model projections.

---

Event sourcing flips traditional database design on its head. Instead of storing current state, you store a sequence of events that led to that state. Combined with CQRS (Command Query Responsibility Segregation), this pattern gives you an immutable audit log, temporal queries, and the ability to rebuild your entire system state from scratch. Rust's type system makes it particularly well-suited for these patterns - the compiler catches invalid state transitions before they reach production.

## Why Event Sourcing and CQRS?

Traditional CRUD applications overwrite data. You lose history. You cannot answer questions like "What did this account look like last Tuesday?" or "Who changed this value and when?"

Event sourcing stores every change as an immutable event. Your current state becomes a fold over all historical events. CQRS separates the write model (commands that produce events) from the read model (projections optimized for queries). This separation lets you optimize each side independently.

| Pattern | Benefit |
|---------|---------|
| **Event Sourcing** | Complete audit trail, temporal queries, replay capability |
| **CQRS** | Optimized read/write models, independent scaling |
| **Combined** | Event-driven architecture, eventual consistency, debugging superpowers |

## Defining Events and Commands

Start by defining your domain events. In Rust, enums with associated data work perfectly. Each variant represents something that happened in your system.

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Domain events represent facts that happened
// They are immutable and named in past tense
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BankAccountEvent {
    AccountOpened {
        account_id: Uuid,
        owner_name: String,
        opened_at: DateTime<Utc>,
    },
    MoneyDeposited {
        amount: u64,
        balance_after: u64,
        deposited_at: DateTime<Utc>,
    },
    MoneyWithdrawn {
        amount: u64,
        balance_after: u64,
        withdrawn_at: DateTime<Utc>,
    },
    AccountClosed {
        reason: String,
        closed_at: DateTime<Utc>,
    },
}

// Commands represent intentions - things the user wants to do
// They are named in imperative form
#[derive(Debug)]
pub enum BankAccountCommand {
    OpenAccount { owner_name: String },
    Deposit { amount: u64 },
    Withdraw { amount: u64 },
    CloseAccount { reason: String },
}

// Command errors with descriptive messages
#[derive(Debug, thiserror::Error)]
pub enum BankAccountError {
    #[error("Account is already closed")]
    AccountClosed,
    #[error("Insufficient funds: requested {requested}, available {available}")]
    InsufficientFunds { requested: u64, available: u64 },
    #[error("Cannot close account with non-zero balance: {balance}")]
    NonZeroBalance { balance: u64 },
    #[error("Account already exists")]
    AccountAlreadyExists,
}
```

## Building the Aggregate

The aggregate is where business logic lives. It processes commands, validates invariants, and produces events. Rust's ownership model guarantees that state changes only happen through the defined methods.

```rust
// The aggregate holds current state derived from events
// It enforces business rules and produces new events
#[derive(Debug, Default)]
pub struct BankAccount {
    id: Option<Uuid>,
    owner_name: String,
    balance: u64,
    is_closed: bool,
    version: u64,
}

impl BankAccount {
    // Rebuild state from event history
    // This is called when loading an aggregate from the event store
    pub fn apply(&mut self, event: &BankAccountEvent) {
        match event {
            BankAccountEvent::AccountOpened {
                account_id,
                owner_name,
                ..
            } => {
                self.id = Some(*account_id);
                self.owner_name = owner_name.clone();
            }
            BankAccountEvent::MoneyDeposited { balance_after, .. } => {
                self.balance = *balance_after;
            }
            BankAccountEvent::MoneyWithdrawn { balance_after, .. } => {
                self.balance = *balance_after;
            }
            BankAccountEvent::AccountClosed { .. } => {
                self.is_closed = true;
            }
        }
        self.version += 1;
    }

    // Process a command and return events if successful
    // This is the core business logic
    pub fn handle(
        &self,
        command: BankAccountCommand,
    ) -> Result<Vec<BankAccountEvent>, BankAccountError> {
        match command {
            BankAccountCommand::OpenAccount { owner_name } => {
                if self.id.is_some() {
                    return Err(BankAccountError::AccountAlreadyExists);
                }
                Ok(vec![BankAccountEvent::AccountOpened {
                    account_id: Uuid::new_v4(),
                    owner_name,
                    opened_at: Utc::now(),
                }])
            }

            BankAccountCommand::Deposit { amount } => {
                if self.is_closed {
                    return Err(BankAccountError::AccountClosed);
                }
                Ok(vec![BankAccountEvent::MoneyDeposited {
                    amount,
                    balance_after: self.balance + amount,
                    deposited_at: Utc::now(),
                }])
            }

            BankAccountCommand::Withdraw { amount } => {
                if self.is_closed {
                    return Err(BankAccountError::AccountClosed);
                }
                if self.balance < amount {
                    return Err(BankAccountError::InsufficientFunds {
                        requested: amount,
                        available: self.balance,
                    });
                }
                Ok(vec![BankAccountEvent::MoneyWithdrawn {
                    amount,
                    balance_after: self.balance - amount,
                    withdrawn_at: Utc::now(),
                }])
            }

            BankAccountCommand::CloseAccount { reason } => {
                if self.is_closed {
                    return Err(BankAccountError::AccountClosed);
                }
                if self.balance > 0 {
                    return Err(BankAccountError::NonZeroBalance {
                        balance: self.balance,
                    });
                }
                Ok(vec![BankAccountEvent::AccountClosed {
                    reason,
                    closed_at: Utc::now(),
                }])
            }
        }
    }
}
```

## The Event Store

The event store persists events and loads them back. This implementation uses an in-memory store, but the interface works the same with PostgreSQL, EventStoreDB, or any other backend.

```rust
use std::collections::HashMap;
use std::sync::RwLock;

// Stored event wrapper with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredEvent<E> {
    pub aggregate_id: Uuid,
    pub sequence: u64,
    pub event: E,
    pub timestamp: DateTime<Utc>,
}

// Simple in-memory event store
// Replace with PostgreSQL or EventStoreDB for production
pub struct EventStore<E> {
    events: RwLock<HashMap<Uuid, Vec<StoredEvent<E>>>>,
}

impl<E: Clone> EventStore<E> {
    pub fn new() -> Self {
        Self {
            events: RwLock::new(HashMap::new()),
        }
    }

    // Load all events for an aggregate
    pub fn load(&self, aggregate_id: Uuid) -> Vec<StoredEvent<E>> {
        self.events
            .read()
            .unwrap()
            .get(&aggregate_id)
            .cloned()
            .unwrap_or_default()
    }

    // Append events with optimistic concurrency check
    // Returns error if expected_version doesn't match
    pub fn append(
        &self,
        aggregate_id: Uuid,
        events: Vec<E>,
        expected_version: u64,
    ) -> Result<(), String> {
        let mut store = self.events.write().unwrap();
        let stream = store.entry(aggregate_id).or_default();

        // Optimistic concurrency check
        if stream.len() as u64 != expected_version {
            return Err(format!(
                "Concurrency conflict: expected version {}, found {}",
                expected_version,
                stream.len()
            ));
        }

        // Append each event with incrementing sequence number
        for (i, event) in events.into_iter().enumerate() {
            stream.push(StoredEvent {
                aggregate_id,
                sequence: expected_version + i as u64 + 1,
                event,
                timestamp: Utc::now(),
            });
        }

        Ok(())
    }

    // Subscribe to all events for projections
    pub fn all_events(&self) -> Vec<StoredEvent<E>> {
        let store = self.events.read().unwrap();
        let mut all: Vec<_> = store.values().flatten().cloned().collect();
        all.sort_by_key(|e| e.timestamp);
        all
    }
}
```

## Read Model Projections

CQRS shines when you build optimized read models. Projections listen to events and maintain denormalized views for fast queries. You can have multiple projections for different use cases.

```rust
use std::sync::Mutex;

// Read model optimized for account queries
#[derive(Debug, Clone, Default)]
pub struct AccountSummary {
    pub account_id: Uuid,
    pub owner_name: String,
    pub current_balance: u64,
    pub total_deposits: u64,
    pub total_withdrawals: u64,
    pub transaction_count: u32,
    pub is_active: bool,
}

// Projection that builds account summaries from events
pub struct AccountSummaryProjection {
    summaries: Mutex<HashMap<Uuid, AccountSummary>>,
}

impl AccountSummaryProjection {
    pub fn new() -> Self {
        Self {
            summaries: Mutex::new(HashMap::new()),
        }
    }

    // Process each event and update the read model
    pub fn apply(&self, stored: &StoredEvent<BankAccountEvent>) {
        let mut summaries = self.summaries.lock().unwrap();

        match &stored.event {
            BankAccountEvent::AccountOpened {
                account_id,
                owner_name,
                ..
            } => {
                summaries.insert(
                    *account_id,
                    AccountSummary {
                        account_id: *account_id,
                        owner_name: owner_name.clone(),
                        is_active: true,
                        ..Default::default()
                    },
                );
            }
            BankAccountEvent::MoneyDeposited {
                amount,
                balance_after,
                ..
            } => {
                if let Some(summary) = summaries.get_mut(&stored.aggregate_id) {
                    summary.current_balance = *balance_after;
                    summary.total_deposits += amount;
                    summary.transaction_count += 1;
                }
            }
            BankAccountEvent::MoneyWithdrawn {
                amount,
                balance_after,
                ..
            } => {
                if let Some(summary) = summaries.get_mut(&stored.aggregate_id) {
                    summary.current_balance = *balance_after;
                    summary.total_withdrawals += amount;
                    summary.transaction_count += 1;
                }
            }
            BankAccountEvent::AccountClosed { .. } => {
                if let Some(summary) = summaries.get_mut(&stored.aggregate_id) {
                    summary.is_active = false;
                }
            }
        }
    }

    // Query the read model
    pub fn get(&self, account_id: Uuid) -> Option<AccountSummary> {
        self.summaries.lock().unwrap().get(&account_id).cloned()
    }

    // Rebuild projection from scratch
    pub fn rebuild(&self, events: &[StoredEvent<BankAccountEvent>]) {
        self.summaries.lock().unwrap().clear();
        for event in events {
            self.apply(event);
        }
    }
}
```

## Putting It All Together

Here is a complete example showing the command flow from user input to persisted events and updated projections.

```rust
// Repository ties everything together
pub struct BankAccountRepository {
    event_store: EventStore<BankAccountEvent>,
    projection: AccountSummaryProjection,
}

impl BankAccountRepository {
    pub fn new() -> Self {
        Self {
            event_store: EventStore::new(),
            projection: AccountSummaryProjection::new(),
        }
    }

    // Execute a command against an aggregate
    pub fn execute(
        &self,
        aggregate_id: Uuid,
        command: BankAccountCommand,
    ) -> Result<(), String> {
        // Load events and rebuild aggregate state
        let stored_events = self.event_store.load(aggregate_id);
        let mut aggregate = BankAccount::default();
        for stored in &stored_events {
            aggregate.apply(&stored.event);
        }

        // Handle command and get new events
        let new_events = aggregate
            .handle(command)
            .map_err(|e| e.to_string())?;

        // Persist events with optimistic concurrency
        self.event_store
            .append(aggregate_id, new_events.clone(), aggregate.version)?;

        // Update projections
        let version = aggregate.version;
        for (i, event) in new_events.into_iter().enumerate() {
            self.projection.apply(&StoredEvent {
                aggregate_id,
                sequence: version + i as u64 + 1,
                event,
                timestamp: Utc::now(),
            });
        }

        Ok(())
    }

    pub fn get_summary(&self, account_id: Uuid) -> Option<AccountSummary> {
        self.projection.get(account_id)
    }
}

// Usage example
fn main() {
    let repo = BankAccountRepository::new();
    let account_id = Uuid::new_v4();

    // Open account
    repo.execute(
        account_id,
        BankAccountCommand::OpenAccount {
            owner_name: "Alice".to_string(),
        },
    ).unwrap();

    // Make some transactions
    repo.execute(account_id, BankAccountCommand::Deposit { amount: 1000 }).unwrap();
    repo.execute(account_id, BankAccountCommand::Withdraw { amount: 200 }).unwrap();
    repo.execute(account_id, BankAccountCommand::Deposit { amount: 500 }).unwrap();

    // Query the read model
    let summary = repo.get_summary(account_id).unwrap();
    println!("Balance: {}", summary.current_balance);      // 1300
    println!("Total deposits: {}", summary.total_deposits); // 1500
    println!("Transactions: {}", summary.transaction_count); // 3
}
```

## Production Considerations

Before deploying event-sourced systems, consider these practical concerns.

**Event Schema Evolution**: Events are immutable, but your code changes. Use versioned event types and upcasters to transform old events to new formats during replay.

**Snapshotting**: Aggregates with thousands of events become slow to load. Store periodic snapshots and only replay events after the snapshot.

**Eventual Consistency**: Read models update asynchronously. Design your UI to handle this - show optimistic updates or indicate when data may be stale.

**Event Store Selection**: For production, consider EventStoreDB (purpose-built for event sourcing), PostgreSQL with proper indexing, or Apache Kafka for high-throughput scenarios.

## Summary

Event sourcing with CQRS gives you an immutable audit log, the ability to replay history, and optimized read models. Rust's type system helps enforce valid state transitions at compile time. The pattern adds complexity, so use it where the benefits matter: financial systems, collaborative applications, or anywhere you need a complete history of changes.

Start simple with in-memory stores, get the domain model right, then swap in production-grade persistence. The separation between commands and queries makes this migration straightforward.
