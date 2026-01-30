# How to Create Retry Pattern Implementation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Microservices, Resilience, Design Patterns, Reliability

Description: Implement retry patterns with exponential backoff, jitter, and retry budgets for handling transient failures in distributed systems.

---

Network calls fail. Services go down. Databases hiccup. In distributed systems, transient failures are not exceptional cases, they are the norm. The retry pattern provides a structured approach to handle these failures gracefully without cascading errors through your system.

This guide walks through building production-ready retry mechanisms from scratch. We will cover the fundamentals, then progressively add sophistication with exponential backoff, jitter, and retry budgets.

## Why Retries Matter

Consider a simple HTTP call to a payment service:

```python
# Without retry logic - brittle and unreliable
def process_payment(order_id, amount):
    response = requests.post(
        "https://payment-service/charge",
        json={"order_id": order_id, "amount": amount}
    )
    return response.json()
```

If the payment service experiences a brief network blip or temporary overload, this code fails immediately. The user sees an error, and you potentially lose a sale.

A well-implemented retry mechanism can recover from:

- Network timeouts
- DNS resolution failures
- Service restarts during deployments
- Database connection pool exhaustion
- Rate limiting responses
- Temporary resource unavailability

## Basic Retry Implementation

Let's start with a simple retry wrapper that attempts an operation multiple times before giving up.

```python
import time
from typing import Callable, TypeVar, Any
from functools import wraps

T = TypeVar('T')

class RetryError(Exception):
    """Raised when all retry attempts are exhausted."""

    def __init__(self, message: str, last_exception: Exception):
        super().__init__(message)
        self.last_exception = last_exception


def retry(
    max_attempts: int = 3,
    delay_seconds: float = 1.0,
    exceptions: tuple = (Exception,)
) -> Callable:
    """
    Basic retry decorator with fixed delay between attempts.

    Args:
        max_attempts: Maximum number of attempts before giving up
        delay_seconds: Fixed delay between retry attempts
        exceptions: Tuple of exception types that trigger a retry

    Returns:
        Decorated function with retry behavior
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception = None

            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts:
                        print(f"Attempt {attempt} failed: {e}. Retrying in {delay_seconds}s...")
                        time.sleep(delay_seconds)
                    else:
                        print(f"Attempt {attempt} failed: {e}. No more retries.")

            raise RetryError(
                f"All {max_attempts} attempts failed",
                last_exception
            )

        return wrapper
    return decorator
```

Using the basic retry decorator:

```python
import requests

@retry(max_attempts=3, delay_seconds=2.0, exceptions=(requests.RequestException,))
def fetch_user_data(user_id: str) -> dict:
    """Fetch user data from external service with automatic retry."""
    response = requests.get(
        f"https://api.example.com/users/{user_id}",
        timeout=5
    )
    response.raise_for_status()
    return response.json()


# Usage
try:
    user = fetch_user_data("user-123")
    print(f"Got user: {user['name']}")
except RetryError as e:
    print(f"Failed to fetch user after retries: {e.last_exception}")
```

## Exponential Backoff

Fixed delays have a problem: they do not adapt to the severity of the failure. If a service is overloaded, hammering it every second makes things worse. Exponential backoff increases the wait time between attempts, giving the failing service time to recover.

The formula is straightforward:

```
delay = base_delay * (multiplier ^ attempt_number)
```

Here is the enhanced implementation:

