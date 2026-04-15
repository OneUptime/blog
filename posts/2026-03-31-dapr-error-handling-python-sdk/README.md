# How to Handle Errors in Dapr Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Error Handling, Resilience, gRPC

Description: Learn how to handle errors, gRPC status codes, and transient failures in Dapr Python SDK applications with retry logic and structured error responses.

---

## Introduction

Dapr uses gRPC under the hood, so errors from the sidecar surface as `grpc.RpcError` exceptions with status codes. Understanding how to catch and handle these errors is essential for building resilient Python microservices. This guide covers error types, retry patterns, and structured error handling.

## Common Error Types

```python
import grpc
from dapr.clients import DaprClient
from dapr.clients.exceptions import DaprInternalError

# gRPC status codes you will commonly encounter:
# grpc.StatusCode.NOT_FOUND - key or resource not found
# grpc.StatusCode.UNAVAILABLE - sidecar not reachable
# grpc.StatusCode.DEADLINE_EXCEEDED - timeout
# grpc.StatusCode.ALREADY_EXISTS - duplicate resource
# grpc.StatusCode.PERMISSION_DENIED - auth failure
```

## Catching gRPC Errors

```python
import grpc
from dapr.clients import DaprClient

def get_order(order_id: str):
    try:
        with DaprClient() as client:
            result = client.get_state(
                store_name="statestore",
                key=order_id
            )
            if not result.data:
                return None, "Order not found"
            return result.data.decode("utf-8"), None
    except grpc.RpcError as e:
        code = e.code()
        if code == grpc.StatusCode.NOT_FOUND:
            return None, f"State store not found: {e.details()}"
        elif code == grpc.StatusCode.UNAVAILABLE:
            return None, "Dapr sidecar unavailable"
        else:
            return None, f"Unexpected error ({code}): {e.details()}"
```

## Implementing Retry Logic

For transient failures, implement exponential backoff:

```python
import time
import grpc
from dapr.clients import DaprClient

def save_with_retry(key: str, value: str, max_attempts: int = 3):
    delay = 1.0
    for attempt in range(1, max_attempts + 1):
        try:
            with DaprClient() as client:
                client.save_state(
                    store_name="statestore",
                    key=key,
                    value=value
                )
            return True
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAVAILABLE and attempt < max_attempts:
                print(f"Attempt {attempt} failed, retrying in {delay}s...")
                time.sleep(delay)
                delay *= 2
            else:
                raise
    return False
```

## Handling Pub/Sub Errors

Return `DROP` to discard a poison message, or `RETRY` to redeliver:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/orders", methods=["POST"])
def handle_order():
    try:
        body = request.get_json()
        data = body.get("data")
        if not data:
            # Drop malformed messages
            return jsonify({"status": "DROP"})
        process_order(data)
        return jsonify({"status": "SUCCESS"})
    except ValueError as e:
        print(f"Invalid order data: {e}")
        return jsonify({"status": "DROP"})
    except Exception as e:
        print(f"Processing error: {e}, will retry")
        return jsonify({"status": "RETRY"}), 500
```

## Timeout Configuration

Set timeout on DaprClient operations:

```python
import grpc
from dapr.clients import DaprClient

with DaprClient() as client:
    try:
        result = client.invoke_method(
            app_id="slow-service",
            method_name="compute",
            data=b"payload",
            timeout=5
        )
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.DEADLINE_EXCEEDED:
            print("Service call timed out after 5 seconds")
```

## Structured Error Logging

```python
import logging
import grpc
from dapr.clients import DaprClient

logger = logging.getLogger(__name__)

def invoke_service(app_id: str, method: str, data: bytes):
    try:
        with DaprClient() as client:
            return client.invoke_method(app_id, method, data=data)
    except grpc.RpcError as e:
        logger.error(
            "Service invocation failed",
            extra={
                "app_id": app_id,
                "method": method,
                "grpc_code": e.code().name,
                "details": e.details()
            }
        )
        raise
```

## Summary

Dapr Python SDK errors surface as gRPC `RpcError` exceptions with status codes. By catching specific status codes you can implement targeted retry logic, log structured error data, and return appropriate pub/sub status responses. Building error handling into your service layer from the start leads to more resilient microservices.
