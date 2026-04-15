# How to Handle Conversation API Rate Limits in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Rate Limit, LLM, Resiliency, Microservice

Description: Learn how to handle LLM provider rate limits in Dapr Conversation API, implementing retry logic, request queuing, and caching to stay within API quotas.

---

LLM providers impose rate limits on API calls - tokens per minute, requests per minute, and daily quotas. Without proper handling, your application will fail with 429 errors during peak usage. This guide covers strategies for graceful rate limit handling with Dapr Conversation.

## Understanding LLM Rate Limits

Common rate limit types:
- **RPM (Requests Per Minute)**: Maximum calls per minute
- **TPM (Tokens Per Minute)**: Input + output tokens per minute
- **TPD (Tokens Per Day)**: Daily token quota

Rate limit errors look like:

```json
{"error": {"code": 429, "message": "Rate limit reached for requests", "type": "requests"}}
```

## Strategy 1: Exponential Backoff Retry

Implement retry with exponential backoff for 429 errors:

```python
import requests
import time
import logging
from functools import wraps

logger = logging.getLogger(__name__)
DAPR_URL = "http://localhost:3500"

def with_exponential_backoff(max_retries=5, base_delay=1.0, max_delay=60.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except RateLimitError as e:
                    if attempt == max_retries - 1:
                        raise

                    # Parse retry-after header if available
                    retry_after = e.retry_after or (base_delay * (2 ** attempt))
                    wait_time = min(retry_after, max_delay)

                    logger.warning(
                        f"Rate limited, waiting {wait_time:.1f}s "
                        f"(attempt {attempt + 1}/{max_retries})"
                    )
                    time.sleep(wait_time)
        return wrapper
    return decorator

class RateLimitError(Exception):
    def __init__(self, message, retry_after=None):
        super().__init__(message)
        self.retry_after = retry_after

@with_exponential_backoff(max_retries=5)
def call_conversation_api(component: str, inputs: list, params: dict = None):
    response = requests.post(
        f"{DAPR_URL}/v1.0-alpha1/conversation/{component}/converse",
        json={"inputs": inputs, "parameters": params or {}}
    )

    if response.status_code == 429:
        retry_after = float(response.headers.get('Retry-After', 1))
        raise RateLimitError("Rate limit exceeded", retry_after=retry_after)

    response.raise_for_status()
    return response.json()['outputs'][0]['result']
```

## Strategy 2: Response Caching

Cache LLM responses to reduce API calls for identical prompts:

```python
import hashlib
import json

def get_cache_key(component: str, inputs: list) -> str:
    content = json.dumps({"component": component, "inputs": inputs}, sort_keys=True)
    return f"llm-cache:{hashlib.sha256(content.encode()).hexdigest()}"

def cached_conversation(component: str, inputs: list, ttl_seconds: int = 3600):
    cache_key = get_cache_key(component, inputs)

    # Check cache
    cache_response = requests.get(
        f"{DAPR_URL}/v1.0/state/statestore/{cache_key}"
    )
    if cache_response.ok and cache_response.content:
        logger.info("Cache hit for LLM request")
        return cache_response.json()

    # Call LLM
    result = call_conversation_api(component, inputs)

    # Store in cache with TTL
    requests.post(
        f"{DAPR_URL}/v1.0/state/statestore",
        json=[{
            "key": cache_key,
            "value": result,
            "metadata": {"ttlInSeconds": str(ttl_seconds)}
        }]
    )

    return result
```

Note: Dapr Conversation also has a built-in `responseCacheTTL` metadata field that caches responses at the component level.

## Strategy 3: Request Queue with Rate Limiting

Use a token bucket to limit outgoing requests:

```python
import asyncio
import time
from collections import deque

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.last_refill = time.monotonic()

    def consume(self, tokens: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

# 60 requests per minute bucket
rate_limiter = TokenBucket(capacity=60, refill_rate=1.0)

async def rate_limited_conversation(component: str, prompt: str) -> str:
    # Wait until we have a token
    while not rate_limiter.consume(1):
        await asyncio.sleep(0.1)

    return call_conversation_api(component, [{"content": prompt, "role": "user"}])
```

## Strategy 4: Multi-Provider Failover

Route to a backup provider when the primary hits rate limits:

```python
PROVIDERS = [
    "openai-conversation",      # Primary - higher quality
    "mistral-conversation",     # Fallback - cheaper, similar quality
    "ollama-conversation"       # Emergency fallback - local, no limits
]

def call_with_fallback(inputs: list) -> str:
    for provider in PROVIDERS:
        try:
            return call_conversation_api(provider, inputs)
        except RateLimitError:
            logger.warning(f"Rate limited on {provider}, trying next provider")
            continue
        except Exception as e:
            logger.error(f"Error with {provider}: {e}")
            continue
    raise Exception("All LLM providers are rate limited or unavailable")
```

## Summary

Handling LLM rate limits in Dapr Conversation requires a layered approach: exponential backoff for transient 429 errors, response caching to reduce call volume, client-side rate limiting to stay within quotas, and multi-provider fallback for high availability. Combining these strategies ensures your application remains responsive even under heavy LLM usage.
