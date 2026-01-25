# How to Implement CQRS Pattern in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, CQRS, Architecture, Event Sourcing, Domain-Driven Design

Description: A practical guide to implementing the Command Query Responsibility Segregation (CQRS) pattern in Rust, with type-safe commands, queries, and event handling for building scalable applications.

---

> CQRS separates read and write operations into distinct models, allowing you to optimize each path independently. Rust's strong type system makes it particularly well-suited for implementing this pattern with compile-time guarantees.

If you have worked with complex domains where reads vastly outnumber writes, or where the shape of data needed for queries differs significantly from how it is stored, CQRS can simplify your architecture considerably. This guide walks through a practical implementation in Rust.

---

## What is CQRS?

Command Query Responsibility Segregation (CQRS) is an architectural pattern that separates read operations (Queries) from write operations (Commands). Instead of using a single model for both reading and writing data, you maintain two distinct models:

- **Command Model**: Handles all write operations, validates business rules, and produces events
- **Query Model**: Optimized for reading data, often denormalized for fast retrieval

This separation lets you scale reads and writes independently, use different storage mechanisms for each, and optimize queries without affecting write performance.

---

## Project Structure

Let's start with a well-organized project structure:

```
src/
├── commands/        # Command definitions and handlers
│   ├── mod.rs
│   └── user.rs
├── queries/         # Query definitions and handlers
│   ├── mod.rs
│   └── user.rs
├── events/          # Domain events
│   ├── mod.rs
│   └── user.rs
├── models/          # Domain models and read models
│   ├── mod.rs
│   ├── user.rs
│   └── read_models.rs
├── storage/         # Storage implementations
│   └── mod.rs
└── main.rs
```

---

## Defining Commands

Commands represent intentions to change state. In Rust, we can use enums and traits to create a type-safe command system.

```rust
// src/commands/mod.rs
use async_trait::async_trait;
use std::fmt::Debug;

// Base trait for all commands
// Commands must be Send + Sync for async execution across threads
#[async_trait]
pub trait Command: Send + Sync + Debug {
    type Result;
    type Error;
}

// Command handler trait - each command type gets its own handler
#[async_trait]
pub trait CommandHandler<C: Command> {
    async fn handle(&self, command: C) -> Result<C::Result, C::Error>;
}
```

Now let's define some user-related commands:

```rust
// src/commands/user.rs
use super::{Command, CommandHandler};
use crate::events::UserEvent;
use async_trait::async_trait;
use uuid::Uuid;

// Command to create a new user
// Notice the clear, intention-revealing name
#[derive(Debug, Clone)]
pub struct CreateUser {
    pub id: Uuid,
    pub email: String,
    pub name: String,
}

// Command to update user profile
#[derive(Debug, Clone)]
pub struct UpdateUserProfile {
    pub user_id: Uuid,
    pub name: Option<String>,
    pub bio: Option<String>,
}

// Command to deactivate a user account
#[derive(Debug, Clone)]
pub struct DeactivateUser {
    pub user_id: Uuid,
    pub reason: String,
}

// Define what each command returns
#[async_trait]
impl Command for CreateUser {
    type Result = Uuid;  // Returns the created user's ID
    type Error = UserCommandError;
}

#[async_trait]
impl Command for UpdateUserProfile {
    type Result = ();
    type Error = UserCommandError;
}

#[async_trait]
impl Command for DeactivateUser {
    type Result = ();
    type Error = UserCommandError;
}

// Strongly typed errors for user commands
#[derive(Debug, thiserror::Error)]
pub enum UserCommandError {
    #[error("User not found: {0}")]
    NotFound(Uuid),

    #[error("Email already exists: {0}")]
    EmailExists(String),

    #[error("Invalid email format")]
    InvalidEmail,

    #[error("Storage error: {0}")]
    Storage(String),
}
```

---

## Implementing Command Handlers

Command handlers contain the business logic. They validate input, apply domain rules, and produce events.

