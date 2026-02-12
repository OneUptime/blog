# How to Implement Database Connection Pooling on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Database, Connection Pooling, RDS Proxy, Performance

Description: Learn how to implement database connection pooling on AWS using RDS Proxy and application-level pooling strategies

---

Every database connection costs resources. On the database side, each connection consumes memory, file descriptors, and process slots. On the application side, establishing a new connection involves a TCP handshake, TLS negotiation, and authentication. For a busy application making thousands of queries per second, opening a new connection for each query is wasteful and eventually hits the database's connection limit.

Connection pooling solves this by maintaining a pool of pre-established connections that are shared across requests. Instead of opening and closing connections constantly, your application borrows a connection from the pool, uses it, and returns it.

On AWS, you have two main options: RDS Proxy (managed pooling) and application-level pooling. Let us explore both.

## The Connection Problem

Consider a typical setup: an RDS `db.r6g.large` PostgreSQL instance has a default `max_connections` of around 1,600. Sounds like plenty until you consider:

- A Lambda function with 100 concurrent invocations each opening a connection = 100 connections
- An ECS service with 10 tasks each maintaining a pool of 20 connections = 200 connections
- A second ECS service doing the same = another 200 connections

You are at 500 connections and you only have three consumers. Add more services or scale up Lambda concurrency and you quickly hit the wall.

```mermaid
graph TD
    subgraph "Without Connection Pooling"
        A1[Lambda 1] --> DB1[Database]
        A2[Lambda 2] --> DB1
        A3[Lambda 3] --> DB1
        A4[Lambda N] --> DB1
        DB1 -->|100+ connections| X[Connection Limit Hit]
    end
```

```mermaid
graph TD
    subgraph "With Connection Pooling"
        B1[Lambda 1] --> P[Connection Pool]
        B2[Lambda 2] --> P
        B3[Lambda 3] --> P
        B4[Lambda N] --> P
        P -->|10-20 connections| DB2[Database]
    end
```

## Option 1: RDS Proxy

RDS Proxy is a fully managed connection pooling service from AWS. It sits between your application and database, managing a pool of connections.

### Setting Up RDS Proxy

First, store your database credentials in Secrets Manager (RDS Proxy requires this):

```bash
# Store database credentials in Secrets Manager for RDS Proxy
aws secretsmanager create-secret \
  --name my-db-credentials \
  --secret-string '{"username":"admin","password":"YourPassword123"}'
```

Create the IAM role that RDS Proxy uses to access the secret:

```json
// IAM policy allowing RDS Proxy to read the database secret
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-db-credentials-*"
    }
  ]
}
```

Now create the proxy:

```bash
# Create an RDS Proxy for your PostgreSQL database
aws rds create-db-proxy \
  --db-proxy-name my-db-proxy \
  --engine-family POSTGRESQL \
  --auth '[{
    "AuthScheme": "SECRETS",
    "SecretArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-db-credentials-abc123",
    "IAMAuth": "DISABLED"
  }]' \
  --role-arn arn:aws:iam::123456789012:role/rds-proxy-role \
  --vpc-subnet-ids subnet-0abc1234 subnet-0def5678 \
  --vpc-security-group-ids sg-0abc1234 \
  --require-tls
```

Register the target database:

```bash
# Register your RDS instance as a target for the proxy
aws rds register-db-proxy-targets \
  --db-proxy-name my-db-proxy \
  --db-instance-identifiers my-database
```

### Using the Proxy Endpoint

Once the proxy is available, point your application to the proxy endpoint instead of the database endpoint.

```python
# Connect through RDS Proxy instead of directly to the database
import psycopg2

# Old: direct connection
# conn = psycopg2.connect(host='my-database.abc123.us-east-1.rds.amazonaws.com', ...)

# New: through RDS Proxy
conn = psycopg2.connect(
    host='my-db-proxy.proxy-abc123.us-east-1.rds.amazonaws.com',
    dbname='mydb',
    user='admin',
    password='YourPassword123',
    sslmode='require'
)
```

### RDS Proxy with Lambda

RDS Proxy is particularly valuable with Lambda because Lambda creates a new execution environment for each concurrent invocation, and each environment opens its own database connection. Without pooling, a burst of Lambda invocations can overwhelm the database.

```python
# Lambda function using RDS Proxy for efficient connection management
import psycopg2
import os

# Connection is reused across invocations in the same execution environment
conn = None

def get_connection():
    global conn
    if conn is None or conn.closed:
        conn = psycopg2.connect(
            host=os.environ['DB_PROXY_ENDPOINT'],
            dbname=os.environ['DB_NAME'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            sslmode='require',
            connect_timeout=5
        )
    return conn

def lambda_handler(event, context):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (event['user_id'],))
    result = cursor.fetchone()
    cursor.close()
    return {'user': result}
```

### RDS Proxy Configuration Tuning

RDS Proxy has several settings you can tune:

