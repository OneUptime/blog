# How to Implement Connection Pooling in Python for PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, PostgreSQL, Connection Pooling, Database, psycopg2, asyncpg, Performance, Reliability

Description: Learn how to implement efficient database connection pooling in Python using psycopg2 and asyncpg. This guide covers pool configuration, connection management, and best practices for high-performance PostgreSQL access.

---

> Database connections are expensive. Each new connection involves TCP handshake, SSL negotiation, and authentication. Without connection pooling, your application wastes time and resources creating connections for every query. This guide shows you how to implement efficient connection pooling for PostgreSQL in Python.

Connection pooling maintains a set of reusable connections, eliminating the overhead of creating new connections for each request. This can reduce query latency by 10-100x for short queries.

---

## Why Connection Pooling Matters

Without pooling:
```
Request 1: Create connection (50ms) → Query (5ms) → Close (5ms) = 60ms
Request 2: Create connection (50ms) → Query (5ms) → Close (5ms) = 60ms
...
```

With pooling:
```
Request 1: Get connection (0.1ms) → Query (5ms) → Return to pool (0.1ms) = 5.2ms
Request 2: Get connection (0.1ms) → Query (5ms) → Return to pool (0.1ms) = 5.2ms
...
```

The connection creation overhead is paid once, not per request.

---

## psycopg2: Synchronous Connection Pooling

### Basic Pool Setup

```python
# pool_basic.py
from psycopg2 import pool
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabasePool:
    """Thread-safe connection pool for psycopg2"""

    def __init__(
        self,
        dsn: str,
        min_connections: int = 2,
        max_connections: int = 10
    ):
        self.dsn = dsn
        self._pool = pool.ThreadedConnectionPool(
            minconn=min_connections,
            maxconn=max_connections,
            dsn=dsn
        )
        logger.info(
            f"Connection pool created: min={min_connections}, max={max_connections}"
        )

    def get_connection(self):
        """Get a connection from the pool"""
        return self._pool.getconn()

    def return_connection(self, conn):
        """Return a connection to the pool"""
        self._pool.putconn(conn)

    def close_all(self):
        """Close all connections"""
        self._pool.closeall()
        logger.info("All connections closed")


# Usage
db_pool = DatabasePool(
    dsn="postgresql://user:pass@localhost:5432/mydb",
    min_connections=2,
    max_connections=20
)

# Get connection, execute query, return connection
conn = db_pool.get_connection()
try:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        result = cur.fetchone()
finally:
    db_pool.return_connection(conn)
```

### Context Manager Pattern

```python
# pool_context.py
from psycopg2 import pool
from contextlib import contextmanager
from typing import Generator
import psycopg2
import logging

logger = logging.getLogger(__name__)

class DatabasePool:
    """Connection pool with context manager support"""

    _instance = None

    def __init__(
        self,
        dsn: str,
        min_conn: int = 2,
        max_conn: int = 20
    ):
        self._pool = pool.ThreadedConnectionPool(
            minconn=min_conn,
            maxconn=max_conn,
            dsn=dsn
        )

    @classmethod
    def initialize(cls, dsn: str, min_conn: int = 2, max_conn: int = 20):
        """Initialize the singleton pool"""
        if cls._instance is None:
            cls._instance = cls(dsn, min_conn, max_conn)
        return cls._instance

    @classmethod
    def get_instance(cls) -> 'DatabasePool':
        """Get the pool instance"""
        if cls._instance is None:
            raise RuntimeError("Pool not initialized")
        return cls._instance

    @contextmanager
    def connection(self) -> Generator:
        """Context manager for getting a connection"""
        conn = None
        try:
            conn = self._pool.getconn()
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                self._pool.putconn(conn)

    @contextmanager
    def cursor(self, commit: bool = True) -> Generator:
        """Context manager for getting a cursor"""
        with self.connection() as conn:
            cursor = conn.cursor()
            try:
                yield cursor
                if commit:
                    conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                cursor.close()

    def execute(self, query: str, params: tuple = None, fetch: bool = True):
        """Execute a query and optionally fetch results"""
        with self.cursor() as cur:
            cur.execute(query, params)
            if fetch:
                return cur.fetchall()

    def execute_many(self, query: str, params_list: list):
        """Execute a query with multiple parameter sets"""
        with self.cursor() as cur:
            cur.executemany(query, params_list)

    def close(self):
        """Close all connections"""
        self._pool.closeall()


# Usage
# Initialize once at startup
pool = DatabasePool.initialize(
    dsn="postgresql://user:pass@localhost:5432/mydb",
    min_conn=5,
    max_conn=20
)

# Use anywhere in your application
def get_user(user_id: int):
    pool = DatabasePool.get_instance()
    with pool.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cur.fetchone()

def create_user(name: str, email: str):
    pool = DatabasePool.get_instance()
    with pool.cursor() as cur:
        cur.execute(
            "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id",
            (name, email)
        )
        return cur.fetchone()[0]
```

