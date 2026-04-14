# How to Implement Kill Switch with Dapr Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Kill Switch, Feature Flag, Reliability

Description: Build a kill switch system using the Dapr Configuration API that instantly disables features across all running service instances without redeployment.

---

## What Is a Kill Switch?

A kill switch is an emergency feature disable mechanism. When a new feature causes production issues, you want to turn it off in seconds, not minutes. Dapr's Configuration API subscription model pushes the "off" signal to all pods nearly instantly.

## Setting Up Kill Switch Config in Redis

```bash
# Initialize kill switches for all major features
# Redis values use the format: value||version
redis-cli MSET \
  "payment-v2" "false||1" \
  "recommendation-engine" "false||1" \
  "new-checkout" "false||1" \
  "ai-search" "false||1"
```

## Dapr Configuration Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kill-switches
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

## Kill Switch Manager

```python
import threading
from dapr.clients import DaprClient

class KillSwitchManager:
    def __init__(self, store_name: str = "kill-switches"):
        self.store_name = store_name
        self._switches: dict[str, bool] = {}
        self._lock = threading.RLock()
        self._client = None

    def load_initial(self, features: list[str]):
        with DaprClient() as client:
            resp = client.get_configuration(self.store_name, features)
            with self._lock:
                for key, item in resp.items.items():
                    self._switches[key] = item.value.lower() == "true"
                    print(f"Kill switch loaded: {key} = {self._switches[key]}")

    def subscribe(self, features: list[str]):
        def _on_change(id: str, resp):
            for key, item in resp.items.items():
                killed = item.value.lower() == "true"
                with self._lock:
                    self._switches[key] = killed
                if killed:
                    print(f"KILL SWITCH ACTIVATED: {key}")
                else:
                    print(f"Kill switch deactivated: {key}")

        self._client = DaprClient()
        self._subscription_id = self._client.subscribe_configuration(
            self.store_name, features, handler=_on_change
        )

    def is_killed(self, feature: str) -> bool:
        with self._lock:
            return self._switches.get(feature, False)

# Global singleton
kill_switches = KillSwitchManager()
```

## Applying Kill Switches in FastAPI

```python
from fastapi import FastAPI, HTTPException
from kill_switch import kill_switches

app = FastAPI()

FEATURES = ["payment-v2", "recommendation-engine", "new-checkout", "ai-search"]

@app.on_event("startup")
async def startup():
    kill_switches.load_initial(FEATURES)
    kill_switches.subscribe(FEATURES)

@app.post("/api/checkout")
async def checkout(cart_id: str):
    if kill_switches.is_killed("new-checkout"):
        # Fall back to legacy checkout
        return await legacy_checkout(cart_id)
    return await new_checkout(cart_id)

@app.get("/api/recommendations")
async def recommendations(user_id: str):
    if kill_switches.is_killed("recommendation-engine"):
        raise HTTPException(503, "Recommendations temporarily unavailable")
    return await get_recommendations(user_id)
```

## Activating the Kill Switch

```bash
# Immediately kill a feature across all pods
redis-cli SET "payment-v2" "true||2"

# Verify via Dapr API
curl http://localhost:3500/v1.0/configuration/kill-switches?key=payment-v2

# Restore when issue is resolved
redis-cli SET "payment-v2" "false||3"
```

## Monitoring Kill Switch Status

```bash
# Check all kill switch states
redis-cli MGET \
  "payment-v2" \
  "recommendation-engine" \
  "new-checkout" \
  "ai-search"
```

## Summary

Dapr's Configuration API subscription makes kill switches extremely effective: the moment you set a key to "true" in Redis, all subscribed pods receive the update and stop serving the affected feature. This typically happens in under a second, which is far faster than a rolling restart. Every team shipping features regularly should have kill switches wired in before going to production.
