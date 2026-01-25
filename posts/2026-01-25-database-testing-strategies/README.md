# How to Configure Database Testing Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Database Testing, Integration Testing, SQL, PostgreSQL, DevOps

Description: Learn comprehensive database testing strategies including schema validation, migration testing, data integrity checks, and performance testing to ensure reliable database operations.

---

Database testing goes beyond checking if queries return correct results. You need to verify schema integrity, migration safety, constraint enforcement, and performance under load. This guide covers strategies for testing databases thoroughly in both development and CI/CD environments.

## Testing Layers

Database testing spans multiple layers:

```mermaid
flowchart TD
    A[Unit Tests] --> B[Repository/DAO Tests]
    B --> C[Integration Tests]
    C --> D[Migration Tests]
    D --> E[Performance Tests]
    E --> F[Data Integrity Tests]
```

## Schema Testing

Verify your database schema matches expectations:

```typescript
// schema.test.ts
import { Pool } from 'pg';

describe('Database Schema', () => {
    let pool: Pool;

    beforeAll(() => {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
    });

    afterAll(async () => {
        await pool.end();
    });

    test('users table has required columns', async () => {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);

        const columns = result.rows.reduce((acc, row) => {
            acc[row.column_name] = {
                type: row.data_type,
                nullable: row.is_nullable === 'YES',
            };
            return acc;
        }, {} as Record<string, any>);

        // Required columns exist with correct types
        expect(columns.id).toEqual({ type: 'uuid', nullable: false });
        expect(columns.email).toEqual({ type: 'character varying', nullable: false });
        expect(columns.created_at).toEqual({ type: 'timestamp with time zone', nullable: false });
    });

    test('users table has correct indexes', async () => {
        const result = await pool.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'users'
        `);

        const indexNames = result.rows.map(r => r.indexname);

        // Primary key index
        expect(indexNames).toContain('users_pkey');
        // Email uniqueness index
        expect(indexNames).toContain('users_email_key');
        // Performance index on created_at
        expect(indexNames).toContain('idx_users_created_at');
    });

    test('foreign key constraints are defined', async () => {
        const result = await pool.query(`
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'orders'
        `);

        const fkConstraints = result.rows;

        // Orders references users
        const userFk = fkConstraints.find(
            fk => fk.foreign_table_name === 'users'
        );
        expect(userFk).toBeDefined();
        expect(userFk.column_name).toBe('user_id');
    });
});
```

## Migration Testing

Test database migrations for safety:

```typescript
// migration.test.ts
import { execSync } from 'child_process';
import { Pool } from 'pg';

describe('Database Migrations', () => {
    let pool: Pool;
    const testDbName = `test_migrations_${Date.now()}`;

    beforeAll(async () => {
        // Create fresh database for migration testing
        const adminPool = new Pool({
            connectionString: process.env.ADMIN_DATABASE_URL,
        });

        await adminPool.query(`CREATE DATABASE ${testDbName}`);
        await adminPool.end();

        pool = new Pool({
            connectionString: `${process.env.DATABASE_URL_BASE}/${testDbName}`,
        });
    });

    afterAll(async () => {
        await pool.end();

        // Drop test database
        const adminPool = new Pool({
            connectionString: process.env.ADMIN_DATABASE_URL,
        });
        await adminPool.query(`DROP DATABASE ${testDbName}`);
        await adminPool.end();
    });

    test('migrations run successfully from scratch', async () => {
        // Run all migrations
        execSync('npm run migrate:up', {
            env: {
                ...process.env,
                DATABASE_URL: `${process.env.DATABASE_URL_BASE}/${testDbName}`,
            },
        });

        // Verify final schema state
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        const tables = result.rows.map(r => r.table_name);

        expect(tables).toContain('users');
        expect(tables).toContain('orders');
        expect(tables).toContain('products');
        expect(tables).toContain('schema_migrations');
    });

    test('migrations are reversible', async () => {
        // Get current migration version
        const versionResult = await pool.query(`
            SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1
        `);
        const currentVersion = versionResult.rows[0].version;

        // Roll back one migration
        execSync('npm run migrate:down', {
            env: {
                ...process.env,
                DATABASE_URL: `${process.env.DATABASE_URL_BASE}/${testDbName}`,
            },
        });

        // Re-apply migration
        execSync('npm run migrate:up', {
            env: {
                ...process.env,
                DATABASE_URL: `${process.env.DATABASE_URL_BASE}/${testDbName}`,
            },
        });

        // Verify we are back at the same version
        const newVersionResult = await pool.query(`
            SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1
        `);

        expect(newVersionResult.rows[0].version).toBe(currentVersion);
    });

    test('migrations handle existing data', async () => {
        // Insert test data
        await pool.query(`
            INSERT INTO users (id, email, created_at)
            VALUES (gen_random_uuid(), 'test@example.com', NOW())
        `);

        // Run pending migrations (if any)
        execSync('npm run migrate:up', {
            env: {
                ...process.env,
                DATABASE_URL: `${process.env.DATABASE_URL_BASE}/${testDbName}`,
            },
        });

        // Verify data still exists
        const result = await pool.query(`
            SELECT email FROM users WHERE email = 'test@example.com'
        `);

        expect(result.rows).toHaveLength(1);
    });
});
```

## Constraint Testing

Verify database constraints work correctly:

```typescript
// constraints.test.ts
import { Pool } from 'pg';

