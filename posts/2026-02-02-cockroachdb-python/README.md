# How to Use CockroachDB with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Python, Database, SQL, Distributed Database, PostgreSQL, Backend

Description: Learn how to connect and work with CockroachDB in Python applications. A comprehensive guide covering connection setup, CRUD operations, transactions, connection pooling, and best practices for building resilient distributed applications.

---

> CockroachDB is a distributed SQL database designed for global scalability and resilience. Built to survive datacenter failures while maintaining strong consistency, it provides a PostgreSQL-compatible interface that makes integration with Python applications straightforward.

Python developers can leverage CockroachDB's distributed architecture to build applications that scale horizontally and handle failures gracefully. Since CockroachDB speaks the PostgreSQL wire protocol, you can use familiar tools like psycopg2 or SQLAlchemy to interact with it.

---

## Architecture Overview

CockroachDB operates as a distributed system where data is automatically replicated across nodes. Understanding this architecture helps you write better Python code.

```mermaid
graph TB
    subgraph "Python Application"
        APP[Python App]
        POOL[Connection Pool]
    end

    subgraph "CockroachDB Cluster"
        LB[Load Balancer]
        N1[Node 1]
        N2[Node 2]
        N3[Node 3]
    end

    subgraph "Data Layer"
        R1[Range 1]
        R2[Range 2]
        R3[Range 3]
    end

    APP --> POOL
    POOL --> LB
    LB --> N1
    LB --> N2
    LB --> N3
    N1 --> R1
    N1 --> R2
    N2 --> R2
    N2 --> R3
    N3 --> R1
    N3 --> R3
```

---

## Setting Up CockroachDB

### Local Development with Docker

Running CockroachDB locally with Docker provides a quick way to start development without complex setup.

```bash
# Start a single-node CockroachDB cluster for development
docker run -d \
  --name=cockroach \
  -p 26257:26257 \
  -p 8080:8080 \
  cockroachdb/cockroach:latest start-single-node \
  --insecure

# Create a database for your application
docker exec -it cockroach ./cockroach sql --insecure \
  -e "CREATE DATABASE myapp;"

# Create a user with password for secure connections
docker exec -it cockroach ./cockroach sql --insecure \
  -e "CREATE USER pyuser WITH PASSWORD 'pypassword'; GRANT ALL ON DATABASE myapp TO pyuser;"
```

### Installing Python Dependencies

Install the required Python packages to connect to CockroachDB. The psycopg2 adapter works seamlessly since CockroachDB uses the PostgreSQL protocol.

```bash
# Install the PostgreSQL adapter for Python
pip install psycopg2-binary

# For async support, install asyncpg
pip install asyncpg

# For ORM support, install SQLAlchemy with cockroachdb dialect
pip install sqlalchemy sqlalchemy-cockroachdb
```

---

## Basic Connection Setup

### Synchronous Connection with psycopg2

The following code establishes a basic connection to CockroachDB using psycopg2. Connection parameters are similar to PostgreSQL, making migration straightforward.

```python
# connection.py
# Basic synchronous connection to CockroachDB using psycopg2
import psycopg2
from psycopg2 import sql
import os

def get_connection():
    """
    Create a connection to CockroachDB.
    Uses environment variables for configuration to avoid hardcoding credentials.
    """
    # Connection parameters - use environment variables in production
    conn_params = {
        'host': os.getenv('COCKROACH_HOST', 'localhost'),
        'port': os.getenv('COCKROACH_PORT', 26257),
        'database': os.getenv('COCKROACH_DATABASE', 'myapp'),
        'user': os.getenv('COCKROACH_USER', 'pyuser'),
        'password': os.getenv('COCKROACH_PASSWORD', 'pypassword'),
        # SSL settings for secure connections
        'sslmode': os.getenv('COCKROACH_SSLMODE', 'disable'),
    }

    # Create and return the connection
    conn = psycopg2.connect(**conn_params)

    # Set autocommit to False for explicit transaction control
    conn.autocommit = False

    return conn

def test_connection():
    """Verify the connection works by running a simple query"""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Query the CockroachDB version to verify connectivity
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"Connected to: {version}")

        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Connection failed: {e}")
        return False

if __name__ == "__main__":
    test_connection()
```

### Asynchronous Connection with asyncpg

For high-performance applications, asyncpg provides non-blocking database operations. The following example shows how to set up async connections with CockroachDB.

```python
# async_connection.py
# Asynchronous connection to CockroachDB using asyncpg
import asyncio
import asyncpg
import os

async def get_async_connection():
    """
    Create an async connection to CockroachDB.
    asyncpg is significantly faster than psycopg2 for async workloads.
    """
    # Build the connection URL
    host = os.getenv('COCKROACH_HOST', 'localhost')
    port = os.getenv('COCKROACH_PORT', 26257)
    database = os.getenv('COCKROACH_DATABASE', 'myapp')
    user = os.getenv('COCKROACH_USER', 'pyuser')
    password = os.getenv('COCKROACH_PASSWORD', 'pypassword')

    # asyncpg uses a DSN string for connection
    dsn = f"postgresql://{user}:{password}@{host}:{port}/{database}"

    # Create the connection with statement cache for better performance
    conn = await asyncpg.connect(
        dsn,
        statement_cache_size=100,  # Cache prepared statements
    )

    return conn

async def test_async_connection():
    """Verify async connection with a simple query"""
    try:
        conn = await get_async_connection()

        # Run a simple query to test connectivity
        version = await conn.fetchval("SELECT version();")
        print(f"Connected (async) to: {version}")

        await conn.close()
        return True
    except Exception as e:
        print(f"Async connection failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_async_connection())
```

---

## Connection Pooling

Connection pooling is essential for production applications. Managing a pool of connections reduces the overhead of creating new connections for each request.