```bash
# Update proxy settings for better performance
aws rds modify-db-proxy \
  --db-proxy-name my-db-proxy \
  --idle-client-timeout 1800 \
  --require-tls
```

**ConnectionBorrowTimeout** (default 120s) - How long a client waits for a connection from the pool before getting an error. Increase this if you see timeout errors during traffic spikes.

**IdleClientTimeout** (default 1800s) - How long an idle client connection stays open. Lower this for Lambda to free up connections faster.

**MaxConnectionsPercent** (default 100) - What percentage of `max_connections` the proxy can use. Set this to 80-90% to leave headroom for direct admin connections.

**MaxIdleConnectionsPercent** (default 50) - What percentage of the pool can be idle. Lower this to be more aggressive about closing unused connections.

## Option 2: Application-Level Connection Pooling

If you are running on ECS, EKS, or EC2 (not Lambda), application-level pooling is often simpler and cheaper than RDS Proxy.

### Python with SQLAlchemy

```python
# SQLAlchemy connection pool configuration
from sqlalchemy import create_engine

engine = create_engine(
    'postgresql://admin:password@my-database.abc123.us-east-1.rds.amazonaws.com:5432/mydb',
    # Pool size: number of persistent connections
    pool_size=10,
    # Max overflow: additional temporary connections allowed
    max_overflow=20,
    # Recycle connections after 30 minutes to avoid stale connections
    pool_recycle=1800,
    # Wait up to 30 seconds for a connection from the pool
    pool_timeout=30,
    # Test connections before using them
    pool_pre_ping=True,
)
```

### Node.js with pg-pool

```javascript
// PostgreSQL connection pool for Node.js applications
const { Pool } = require('pg');

const pool = new Pool({
  host: 'my-database.abc123.us-east-1.rds.amazonaws.com',
  database: 'mydb',
  user: 'admin',
  password: 'YourPassword123',
  port: 5432,
  // Maximum number of clients in the pool
  max: 20,
  // Close idle clients after 30 seconds
  idleTimeoutMillis: 30000,
  // Return an error if no connection is available after 10 seconds
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
});

// Use the pool to execute queries
async function getUser(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  } finally {
    // Return the connection to the pool
    client.release();
  }
}
```

### Java with HikariCP

```java
// HikariCP connection pool configuration for Java applications
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://my-database.abc123.us-east-1.rds.amazonaws.com:5432/mydb");
config.setUsername("admin");
config.setPassword("YourPassword123");

// Pool sizing
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);

// Connection lifetime settings
config.setMaxLifetime(1800000);     // 30 minutes max lifetime
config.setIdleTimeout(600000);      // 10 minutes idle timeout
config.setConnectionTimeout(30000); // 30 seconds to get connection

// Health checks
config.setConnectionTestQuery("SELECT 1");

HikariDataSource dataSource = new HikariDataSource(config);
```

## Option 3: PgBouncer as a Sidecar

For Kubernetes/ECS deployments, running PgBouncer as a sidecar container is a popular pattern. Each task/pod has its own PgBouncer instance that pools connections locally.

```ini
# pgbouncer.ini configuration for sidecar deployment
[databases]
mydb = host=my-database.abc123.us-east-1.rds.amazonaws.com port=5432 dbname=mydb

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool mode: transaction gives the best connection reuse
pool_mode = transaction
max_client_conn = 100
default_pool_size = 10
min_pool_size = 2
reserve_pool_size = 5
reserve_pool_timeout = 3
```

Your application connects to `localhost:6432` instead of the database directly. PgBouncer handles the actual connection management to RDS.

## Sizing Your Pool

A common mistake is making the pool too large. More connections does not mean more performance. There is a formula from the PostgreSQL wiki:

```
Optimal pool size = (number of CPU cores * 2) + effective_spindle_count
```

For cloud databases, the "spindle count" translates roughly to IOPS capacity. In practice, most applications perform well with 10-30 connections per application instance. Start small and increase only if you see connection wait times in your metrics.

## Monitoring Pool Health

Whatever pooling strategy you use, monitor these metrics:

- **Active connections** - How many connections are currently in use
- **Idle connections** - How many connections are waiting in the pool
- **Wait time** - How long requests wait for a connection
- **Connection errors** - Failed attempts to create or borrow connections

For RDS Proxy, these metrics are available in CloudWatch under the `AWS/RDSProxy` namespace.

## Wrapping Up

Connection pooling is not optional for production applications on AWS. RDS Proxy is the best choice for Lambda-based architectures. Application-level pooling works great for container-based services. PgBouncer sidecars offer fine-grained control for Kubernetes deployments. Whichever approach you pick, size your pools conservatively and monitor connection usage to avoid surprises.

For more on database architecture decisions, check out our [Amazon database service comparison guide](https://oneuptime.com/blog/post/compare-amazon-database-service-options-decision-guide/view).
