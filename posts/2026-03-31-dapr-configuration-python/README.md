# How to Use Dapr Configuration with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Configuration, Microservice, Redis

Description: Learn how to read and subscribe to dynamic configuration values using the Dapr Configuration API and Python SDK, with Redis as the config store.

---

## Introduction

The Dapr Configuration API provides a consistent way to read application configuration from external stores and subscribe to configuration changes in real time. This is useful for feature flags, dynamic rate limits, and environment-specific settings. The Python SDK makes this straightforward with `get_configuration` and `subscribe_configuration`.

## Prerequisites

```bash
pip install dapr
dapr init
```

## Configuring the Configuration Store

Dapr ships with a Redis configuration store component. Create the component file:

```yaml
# components/config-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
spec:
  type: configuration.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: redisPassword
      value: ""
```

## Seeding Configuration Values

Add some configuration keys to Redis:

```bash
redis-cli MSET feature_flag "true||1" max_retries "5||1" log_level "debug||1"
```

## Reading Configuration

Use `get_configuration` to retrieve one or more keys:

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    config = client.get_configuration(
        store_name="configstore",
        keys=["feature_flag", "max_retries", "log_level"]
    )
    for key, item in config.items.items():
        print(f"{key} = {item.value} (version: {item.version})")
```

## Subscribing to Configuration Changes

Use `subscribe_configuration` to receive updates as they happen:

```python
import threading
from dapr.clients import DaprClient

def on_config_update(id: str, response):
    for key, item in response.items.items():
        print(f"Config changed - {key}: {item.value}")

with DaprClient() as client:
    subscription = client.subscribe_configuration(
        store_name="configstore",
        keys=["feature_flag", "max_retries"],
        handler=on_config_update
    )

    print("Listening for config changes... (press Ctrl+C to stop)")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        client.unsubscribe_configuration(
            store_name="configstore",
            id=subscription
        )
```

## Practical Example - Feature Flag Check

```python
from dapr.clients import DaprClient

class AppConfig:
    def __init__(self, store_name: str):
        self.store_name = store_name
        self._cache = {}

    def load(self, keys: list):
        with DaprClient() as client:
            config = client.get_configuration(
                store_name=self.store_name,
                keys=keys
            )
            for key, item in config.items.items():
                self._cache[key] = item.value

    def get(self, key: str, default=None):
        return self._cache.get(key, default)

cfg = AppConfig("configstore")
cfg.load(["feature_flag", "max_retries"])

if cfg.get("feature_flag") == "true":
    print("New feature enabled")
```

## Running the App

```bash
dapr run --app-id config-app --resources-path ./components -- python config_app.py
```

## Summary

Dapr Configuration API abstracts the details of your config backend behind a unified API. Using the Python SDK, you can read configuration at startup and subscribe to live updates without managing polling logic yourself. This enables dynamic configuration changes without redeploying your application.
