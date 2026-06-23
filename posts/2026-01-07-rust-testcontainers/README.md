# How to Write Integration Tests for Rust APIs with Testcontainers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Testing, Integration Test, Testcontainers, Docker, PostgreSQL, Redis, Database Testing

Description: Learn how to write reliable integration tests for Rust APIs using Testcontainers. This guide covers database testing, Redis, test isolation, parallel test execution, and cleanup patterns.

---

> Unit tests verify code in isolation, but integration tests verify your code works with real dependencies. Testcontainers spins up real Docker containers for your tests, eliminating flaky mocks and catching real integration issues.

Testing against real databases catches issues that mocks miss: SQL syntax, constraints, transactions, and connection handling.

---

## Why Testcontainers?

```mermaid
graph LR
    A[Test Code] --> B[Testcontainers]
    B --> C[Docker Daemon]
    C --> D[PostgreSQL Container]
    C --> E[Redis Container]
    C --> F[Kafka Container]

    D --> G[Real Database Behavior]
    E --> H[Real Cache Behavior]
    F --> I[Real Message Queue]
```

---

## Project Setup

```toml
[package]
name = "myapi"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web framework

axum = "0.8"
tokio = { version = "1", features = ["full"] }

# Database
sqlx = { version = "0.9", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }

# Redis
redis = { version = "1.2", features = ["tokio-comp"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }

[dev-dependencies]
# Testcontainers
testcontainers-modules = { version = "0.15", features = ["postgres", "redis", "kafka"] }

# Test utilities
reqwest = { version = "0.13", features = ["json"] }
tokio-test = "0.4"
```

---

## Basic Container Setup

```rust
// tests/common/mod.rs
// Shared test utilities and container setup

use testcontainers_modules::{
    postgres::Postgres,
    redis::{Redis, REDIS_PORT},
    testcontainers::{runners::AsyncRunner, ContainerAsync},
};
use sqlx::PgPool;

/// PostgreSQL container for testing
pub struct TestPostgres {
    _container: ContainerAsync<Postgres>,
    pub pool: PgPool,
    pub url: String,
}

impl TestPostgres {
    /// Start a PostgreSQL container and return connection pool
    pub async fn new() -> Self {
        // Start PostgreSQL container
        let container = Postgres::default()
            .start()
            .await
            .expect("Failed to start PostgreSQL container");

        // Get connection info
        let host = container.get_host().await.expect("Failed to get host");
        let port = container
            .get_host_port_ipv4(5432)
            .await
            .expect("Failed to get PostgreSQL port");
        let url = format!(
            "postgres://postgres:postgres@{}:{}/postgres",
            host, port
        );

        // Create connection pool
        let pool = PgPool::connect(&url)
            .await
            .expect("Failed to connect to PostgreSQL");

        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("Failed to run migrations");

        Self {
            _container: container,
            pool,
            url,
        }
    }

    /// Clean up database between tests
    pub async fn cleanup(&self) {
        // Truncate all tables (faster than dropping container)
        sqlx::query("TRUNCATE users, posts, comments RESTART IDENTITY CASCADE")
            .execute(&self.pool)
            .await
            .expect("Failed to truncate tables");
    }
}

/// Redis container for testing
pub struct TestRedis {
    _container: ContainerAsync<Redis>,
    pub client: redis::Client,
    pub url: String,
}

impl TestRedis {
    pub async fn new() -> Self {
        let container = Redis::default()
            .start()
            .await
            .expect("Failed to start Redis container");
        let host = container.get_host().await.expect("Failed to get host");
        let port = container
            .get_host_port_ipv4(REDIS_PORT)
            .await
            .expect("Failed to get Redis port");
        let url = format!("redis://{}:{}/", host, port);

        let client = redis::Client::open(url.as_str())
            .expect("Failed to create Redis client");

        Self {
            _container: container,
            client,
            url,
        }
    }

    /// Get async connection
    pub async fn connection(&self) -> redis::aio::MultiplexedConnection {
        self.client
            .get_multiplexed_async_connection()
            .await
            .expect("Failed to get Redis connection")
    }

    /// Flush all data
    pub async fn cleanup(&self) {
        let mut conn = self.connection().await;
        redis::cmd("FLUSHALL")
            .query_async::<()>(&mut conn)
            .await
            .expect("Failed to flush Redis");
    }
}
```