```rust
// src/commands/user.rs (continued)
use crate::storage::EventStore;
use std::sync::Arc;

pub struct UserCommandHandler {
    event_store: Arc<dyn EventStore>,
}

impl UserCommandHandler {
    pub fn new(event_store: Arc<dyn EventStore>) -> Self {
        Self { event_store }
    }

    // Validate email format - business rule
    fn validate_email(email: &str) -> bool {
        email.contains('@') && email.len() > 3
    }
}

#[async_trait]
impl CommandHandler<CreateUser> for UserCommandHandler {
    async fn handle(&self, cmd: CreateUser) -> Result<Uuid, UserCommandError> {
        // Validate business rules first
        if !Self::validate_email(&cmd.email) {
            return Err(UserCommandError::InvalidEmail);
        }

        // Check for duplicate email
        if self.event_store.email_exists(&cmd.email).await {
            return Err(UserCommandError::EmailExists(cmd.email));
        }

        // Create the domain event
        let event = UserEvent::Created {
            id: cmd.id,
            email: cmd.email,
            name: cmd.name,
            created_at: chrono::Utc::now(),
        };

        // Persist the event
        self.event_store
            .append(cmd.id, event)
            .await
            .map_err(|e| UserCommandError::Storage(e.to_string()))?;

        Ok(cmd.id)
    }
}

#[async_trait]
impl CommandHandler<UpdateUserProfile> for UserCommandHandler {
    async fn handle(&self, cmd: UpdateUserProfile) -> Result<(), UserCommandError> {
        // Load current state from events
        let events = self.event_store
            .load(cmd.user_id)
            .await
            .map_err(|e| UserCommandError::Storage(e.to_string()))?;

        if events.is_empty() {
            return Err(UserCommandError::NotFound(cmd.user_id));
        }

        // Create update event only if there are changes
        let event = UserEvent::ProfileUpdated {
            id: cmd.user_id,
            name: cmd.name,
            bio: cmd.bio,
            updated_at: chrono::Utc::now(),
        };

        self.event_store
            .append(cmd.user_id, event)
            .await
            .map_err(|e| UserCommandError::Storage(e.to_string()))?;

        Ok(())
    }
}
```

---

## Defining Domain Events

Events represent facts that have happened in the system. They are immutable records of state changes.

```rust
// src/events/user.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Events are serializable for storage and message passing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserEvent {
    Created {
        id: Uuid,
        email: String,
        name: String,
        created_at: DateTime<Utc>,
    },
    ProfileUpdated {
        id: Uuid,
        name: Option<String>,
        bio: Option<String>,
        updated_at: DateTime<Utc>,
    },
    Deactivated {
        id: Uuid,
        reason: String,
        deactivated_at: DateTime<Utc>,
    },
    Reactivated {
        id: Uuid,
        reactivated_at: DateTime<Utc>,
    },
}

impl UserEvent {
    // Helper to get the aggregate ID from any event variant
    pub fn aggregate_id(&self) -> Uuid {
        match self {
            UserEvent::Created { id, .. } => *id,
            UserEvent::ProfileUpdated { id, .. } => *id,
            UserEvent::Deactivated { id, .. } => *id,
            UserEvent::Reactivated { id, .. } => *id,
        }
    }
}
```

---

## Building the Query Side

Queries are optimized for reading. We create denormalized read models that are updated by projecting events.

```rust
// src/queries/user.rs
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

// Query definitions - what data we want to retrieve
#[derive(Debug)]
pub struct GetUserById {
    pub id: Uuid,
}

#[derive(Debug)]
pub struct GetUserByEmail {
    pub email: String,
}

#[derive(Debug)]
pub struct ListActiveUsers {
    pub page: u32,
    pub page_size: u32,
}

// Read model - optimized structure for queries
// This is denormalized and may duplicate data for fast reads
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserReadModel {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub bio: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Query handler trait
#[async_trait]
pub trait QueryHandler<Q> {
    type Result;
    type Error;

    async fn handle(&self, query: Q) -> Result<Self::Result, Self::Error>;
}

// Query error types
#[derive(Debug, thiserror::Error)]
pub enum UserQueryError {
    #[error("User not found")]
    NotFound,

    #[error("Database error: {0}")]
    Database(String),
}
```

Now implement the query handlers:

```rust
// src/queries/user.rs (continued)
use crate::storage::ReadModelStore;
use std::sync::Arc;

pub struct UserQueryHandler {
    read_store: Arc<dyn ReadModelStore>,
}

impl UserQueryHandler {
    pub fn new(read_store: Arc<dyn ReadModelStore>) -> Self {
        Self { read_store }
    }
}

#[async_trait]
impl QueryHandler<GetUserById> for UserQueryHandler {
    type Result = UserReadModel;
    type Error = UserQueryError;

    async fn handle(&self, query: GetUserById) -> Result<UserReadModel, UserQueryError> {
        self.read_store
            .get_user_by_id(query.id)
            .await
            .ok_or(UserQueryError::NotFound)
    }
}

#[async_trait]
impl QueryHandler<ListActiveUsers> for UserQueryHandler {
    type Result = Vec<UserReadModel>;
    type Error = UserQueryError;

    async fn handle(&self, query: ListActiveUsers) -> Result<Vec<UserReadModel>, UserQueryError> {
        self.read_store
            .list_active_users(query.page, query.page_size)
            .await
            .map_err(|e| UserQueryError::Database(e.to_string()))
    }
}
```

---

## Event Projection

Projections transform events into read models. They run asynchronously and update the query-side storage.

