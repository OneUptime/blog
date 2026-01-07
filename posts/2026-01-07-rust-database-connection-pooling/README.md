# How to Handle Database Connection Pooling in Rust with SQLx and Deadpool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Database, Connection Pooling, SQLx, Deadpool, PostgreSQL, MySQL, Performance

Description: Learn how to implement database connection pooling in Rust using SQLx and Deadpool. This guide covers pool configuration, health checks, connection lifecycle management, and best practices for production.

---

> Database connections are expensive. Creating a new connection for every query means TCP handshakes, authentication, and resource allocation on every request. Connection pooling reuses connections, dramatically improving throughput and reducing latency.

This guide covers two popular approaches: SQLx's built-in pool and Deadpool for more advanced use cases. Both are production-tested and widely used in the Rust ecosystem.

---

## Why Connection Pooling?

Without pooling:
```
Request → Connect (50-100ms) → Query (5ms) → Disconnect → Response
```

With pooling:
```
Request → Get Connection (0.1ms) → Query (5ms) → Return to Pool → Response
```

Benefits:
- **Reduced latency** - Reuse established connections
- **Better throughput** - Support more concurrent requests
- **Resource management** - Limit database connections
- **Graceful degradation** - Queue requests when at capacity

---

## SQLx with Built-in Pooling

SQLx is Rust's most popular async database library with compile-time query verification.

### Setup

```toml
[dependencies]
sqlx = { version = "0.7", features = [
    "runtime-tokio",     # Async runtime
    "tls-rustls",        # TLS support
    "postgres",          # PostgreSQL driver
    # "mysql",           # MySQL driver
    # "sqlite",          # SQLite driver
    "uuid",              # UUID support
    "chrono",            # DateTime support
    "json",              # JSON support
] }
tokio = { version = "1", features = ["full"] }
```

### Basic Pool Configuration

```rust
// src/db.rs
// Database connection pool with SQLx

use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    PgPool,
};
use std::time::Duration;

/// Database configuration
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub connect_timeout: Duration,
    pub idle_timeout: Duration,
    pub max_lifetime: Duration,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 5432,
            database: "app".to_string(),
            username: "postgres".to_string(),
            password: "".to_string(),
            max_connections: 10,
            min_connections: 1,
            connect_timeout: Duration::from_secs(5),
            idle_timeout: Duration::from_secs(600),
            max_lifetime: Duration::from_secs(1800),
        }
    }
}

/// Create a configured database pool
pub async fn create_pool(config: &DatabaseConfig) -> Result<PgPool, sqlx::Error> {
    // Build connection options
    let connect_options = PgConnectOptions::new()
        .host(&config.host)
        .port(config.port)
        .database(&config.database)
        .username(&config.username)
        .password(&config.password)
        // Enable statement caching for better performance
        .statement_cache_capacity(256);

    // Build pool with configuration
    let pool = PgPoolOptions::new()
        // Maximum number of connections in the pool
        .max_connections(config.max_connections)
        // Minimum connections to keep open (warm pool)
        .min_connections(config.min_connections)
        // Timeout for acquiring a connection from pool
        .acquire_timeout(config.connect_timeout)
        // How long a connection can be idle before being closed
        .idle_timeout(Some(config.idle_timeout))
        // Maximum lifetime of a connection (prevents stale connections)
        .max_lifetime(Some(config.max_lifetime))
        // Run this SQL on every new connection
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                // Set session parameters
                sqlx::query("SET timezone = 'UTC'")
                    .execute(conn)
                    .await?;
                Ok(())
            })
        })
        .connect_with(connect_options)
        .await?;

    tracing::info!(
        max_connections = config.max_connections,
        min_connections = config.min_connections,
        "Database pool created"
    );

    Ok(pool)
}

/// Create pool from DATABASE_URL environment variable
pub async fn create_pool_from_env() -> Result<PgPool, sqlx::Error> {
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    PgPoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&database_url)
        .await
}
```

### Using the Pool

```rust
// src/repository.rs
// Database operations using connection pool

use sqlx::{FromRow, PgPool, Row};
use uuid::Uuid;

#[derive(Debug, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Find user by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, sqlx::Error> {
        // Connection is automatically acquired and returned to pool
        sqlx::query_as!(
            User,
            r#"
            SELECT id, email, name, created_at
            FROM users
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// Find user by email
    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as!(
            User,
            r#"
            SELECT id, email, name, created_at
            FROM users
            WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// Create a new user
    pub async fn create(&self, email: &str, name: &str) -> Result<User, sqlx::Error> {
        sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, email, name, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id, email, name, created_at
            "#,
            Uuid::new_v4(),
            email,
            name
        )
        .fetch_one(&self.pool)
        .await
    }

    /// List users with pagination
    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<User>, sqlx::Error> {
        sqlx::query_as!(
            User,
            r#"
            SELECT id, email, name, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await
    }
}
```

