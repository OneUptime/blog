# How to Fix 'TimeoutError' in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, TimeoutError, Networking, Error Handling, Async, Performance

Description: Learn how to handle and prevent TimeoutError in Python. This guide covers timeout configuration, retry strategies, and best practices for network operations and async code.

---

> TimeoutError occurs when an operation takes longer than the allowed time limit. In Python, this error can arise from network requests, database queries, subprocess execution, or async operations. Properly handling timeouts is essential for building responsive, resilient applications.

This guide shows you how to configure timeouts, handle timeout exceptions, and implement retry logic for various Python scenarios.

---

## Understanding TimeoutError

Python raises TimeoutError in several contexts:

```python
# Built-in TimeoutError
import socket
import asyncio

# Socket timeout
sock = socket.socket()
sock.settimeout(5.0)
try:
    sock.connect(('example.com', 80))
except TimeoutError:
    print("Connection timed out")

# Asyncio timeout
async def slow_operation():
    await asyncio.sleep(10)

async def main():
    try:
        await asyncio.wait_for(slow_operation(), timeout=5.0)
    except TimeoutError:
        print("Async operation timed out")
```

---

## Network Request Timeouts

### requests Library

```python
# requests_timeout.py
# Setting timeouts with requests library
import requests
from requests.exceptions import Timeout, ConnectionError

def fetch_with_timeout(url: str, connect_timeout: float = 5.0, read_timeout: float = 30.0):
    """Fetch URL with separate connect and read timeouts."""
    try:
        # timeout=(connect, read)
        response = requests.get(url, timeout=(connect_timeout, read_timeout))
        response.raise_for_status()
        return response.json()

    except Timeout as e:
        print(f"Request timed out: {e}")
        return None

    except ConnectionError as e:
        print(f"Connection failed: {e}")
        return None

# Usage
data = fetch_with_timeout("https://api.example.com/data")

# Different timeout strategies
# Fast timeout for health checks
health = requests.get("https://api.example.com/health", timeout=2.0)

# Longer timeout for file downloads
file_response = requests.get(
    "https://api.example.com/large-file",
    timeout=(5, 300),  # 5s connect, 5 minutes read
    stream=True
)
```

### httpx Library (Async)

```python
# httpx_timeout.py
# Async HTTP with httpx and timeout handling
import httpx
import asyncio

async def fetch_async(url: str, timeout: float = 30.0):
    """Async fetch with timeout."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=timeout)
            return response.json()

    except httpx.TimeoutException as e:
        print(f"Request timed out: {e}")
        return None

    except httpx.ConnectError as e:
        print(f"Connection failed: {e}")
        return None

# Fine-grained timeout configuration
async def fetch_with_detailed_timeout(url: str):
    """Fetch with detailed timeout configuration."""
    timeout_config = httpx.Timeout(
        connect=5.0,    # Time to establish connection
        read=30.0,      # Time to receive response
        write=10.0,     # Time to send request
        pool=5.0        # Time to acquire connection from pool
    )

    async with httpx.AsyncClient(timeout=timeout_config) as client:
        return await client.get(url)
```

---

## Async Timeout Handling

### Using asyncio.wait_for

```python
# async_timeout.py
# Handling timeouts in async code
import asyncio
from typing import TypeVar, Callable, Any

T = TypeVar('T')

async def slow_database_query():
    """Simulate a slow database operation."""
    await asyncio.sleep(10)
    return {"result": "data"}

async def with_timeout(coro, timeout: float, default=None):
    """Execute coroutine with timeout, returning default on timeout."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        return default

async def main():
    # Using wait_for directly
    try:
        result = await asyncio.wait_for(
            slow_database_query(),
            timeout=5.0
        )
    except asyncio.TimeoutError:
        print("Query timed out, using cached data")
        result = get_cached_data()

    # Using helper function
    result = await with_timeout(
        slow_database_query(),
        timeout=5.0,
        default={"result": "timeout_default"}
    )
    print(result)

asyncio.run(main())
```

### Using asyncio.timeout (Python 3.11+)

