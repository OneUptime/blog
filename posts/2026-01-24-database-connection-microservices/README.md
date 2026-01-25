# How to Fix "Database Connection" Issues in Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, Microservices, Connection Pooling, PostgreSQL, MySQL, Troubleshooting, Performance

Description: A practical guide to diagnosing and resolving database connection issues in microservices architectures, covering connection pooling, timeouts, and resilience patterns.

---

Database connection issues in microservices are among the most common causes of production incidents. With multiple services sharing database resources, connection exhaustion, timeouts, and pool misconfigurations can cascade into system-wide failures. This guide covers practical approaches to diagnose, fix, and prevent database connection problems.

## Understanding Connection Issues in Microservices

In a microservices architecture, database connections face unique challenges compared to monolithic applications.

```mermaid
flowchart TD
    subgraph "Microservices"
        A[Service A - 10 pods]
        B[Service B - 5 pods]
        C[Service C - 8 pods]
    end

    subgraph "Connection Math"
        D["Service A: 10 pods x 20 pool = 200 connections"]
        E["Service B: 5 pods x 20 pool = 100 connections"]
        F["Service C: 8 pods x 20 pool = 160 connections"]
        G["Total: 460 connections needed"]
    end

    subgraph "Database"
        H["PostgreSQL max_connections: 200"]
    end

    A --> D
    B --> E
    C --> F
    D --> H
    E --> H
    F --> H

    G -->|"Exceeds limit"| I[Connection Errors]
```

## Diagnosing Connection Problems

### Step 1: Check Database Connection Status

```sql
-- PostgreSQL: Check active connections
SELECT
    datname as database,
    usename as user,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    wait_event_type,
    wait_event,
    query
FROM pg_stat_activity
WHERE datname = 'mydb'
ORDER BY state_change DESC;

-- Count connections by application
SELECT
    application_name,
    state,
    COUNT(*) as connection_count
FROM pg_stat_activity
WHERE datname = 'mydb'
GROUP BY application_name, state
ORDER BY connection_count DESC;

-- Find long-running queries holding connections
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state != 'idle';

-- Check connection limits
SHOW max_connections;
SELECT COUNT(*) as current_connections FROM pg_stat_activity;
```

```sql
-- MySQL: Check connection status
SHOW PROCESSLIST;

-- Detailed connection info
SELECT
    USER,
    HOST,
    DB,
    COMMAND,
    TIME,
    STATE,
    INFO
FROM information_schema.PROCESSLIST
ORDER BY TIME DESC;

-- Connection limits
SHOW VARIABLES LIKE 'max_connections';
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Threads_running';

-- Connection errors
SHOW STATUS LIKE 'Connection_errors%';
SHOW STATUS LIKE 'Aborted%';
```

### Step 2: Application-Side Diagnostics

```python
# connection_diagnostics.py - Monitor connection pool health
import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.pool import QueuePool
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List
import threading

logger = logging.getLogger(__name__)

@dataclass
class PoolStats:
    pool_size: int
    checked_in: int
    checked_out: int
    overflow: int
    invalid: int
    timestamp: datetime

class ConnectionPoolMonitor:
    def __init__(self, engine):
        self.engine = engine
        self.stats_history: List[PoolStats] = []
        self._setup_event_listeners()

    def _setup_event_listeners(self):
        """Attach event listeners to track pool behavior."""

        @event.listens_for(self.engine, "checkout")
        def on_checkout(dbapi_conn, connection_record, connection_proxy):
            logger.debug(f"Connection checked out: {id(dbapi_conn)}")

        @event.listens_for(self.engine, "checkin")
        def on_checkin(dbapi_conn, connection_record):
            logger.debug(f"Connection checked in: {id(dbapi_conn)}")

        @event.listens_for(self.engine, "connect")
        def on_connect(dbapi_conn, connection_record):
            logger.info(f"New connection created: {id(dbapi_conn)}")

        @event.listens_for(self.engine, "close")
        def on_close(dbapi_conn, connection_record):
            logger.info(f"Connection closed: {id(dbapi_conn)}")

        @event.listens_for(self.engine, "invalidate")
        def on_invalidate(dbapi_conn, connection_record, exception):
            logger.warning(
                f"Connection invalidated: {id(dbapi_conn)}, "
                f"reason: {exception}"
            )

    def get_pool_stats(self) -> PoolStats:
        """Get current pool statistics."""
        pool = self.engine.pool
        stats = PoolStats(
            pool_size=pool.size(),
            checked_in=pool.checkedin(),
            checked_out=pool.checkedout(),
            overflow=pool.overflow(),
            invalid=pool.invalidatedcount() if hasattr(pool, 'invalidatedcount') else 0,
            timestamp=datetime.now()
        )
        self.stats_history.append(stats)
        return stats

    def check_pool_health(self) -> Dict:
        """Check if pool is healthy."""
        stats = self.get_pool_stats()
        pool = self.engine.pool

        issues = []

        # Check if pool is exhausted
        if stats.checked_out >= pool.size() + pool._max_overflow:
            issues.append("Pool exhausted - all connections in use")

        # Check for high utilization
        utilization = stats.checked_out / (pool.size() + pool._max_overflow)
        if utilization > 0.8:
            issues.append(f"High pool utilization: {utilization:.1%}")

        # Check for connection churn
        if len(self.stats_history) > 10:
            recent = self.stats_history[-10:]
            avg_overflow = sum(s.overflow for s in recent) / 10
            if avg_overflow > pool.size() * 0.5:
                issues.append("High overflow usage - consider increasing pool size")

        return {
            "healthy": len(issues) == 0,
            "stats": stats,
            "issues": issues
        }

    def test_connection(self) -> bool:
        """Test if database is reachable."""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False


# Expose health endpoint
from flask import Flask, jsonify

app = Flask(__name__)
engine = create_engine(
    "postgresql://user:pass@db:5432/mydb",
    pool_size=10,
    max_overflow=5,
    pool_timeout=30,
    pool_pre_ping=True
)
monitor = ConnectionPoolMonitor(engine)

@app.route("/health/db")
def db_health():
    health = monitor.check_pool_health()
    status_code = 200 if health["healthy"] else 503
    return jsonify(health), status_code
```

