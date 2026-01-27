# How to Implement Multi-Tenancy in Node.js Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Multi-Tenancy, SaaS, Express, NestJS, PostgreSQL, Database Design

Description: Learn how to implement multi-tenancy in Node.js applications with tenant isolation strategies, database patterns, and middleware for building scalable SaaS platforms.

---

> Multi-tenancy is the cornerstone of modern SaaS applications - choosing the right isolation strategy determines your application's scalability, security, and operational complexity.

## Understanding Multi-Tenancy

Multi-tenancy allows a single application instance to serve multiple customers (tenants) while keeping their data logically or physically separated. The three primary strategies are:

| Strategy | Isolation Level | Cost | Complexity | Best For |
|----------|----------------|------|------------|----------|
| **Database per Tenant** | Highest | High | Medium | Enterprise, compliance-heavy |
| **Schema per Tenant** | High | Medium | Medium | Mid-market, moderate scale |
| **Row-Level Security** | Medium | Low | Low | Startups, high tenant count |

## Tenant Isolation Strategies

Before diving into implementation, understand the trade-offs:

```javascript
// tenant-strategy.js
// Each strategy has different isolation and operational characteristics

const TenantStrategy = {
  // Separate database per tenant
  // Pros: Complete isolation, easy backup/restore per tenant
  // Cons: Connection pooling challenges, higher infrastructure cost
  DATABASE_PER_TENANT: 'database',

  // Separate schema within shared database
  // Pros: Good isolation, single database to manage
  // Cons: Schema migration complexity, PostgreSQL specific
  SCHEMA_PER_TENANT: 'schema',

  // Shared tables with tenant_id column
  // Pros: Simple, efficient resource usage
  // Cons: Risk of data leaks if queries miss tenant filter
  ROW_LEVEL_SECURITY: 'row',
};

module.exports = { TenantStrategy };
```

## Database per Tenant

This approach provides the strongest isolation by giving each tenant their own database.

```javascript
// database-per-tenant/connection-manager.js
const { Pool } = require('pg');

class TenantConnectionManager {
  constructor() {
    // Cache of connection pools per tenant
    this.pools = new Map();
    // Maximum pools to prevent resource exhaustion
    this.maxPools = parseInt(process.env.MAX_TENANT_POOLS) || 100;
  }

  // Get or create a connection pool for a tenant
  async getPool(tenantId) {
    if (this.pools.has(tenantId)) {
      return this.pools.get(tenantId);
    }

    // Check pool limit
    if (this.pools.size >= this.maxPools) {
      await this.evictLeastRecentlyUsed();
    }

    // Get tenant database configuration
    const config = await this.getTenantDatabaseConfig(tenantId);

    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database, // Each tenant has own database
      user: config.user,
      password: config.password,
      max: 10, // Connections per tenant pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    this.pools.set(tenantId, {
      pool,
      lastUsed: Date.now(),
    });

    return this.pools.get(tenantId);
  }

  // Get tenant database configuration from central registry
  async getTenantDatabaseConfig(tenantId) {
    // In production, fetch from a central tenant registry database
    // This example uses environment-based configuration
    const baseHost = process.env.DB_HOST || 'localhost';
    const basePort = process.env.DB_PORT || 5432;

    return {
      host: baseHost,
      port: basePort,
      database: `tenant_${tenantId}`,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
  }

  // Execute query for a specific tenant
  async query(tenantId, text, params) {
    const { pool } = await this.getPool(tenantId);
    const result = await pool.query(text, params);

    // Update last used timestamp
    this.pools.get(tenantId).lastUsed = Date.now();

    return result;
  }

  // Evict least recently used pool when at capacity
  async evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.pools) {
      if (value.lastUsed < oldestTime) {
        oldestTime = value.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const { pool } = this.pools.get(oldestKey);
      await pool.end();
      this.pools.delete(oldestKey);
    }
  }

  // Cleanup all connections on shutdown
  async closeAll() {
    const closePromises = [];
    for (const [, { pool }] of this.pools) {
      closePromises.push(pool.end());
    }
    await Promise.all(closePromises);
    this.pools.clear();
  }
}

module.exports = { TenantConnectionManager };
```