```python
# async_timeout_context.py
# Context manager based timeout (Python 3.11+)
import asyncio

async def process_request():
    """Process with timeout context manager."""
    try:
        async with asyncio.timeout(5.0):
            # Everything in this block must complete in 5 seconds
            await fetch_data()
            await process_data()
            await save_results()
    except TimeoutError:
        print("Processing took too long")
        await cancel_and_cleanup()

# For earlier Python versions, use asyncio-timeout package
# pip install asyncio-timeout
from async_timeout import timeout

async def process_request_compat():
    """Compatible with Python < 3.11."""
    try:
        async with timeout(5.0):
            await fetch_data()
    except asyncio.TimeoutError:
        print("Timed out")
```

---

## Database Operation Timeouts

### SQLAlchemy

```python
# sqlalchemy_timeout.py
# Database query timeouts with SQLAlchemy
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError

# Engine with connection timeout
engine = create_engine(
    "postgresql://user:pass@localhost/db",
    connect_args={
        "connect_timeout": 10,  # Connection timeout in seconds
        "options": "-c statement_timeout=30000"  # Query timeout in milliseconds
    },
    pool_timeout=30  # Time to wait for connection from pool
)

def query_with_timeout(session, sql: str, timeout_seconds: int = 30):
    """Execute query with timeout."""
    try:
        # Set statement timeout for this transaction
        session.execute(text(f"SET statement_timeout = '{timeout_seconds}s'"))
        result = session.execute(text(sql))
        return result.fetchall()
    except OperationalError as e:
        if "statement timeout" in str(e):
            print("Query timed out")
            session.rollback()
            return None
        raise
```

### Async Database with asyncpg

```python
# asyncpg_timeout.py
# Async PostgreSQL with timeout
import asyncpg
import asyncio

async def query_with_timeout(pool, sql: str, timeout: float = 30.0):
    """Execute async query with timeout."""
    try:
        async with pool.acquire() as conn:
            # Set statement timeout
            await conn.execute(f"SET statement_timeout = '{int(timeout * 1000)}'")

            # Execute with asyncio timeout as backup
            result = await asyncio.wait_for(
                conn.fetch(sql),
                timeout=timeout + 5  # Slightly longer than statement timeout
            )
            return result

    except asyncio.TimeoutError:
        print("Query timed out (asyncio)")
        return None
    except asyncpg.exceptions.QueryCanceledError:
        print("Query timed out (PostgreSQL)")
        return None
```

---

## Subprocess Timeouts

```python
# subprocess_timeout.py
# Running subprocesses with timeout
import subprocess
from typing import Tuple, Optional

def run_command(cmd: list, timeout: float = 60.0) -> Tuple[Optional[str], Optional[str], int]:
    """Run command with timeout."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.stdout, result.stderr, result.returncode

    except subprocess.TimeoutExpired as e:
        print(f"Command timed out after {timeout} seconds")
        # e.stdout and e.stderr may contain partial output
        return e.stdout, e.stderr, -1

# Usage
stdout, stderr, code = run_command(["python", "long_script.py"], timeout=30)

# Async subprocess with timeout
async def run_command_async(cmd: list, timeout: float = 60.0):
    """Run command asynchronously with timeout."""
    import asyncio

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await asyncio.wait_for(
            proc.communicate(),
            timeout=timeout
        )

        return stdout.decode(), stderr.decode(), proc.returncode

    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        print("Process killed due to timeout")
        return None, None, -1
```

---

## Implementing Retry with Timeout

```python
# retry_with_timeout.py
# Retry logic with timeout handling
import time
import asyncio
from typing import TypeVar, Callable, Any
from functools import wraps

T = TypeVar('T')

def retry_on_timeout(
    max_retries: int = 3,
    initial_timeout: float = 5.0,
    timeout_multiplier: float = 2.0,
    max_timeout: float = 60.0
):
    """Decorator to retry function on timeout with increasing timeout."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            timeout = initial_timeout
            last_exception = None

            for attempt in range(max_retries):
                try:
                    # Add timeout to kwargs if not present
                    if 'timeout' not in kwargs:
                        kwargs['timeout'] = timeout

                    return func(*args, **kwargs)

                except (TimeoutError, Exception) as e:
                    if 'timeout' not in str(e).lower():
                        raise  # Re-raise non-timeout errors

                    last_exception = e
                    print(f"Attempt {attempt + 1} timed out ({timeout}s)")

                    if attempt < max_retries - 1:
                        timeout = min(timeout * timeout_multiplier, max_timeout)

            raise last_exception

        return wrapper
    return decorator

# Usage
@retry_on_timeout(max_retries=3, initial_timeout=5.0)
def fetch_data(url: str, timeout: float = None):
    import requests
    return requests.get(url, timeout=timeout).json()


# Async version
async def async_retry_on_timeout(
    coro_func: Callable[..., T],
    *args,
    max_retries: int = 3,
    initial_timeout: float = 5.0,
    backoff_factor: float = 2.0,
    **kwargs
) -> T:
    """Retry async function with increasing timeout."""
    timeout = initial_timeout

    for attempt in range(max_retries):
        try:
            return await asyncio.wait_for(
                coro_func(*args, **kwargs),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            print(f"Attempt {attempt + 1} timed out ({timeout}s)")
            if attempt < max_retries - 1:
                timeout *= backoff_factor
                await asyncio.sleep(1)  # Brief pause before retry

    raise TimeoutError(f"All {max_retries} attempts timed out")
```