```mermaid
graph LR
    subgraph "Application"
        R1[Request 1]
        R2[Request 2]
        R3[Request 3]
        R4[Request 4]
    end

    subgraph "Connection Pool"
        C1[Conn 1]
        C2[Conn 2]
        C3[Conn 3]
    end

    subgraph "CockroachDB"
        DB[(Database)]
    end

    R1 --> C1
    R2 --> C2
    R3 --> C3
    R4 -.->|Waiting| C1
    C1 --> DB
    C2 --> DB
    C3 --> DB
```

### Synchronous Connection Pool

The psycopg2 pool module provides thread-safe connection pooling for synchronous applications.

```python
# sync_pool.py
# Thread-safe connection pool for synchronous CockroachDB access
from psycopg2 import pool
from contextlib import contextmanager
import os
import threading

class CockroachDBPool:
    """
    Singleton connection pool manager for CockroachDB.
    Ensures thread-safe access to database connections.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        # Thread-safe singleton pattern
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize_pool()
        return cls._instance

    def _initialize_pool(self):
        """Create the connection pool with configured limits"""
        # Pool configuration
        min_connections = int(os.getenv('DB_POOL_MIN', 5))
        max_connections = int(os.getenv('DB_POOL_MAX', 20))

        # Create a threaded connection pool
        self._pool = pool.ThreadedConnectionPool(
            minconn=min_connections,
            maxconn=max_connections,
            host=os.getenv('COCKROACH_HOST', 'localhost'),
            port=os.getenv('COCKROACH_PORT', 26257),
            database=os.getenv('COCKROACH_DATABASE', 'myapp'),
            user=os.getenv('COCKROACH_USER', 'pyuser'),
            password=os.getenv('COCKROACH_PASSWORD', 'pypassword'),
            # Connection timeout in seconds
            connect_timeout=10,
        )

    @contextmanager
    def get_connection(self):
        """
        Context manager for safe connection handling.
        Automatically returns connection to pool when done.
        """
        conn = None
        try:
            # Get a connection from the pool
            conn = self._pool.getconn()
            yield conn
        finally:
            if conn is not None:
                # Return connection to the pool
                self._pool.putconn(conn)

    def close_all(self):
        """Close all connections in the pool"""
        self._pool.closeall()

# Global pool instance
db_pool = CockroachDBPool()

# Usage example
def execute_query(query, params=None):
    """Execute a query using a pooled connection"""
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            conn.commit()
            return cursor.fetchall() if cursor.description else None
```

### Asynchronous Connection Pool

For async applications, asyncpg provides a high-performance connection pool that integrates seamlessly with asyncio.

```python
# async_pool.py
# High-performance async connection pool for CockroachDB
import asyncio
import asyncpg
import os
from typing import Optional

class AsyncCockroachDBPool:
    """
    Async connection pool manager for CockroachDB.
    Provides automatic connection management and health checking.
    """
    _pool: Optional[asyncpg.Pool] = None

    @classmethod
    async def initialize(cls):
        """Initialize the connection pool"""
        if cls._pool is not None:
            return

        # Build connection string
        host = os.getenv('COCKROACH_HOST', 'localhost')
        port = os.getenv('COCKROACH_PORT', 26257)
        database = os.getenv('COCKROACH_DATABASE', 'myapp')
        user = os.getenv('COCKROACH_USER', 'pyuser')
        password = os.getenv('COCKROACH_PASSWORD', 'pypassword')

        dsn = f"postgresql://{user}:{password}@{host}:{port}/{database}"

        # Create the pool with configuration
        cls._pool = await asyncpg.create_pool(
            dsn,
            min_size=5,  # Minimum connections to keep open
            max_size=20,  # Maximum connections allowed
            max_inactive_connection_lifetime=300,  # Close idle connections after 5 minutes
            command_timeout=30,  # Query timeout in seconds
        )

    @classmethod
    async def get_pool(cls) -> asyncpg.Pool:
        """Get the connection pool, initializing if needed"""
        if cls._pool is None:
            await cls.initialize()
        return cls._pool

    @classmethod
    async def close(cls):
        """Close all connections in the pool"""
        if cls._pool is not None:
            await cls._pool.close()
            cls._pool = None

async def execute_query(query: str, *args):
    """Execute a query using the async pool"""
    pool = await AsyncCockroachDBPool.get_pool()

    # acquire() returns a connection that is automatically released
    async with pool.acquire() as conn:
        return await conn.fetch(query, *args)

async def execute_many(query: str, args_list: list):
    """Execute the same query with multiple parameter sets"""
    pool = await AsyncCockroachDBPool.get_pool()

    async with pool.acquire() as conn:
        # executemany is efficient for bulk operations
        await conn.executemany(query, args_list)
```

---

## CRUD Operations

### Creating Tables

Define your database schema using SQL. CockroachDB supports standard SQL with some distributed-specific features like `SERIAL` for auto-incrementing IDs.

```python
# schema.py
# Database schema creation for CockroachDB
from sync_pool import db_pool

def create_tables():
    """
    Create the application tables if they don't exist.
    Uses IF NOT EXISTS for idempotent schema creation.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            # Users table with auto-incrementing ID
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    username VARCHAR(100) NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    is_active BOOLEAN DEFAULT TRUE,
                    -- Index for faster email lookups
                    INDEX idx_users_email (email),
                    -- Index for username searches
                    INDEX idx_users_username (username)
                );
            """)

            # Orders table with foreign key to users
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id INT NOT NULL REFERENCES users(id),
                    total_amount DECIMAL(10, 2) NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    -- Index for user order lookups
                    INDEX idx_orders_user_id (user_id),
                    -- Index for status filtering
                    INDEX idx_orders_status (status)
                );
            """)

            # Order items table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS order_items (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    product_name VARCHAR(255) NOT NULL,
                    quantity INT NOT NULL CHECK (quantity > 0),
                    unit_price DECIMAL(10, 2) NOT NULL,
                    -- Composite index for order item lookups
                    INDEX idx_order_items_order_id (order_id)
                );
            """)

            conn.commit()
            print("Tables created successfully")

if __name__ == "__main__":
    create_tables()
```

### Insert Operations

Inserting data into CockroachDB works the same as PostgreSQL. Use parameterized queries to prevent SQL injection.

