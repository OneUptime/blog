# How to Implement Retry Logic with Exponential Backoff in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Reliability, Retry Logic, Exponential Backoff, Tenacity, Error Handling, Resilience

Description: Learn how to implement robust retry logic in Python using the tenacity library. This guide covers exponential backoff, jitter, circuit breakers, and best practices for building resilient applications.

---

> Network calls fail. Databases timeout. External APIs hiccup. The question isn't whether failures will happen, but how gracefully your application handles them. Proper retry logic with exponential backoff is the difference between a minor blip and a cascading outage.

Retry logic seems simple until you implement it wrong. This guide shows you how to build robust, production-ready retry mechanisms using Python's tenacity library.

---

## Why Exponential Backoff?

Without backoff, retries can make problems worse:

```
Time 0s: Request fails
Time 0s: Retry 1 fails
Time 0s: Retry 2 fails
Time 0s: Retry 3 fails
...
```

This hammers an already struggling service. Exponential backoff adds increasing delays:

```
Time 0s: Request fails
Time 1s: Retry 1 fails
Time 2s: Retry 2 fails
Time 4s: Retry 3 fails
Time 8s: Retry 4 succeeds
```

Combined with jitter (randomness), this prevents thundering herd problems where all clients retry simultaneously.

---

## Getting Started with Tenacity

Tenacity is the standard library for retry logic in Python. It's flexible, well-tested, and handles edge cases you haven't thought of.

### Installation

```bash
pip install tenacity
```

### Basic Retry

This example shows the core tenacity pattern: a decorator that automatically retries the function on failure. The exponential backoff starts at 1 second and doubles each retry, capped at 10 seconds.

```python
from tenacity import retry, stop_after_attempt, wait_exponential
import requests

@retry(
    stop=stop_after_attempt(3),  # Give up after 3 attempts
    wait=wait_exponential(multiplier=1, min=1, max=10)  # Wait 1s, 2s, 4s... up to 10s
)
def fetch_data(url: str):
    """Fetch data with automatic retry on failure"""
    response = requests.get(url, timeout=5)
    response.raise_for_status()  # Raises exception on 4xx/5xx
    return response.json()

# Usage - retries happen automatically
try:
    data = fetch_data("https://api.example.com/data")
except Exception as e:
    print(f"Failed after all retries: {e}")
```

### Understanding Wait Strategies

Tenacity provides multiple wait strategies for different use cases. Choose based on your service's characteristics and the type of failures you expect.

```python
from tenacity import (
    wait_fixed,
    wait_random,
    wait_exponential,
    wait_exponential_jitter,
    wait_chain,
    wait_random_exponential
)

# Fixed wait: Always wait 2 seconds between retries
@retry(wait=wait_fixed(2))
def fixed_wait():
    pass

# Random wait: Wait between 1-3 seconds (adds unpredictability)
@retry(wait=wait_random(min=1, max=3))
def random_wait():
    pass

# Exponential: 2^x seconds (1, 2, 4, 8, ...) with cap at 60s
@retry(wait=wait_exponential(multiplier=1, min=1, max=60))
def exponential_wait():
    pass

# Exponential with jitter (recommended) - adds randomness to prevent thundering herd
@retry(wait=wait_exponential_jitter(initial=1, max=60))
def exponential_jitter_wait():
    pass

# Random exponential (full jitter) - most distributed retry pattern
@retry(wait=wait_random_exponential(multiplier=1, max=60))
def full_jitter_wait():
    pass

# Chained: Different waits for different attempts (escalating response)
@retry(wait=wait_chain(
    wait_fixed(1),  # First retry: 1 second (quick retry for transient issues)
    wait_fixed(2),  # Second retry: 2 seconds
    wait_fixed(5),  # Third+ retry: 5 seconds (give service time to recover)
))
def chained_wait():
    pass
```

---

## Stop Conditions

### When to Stop Retrying

Stop conditions determine when to give up retrying. Combining multiple conditions helps balance persistence with resource efficiency.