## Schema per Tenant

Schema isolation provides strong separation while using a single database.

```javascript
// schema-per-tenant/schema-manager.js
const { Pool } = require('pg');

class SchemaPerTenantManager {
  constructor() {
    // Single connection pool to the database
    this.pool = new Pool({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 50,
    });
  }

  // Create schema for new tenant
  async createTenantSchema(tenantId) {
    const schemaName = this.getSchemaName(tenantId);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create schema
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

      // Create tables within the schema
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.projects (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          owner_id INTEGER REFERENCES ${schemaName}.users(id),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query('COMMIT');

      console.log(`Schema created for tenant: ${tenantId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get sanitized schema name
  getSchemaName(tenantId) {
    // Sanitize tenant ID to prevent SQL injection
    const sanitized = tenantId.replace(/[^a-zA-Z0-9_]/g, '');
    return `tenant_${sanitized}`;
  }

  // Execute query within tenant schema
  async query(tenantId, text, params) {
    const schemaName = this.getSchemaName(tenantId);
    const client = await this.pool.connect();

    try {
      // Set search path to tenant schema for this session
      await client.query(`SET search_path TO ${schemaName}, public`);

      // Execute the query - tables resolve to tenant schema
      const result = await client.query(text, params);

      return result;
    } finally {
      // Reset search path before releasing connection
      await client.query('SET search_path TO public');
      client.release();
    }
  }

  // Drop tenant schema (use with caution)
  async dropTenantSchema(tenantId) {
    const schemaName = this.getSchemaName(tenantId);
    await this.pool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    console.log(`Schema dropped for tenant: ${tenantId}`);
  }
}

module.exports = { SchemaPerTenantManager };
```

## Row-Level Security

Row-level security uses a shared schema with tenant filtering at the database level.

```javascript
// row-level-security/setup.sql
// Run this SQL to set up row-level security in PostgreSQL

/*
-- Enable row-level security on tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy that filters by tenant_id
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant')::VARCHAR)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::VARCHAR);

-- Create application role
CREATE ROLE app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO app_user;
*/
```

```javascript
// row-level-security/rls-manager.js
const { Pool } = require('pg');

class RowLevelSecurityManager {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER, // Should be 'app_user' with RLS policies
      password: process.env.DB_PASSWORD,
      max: 50,
    });
  }

  // Execute query with tenant context set
  async query(tenantId, text, params) {
    const client = await this.pool.connect();

    try {
      // Set tenant context for RLS policies
      await client.query(
        `SET LOCAL app.current_tenant = $1`,
        [tenantId]
      );

      // Execute query - RLS automatically filters by tenant
      const result = await client.query(text, params);

      return result;
    } finally {
      client.release();
    }
  }

  // Transaction with tenant context
  async transaction(tenantId, callback) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Set tenant context for entire transaction
      await client.query(
        `SET LOCAL app.current_tenant = $1`,
        [tenantId]
      );

      // Execute callback with client
      const result = await callback(client);

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { RowLevelSecurityManager };
```

## Middleware for Tenant Context

The middleware extracts tenant information from requests and makes it available throughout the request lifecycle.

```javascript
// middleware/tenant-context.js
const { AsyncLocalStorage } = require('async_hooks');

// AsyncLocalStorage maintains tenant context across async operations
const tenantStorage = new AsyncLocalStorage();

// Get current tenant from context
function getCurrentTenant() {
  const store = tenantStorage.getStore();
  if (!store || !store.tenantId) {
    throw new Error('No tenant context available');
  }
  return store.tenantId;
}

