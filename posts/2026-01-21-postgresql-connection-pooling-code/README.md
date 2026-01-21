# How to Implement Connection Pooling in Application Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Connection Pooling, Python, Node.js, Java, Application Development

Description: A guide to implementing client-side connection pooling in application code for PostgreSQL across different programming languages.

---

Client-side connection pooling reduces connection overhead and improves application performance. This guide covers implementation in popular languages.

## Python (psycopg3)

```python
import psycopg_pool
from contextlib import contextmanager

# Create connection pool
pool = psycopg_pool.ConnectionPool(
    conninfo="host=localhost dbname=myapp user=myuser password=pass",
    min_size=5,
    max_size=20,
    max_idle=300,
    max_lifetime=3600
)

# Use connection from pool
@contextmanager
def get_connection():
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)

# Usage
with get_connection() as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (1,))
        result = cur.fetchone()
```

## Python (SQLAlchemy)

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Create engine with pool
engine = create_engine(
    "postgresql://user:pass@localhost/myapp",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600
)

Session = sessionmaker(bind=engine)

# Usage
with Session() as session:
    user = session.query(User).filter_by(id=1).first()
```

## Node.js (pg)

```javascript
const { Pool } = require('pg');

// Create pool
const pool = new Pool({
  host: 'localhost',
  database: 'myapp',
  user: 'myuser',
  password: 'pass',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Usage
async function getUser(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Or simpler
async function getUsers() {
  const result = await pool.query('SELECT * FROM users');
  return result.rows;
}
```

## Java (HikariCP)

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

// Configure pool
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost/myapp");
config.setUsername("myuser");
config.setPassword("pass");
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setIdleTimeout(300000);
config.setMaxLifetime(1800000);

HikariDataSource dataSource = new HikariDataSource(config);

// Usage
try (Connection conn = dataSource.getConnection();
     PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
    stmt.setInt(1, userId);
    ResultSet rs = stmt.executeQuery();
}
```

## Go (pgx)

```go
package main

import (
    "context"
    "github.com/jackc/pgx/v5/pgxpool"
)

// Create pool
func main() {
    config, _ := pgxpool.ParseConfig("postgres://user:pass@localhost/myapp")
    config.MaxConns = 20
    config.MinConns = 5

    pool, _ := pgxpool.NewWithConfig(context.Background(), config)
    defer pool.Close()

    // Usage
    var name string
    pool.QueryRow(context.Background(),
        "SELECT name FROM users WHERE id = $1", 1).Scan(&name)
}
```

## Pool Configuration Guidelines

| Setting | Recommended | Description |
|---------|-------------|-------------|
| min_size | 2-5 | Minimum connections |
| max_size | 10-20 | Maximum connections |
| idle_timeout | 5-10 min | Close idle connections |
| max_lifetime | 30-60 min | Recycle connections |

## Best Practices

1. **Size pool appropriately** - Based on workload
2. **Always release connections** - Use try/finally
3. **Enable health checks** - pool_pre_ping
4. **Set timeouts** - Connection and idle
5. **Monitor pool metrics** - Utilization, wait times

## Conclusion

Implement connection pooling to reduce connection overhead. Configure pool size based on your application's concurrency needs and always release connections properly.
