# How to Build Multi-Tenant APIs with Tenant Isolation in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Multi-Tenant, API, SaaS, Architecture

Description: A practical guide to building multi-tenant APIs in Rust with proper tenant isolation, covering middleware extraction, database-level separation, and row-level security patterns.

---

Building a SaaS product means serving multiple customers from the same codebase. Each customer (tenant) expects their data to be completely isolated from others. Get this wrong, and you have a security nightmare. Get it right, and you have a scalable foundation that serves thousands of organizations without breaking a sweat.

This guide walks through building multi-tenant APIs in Rust using Actix-web, covering everything from tenant identification to database isolation strategies.

## The Three Isolation Models

Before writing code, you need to decide how you want to isolate tenant data:

| Model | Description | Pros | Cons |
|-------|-------------|------|------|
| **Shared database, shared schema** | All tenants share tables with a tenant_id column | Simplest, cheapest | Requires discipline, risk of data leaks |
| **Shared database, separate schemas** | Each tenant gets their own database schema | Good isolation, moderate cost | Schema migrations are complex |
| **Separate databases** | Each tenant gets their own database | Maximum isolation | Most expensive, hardest to manage |

Most SaaS applications start with the shared schema approach and migrate to separate schemas or databases as compliance requirements grow. We will focus on the shared schema model with row-level security, which provides a good balance of simplicity and safety.

## Extracting Tenant from Requests

The first step is identifying which tenant is making the request. Common approaches include subdomains (acme.yourapp.com), headers (X-Tenant-ID), or JWT claims. Here is a middleware that extracts tenant information from a JWT:

```rust
use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Claims structure from your JWT
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TenantClaims {
    pub sub: String,           // User ID
    pub tenant_id: Uuid,       // Tenant ID
    pub tenant_slug: String,   // Human-readable identifier
    pub role: String,          // User's role within the tenant
    pub exp: usize,            // Expiration time
}

// Tenant context that flows through your application
#[derive(Debug, Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub tenant_slug: String,
    pub user_id: String,
    pub role: String,
}

// Validator function for actix-web-httpauth
pub async fn validate_tenant(
    req: ServiceRequest,
    credentials: BearerAuth,
) -> Result<ServiceRequest, (Error, ServiceRequest)> {
    let token = credentials.token();

    // Decode and validate the JWT
    let key = DecodingKey::from_secret(
        std::env::var("JWT_SECRET")
            .expect("JWT_SECRET must be set")
            .as_bytes()
    );

    let validation = Validation::default();

    match decode::<TenantClaims>(token, &key, &validation) {
        Ok(token_data) => {
            let claims = token_data.claims;

            // Build tenant context from claims
            let tenant_ctx = TenantContext {
                tenant_id: claims.tenant_id,
                tenant_slug: claims.tenant_slug,
                user_id: claims.sub,
                role: claims.role,
            };

            // Insert into request extensions for later use
            req.extensions_mut().insert(tenant_ctx);

            Ok(req)
        }
        Err(e) => {
            log::warn!("JWT validation failed: {}", e);
            Err((actix_web::error::ErrorUnauthorized("Invalid token"), req))
        }
    }
}
```

## Database Connection with Tenant Scope

Once you have the tenant context, every database query needs to be scoped to that tenant. The safest approach is using PostgreSQL's Row Level Security (RLS), which enforces isolation at the database level:

```rust
use deadpool_postgres::{Client, Pool};
use tokio_postgres::NoTls;
use uuid::Uuid;

// Wrapper that ensures tenant context is set for every connection
pub struct TenantScopedConnection {
    client: Client,
    tenant_id: Uuid,
}

impl TenantScopedConnection {
    // Get a connection with tenant context set
    pub async fn acquire(
        pool: &Pool,
        tenant_id: Uuid,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let client = pool.get().await?;

        // Set the tenant context for RLS policies
        // This variable is checked by PostgreSQL RLS policies
        client
            .execute(
                "SELECT set_config('app.current_tenant_id', $1, true)",
                &[&tenant_id.to_string()],
            )
            .await?;

        Ok(Self { client, tenant_id })
    }

    // Execute a query - tenant filtering happens automatically via RLS
    pub async fn query<T>(
        &self,
        statement: &str,
        params: &[&(dyn tokio_postgres::types::ToSql + Sync)],
    ) -> Result<Vec<tokio_postgres::Row>, tokio_postgres::Error> {
        self.client.query(statement, params).await
    }

    // For operations that need explicit tenant_id (like inserts)
    pub fn tenant_id(&self) -> Uuid {
        self.tenant_id
    }
}
```

