# Database Tracing with OpenTelemetry: PostgreSQL, MySQL, MongoDB, and More

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Database, PostgreSQL, MySQL, MongoDB, Tracing, Observability

Description: A comprehensive guide to tracing database operations with OpenTelemetry- auto-instrumentation for SQL and NoSQL databases, query performance analysis, and connection pool monitoring.

---

> Database calls are often the biggest latency contributor in any service. OpenTelemetry database instrumentation reveals exactly which queries are slow, which connections are saturated, and where your data layer needs optimization.

This guide covers instrumenting database operations with OpenTelemetry across SQL databases (PostgreSQL, MySQL), NoSQL databases (MongoDB, Redis), and ORMs (Prisma, TypeORM, Sequelize).

---

## Table of Contents

1. Why Database Tracing Matters
2. Semantic Conventions for Databases
3. PostgreSQL Instrumentation
4. MySQL Instrumentation
5. MongoDB Instrumentation
6. Redis Instrumentation
7. ORM Instrumentation (Prisma, TypeORM, Sequelize)
8. Connection Pool Monitoring
9. Query Sanitization
10. N+1 Query Detection
11. Slow Query Analysis
12. Best Practices

---

## 1. Why Database Tracing Matters

### Common database performance issues

| Issue | Symptom | What Tracing Reveals |
|-------|---------|----------------------|
| Slow queries | High latency | Exact query duration |
| N+1 queries | Many small DB spans | Query patterns in trace |
| Connection exhaustion | Timeouts | Pool metrics + wait time |
| Lock contention | Intermittent slowness | Query timing distribution |
| Missing indexes | Full table scans | Query + row count |

### What you'll learn from DB spans

| Property | Value |
|----------|-------|
| **Span** | db.query.users.select |
| **Duration** | 45ms |
| **Attributes** | |
| db.system | postgresql |
| db.name | app_production |
| db.operation | SELECT |
| db.sql.table | users |
| db.statement | SELECT * FROM users WHERE email = $1 |
| db.rows_affected | 1 |
| server.address | db.example.com |
| server.port | 5432 |

---

## 2. Semantic Conventions for Databases

### Standard attributes

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `db.system` | string | Database type | `postgresql`, `mysql`, `mongodb` |
| `db.name` | string | Database name | `app_production` |
| `db.user` | string | Username | `app_user` |
| `db.operation` | string | Operation type | `SELECT`, `INSERT`, `findOne` |
| `db.statement` | string | Query (sanitized) | `SELECT * FROM users WHERE id = ?` |
| `db.sql.table` | string | Primary table | `users` |
| `server.address` | string | DB host | `db.example.com` |
| `server.port` | int | DB port | `5432` |

### Additional useful attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `db.rows_affected` | int | Rows returned/modified |
| `db.connection.pool.name` | string | Connection pool identifier |
| `db.connection.wait_time_ms` | int | Time waiting for connection |

---

## 3. PostgreSQL Instrumentation

### Node.js with pg

```bash
npm install @opentelemetry/instrumentation-pg
```

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

const sdk = new NodeSDK({
  instrumentations: [
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
      addSqlCommenterCommentToQueries: true, // Adds trace context to SQL comments
    }),
  ],
});

sdk.start();

// Usage - spans created automatically
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  database: 'myapp',
  user: 'postgres',
  max: 20,
});

async function getUser(id: string) {
  // This automatically creates a span with db.* attributes
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}
```

### Manual instrumentation

```typescript
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('db-client');

