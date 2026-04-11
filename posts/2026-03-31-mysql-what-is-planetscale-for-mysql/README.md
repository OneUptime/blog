# What Is PlanetScale for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, PlanetScale, Managed Database, Cloud Database

Description: PlanetScale is a serverless MySQL-compatible database platform built on Vitess that offers branching, non-blocking schema migrations, and automatic horizontal scaling.

---

## Overview

PlanetScale is a cloud-hosted, MySQL-compatible database platform built on top of Vitess. It provides the developer experience of a modern database service with features uncommon in traditional MySQL hosting: database branching (like Git branches for schema), non-blocking schema changes, and automatic horizontal sharding.

PlanetScale is particularly popular for web applications built on frameworks like Next.js, Ruby on Rails, and Laravel.

## Key Features

- MySQL-compatible (standard clients and drivers work)
- Database branching for safe schema changes
- Non-blocking schema migrations (no table locks)
- Automatic connection pooling via PlanetScale proxy
- Serverless scaling with usage-based billing
- Automatic replicas and high availability
- Insights dashboard with query analytics

## Creating a Database

Via the web console or CLI:

```bash
# Install PlanetScale CLI (pscale)
brew install planetscale/tap/pscale

# Authenticate
pscale auth login

# Create a database
pscale database create myapp --region us-east

# List databases
pscale database list
```

## Connecting to PlanetScale

PlanetScale uses a proxy connection string for secure access:

```bash
# Create a connection via the CLI proxy
pscale connect myapp main --port 3309

# Now connect to localhost:3309 as a normal MySQL connection
mysql -h 127.0.0.1 -P 3309 -u root
```

For production, create a database password:

```python
import mysql.connector

conn = mysql.connector.connect(
    host='aws.connect.psdb.cloud',
    user='my_username',
    password='pscale_pw_xxxxxx',
    database='myapp',
    ssl_ca='/etc/ssl/certs/ca-certificates.crt'
)
```

## Database Branching

PlanetScale's most distinctive feature - branches work like Git branches:

```bash
# Create a development branch
pscale branch create myapp add-orders-table

# Connect to the branch
pscale connect myapp add-orders-table --port 3309

# Make schema changes on the branch
mysql -h 127.0.0.1 -P 3309 < migration.sql

# Open a deploy request (like a PR)
pscale deploy-request create myapp add-orders-table

# Deploy to production (non-blocking)
pscale deploy-request deploy myapp 1
```

## Non-Blocking Schema Changes

PlanetScale uses Vitess's Online DDL under the hood - schema changes never lock tables:

```sql
-- On a branch, run migrations normally
ALTER TABLE orders ADD COLUMN notes TEXT;
ALTER TABLE users ADD INDEX idx_email (email);

-- PlanetScale converts these to non-blocking operations automatically
```

## Connection String for Popular Frameworks

```bash
# Get connection strings
pscale password create myapp main prod-app

# Outputs:
# DATABASE_URL=mysql://username:pscale_pw_xxx@aws.connect.psdb.cloud/myapp?sslaccept=strict
```

```javascript
// Next.js / Prisma
// schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

## Query Insights

PlanetScale provides built-in query analytics:

```bash
# Open an interactive MySQL shell via CLI
pscale shell myapp main

# Or use the web dashboard at app.planetscale.com for query insights
```

The insights dashboard shows:
- Queries sorted by total time, latency, or frequency
- Full query text with parameters
- Rows examined vs returned ratio
- Index usage

## PlanetScale Limitations

PlanetScale uses Vitess which has some MySQL compatibility constraints:

- Foreign key constraints are supported but must be enabled in database settings (GA since February 2024); cross-shard foreign keys are not yet supported
- Some MySQL-specific features behave differently
- Connection pooling is built-in but connection limits vary by plan

## Summary

PlanetScale is a developer-friendly MySQL-compatible cloud database that brings Git-like database branching, non-blocking schema changes, and effortless scaling to application teams. Its branching workflow makes schema migrations significantly safer than traditional MySQL deployments by allowing testing on isolated branches before deploying to production.