```python
# crud_insert.py
# Insert operations for CockroachDB
from sync_pool import db_pool
from datetime import datetime
from typing import Optional, Dict, List
import hashlib

def create_user(email: str, username: str, password: str) -> Optional[int]:
    """
    Create a new user and return the generated ID.
    Uses RETURNING clause to get the auto-generated ID.
    """
    # Hash the password before storing (use bcrypt in production)
    password_hash = hashlib.sha256(password.encode()).hexdigest()

    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Insert with RETURNING to get the generated ID
                cursor.execute("""
                    INSERT INTO users (email, username, password_hash)
                    VALUES (%s, %s, %s)
                    RETURNING id;
                """, (email, username, password_hash))

                # Fetch the returned ID
                user_id = cursor.fetchone()[0]
                conn.commit()

                return user_id
            except Exception as e:
                # Rollback on error
                conn.rollback()
                print(f"Error creating user: {e}")
                return None

def create_order(user_id: int, items: List[Dict]) -> Optional[str]:
    """
    Create an order with multiple items in a single transaction.
    Calculates total from items and inserts everything atomically.
    """
    # Calculate total amount from items
    total_amount = sum(
        item['quantity'] * item['unit_price']
        for item in items
    )

    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Insert the order header
                cursor.execute("""
                    INSERT INTO orders (user_id, total_amount, status)
                    VALUES (%s, %s, 'pending')
                    RETURNING id;
                """, (user_id, total_amount))

                order_id = cursor.fetchone()[0]

                # Insert all order items
                for item in items:
                    cursor.execute("""
                        INSERT INTO order_items
                        (order_id, product_name, quantity, unit_price)
                        VALUES (%s, %s, %s, %s);
                    """, (
                        order_id,
                        item['product_name'],
                        item['quantity'],
                        item['unit_price']
                    ))

                # Commit the entire transaction
                conn.commit()
                return str(order_id)

            except Exception as e:
                # Rollback everything on error
                conn.rollback()
                print(f"Error creating order: {e}")
                return None

def bulk_insert_users(users: List[Dict]) -> int:
    """
    Insert multiple users efficiently using executemany.
    Returns the number of users inserted.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Prepare data tuples
                data = [
                    (
                        user['email'],
                        user['username'],
                        hashlib.sha256(user['password'].encode()).hexdigest()
                    )
                    for user in users
                ]

                # Use execute with multiple values for bulk insert
                # CockroachDB handles this efficiently
                args_str = ','.join(
                    cursor.mogrify("(%s, %s, %s)", d).decode('utf-8')
                    for d in data
                )

                cursor.execute(f"""
                    INSERT INTO users (email, username, password_hash)
                    VALUES {args_str}
                    ON CONFLICT (email) DO NOTHING;
                """)

                inserted = cursor.rowcount
                conn.commit()

                return inserted

            except Exception as e:
                conn.rollback()
                print(f"Bulk insert error: {e}")
                return 0
```

### Read Operations

Reading data from CockroachDB supports all standard SQL queries. Use appropriate indexes for better performance.

```python
# crud_read.py
# Read operations for CockroachDB
from sync_pool import db_pool
from typing import Optional, Dict, List

def get_user_by_id(user_id: int) -> Optional[Dict]:
    """
    Fetch a single user by ID.
    Returns None if user not found.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, email, username, created_at, is_active
                FROM users
                WHERE id = %s;
            """, (user_id,))

            row = cursor.fetchone()

            if row is None:
                return None

            # Convert to dictionary
            return {
                'id': row[0],
                'email': row[1],
                'username': row[2],
                'created_at': row[3],
                'is_active': row[4]
            }

def get_user_by_email(email: str) -> Optional[Dict]:
    """
    Fetch a user by email address.
    Uses the email index for efficient lookup.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, email, username, password_hash, is_active
                FROM users
                WHERE email = %s;
            """, (email,))

            row = cursor.fetchone()

            if row is None:
                return None

            return {
                'id': row[0],
                'email': row[1],
                'username': row[2],
                'password_hash': row[3],
                'is_active': row[4]
            }

def get_user_orders(user_id: int, limit: int = 10, offset: int = 0) -> List[Dict]:
    """
    Fetch orders for a user with pagination.
    Includes order items in a single query using JSON aggregation.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            # Use JSON aggregation to include items in the result
            cursor.execute("""
                SELECT
                    o.id,
                    o.total_amount,
                    o.status,
                    o.created_at,
                    json_agg(
                        json_build_object(
                            'product_name', oi.product_name,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price
                        )
                    ) as items
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.user_id = %s
                GROUP BY o.id, o.total_amount, o.status, o.created_at
                ORDER BY o.created_at DESC
                LIMIT %s OFFSET %s;
            """, (user_id, limit, offset))

            rows = cursor.fetchall()

            return [
                {
                    'id': str(row[0]),
                    'total_amount': float(row[1]),
                    'status': row[2],
                    'created_at': row[3],
                    'items': row[4] if row[4] != [None] else []
                }
                for row in rows
            ]

def search_users(
    query: str,
    limit: int = 20,
    active_only: bool = True
) -> List[Dict]:
    """
    Search users by username or email.
    Uses ILIKE for case-insensitive partial matching.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            # Build the search pattern
            search_pattern = f"%{query}%"

            # Base query with optional active filter
            sql = """
                SELECT id, email, username, created_at
                FROM users
                WHERE (username ILIKE %s OR email ILIKE %s)
            """

            params = [search_pattern, search_pattern]

            if active_only:
                sql += " AND is_active = TRUE"

            sql += " ORDER BY username LIMIT %s;"
            params.append(limit)

            cursor.execute(sql, params)
            rows = cursor.fetchall()

            return [
                {
                    'id': row[0],
                    'email': row[1],
                    'username': row[2],
                    'created_at': row[3]
                }
                for row in rows
            ]
```

### Update Operations

Updating records uses standard SQL UPDATE statements. Always include WHERE clauses to avoid updating all rows.