```python
from tenacity import (
    retry,
    stop_after_attempt,
    stop_after_delay,
    stop_never,
    stop_any,
    stop_all
)
from datetime import timedelta

# Stop after 3 attempts (including initial attempt)
@retry(stop=stop_after_attempt(3))
def limited_attempts():
    pass

# Stop after 30 seconds total elapsed time
@retry(stop=stop_after_delay(30))
def time_limited():
    pass

# Stop after 3 attempts OR 30 seconds (whichever comes first)
@retry(stop=stop_any(stop_after_attempt(3), stop_after_delay(30)))
def combined_stop():
    pass

# Stop only after BOTH conditions (3 attempts AND 30 seconds passed)
@retry(stop=stop_all(stop_after_attempt(3), stop_after_delay(30)))
def strict_combined():
    pass

# Never stop (be careful! Use with circuit breakers)
@retry(stop=stop_never)
def infinite_retry():
    pass
```

---

## Retry Conditions

### Retry Only on Specific Exceptions

Not all errors should trigger retries. Client errors (4xx) indicate bad requests that will always fail, while server errors (5xx) and network issues are often transient.

```python
from tenacity import retry, retry_if_exception_type, retry_if_not_exception_type
import requests

# Only retry on network errors, not application errors
@retry(retry=retry_if_exception_type(requests.RequestException))
def fetch_with_specific_retry():
    response = requests.get("https://api.example.com/data")
    response.raise_for_status()
    return response.json()

# Retry on everything EXCEPT ValueError (validation errors shouldn't retry)
@retry(retry=retry_if_not_exception_type(ValueError))
def validate_and_fetch():
    pass

# Custom retry condition for fine-grained control
from tenacity import retry_if_exception

def is_retryable_error(exception):
    """Determine if an exception should trigger a retry"""
    if isinstance(exception, requests.HTTPError):
        # Retry on 5xx errors (server issues), not 4xx (client errors)
        return 500 <= exception.response.status_code < 600
    # Also retry on connection and timeout errors
    return isinstance(exception, (requests.ConnectionError, requests.Timeout))

@retry(retry=retry_if_exception(is_retryable_error))
def smart_retry():
    response = requests.get("https://api.example.com/data")
    response.raise_for_status()
    return response.json()
```

### Retry Based on Return Value

Sometimes a function succeeds but returns an unexpected result. You can retry until you get a valid response.

```python
from tenacity import retry, retry_if_result

def is_empty_result(result):
    """Retry if result is empty - API might be lagging"""
    return result is None or result == [] or result == {}

@retry(retry=retry_if_result(is_empty_result))
def fetch_until_data():
    """Keep trying until we get non-empty data"""
    response = requests.get("https://api.example.com/data")
    return response.json()

# Combine exception and result conditions for comprehensive retry logic
from tenacity import retry_any

@retry(
    retry=retry_any(
        retry_if_exception_type(requests.RequestException),  # Retry on network errors
        retry_if_result(is_empty_result)  # Also retry on empty results
    )
)
def robust_fetch():
    response = requests.get("https://api.example.com/data")
    response.raise_for_status()
    return response.json()
```

---

## Callbacks and Logging

### Before and After Callbacks

Callbacks provide visibility into retry behavior. Logging retries helps with debugging and alerting on problematic services.

```python
from tenacity import (
    retry,
    before_log,
    after_log,
    before_sleep_log,
    RetryCallState
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Built-in logging callbacks - log before and after each attempt
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, max=10),
    before=before_log(logger, logging.INFO),  # Log each attempt start
    after=after_log(logger, logging.INFO)  # Log each attempt result
)
def logged_operation():
    pass

# Log before sleeping (between retries) - useful for warning on retries
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING)  # Warn on retries
)
def sleep_logged_operation():
    pass

# Custom callback for structured logging or metrics
def custom_before_callback(retry_state: RetryCallState):
    """Called before each retry attempt"""
    logger.info(
        f"Attempt {retry_state.attempt_number} for {retry_state.fn.__name__}"
    )

def custom_after_callback(retry_state: RetryCallState):
    """Called after each retry attempt"""
    if retry_state.outcome.failed:
        logger.warning(
            f"Attempt {retry_state.attempt_number} failed: "
            f"{retry_state.outcome.exception()}"
        )

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, max=10),
    before=custom_before_callback,
    after=custom_after_callback
)
def custom_logged_operation():
    pass
```

### Metrics and Monitoring

