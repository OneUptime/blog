# How to Test Rust Applications with Integration Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Integration Testing, Testing, Cargo, Test Organization, Fixtures, Async Testing

Description: A practical guide to writing integration tests for Rust applications, covering test organization, shared fixtures, async testing patterns, and database testing strategies.

---

> Integration tests verify that multiple components of your application work together correctly. Unlike unit tests that isolate individual functions, integration tests exercise your code paths from end to end. Rust has first-class support for integration tests built directly into Cargo.

This guide walks through the practical aspects of setting up and writing integration tests for Rust applications, from basic project structure to testing async code with real databases.

---

## Understanding Rust's Test Architecture

Rust distinguishes between unit tests and integration tests by location and scope.

```mermaid
flowchart TB
    subgraph Project["Rust Project Structure"]
        subgraph SRC["src/"]
            LIB["lib.rs"]
            MOD1["module_a.rs"]
            MOD2["module_b.rs"]
            UNIT["#[cfg(test)] mod tests"]
        end
        subgraph TESTS["tests/"]
            INT1["api_tests.rs"]
            INT2["db_tests.rs"]
            COMMON["common/mod.rs"]
        end
    end

    UNIT -->|"Tests private functions"| LIB
    INT1 -->|"Tests public API only"| LIB
    INT2 -->|"Tests public API only"| LIB
    COMMON -->|"Shared helpers"| INT1
    COMMON -->|"Shared helpers"| INT2
```

Unit tests live inside your source files within a `#[cfg(test)]` module and can access private functions. Integration tests live in the `tests/` directory at the project root and can only access your crate's public API.

---

## Project Setup

Start with a well-organized Cargo.toml that includes testing dependencies.

```toml
[package]
name = "myapp"
version = "0.1.0"
edition = "2021"

[lib]
# Expose the library for integration tests
name = "myapp"
path = "src/lib.rs"

[[bin]]
name = "myapp"
path = "src/main.rs"

[dependencies]
# Application dependencies
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "uuid"] }
uuid = { version = "1", features = ["v4", "serde"] }
thiserror = "1"

[dev-dependencies]
# Testing dependencies - only compiled for tests
tokio-test = "0.4"
tempfile = "3"
wiremock = "0.5"
fake = { version = "2", features = ["derive", "uuid"] }
serial_test = "3"
testcontainers = "0.15"
```

The `[dev-dependencies]` section contains packages only used during testing. This keeps your production binary lean.

---

## Basic Project Structure

Organize your project to support both unit and integration tests.

```
myapp/
├── Cargo.toml
├── src/
│   ├── lib.rs           # Library root - exports public API
│   ├── main.rs          # Binary entry point
│   ├── config.rs
│   ├── db/
│   │   ├── mod.rs
│   │   └── users.rs
│   └── services/
│       ├── mod.rs
│       └── user_service.rs
└── tests/
    ├── common/          # Shared test utilities
    │   └── mod.rs
    ├── user_tests.rs    # Integration test file
    └── api_tests.rs     # Another test file
```

Each file in `tests/` compiles as a separate crate. The `common/` directory holds shared code that other test files can import.

---

## Writing Your First Integration Test

Create a simple integration test that exercises your public API.

```rust
// tests/user_tests.rs
// Integration tests for user management functionality

use myapp::services::UserService;
use myapp::models::CreateUserRequest;

// Each #[test] function runs in isolation
#[test]
fn test_create_user_with_valid_data() {
    // Arrange - set up the test data
    let service = UserService::new();
    let request = CreateUserRequest {
        email: "test@example.com".to_string(),
        name: "Test User".to_string(),
    };

    // Act - execute the code under test
    let result = service.create_user(request);

    // Assert - verify the outcome
    assert!(result.is_ok());
    let user = result.unwrap();
    assert_eq!(user.email, "test@example.com");
    assert!(!user.id.is_nil());
}

#[test]
fn test_create_user_with_invalid_email_fails() {
    let service = UserService::new();
    let request = CreateUserRequest {
        email: "not-an-email".to_string(),
        name: "Test User".to_string(),
    };

    let result = service.create_user(request);

    // Verify error type matches expectations
    assert!(result.is_err());
    let error = result.unwrap_err();
    assert!(error.to_string().contains("invalid email"));
}

#[test]
fn test_find_user_returns_none_for_missing_id() {
    let service = UserService::new();
    let missing_id = uuid::Uuid::new_v4();

    let result = service.find_user(missing_id);

    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
}
```