```python
# crud_update.py
# Update operations for CockroachDB
from sync_pool import db_pool
from datetime import datetime
from typing import Optional, Dict

def update_user(user_id: int, updates: Dict) -> bool:
    """
    Update user fields dynamically.
    Only updates fields that are provided in the updates dict.
    """
    # Allowed fields for update
    allowed_fields = {'email', 'username', 'is_active'}

    # Filter to only allowed fields
    valid_updates = {
        k: v for k, v in updates.items()
        if k in allowed_fields
    }

    if not valid_updates:
        return False

    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Build the SET clause dynamically
                set_clauses = []
                params = []

                for field, value in valid_updates.items():
                    set_clauses.append(f"{field} = %s")
                    params.append(value)

                # Always update the updated_at timestamp
                set_clauses.append("updated_at = NOW()")

                # Add user_id as the last parameter
                params.append(user_id)

                sql = f"""
                    UPDATE users
                    SET {', '.join(set_clauses)}
                    WHERE id = %s;
                """

                cursor.execute(sql, params)
                conn.commit()

                # Check if any row was updated
                return cursor.rowcount > 0

            except Exception as e:
                conn.rollback()
                print(f"Update error: {e}")
                return False

def update_order_status(order_id: str, new_status: str) -> bool:
    """
    Update the status of an order.
    Validates status transitions before updating.
    """
    # Valid status values
    valid_statuses = {'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'}

    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status: {new_status}")

    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute("""
                    UPDATE orders
                    SET status = %s
                    WHERE id = %s;
                """, (new_status, order_id))

                conn.commit()
                return cursor.rowcount > 0

            except Exception as e:
                conn.rollback()
                print(f"Status update error: {e}")
                return False

def increment_with_optimistic_lock(
    user_id: int,
    field: str,
    amount: int,
    expected_version: int
) -> bool:
    """
    Increment a numeric field using optimistic locking.
    Fails if the version has changed since last read.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Attempt update only if version matches
                cursor.execute(f"""
                    UPDATE users
                    SET {field} = {field} + %s,
                        version = version + 1
                    WHERE id = %s AND version = %s;
                """, (amount, user_id, expected_version))

                conn.commit()

                # If no rows updated, version changed (concurrent modification)
                if cursor.rowcount == 0:
                    return False

                return True

            except Exception as e:
                conn.rollback()
                print(f"Optimistic lock update error: {e}")
                return False
```

### Delete Operations

Deleting records should be done carefully. Consider soft deletes for audit trails.

```python
# crud_delete.py
# Delete operations for CockroachDB
from sync_pool import db_pool
from typing import List

def delete_user(user_id: int, hard_delete: bool = False) -> bool:
    """
    Delete a user. By default, performs a soft delete.
    Hard delete permanently removes the record.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            try:
                if hard_delete:
                    # Permanent deletion
                    cursor.execute("""
                        DELETE FROM users
                        WHERE id = %s;
                    """, (user_id,))
                else:
                    # Soft delete - just mark as inactive
                    cursor.execute("""
                        UPDATE users
                        SET is_active = FALSE,
                            updated_at = NOW()
                        WHERE id = %s;
                    """, (user_id,))

                conn.commit()
                return cursor.rowcount > 0

            except Exception as e:
                conn.rollback()
                print(f"Delete error: {e}")
                return False

def delete_old_orders(days_old: int = 365) -> int:
    """
    Delete orders older than specified days.
    Uses CASCADE to automatically delete related order_items.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute("""
                    DELETE FROM orders
                    WHERE created_at < NOW() - INTERVAL '%s days'
                    AND status IN ('delivered', 'cancelled');
                """, (days_old,))

                deleted_count = cursor.rowcount
                conn.commit()

                return deleted_count

            except Exception as e:
                conn.rollback()
                print(f"Bulk delete error: {e}")
                return 0

def batch_delete_users(user_ids: List[int]) -> int:
    """
    Delete multiple users in a single transaction.
    Returns the count of deleted users.
    """
    if not user_ids:
        return 0

    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Use ANY for efficient batch deletion
                cursor.execute("""
                    DELETE FROM users
                    WHERE id = ANY(%s);
                """, (user_ids,))

                deleted_count = cursor.rowcount
                conn.commit()

                return deleted_count

            except Exception as e:
                conn.rollback()
                print(f"Batch delete error: {e}")
                return 0
```

---

## Transaction Handling

CockroachDB provides strong ACID guarantees with serializable isolation by default. Understanding transactions is crucial for data consistency.

```mermaid
sequenceDiagram
    participant App as Python App
    participant DB as CockroachDB

    App->>DB: BEGIN TRANSACTION
    App->>DB: SELECT balance FROM accounts WHERE id = 1
    DB-->>App: balance = 1000
    App->>DB: UPDATE accounts SET balance = 900 WHERE id = 1
    App->>DB: UPDATE accounts SET balance = balance + 100 WHERE id = 2
    App->>DB: COMMIT
    DB-->>App: Success

    Note over App,DB: If any step fails, entire transaction rolls back
```

### Basic Transaction with Retry Logic

CockroachDB can return retry errors under contention. Implementing retry logic ensures your application handles these gracefully.