Integrating retry metrics with Prometheus or similar systems helps identify flaky dependencies and measure resilience.

```python
from tenacity import retry, RetryCallState
from prometheus_client import Counter, Histogram

# Define Prometheus metrics for retry monitoring
retry_attempts = Counter(
    'retry_attempts_total',
    'Total retry attempts',
    ['function', 'outcome']  # Labels for filtering
)

retry_duration = Histogram(
    'retry_duration_seconds',
    'Time spent in retry loop',
    ['function']
)

def metrics_callback(retry_state: RetryCallState):
    """Record retry metrics for observability"""
    func_name = retry_state.fn.__name__

    # Increment counter based on outcome
    if retry_state.outcome.failed:
        retry_attempts.labels(function=func_name, outcome='failure').inc()
    else:
        retry_attempts.labels(function=func_name, outcome='success').inc()

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, max=10),
    after=metrics_callback  # Record metrics after each attempt
)
def monitored_operation():
    pass
```

---

## Async Support

### Async Retry with Tenacity

Tenacity works seamlessly with async functions. The same decorators work with async/await, making it easy to add retry logic to async HTTP clients.

```python
import asyncio
import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type
)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=1, max=30),
    retry=retry_if_exception_type((httpx.HTTPError, asyncio.TimeoutError))
)
async def async_fetch(url: str):
    """Async fetch with retry - tenacity handles the async context"""
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=10)
        response.raise_for_status()
        return response.json()

async def main():
    try:
        data = await async_fetch("https://api.example.com/data")
        print(data)
    except Exception as e:
        print(f"Failed: {e}")

asyncio.run(main())
```

### Concurrent Async Retries

Each async task gets its own retry logic, allowing concurrent requests to independently handle failures.

```python
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=1, max=10)
)
async def fetch_item(item_id: str):
    """Fetch single item with its own retry logic"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/items/{item_id}")
        response.raise_for_status()
        return response.json()

async def fetch_all_items(item_ids: list[str]):
    """Fetch multiple items concurrently with individual retry logic"""
    # Each task has independent retries - one failure doesn't affect others
    tasks = [fetch_item(item_id) for item_id in item_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Separate successful from failed fetches
    successful = [r for r in results if not isinstance(r, Exception)]
    failed = [r for r in results if isinstance(r, Exception)]

    return successful, failed
```

---

## Circuit Breaker Pattern

### Combining Retry with Circuit Breaker

Circuit breakers prevent retry storms when a service is completely down. After too many failures, the circuit "opens" and requests fail immediately, giving the service time to recover.

```python
from tenacity import retry, stop_after_attempt, wait_exponential_jitter
from datetime import datetime, timedelta
from threading import Lock
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation - requests pass through
    OPEN = "open"          # Failing - reject requests immediately
    HALF_OPEN = "half_open"  # Testing if service recovered

class CircuitBreaker:
    """Circuit breaker to prevent cascading failures"""

    def __init__(
        self,
        failure_threshold: int = 5,      # Failures before opening
        recovery_timeout: int = 30,      # Seconds before testing recovery
        half_open_requests: int = 3      # Successful requests to close circuit
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = timedelta(seconds=recovery_timeout)
        self.half_open_requests = half_open_requests

        # State tracking
        self.state = CircuitState.CLOSED
        self.failures = 0
        self.last_failure_time = None
        self.half_open_successes = 0
        self._lock = Lock()  # Thread-safe state updates

    def can_execute(self) -> bool:
        """Check if request should be allowed through"""
        with self._lock:
            if self.state == CircuitState.CLOSED:
                return True  # Normal operation

            if self.state == CircuitState.OPEN:
                # Check if recovery timeout has passed
                if datetime.now() - self.last_failure_time > self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN  # Try recovery
                    self.half_open_successes = 0
                    return True
                return False  # Still open, reject request

            # HALF_OPEN - allow request to test recovery
            return True

    def record_success(self):
        """Record a successful request"""
        with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.half_open_successes += 1
                # Enough successes - close the circuit
                if self.half_open_successes >= self.half_open_requests:
                    self.state = CircuitState.CLOSED
                    self.failures = 0

            elif self.state == CircuitState.CLOSED:
                self.failures = 0  # Reset failure count on success

    def record_failure(self):
        """Record a failed request"""
        with self._lock:
            self.failures += 1
            self.last_failure_time = datetime.now()

            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN  # Recovery failed

            elif self.failures >= self.failure_threshold:
                self.state = CircuitState.OPEN  # Too many failures

class CircuitOpenError(Exception):
    """Raised when circuit breaker is open"""
    pass

def with_circuit_breaker(circuit: CircuitBreaker):
    """Decorator to add circuit breaker to a function"""
    def decorator(func):
        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential_jitter(initial=1, max=10)
        )
        def wrapper(*args, **kwargs):
            # Check circuit before attempting request
            if not circuit.can_execute():
                raise CircuitOpenError(
                    f"Circuit breaker is {circuit.state.value}"
                )

            try:
                result = func(*args, **kwargs)
                circuit.record_success()  # Mark success
                return result
            except Exception as e:
                circuit.record_failure()  # Mark failure
                raise

        return wrapper
    return decorator

# Usage - create circuit breaker for payment service
payment_circuit = CircuitBreaker(failure_threshold=5, recovery_timeout=60)

@with_circuit_breaker(payment_circuit)
def process_payment(amount: float):
    """Payment processing with circuit breaker protection"""
    response = requests.post(
        "https://payment-api.example.com/charge",
        json={"amount": amount}
    )
    response.raise_for_status()
    return response.json()
```