async function queryWithSpan<T>(sql: string, params: any[]): Promise<T> {
  return tracer.startActiveSpan('db.query', {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.system': 'postgresql',
      'db.name': 'myapp',
      'db.statement': sql,
      'db.operation': sql.trim().split(' ')[0].toUpperCase(),
      'server.address': 'localhost',
      'server.port': 5432,
    },
  }, async (span) => {
    try {
      const result = await pool.query(sql, params);
      span.setAttribute('db.rows_affected', result.rowCount);
      span.setStatus({ code: SpanStatusCode.OK });
      return result.rows as T;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Python with psycopg2

```python
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor

# Auto-instrument
Psycopg2Instrumentor().instrument()

import psycopg2

# All queries now create spans automatically
conn = psycopg2.connect(
    host="localhost",
    database="myapp",
    user="postgres"
)

cursor = conn.cursor()
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

---

## 4. MySQL Instrumentation

### Node.js with mysql2

```bash
npm install @opentelemetry/instrumentation-mysql2
```

```typescript
import { MySQL2Instrumentation } from '@opentelemetry/instrumentation-mysql2';

const sdk = new NodeSDK({
  instrumentations: [
    new MySQL2Instrumentation(),
  ],
});

sdk.start();

// Usage
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  database: 'myapp',
  user: 'root',
  waitForConnections: true,
  connectionLimit: 10,
});

async function getProducts(categoryId: number) {
  // Automatically traced
  const [rows] = await pool.query(
    'SELECT * FROM products WHERE category_id = ?',
    [categoryId]
  );
  return rows;
}
```

### Python with mysql-connector

```python
from opentelemetry.instrumentation.mysql import MySQLInstrumentor

MySQLInstrumentor().instrument()

import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    database="myapp",
    user="root"
)

cursor = conn.cursor()
# Automatically creates span
cursor.execute("SELECT * FROM products WHERE category_id = %s", (category_id,))
```

---

## 5. MongoDB Instrumentation

### Node.js with mongodb driver

```bash
npm install @opentelemetry/instrumentation-mongodb
```

```typescript
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';

const sdk = new NodeSDK({
  instrumentations: [
    new MongoDBInstrumentation({
      enhancedDatabaseReporting: true,
    }),
  ],
});

sdk.start();

// Usage
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('myapp');

async function findUser(email: string) {
  // Creates span with:
  // db.system: mongodb
  // db.operation: find
  // db.mongodb.collection: users
  return db.collection('users').findOne({ email });
}

async function createOrder(order: Order) {
  // Creates span with db.operation: insert
  return db.collection('orders').insertOne(order);
}
```

### Mongoose instrumentation

```typescript
import { MongooseInstrumentation } from '@opentelemetry/instrumentation-mongoose';

const sdk = new NodeSDK({
  instrumentations: [
    new MongooseInstrumentation(),
  ],
});

// Mongoose models automatically traced
const User = mongoose.model('User', userSchema);

async function getActiveUsers() {
  // Creates span for this query
  return User.find({ active: true }).lean();
}
```

### Python with pymongo

```python
from opentelemetry.instrumentation.pymongo import PymongoInstrumentor

PymongoInstrumentor().instrument()

from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['myapp']

# All operations traced
user = db.users.find_one({'email': email})
```

---

## 6. Redis Instrumentation

### Node.js with ioredis

```bash
npm install @opentelemetry/instrumentation-ioredis
```

```typescript
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';

const sdk = new NodeSDK({
  instrumentations: [
    new IORedisInstrumentation({
      dbStatementSerializer: (cmdName, cmdArgs) => {
        // Customize how commands are recorded
        return `${cmdName} ${cmdArgs[0] || ''}`;
      },
    }),
  ],
});

sdk.start();

// Usage
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

async function cacheUser(userId: string, userData: object) {
  // Creates span: db.system=redis, db.operation=SET
  await redis.set(`user:${userId}`, JSON.stringify(userData), 'EX', 3600);
}

async function getCachedUser(userId: string) {
  // Creates span: db.system=redis, db.operation=GET
  const data = await redis.get(`user:${userId}`);
  return data ? JSON.parse(data) : null;
}
```

### Manual Redis span with cache metrics

```typescript
import { trace, SpanKind } from '@opentelemetry/api';
import { metrics } from '@opentelemetry/api';

const tracer = trace.getTracer('redis-client');
const meter = metrics.getMeter('redis-client');

const cacheHits = meter.createCounter('cache.hits');
const cacheMisses = meter.createCounter('cache.misses');