```python
# transactions.py
# Transaction handling with automatic retry for CockroachDB
from sync_pool import db_pool
import psycopg2
import time
import random
from typing import Callable, Any
from functools import wraps

# CockroachDB retry error codes
RETRY_ERROR_CODES = {
    '40001',  # Serialization failure
    '40003',  # Statement completion unknown
}

def with_retry(max_retries: int = 5, base_delay: float = 0.1):
    """
    Decorator for automatic retry on transient errors.
    Uses exponential backoff with jitter.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_error = None

            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except psycopg2.Error as e:
                    last_error = e
                    error_code = e.pgcode if hasattr(e, 'pgcode') else None

                    # Check if error is retryable
                    if error_code not in RETRY_ERROR_CODES:
                        raise  # Non-retryable error

                    if attempt < max_retries - 1:
                        # Calculate delay with exponential backoff and jitter
                        delay = base_delay * (2 ** attempt)
                        jitter = random.uniform(0, delay * 0.1)
                        time.sleep(delay + jitter)

                        print(f"Retry attempt {attempt + 1} after error: {e}")

            # Max retries exceeded
            raise last_error

        return wrapper
    return decorator

@with_retry(max_retries=5)
def transfer_funds(from_account: int, to_account: int, amount: float) -> bool:
    """
    Transfer funds between accounts atomically.
    Automatically retries on serialization conflicts.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Check source account balance
                cursor.execute("""
                    SELECT balance
                    FROM accounts
                    WHERE id = %s
                    FOR UPDATE;
                """, (from_account,))

                result = cursor.fetchone()
                if result is None:
                    raise ValueError(f"Account {from_account} not found")

                balance = result[0]

                if balance < amount:
                    raise ValueError("Insufficient funds")

                # Deduct from source account
                cursor.execute("""
                    UPDATE accounts
                    SET balance = balance - %s
                    WHERE id = %s;
                """, (amount, from_account))

                # Add to destination account
                cursor.execute("""
                    UPDATE accounts
                    SET balance = balance + %s
                    WHERE id = %s;
                """, (amount, to_account))

                # Record the transfer
                cursor.execute("""
                    INSERT INTO transfers
                    (from_account, to_account, amount, created_at)
                    VALUES (%s, %s, %s, NOW());
                """, (from_account, to_account, amount))

                conn.commit()
                return True

            except Exception as e:
                conn.rollback()
                raise

class TransactionContext:
    """
    Context manager for explicit transaction control.
    Supports savepoints for partial rollbacks.
    """

    def __init__(self, conn, savepoint_name: str = None):
        self.conn = conn
        self.savepoint_name = savepoint_name
        self.cursor = None

    def __enter__(self):
        self.cursor = self.conn.cursor()

        if self.savepoint_name:
            # Create a savepoint for nested transactions
            self.cursor.execute(f"SAVEPOINT {self.savepoint_name}")

        return self.cursor

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # Error occurred - rollback
            if self.savepoint_name:
                self.cursor.execute(f"ROLLBACK TO SAVEPOINT {self.savepoint_name}")
            else:
                self.conn.rollback()
        else:
            # Success - commit or release savepoint
            if self.savepoint_name:
                self.cursor.execute(f"RELEASE SAVEPOINT {self.savepoint_name}")
            else:
                self.conn.commit()

        self.cursor.close()
        return False  # Don't suppress exceptions
```

### Async Transactions

For async applications, asyncpg provides transaction support with context managers.

```python
# async_transactions.py
# Async transaction handling for CockroachDB
import asyncio
import asyncpg
from async_pool import AsyncCockroachDBPool
from typing import Any
import random

async def run_in_transaction(callback):
    """
    Execute a callback function within a transaction.
    Automatically handles commit and rollback.
    """
    pool = await AsyncCockroachDBPool.get_pool()

    async with pool.acquire() as conn:
        # asyncpg transaction context manager
        async with conn.transaction():
            # The callback receives the connection
            return await callback(conn)

async def transfer_funds_async(
    from_account: int,
    to_account: int,
    amount: float,
    max_retries: int = 5
) -> bool:
    """
    Async fund transfer with retry logic.
    Uses asyncpg's transaction support.
    """
    pool = await AsyncCockroachDBPool.get_pool()

    for attempt in range(max_retries):
        try:
            async with pool.acquire() as conn:
                async with conn.transaction():
                    # Lock and check source account
                    balance = await conn.fetchval("""
                        SELECT balance
                        FROM accounts
                        WHERE id = $1
                        FOR UPDATE
                    """, from_account)

                    if balance is None:
                        raise ValueError(f"Account {from_account} not found")

                    if balance < amount:
                        raise ValueError("Insufficient funds")

                    # Perform the transfer
                    await conn.execute("""
                        UPDATE accounts
                        SET balance = balance - $1
                        WHERE id = $2
                    """, amount, from_account)

                    await conn.execute("""
                        UPDATE accounts
                        SET balance = balance + $1
                        WHERE id = $2
                    """, amount, to_account)

                    # Record transfer
                    await conn.execute("""
                        INSERT INTO transfers
                        (from_account, to_account, amount)
                        VALUES ($1, $2, $3)
                    """, from_account, to_account, amount)

                    return True

        except asyncpg.SerializationError as e:
            # Retryable error
            if attempt < max_retries - 1:
                delay = 0.1 * (2 ** attempt) + random.uniform(0, 0.1)
                await asyncio.sleep(delay)
            else:
                raise
        except Exception:
            raise

    return False

async def batch_insert_with_transaction(records: list) -> int:
    """
    Insert multiple records in a single transaction.
    Rolls back all inserts if any fails.
    """
    pool = await AsyncCockroachDBPool.get_pool()

    async with pool.acquire() as conn:
        async with conn.transaction():
            # Use COPY for efficient bulk inserts
            result = await conn.copy_records_to_table(
                'users',
                records=records,
                columns=['email', 'username', 'password_hash']
            )

            return len(records)
```

---

## Using SQLAlchemy ORM

SQLAlchemy provides a high-level ORM that works well with CockroachDB. The cockroachdb dialect handles CockroachDB-specific features.

```python
# models.py
# SQLAlchemy models for CockroachDB
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.sql import func
import uuid
import os

# Create the database engine with CockroachDB dialect
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'cockroachdb://pyuser:pypassword@localhost:26257/myapp'
)

# Engine configuration optimized for CockroachDB
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Check connections before using
    pool_recycle=3600,  # Recycle connections after 1 hour
)

# Create session factory
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# Base class for models
Base = declarative_base()

class User(Base):
    """User model with standard fields"""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to orders
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"

class Order(Base):
    """Order model with UUID primary key"""
    __tablename__ = 'orders'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), default='pending', index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order(id={self.id}, status='{self.status}')>"

class OrderItem(Base):
    """Order item model"""
    __tablename__ = 'order_items'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)

    # Relationship to order
    order = relationship("Order", back_populates="items")

    def __repr__(self):
        return f"<OrderItem(id={self.id}, product='{self.product_name}')>"

def init_db():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)
    print("Database initialized")
```