### Flask Integration

```python
# flask_pool.py
from flask import Flask, g, jsonify
from pool_context import DatabasePool
import os

app = Flask(__name__)

# Initialize pool at startup
def init_db_pool():
    return DatabasePool.initialize(
        dsn=os.environ['DATABASE_URL'],
        min_conn=5,
        max_conn=20
    )

@app.before_first_request
def setup():
    init_db_pool()

@app.teardown_appcontext
def close_connection(exception):
    # Connections are automatically returned to pool via context manager
    pass

@app.route('/users/<int:user_id>')
def get_user(user_id):
    pool = DatabasePool.get_instance()
    with pool.cursor() as cur:
        cur.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()

    if not row:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": row[0],
        "name": row[1],
        "email": row[2]
    })

@app.route('/users', methods=['POST'])
def create_user():
    from flask import request
    data = request.json

    pool = DatabasePool.get_instance()
    with pool.cursor() as cur:
        cur.execute(
            "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id",
            (data['name'], data['email'])
        )
        user_id = cur.fetchone()[0]

    return jsonify({"id": user_id}), 201
```

---

## asyncpg: Async Connection Pooling

For async applications (FastAPI, aiohttp), asyncpg provides high-performance async pooling.

### Basic Async Pool

```python
# async_pool.py
import asyncpg
import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class AsyncDatabasePool:
    """Async connection pool for asyncpg"""

    _pool: Optional[asyncpg.Pool] = None

    @classmethod
    async def initialize(
        cls,
        dsn: str,
        min_size: int = 5,
        max_size: int = 20,
        max_queries: int = 50000,
        max_inactive_connection_lifetime: float = 300.0
    ):
        """Initialize the connection pool"""
        cls._pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=min_size,
            max_size=max_size,
            max_queries=max_queries,
            max_inactive_connection_lifetime=max_inactive_connection_lifetime,
            command_timeout=60.0
        )
        logger.info(f"Async pool created: min={min_size}, max={max_size}")
        return cls._pool

    @classmethod
    def get_pool(cls) -> asyncpg.Pool:
        """Get the pool instance"""
        if cls._pool is None:
            raise RuntimeError("Pool not initialized")
        return cls._pool

    @classmethod
    async def close(cls):
        """Close the pool"""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None
            logger.info("Pool closed")

    @classmethod
    async def execute(cls, query: str, *args):
        """Execute a query"""
        async with cls._pool.acquire() as conn:
            return await conn.execute(query, *args)

    @classmethod
    async def fetch(cls, query: str, *args):
        """Fetch multiple rows"""
        async with cls._pool.acquire() as conn:
            return await conn.fetch(query, *args)

    @classmethod
    async def fetchrow(cls, query: str, *args):
        """Fetch a single row"""
        async with cls._pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    @classmethod
    async def fetchval(cls, query: str, *args):
        """Fetch a single value"""
        async with cls._pool.acquire() as conn:
            return await conn.fetchval(query, *args)


# Usage
async def main():
    # Initialize
    await AsyncDatabasePool.initialize(
        dsn="postgresql://user:pass@localhost:5432/mydb",
        min_size=5,
        max_size=20
    )

    # Query
    users = await AsyncDatabasePool.fetch("SELECT * FROM users LIMIT 10")
    for user in users:
        print(user['name'])

    # Close
    await AsyncDatabasePool.close()

asyncio.run(main())
```