## Fixing Common Connection Issues

### Issue 1: Connection Pool Exhaustion

When all connections are in use and new requests cannot get a connection.

```mermaid
flowchart TD
    A[Request Arrives] --> B{Pool Has Free Connection?}
    B -->|Yes| C[Use Connection]
    B -->|No| D{Overflow Available?}
    D -->|Yes| E[Create Overflow Connection]
    D -->|No| F{Timeout Expired?}
    F -->|No| G[Wait for Connection]
    G --> B
    F -->|Yes| H[Raise TimeoutError]
```

```python
# fix_pool_exhaustion.py - Proper pool configuration

from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool
import os

def create_optimized_engine():
    """Create engine with optimized pool settings."""

    # Calculate pool size based on expected load
    # Rule of thumb: pool_size = num_workers * 2
    num_workers = int(os.getenv("GUNICORN_WORKERS", 4))
    pool_size = num_workers * 2
    max_overflow = pool_size  # Allow doubling under load

    engine = create_engine(
        os.getenv("DATABASE_URL"),
        poolclass=QueuePool,

        # Core pool settings
        pool_size=pool_size,
        max_overflow=max_overflow,

        # Timeout settings
        pool_timeout=30,  # Wait up to 30s for connection
        pool_recycle=1800,  # Recycle connections after 30 minutes
        pool_pre_ping=True,  # Verify connection before use

        # Connection arguments
        connect_args={
            "connect_timeout": 10,
            "application_name": os.getenv("SERVICE_NAME", "myapp"),
            "options": "-c statement_timeout=30000"  # 30s query timeout
        }
    )

    return engine


# Context manager for explicit connection management
from contextlib import contextmanager
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(bind=create_optimized_engine())

@contextmanager
def get_db_session():
    """Get database session with automatic cleanup."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# FastAPI dependency
from fastapi import Depends

async def get_db():
    """FastAPI dependency for database sessions."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# Async connection pool for asyncio
import asyncpg
from contextlib import asynccontextmanager

class AsyncConnectionPool:
    def __init__(self, dsn: str, min_size: int = 5, max_size: int = 20):
        self.dsn = dsn
        self.min_size = min_size
        self.max_size = max_size
        self.pool = None

    async def initialize(self):
        """Initialize the connection pool."""
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=self.min_size,
            max_size=self.max_size,
            command_timeout=30,
            max_inactive_connection_lifetime=300
        )

    async def close(self):
        """Close all connections."""
        if self.pool:
            await self.pool.close()

    @asynccontextmanager
    async def acquire(self):
        """Acquire a connection from the pool."""
        async with self.pool.acquire() as conn:
            yield conn

    async def get_stats(self):
        """Get pool statistics."""
        return {
            "size": self.pool.get_size(),
            "free_size": self.pool.get_idle_size(),
            "min_size": self.pool.get_min_size(),
            "max_size": self.pool.get_max_size()
        }
```

### Issue 2: Connection Timeouts

Connections timing out due to network issues, slow queries, or database overload.