```python
import time
import math
from typing import Callable, TypeVar, Any, Optional
from functools import wraps

T = TypeVar('T')


class RetryConfig:
    """Configuration for retry behavior with exponential backoff."""

    def __init__(
        self,
        max_attempts: int = 5,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        multiplier: float = 2.0,
        exceptions: tuple = (Exception,)
    ):
        """
        Initialize retry configuration.

        Args:
            max_attempts: Maximum retry attempts (including initial attempt)
            base_delay: Starting delay in seconds
            max_delay: Maximum delay cap to prevent excessive waits
            multiplier: Factor to multiply delay by after each attempt
            exceptions: Exception types that trigger retries
        """
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.multiplier = multiplier
        self.exceptions = exceptions

    def calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay for a given attempt number using exponential backoff.

        Attempt 1: 1.0s
        Attempt 2: 2.0s
        Attempt 3: 4.0s
        Attempt 4: 8.0s
        Attempt 5: 16.0s (capped at max_delay if lower)
        """
        delay = self.base_delay * (self.multiplier ** (attempt - 1))
        return min(delay, self.max_delay)


def retry_with_backoff(config: RetryConfig) -> Callable:
    """
    Retry decorator with exponential backoff strategy.

    Args:
        config: RetryConfig instance defining retry behavior

    Returns:
        Decorated function with exponential backoff retry
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception = None

            for attempt in range(1, config.max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except config.exceptions as e:
                    last_exception = e

                    if attempt < config.max_attempts:
                        delay = config.calculate_delay(attempt)
                        print(f"Attempt {attempt}/{config.max_attempts} failed: {e}")
                        print(f"Backing off for {delay:.2f} seconds...")
                        time.sleep(delay)
                    else:
                        print(f"Final attempt {attempt} failed: {e}")

            raise RetryError(
                f"Operation failed after {config.max_attempts} attempts",
                last_exception
            )

        return wrapper
    return decorator
```

Example usage with exponential backoff:

```python
import requests

# Configure retry with exponential backoff
# Delays will be: 0.5s, 1s, 2s, 4s before giving up
payment_retry_config = RetryConfig(
    max_attempts=5,
    base_delay=0.5,
    max_delay=30.0,
    multiplier=2.0,
    exceptions=(requests.RequestException, ConnectionError)
)


@retry_with_backoff(payment_retry_config)
def charge_credit_card(card_token: str, amount_cents: int) -> dict:
    """Process a credit card charge with automatic retry on failure."""
    response = requests.post(
        "https://payment-gateway.example.com/v1/charges",
        json={
            "token": card_token,
            "amount": amount_cents,
            "currency": "usd"
        },
        headers={"Authorization": "Bearer sk_live_xxx"},
        timeout=10
    )
    response.raise_for_status()
    return response.json()
```

## Adding Jitter to Prevent Thundering Herd

Exponential backoff alone has a flaw: if many clients fail simultaneously, they all retry at the exact same intervals. This creates synchronized retry storms, also known as the thundering herd problem.

Jitter adds randomness to the delay, spreading out retry attempts across time.

| Jitter Strategy | Description | Best For |
|----------------|-------------|----------|
| Full Jitter | Random value between 0 and calculated delay | General use, maximum spread |
| Equal Jitter | Half fixed delay plus random half | Balance between spread and minimum wait |
| Decorrelated Jitter | Random between base delay and 3x previous delay | AWS recommended approach |

Here is the implementation with multiple jitter strategies:

```python
import random
import time
from enum import Enum
from typing import Callable, TypeVar, Any
from functools import wraps

T = TypeVar('T')


class JitterStrategy(Enum):
    """Available jitter strategies for retry delays."""
    NONE = "none"
    FULL = "full"
    EQUAL = "equal"
    DECORRELATED = "decorrelated"


class AdvancedRetryConfig:
    """Enhanced retry configuration with jitter support."""

    def __init__(
        self,
        max_attempts: int = 5,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        multiplier: float = 2.0,
        jitter: JitterStrategy = JitterStrategy.FULL,
        exceptions: tuple = (Exception,)
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.multiplier = multiplier
        self.jitter = jitter
        self.exceptions = exceptions
        self._previous_delay = base_delay

    def calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay with jitter applied.

        The jitter strategy determines how randomness is applied:
        - NONE: Pure exponential backoff
        - FULL: Random between 0 and exponential delay
        - EQUAL: 50% exponential + 50% random
        - DECORRELATED: Random between base and 3x previous delay
        """
        # Calculate base exponential delay
        exp_delay = self.base_delay * (self.multiplier ** (attempt - 1))
        exp_delay = min(exp_delay, self.max_delay)

        # Apply jitter strategy
        if self.jitter == JitterStrategy.NONE:
            delay = exp_delay

        elif self.jitter == JitterStrategy.FULL:
            # Random value between 0 and the calculated delay
            delay = random.uniform(0, exp_delay)

        elif self.jitter == JitterStrategy.EQUAL:
            # Half the delay is fixed, half is random
            half_delay = exp_delay / 2
            delay = half_delay + random.uniform(0, half_delay)

        elif self.jitter == JitterStrategy.DECORRELATED:
            # Each delay is random between base and 3x previous delay
            delay = random.uniform(self.base_delay, self._previous_delay * 3)
            delay = min(delay, self.max_delay)
            self._previous_delay = delay

        return delay


def retry_with_jitter(config: AdvancedRetryConfig) -> Callable:
    """
    Production-ready retry decorator with backoff and jitter.

    Example delays with FULL jitter (base=1s, multiplier=2):
    Attempt 1: random(0, 1) -> e.g., 0.7s
    Attempt 2: random(0, 2) -> e.g., 1.3s
    Attempt 3: random(0, 4) -> e.g., 2.8s
    Attempt 4: random(0, 8) -> e.g., 5.1s
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception = None

            for attempt in range(1, config.max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except config.exceptions as e:
                    last_exception = e

                    if attempt < config.max_attempts:
                        delay = config.calculate_delay(attempt)
                        print(f"Attempt {attempt} failed. Retrying in {delay:.2f}s with {config.jitter.value} jitter")
                        time.sleep(delay)

            raise RetryError(
                f"Operation failed after {config.max_attempts} attempts",
                last_exception
            )

        return wrapper
    return decorator
```