Run tests with `cargo test`. Use `cargo test --test user_tests` to run only a specific test file.

---

## Shared Test Utilities

Create reusable fixtures and helpers in the common module.

```rust
// tests/common/mod.rs
// Shared test utilities and fixtures

use myapp::config::Config;
use myapp::db::Database;
use std::sync::Once;

// Ensure one-time initialization across all tests
static INIT: Once = Once::new();

/// Initialize test environment - call at start of each test
pub fn setup() {
    INIT.call_once(|| {
        // Set up logging for tests
        if std::env::var("TEST_LOG").is_ok() {
            tracing_subscriber::fmt()
                .with_test_writer()
                .init();
        }
    });
}

/// Create a test configuration
pub fn test_config() -> Config {
    Config {
        database_url: std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/myapp_test".to_string()),
        port: 0, // Random available port
        environment: "test".to_string(),
    }
}

/// Test fixture for a user
pub struct TestUser {
    pub id: uuid::Uuid,
    pub email: String,
    pub name: String,
}

impl TestUser {
    /// Generate a random test user
    pub fn random() -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            email: format!("test-{}@example.com", uuid::Uuid::new_v4()),
            name: "Test User".to_string(),
        }
    }

    /// Create a user with specific email
    pub fn with_email(email: &str) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            email: email.to_string(),
            name: "Test User".to_string(),
        }
    }
}

/// Test context that manages setup and teardown
pub struct TestContext {
    pub config: Config,
    pub db: Option<Database>,
}

impl TestContext {
    pub async fn new() -> Self {
        setup();
        let config = test_config();

        Self {
            config,
            db: None,
        }
    }

    /// Initialize with database connection
    pub async fn with_database() -> Self {
        setup();
        let config = test_config();
        let db = Database::connect(&config.database_url).await
            .expect("Failed to connect to test database");

        Self {
            config,
            db: Some(db),
        }
    }
}

impl Drop for TestContext {
    fn drop(&mut self) {
        // Cleanup happens automatically
    }
}
```

Use the shared utilities in your tests:

```rust
// tests/user_tests.rs
mod common;

use common::{setup, TestContext, TestUser};
use myapp::services::UserService;

#[test]
fn test_with_shared_fixtures() {
    setup();

    let test_user = TestUser::random();
    let service = UserService::new();

    // Use the fixture data
    let result = service.create_user_from_data(
        test_user.email.clone(),
        test_user.name.clone(),
    );

    assert!(result.is_ok());
}
```

---

## Testing Async Code

Most real applications use async operations. Rust integration tests support async testing with the right setup.

```rust
// tests/async_tests.rs
// Testing async functionality

mod common;

use common::TestContext;
use myapp::services::UserService;
use myapp::models::CreateUserRequest;

// Use tokio::test for async test functions
#[tokio::test]
async fn test_async_user_creation() {
    let ctx = TestContext::new().await;
    let service = UserService::with_config(&ctx.config);

    let request = CreateUserRequest {
        email: "async@example.com".to_string(),
        name: "Async User".to_string(),
    };

    // Await the async operation
    let result = service.create_user_async(request).await;

    assert!(result.is_ok());
    let user = result.unwrap();
    assert_eq!(user.email, "async@example.com");
}

#[tokio::test]
async fn test_concurrent_user_operations() {
    let ctx = TestContext::new().await;
    let service = UserService::with_config(&ctx.config);

    // Create multiple users concurrently
    let futures: Vec<_> = (0..5)
        .map(|i| {
            let svc = service.clone();
            async move {
                let request = CreateUserRequest {
                    email: format!("user{}@example.com", i),
                    name: format!("User {}", i),
                };
                svc.create_user_async(request).await
            }
        })
        .collect();

    // Wait for all operations to complete
    let results = futures::future::join_all(futures).await;

    // Verify all succeeded
    for result in results {
        assert!(result.is_ok());
    }
}

#[tokio::test]
async fn test_async_timeout_behavior() {
    let ctx = TestContext::new().await;
    let service = UserService::with_config(&ctx.config);

    // Test that slow operations timeout correctly
    let result = tokio::time::timeout(
        std::time::Duration::from_millis(100),
        service.slow_operation(),
    )
    .await;

    // Verify the operation timed out
    assert!(result.is_err());
}
```