### SQLAlchemy CRUD Operations

Using the ORM simplifies database operations while maintaining type safety.

```python
# orm_crud.py
# SQLAlchemy CRUD operations for CockroachDB
from models import SessionLocal, User, Order, OrderItem
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from contextlib import contextmanager
from typing import Optional, List, Dict
from decimal import Decimal

@contextmanager
def get_session():
    """
    Context manager for database sessions.
    Ensures proper cleanup and transaction handling.
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def create_user_orm(email: str, username: str, password_hash: str) -> Optional[User]:
    """Create a new user using SQLAlchemy ORM"""
    with get_session() as session:
        try:
            user = User(
                email=email,
                username=username,
                password_hash=password_hash
            )
            session.add(user)
            session.flush()  # Get the generated ID

            # Refresh to get all server-generated values
            session.refresh(user)
            return user

        except IntegrityError as e:
            print(f"User creation failed (duplicate?): {e}")
            return None

def get_user_orm(user_id: int) -> Optional[User]:
    """Fetch a user by ID"""
    with get_session() as session:
        return session.query(User).filter(User.id == user_id).first()

def search_users_orm(query: str, limit: int = 20) -> List[User]:
    """Search users by email or username"""
    with get_session() as session:
        return session.query(User).filter(
            or_(
                User.email.ilike(f"%{query}%"),
                User.username.ilike(f"%{query}%")
            ),
            User.is_active == True
        ).limit(limit).all()

def create_order_orm(user_id: int, items: List[Dict]) -> Optional[Order]:
    """
    Create an order with items using ORM.
    Demonstrates relationship handling.
    """
    with get_session() as session:
        # Calculate total
        total = sum(
            Decimal(str(item['quantity'])) * Decimal(str(item['unit_price']))
            for item in items
        )

        # Create order
        order = Order(
            user_id=user_id,
            total_amount=total,
            status='pending'
        )

        # Add items to order
        for item in items:
            order_item = OrderItem(
                product_name=item['product_name'],
                quantity=item['quantity'],
                unit_price=Decimal(str(item['unit_price']))
            )
            order.items.append(order_item)

        session.add(order)
        session.flush()
        session.refresh(order)

        return order

def update_user_orm(user_id: int, updates: Dict) -> bool:
    """Update user fields using ORM"""
    with get_session() as session:
        user = session.query(User).filter(User.id == user_id).first()

        if user is None:
            return False

        # Update allowed fields
        allowed = {'email', 'username', 'is_active'}
        for field, value in updates.items():
            if field in allowed:
                setattr(user, field, value)

        return True

def delete_user_orm(user_id: int, hard_delete: bool = False) -> bool:
    """Delete or deactivate a user"""
    with get_session() as session:
        user = session.query(User).filter(User.id == user_id).first()

        if user is None:
            return False

        if hard_delete:
            session.delete(user)
        else:
            user.is_active = False

        return True

def get_user_with_orders(user_id: int) -> Optional[User]:
    """
    Fetch user with eagerly loaded orders.
    Avoids N+1 query problem.
    """
    from sqlalchemy.orm import joinedload

    with get_session() as session:
        return session.query(User).options(
            joinedload(User.orders).joinedload(Order.items)
        ).filter(User.id == user_id).first()
```

---

## Performance Optimization

### Query Optimization with EXPLAIN

Understanding query execution helps optimize performance. CockroachDB's EXPLAIN shows how queries are executed.

```python
# query_optimization.py
# Query analysis and optimization tools for CockroachDB
from sync_pool import db_pool
from typing import Dict, List

def analyze_query(query: str, params: tuple = None) -> Dict:
    """
    Analyze a query using EXPLAIN ANALYZE.
    Returns execution statistics and optimization suggestions.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            # Run EXPLAIN ANALYZE to get execution stats
            explain_query = f"EXPLAIN ANALYZE {query}"
            cursor.execute(explain_query, params)

            rows = cursor.fetchall()
            plan = '\n'.join(row[0] for row in rows)

            # Parse key metrics from the plan
            metrics = {
                'plan': plan,
                'suggestions': []
            }

            # Check for common issues
            if 'full scan' in plan.lower():
                metrics['suggestions'].append(
                    "Full table scan detected - consider adding an index"
                )

            if 'hash join' in plan.lower():
                metrics['suggestions'].append(
                    "Hash join detected - may indicate missing index on join columns"
                )

            return metrics

def check_missing_indexes() -> List[Dict]:
    """
    Identify tables that might benefit from additional indexes.
    Analyzes table statistics and query patterns.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            # Query index statistics
            cursor.execute("""
                SELECT
                    table_name,
                    index_name,
                    total_reads,
                    total_writes
                FROM crdb_internal.index_usage_statistics
                WHERE total_reads = 0 AND total_writes > 0
                ORDER BY total_writes DESC
                LIMIT 10;
            """)

            unused_indexes = cursor.fetchall()

            results = []
            for row in unused_indexes:
                results.append({
                    'table': row[0],
                    'index': row[1],
                    'reads': row[2],
                    'writes': row[3],
                    'recommendation': 'Consider removing - unused index with write overhead'
                })

            return results

def get_slow_queries(min_latency_ms: int = 100) -> List[Dict]:
    """
    Find slow queries from CockroachDB's query log.
    Helps identify optimization targets.
    """
    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    query,
                    count,
                    mean_latency,
                    max_latency
                FROM crdb_internal.node_statement_statistics
                WHERE mean_latency > INTERVAL '%s milliseconds'
                ORDER BY mean_latency DESC
                LIMIT 20;
            """, (min_latency_ms,))

            rows = cursor.fetchall()

            return [
                {
                    'query': row[0][:200],  # Truncate long queries
                    'execution_count': row[1],
                    'mean_latency': str(row[2]),
                    'max_latency': str(row[3])
                }
                for row in rows
            ]
```