Comparing jitter strategies in practice:

```python
# Simulate 10 clients hitting retry simultaneously
def simulate_jitter_comparison():
    """
    Demonstrates how different jitter strategies spread out retries.
    With FULL jitter, clients that fail at the same time will retry
    at different times, reducing load spikes on the server.
    """
    strategies = [JitterStrategy.NONE, JitterStrategy.FULL, JitterStrategy.EQUAL]

    for strategy in strategies:
        config = AdvancedRetryConfig(
            max_attempts=5,
            base_delay=1.0,
            multiplier=2.0,
            jitter=strategy
        )

        print(f"\n{strategy.value.upper()} Jitter - Delays for 5 simulated clients:")
        for client in range(5):
            delays = [config.calculate_delay(attempt) for attempt in range(1, 5)]
            print(f"  Client {client + 1}: {[f'{d:.2f}s' for d in delays]}")


# Output example:
# NONE Jitter - Delays for 5 simulated clients:
#   Client 1: ['1.00s', '2.00s', '4.00s', '8.00s']
#   Client 2: ['1.00s', '2.00s', '4.00s', '8.00s']  <- All identical!
#
# FULL Jitter - Delays for 5 simulated clients:
#   Client 1: ['0.73s', '1.45s', '2.91s', '5.23s']
#   Client 2: ['0.21s', '0.88s', '3.67s', '7.12s']  <- Nicely spread out
```

## Retry Budgets

Individual retry limits protect single operations, but what about system-wide retry behavior? If your service makes 1000 requests per second and each can retry 5 times, a failing dependency could cause 5000 requests per second, amplifying the problem.

Retry budgets limit the total retry volume across all operations within a time window.

