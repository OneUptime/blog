# How to Implement Request-Reply Pattern with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Messaging, RPC, Queue, Architecture

Description: Learn how to implement the request-reply (RPC over Redis) pattern where a caller sends a request and waits for a correlated response from a worker service.

---

The request-reply pattern lets a service make a synchronous-looking call to a remote service over a message queue. The caller sends a message to a work queue and blocks on a dedicated reply queue. The worker processes the request and writes the result back to the reply queue. This is sometimes called RPC over Redis.

## How It Works

```text
Caller --> RPUSH requests queue (with reply_to key)
Caller --> BLPOP reply:{correlation_id} (blocks waiting)
Worker --> BLPOP requests queue
Worker --> RPUSH reply:{correlation_id} result
```

## Caller Code

```python
import redis
import json
import uuid
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def remote_call(method: str, params: dict, timeout: int = 10) -> dict:
    correlation_id = str(uuid.uuid4())
    reply_key = f"reply:{correlation_id}"

    request = {
        "correlation_id": correlation_id,
        "reply_to": reply_key,
        "method": method,
        "params": json.dumps(params),
        "timestamp": str(time.time())
    }

    # Send request
    r.rpush("rpc:requests", json.dumps(request))

    # Block waiting for reply
    result = r.blpop(reply_key, timeout=timeout)
    if result is None:
        raise TimeoutError(f"No reply for {correlation_id} after {timeout}s")

    _, raw = result
    return json.loads(raw)

# Example usage
try:
    response = remote_call("get_user", {"user_id": "u123"})
    print(f"Got user: {response}")
except TimeoutError as e:
    print(f"Request timed out: {e}")
```

## Worker Code

```python
def run_worker():
    print("Worker started, waiting for requests...")
    while True:
        result = r.blpop("rpc:requests", timeout=5)
        if result is None:
            continue

        _, raw = result
        request = json.loads(raw)

        # Dispatch
        response = handle_request(request["method"], json.loads(request["params"]))

        # Send reply
        r.rpush(request["reply_to"], json.dumps(response))
        r.expire(request["reply_to"], 60)  # cleanup if caller died

def handle_request(method: str, params: dict) -> dict:
    if method == "get_user":
        return {"user_id": params["user_id"], "name": "Alice", "status": "active"}
    return {"error": f"Unknown method: {method}"}
```

## Running Both Sides

```bash
# Terminal 1: start worker
python worker.py

# Terminal 2: make a call
python caller.py
```

## Handling Worker Errors

```python
def handle_request_safe(method: str, params: dict) -> dict:
    try:
        return handle_request(method, params)
    except Exception as e:
        return {"error": str(e), "method": method}
```

## Timeout and Cleanup

```python
# Caller should delete the reply key if it times out
def remote_call_with_cleanup(method: str, params: dict, timeout: int = 10) -> dict:
    correlation_id = str(uuid.uuid4())
    reply_key = f"reply:{correlation_id}"
    request = {
        "correlation_id": correlation_id,
        "reply_to": reply_key,
        "method": method,
        "params": json.dumps(params),
    }
    r.rpush("rpc:requests", json.dumps(request))
    result = r.blpop(reply_key, timeout=timeout)
    r.delete(reply_key)  # always cleanup
    if result is None:
        raise TimeoutError("Request timed out")
    return json.loads(result[1])
```

## Summary

The request-reply pattern over Redis uses a shared request queue and per-request reply queues keyed by a correlation ID. The caller blocks with `BLPOP` on its reply key while the worker processes and writes back. Always set TTLs on reply keys and clean them up after reading to prevent memory leaks.