---

## Database Integration Testing

Test database operations with proper isolation and cleanup.

```mermaid
flowchart LR
    subgraph Test["Test Lifecycle"]
        SETUP["Setup: Create tables"]
        RUN["Run: Execute test"]
        TEARDOWN["Teardown: Rollback/Drop"]
    end

    subgraph Strategies["Isolation Strategies"]
        TX["Transaction rollback"]
        SCHEMA["Separate schemas"]
        DB["Separate databases"]
    end

    SETUP --> RUN --> TEARDOWN
    Strategies --> SETUP
```

### Transaction-Based Isolation

Wrap each test in a transaction that rolls back, ensuring no data persists.

```rust
// tests/db_tests.rs
// Database integration tests with transaction isolation

mod common;

use common::TestContext;
use myapp::db::UserRepository;
use myapp::models::User;
use sqlx::PgPool;

/// Test wrapper that provides automatic rollback
pub struct TestTransaction {
    pool: PgPool,
}

impl TestTransaction {
    pub async fn new(pool: PgPool) -> Self {
        // Begin transaction at start
        sqlx::query("BEGIN")
            .execute(&pool)
            .await
            .expect("Failed to begin transaction");

        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

impl Drop for TestTransaction {
    fn drop(&mut self) {
        // Rollback on drop - requires blocking runtime
        // In practice, use explicit rollback in async context
    }
}

#[tokio::test]
async fn test_user_crud_operations() {
    let ctx = TestContext::with_database().await;
    let pool = ctx.db.as_ref().unwrap().pool();

    // Start transaction for isolation
    let mut tx = pool.begin().await.expect("Failed to begin transaction");

    let repo = UserRepository::new();

    // Create
    let user = User {
        id: uuid::Uuid::new_v4(),
        email: "crud@example.com".to_string(),
        name: "CRUD Test".to_string(),
        created_at: chrono::Utc::now(),
    };

    let created = repo.create(&mut *tx, &user).await
        .expect("Failed to create user");
    assert_eq!(created.email, user.email);

    // Read
    let found = repo.find_by_id(&mut *tx, user.id).await
        .expect("Failed to find user");
    assert!(found.is_some());
    assert_eq!(found.unwrap().id, user.id);

    // Update
    let updated = repo.update_name(&mut *tx, user.id, "Updated Name").await
        .expect("Failed to update user");
    assert_eq!(updated.name, "Updated Name");

    // Delete
    repo.delete(&mut *tx, user.id).await
        .expect("Failed to delete user");

    let deleted = repo.find_by_id(&mut *tx, user.id).await
        .expect("Query failed");
    assert!(deleted.is_none());

    // Transaction automatically rolls back when tx is dropped
    // No cleanup needed - data never commits
}

#[tokio::test]
async fn test_unique_email_constraint() {
    let ctx = TestContext::with_database().await;
    let pool = ctx.db.as_ref().unwrap().pool();
    let mut tx = pool.begin().await.unwrap();

    let repo = UserRepository::new();
    let email = "unique@example.com";

    // Create first user
    let user1 = User {
        id: uuid::Uuid::new_v4(),
        email: email.to_string(),
        name: "First".to_string(),
        created_at: chrono::Utc::now(),
    };
    repo.create(&mut *tx, &user1).await.unwrap();

    // Attempt duplicate email
    let user2 = User {
        id: uuid::Uuid::new_v4(),
        email: email.to_string(),
        name: "Second".to_string(),
        created_at: chrono::Utc::now(),
    };

    let result = repo.create(&mut *tx, &user2).await;

    // Verify constraint violation
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("unique") ||
            err.to_string().contains("duplicate"));
}
```