```python
import time
import threading
from collections import deque
from typing import Callable, TypeVar, Any, Optional
from functools import wraps
from dataclasses import dataclass

T = TypeVar('T')


@dataclass
class RetryBudgetConfig:
    """Configuration for system-wide retry budget."""
    # Maximum retry ratio (retries / total requests)
    max_retry_ratio: float = 0.1  # 10% of requests can be retries
    # Minimum retries allowed per second regardless of ratio
    min_retries_per_second: float = 10.0
    # Time window for calculating the ratio
    window_seconds: float = 10.0


class RetryBudget:
    """
    Tracks retry attempts across the system and enforces budgets.

    The budget prevents retry storms by limiting total retry volume.
    If retries exceed the budget, additional retry attempts are rejected,
    forcing immediate failure instead of adding to system load.
    """

    def __init__(self, config: RetryBudgetConfig):
        self.config = config
        self._lock = threading.Lock()
        # Track timestamps of requests and retries
        self._requests: deque = deque()
        self._retries: deque = deque()

    def _cleanup_old_entries(self, current_time: float) -> None:
        """Remove entries outside the tracking window."""
        cutoff = current_time - self.config.window_seconds

        while self._requests and self._requests[0] < cutoff:
            self._requests.popleft()

        while self._retries and self._retries[0] < cutoff:
            self._retries.popleft()

    def record_request(self) -> None:
        """Record a new request attempt."""
        with self._lock:
            current_time = time.time()
            self._cleanup_old_entries(current_time)
            self._requests.append(current_time)

    def can_retry(self) -> bool:
        """
        Check if a retry is allowed under the current budget.

        Returns True if:
        - Retries are below the minimum per-second threshold, OR
        - The retry ratio is below the maximum allowed ratio
        """
        with self._lock:
            current_time = time.time()
            self._cleanup_old_entries(current_time)

            total_requests = len(self._requests)
            total_retries = len(self._retries)

            # Always allow minimum retries per second
            min_allowed = self.config.min_retries_per_second * self.config.window_seconds
            if total_retries < min_allowed:
                return True

            # Check ratio
            if total_requests == 0:
                return True

            current_ratio = total_retries / total_requests
            return current_ratio < self.config.max_retry_ratio

    def record_retry(self) -> bool:
        """
        Attempt to record a retry. Returns True if allowed, False if budget exceeded.
        """
        with self._lock:
            current_time = time.time()
            self._cleanup_old_entries(current_time)

            if not self.can_retry():
                return False

            self._retries.append(current_time)
            return True

    def get_stats(self) -> dict:
        """Get current retry budget statistics."""
        with self._lock:
            current_time = time.time()
            self._cleanup_old_entries(current_time)

            total_requests = len(self._requests)
            total_retries = len(self._retries)
            ratio = total_retries / total_requests if total_requests > 0 else 0.0

            return {
                "window_seconds": self.config.window_seconds,
                "total_requests": total_requests,
                "total_retries": total_retries,
                "retry_ratio": ratio,
                "budget_remaining": max(0, self.config.max_retry_ratio - ratio)
            }


# Global retry budget instance
_global_budget = RetryBudget(RetryBudgetConfig())


def retry_with_budget(
    config: AdvancedRetryConfig,
    budget: Optional[RetryBudget] = None
) -> Callable:
    """
    Retry decorator that respects system-wide retry budgets.

    When the retry budget is exhausted, operations fail immediately
    instead of retrying, preventing retry amplification during outages.
    """
    budget = budget or _global_budget

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception = None
            budget.record_request()

            for attempt in range(1, config.max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except config.exceptions as e:
                    last_exception = e

                    if attempt < config.max_attempts:
                        # Check budget before retrying
                        if not budget.record_retry():
                            print(f"Retry budget exhausted. Failing fast.")
                            raise RetryError(
                                "Retry budget exhausted",
                                last_exception
                            )

                        delay = config.calculate_delay(attempt)
                        print(f"Attempt {attempt} failed. Retrying in {delay:.2f}s")
                        time.sleep(delay)

            raise RetryError(
                f"Operation failed after {config.max_attempts} attempts",
                last_exception
            )

        return wrapper
    return decorator
```

## Distinguishing Retryable vs Non-Retryable Errors

Not all errors should trigger retries. Retrying a request that failed due to invalid input is pointless and wasteful. Your retry logic must distinguish between transient failures (worth retrying) and permanent failures (fail immediately).

| Error Type | Retryable? | Examples |
|-----------|------------|----------|
| Network Timeout | Yes | Connection timeout, read timeout |
| Server Error (5xx) | Yes | 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable |
| Rate Limited (429) | Yes | Too Many Requests (with backoff) |
| Client Error (4xx) | No | 400 Bad Request, 401 Unauthorized, 404 Not Found |
| Validation Error | No | Invalid input, missing required fields |
| Authentication Error | No | Invalid credentials, expired token |
| Resource Not Found | No | 404 errors (usually) |

Implementation with error classification:

```python
import requests
from typing import Callable, TypeVar, Type, Set
from functools import wraps

T = TypeVar('T')


class RetryableError(Exception):
    """Base class for errors that should trigger a retry."""
    pass


class NonRetryableError(Exception):
    """Base class for errors that should fail immediately."""
    pass


class ErrorClassifier:
    """
    Classifies errors as retryable or non-retryable based on error type
    and HTTP status codes.
    """

    # HTTP status codes that indicate transient failures
    RETRYABLE_STATUS_CODES: Set[int] = {
        408,  # Request Timeout
        429,  # Too Many Requests
        500,  # Internal Server Error
        502,  # Bad Gateway
        503,  # Service Unavailable
        504,  # Gateway Timeout
    }

    # HTTP status codes that indicate permanent failures
    NON_RETRYABLE_STATUS_CODES: Set[int] = {
        400,  # Bad Request
        401,  # Unauthorized
        403,  # Forbidden
        404,  # Not Found
        405,  # Method Not Allowed
        409,  # Conflict
        410,  # Gone
        422,  # Unprocessable Entity
    }

    @classmethod
    def is_retryable_exception(cls, exception: Exception) -> bool:
        """
        Determine if an exception should trigger a retry.

        Returns True for network-level errors and server errors.
        Returns False for client errors and validation failures.
        """
        # Explicit retry/non-retry markers
        if isinstance(exception, RetryableError):
            return True
        if isinstance(exception, NonRetryableError):
            return False

        # Network-level errors are always retryable
        if isinstance(exception, (
            requests.exceptions.Timeout,
            requests.exceptions.ConnectionError,
            ConnectionResetError,
            BrokenPipeError,
        )):
            return True

        # Check HTTP response status codes
        if isinstance(exception, requests.exceptions.HTTPError):
            response = exception.response
            if response is not None:
                return response.status_code in cls.RETRYABLE_STATUS_CODES

        # Default to not retrying unknown errors
        return False

    @classmethod
    def classify_response(cls, response: requests.Response) -> None:
        """
        Raise appropriate exception based on response status code.

        Call this after receiving an HTTP response to convert status
        codes into properly classified exceptions.
        """
        if response.status_code >= 400:
            if response.status_code in cls.RETRYABLE_STATUS_CODES:
                raise RetryableError(
                    f"Retryable HTTP error: {response.status_code}"
                )
            else:
                raise NonRetryableError(
                    f"Non-retryable HTTP error: {response.status_code}"
                )


def smart_retry(config: AdvancedRetryConfig) -> Callable:
    """
    Retry decorator that only retries on classified retryable errors.

    Non-retryable errors propagate immediately without consuming
    retry attempts or adding delay.
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception = None

            for attempt in range(1, config.max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    # Check if error is retryable
                    if not ErrorClassifier.is_retryable_exception(e):
                        print(f"Non-retryable error encountered: {e}")
                        raise  # Propagate immediately

                    last_exception = e

                    if attempt < config.max_attempts:
                        delay = config.calculate_delay(attempt)
                        print(f"Retryable error on attempt {attempt}: {e}")
                        print(f"Waiting {delay:.2f}s before retry...")
                        time.sleep(delay)

            raise RetryError(
                f"Operation failed after {config.max_attempts} retryable attempts",
                last_exception
            )

        return wrapper
    return decorator
```

Example with error classification:

```python
config = AdvancedRetryConfig(
    max_attempts=4,
    base_delay=1.0,
    jitter=JitterStrategy.FULL
)


@smart_retry(config)
def create_order(order_data: dict) -> dict:
    """
    Create an order with smart retry behavior.

    - Retries on 500, 502, 503, 504, 429, timeouts
    - Fails immediately on 400, 401, 403, 404, 422
    """
    response = requests.post(
        "https://api.example.com/orders",
        json=order_data,
        timeout=10
    )

    # Classify and raise appropriate exception type
    ErrorClassifier.classify_response(response)

    return response.json()


# Usage
try:
    order = create_order({"product_id": "ABC123", "quantity": 2})
except NonRetryableError as e:
    # Bad request, invalid data - fix the input
    print(f"Invalid order data: {e}")
except RetryError as e:
    # Server issues persisted through all retries
    print(f"Service unavailable: {e}")
```

## Idempotency Requirements

Retries introduce a critical concern: what if the original request succeeded but the response was lost? Without idempotency, retrying could duplicate the operation, for example, charging a credit card twice.

An operation is idempotent if executing it multiple times has the same effect as executing it once.