---

## Production-Ready Patterns

### HTTP Client with Retry

This production-ready HTTP client combines multiple retry strategies: urllib3's built-in retry for connection issues, plus tenacity for application-level retries with full control over behavior.

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type,
    RetryCallState
)
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import logging

logger = logging.getLogger(__name__)

class RetryableHTTPClient:
    """Production-ready HTTP client with retry logic"""

    def __init__(
        self,
        base_url: str,
        max_retries: int = 3,
        timeout: int = 30,
        backoff_max: int = 60
    ):
        self.base_url = base_url.rstrip('/')
        self.max_retries = max_retries
        self.timeout = timeout
        self.backoff_max = backoff_max

        # Session with connection pooling for performance
        self.session = requests.Session()

        # Built-in urllib3 retry for connection-level errors
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=1,
            status_forcelist=[502, 503, 504],  # Retry on gateway errors
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _log_retry(self, retry_state: RetryCallState):
        """Log retry attempts for debugging"""
        if retry_state.attempt_number > 1:
            logger.warning(
                f"Retry attempt {retry_state.attempt_number} for "
                f"{retry_state.fn.__name__}: {retry_state.outcome.exception()}"
            )

    def _create_retry_decorator(self):
        """Create retry decorator with current settings"""
        return retry(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential_jitter(initial=1, max=self.backoff_max),
            retry=retry_if_exception_type((
                requests.ConnectionError,
                requests.Timeout,
                requests.HTTPError
            )),
            before_sleep=self._log_retry,
            reraise=True  # Re-raise final exception after all retries
        )

    def get(self, path: str, **kwargs):
        """GET request with retry"""
        @self._create_retry_decorator()
        def _get():
            response = self.session.get(
                f"{self.base_url}{path}",
                timeout=self.timeout,
                **kwargs
            )
            self._check_response(response)
            return response

        return _get()

    def post(self, path: str, **kwargs):
        """POST request with retry"""
        @self._create_retry_decorator()
        def _post():
            response = self.session.post(
                f"{self.base_url}{path}",
                timeout=self.timeout,
                **kwargs
            )
            self._check_response(response)
            return response

        return _post()

    def _check_response(self, response: requests.Response):
        """Check response and raise for retryable errors"""
        if response.status_code >= 500:
            response.raise_for_status()  # Retry on server errors
        elif response.status_code >= 400:
            # Don't retry client errors - they'll always fail
            raise requests.HTTPError(
                f"Client error: {response.status_code}",
                response=response
            )

# Usage
client = RetryableHTTPClient(
    base_url="https://api.example.com",
    max_retries=3,
    timeout=30
)

try:
    response = client.get("/users")
    users = response.json()
except requests.HTTPError as e:
    logger.error(f"Request failed: {e}")
