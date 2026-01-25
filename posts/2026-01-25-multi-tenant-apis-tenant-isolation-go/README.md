# How to Design Multi-Tenant APIs with Tenant Isolation in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Multi-Tenant, API Design, SaaS, Architecture

Description: A practical guide to building multi-tenant APIs in Go with proper tenant isolation, covering middleware patterns, database strategies, and security best practices for SaaS applications.

---

Building a SaaS product means serving multiple customers from a single codebase. The challenge is keeping their data and operations completely separate while sharing infrastructure. Get tenant isolation wrong, and you risk data leaks between customers - one of the worst security incidents you can have. This guide walks through battle-tested patterns for building multi-tenant APIs in Go.

## The Core Problem: Every Request Needs a Tenant

In a multi-tenant system, every API request belongs to a specific tenant. Your code needs to know which tenant is making the request, enforce that tenant's boundaries, and never accidentally cross into another tenant's data. The most reliable way to handle this is through middleware that extracts and validates the tenant before any business logic runs.

Here's a middleware pattern that works well in production:

```go
package middleware

import (
    "context"
    "net/http"
    "strings"
)

// TenantKey is the context key for tenant information
type contextKey string
const TenantKey contextKey = "tenant"

// Tenant holds the validated tenant information
type Tenant struct {
    ID        string
    Name      string
    PlanTier  string
}

// TenantMiddleware extracts and validates tenant from the request
func TenantMiddleware(tenantStore TenantStore) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extract tenant ID from header or subdomain
            tenantID := r.Header.Get("X-Tenant-ID")
            if tenantID == "" {
                // Fallback: extract from subdomain
                tenantID = extractFromSubdomain(r.Host)
            }

            if tenantID == "" {
                http.Error(w, "tenant identification required", http.StatusUnauthorized)
                return
            }

            // Validate tenant exists and is active
            tenant, err := tenantStore.GetByID(r.Context(), tenantID)
            if err != nil {
                http.Error(w, "invalid tenant", http.StatusUnauthorized)
                return
            }

            // Add tenant to context for downstream handlers
            ctx := context.WithValue(r.Context(), TenantKey, tenant)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

func extractFromSubdomain(host string) string {
    parts := strings.Split(host, ".")
    if len(parts) >= 3 {
        return parts[0] // acme.yourapp.com returns "acme"
    }
    return ""
}

// GetTenant retrieves the tenant from context - use this everywhere
func GetTenant(ctx context.Context) (*Tenant, bool) {
    tenant, ok := ctx.Value(TenantKey).(*Tenant)
    return tenant, ok
}
```

The key insight here is that tenant identification happens exactly once, at the edge of your application. Every handler downstream can trust that `GetTenant(ctx)` returns a validated tenant or fails explicitly.

## Database Isolation Strategies

There are three common approaches to tenant data isolation, each with different trade-offs:

**Shared database, shared schema with tenant column** - Simplest to implement. Every table has a `tenant_id` column, and your queries filter by it. The risk is that a missing WHERE clause leaks data across tenants.

**Shared database, separate schemas** - Each tenant gets their own database schema (PostgreSQL) or prefix. Better isolation, but migrations become more complex.

**Separate databases** - Strongest isolation, but highest operational overhead. Usually reserved for enterprise customers with compliance requirements.

For most SaaS applications, the shared schema approach with strict query discipline works well. Here's how to implement it safely:

```go
package repository

import (
    "context"
    "database/sql"
    "errors"
    "fmt"
)

var ErrNoTenant = errors.New("no tenant in context")

// TenantScopedDB wraps database operations with automatic tenant filtering
type TenantScopedDB struct {
    db *sql.DB
}

func NewTenantScopedDB(db *sql.DB) *TenantScopedDB {
    return &TenantScopedDB{db: db}
}

// Query automatically adds tenant filtering to all queries
func (t *TenantScopedDB) Query(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
    tenant, ok := GetTenant(ctx)
    if !ok {
        return nil, ErrNoTenant
    }

    // Prepend tenant_id to args and inject into query
    // This assumes queries use $1 for tenant_id
    scopedQuery := fmt.Sprintf("WITH tenant_scope AS (SELECT $1::text AS tid) %s", query)
    scopedArgs := append([]any{tenant.ID}, args...)

    return t.db.QueryContext(ctx, scopedQuery, scopedArgs...)
}

// UserRepository demonstrates tenant-scoped data access
type UserRepository struct {
    db *TenantScopedDB
}

func (r *UserRepository) GetByID(ctx context.Context, userID string) (*User, error) {
    // Notice: every query includes tenant_id in WHERE clause
    query := `
        SELECT id, email, name, created_at
        FROM users
        WHERE tenant_id = (SELECT tid FROM tenant_scope)
        AND id = $2
    `

    row := r.db.db.QueryRowContext(ctx, query, userID)

    var user User
    err := row.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *UserRepository) List(ctx context.Context) ([]User, error) {
    tenant, ok := GetTenant(ctx)
    if !ok {
        return nil, ErrNoTenant
    }

    query := `
        SELECT id, email, name, created_at
        FROM users
        WHERE tenant_id = $1
        ORDER BY created_at DESC
    `

    rows, err := r.db.db.QueryContext(ctx, query, tenant.ID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt); err != nil {
            return nil, err
        }
        users = append(users, u)
    }
    return users, nil
}
```