## Setting Up Row Level Security

The database schema needs RLS policies that enforce tenant isolation. Here is the SQL to set it up:

```sql
-- Enable RLS on your tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Create policy that restricts access to rows matching current tenant
CREATE POLICY tenant_isolation_policy ON projects
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON tasks
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON team_members
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- The application database user must not be a superuser
-- Superusers bypass RLS entirely
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

With RLS in place, even if your application code accidentally omits a WHERE clause, PostgreSQL will only return rows belonging to the current tenant.

## Building Tenant-Aware Handlers

Now let us put it all together in an Actix-web handler:

```rust
use actix_web::{web, HttpRequest, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize)]
pub struct Project {
    id: Uuid,
    tenant_id: Uuid,
    name: String,
    description: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct CreateProject {
    name: String,
    description: Option<String>,
}

// List projects - RLS automatically filters by tenant
pub async fn list_projects(
    req: HttpRequest,
    pool: web::Data<Pool>,
) -> Result<HttpResponse> {
    // Extract tenant context from request extensions
    let tenant_ctx = req
        .extensions()
        .get::<TenantContext>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No tenant context"))?;

    // Get tenant-scoped connection
    let conn = TenantScopedConnection::acquire(&pool, tenant_ctx.tenant_id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Query without WHERE tenant_id clause - RLS handles it
    let rows = conn
        .query("SELECT id, tenant_id, name, description, created_at FROM projects ORDER BY created_at DESC", &[])
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let projects: Vec<Project> = rows
        .iter()
        .map(|row| Project {
            id: row.get("id"),
            tenant_id: row.get("tenant_id"),
            name: row.get("name"),
            description: row.get("description"),
            created_at: row.get("created_at"),
        })
        .collect();

    Ok(HttpResponse::Ok().json(projects))
}

// Create project - tenant_id comes from context, not request body
pub async fn create_project(
    req: HttpRequest,
    pool: web::Data<Pool>,
    body: web::Json<CreateProject>,
) -> Result<HttpResponse> {
    let tenant_ctx = req
        .extensions()
        .get::<TenantContext>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No tenant context"))?;

    let conn = TenantScopedConnection::acquire(&pool, tenant_ctx.tenant_id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let project_id = Uuid::new_v4();

    // Explicitly set tenant_id from context - never trust client input
    conn.query(
        "INSERT INTO projects (id, tenant_id, name, description) VALUES ($1, $2, $3, $4)",
        &[&project_id, &conn.tenant_id(), &body.name, &body.description],
    )
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "id": project_id,
        "message": "Project created"
    })))
}
```

## Preventing Cross-Tenant Access

Even with RLS, there are subtle ways to leak data between tenants. Here is a defensive wrapper that adds an extra layer of protection:

```rust
use uuid::Uuid;

// Guard that verifies resource ownership before access
pub struct TenantGuard {
    tenant_id: Uuid,
}

impl TenantGuard {
    pub fn new(tenant_id: Uuid) -> Self {
        Self { tenant_id }
    }

    // Verify a resource belongs to the current tenant
    pub fn verify_ownership<T: TenantOwned>(&self, resource: &T) -> Result<(), TenantError> {
        if resource.tenant_id() != self.tenant_id {
            log::error!(
                "Cross-tenant access attempt: requested tenant {} but resource belongs to {}",
                self.tenant_id,
                resource.tenant_id()
            );
            return Err(TenantError::CrossTenantAccess);
        }
        Ok(())
    }

    // Ensure an ID lookup returns a resource owned by current tenant
    pub async fn fetch_owned<T, F, Fut>(
        &self,
        id: Uuid,
        fetcher: F,
    ) -> Result<T, TenantError>
    where
        T: TenantOwned,
        F: FnOnce(Uuid) -> Fut,
        Fut: std::future::Future<Output = Option<T>>,
    {
        let resource = fetcher(id)
            .await
            .ok_or(TenantError::NotFound)?;

        self.verify_ownership(&resource)?;
        Ok(resource)
    }
}

// Trait for resources that belong to a tenant
pub trait TenantOwned {
    fn tenant_id(&self) -> Uuid;
}

impl TenantOwned for Project {
    fn tenant_id(&self) -> Uuid {
        self.tenant_id
    }
}