```python
import uuid
import hashlib
from typing import Optional, Any, Dict
from datetime import datetime, timedelta


class IdempotencyKeyGenerator:
    """
    Generates idempotency keys for retry-safe operations.

    Keys can be based on:
    - Random UUIDs for general uniqueness
    - Content hashes for deduplicating identical requests
    - Composite keys combining user ID, action, and timestamp
    """

    @staticmethod
    def random_key() -> str:
        """Generate a random UUID-based idempotency key."""
        return str(uuid.uuid4())

    @staticmethod
    def content_hash(content: Dict[str, Any]) -> str:
        """
        Generate idempotency key from request content.

        Identical requests will produce identical keys, enabling
        automatic deduplication on the server side.
        """
        import json
        content_str = json.dumps(content, sort_keys=True)
        return hashlib.sha256(content_str.encode()).hexdigest()[:32]

    @staticmethod
    def composite_key(user_id: str, action: str, timestamp: Optional[datetime] = None) -> str:
        """
        Generate composite key from user, action, and time window.

        Useful for preventing duplicate actions within a time window,
        like preventing double-clicks on a submit button.
        """
        ts = timestamp or datetime.utcnow()
        # Round to nearest minute for time-window deduplication
        rounded_ts = ts.replace(second=0, microsecond=0)
        key_source = f"{user_id}:{action}:{rounded_ts.isoformat()}"
        return hashlib.sha256(key_source.encode()).hexdigest()[:32]


class IdempotentRequest:
    """
    Wrapper for making idempotent HTTP requests with automatic retry.

    Includes the idempotency key in request headers, allowing servers
    to detect and deduplicate retry attempts.
    """

    IDEMPOTENCY_HEADER = "Idempotency-Key"

    def __init__(
        self,
        base_url: str,
        retry_config: AdvancedRetryConfig,
        key_generator: IdempotencyKeyGenerator = None
    ):
        self.base_url = base_url
        self.retry_config = retry_config
        self.key_generator = key_generator or IdempotencyKeyGenerator()
        self._pending_keys: Dict[str, datetime] = {}

    def _get_or_create_key(self, request_id: Optional[str], content: dict) -> str:
        """Get existing key or create new one for this request."""
        if request_id:
            return request_id
        return self.key_generator.content_hash(content)

    def post_with_retry(
        self,
        endpoint: str,
        data: dict,
        idempotency_key: Optional[str] = None,
        headers: Optional[dict] = None
    ) -> dict:
        """
        Make a POST request with idempotency key and automatic retry.

        The same idempotency key is used across all retry attempts,
        ensuring the server can recognize retries and prevent duplicates.
        """
        # Generate or use provided idempotency key
        key = self._get_or_create_key(idempotency_key, data)

        # Build headers with idempotency key
        request_headers = headers or {}
        request_headers[self.IDEMPOTENCY_HEADER] = key

        last_exception = None

        for attempt in range(1, self.retry_config.max_attempts + 1):
            try:
                response = requests.post(
                    f"{self.base_url}{endpoint}",
                    json=data,
                    headers=request_headers,
                    timeout=10
                )

                # Handle idempotency-related responses
                if response.status_code == 409:
                    # Request already processed - return cached result if available
                    return response.json()

                response.raise_for_status()
                return response.json()

            except requests.exceptions.RequestException as e:
                last_exception = e

                if attempt < self.retry_config.max_attempts:
                    delay = self.retry_config.calculate_delay(attempt)
                    print(f"Attempt {attempt} failed, retrying with same idempotency key: {key}")
                    time.sleep(delay)

        raise RetryError(f"Request failed after {self.retry_config.max_attempts} attempts", last_exception)
```

Using idempotent requests for payment processing:

```python
# Configure for payment operations - careful retries with idempotency
payment_config = AdvancedRetryConfig(
    max_attempts=3,
    base_delay=2.0,
    max_delay=10.0,
    jitter=JitterStrategy.EQUAL
)

payment_client = IdempotentRequest(
    base_url="https://payments.example.com",
    retry_config=payment_config
)


def process_payment_safely(order_id: str, amount: int, currency: str) -> dict:
    """
    Process payment with idempotency protection.

    Even if this function is called multiple times with the same order_id
    (due to retries or user double-clicks), the payment will only be
    processed once.
    """
    # Use order_id as basis for idempotency key
    idempotency_key = IdempotencyKeyGenerator.composite_key(
        user_id=order_id,
        action="charge"
    )

    result = payment_client.post_with_retry(
        endpoint="/v1/charges",
        data={
            "order_id": order_id,
            "amount": amount,
            "currency": currency
        },
        idempotency_key=idempotency_key
    )

    return result
```

