# How to Install and Configure the Dapr Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, SDK, Setup, Microservice

Description: Step-by-step guide to installing and configuring the Dapr Python SDK in a Python project for building distributed microservices with Dapr.

---

## Introduction

The Dapr Python SDK provides both synchronous and asynchronous clients for interacting with Dapr building blocks from Python applications. This guide walks through installation, configuration, and a minimal working example.

## Prerequisites

- Python 3.10 or later
- Dapr CLI installed and initialized

```bash
# Install Dapr CLI
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Initialize Dapr locally
dapr init

# Verify
dapr --version
```

## Installing the SDK

```bash
pip install dapr
```

For gRPC support (recommended for production):

```bash
pip install dapr dapr-ext-grpc
```

For FastAPI integration:

```bash
pip install dapr-ext-fastapi
```

## Project Structure

```text
my-dapr-app/
  app.py
  requirements.txt
  dapr/
    components/
      statestore.yaml
      pubsub.yaml
```

## Creating the DaprClient

```python
from dapr.clients import DaprClient

# Default: connects to localhost:3500 (HTTP) or localhost:50001 (gRPC)
with DaprClient() as client:
    # Make Dapr calls here
    pass
```

Custom endpoint configuration:

```python
import os
from dapr.clients import DaprClient

dapr_host = os.environ.get("DAPR_HOST", "localhost")
dapr_grpc_port = os.environ.get("DAPR_GRPC_PORT", "50001")

with DaprClient(address=f"{dapr_host}:{dapr_grpc_port}") as client:
    client.save_state("statestore", "hello", "world")
    result = client.get_state("statestore", "hello")
    print("Value:", result.data.decode("utf-8"))
```

## Basic State Store Example

```python
from dapr.clients import DaprClient
import json

def main():
    with DaprClient() as client:
        # Save state
        order = {"id": "order-1", "product": "widget", "qty": 3}
        client.save_state("statestore", "order-1", json.dumps(order))
        print("Saved order")

        # Get state
        result = client.get_state("statestore", "order-1")
        retrieved = json.loads(result.data)
        print("Retrieved order:", retrieved)

        # Delete state
        client.delete_state("statestore", "order-1")
        print("Deleted order")

if __name__ == "__main__":
    main()
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DAPR_HTTP_PORT` | `3500` | Dapr HTTP sidecar port |
| `DAPR_GRPC_PORT` | `50001` | Dapr gRPC sidecar port |
| `DAPR_API_TOKEN` | (none) | API token for authentication |

## Running the Application

```bash
dapr run \
  --app-id my-python-app \
  --app-port 5000 \
  --dapr-http-port 3500 \
  --resources-path ./dapr/components \
  -- python app.py
```

## Summary

Installing the Dapr Python SDK takes just a `pip install dapr` command. Create a `DaprClient` as a context manager to interact with state stores, pub/sub, and other building blocks, then launch the application with `dapr run` to attach the sidecar. The SDK works with both sync and async Python applications.