---

## Testing with Test Containers

Use Testcontainers for isolated database instances.

```rust
// tests/container_tests.rs
// Integration tests using Testcontainers

use testcontainers::{clients::Cli, images::postgres::Postgres, Container};
use sqlx::PgPool;

mod common;

/// Creates an isolated Postgres container for testing
async fn setup_test_db() -> (Container<'static, Postgres>, PgPool) {
    let docker = Cli::default();

    // Start Postgres container
    let container = docker.run(
        Postgres::default()
            .with_db_name("test_db")
            .with_user("test")
            .with_password("test")
    );

    let port = container.get_host_port_ipv4(5432);
    let url = format!(
        "postgres://test:test@localhost:{}/test_db",
        port
    );

    // Wait for database to be ready
    let pool = loop {
        match PgPool::connect(&url).await {
            Ok(pool) => break pool,
            Err(_) => {
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        }
    };

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    (container, pool)
}

#[tokio::test]
async fn test_with_real_postgres() {
    let (_container, pool) = setup_test_db().await;

    // Container stays alive as long as _container is in scope

    let result = sqlx::query!("SELECT 1 as value")
        .fetch_one(&pool)
        .await
        .expect("Query failed");

    assert_eq!(result.value, Some(1));

    // Container automatically stops when test ends
}

#[tokio::test]
async fn test_complex_queries() {
    let (_container, pool) = setup_test_db().await;

    // Insert test data
    let user_id = uuid::Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO users (id, email, name) VALUES ($1, $2, $3)",
        user_id,
        "container@example.com",
        "Container Test"
    )
    .execute(&pool)
    .await
    .expect("Insert failed");

    // Query and verify
    let user = sqlx::query!(
        "SELECT id, email, name FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(&pool)
    .await
    .expect("Query failed");

    assert!(user.is_some());
    let user = user.unwrap();
    assert_eq!(user.email, "container@example.com");
}
```

---

## Testing HTTP APIs

Test your HTTP endpoints with a test server.

```rust
// tests/api_tests.rs
// HTTP API integration tests

mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode, header},
};
use tower::ServiceExt;
use serde_json::json;

use myapp::create_app;
use common::TestContext;

/// Build the application for testing
async fn test_app() -> axum::Router {
    let ctx = TestContext::new().await;
    create_app(ctx.config).await
}

#[tokio::test]
async fn test_health_endpoint() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_create_user_endpoint() {
    let app = test_app().await;

    let body = json!({
        "email": "api@example.com",
        "name": "API Test User"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/users")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    // Parse response body
    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let user: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();

    assert_eq!(user["email"], "api@example.com");
    assert!(user["id"].is_string());
}

#[tokio::test]
async fn test_validation_error_response() {
    let app = test_app().await;

    // Missing required fields
    let body = json!({
        "email": "invalid-email"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/users")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_not_found_response() {
    let app = test_app().await;

    let missing_id = uuid::Uuid::new_v4();

    let response = app
        .oneshot(
            Request::builder()
                .uri(&format!("/api/users/{}", missing_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
```

---

## Mocking External Services

Use wiremock to mock HTTP dependencies.