---

## Testing Database Operations

```rust
// tests/user_repository_test.rs
// Integration tests for user repository

mod common;

use myapi::repository::UserRepository;
use myapi::models::CreateUser;
use uuid::Uuid;

#[tokio::test]
async fn test_create_user() {
    // Arrange: Start PostgreSQL container
    let postgres = common::TestPostgres::new().await;
    let repo = UserRepository::new(postgres.pool.clone());

    // Act: Create a user
    let create_user = CreateUser {
        email: "test@example.com".to_string(),
        username: "testuser".to_string(),
        password_hash: "hashed".to_string(),
    };

    let user = repo.create(create_user).await.expect("Failed to create user");

    // Assert: User was created with correct data
    assert_eq!(user.email, "test@example.com");
    assert_eq!(user.username, "testuser");
    assert!(user.id != Uuid::nil());
}

#[tokio::test]
async fn test_find_user_by_email() {
    let postgres = common::TestPostgres::new().await;
    let repo = UserRepository::new(postgres.pool.clone());

    // Create user first
    let create_user = CreateUser {
        email: "find@example.com".to_string(),
        username: "finduser".to_string(),
        password_hash: "hashed".to_string(),
    };
    repo.create(create_user).await.unwrap();

    // Find by email
    let found = repo.find_by_email("find@example.com").await.unwrap();

    assert!(found.is_some());
    assert_eq!(found.unwrap().email, "find@example.com");
}

#[tokio::test]
async fn test_user_email_uniqueness() {
    let postgres = common::TestPostgres::new().await;
    let repo = UserRepository::new(postgres.pool.clone());

    // Create first user
    let create_user = CreateUser {
        email: "unique@example.com".to_string(),
        username: "user1".to_string(),
        password_hash: "hashed".to_string(),
    };
    repo.create(create_user).await.unwrap();

    // Try to create duplicate email
    let duplicate = CreateUser {
        email: "unique@example.com".to_string(),
        username: "user2".to_string(),
        password_hash: "hashed".to_string(),
    };
    let result = repo.create(duplicate).await;

    // Should fail with unique constraint violation
    assert!(result.is_err());
}

#[tokio::test]
async fn test_transaction_rollback() {
    let postgres = common::TestPostgres::new().await;
    let pool = postgres.pool.clone();

    // Start transaction
    let mut tx = pool.begin().await.unwrap();

    // Insert user within transaction
    sqlx::query!(
        "INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)",
        Uuid::new_v4(),
        "rollback@example.com",
        "rollbackuser",
        "hashed"
    )
    .execute(&mut *tx)
    .await
    .unwrap();

    // Rollback transaction
    tx.rollback().await.unwrap();

    // Verify user was not persisted
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users WHERE email = $1")
        .bind("rollback@example.com")
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(count.0, 0);
}
```

---

## Testing Full API Endpoints