### Batch Operations

Batching operations reduces round trips and improves throughput significantly.

```python
# batch_operations.py
# Efficient batch operations for CockroachDB
from sync_pool import db_pool
from typing import List, Dict, Tuple
import itertools

def batch_insert(
    table: str,
    columns: List[str],
    records: List[Tuple],
    batch_size: int = 1000
) -> int:
    """
    Insert records in batches for better performance.
    Returns total number of records inserted.
    """
    total_inserted = 0

    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            # Process in batches
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]

                # Build the VALUES clause
                placeholders = ','.join(
                    '(' + ','.join(['%s'] * len(columns)) + ')'
                    for _ in batch
                )

                # Flatten the batch for parameter substitution
                flat_values = list(itertools.chain.from_iterable(batch))

                sql = f"""
                    INSERT INTO {table} ({','.join(columns)})
                    VALUES {placeholders}
                    ON CONFLICT DO NOTHING
                """

                cursor.execute(sql, flat_values)
                total_inserted += cursor.rowcount

            conn.commit()

    return total_inserted

def batch_upsert(
    table: str,
    columns: List[str],
    records: List[Tuple],
    conflict_columns: List[str],
    update_columns: List[str],
    batch_size: int = 500
) -> int:
    """
    Upsert records in batches.
    Updates existing records or inserts new ones.
    """
    total_affected = 0

    with db_pool.get_connection() as conn:
        with conn.cursor() as cursor:
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]

                placeholders = ','.join(
                    '(' + ','.join(['%s'] * len(columns)) + ')'
                    for _ in batch
                )

                flat_values = list(itertools.chain.from_iterable(batch))

                # Build ON CONFLICT clause
                conflict_clause = ','.join(conflict_columns)
                update_clause = ','.join(
                    f"{col} = EXCLUDED.{col}"
                    for col in update_columns
                )

                sql = f"""
                    INSERT INTO {table} ({','.join(columns)})
                    VALUES {placeholders}
                    ON CONFLICT ({conflict_clause})
                    DO UPDATE SET {update_clause}
                """

                cursor.execute(sql, flat_values)
                total_affected += cursor.rowcount

            conn.commit()

    return total_affected

async def async_batch_insert(
    table: str,
    columns: List[str],
    records: List[Tuple],
    batch_size: int = 1000
) -> int:
    """
    Async batch insert using asyncpg's COPY protocol.
    Significantly faster for large datasets.
    """
    from async_pool import AsyncCockroachDBPool

    pool = await AsyncCockroachDBPool.get_pool()

    async with pool.acquire() as conn:
        # COPY is the fastest way to insert large amounts of data
        result = await conn.copy_records_to_table(
            table,
            records=records,
            columns=columns
        )

        return len(records)
```

---

## Error Handling

Proper error handling is crucial for distributed databases. CockroachDB can return specific errors that require different handling strategies.

```python
# error_handling.py
# Comprehensive error handling for CockroachDB
import psycopg2
from psycopg2 import errors
from typing import Optional, Any, Callable
from functools import wraps
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CockroachDBError(Exception):
    """Base exception for CockroachDB errors"""
    pass

class RetryableError(CockroachDBError):
    """Error that should be retried"""
    pass

class NonRetryableError(CockroachDBError):
    """Error that should not be retried"""
    pass

# Map PostgreSQL error codes to our exception types
RETRYABLE_ERRORS = {
    '40001',  # serialization_failure
    '40003',  # statement_completion_unknown
    '08006',  # connection_failure
    '08001',  # sqlclient_unable_to_establish_sqlconnection
    '57P01',  # admin_shutdown
}

def classify_error(error: psycopg2.Error) -> CockroachDBError:
    """
    Classify a database error as retryable or non-retryable.
    Returns appropriate exception type.
    """
    error_code = getattr(error, 'pgcode', None)

    if error_code in RETRYABLE_ERRORS:
        return RetryableError(str(error))

    # Check for specific error types
    if isinstance(error, errors.UniqueViolation):
        return NonRetryableError(f"Duplicate key: {error}")

    if isinstance(error, errors.ForeignKeyViolation):
        return NonRetryableError(f"Foreign key constraint: {error}")

    if isinstance(error, errors.CheckViolation):
        return NonRetryableError(f"Check constraint violated: {error}")

    if isinstance(error, errors.NotNullViolation):
        return NonRetryableError(f"Not null constraint: {error}")

    # Default to non-retryable for unknown errors
    return NonRetryableError(str(error))

def handle_db_errors(func: Callable) -> Callable:
    """
    Decorator for consistent database error handling.
    Logs errors and converts to appropriate exception types.
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        try:
            return func(*args, **kwargs)
        except psycopg2.Error as e:
            logger.error(f"Database error in {func.__name__}: {e}")

            # Classify and re-raise
            classified_error = classify_error(e)
            raise classified_error from e

        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {e}")
            raise

    return wrapper

@handle_db_errors
def safe_insert(conn, table: str, data: dict) -> Optional[int]:
    """
    Insert with proper error handling.
    Returns inserted ID or None on constraint violation.
    """
    columns = ', '.join(data.keys())
    placeholders = ', '.join(['%s'] * len(data))
    values = list(data.values())

    with conn.cursor() as cursor:
        try:
            cursor.execute(f"""
                INSERT INTO {table} ({columns})
                VALUES ({placeholders})
                RETURNING id
            """, values)

            conn.commit()
            return cursor.fetchone()[0]

        except errors.UniqueViolation:
            conn.rollback()
            logger.warning(f"Duplicate entry in {table}")
            return None

def with_connection_recovery(func: Callable) -> Callable:
    """
    Decorator that recovers from connection failures.
    Recreates connection and retries operation.
    """
    from sync_pool import db_pool

    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        max_attempts = 3

        for attempt in range(max_attempts):
            try:
                return func(*args, **kwargs)
            except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
                logger.warning(f"Connection error (attempt {attempt + 1}): {e}")

                if attempt < max_attempts - 1:
                    # Connection might be stale, try again
                    continue
                else:
                    raise CockroachDBError("Connection recovery failed") from e

    return wrapper
```