```rust
// tests/external_service_tests.rs
// Tests with mocked external services

use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path, body_json};
use serde_json::json;

mod common;

use myapp::services::PaymentService;
use common::TestContext;

#[tokio::test]
async fn test_payment_processing_success() {
    // Start mock server
    let mock_server = MockServer::start().await;

    // Configure expected request/response
    Mock::given(method("POST"))
        .and(path("/v1/charges"))
        .and(body_json(json!({
            "amount": 1000,
            "currency": "usd"
        })))
        .respond_with(ResponseTemplate::new(200)
            .set_body_json(json!({
                "id": "ch_123",
                "status": "succeeded",
                "amount": 1000
            })))
        .expect(1) // Verify exactly one call
        .mount(&mock_server)
        .await;

    // Create service pointing to mock
    let ctx = TestContext::new().await;
    let service = PaymentService::new(&mock_server.uri());

    // Execute
    let result = service.charge(1000, "usd").await;

    // Verify
    assert!(result.is_ok());
    let charge = result.unwrap();
    assert_eq!(charge.id, "ch_123");
    assert_eq!(charge.status, "succeeded");
}

#[tokio::test]
async fn test_payment_processing_failure() {
    let mock_server = MockServer::start().await;

    // Mock a declined payment
    Mock::given(method("POST"))
        .and(path("/v1/charges"))
        .respond_with(ResponseTemplate::new(402)
            .set_body_json(json!({
                "error": {
                    "code": "card_declined",
                    "message": "Your card was declined"
                }
            })))
        .mount(&mock_server)
        .await;

    let service = PaymentService::new(&mock_server.uri());

    let result = service.charge(1000, "usd").await;

    assert!(result.is_err());
    let error = result.unwrap_err();
    assert!(error.to_string().contains("declined"));
}

#[tokio::test]
async fn test_payment_service_retry_on_timeout() {
    let mock_server = MockServer::start().await;

    // First request times out, second succeeds
    Mock::given(method("POST"))
        .and(path("/v1/charges"))
        .respond_with(ResponseTemplate::new(200)
            .set_body_json(json!({
                "id": "ch_456",
                "status": "succeeded"
            }))
            .set_delay(std::time::Duration::from_millis(50)))
        .expect(1)
        .mount(&mock_server)
        .await;

    let service = PaymentService::new(&mock_server.uri())
        .with_timeout(std::time::Duration::from_millis(100));

    let result = service.charge(1000, "usd").await;

    assert!(result.is_ok());
}
```

---

## Test Organization Patterns

Use modules to organize related tests.

```rust
// tests/user_tests.rs
// Organized test module structure

mod common;

/// Tests for user creation
mod create {
    use super::common::{setup, TestUser};
    use myapp::services::UserService;

    #[test]
    fn with_valid_data_succeeds() {
        setup();
        let service = UserService::new();
        let user = TestUser::random();

        let result = service.create_from_fixture(&user);

        assert!(result.is_ok());
    }

    #[test]
    fn with_duplicate_email_fails() {
        setup();
        let service = UserService::new();
        let user = TestUser::with_email("duplicate@example.com");

        // Create first user
        service.create_from_fixture(&user).unwrap();

        // Attempt duplicate
        let result = service.create_from_fixture(&user);

        assert!(result.is_err());
    }

    #[test]
    fn with_empty_name_fails() {
        setup();
        let service = UserService::new();

        let result = service.create("valid@example.com", "");

        assert!(result.is_err());
    }
}

/// Tests for user retrieval
mod find {
    use super::common::{setup, TestUser};
    use myapp::services::UserService;

    #[test]
    fn existing_user_returns_some() {
        setup();
        let service = UserService::new();
        let user = TestUser::random();
        let created = service.create_from_fixture(&user).unwrap();

        let found = service.find(created.id).unwrap();

        assert!(found.is_some());
        assert_eq!(found.unwrap().id, created.id);
    }

    #[test]
    fn missing_user_returns_none() {
        setup();
        let service = UserService::new();
        let missing_id = uuid::Uuid::new_v4();

        let found = service.find(missing_id).unwrap();

        assert!(found.is_none());
    }
}

/// Tests for user deletion
mod delete {
    use super::common::{setup, TestUser};
    use myapp::services::UserService;

    #[test]
    fn existing_user_succeeds() {
        setup();
        let service = UserService::new();
        let user = TestUser::random();
        let created = service.create_from_fixture(&user).unwrap();

        let result = service.delete(created.id);

        assert!(result.is_ok());

        // Verify deleted
        let found = service.find(created.id).unwrap();
        assert!(found.is_none());
    }
}
```