## Row-Level Security as a Safety Net

Even with careful query construction, human error happens. PostgreSQL's Row-Level Security (RLS) adds a database-level safety net that prevents cross-tenant data access even if application code has bugs:

```sql
-- Enable RLS on your tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a policy that filters by the current tenant
CREATE POLICY tenant_isolation ON users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::text);

-- Force RLS even for table owners
ALTER TABLE users FORCE ROW LEVEL SECURITY;
```

Then set the tenant context at the start of each request:

```go
func (t *TenantScopedDB) SetTenantContext(ctx context.Context) error {
    tenant, ok := GetTenant(ctx)
    if !ok {
        return ErrNoTenant
    }

    // Set the PostgreSQL session variable
    _, err := t.db.ExecContext(ctx,
        "SET LOCAL app.current_tenant_id = $1",
        tenant.ID,
    )
    return err
}
```

With RLS enabled, even a query that forgets the `WHERE tenant_id = ...` clause will only return rows for the current tenant. Defense in depth at its finest.

## Rate Limiting Per Tenant

Tenants should not be able to impact each other's performance. Implement rate limiting that isolates quotas per tenant:

```go
package ratelimit

import (
    "context"
    "sync"
    "time"
)

type TenantLimiter struct {
    mu       sync.RWMutex
    limiters map[string]*tokenBucket
    rate     int           // requests per interval
    interval time.Duration
}

type tokenBucket struct {
    tokens    int
    lastCheck time.Time
}

func NewTenantLimiter(rate int, interval time.Duration) *TenantLimiter {
    return &TenantLimiter{
        limiters: make(map[string]*tokenBucket),
        rate:     rate,
        interval: interval,
    }
}

func (tl *TenantLimiter) Allow(ctx context.Context) bool {
    tenant, ok := GetTenant(ctx)
    if !ok {
        return false
    }

    tl.mu.Lock()
    defer tl.mu.Unlock()

    bucket, exists := tl.limiters[tenant.ID]
    if !exists {
        bucket = &tokenBucket{tokens: tl.rate, lastCheck: time.Now()}
        tl.limiters[tenant.ID] = bucket
    }

    // Refill tokens based on elapsed time
    elapsed := time.Since(bucket.lastCheck)
    refill := int(elapsed / tl.interval) * tl.rate
    bucket.tokens = min(bucket.tokens+refill, tl.rate)
    bucket.lastCheck = time.Now()

    if bucket.tokens > 0 {
        bucket.tokens--
        return true
    }
    return false
}
```

## Testing Tenant Isolation

Your test suite should explicitly verify that tenant isolation works. Write tests that attempt to access data across tenant boundaries:

```go
func TestTenantIsolation(t *testing.T) {
    // Create two tenants
    tenantA := &Tenant{ID: "tenant-a", Name: "Acme Corp"}
    tenantB := &Tenant{ID: "tenant-b", Name: "Globex Inc"}

    // Create a user belonging to tenant A
    ctxA := context.WithValue(context.Background(), TenantKey, tenantA)
    user, _ := userRepo.Create(ctxA, &User{Email: "alice@acme.com"})

    // Verify tenant B cannot access tenant A's user
    ctxB := context.WithValue(context.Background(), TenantKey, tenantB)
    result, err := userRepo.GetByID(ctxB, user.ID)

    if err == nil || result != nil {
        t.Fatal("tenant isolation violated: tenant B accessed tenant A's data")
    }
}
```

Run these tests in CI. A failing isolation test should block deployment.

## Wrapping Up

Multi-tenant isolation comes down to a few principles: identify the tenant early in the request lifecycle, propagate that identity through context, filter every data access by tenant, and add database-level enforcement as a safety net. The patterns shown here have held up in production systems serving thousands of tenants.

The code overhead is minimal once you establish the middleware and repository patterns. What you get in return is confidence that your customers' data stays separate, even when developers make mistakes. In SaaS, that confidence is everything.