```rust
// tests/api_test.rs
// End-to-end API tests with real database

mod common;

use axum::Router;
use myapi::{routes, AppState};
use reqwest::StatusCode;

/// Start the API server with test database
async fn spawn_app(postgres: &common::TestPostgres) -> String {
    // Build application with test database
    let state = AppState {
        db: postgres.pool.clone(),
    };

    let app = Router::new()
        .nest("/api", routes::api_routes())
        .with_state(state);

    // Bind to random port
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .unwrap();
    let addr = listener.local_addr().unwrap();

    // Spawn server in background
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    format!("http://{}", addr)
}

#[tokio::test]
async fn test_create_user_endpoint() {
    let postgres = common::TestPostgres::new().await;
    let base_url = spawn_app(&postgres).await;
    let client = reqwest::Client::new();

    // Create user via API
    let response = client
        .post(&format!("{}/api/users", base_url))
        .json(&serde_json::json!({
            "email": "api@example.com",
            "username": "apiuser",
            "password": "secretpassword123"
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let user: serde_json::Value = response.json().await.unwrap();
    assert_eq!(user["email"], "api@example.com");
    assert!(user["id"].is_string());
}

#[tokio::test]
async fn test_get_user_endpoint() {
    let postgres = common::TestPostgres::new().await;
    let base_url = spawn_app(&postgres).await;
    let client = reqwest::Client::new();

    // First create a user
    let create_response = client
        .post(&format!("{}/api/users", base_url))
        .json(&serde_json::json!({
            "email": "get@example.com",
            "username": "getuser",
            "password": "password123"
        }))
        .send()
        .await
        .unwrap();

    let created: serde_json::Value = create_response.json().await.unwrap();
    let user_id = created["id"].as_str().unwrap();

    // Get the user
    let get_response = client
        .get(&format!("{}/api/users/{}", base_url, user_id))
        .send()
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::OK);

    let user: serde_json::Value = get_response.json().await.unwrap();
    assert_eq!(user["email"], "get@example.com");
}

#[tokio::test]
async fn test_user_not_found() {
    let postgres = common::TestPostgres::new().await;
    let base_url = spawn_app(&postgres).await;
    let client = reqwest::Client::new();

    let response = client
        .get(&format!("{}/api/users/{}", base_url, uuid::Uuid::new_v4()))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
```

---

## Testing with Redis Cache

```rust
// tests/cache_test.rs
// Testing Redis caching behavior

mod common;

use myapi::cache::UserCache;
use myapi::models::User;
use uuid::Uuid;
use chrono::Utc;

#[tokio::test]
async fn test_cache_hit() {
    let redis = common::TestRedis::new().await;
    let cache = UserCache::new(redis.client.clone());

    let user = User {
        id: Uuid::new_v4(),
        email: "cached@example.com".to_string(),
        username: "cacheduser".to_string(),
        created_at: Utc::now(),
    };

    // Set cache
    cache.set(&user).await.unwrap();

    // Get from cache
    let cached = cache.get(user.id).await.unwrap();

    assert!(cached.is_some());
    assert_eq!(cached.unwrap().email, user.email);
}

#[tokio::test]
async fn test_cache_miss() {
    let redis = common::TestRedis::new().await;
    let cache = UserCache::new(redis.client.clone());

    let result = cache.get(Uuid::new_v4()).await.unwrap();

    assert!(result.is_none());
}

#[tokio::test]
async fn test_cache_expiration() {
    let redis = common::TestRedis::new().await;
    let cache = UserCache::with_ttl(redis.client.clone(), 1); // 1 second TTL

    let user = User {
        id: Uuid::new_v4(),
        email: "expiring@example.com".to_string(),
        username: "expiringuser".to_string(),
        created_at: Utc::now(),
    };

    cache.set(&user).await.unwrap();

    // Verify it's cached
    assert!(cache.get(user.id).await.unwrap().is_some());

    // Wait for expiration
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    // Should be expired
    assert!(cache.get(user.id).await.unwrap().is_none());
}

#[tokio::test]
async fn test_cache_invalidation() {
    let redis = common::TestRedis::new().await;
    let cache = UserCache::new(redis.client.clone());

    let user = User {
        id: Uuid::new_v4(),
        email: "invalidate@example.com".to_string(),
        username: "invalidateuser".to_string(),
        created_at: Utc::now(),
    };

    cache.set(&user).await.unwrap();
    cache.invalidate(user.id).await.unwrap();

    let result = cache.get(user.id).await.unwrap();
    assert!(result.is_none());
}
```

---

## Parallel Test Execution