### FastAPI Integration

```python
# fastapi_pool.py
from fastapi import FastAPI, HTTPException, Depends
from contextlib import asynccontextmanager
import asyncpg
import os
from typing import Optional

# Pool holder
class Database:
    pool: Optional[asyncpg.Pool] = None

db = Database()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database pool lifecycle"""
    # Startup
    db.pool = await asyncpg.create_pool(
        dsn=os.environ.get('DATABASE_URL', 'postgresql://localhost/mydb'),
        min_size=5,
        max_size=20,
        command_timeout=60
    )
    print("Database pool created")

    yield

    # Shutdown
    await db.pool.close()
    print("Database pool closed")

app = FastAPI(lifespan=lifespan)

async def get_db() -> asyncpg.Pool:
    """Dependency for database pool"""
    return db.pool

@app.get("/users/{user_id}")
async def get_user(user_id: int, pool: asyncpg.Pool = Depends(get_db)):
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, name, email FROM users WHERE id = $1",
            user_id
        )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return dict(user)

@app.get("/users")
async def list_users(
    limit: int = 10,
    offset: int = 0,
    pool: asyncpg.Pool = Depends(get_db)
):
    async with pool.acquire() as conn:
        users = await conn.fetch(
            "SELECT id, name, email FROM users LIMIT $1 OFFSET $2",
            limit, offset
        )

    return [dict(u) for u in users]

@app.post("/users")
async def create_user(name: str, email: str, pool: asyncpg.Pool = Depends(get_db)):
    async with pool.acquire() as conn:
        user_id = await conn.fetchval(
            "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
            name, email
        )

    return {"id": user_id}

# Transaction example
@app.post("/transfer")
async def transfer_funds(
    from_account: int,
    to_account: int,
    amount: float,
    pool: asyncpg.Pool = Depends(get_db)
):
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Debit from source
            await conn.execute(
                "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
                amount, from_account
            )
            # Credit to destination
            await conn.execute(
                "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
                amount, to_account
            )

    return {"status": "completed"}
```

### Connection Pool Monitoring

```python
# pool_monitoring.py
import asyncpg
from prometheus_client import Gauge, Counter
import asyncio
import logging

logger = logging.getLogger(__name__)

# Prometheus metrics
pool_size = Gauge('db_pool_size', 'Current pool size')
pool_free = Gauge('db_pool_free', 'Free connections in pool')
pool_used = Gauge('db_pool_used', 'Used connections in pool')
pool_waiting = Gauge('db_pool_waiting', 'Queries waiting for connection')
query_count = Counter('db_queries_total', 'Total queries executed', ['operation'])
query_errors = Counter('db_query_errors_total', 'Query errors', ['error_type'])

class MonitoredPool:
    """Database pool with monitoring"""

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool
        self._monitor_task = None

    async def start_monitoring(self, interval: float = 5.0):
        """Start background monitoring"""
        self._monitor_task = asyncio.create_task(
            self._monitor_loop(interval)
        )

    async def stop_monitoring(self):
        """Stop monitoring"""
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass

    async def _monitor_loop(self, interval: float):
        """Background monitoring loop"""
        while True:
            try:
                self._update_metrics()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitoring error: {e}")

    def _update_metrics(self):
        """Update Prometheus metrics"""
        pool_size.set(self._pool.get_size())
        pool_free.set(self._pool.get_idle_size())
        pool_used.set(self._pool.get_size() - self._pool.get_idle_size())

    async def execute(self, query: str, *args):
        """Execute with metrics"""
        try:
            async with self._pool.acquire() as conn:
                result = await conn.execute(query, *args)
                query_count.labels(operation='execute').inc()
                return result
        except Exception as e:
            query_errors.labels(error_type=type(e).__name__).inc()
            raise

    async def fetch(self, query: str, *args):
        """Fetch with metrics"""
        try:
            async with self._pool.acquire() as conn:
                result = await conn.fetch(query, *args)
                query_count.labels(operation='fetch').inc()
                return result
        except Exception as e:
            query_errors.labels(error_type=type(e).__name__).inc()
            raise

    @property
    def pool(self) -> asyncpg.Pool:
        return self._pool


# Usage
async def create_monitored_pool(dsn: str) -> MonitoredPool:
    pool = await asyncpg.create_pool(dsn, min_size=5, max_size=20)
    monitored = MonitoredPool(pool)
    await monitored.start_monitoring()
    return monitored
```

