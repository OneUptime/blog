# How to Handle Configuration Change Notifications in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration API, Change Notification, Event-Driven, Microservice

Description: Learn how to handle Dapr configuration change notifications reliably, including error handling, reconnection logic, and safely applying configuration updates.

---

Subscribing to Dapr configuration changes is straightforward, but handling those notifications reliably in production requires thoughtful error handling, reconnection logic, and safe update procedures. This guide covers the patterns you need to build robust dynamic configuration in production services.

## The Notification Lifecycle

When a watched key changes in the backing store (Redis, PostgreSQL, etc.), Dapr pushes the new value to all subscribed clients. Your callback receives a map of changed keys and their new values. The subscription is a long-lived connection that needs to survive network interruptions.

## Reliable Subscription with Reconnect Logic

```go
package config

import (
    "context"
    "log"
    "time"

    dapr "github.com/dapr/go-sdk/client"
)

type ConfigWatcher struct {
    client   dapr.Client
    store    string
    keys     []string
    state    map[string]string
    onChange func(key, newValue string)
}

func NewConfigWatcher(store string, keys []string, onChange func(string, string)) *ConfigWatcher {
    return &ConfigWatcher{
        store:    store,
        keys:     keys,
        state:    make(map[string]string),
        onChange: onChange,
    }
}

func (w *ConfigWatcher) Start(ctx context.Context) {
    for {
        if err := w.subscribe(ctx); err != nil {
            log.Printf("Config subscription error: %v, reconnecting in 5s", err)
            select {
            case <-ctx.Done():
                return
            case <-time.After(5 * time.Second):
                // retry
            }
        }
    }
}

func (w *ConfigWatcher) subscribe(ctx context.Context) error {
    client, err := dapr.NewClient()
    if err != nil {
        return err
    }
    defer client.Close()

    subID, err := client.SubscribeConfigurationItems(
        ctx, w.store, w.keys,
        func(id string, items map[string]*dapr.ConfigurationItem) {
            for key, item := range items {
                oldVal := w.state[key]
                if oldVal != item.Value {
                    log.Printf("Config change: %s = %q (was %q)", key, item.Value, oldVal)
                    w.state[key] = item.Value
                    w.safeApply(key, item.Value)
                }
            }
        },
    )
    if err != nil {
        return err
    }

    log.Printf("Config watcher subscribed (id: %s) to %v", subID, w.keys)
    <-ctx.Done()
    return client.UnsubscribeConfigurationItems(context.Background(), w.store, subID)
}

func (w *ConfigWatcher) safeApply(key, value string) {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Panic applying config change for %s: %v", key, r)
        }
    }()
    w.onChange(key, value)
}
```

## Safe Configuration Update Patterns

Not all configuration changes are safe to apply immediately. Apply validation before acting on new values:

```python
import logging
from typing import Callable, Dict

class ConfigChangeHandler:
    def __init__(self):
        self._validators: Dict[str, Callable] = {}
        self._handlers: Dict[str, Callable] = {}

    def register(self, key: str, validator: Callable, handler: Callable):
        self._validators[key] = validator
        self._handlers[key] = handler

    def handle(self, key: str, new_value: str):
        validator = self._validators.get(key)
        handler = self._handlers.get(key)

        if not handler:
            return

        if validator and not validator(new_value):
            logging.error(f"Invalid config value for {key}: {new_value!r}, ignoring")
            return

        try:
            handler(new_value)
        except Exception as e:
            logging.error(f"Error applying config change for {key}: {e}")

# Setup
handler = ConfigChangeHandler()

def validate_log_level(val: str) -> bool:
    return val.lower() in ("debug", "info", "warning", "error", "critical")

def apply_log_level(val: str):
    logging.getLogger().setLevel(val.upper())

handler.register("log-level", validate_log_level, apply_log_level)

def validate_max_connections(val: str) -> bool:
    try:
        n = int(val)
        return 1 <= n <= 500
    except ValueError:
        return False

def apply_max_connections(val: str):
    update_db_pool_size(int(val))

handler.register("max-connections", validate_max_connections, apply_max_connections)
```

## Versioned Change Detection

Avoid applying the same change twice by tracking version numbers:

```javascript
const seenVersions = new Map();

function onConfigChange(items) {
  for (const [key, item] of Object.entries(items)) {
    const lastVersion = seenVersions.get(key);
    if (lastVersion === item.version) {
      console.log(`Skipping duplicate notification for ${key}`);
      continue;
    }
    seenVersions.set(key, item.version);
    applyConfigChange(key, item.value);
  }
}
```

## Summary

Handling Dapr configuration change notifications reliably requires automatic reconnection on subscription failure, validation before applying new values, panic recovery in callbacks to prevent service crashes, and version tracking to deduplicate notifications. With these patterns in place, your services can safely consume dynamic configuration updates in production with confidence.