describe('Database Constraints', () => {
    let pool: Pool;

    beforeAll(() => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('Unique Constraints', () => {
        test('rejects duplicate emails', async () => {
            const email = `unique-${Date.now()}@example.com`;

            // First insert succeeds
            await pool.query(
                'INSERT INTO users (id, email, created_at) VALUES (gen_random_uuid(), $1, NOW())',
                [email]
            );

            // Second insert should fail
            await expect(
                pool.query(
                    'INSERT INTO users (id, email, created_at) VALUES (gen_random_uuid(), $1, NOW())',
                    [email]
                )
            ).rejects.toThrow(/duplicate key/);
        });
    });

    describe('Foreign Key Constraints', () => {
        test('prevents orphaned orders', async () => {
            const fakeUserId = '00000000-0000-0000-0000-000000000000';

            await expect(
                pool.query(
                    'INSERT INTO orders (id, user_id, total, created_at) VALUES (gen_random_uuid(), $1, 100, NOW())',
                    [fakeUserId]
                )
            ).rejects.toThrow(/foreign key constraint/);
        });

        test('cascades user deletion to orders', async () => {
            // Create user
            const userResult = await pool.query(
                `INSERT INTO users (id, email, created_at)
                 VALUES (gen_random_uuid(), $1, NOW())
                 RETURNING id`,
                [`cascade-${Date.now()}@example.com`]
            );
            const userId = userResult.rows[0].id;

            // Create order
            await pool.query(
                `INSERT INTO orders (id, user_id, total, created_at)
                 VALUES (gen_random_uuid(), $1, 50, NOW())`,
                [userId]
            );

            // Delete user (should cascade)
            await pool.query('DELETE FROM users WHERE id = $1', [userId]);

            // Order should be deleted too
            const orderResult = await pool.query(
                'SELECT id FROM orders WHERE user_id = $1',
                [userId]
            );

            expect(orderResult.rows).toHaveLength(0);
        });
    });

    describe('Check Constraints', () => {
        test('rejects negative order totals', async () => {
            const userResult = await pool.query(
                `INSERT INTO users (id, email, created_at)
                 VALUES (gen_random_uuid(), $1, NOW())
                 RETURNING id`,
                [`check-${Date.now()}@example.com`]
            );

            await expect(
                pool.query(
                    `INSERT INTO orders (id, user_id, total, created_at)
                     VALUES (gen_random_uuid(), $1, -100, NOW())`,
                    [userResult.rows[0].id]
                )
            ).rejects.toThrow(/check constraint/);
        });
    });
});
```

## Transaction Testing

Test transaction behavior:

```typescript
// transactions.test.ts
import { Pool, PoolClient } from 'pg';

describe('Transaction Behavior', () => {
    let pool: Pool;

    beforeAll(() => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
    });

    afterAll(async () => {
        await pool.end();
    });

    test('rollback on error', async () => {
        const client = await pool.connect();
        const email = `rollback-${Date.now()}@example.com`;

        try {
            await client.query('BEGIN');

            // Insert user
            await client.query(
                `INSERT INTO users (id, email, created_at)
                 VALUES (gen_random_uuid(), $1, NOW())`,
                [email]
            );

            // This should fail and trigger rollback
            await client.query(
                `INSERT INTO users (id, email, created_at)
                 VALUES (gen_random_uuid(), $1, NOW())`,
                [email] // Duplicate email
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }

        // User should not exist due to rollback
        const result = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        expect(result.rows).toHaveLength(0);
    });

    test('isolation level prevents dirty reads', async () => {
        const client1 = await pool.connect();
        const client2 = await pool.connect();
        const email = `isolation-${Date.now()}@example.com`;

        try {
            // Client 1 starts transaction
            await client1.query('BEGIN');
            await client1.query(
                `INSERT INTO users (id, email, created_at)
                 VALUES (gen_random_uuid(), $1, NOW())`,
                [email]
            );

            // Client 2 should not see uncommitted data
            const result = await client2.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            expect(result.rows).toHaveLength(0);

            await client1.query('COMMIT');

            // Now client 2 should see it
            const result2 = await client2.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            expect(result2.rows).toHaveLength(1);
        } finally {
            client1.release();
            client2.release();
        }
    });
});
```

## Performance Testing

Test query performance:

```typescript
// performance.test.ts
import { Pool } from 'pg';

describe('Query Performance', () => {
    let pool: Pool;

    beforeAll(() => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
    });

    afterAll(async () => {
        await pool.end();
    });

    test('user lookup by email uses index', async () => {
        const result = await pool.query(`
            EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
            SELECT id, email FROM users WHERE email = 'test@example.com'
        `);

        const plan = result.rows[0]['QUERY PLAN'][0];

        // Should use index scan, not sequential scan
        expect(plan['Plan']['Node Type']).toMatch(/Index/);
    });

    test('orders query with date range is efficient', async () => {
        const result = await pool.query(`
            EXPLAIN (ANALYZE, FORMAT JSON)
            SELECT * FROM orders
            WHERE created_at >= NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 100
        `);

        const plan = result.rows[0]['QUERY PLAN'][0];
        const executionTime = plan['Execution Time'];

        // Should complete in under 100ms
        expect(executionTime).toBeLessThan(100);
    });

    test('complex join does not cause sequential scans', async () => {
        const result = await pool.query(`
            EXPLAIN (ANALYZE, FORMAT JSON)
            SELECT u.email, COUNT(o.id) as order_count, SUM(o.total) as total_spent
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            WHERE u.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY u.id
            ORDER BY total_spent DESC
            LIMIT 10
        `);

        const plan = result.rows[0]['QUERY PLAN'][0];

        // Check that no sequential scan on large tables
        const hasSeqScan = JSON.stringify(plan).includes('"Node Type": "Seq Scan"');

        // This might be acceptable for small tables, but warn for large ones
        if (hasSeqScan) {
            console.warn('Query uses sequential scan - verify table size');
        }
    });

    test('bulk insert performance', async () => {
        const batchSize = 1000;
        const values = Array.from({ length: batchSize }, (_, i) => [
            `perf-test-${Date.now()}-${i}@example.com`,
        ]);

        const start = Date.now();

        // Use COPY for bulk insert
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const [email] of values) {
                await client.query(
                    `INSERT INTO users (id, email, created_at)
                     VALUES (gen_random_uuid(), $1, NOW())`,
                    [email]
                );
            }

            await client.query('COMMIT');
        } catch {
            await client.query('ROLLBACK');
            throw new Error('Bulk insert failed');
        } finally {
            client.release();
        }

        const duration = Date.now() - start;
        const rowsPerSecond = (batchSize / duration) * 1000;

        console.log(`Inserted ${batchSize} rows in ${duration}ms (${rowsPerSecond.toFixed(0)} rows/sec)`);

        // Should handle at least 500 rows per second
        expect(rowsPerSecond).toBeGreaterThan(500);

        // Clean up
        await pool.query(`DELETE FROM users WHERE email LIKE 'perf-test-%'`);
    });
});
```

## Data Integrity Testing

Verify data consistency:

```typescript
// integrity.test.ts
import { Pool } from 'pg';