## Complete Production Example

Here is a complete, production-ready retry client that combines all the concepts:

```python
import time
import random
import logging
import requests
from typing import Callable, TypeVar, Any, Optional, Set, Dict
from functools import wraps
from dataclasses import dataclass, field
from enum import Enum
from threading import Lock
from collections import deque

T = TypeVar('T')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class JitterStrategy(Enum):
    NONE = "none"
    FULL = "full"
    EQUAL = "equal"
    DECORRELATED = "decorrelated"


@dataclass
class RetryPolicy:
    """Complete retry policy configuration."""
    max_attempts: int = 5
    base_delay: float = 1.0
    max_delay: float = 60.0
    multiplier: float = 2.0
    jitter: JitterStrategy = JitterStrategy.FULL
    retryable_status_codes: Set[int] = field(default_factory=lambda: {408, 429, 500, 502, 503, 504})
    retryable_exceptions: tuple = (requests.exceptions.Timeout, requests.exceptions.ConnectionError)

    def calculate_delay(self, attempt: int, previous_delay: float = 0) -> float:
        """Calculate delay with configured jitter strategy."""
        exp_delay = self.base_delay * (self.multiplier ** (attempt - 1))
        exp_delay = min(exp_delay, self.max_delay)

        if self.jitter == JitterStrategy.NONE:
            return exp_delay
        elif self.jitter == JitterStrategy.FULL:
            return random.uniform(0, exp_delay)
        elif self.jitter == JitterStrategy.EQUAL:
            return exp_delay / 2 + random.uniform(0, exp_delay / 2)
        elif self.jitter == JitterStrategy.DECORRELATED:
            return random.uniform(self.base_delay, max(self.base_delay, previous_delay * 3))
        return exp_delay


class ResilientHttpClient:
    """
    Production-ready HTTP client with comprehensive retry support.

    Features:
    - Exponential backoff with configurable jitter
    - Automatic error classification
    - Idempotency key support
    - Retry budget enforcement
    - Detailed logging and metrics
    """

    def __init__(
        self,
        base_url: str,
        policy: RetryPolicy,
        default_timeout: float = 30.0
    ):
        self.base_url = base_url
        self.policy = policy
        self.default_timeout = default_timeout
        self.session = requests.Session()

        # Retry budget tracking
        self._budget_lock = Lock()
        self._requests = deque(maxlen=10000)
        self._retries = deque(maxlen=10000)
        self._budget_window = 60.0  # seconds
        self._max_retry_ratio = 0.2

    def _is_retryable_response(self, response: requests.Response) -> bool:
        """Check if response status indicates a retryable error."""
        return response.status_code in self.policy.retryable_status_codes

    def _is_retryable_exception(self, exc: Exception) -> bool:
        """Check if exception type is retryable."""
        return isinstance(exc, self.policy.retryable_exceptions)

    def _check_retry_budget(self) -> bool:
        """Check if retry budget allows another retry."""
        with self._budget_lock:
            now = time.time()
            cutoff = now - self._budget_window

            # Clean old entries
            while self._requests and self._requests[0] < cutoff:
                self._requests.popleft()
            while self._retries and self._retries[0] < cutoff:
                self._retries.popleft()

            total = len(self._requests)
            retries = len(self._retries)

            if total == 0:
                return True

            return (retries / total) < self._max_retry_ratio

    def _record_request(self) -> None:
        """Record a request for budget tracking."""
        with self._budget_lock:
            self._requests.append(time.time())

    def _record_retry(self) -> None:
        """Record a retry attempt for budget tracking."""
        with self._budget_lock:
            self._retries.append(time.time())

    def request(
        self,
        method: str,
        endpoint: str,
        idempotency_key: Optional[str] = None,
        **kwargs
    ) -> requests.Response:
        """
        Make an HTTP request with automatic retry on transient failures.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE, etc.)
            endpoint: API endpoint (appended to base_url)
            idempotency_key: Optional key for deduplication
            **kwargs: Additional arguments passed to requests

        Returns:
            requests.Response object on success

        Raises:
            requests.HTTPError: On non-retryable HTTP errors
            RetryError: When all retry attempts are exhausted
        """
        url = f"{self.base_url}{endpoint}"
        kwargs.setdefault("timeout", self.default_timeout)

        # Add idempotency key if provided
        if idempotency_key:
            headers = kwargs.get("headers", {})
            headers["Idempotency-Key"] = idempotency_key
            kwargs["headers"] = headers

        self._record_request()
        last_exception = None
        previous_delay = self.policy.base_delay

        for attempt in range(1, self.policy.max_attempts + 1):
            try:
                logger.info(f"Attempt {attempt}/{self.policy.max_attempts}: {method} {url}")

                response = self.session.request(method, url, **kwargs)

                # Success
                if response.status_code < 400:
                    return response

                # Check if error is retryable
                if self._is_retryable_response(response):
                    last_exception = requests.HTTPError(response=response)

                    if attempt < self.policy.max_attempts:
                        if not self._check_retry_budget():
                            logger.warning("Retry budget exhausted, failing fast")
                            response.raise_for_status()

                        self._record_retry()
                        delay = self.policy.calculate_delay(attempt, previous_delay)
                        previous_delay = delay

                        logger.info(f"Retryable status {response.status_code}, waiting {delay:.2f}s")
                        time.sleep(delay)
                        continue

                # Non-retryable error
                response.raise_for_status()

            except self.policy.retryable_exceptions as e:
                last_exception = e

                if attempt < self.policy.max_attempts:
                    if not self._check_retry_budget():
                        logger.warning("Retry budget exhausted, failing fast")
                        raise

                    self._record_retry()
                    delay = self.policy.calculate_delay(attempt, previous_delay)
                    previous_delay = delay

                    logger.info(f"Retryable exception: {e}, waiting {delay:.2f}s")
                    time.sleep(delay)
                    continue

                raise

        raise RetryError(f"All {self.policy.max_attempts} attempts failed", last_exception)

    def get(self, endpoint: str, **kwargs) -> requests.Response:
        """GET request with retry."""
        return self.request("GET", endpoint, **kwargs)

    def post(self, endpoint: str, **kwargs) -> requests.Response:
        """POST request with retry."""
        return self.request("POST", endpoint, **kwargs)

    def put(self, endpoint: str, **kwargs) -> requests.Response:
        """PUT request with retry."""
        return self.request("PUT", endpoint, **kwargs)

    def delete(self, endpoint: str, **kwargs) -> requests.Response:
        """DELETE request with retry."""
        return self.request("DELETE", endpoint, **kwargs)
```