```rust
// tests/parallel_test.rs
// Test isolation for parallel execution

mod common;

use common::TestPostgres;
use sqlx::postgres::PgPoolOptions;

/// Each test gets its own schema for isolation
struct IsolatedTestDb {
    pool: sqlx::PgPool,
    schema: String,
}

impl IsolatedTestDb {
    async fn new(postgres: &TestPostgres, test_name: &str) -> Self {
        // Create unique schema for this test
        let schema = format!("test_{}", test_name.replace("::", "_"));

        sqlx::query(&format!("CREATE SCHEMA IF NOT EXISTS {}", schema))
            .execute(&postgres.pool)
            .await
            .unwrap();

        // Build a pool whose connections always use this schema.
        let search_path = schema.clone();
        let pool = PgPoolOptions::new()
            .after_connect(move |conn, _meta| {
                let search_path = search_path.clone();
                Box::pin(async move {
                    sqlx::query(&format!("SET search_path TO {}, public", search_path))
                        .execute(conn)
                        .await?;
                    Ok(())
                })
            })
            .connect(&postgres.url)
            .await
            .unwrap();

        // Run migrations in the isolated schema.
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .unwrap();

        Self { pool, schema }
    }
}

impl Drop for IsolatedTestDb {
    fn drop(&mut self) {
        // Schema will be cleaned up when container stops
    }
}

#[tokio::test]
async fn test_parallel_1() {
    let postgres = TestPostgres::new().await;

    // Use transaction isolation
    let mut tx = postgres.pool.begin().await.unwrap();

    sqlx::query!(
        "INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)",
        uuid::Uuid::new_v4(),
        "parallel1@example.com",
        "parallel1",
        "hash"
    )
    .execute(&mut *tx)
    .await
    .unwrap();

    // Test assertions here

    tx.rollback().await.unwrap();
}

#[tokio::test]
async fn test_parallel_2() {
    let postgres = TestPostgres::new().await;

    let mut tx = postgres.pool.begin().await.unwrap();

    sqlx::query!(
        "INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)",
        uuid::Uuid::new_v4(),
        "parallel2@example.com",
        "parallel2",
        "hash"
    )
    .execute(&mut *tx)
    .await
    .unwrap();

    // Test assertions here

    tx.rollback().await.unwrap();
}
```

---

## Custom Container Configuration

```rust
// tests/common/custom_containers.rs
// Custom container configurations

use testcontainers_modules::{
    postgres::Postgres,
    testcontainers::ContainerAsync,
};

/// Custom PostgreSQL with specific configuration
pub fn postgres_with_config() -> Postgres {
    Postgres::default()
        .with_password("testpass")
        .with_db_name("testdb")
        .with_user("testuser")
        .with_host_auth()
        // fsync is disabled by default in the module for faster tests.
}

/// PostgreSQL with extensions
pub fn postgres_with_extensions() -> Postgres {
    Postgres::default()
        .with_db_name("testdb")
        .with_user("test")
        .with_password("test")
        .with_init_sql("CREATE EXTENSION IF NOT EXISTS hstore;".as_bytes().to_vec())
}

/// Wait for container to be ready with custom health check
pub async fn wait_for_postgres(container: &ContainerAsync<Postgres>) {
    let host = container.get_host().await.expect("Failed to get host");
    let port = container
        .get_host_port_ipv4(5432)
        .await
        .expect("Failed to get PostgreSQL port");
    let url = format!("postgres://postgres:postgres@{}:{}/postgres", host, port);

    // Retry until connection succeeds
    for _ in 0..30 {
        if sqlx::PgPool::connect(&url).await.is_ok() {
            return;
        }
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    panic!("PostgreSQL did not become ready in time");
}
```

---

## Testing with Multiple Containers