---

## Connection Pool Configuration

### Sizing Your Pool

The optimal pool size depends on:
- Number of concurrent requests
- Query duration
- Database server resources

General formula:
```
pool_size = (concurrent_requests * avg_query_duration) / response_time_target + buffer
```

Example calculation:
```
- 100 concurrent requests
- 10ms average query duration
- 50ms response time target
- Buffer: 20%

pool_size = (100 * 0.01) / 0.05 * 1.2 = 24 connections
```

### Configuration Best Practices

```python
# pool_config.py
import os
from dataclasses import dataclass

@dataclass
class PoolConfig:
    """Database pool configuration"""

    # Connection string
    dsn: str

    # Pool sizing
    min_connections: int = 5
    max_connections: int = 20

    # Timeouts
    connection_timeout: float = 30.0  # Wait for connection from pool
    command_timeout: float = 60.0     # Query execution timeout
    idle_timeout: float = 300.0       # Close idle connections after

    # Health checks
    max_queries_per_connection: int = 50000  # Recycle after N queries
    health_check_interval: float = 30.0

    @classmethod
    def from_env(cls) -> 'PoolConfig':
        """Load configuration from environment"""
        return cls(
            dsn=os.environ['DATABASE_URL'],
            min_connections=int(os.getenv('DB_POOL_MIN', '5')),
            max_connections=int(os.getenv('DB_POOL_MAX', '20')),
            connection_timeout=float(os.getenv('DB_CONN_TIMEOUT', '30')),
            command_timeout=float(os.getenv('DB_CMD_TIMEOUT', '60')),
            idle_timeout=float(os.getenv('DB_IDLE_TIMEOUT', '300')),
        )


# asyncpg pool with config
async def create_pool(config: PoolConfig) -> asyncpg.Pool:
    return await asyncpg.create_pool(
        dsn=config.dsn,
        min_size=config.min_connections,
        max_size=config.max_connections,
        max_queries=config.max_queries_per_connection,
        max_inactive_connection_lifetime=config.idle_timeout,
        command_timeout=config.command_timeout,
    )
```

---

## Connection Health and Recovery

### Connection Validation

```python
# connection_health.py
import asyncpg
import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class ResilientPool:
    """Connection pool with health checking and recovery"""

    def __init__(self, dsn: str, min_size: int = 5, max_size: int = 20):
        self.dsn = dsn
        self.min_size = min_size
        self.max_size = max_size
        self._pool: Optional[asyncpg.Pool] = None
        self._healthy = False

    async def initialize(self):
        """Initialize the pool"""
        await self._create_pool()
        # Start health checking
        asyncio.create_task(self._health_check_loop())

    async def _create_pool(self):
        """Create a new pool"""
        try:
            self._pool = await asyncpg.create_pool(
                dsn=self.dsn,
                min_size=self.min_size,
                max_size=self.max_size,
                command_timeout=30,
            )
            self._healthy = True
            logger.info("Pool created successfully")
        except Exception as e:
            logger.error(f"Failed to create pool: {e}")
            self._healthy = False

    async def _health_check_loop(self, interval: float = 10.0):
        """Periodically check pool health"""
        while True:
            await asyncio.sleep(interval)
            await self._check_health()

    async def _check_health(self):
        """Check if pool is healthy"""
        if self._pool is None:
            await self._create_pool()
            return

        try:
            async with self._pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            self._healthy = True
        except Exception as e:
            logger.warning(f"Health check failed: {e}")
            self._healthy = False
            # Try to recreate pool
            await self._recreate_pool()

    async def _recreate_pool(self):
        """Recreate the pool after failure"""
        logger.info("Recreating pool...")
        if self._pool:
            try:
                await self._pool.close()
            except Exception:
                pass
        await self._create_pool()

    async def acquire(self):
        """Acquire a connection with retry"""
        for attempt in range(3):
            try:
                if self._pool and self._healthy:
                    return await self._pool.acquire()
            except Exception as e:
                logger.warning(f"Acquire failed (attempt {attempt + 1}): {e}")
                await asyncio.sleep(0.5 * (2 ** attempt))

        raise Exception("Could not acquire connection")

    async def execute(self, query: str, *args):
        """Execute with automatic retry"""
        for attempt in range(3):
            try:
                async with self._pool.acquire() as conn:
                    return await conn.execute(query, *args)
            except (asyncpg.InterfaceError, asyncpg.ConnectionDoesNotExistError) as e:
                logger.warning(f"Connection error (attempt {attempt + 1}): {e}")
                if attempt == 2:
                    raise
                await asyncio.sleep(0.5 * (2 ** attempt))

    @property
    def is_healthy(self) -> bool:
        return self._healthy

    async def close(self):
        """Close the pool"""
        if self._pool:
            await self._pool.close()
```