describe('Data Integrity', () => {
    let pool: Pool;

    beforeAll(() => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
    });

    afterAll(async () => {
        await pool.end();
    });

    test('no orphaned records exist', async () => {
        // Check for orders without users
        const orphanedOrders = await pool.query(`
            SELECT o.id
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE u.id IS NULL
        `);

        expect(orphanedOrders.rows).toHaveLength(0);
    });

    test('aggregates match detail records', async () => {
        // Verify order totals match line items
        const mismatch = await pool.query(`
            SELECT o.id, o.total as order_total,
                   COALESCE(SUM(li.quantity * li.price), 0) as calculated_total
            FROM orders o
            LEFT JOIN line_items li ON o.id = li.order_id
            GROUP BY o.id
            HAVING o.total != COALESCE(SUM(li.quantity * li.price), 0)
        `);

        expect(mismatch.rows).toHaveLength(0);
    });

    test('no duplicate primary keys', async () => {
        const tables = ['users', 'orders', 'products'];

        for (const table of tables) {
            const duplicates = await pool.query(`
                SELECT id, COUNT(*) as count
                FROM ${table}
                GROUP BY id
                HAVING COUNT(*) > 1
            `);

            expect(duplicates.rows).toHaveLength(0);
        }
    });

    test('timestamps are valid', async () => {
        // No future timestamps
        const futureRecords = await pool.query(`
            SELECT id FROM users WHERE created_at > NOW() + INTERVAL '1 minute'
            UNION ALL
            SELECT id FROM orders WHERE created_at > NOW() + INTERVAL '1 minute'
        `);

        expect(futureRecords.rows).toHaveLength(0);

        // updated_at >= created_at
        const invalidUpdates = await pool.query(`
            SELECT id FROM users WHERE updated_at < created_at
        `);

        expect(invalidUpdates.rows).toHaveLength(0);
    });
});
```

## CI Pipeline Integration

```yaml
# .github/workflows/database-tests.yaml
name: Database Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run migrate:up
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb

      - name: Run database tests
        run: npm test -- --testPathPattern=database
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
```

## Summary

| Test Type | Purpose | Frequency |
|-----------|---------|-----------|
| **Schema tests** | Verify structure | Every migration |
| **Migration tests** | Safe deployments | Every PR |
| **Constraint tests** | Data integrity | Every PR |
| **Transaction tests** | ACID compliance | Weekly |
| **Performance tests** | Query optimization | Daily |

Database testing prevents data corruption, ensures migration safety, and catches performance regressions before they impact production.