#[derive(Debug)]
pub enum TenantError {
    CrossTenantAccess,
    NotFound,
}
```

## Tenant-Aware Caching

Caching in multi-tenant systems requires careful key design to prevent data leakage:

```rust
use redis::AsyncCommands;
use uuid::Uuid;

pub struct TenantCache {
    client: redis::Client,
}

impl TenantCache {
    pub fn new(redis_url: &str) -> Result<Self, redis::RedisError> {
        let client = redis::Client::open(redis_url)?;
        Ok(Self { client })
    }

    // Build cache key with tenant prefix to ensure isolation
    fn build_key(&self, tenant_id: Uuid, key: &str) -> String {
        format!("tenant:{}:{}", tenant_id, key)
    }

    pub async fn get<T: serde::de::DeserializeOwned>(
        &self,
        tenant_id: Uuid,
        key: &str,
    ) -> Result<Option<T>, Box<dyn std::error::Error>> {
        let mut conn = self.client.get_async_connection().await?;
        let cache_key = self.build_key(tenant_id, key);

        let value: Option<String> = conn.get(&cache_key).await?;

        match value {
            Some(v) => Ok(Some(serde_json::from_str(&v)?)),
            None => Ok(None),
        }
    }

    pub async fn set<T: serde::Serialize>(
        &self,
        tenant_id: Uuid,
        key: &str,
        value: &T,
        ttl_seconds: usize,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut conn = self.client.get_async_connection().await?;
        let cache_key = self.build_key(tenant_id, key);
        let serialized = serde_json::to_string(value)?;

        conn.set_ex(&cache_key, serialized, ttl_seconds).await?;
        Ok(())
    }

    // Invalidate all cache entries for a tenant
    pub async fn invalidate_tenant(
        &self,
        tenant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut conn = self.client.get_async_connection().await?;
        let pattern = format!("tenant:{}:*", tenant_id);

        let keys: Vec<String> = redis::cmd("KEYS")
            .arg(&pattern)
            .query_async(&mut conn)
            .await?;

        if !keys.is_empty() {
            conn.del::<_, ()>(keys).await?;
        }

        Ok(())
    }
}
```

## Wiring It All Together

Here is how you configure the Actix-web application with all the multi-tenant middleware:

```rust
use actix_web::{web, App, HttpServer};
use actix_web_httpauth::middleware::HttpAuthentication;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize connection pool
    let pool = create_db_pool().await.expect("Failed to create pool");

    HttpServer::new(move || {
        // Auth middleware that extracts tenant context
        let auth = HttpAuthentication::bearer(validate_tenant);

        App::new()
            .app_data(web::Data::new(pool.clone()))
            .wrap(auth)
            .service(
                web::scope("/api/v1")
                    .route("/projects", web::get().to(list_projects))
                    .route("/projects", web::post().to(create_project))
            )
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

## Testing Multi-Tenant Isolation

Testing is critical for multi-tenant systems. Each test should verify that tenant A cannot see tenant B's data:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_tenant_isolation() {
        let pool = create_test_pool().await;

        let tenant_a = Uuid::new_v4();
        let tenant_b = Uuid::new_v4();

        // Create project as tenant A
        let conn_a = TenantScopedConnection::acquire(&pool, tenant_a)
            .await
            .unwrap();

        conn_a.query(
            "INSERT INTO projects (id, tenant_id, name) VALUES ($1, $2, $3)",
            &[&Uuid::new_v4(), &tenant_a, &"Tenant A Project"],
        ).await.unwrap();

        // Tenant B should not see tenant A's project
        let conn_b = TenantScopedConnection::acquire(&pool, tenant_b)
            .await
            .unwrap();

        let rows = conn_b
            .query("SELECT * FROM projects", &[])
            .await
            .unwrap();

        assert_eq!(rows.len(), 0, "Tenant B should not see Tenant A's data");
    }
}
```

## Summary

Building multi-tenant APIs requires defense in depth:

1. Extract tenant identity from authenticated requests
2. Set tenant context at the database connection level
3. Use PostgreSQL RLS policies as your primary isolation mechanism
4. Add application-level guards as a secondary check
5. Namespace cache keys by tenant
6. Write tests that explicitly verify isolation

Rust's type system helps catch many mistakes at compile time, but tenant isolation ultimately depends on careful design and thorough testing. Start with the shared schema model, enforce isolation through RLS, and add additional separation as your compliance requirements grow.
