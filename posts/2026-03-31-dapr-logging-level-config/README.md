# How to Implement Logging Level Configuration with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Logging, Observability, Runtime

Description: Dynamically change log verbosity across all service instances using the Dapr Configuration API without restarting pods or modifying deployments.

---

## Why Dynamic Log Levels Matter

You want verbose debug logs when diagnosing an issue, but info-level logging the rest of the time. With static log level configs you need a rolling restart to change verbosity. Dapr's Configuration API lets you flip log levels in real time.

## Storing Log Level Config

```bash
# Set initial log levels per service (format: "value||version")
redis-cli MSET \
  "api-gateway:level" "info||1" \
  "payment-service:level" "warn||1" \
  "order-service:level" "info||1" \
  "user-service:level" "error||1"
```

## Dapr Configuration Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: log-config
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

## Dynamic Logger in Python

```python
import logging
import threading
from dapr.clients import DaprClient

LEVEL_MAP = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warn": logging.WARNING,
    "warning": logging.WARNING,
    "error": logging.ERROR,
    "critical": logging.CRITICAL,
}

class DynamicLogger:
    def __init__(self, service_name: str, store_name: str = "log-config"):
        self.service_name = service_name
        self.store_name = store_name
        self.logger = logging.getLogger(service_name)
        self._setup_handler()

    def _setup_handler(self):
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(
            "%(asctime)s %(levelname)s [%(name)s] %(message)s"
        ))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def load_level(self):
        with DaprClient() as client:
            items = client.get_configuration(
                self.store_name, [f"{self.service_name}:level"]
            )
            for key, item in items.items.items():
                level = LEVEL_MAP.get(item.value.lower(), logging.INFO)
                self.logger.setLevel(level)
                self.logger.info(f"Log level set to {item.value}")

    def watch_level(self):
        def handler(id: str, resp):
            for key in resp.items:
                item = resp.items[key]
                level = LEVEL_MAP.get(item.value.lower(), logging.INFO)
                self.logger.setLevel(level)
                print(f"[{self.service_name}] Log level changed to {item.value}")

        def _run():
            with DaprClient() as client:
                client.subscribe_configuration(
                    store_name=self.store_name,
                    keys=[f"{self.service_name}:level"],
                    handler=handler,
                )
                # Block to keep the subscription alive
                threading.Event().wait()

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()

    def get(self) -> logging.Logger:
        return self.logger
```

## Using the Dynamic Logger

```python
from fastapi import FastAPI
from dynamic_logger import DynamicLogger

app = FastAPI()
dlog = DynamicLogger("api-gateway")

@app.on_event("startup")
async def startup():
    dlog.load_level()
    dlog.watch_level()

logger = dlog.get()

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    logger.debug(f"Fetching user {user_id} from database")
    user = await db.get_user(user_id)
    logger.info(f"User {user_id} retrieved successfully")
    return user
```

## Changing Log Levels at Runtime

```bash
# Enable debug logging for api-gateway during an incident
redis-cli SET "api-gateway:level" "debug||2"

# Restore to info after debugging
redis-cli SET "api-gateway:level" "info||3"

# Silence a noisy service
redis-cli SET "payment-service:level" "error||2"
```

## Verifying via Dapr API

```bash
curl "http://localhost:3500/v1.0/configuration/log-config?key=api-gateway%3Alevel"
```

## Summary

Dynamic log level management via Dapr's Configuration API eliminates the need for pod restarts when adjusting verbosity. This is particularly valuable during incidents when you need debug logs immediately, and equally valuable afterwards when you want to suppress verbose output without a deployment pipeline run.