```python
# fix_connection_timeouts.py - Handle timeouts gracefully

import time
from functools import wraps
from typing import TypeVar, Callable
from sqlalchemy.exc import OperationalError, TimeoutError as SATimeoutError
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')

def with_retry(
    max_retries: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 10.0,
    exceptions: tuple = (OperationalError, SATimeoutError)
):
    """Decorator to retry database operations on transient failures."""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None

            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e

                    if attempt < max_retries - 1:
                        # Exponential backoff with jitter
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        delay *= (0.5 + random.random())

                        logger.warning(
                            f"Database operation failed (attempt {attempt + 1}), "
                            f"retrying in {delay:.2f}s: {e}"
                        )
                        time.sleep(delay)

            logger.error(f"Database operation failed after {max_retries} attempts")
            raise last_exception

        return wrapper
    return decorator


# Usage example
class UserRepository:
    def __init__(self, session_factory):
        self.session_factory = session_factory

    @with_retry(max_retries=3)
    def get_user(self, user_id: int):
        with self.session_factory() as session:
            return session.query(User).filter(User.id == user_id).first()

    @with_retry(max_retries=3)
    def create_user(self, user_data: dict):
        with self.session_factory() as session:
            user = User(**user_data)
            session.add(user)
            session.commit()
            return user


# Async version with circuit breaker
import asyncio
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class DatabaseCircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        half_open_max_calls: int = 3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.half_open_calls = 0

    async def call(self, func, *args, **kwargs):
        """Execute function through circuit breaker."""
        if self.state == CircuitState.OPEN:
            if self._should_try_recovery():
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
            else:
                raise Exception("Circuit breaker is OPEN")

        if self.state == CircuitState.HALF_OPEN:
            if self.half_open_calls >= self.half_open_max_calls:
                raise Exception("Circuit breaker HALF_OPEN limit reached")
            self.half_open_calls += 1

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        """Handle successful call."""
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
        self.failure_count = 0

    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

    def _should_try_recovery(self) -> bool:
        """Check if enough time has passed to try recovery."""
        if not self.last_failure_time:
            return True
        elapsed = datetime.now() - self.last_failure_time
        return elapsed > timedelta(seconds=self.recovery_timeout)


# Usage with circuit breaker
circuit_breaker = DatabaseCircuitBreaker()

async def fetch_user_with_circuit_breaker(pool, user_id: int):
    async def _fetch():
        async with pool.acquire() as conn:
            return await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1",
                user_id
            )

    return await circuit_breaker.call(_fetch)
```

### Issue 3: Connection Leaks

Connections not being returned to the pool due to code errors.

```python
# fix_connection_leaks.py - Prevent and detect connection leaks

import traceback
import weakref
from datetime import datetime
from typing import Dict, Set
import threading
import logging

logger = logging.getLogger(__name__)

class ConnectionLeakDetector:
    """Detect connections that are not returned to the pool."""

    def __init__(self, warning_threshold_seconds: int = 30):
        self.warning_threshold = warning_threshold_seconds
        self.active_connections: Dict[int, dict] = {}
        self._lock = threading.Lock()
        self._start_monitoring()

    def track_checkout(self, connection_id: int):
        """Record when a connection is checked out."""
        with self._lock:
            self.active_connections[connection_id] = {
                "checkout_time": datetime.now(),
                "stack_trace": traceback.format_stack()
            }

    def track_checkin(self, connection_id: int):
        """Record when a connection is returned."""
        with self._lock:
            self.active_connections.pop(connection_id, None)

    def _start_monitoring(self):
        """Start background thread to check for leaks."""
        def monitor():
            while True:
                self._check_for_leaks()
                time.sleep(10)

        thread = threading.Thread(target=monitor, daemon=True)
        thread.start()

    def _check_for_leaks(self):
        """Check for connections held too long."""
        now = datetime.now()

        with self._lock:
            for conn_id, info in list(self.active_connections.items()):
                held_time = (now - info["checkout_time"]).total_seconds()

                if held_time > self.warning_threshold:
                    logger.warning(
                        f"Possible connection leak: connection {conn_id} "
                        f"held for {held_time:.1f}s\n"
                        f"Checkout stack trace:\n{''.join(info['stack_trace'][-10:])}"
                    )


# Integrate with SQLAlchemy
from sqlalchemy import event

def setup_leak_detection(engine):
    """Set up connection leak detection for an engine."""
    detector = ConnectionLeakDetector()

    @event.listens_for(engine, "checkout")
    def on_checkout(dbapi_conn, connection_record, connection_proxy):
        detector.track_checkout(id(dbapi_conn))

    @event.listens_for(engine, "checkin")
    def on_checkin(dbapi_conn, connection_record):
        detector.track_checkin(id(dbapi_conn))

    return detector


# Context manager that guarantees cleanup
from contextlib import contextmanager
from sqlalchemy.orm import Session

@contextmanager
def safe_session(session_factory) -> Session:
    """Session context manager that guarantees cleanup."""
    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Session error: {e}")
        raise
    finally:
        # Always close, even if commit/rollback fails
        try:
            session.close()
        except Exception as close_error:
            logger.error(f"Error closing session: {close_error}")


# Async version with timeout
import asyncio
from contextlib import asynccontextmanager

@asynccontextmanager
async def timed_connection(pool, timeout: float = 30.0):
    """Acquire connection with timeout to prevent leaks."""
    conn = None
    try:
        # Timeout on acquiring connection
        conn = await asyncio.wait_for(
            pool.acquire(),
            timeout=timeout
        )
        yield conn
    finally:
        if conn:
            await pool.release(conn)
```