---

## Controlling Test Execution Order

Some tests require sequential execution due to shared resources.

```rust
// tests/sequential_tests.rs
// Tests that must run sequentially

use serial_test::serial;

mod common;

use myapp::services::CacheService;

// These tests share the same cache and must run one at a time
#[test]
#[serial]
fn test_cache_set() {
    let cache = CacheService::shared();
    cache.clear();

    cache.set("key1", "value1");

    assert_eq!(cache.get("key1"), Some("value1".to_string()));
}

#[test]
#[serial]
fn test_cache_overwrite() {
    let cache = CacheService::shared();
    cache.clear();

    cache.set("key1", "first");
    cache.set("key1", "second");

    assert_eq!(cache.get("key1"), Some("second".to_string()));
}

#[test]
#[serial]
fn test_cache_expiration() {
    let cache = CacheService::shared();
    cache.clear();

    cache.set_with_ttl("expiring", "value", std::time::Duration::from_millis(50));

    std::thread::sleep(std::time::Duration::from_millis(100));

    assert_eq!(cache.get("expiring"), None);
}

// Parallel tests are fine when they use isolated resources
#[test]
fn test_independent_operation_1() {
    // This test uses its own resources
    let local_data = vec![1, 2, 3];
    assert_eq!(local_data.len(), 3);
}

#[test]
fn test_independent_operation_2() {
    // This test also uses its own resources
    let local_data = vec![4, 5, 6, 7];
    assert_eq!(local_data.len(), 4);
}
```

---

## Running Tests

Cargo provides flexible options for running tests.

```bash
# Run all tests
cargo test

# Run integration tests only (skip unit tests)
cargo test --test '*'

# Run a specific test file
cargo test --test user_tests

# Run tests matching a pattern
cargo test user_creation

# Run tests with output visible
cargo test -- --nocapture

# Run tests sequentially (useful for debugging)
cargo test -- --test-threads=1

# Run only ignored tests
cargo test -- --ignored

# Run with release optimizations (faster execution)
cargo test --release

# Show test timing information
cargo test -- -Z unstable-options --report-time
```

---

## Test Flow Visualization

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Cargo as cargo test
    participant Setup as Test Setup
    participant SUT as System Under Test
    participant Assert as Assertions
    participant Cleanup as Teardown

    Dev->>Cargo: cargo test
    Cargo->>Setup: Initialize test context
    Setup->>Setup: Load fixtures
    Setup->>SUT: Execute test code
    SUT->>Assert: Return results
    Assert->>Assert: Verify expectations
    Assert->>Cleanup: Test complete
    Cleanup->>Cleanup: Rollback/cleanup
    Cleanup->>Cargo: Report result
    Cargo->>Dev: Test summary
```

---

## Best Practices Summary

1. **Keep tests isolated** - Each test should set up and tear down its own state
2. **Use transactions for database tests** - Rollback provides automatic cleanup
3. **Name tests descriptively** - Test names should describe the scenario and expected outcome
4. **Share fixtures, not state** - Use common modules for fixtures, not shared mutable state
5. **Test edge cases** - Empty inputs, missing data, invalid formats
6. **Mock external services** - Use wiremock or similar for HTTP dependencies
7. **Run tests in CI** - Include integration tests in your continuous integration pipeline
8. **Use appropriate timeouts** - Async tests should have reasonable timeouts

---

*Need visibility into your Rust application's test coverage and performance? [OneUptime](https://oneuptime.com) provides monitoring and observability for your entire stack.*

**Related Reading:**
- [How to Build Production-Ready REST APIs in Rust with Axum](https://oneuptime.com/blog/post/2026-01-07-rust-axum-rest-api/view)
- [How to Write Integration Tests for Rust APIs with Testcontainers](https://oneuptime.com/blog/post/2026-01-07-rust-testcontainers/view)
- [How to Instrument Rust Applications with OpenTelemetry](https://oneuptime.com/blog/post/2026-01-07-rust-opentelemetry-instrumentation/view)
