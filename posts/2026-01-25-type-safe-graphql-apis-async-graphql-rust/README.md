# How to Build Type-Safe GraphQL APIs with async-graphql in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, GraphQL, async-graphql, API, Type Safety

Description: A practical guide to building GraphQL APIs in Rust using async-graphql, covering schema design, resolvers, subscriptions, and integration with popular web frameworks.

---

GraphQL has become the preferred API layer for many teams building modern applications. The ability to request exactly the data you need, introspect the schema, and evolve the API without versioning makes it compelling for both frontend and backend developers. When you combine GraphQL with Rust, you get the best of both worlds: a flexible query language backed by a language that catches bugs at compile time.

The `async-graphql` crate is the most mature and feature-complete GraphQL library for Rust. It takes full advantage of Rust's type system to generate schemas from your code, eliminating the mismatch between your schema definition and implementation. If a resolver returns the wrong type, your code simply won't compile.

## Setting Up Your Project

Start by creating a new Rust project and adding the necessary dependencies. We'll use `async-graphql` for the GraphQL layer and `actix-web` as our HTTP server, though the library works equally well with Axum, Warp, or any other async runtime.

```toml
# Cargo.toml
[package]
name = "graphql-api"
version = "0.1.0"
edition = "2021"

[dependencies]
async-graphql = "7.0"
async-graphql-actix-web = "7.0"
actix-web = "4"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
serde = { version = "1", features = ["derive"] }
```

## Defining Your Schema Types

In async-graphql, your Rust types become your GraphQL types. You annotate structs with derive macros, and the library generates the corresponding schema. This is where Rust's type safety shines - the schema is always in sync with your implementation.

```rust
use async_graphql::{SimpleObject, InputObject, ID};

// This struct becomes a GraphQL object type
#[derive(SimpleObject, Clone)]
pub struct User {
    pub id: ID,
    pub email: String,
    pub name: String,
    pub role: UserRole,
}

// Enums map directly to GraphQL enums
#[derive(async_graphql::Enum, Copy, Clone, Eq, PartialEq)]
pub enum UserRole {
    Admin,
    Member,
    Guest,
}

// Input types for mutations
#[derive(InputObject)]
pub struct CreateUserInput {
    pub email: String,
    pub name: String,
    pub role: Option<UserRole>,
}
```

The `SimpleObject` derive macro works for types where each field maps directly to a GraphQL field. For more complex scenarios where you need custom resolution logic, you'll use the `Object` macro instead.

## Building the Query Root

The query root is where you define all the read operations your API supports. Each method becomes a field in the GraphQL schema.

```rust
use async_graphql::{Context, Object, Result, ID};

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    // Simple query: fetch a user by ID
    async fn user(&self, ctx: &Context<'_>, id: ID) -> Result<Option<User>> {
        // Access shared state through the context
        let db = ctx.data::<Database>()?;

        let user = db.find_user(&id).await?;
        Ok(user)
    }

    // Query with filtering and pagination
    async fn users(
        &self,
        ctx: &Context<'_>,
        #[graphql(default = 20)] limit: i32,
        #[graphql(default = 0)] offset: i32,
        role: Option<UserRole>,
    ) -> Result<Vec<User>> {
        let db = ctx.data::<Database>()?;

        let users = db.list_users(limit, offset, role).await?;
        Ok(users)
    }
}
```

Notice how the function signatures directly define the GraphQL field signatures. The `#[graphql(default = ...)]` attribute sets default values for optional arguments. The `Context` parameter gives you access to shared application state like database connections or authentication data.

## Implementing Mutations

Mutations follow the same pattern but handle write operations. Each mutation method should return either the modified resource or a meaningful result type.

```rust
use async_graphql::{Context, Object, Result, ID};

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_user(
        &self,
        ctx: &Context<'_>,
        input: CreateUserInput,
    ) -> Result<User> {
        let db = ctx.data::<Database>()?;

        // Validate the input
        if input.email.is_empty() {
            return Err("Email cannot be empty".into());
        }

        // Create the user and return it
        let user = db.create_user(input).await?;
        Ok(user)
    }

    async fn update_user_role(
        &self,
        ctx: &Context<'_>,
        id: ID,
        role: UserRole,
    ) -> Result<User> {
        let db = ctx.data::<Database>()?;

        let user = db.update_role(&id, role).await?
            .ok_or("User not found")?;

        Ok(user)
    }

    async fn delete_user(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        let db = ctx.data::<Database>()?;

        let deleted = db.delete_user(&id).await?;
        Ok(deleted)
    }
}
```