## Connection Pooling with PgBouncer

For high-scale microservices, use a connection pooler like PgBouncer.

```mermaid
flowchart LR
    subgraph "Microservices"
        A[Service A]
        B[Service B]
        C[Service C]
    end

    subgraph "PgBouncer"
        D[Connection Pool]
    end

    subgraph "PostgreSQL"
        E[Database]
    end

    A -->|Many connections| D
    B -->|Many connections| D
    C -->|Many connections| D
    D -->|Few connections| E
```

```ini
; pgbouncer.ini - PgBouncer configuration
[databases]
mydb = host=postgres port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Pool mode: transaction is best for microservices
pool_mode = transaction

; Pool sizing
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

; Connection limits
max_client_conn = 1000
max_db_connections = 100

; Timeouts
query_timeout = 30
query_wait_timeout = 60
client_idle_timeout = 300
server_idle_timeout = 60

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60
```

```yaml
# kubernetes/pgbouncer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
        - name: pgbouncer
          image: edoburu/pgbouncer:1.18.0
          ports:
            - containerPort: 6432
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
            - name: POOL_MODE
              value: transaction
            - name: DEFAULT_POOL_SIZE
              value: "20"
            - name: MAX_CLIENT_CONN
              value: "1000"
            - name: MAX_DB_CONNECTIONS
              value: "100"
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          livenessProbe:
            tcpSocket:
              port: 6432
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            tcpSocket:
              port: 6432
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: pgbouncer
spec:
  selector:
    app: pgbouncer
  ports:
    - port: 5432
      targetPort: 6432
```

```python
# Connect through PgBouncer
import os

# Application connects to PgBouncer instead of directly to PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:pass@pgbouncer:5432/mydb"
)

# Important: Disable client-side connection pooling when using PgBouncer
engine = create_engine(
    DATABASE_URL,
    # Use NullPool since PgBouncer handles pooling
    poolclass=NullPool,
    # Or use small pool with PgBouncer
    # pool_size=5,
    # max_overflow=0,
)
```

## Monitoring and Alerting

```yaml
# prometheus-rules.yaml - Database connection alerts
groups:
  - name: database_connections
    rules:
      - alert: HighConnectionUtilization
        expr: |
          (pg_stat_activity_count / pg_settings_max_connections) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection utilization"
          description: "{{ $labels.instance }} using {{ $value | humanizePercentage }} of max connections"

      - alert: ConnectionPoolExhausted
        expr: |
          sqlalchemy_pool_checkedout / sqlalchemy_pool_size >= 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Connection pool exhausted"
          description: "{{ $labels.service }} pool is fully utilized"

      - alert: DatabaseConnectionErrors
        expr: |
          increase(pg_stat_database_numbackends{datname="mydb"}[5m]) == 0
          and
          increase(app_db_connection_errors_total[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failures"
          description: "Unable to connect to database from {{ $labels.service }}"
```

```python
# metrics.py - Export connection pool metrics
from prometheus_client import Gauge, Counter

# Pool metrics
pool_size = Gauge(
    'sqlalchemy_pool_size',
    'Connection pool size',
    ['service', 'database']
)
pool_checked_out = Gauge(
    'sqlalchemy_pool_checkedout',
    'Connections currently in use',
    ['service', 'database']
)
pool_overflow = Gauge(
    'sqlalchemy_pool_overflow',
    'Overflow connections in use',
    ['service', 'database']
)
connection_errors = Counter(
    'app_db_connection_errors_total',
    'Database connection errors',
    ['service', 'error_type']
)

def update_pool_metrics(engine, service_name: str, database: str):
    """Update Prometheus metrics from pool stats."""
    pool = engine.pool

    pool_size.labels(service=service_name, database=database).set(pool.size())
    pool_checked_out.labels(service=service_name, database=database).set(
        pool.checkedout()
    )
    pool_overflow.labels(service=service_name, database=database).set(
        pool.overflow()
    )
```

Database connection issues in microservices require a combination of proper pool configuration, connection poolers like PgBouncer, retry logic, and comprehensive monitoring. By implementing these patterns, you can build services that handle database connections reliably even under high load.