### Transaction Support

```rust
// src/repository.rs (continued)
// Transaction handling

impl UserRepository {
    /// Create user with profile in a transaction
    pub async fn create_with_profile(
        &self,
        email: &str,
        name: &str,
        bio: &str,
    ) -> Result<(User, Profile), sqlx::Error> {
        // Start transaction
        let mut tx = self.pool.begin().await?;

        // Create user
        let user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, email, name, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id, email, name, created_at
            "#,
            Uuid::new_v4(),
            email,
            name
        )
        .fetch_one(&mut *tx)
        .await?;

        // Create profile
        let profile = sqlx::query_as!(
            Profile,
            r#"
            INSERT INTO profiles (user_id, bio)
            VALUES ($1, $2)
            RETURNING user_id, bio
            "#,
            user.id,
            bio
        )
        .fetch_one(&mut *tx)
        .await?;

        // Commit transaction
        tx.commit().await?;

        Ok((user, profile))
    }

    /// Transfer balance between users (requires atomicity)
    pub async fn transfer_balance(
        &self,
        from_user: Uuid,
        to_user: Uuid,
        amount: i64,
    ) -> Result<(), TransferError> {
        let mut tx = self.pool.begin().await?;

        // Lock and debit from sender
        let from_balance: i64 = sqlx::query_scalar(
            "SELECT balance FROM accounts WHERE user_id = $1 FOR UPDATE"
        )
        .bind(from_user)
        .fetch_one(&mut *tx)
        .await?;

        if from_balance < amount {
            return Err(TransferError::InsufficientFunds);
        }

        sqlx::query("UPDATE accounts SET balance = balance - $1 WHERE user_id = $2")
            .bind(amount)
            .bind(from_user)
            .execute(&mut *tx)
            .await?;

        // Credit to receiver
        sqlx::query("UPDATE accounts SET balance = balance + $1 WHERE user_id = $2")
            .bind(amount)
            .bind(to_user)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        Ok(())
    }
}

#[derive(Debug, sqlx::FromRow)]
pub struct Profile {
    pub user_id: Uuid,
    pub bio: String,
}

#[derive(Debug, thiserror::Error)]
pub enum TransferError {
    #[error("Insufficient funds")]
    InsufficientFunds,
    #[error("Database error")]
    Database(#[from] sqlx::Error),
}
```

---

## Advanced Pooling with Deadpool

Deadpool provides more control over pool behavior and works with any database driver.

### Setup

```toml
[dependencies]
deadpool = "0.10"
deadpool-postgres = "0.12"
tokio-postgres = "0.7"
tokio = { version = "1", features = ["full"] }
```

### Deadpool Configuration

```rust
// src/db_deadpool.rs
// Advanced connection pooling with Deadpool

use deadpool_postgres::{
    Config, CreatePoolError, Manager, ManagerConfig, Pool, PoolError, RecyclingMethod, Runtime,
};
use tokio_postgres::NoTls;

/// Create a Deadpool connection pool
pub fn create_deadpool(config: &DatabaseConfig) -> Result<Pool, CreatePoolError> {
    let mut cfg = Config::new();

    cfg.host = Some(config.host.clone());
    cfg.port = Some(config.port);
    cfg.dbname = Some(config.database.clone());
    cfg.user = Some(config.username.clone());
    cfg.password = Some(config.password.clone());

    // Pool configuration
    cfg.pool = Some(deadpool_postgres::PoolConfig {
        max_size: config.max_connections as usize,
        timeouts: deadpool::managed::Timeouts {
            wait: Some(config.connect_timeout),
            create: Some(config.connect_timeout),
            recycle: Some(Duration::from_secs(5)),
        },
        queue_mode: deadpool::managed::QueueMode::Fifo,
    });

    // Manager configuration
    cfg.manager = Some(ManagerConfig {
        recycling_method: RecyclingMethod::Fast,
    });

    cfg.create_pool(Some(Runtime::Tokio1), NoTls)
}

/// Deadpool with custom manager for health checks
pub async fn create_deadpool_with_health_check() -> Pool {
    let manager_config = ManagerConfig {
        // Verify connections before returning from pool
        recycling_method: RecyclingMethod::Verified,
    };

    let pg_config: tokio_postgres::Config = "host=localhost user=postgres dbname=app"
        .parse()
        .unwrap();

    let manager = Manager::from_config(pg_config, NoTls, manager_config);

    Pool::builder(manager)
        .max_size(16)
        .build()
        .unwrap()
}
```