---

## Custom Timeout Decorator

```python
# timeout_decorator.py
# Generic timeout decorator for sync functions
import signal
import functools
from typing import TypeVar, Callable

T = TypeVar('T')

class TimeoutException(Exception):
    """Custom timeout exception."""
    pass

def timeout(seconds: float):
    """Decorator to add timeout to any function (Unix only)."""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            def handler(signum, frame):
                raise TimeoutException(f"Function {func.__name__} timed out after {seconds}s")

            # Set the signal handler
            old_handler = signal.signal(signal.SIGALRM, handler)
            signal.setitimer(signal.ITIMER_REAL, seconds)

            try:
                result = func(*args, **kwargs)
            finally:
                # Restore the old handler
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, old_handler)

            return result

        return wrapper
    return decorator

# Usage (Unix/Linux/macOS only)
@timeout(5.0)
def slow_function():
    import time
    time.sleep(10)
    return "Done"

try:
    result = slow_function()
except TimeoutException as e:
    print(e)
```

---

## Best Practices

### Configure Appropriate Timeouts

```python
# timeout_config.py
# Timeout configuration best practices
from dataclasses import dataclass

@dataclass
class TimeoutConfig:
    """Centralized timeout configuration."""
    # Network timeouts
    http_connect: float = 5.0      # Time to establish connection
    http_read: float = 30.0        # Time to receive response
    http_total: float = 60.0       # Total request time

    # Database timeouts
    db_connect: float = 10.0       # Database connection timeout
    db_query: float = 30.0         # Query execution timeout
    db_transaction: float = 60.0   # Transaction timeout

    # Async timeouts
    task_default: float = 30.0     # Default async task timeout
    task_long: float = 300.0       # Long-running task timeout

    # External service timeouts
    api_fast: float = 5.0          # Fast API calls (health checks)
    api_normal: float = 30.0       # Normal API calls
    api_slow: float = 120.0        # Slow API calls (reports, exports)

# Usage
config = TimeoutConfig()
response = requests.get(url, timeout=(config.http_connect, config.http_read))
```

### Logging and Monitoring

```python
# timeout_monitoring.py
# Monitor and log timeout events
import logging
import time
from functools import wraps

logger = logging.getLogger(__name__)

def monitor_timeout(operation_name: str):
    """Decorator to monitor and log timeout events."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                logger.info(f"{operation_name} completed in {duration:.2f}s")
                return result
            except (TimeoutError, Exception) as e:
                duration = time.time() - start_time
                if 'timeout' in str(e).lower():
                    logger.warning(
                        f"{operation_name} timed out after {duration:.2f}s",
                        extra={
                            'operation': operation_name,
                            'duration': duration,
                            'error': str(e)
                        }
                    )
                raise
        return wrapper
    return decorator
```

---

## Conclusion

Handling TimeoutError effectively requires:

1. Always set explicit timeouts for network operations
2. Use separate connect and read timeouts when possible
3. Implement retry logic with exponential backoff
4. Handle timeout exceptions gracefully with fallbacks
5. Monitor and log timeout events for debugging
6. Configure timeouts based on expected operation duration

Proper timeout handling prevents your application from hanging and improves user experience.

---

*Building resilient Python applications? [OneUptime](https://oneuptime.com) helps you monitor timeout rates, track slow operations, and alert when services become unresponsive.*