---

## SQLAlchemy Connection Pooling

For applications using SQLAlchemy:

### Sync SQLAlchemy Pool

```python
# sqlalchemy_pool.py
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool
from sqlalchemy.orm import sessionmaker, scoped_session
import os

# Create engine with pool configuration
engine = create_engine(
    os.environ['DATABASE_URL'],
    poolclass=QueuePool,
    pool_size=10,           # Number of connections to keep
    max_overflow=20,        # Extra connections when pool is exhausted
    pool_timeout=30,        # Seconds to wait for connection
    pool_recycle=1800,      # Recycle connections after 30 minutes
    pool_pre_ping=True,     # Verify connections before use
)

# Create session factory
SessionLocal = sessionmaker(bind=engine)

# Thread-safe session
Session = scoped_session(SessionLocal)

# Usage with context manager
from contextlib import contextmanager

@contextmanager
def get_db_session():
    session = Session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# Usage
def get_user(user_id: int):
    with get_db_session() as session:
        result = session.execute(
            text("SELECT * FROM users WHERE id = :id"),
            {"id": user_id}
        )
        return result.fetchone()
```

### Async SQLAlchemy Pool

```python
# sqlalchemy_async_pool.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool
import os

# Create async engine
engine = create_async_engine(
    os.environ['DATABASE_URL'].replace('postgresql://', 'postgresql+asyncpg://'),
    poolclass=AsyncAdaptedQueuePool,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
)

# Async session factory
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# FastAPI dependency
async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

---

## Best Practices Summary

### 1. Right-Size Your Pool
```python
# Don't over-provision
# Pool connections = (concurrent_requests * query_duration) + buffer
pool_size = 20  # Not 100
```

### 2. Always Return Connections
```python
# Use context managers
async with pool.acquire() as conn:
    await conn.fetch(query)
# Connection automatically returned
```

### 3. Set Appropriate Timeouts
```python
# Don't wait forever for connections
connection_timeout = 30  # seconds
command_timeout = 60     # seconds
```

### 4. Enable Health Checks
```python
# Detect stale connections
pool_pre_ping = True
max_inactive_connection_lifetime = 300
```

### 5. Monitor Pool Metrics
```python
# Track pool utilization
pool_size.set(pool.get_size())
pool_free.set(pool.get_idle_size())
```

---

## Conclusion

Connection pooling is essential for performant database access. Key takeaways:

- **psycopg2**: Use `ThreadedConnectionPool` for sync applications
- **asyncpg**: Native async pool for high-concurrency applications
- **SQLAlchemy**: Built-in pool with both sync and async support
- **Size appropriately**: Too small = connection waits, too large = resource waste
- **Monitor**: Track pool utilization to identify issues

With proper connection pooling, your database access will be faster, more reliable, and more efficient.

---

*Need to monitor your database connections? [OneUptime](https://oneuptime.com) provides database monitoring with connection pool metrics, query performance tracking, and automatic alerting.*

**Related Reading:**
- [When Performance Matters, Skip the ORM](https://oneuptime.com/blog/post/2025-11-13-when-performance-matters-skip-the-orm/view)