async function getWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan('cache.get', { kind: SpanKind.CLIENT }, async (span) => {
    span.setAttributes({
      'db.system': 'redis',
      'db.operation': 'GET',
      'cache.key': key,
    });

    const cached = await redis.get(key);

    if (cached) {
      span.setAttribute('cache.hit', true);
      cacheHits.add(1, { key_prefix: key.split(':')[0] });
      span.end();
      return JSON.parse(cached);
    }

    span.setAttribute('cache.hit', false);
    cacheMisses.add(1, { key_prefix: key.split(':')[0] });

    // Fetch and cache
    const value = await fetcher();
    await redis.set(key, JSON.stringify(value), 'EX', 3600);

    span.end();
    return value;
  });
}
```

---

## 7. ORM Instrumentation

### Prisma

```bash
npm install @prisma/instrumentation
```

```typescript
// telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const sdk = new NodeSDK({
  instrumentations: [
    new PrismaInstrumentation(),
  ],
});

sdk.start();

// Usage
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getOrderWithItems(orderId: string) {
  // Creates span for this query with relation loading
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: true,
    },
  });
}
```

### TypeORM

```typescript
// TypeORM doesn't have official instrumentation
// Use the underlying driver instrumentation (pg, mysql2)

import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

const sdk = new NodeSDK({
  instrumentations: [
    new PgInstrumentation(), // Traces TypeORM's PostgreSQL queries
  ],
});

// Or add manual tracing
import { trace } from '@opentelemetry/api';
import { EntityManager, Repository } from 'typeorm';

const tracer = trace.getTracer('typeorm');

class TracedRepository<T> {
  constructor(private repository: Repository<T>) {}

  async findOne(id: string): Promise<T | null> {
    return tracer.startActiveSpan(`db.${this.repository.metadata.name}.findOne`, async (span) => {
      span.setAttribute('db.system', 'postgresql');
      span.setAttribute('db.sql.table', this.repository.metadata.tableName);
      span.setAttribute('db.operation', 'SELECT');

      const result = await this.repository.findOne({ where: { id } as any });
      span.setAttribute('db.rows_affected', result ? 1 : 0);
      span.end();
      return result;
    });
  }
}
```

### Sequelize

```bash
npm install @opentelemetry/instrumentation-sequelize
```

```typescript
import { SequelizeInstrumentation } from '@opentelemetry/instrumentation-sequelize';

const sdk = new NodeSDK({
  instrumentations: [
    new SequelizeInstrumentation(),
  ],
});

sdk.start();

// Usage
import { Sequelize, Model, DataTypes } from 'sequelize';

const sequelize = new Sequelize('postgres://user:pass@localhost:5432/myapp');

class User extends Model {}
User.init({
  email: DataTypes.STRING,
  name: DataTypes.STRING,
}, { sequelize });

async function findUserByEmail(email: string) {
  // Automatically creates span
  return User.findOne({ where: { email } });
}
```

---

## 8. Connection Pool Monitoring

### PostgreSQL pool metrics

```typescript
import { metrics } from '@opentelemetry/api';
import { Pool } from 'pg';

const meter = metrics.getMeter('pg-pool');

const poolSize = meter.createObservableGauge('db.pool.size', {
  description: 'Current pool size',
});

const poolWaiting = meter.createObservableGauge('db.pool.waiting', {
  description: 'Clients waiting for connection',
});

const poolIdle = meter.createObservableGauge('db.pool.idle', {
  description: 'Idle connections',
});

const pool = new Pool({
  host: 'localhost',
  database: 'myapp',
  max: 20,
});

// Register callbacks
poolSize.addCallback((result) => {
  result.observe(pool.totalCount, { pool: 'main' });
});

poolWaiting.addCallback((result) => {
  result.observe(pool.waitingCount, { pool: 'main' });
});

poolIdle.addCallback((result) => {
  result.observe(pool.idleCount, { pool: 'main' });
});
```

### Connection wait time tracking

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('db-pool');

async function getConnectionWithTiming<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const span = tracer.startSpan('db.pool.acquire');
  const waitStart = Date.now();

  const client = await pool.connect();
  const waitTime = Date.now() - waitStart;

  span.setAttributes({
    'db.connection.wait_time_ms': waitTime,
    'db.pool.total': pool.totalCount,
    'db.pool.idle': pool.idleCount,
    'db.pool.waiting': pool.waitingCount,
  });
  span.end();

  try {
    return await operation(client);
  } finally {
    client.release();
  }
}
```