// Middleware to extract and set tenant context
function tenantMiddleware(options = {}) {
  const {
    // How to identify the tenant from the request
    extractTenant = defaultTenantExtractor,
    // Callback to validate tenant exists
    validateTenant = async () => true,
    // Paths that don't require tenant context
    excludePaths = ['/health', '/metrics'],
  } = options;

  return async (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    try {
      // Extract tenant identifier from request
      const tenantId = await extractTenant(req);

      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant identification required',
        });
      }

      // Validate tenant exists and is active
      const isValid = await validateTenant(tenantId);
      if (!isValid) {
        return res.status(404).json({
          error: 'Tenant not found or inactive',
        });
      }

      // Attach to request for easy access
      req.tenantId = tenantId;

      // Run rest of request in tenant context
      tenantStorage.run({ tenantId }, () => {
        next();
      });
    } catch (error) {
      next(error);
    }
  };
}

// Default tenant extraction strategies
async function defaultTenantExtractor(req) {
  // Strategy 1: Subdomain (tenant.example.com)
  const host = req.get('host');
  if (host) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      return subdomain;
    }
  }

  // Strategy 2: Header (X-Tenant-ID)
  const headerTenant = req.get('X-Tenant-ID');
  if (headerTenant) {
    return headerTenant;
  }

  // Strategy 3: JWT claim
  if (req.user && req.user.tenantId) {
    return req.user.tenantId;
  }

  // Strategy 4: Query parameter (for testing/development)
  if (process.env.NODE_ENV === 'development' && req.query.tenant) {
    return req.query.tenant;
  }

  return null;
}

module.exports = {
  tenantMiddleware,
  getCurrentTenant,
  tenantStorage,
};
```

## Express.js Multi-Tenancy Example

Complete Express.js application with multi-tenancy support.

```javascript
// express-example/app.js
const express = require('express');
const { tenantMiddleware, getCurrentTenant } = require('./middleware/tenant-context');
const { RowLevelSecurityManager } = require('./row-level-security/rls-manager');

const app = express();
const db = new RowLevelSecurityManager();

// Parse JSON bodies
app.use(express.json());

// Tenant validation function
async function validateTenant(tenantId) {
  // Check tenant registry (could be Redis, database, or in-memory cache)
  const result = await db.pool.query(
    'SELECT id, status FROM tenants WHERE id = $1',
    [tenantId]
  );
  return result.rows.length > 0 && result.rows[0].status === 'active';
}

// Apply tenant middleware
app.use(tenantMiddleware({
  validateTenant,
  excludePaths: ['/health', '/api/public'],
}));

// Health check (no tenant required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// List users for current tenant
app.get('/api/users', async (req, res, next) => {
  try {
    const tenantId = getCurrentTenant();

    // RLS automatically filters by tenant
    const result = await db.query(
      tenantId,
      'SELECT id, email, name, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create user for current tenant
app.post('/api/users', async (req, res, next) => {
  try {
    const tenantId = getCurrentTenant();
    const { email, name } = req.body;

    // RLS ensures tenant_id matches current tenant on insert
    const result = await db.query(
      tenantId,
      `INSERT INTO users (tenant_id, email, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [tenantId, email, name]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Email already exists' });
    }
    next(error);
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

## NestJS Multi-Tenancy Example

NestJS implementation using decorators and dependency injection.

```typescript
// nestjs-example/tenant.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Decorator to extract tenant ID from request
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);
```

```typescript
// nestjs-example/tenant.middleware.ts
import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';

// Extend Express Request to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant from subdomain or header
    const tenantId = this.extractTenantId(req);

    if (!tenantId) {
      throw new BadRequestException('Tenant identification required');
    }

    // Validate tenant exists
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant || tenant.status !== 'active') {
      throw new BadRequestException('Invalid or inactive tenant');
    }

    // Attach to request
    req.tenantId = tenantId;
    next();
  }

  private extractTenantId(req: Request): string | null {
    // Try header first
    const headerTenant = req.get('X-Tenant-ID');
    if (headerTenant) return headerTenant;

    // Try subdomain
    const host = req.get('host');
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && !['www', 'api', 'app'].includes(subdomain)) {
        return subdomain;
      }
    }

    return null;
  }
}
```

```typescript
// nestjs-example/tenant-aware.repository.ts
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Pool } from 'pg';

// Request-scoped repository that automatically applies tenant filter
@Injectable({ scope: Scope.REQUEST })
export class TenantAwareRepository {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @Inject('DATABASE_POOL') private readonly pool: Pool,
  ) {}

  private get tenantId(): string {
    if (!this.request.tenantId) {
      throw new Error('No tenant context in request');
    }
    return this.request.tenantId;
  }

  // All queries automatically filtered by tenant
  async query<T>(text: string, params: any[] = []): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      // Set tenant context for RLS
      await client.query('SET LOCAL app.current_tenant = $1', [this.tenantId]);
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async findUsers(): Promise<any[]> {
    return this.query('SELECT * FROM users ORDER BY created_at DESC');
  }

  async createUser(email: string, name: string): Promise<any> {
    const result = await this.query(
      `INSERT INTO users (tenant_id, email, name)
       VALUES ($1, $2, $3) RETURNING *`,
      [this.tenantId, email, name],
    );
    return result[0];
  }
}
```

```typescript
// nestjs-example/users.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { TenantId } from './tenant.decorator';
import { TenantAwareRepository } from './tenant-aware.repository';