### Using Deadpool

```rust
// src/repository_deadpool.rs
// Repository using Deadpool

use deadpool_postgres::Pool;
use tokio_postgres::Row;
use uuid::Uuid;

pub struct UserRepositoryDeadpool {
    pool: Pool,
}

impl UserRepositoryDeadpool {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, RepositoryError> {
        // Get connection from pool
        let client = self.pool.get().await?;

        // Execute query
        let row = client
            .query_opt(
                "SELECT id, email, name, created_at FROM users WHERE id = $1",
                &[&id],
            )
            .await?;

        Ok(row.map(|r| User {
            id: r.get("id"),
            email: r.get("email"),
            name: r.get("name"),
            created_at: r.get("created_at"),
        }))
        // Connection automatically returned to pool when `client` is dropped
    }

    pub async fn create(&self, email: &str, name: &str) -> Result<User, RepositoryError> {
        let client = self.pool.get().await?;

        let row = client
            .query_one(
                "INSERT INTO users (id, email, name, created_at)
                 VALUES ($1, $2, $3, NOW())
                 RETURNING id, email, name, created_at",
                &[&Uuid::new_v4(), &email, &name],
            )
            .await?;

        Ok(User {
            id: row.get("id"),
            email: row.get("email"),
            name: row.get("name"),
            created_at: row.get("created_at"),
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("Pool error")]
    Pool(#[from] deadpool_postgres::PoolError),
    #[error("Database error")]
    Database(#[from] tokio_postgres::Error),
}
```

---

## Health Checks

Implement health checks to verify database connectivity.

```rust
// src/health.rs
// Database health checks

use sqlx::PgPool;
use std::time::{Duration, Instant};

#[derive(Debug, serde::Serialize)]
pub struct DatabaseHealth {
    pub status: HealthStatus,
    pub latency_ms: u64,
    pub pool_size: u32,
    pub pool_idle: u32,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

/// Check database health
pub async fn check_database_health(pool: &PgPool) -> DatabaseHealth {
    let start = Instant::now();

    // Try to execute a simple query
    let query_result = sqlx::query("SELECT 1")
        .execute(pool)
        .await;

    let latency = start.elapsed();

    // Get pool statistics
    let pool_size = pool.size();
    let pool_idle = pool.num_idle();

    let status = match query_result {
        Ok(_) => {
            if latency > Duration::from_millis(100) {
                HealthStatus::Degraded
            } else {
                HealthStatus::Healthy
            }
        }
        Err(_) => HealthStatus::Unhealthy,
    };

    DatabaseHealth {
        status,
        latency_ms: latency.as_millis() as u64,
        pool_size,
        pool_idle,
    }
}

/// Kubernetes readiness probe
pub async fn readiness_check(pool: &PgPool) -> bool {
    sqlx::query("SELECT 1")
        .execute(pool)
        .await
        .is_ok()
}

/// Detailed health check with connection validation
pub async fn detailed_health_check(pool: &PgPool) -> DetailedHealth {
    let mut checks = Vec::new();

    // Check pool connectivity
    let pool_check = check_pool_connectivity(pool).await;
    checks.push(("pool_connectivity", pool_check.is_ok()));

    // Check read capability
    let read_check = check_read_capability(pool).await;
    checks.push(("read_capability", read_check.is_ok()));

    // Check write capability (optional, use with caution)
    // let write_check = check_write_capability(pool).await;
    // checks.push(("write_capability", write_check.is_ok()));

    let all_healthy = checks.iter().all(|(_, status)| *status);

    DetailedHealth {
        status: if all_healthy { "healthy" } else { "unhealthy" },
        checks,
        pool_size: pool.size(),
        pool_idle: pool.num_idle(),
    }
}

async fn check_pool_connectivity(pool: &PgPool) -> Result<(), sqlx::Error> {
    pool.acquire().await.map(|_| ())
}

async fn check_read_capability(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT 1").execute(pool).await.map(|_| ())
}

#[derive(Debug, serde::Serialize)]
pub struct DetailedHealth {
    pub status: &'static str,
    pub checks: Vec<(&'static str, bool)>,
    pub pool_size: u32,
    pub pool_idle: u32,
}
```