Using the production client:

```python
# Initialize client with custom policy
policy = RetryPolicy(
    max_attempts=5,
    base_delay=0.5,
    max_delay=30.0,
    multiplier=2.0,
    jitter=JitterStrategy.FULL
)

api_client = ResilientHttpClient(
    base_url="https://api.example.com",
    policy=policy,
    default_timeout=15.0
)


# Make resilient API calls
def get_user_profile(user_id: str) -> dict:
    response = api_client.get(f"/users/{user_id}")
    return response.json()


def create_order(order_data: dict) -> dict:
    # Use content-based idempotency key
    idempotency_key = IdempotencyKeyGenerator.content_hash(order_data)

    response = api_client.post(
        "/orders",
        json=order_data,
        idempotency_key=idempotency_key
    )
    return response.json()
```

## Summary

Building reliable retry mechanisms requires balancing multiple concerns:

1. **Basic retries** handle transient failures but need tuning to avoid overwhelming failing services

2. **Exponential backoff** gives services time to recover by increasing delays between attempts

3. **Jitter** prevents synchronized retry storms when multiple clients fail simultaneously

4. **Retry budgets** protect your system from becoming part of the problem during outages

5. **Error classification** ensures you only retry errors that might succeed on retry

6. **Idempotency** guarantees safe retries by preventing duplicate operations

The patterns in this guide form a foundation for building resilient distributed systems. Start with basic retries, add backoff and jitter, then layer in budgets and idempotency as your system matures. Remember that retries are a tool, not a solution. They handle transient failures gracefully but cannot fix fundamentally broken dependencies.