```rust
// tests/integration_test.rs
// Tests requiring multiple services

mod common;

use common::{TestPostgres, TestRedis};

/// Full integration test with database and cache
#[tokio::test]
async fn test_full_workflow() {
    // Start both containers
    let postgres = TestPostgres::new().await;
    let redis = TestRedis::new().await;

    // Build app state with both connections
    let state = myapi::AppState {
        db: postgres.pool.clone(),
        cache: redis.client.clone(),
    };

    // Test the full workflow
    let user_service = myapi::services::UserService::new(state);

    // Create user (writes to DB)
    let user = user_service
        .create_user("integration@example.com", "integrationuser", "password")
        .await
        .unwrap();

    // Get user (should cache in Redis)
    let fetched1 = user_service.get_user(user.id).await.unwrap().unwrap();
    assert_eq!(fetched1.email, "integration@example.com");

    // Get again (should hit cache)
    let fetched2 = user_service.get_user(user.id).await.unwrap().unwrap();
    assert_eq!(fetched2.id, user.id);

    // Verify cache was populated
    let mut redis_conn = redis.connection().await;
    let cached: Option<String> = redis::cmd("GET")
        .arg(format!("user:{}", user.id))
        .query_async(&mut redis_conn)
        .await
        .unwrap();
    assert!(cached.is_some());
}
```

---

## Test Fixtures

```rust
// tests/fixtures.rs
// Reusable test data

use myapi::models::{User, Post, Comment};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;

pub struct TestFixtures {
    pub users: Vec<User>,
    pub posts: Vec<Post>,
}

impl TestFixtures {
    /// Seed database with test data
    pub async fn seed(pool: &PgPool) -> Self {
        let mut users = Vec::new();
        let mut posts = Vec::new();

        // Create users
        for i in 0..5 {
            let user = sqlx::query_as!(
                User,
                r#"
                INSERT INTO users (id, email, username, password_hash, created_at)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, email, username, created_at
                "#,
                Uuid::new_v4(),
                format!("user{}@example.com", i),
                format!("user{}", i),
                "hashed",
                Utc::now()
            )
            .fetch_one(pool)
            .await
            .unwrap();

            users.push(user);
        }

        // Create posts for each user
        for user in &users {
            for j in 0..3 {
                let post = sqlx::query_as!(
                    Post,
                    r#"
                    INSERT INTO posts (id, author_id, title, content, created_at)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, author_id, title, content, created_at
                    "#,
                    Uuid::new_v4(),
                    user.id,
                    format!("Post {} by {}", j, user.username),
                    format!("Content of post {}", j),
                    Utc::now()
                )
                .fetch_one(pool)
                .await
                .unwrap();

                posts.push(post);
            }
        }

        Self { users, posts }
    }
}

#[tokio::test]
async fn test_with_fixtures() {
    let postgres = common::TestPostgres::new().await;
    let fixtures = TestFixtures::seed(&postgres.pool).await;

    // Use fixture data in tests
    assert_eq!(fixtures.users.len(), 5);
    assert_eq!(fixtures.posts.len(), 15);

    // Test queries against seeded data
    let user_posts: Vec<Post> = sqlx::query_as!(
        Post,
        "SELECT id, author_id, title, content, created_at FROM posts WHERE author_id = $1",
        fixtures.users[0].id
    )
    .fetch_all(&postgres.pool)
    .await
    .unwrap();

    assert_eq!(user_posts.len(), 3);
}
```

---

## Best Practices

| Practice | Reason |
|----------|--------|
| Use real containers | Catches real integration issues |
| Isolate tests | Prevent test interference |
| Clean up between tests | Consistent starting state |
| Reuse test helpers | Less duplicated setup code |
| Run migrations in tests | Test schema changes |
| Use fixtures for complex data | Consistent, readable tests |

---

*Need to monitor test runs and catch flaky tests? [OneUptime](https://oneuptime.com) provides CI/CD monitoring with test result tracking.*

**Related Reading:**
- [How to Mock External APIs in Rust Tests with wiremock](https://oneuptime.com/blog/post/2026-01-07-rust-wiremock-mocking/view)
- [How to Build REST APIs with Axum](https://oneuptime.com/blog/post/2026-01-07-rust-axum-rest-api/view)