---

## Connection Pool Metrics

```rust
// src/metrics.rs
// Pool metrics for monitoring

use prometheus::{Gauge, GaugeVec, Opts, Registry};
use sqlx::PgPool;

pub struct PoolMetrics {
    pool_size: Gauge,
    pool_idle: Gauge,
    pool_active: Gauge,
}

impl PoolMetrics {
    pub fn new(registry: &Registry) -> Self {
        let pool_size = Gauge::new(
            "db_pool_size",
            "Total number of connections in the pool"
        ).unwrap();

        let pool_idle = Gauge::new(
            "db_pool_idle_connections",
            "Number of idle connections in the pool"
        ).unwrap();

        let pool_active = Gauge::new(
            "db_pool_active_connections",
            "Number of active connections in the pool"
        ).unwrap();

        registry.register(Box::new(pool_size.clone())).unwrap();
        registry.register(Box::new(pool_idle.clone())).unwrap();
        registry.register(Box::new(pool_active.clone())).unwrap();

        Self {
            pool_size,
            pool_idle,
            pool_active,
        }
    }

    pub fn update(&self, pool: &PgPool) {
        let size = pool.size() as f64;
        let idle = pool.num_idle() as f64;

        self.pool_size.set(size);
        self.pool_idle.set(idle);
        self.pool_active.set(size - idle);
    }
}

/// Background task to update metrics periodically
pub async fn metrics_collector(pool: PgPool, metrics: PoolMetrics) {
    loop {
        metrics.update(&pool);
        tokio::time::sleep(std::time::Duration::from_secs(10)).await;
    }
}
```

---

## Configuration Best Practices

### Pool Sizing Formula

```rust
// Optimal pool size calculation
fn calculate_optimal_pool_size() -> u32 {
    let cpu_cores = num_cpus::get() as u32;

    // For CPU-bound queries: connections = CPU cores
    // For I/O-bound queries: connections = CPU cores * 2
    // General recommendation: (CPU cores * 2) + spinning_disk_count

    let optimal = cpu_cores * 2 + 1;

    // Cap at reasonable maximum
    std::cmp::min(optimal, 20)
}
```

### Environment-Based Configuration

```rust
// src/config.rs
// Configuration from environment

impl DatabaseConfig {
    pub fn from_env() -> Self {
        Self {
            host: std::env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string()),
            port: std::env::var("DB_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(5432),
            database: std::env::var("DB_NAME").unwrap_or_else(|_| "app".to_string()),
            username: std::env::var("DB_USER").unwrap_or_else(|_| "postgres".to_string()),
            password: std::env::var("DB_PASSWORD").unwrap_or_default(),
            max_connections: std::env::var("DB_MAX_CONNECTIONS")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(10),
            min_connections: std::env::var("DB_MIN_CONNECTIONS")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(1),
            connect_timeout: Duration::from_secs(
                std::env::var("DB_CONNECT_TIMEOUT_SECS")
                    .ok()
                    .and_then(|p| p.parse().ok())
                    .unwrap_or(5),
            ),
            idle_timeout: Duration::from_secs(
                std::env::var("DB_IDLE_TIMEOUT_SECS")
                    .ok()
                    .and_then(|p| p.parse().ok())
                    .unwrap_or(600),
            ),
            max_lifetime: Duration::from_secs(
                std::env::var("DB_MAX_LIFETIME_SECS")
                    .ok()
                    .and_then(|p| p.parse().ok())
                    .unwrap_or(1800),
            ),
        }
    }
}
```

---

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection timeout | Pool exhausted | Increase max_connections or optimize queries |
| Stale connections | Long-lived connections | Set max_lifetime to recycle connections |
| Slow queries | Missing indexes | Analyze query plans, add indexes |
| Connection leaks | Unreturned connections | Ensure connections are dropped/returned |
| High latency spikes | Cold pool | Set min_connections to keep pool warm |

---

*Want to monitor your database connections and query performance? [OneUptime](https://oneuptime.com) provides database monitoring with connection pool metrics and slow query alerts.*

**Related Reading:**
- [How to Build Production-Ready REST APIs in Rust with Axum](https://oneuptime.com/blog/post/2026-01-07-rust-axum-rest-api/view)
- [When Performance Matters, Skip the ORM](https://oneuptime.com/blog/post/2025-11-13-when-performance-matters-skip-the-orm/view)