```rust
// src/projections/user.rs
use crate::events::UserEvent;
use crate::queries::UserReadModel;
use crate::storage::ReadModelStore;
use std::sync::Arc;

pub struct UserProjection {
    read_store: Arc<dyn ReadModelStore>,
}

impl UserProjection {
    pub fn new(read_store: Arc<dyn ReadModelStore>) -> Self {
        Self { read_store }
    }

    // Project a single event to update the read model
    pub async fn project(&self, event: UserEvent) -> Result<(), ProjectionError> {
        match event {
            UserEvent::Created { id, email, name, created_at } => {
                // Create new read model entry
                let model = UserReadModel {
                    id,
                    email,
                    name,
                    bio: None,
                    is_active: true,
                    created_at,
                    updated_at: created_at,
                };
                self.read_store.insert_user(model).await?;
            }

            UserEvent::ProfileUpdated { id, name, bio, updated_at } => {
                // Update existing read model
                self.read_store
                    .update_user(id, |mut user| {
                        if let Some(n) = name {
                            user.name = n;
                        }
                        if bio.is_some() {
                            user.bio = bio;
                        }
                        user.updated_at = updated_at;
                        user
                    })
                    .await?;
            }

            UserEvent::Deactivated { id, deactivated_at, .. } => {
                self.read_store
                    .update_user(id, |mut user| {
                        user.is_active = false;
                        user.updated_at = deactivated_at;
                        user
                    })
                    .await?;
            }

            UserEvent::Reactivated { id, reactivated_at } => {
                self.read_store
                    .update_user(id, |mut user| {
                        user.is_active = true;
                        user.updated_at = reactivated_at;
                        user
                    })
                    .await?;
            }
        }

        Ok(())
    }
}
```

---

## Wiring It Together

Finally, let's create a simple dispatcher that routes commands and queries:

```rust
// src/main.rs
use std::sync::Arc;

pub struct CqrsDispatcher {
    user_command_handler: UserCommandHandler,
    user_query_handler: UserQueryHandler,
    user_projection: UserProjection,
}

impl CqrsDispatcher {
    pub fn new(
        event_store: Arc<dyn EventStore>,
        read_store: Arc<dyn ReadModelStore>,
    ) -> Self {
        Self {
            user_command_handler: UserCommandHandler::new(event_store.clone()),
            user_query_handler: UserQueryHandler::new(read_store.clone()),
            user_projection: UserProjection::new(read_store),
        }
    }

    // Execute a command and project resulting events
    pub async fn execute_create_user(
        &self,
        cmd: CreateUser
    ) -> Result<Uuid, UserCommandError> {
        let user_id = self.user_command_handler.handle(cmd.clone()).await?;

        // Project the event to update read models
        // In production, this would be async via message queue
        let event = UserEvent::Created {
            id: user_id,
            email: cmd.email,
            name: cmd.name,
            created_at: chrono::Utc::now(),
        };

        // Fire and forget projection - eventual consistency
        let projection = self.user_projection.clone();
        tokio::spawn(async move {
            if let Err(e) = projection.project(event).await {
                eprintln!("Projection failed: {}", e);
            }
        });

        Ok(user_id)
    }

    // Execute a query
    pub async fn query_user_by_id(
        &self,
        id: Uuid,
    ) -> Result<UserReadModel, UserQueryError> {
        self.user_query_handler
            .handle(GetUserById { id })
            .await
    }
}

#[tokio::main]
async fn main() {
    // Initialize storage (in-memory for this example)
    let event_store = Arc::new(InMemoryEventStore::new());
    let read_store = Arc::new(InMemoryReadStore::new());

    let dispatcher = CqrsDispatcher::new(event_store, read_store);

    // Create a user via command
    let user_id = dispatcher
        .execute_create_user(CreateUser {
            id: Uuid::new_v4(),
            email: "alice@example.com".to_string(),
            name: "Alice".to_string(),
        })
        .await
        .expect("Failed to create user");

    println!("Created user: {}", user_id);

    // Query the user
    // Small delay for eventual consistency
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

    let user = dispatcher
        .query_user_by_id(user_id)
        .await
        .expect("User not found");

    println!("Retrieved user: {:?}", user);
}
```

---

## When to Use CQRS

CQRS works well when:

- Read and write workloads have different scaling requirements
- Query patterns differ significantly from how data is written
- You need to optimize read performance with denormalized views
- The domain is complex enough to benefit from separate models
- You want to integrate with event sourcing

CQRS adds complexity, so avoid it for simple CRUD applications where a single model works fine.

---

## Conclusion

Rust's type system makes CQRS implementations particularly robust. You get compile-time guarantees that commands and queries are handled correctly, and the ownership model prevents accidental mutations of read models.

Key takeaways:

- Separate commands (writes) from queries (reads) into distinct models
- Use events as the source of truth for state changes
- Project events to build optimized read models
- Accept eventual consistency between command and query sides
- Let Rust's type system enforce the separation at compile time

The pattern pays off in systems where read and write patterns diverge significantly, giving you the flexibility to optimize each path independently.