---

## 9. Query Sanitization

### Preventing sensitive data in spans

```typescript
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

const sdk = new NodeSDK({
  instrumentations: [
    new PgInstrumentation({
      // Don't record actual query values
      enhancedDatabaseReporting: false,

      // Or customize sanitization
      responseHook: (span, response) => {
        // Don't record row data
        span.setAttribute('db.rows_affected', response.rowCount);
      },
    }),
  ],
});
```

### Custom sanitization function

```typescript
function sanitizeQuery(sql: string): string {
  // Replace string literals
  let sanitized = sql.replace(/'[^']*'/g, '?');

  // Replace numeric literals
  sanitized = sanitized.replace(/\b\d+\b/g, '?');

  // Truncate long queries
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 1000) + '...';
  }

  return sanitized;
}

// Use in manual instrumentation
span.setAttribute('db.statement', sanitizeQuery(sql));
```

### Configuring what to capture

```typescript
const instrumentation = new PgInstrumentation({
  // Capture query with parameters replaced
  enhancedDatabaseReporting: true,

  // Custom hook to filter/modify
  requestHook: (span, queryInfo) => {
    // Skip logging for certain queries
    if (queryInfo.query.text.includes('password')) {
      span.setAttribute('db.statement', '[REDACTED - contains sensitive data]');
    }
  },
});
```

---

## 10. N+1 Query Detection

### Pattern detection in traces

```typescript
// N+1 pattern: One query returns N rows, then N more queries run
// Trace shows:
// └── GET /api/orders
//     ├── SELECT * FROM orders WHERE user_id = ?       // 1 query
//     ├── SELECT * FROM products WHERE id = ?          // N queries
//     ├── SELECT * FROM products WHERE id = ?
//     ├── SELECT * FROM products WHERE id = ?
//     └── ... (many more)

// Solution: Use JOIN or batch loading
// Fixed trace shows:
// └── GET /api/orders
//     ├── SELECT * FROM orders WHERE user_id = ?       // 1 query
//     └── SELECT * FROM products WHERE id IN (?, ?, ?) // 1 query
```

### Automated N+1 detection

```typescript
import { trace, Span } from '@opentelemetry/api';

class QueryPatternDetector {
  private queryCount: Map<string, number> = new Map();
  private thresholdForWarning = 5;

  trackQuery(table: string, operation: string) {
    const key = `${operation}:${table}`;
    const count = (this.queryCount.get(key) || 0) + 1;
    this.queryCount.set(key, count);

    if (count >= this.thresholdForWarning) {
      const span = trace.getActiveSpan();
      span?.addEvent('potential_n_plus_1', {
        'pattern.table': table,
        'pattern.operation': operation,
        'pattern.count': count,
      });

      console.warn(`Potential N+1 query detected: ${key} called ${count} times`);
    }
  }

  reset() {
    this.queryCount.clear();
  }
}

// Use in request middleware
const detector = new QueryPatternDetector();

app.use((req, res, next) => {
  detector.reset();
  res.on('finish', () => {
    detector.reset();
  });
  next();
});
```

---

## 11. Slow Query Analysis

### Setting up slow query alerts

```typescript
const SLOW_QUERY_THRESHOLD_MS = 100;

async function queryWithSlowDetection<T>(
  sql: string,
  params: any[]
): Promise<T> {
  return tracer.startActiveSpan('db.query', async (span) => {
    const start = Date.now();

    const result = await pool.query(sql, params);

    const duration = Date.now() - start;
    span.setAttribute('db.duration_ms', duration);

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      span.addEvent('slow_query', {
        'query.duration_ms': duration,
        'query.threshold_ms': SLOW_QUERY_THRESHOLD_MS,
      });

      // Also increment a metric
      slowQueryCounter.add(1, {
        'db.operation': sql.trim().split(' ')[0],
      });
    }

    span.end();
    return result.rows;
  });
}
```