```

### Database Operations with Retry

Database connections are prone to transient failures like connection resets and deadlocks. Retry logic should only activate on operational errors, not query syntax errors.

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type
)
import psycopg2
from psycopg2 import OperationalError, InterfaceError
import logging

logger = logging.getLogger(__name__)

# Only retry on connection/operational errors, not query errors
RETRYABLE_ERRORS = (
    OperationalError,  # Connection issues, server gone away
    InterfaceError,    # Connection pool issues
)

def retry_database_operation(max_attempts: int = 3):
    """Decorator for retryable database operations"""
    return retry(
        stop=stop_after_attempt(max_attempts),
        wait=wait_exponential_jitter(initial=0.5, max=30),
        retry=retry_if_exception_type(RETRYABLE_ERRORS),
        before_sleep=lambda rs: logger.warning(
            f"Database retry {rs.attempt_number}: {rs.outcome.exception()}"
        )
    )

class DatabaseClient:
    """Database client with retry logic for transient failures"""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self._connection = None

    def _get_connection(self):
        """Get or create database connection"""
        if self._connection is None or self._connection.closed:
            self._connection = psycopg2.connect(self.connection_string)
        return self._connection

    @retry_database_operation(max_attempts=3)
    def execute(self, query: str, params: tuple = None):
        """Execute a query with retry on connection errors"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount
        except RETRYABLE_ERRORS:
            # Reset connection on operational errors for next retry
            self._connection = None
            raise

    @retry_database_operation(max_attempts=3)
    def fetch_one(self, query: str, params: tuple = None):
        """Fetch single row with retry"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                return cursor.fetchone()
        except RETRYABLE_ERRORS:
            self._connection = None
            raise

    @retry_database_operation(max_attempts=3)
    def fetch_all(self, query: str, params: tuple = None):
        """Fetch all rows with retry"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                return cursor.fetchall()
        except RETRYABLE_ERRORS:
            self._connection = None
            raise
```

---

## Best Practices

### 1. Use Jitter

Jitter prevents multiple clients from retrying at the same moment, which would overload the recovering service.

```python
# Always add jitter to prevent thundering herd
wait=wait_exponential_jitter(initial=1, max=60)

# Or full jitter for maximum distribution
wait=wait_random_exponential(multiplier=1, max=60)
```

### 2. Set Reasonable Limits

Never retry forever without protection. Combine attempt and time limits.

```python
# Don't retry forever
stop=stop_after_attempt(5)

# Set a maximum total time
stop=stop_any(stop_after_attempt(5), stop_after_delay(120))
```

### 3. Only Retry Transient Failures

Client errors indicate bad input that will always fail. Only retry server errors and network issues.

```python
# Don't retry client errors (4xx)
def is_retryable(exception):
    if isinstance(exception, requests.HTTPError):
        return exception.response.status_code >= 500
    return isinstance(exception, (requests.ConnectionError, requests.Timeout))
```

### 4. Log Retries

Retries indicate problems. Logging them helps identify flaky dependencies.

```python
# Always log retries for debugging
before_sleep=lambda rs: logger.warning(
    f"Retry {rs.attempt_number}: {rs.outcome.exception()}"
)
```

### 5. Make Retries Idempotent

Ensure operations can safely be retried without side effects. Use idempotency keys for non-idempotent operations.

```python
# Ensure operations can safely be retried
# Use idempotency keys for POST requests
headers = {'Idempotency-Key': str(uuid.uuid4())}
```

---

## Conclusion

Proper retry logic is essential for building resilient Python applications. Key takeaways:

- **Use exponential backoff with jitter** to avoid thundering herd
- **Set reasonable limits** on attempts and total time
- **Only retry transient failures** - don't retry validation errors
- **Log retry attempts** for debugging
- **Consider circuit breakers** for cascading failure protection

Tenacity makes implementing these patterns straightforward and production-ready.

---

*Need to monitor retry behavior in your applications? [OneUptime](https://oneuptime.com) provides comprehensive metrics and tracing to help you understand retry patterns and identify problematic services.*

**Related Reading:**
- [SRE Best Practices](https://oneuptime.com/blog/post/2025-11-28-sre-best-practices/view)
- [What is MTTR, MTTD, MTBF and More](https://oneuptime.com/blog/post/2025-09-04-what-is-mttr-mttd-mtbf-and-more/view)