---

## Health Checks

Implementing health checks ensures your application can monitor CockroachDB connectivity and respond appropriately.

```python
# health_checks.py
# Health check implementation for CockroachDB
from sync_pool import db_pool
from async_pool import AsyncCockroachDBPool
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from typing import Dict, Optional
import asyncio

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@dataclass
class HealthCheckResult:
    status: HealthStatus
    latency_ms: float
    message: Optional[str] = None
    details: Optional[Dict] = None

def check_cockroachdb_health() -> HealthCheckResult:
    """
    Synchronous health check for CockroachDB.
    Verifies connectivity and measures response time.
    """
    start = datetime.utcnow()

    try:
        with db_pool.get_connection() as conn:
            with conn.cursor() as cursor:
                # Simple connectivity test
                cursor.execute("SELECT 1")
                cursor.fetchone()

                latency = (datetime.utcnow() - start).total_seconds() * 1000

                # Get cluster health info
                cursor.execute("""
                    SELECT count(*) as node_count
                    FROM crdb_internal.gossip_nodes
                    WHERE is_live = true
                """)
                live_nodes = cursor.fetchone()[0]

                # Determine health status
                if latency > 1000:  # More than 1 second
                    return HealthCheckResult(
                        status=HealthStatus.DEGRADED,
                        latency_ms=latency,
                        message="High latency detected",
                        details={"live_nodes": live_nodes}
                    )

                return HealthCheckResult(
                    status=HealthStatus.HEALTHY,
                    latency_ms=latency,
                    details={"live_nodes": live_nodes}
                )

    except Exception as e:
        latency = (datetime.utcnow() - start).total_seconds() * 1000
        return HealthCheckResult(
            status=HealthStatus.UNHEALTHY,
            latency_ms=latency,
            message=str(e)
        )

async def check_cockroachdb_health_async() -> HealthCheckResult:
    """
    Async health check for CockroachDB.
    Suitable for async web frameworks.
    """
    start = datetime.utcnow()

    try:
        pool = await AsyncCockroachDBPool.get_pool()

        async with pool.acquire() as conn:
            # Connectivity test
            await conn.fetchval("SELECT 1")

            latency = (datetime.utcnow() - start).total_seconds() * 1000

            # Get cluster info
            live_nodes = await conn.fetchval("""
                SELECT count(*)
                FROM crdb_internal.gossip_nodes
                WHERE is_live = true
            """)

            if latency > 1000:
                return HealthCheckResult(
                    status=HealthStatus.DEGRADED,
                    latency_ms=latency,
                    message="High latency",
                    details={"live_nodes": live_nodes}
                )

            return HealthCheckResult(
                status=HealthStatus.HEALTHY,
                latency_ms=latency,
                details={"live_nodes": live_nodes}
            )

    except Exception as e:
        latency = (datetime.utcnow() - start).total_seconds() * 1000
        return HealthCheckResult(
            status=HealthStatus.UNHEALTHY,
            latency_ms=latency,
            message=str(e)
        )

# FastAPI health endpoint example
from fastapi import FastAPI, Response

app = FastAPI()

@app.get("/health/db")
async def database_health(response: Response):
    """Health endpoint for CockroachDB"""
    result = await check_cockroachdb_health_async()

    if result.status == HealthStatus.UNHEALTHY:
        response.status_code = 503
    elif result.status == HealthStatus.DEGRADED:
        response.status_code = 200  # Still operational

    return {
        "status": result.status.value,
        "latency_ms": result.latency_ms,
        "message": result.message,
        "details": result.details
    }
```

---

## Best Practices

### 1. Use Connection Pooling

Always use connection pools in production to avoid connection overhead.

```python
# GOOD: Use pooled connections
with db_pool.get_connection() as conn:
    # Work with connection
    pass

# BAD: Create new connection each time
conn = psycopg2.connect(...)  # Don't do this repeatedly
```

### 2. Implement Retry Logic

CockroachDB can return retry errors under contention.

```python
# GOOD: Retry transient errors
@with_retry(max_retries=5)
def update_balance(user_id, amount):
    # Update logic
    pass

# BAD: No retry handling
def update_balance(user_id, amount):
    # Will fail on serialization errors
    pass
```

### 3. Use Parameterized Queries

Always use parameterized queries to prevent SQL injection.

```python
# GOOD: Parameterized query
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# BAD: String formatting (SQL injection risk)
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

### 4. Handle Transactions Explicitly

Control transaction boundaries for data consistency.

```python
# GOOD: Explicit transaction control
conn.autocommit = False
try:
    # Multiple operations
    conn.commit()
except Exception:
    conn.rollback()
    raise

# BAD: Implicit commits
conn.autocommit = True  # Each statement commits immediately
```

### 5. Use Appropriate Indexes

Create indexes based on your query patterns.

```python
# Analyze slow queries
slow_queries = get_slow_queries(min_latency_ms=100)

# Check for missing indexes
for query_info in slow_queries:
    analysis = analyze_query(query_info['query'])
    print(analysis['suggestions'])
```

---

## Conclusion

CockroachDB provides a powerful distributed SQL database that integrates seamlessly with Python applications. Key takeaways include:

- **Connection Management**: Use connection pooling for production applications
- **Transaction Handling**: Implement retry logic for serialization errors
- **ORM Support**: SQLAlchemy works well with the cockroachdb dialect
- **Performance**: Batch operations and proper indexing improve throughput
- **Error Handling**: Classify errors and handle them appropriately

By following these patterns, you can build resilient Python applications that leverage CockroachDB's distributed architecture.

---

*Need to monitor your CockroachDB clusters? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring with automatic alerting and performance tracking.*

**Related Reading:**
- [How to Implement Health Checks in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [How to Handle Database Migrations in MySQL](https://oneuptime.com/blog/post/2026-02-02-mysql-database-migrations/view)