@Controller('users')
export class UsersController {
  constructor(private readonly repository: TenantAwareRepository) {}

  @Get()
  async findAll(@TenantId() tenantId: string) {
    // Log for auditing which tenant is accessing data
    console.log(`Listing users for tenant: ${tenantId}`);
    return this.repository.findUsers();
  }

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body() body: { email: string; name: string },
  ) {
    console.log(`Creating user for tenant: ${tenantId}`);
    return this.repository.createUser(body.email, body.name);
  }
}
```

```typescript
// nestjs-example/app.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Pool } from 'pg';
import { TenantMiddleware } from './tenant.middleware';
import { TenantService } from './tenant.service';
import { TenantAwareRepository } from './tenant-aware.repository';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    TenantService,
    TenantAwareRepository,
    {
      provide: 'DATABASE_POOL',
      useFactory: () => {
        return new Pool({
          host: process.env.DB_HOST,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          max: 50,
        });
      },
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude('health', 'metrics')
      .forRoutes('*');
  }
}
```

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Never trust client input** | Always validate tenant ID server-side, even from JWTs |
| **Use database-level enforcement** | Row-level security prevents bugs from leaking data |
| **Index tenant columns** | All tables with tenant_id need an index on that column |
| **Audit tenant access** | Log which tenant performed each operation |
| **Test tenant isolation** | Write tests that verify cross-tenant data is inaccessible |
| **Cache tenant metadata** | Reduce database lookups for tenant validation |
| **Plan for tenant onboarding** | Automate schema/database creation for new tenants |
| **Consider tenant-aware caching** | Redis keys should include tenant ID prefix |
| **Monitor per-tenant metrics** | Track usage, errors, and performance by tenant |
| **Implement tenant-scoped rate limiting** | Prevent one tenant from affecting others |

```javascript
// best-practices/tenant-cache-keys.js
// Always prefix cache keys with tenant ID

class TenantCache {
  constructor(redis) {
    this.redis = redis;
  }

  // Build tenant-scoped cache key
  key(tenantId, ...parts) {
    return `tenant:${tenantId}:${parts.join(':')}`;
  }

  async get(tenantId, key) {
    return this.redis.get(this.key(tenantId, key));
  }

  async set(tenantId, key, value, ttlSeconds = 3600) {
    return this.redis.setex(
      this.key(tenantId, key),
      ttlSeconds,
      JSON.stringify(value)
    );
  }

  // Delete all cache entries for a tenant
  async clearTenant(tenantId) {
    const pattern = this.key(tenantId, '*');
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

module.exports = { TenantCache };
```

Multi-tenancy is foundational for SaaS applications. Start with row-level security for simplicity, and migrate to schema or database per tenant as your compliance and isolation requirements grow. Always enforce tenant boundaries at the database level - application-level filtering alone is not sufficient for security-critical systems.

---

Need to monitor your multi-tenant application? [OneUptime](https://oneuptime.com) provides comprehensive observability with tenant-aware metrics, distributed tracing, and alerting to help you maintain reliability across all your customers.