Error handling in async-graphql is straightforward. Return `Result<T>` from your resolvers, and errors automatically become GraphQL errors in the response. For structured errors, you can implement custom error types that provide more detail to clients.

## Adding Real-time Subscriptions

GraphQL subscriptions enable real-time updates over WebSocket connections. async-graphql makes this simple with the `Subscription` macro and Rust's async streams.

```rust
use async_graphql::{Subscription, Context, Result, ID};
use futures_util::Stream;
use tokio_stream::wrappers::BroadcastStream;

pub struct SubscriptionRoot;

#[Subscription]
impl SubscriptionRoot {
    // Stream of user updates for a specific user
    async fn user_updated(
        &self,
        ctx: &Context<'_>,
        id: ID,
    ) -> Result<impl Stream<Item = User>> {
        let events = ctx.data::<EventBus>()?;

        // Filter the broadcast stream to only this user's events
        let stream = BroadcastStream::new(events.subscribe())
            .filter_map(move |event| {
                match event {
                    Ok(UserEvent::Updated(user)) if user.id == id => Some(user),
                    _ => None,
                }
            });

        Ok(stream)
    }
}
```

## Wiring Up the HTTP Server

With your schema defined, connect it to an HTTP server. Here's a complete example using Actix-web.

```rust
use actix_web::{web, App, HttpServer, HttpResponse};
use async_graphql::{Schema, EmptySubscription};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};

// Build the schema with query and mutation roots
type ApiSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

async fn graphql_handler(
    schema: web::Data<ApiSchema>,
    request: GraphQLRequest,
) -> GraphQLResponse {
    schema.execute(request.into_inner()).await.into()
}

// Optional: serve the GraphQL Playground for development
async fn playground() -> HttpResponse {
    HttpResponse::Ok()
        .content_type("text/html")
        .body(async_graphql::http::playground_source(
            async_graphql::http::GraphQLPlaygroundConfig::new("/graphql"),
        ))
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    // Initialize your database connection
    let database = Database::connect("postgres://localhost/myapp").await;

    // Build the schema with shared state
    let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
        .data(database)
        .finish();

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(schema.clone()))
            .route("/graphql", web::post().to(graphql_handler))
            .route("/playground", web::get().to(playground))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

## Advanced Patterns

Once you have the basics working, async-graphql offers several features for production use.

**Field Guards** let you implement authorization at the field level:

```rust
#[Object]
impl QueryRoot {
    #[graphql(guard = "RoleGuard::new(UserRole::Admin)")]
    async fn admin_stats(&self, ctx: &Context<'_>) -> Result<Stats> {
        // Only admins can access this field
        let db = ctx.data::<Database>()?;
        db.get_admin_stats().await
    }
}
```

**DataLoaders** solve the N+1 query problem by batching and caching database requests:

```rust
use async_graphql::dataloader::{DataLoader, Loader};

pub struct UserLoader {
    db: Database,
}

impl Loader<ID> for UserLoader {
    type Value = User;
    type Error = String;

    async fn load(&self, keys: &[ID]) -> Result<HashMap<ID, User>, Self::Error> {
        // Batch fetch all users in a single query
        self.db.find_users_by_ids(keys).await
    }
}
```

**Complexity and Depth Limits** protect your API from expensive queries:

```rust
let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
    .limit_complexity(100)  // Maximum query complexity
    .limit_depth(10)        // Maximum nesting depth
    .finish();
```

## Why This Approach Works

The combination of Rust and async-graphql gives you several guarantees that are hard to achieve in dynamic languages. Your schema can never drift from your implementation because they are the same thing. Invalid queries fail at compile time, not runtime. The async runtime handles thousands of concurrent connections efficiently.

For teams building APIs that need to be both flexible and reliable, this stack hits a sweet spot. You get the developer experience of GraphQL - introspection, precise data fetching, strong tooling - backed by a language that prevents entire categories of bugs before deployment.

If you're already running Rust services or considering it for new projects, async-graphql is production-ready and actively maintained. Start with a small service, see how the type safety feels in practice, and scale from there.