### Query performance histogram

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('db-metrics');

const queryDuration = meter.createHistogram('db.query.duration', {
  description: 'Database query duration',
  unit: 'ms',
  // Buckets optimized for database operations
  advice: {
    explicitBucketBoundaries: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000],
  },
});

// Record on every query
span.end();
queryDuration.record(duration, {
  'db.system': 'postgresql',
  'db.operation': operation,
  'db.sql.table': table,
});
```

### EXPLAIN integration

```typescript
async function analyzeSlowQuery(sql: string, params: any[]) {
  // Get execution plan for slow queries
  const explainResult = await pool.query(`EXPLAIN ANALYZE ${sql}`, params);

  const span = trace.getActiveSpan();
  span?.addEvent('query.explain', {
    'explain.plan': JSON.stringify(explainResult.rows),
  });

  // Check for sequential scans on large tables
  const planText = JSON.stringify(explainResult.rows);
  if (planText.includes('Seq Scan') && !planText.includes('rows=0')) {
    span?.addEvent('warning.sequential_scan', {
      'warning.message': 'Query uses sequential scan - consider adding index',
    });
  }
}
```

---

## 12. Best Practices

### Database tracing checklist

| Practice | Why |
|----------|-----|
| Use auto-instrumentation | Consistent coverage, less code |
| Sanitize queries | Prevent PII in traces |
| Track pool metrics | Detect connection issues |
| Set span status on error | Easy error filtering |
| Include row counts | Detect unexpected data volumes |
| Monitor slow queries | Performance regression detection |
| Detect N+1 patterns | Optimization opportunities |

### Attribute guidelines

```typescript
// ALWAYS include:
span.setAttribute('db.system', 'postgresql');
span.setAttribute('db.name', 'myapp');
span.setAttribute('db.operation', 'SELECT');

// RECOMMENDED:
span.setAttribute('db.sql.table', 'users');
span.setAttribute('db.rows_affected', rowCount);
span.setAttribute('server.address', 'db.example.com');

// CAREFUL with (sanitize!):
span.setAttribute('db.statement', sanitizedQuery);

// NEVER include:
// - Actual parameter values with PII
// - Passwords or credentials
// - Full result sets
```

### Error handling

```typescript
async function tracedQuery<T>(sql: string, params: any[]): Promise<T> {
  return tracer.startActiveSpan('db.query', async (span) => {
    span.setAttributes({
      'db.system': 'postgresql',
      'db.statement': sanitizeQuery(sql),
    });

    try {
      const result = await pool.query(sql, params);
      span.setAttribute('db.rows_affected', result.rowCount);
      span.setStatus({ code: SpanStatusCode.OK });
      return result.rows;
    } catch (error: any) {
      span.recordException(error);

      // Add helpful context
      if (error.code === '23505') {
        span.setAttribute('db.error.type', 'unique_violation');
      } else if (error.code === '23503') {
        span.setAttribute('db.error.type', 'foreign_key_violation');
      }

      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## Summary

| Database | Instrumentation Package |
|----------|------------------------|
| PostgreSQL | `@opentelemetry/instrumentation-pg` |
| MySQL | `@opentelemetry/instrumentation-mysql2` |
| MongoDB | `@opentelemetry/instrumentation-mongodb` |
| Redis | `@opentelemetry/instrumentation-ioredis` |
| Prisma | `@prisma/instrumentation` |
| Sequelize | `@opentelemetry/instrumentation-sequelize` |

Database tracing is fundamental to understanding application performance. Use auto-instrumentation where available, add custom metrics for pools and slow queries, and always sanitize sensitive data.

---

*Ready to understand your database performance? Send traces to [OneUptime](https://oneuptime.com) and identify slow queries instantly.*

---

### See Also

- [What are Traces and Spans in OpenTelemetry](/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/)
- [OpenTelemetry Semantic Conventions](/blog/post/2025-12-17-opentelemetry-semantic-conventions/)
- [Redis & Cache Instrumentation](/blog/post/2025-12-17-opentelemetry-redis-cache/)
