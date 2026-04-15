# How to Debug Configuration API Issues in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Debugging, Configuration API, Troubleshooting, Operation

Description: A practical guide to diagnosing and fixing common Dapr Configuration API issues including missing keys, subscription failures, and component initialization errors.

---

The Dapr Configuration API can fail in several different ways: the component may not initialize, key retrieval may return empty results, or subscriptions may not fire when values change. This guide walks through the most common issues and how to resolve each one.

## Check Component Initialization

Start by verifying that the configuration component loaded successfully:

```bash
kubectl get component appconfig -n production
```

If the component status shows unhealthy or not found, describe it:

```bash
kubectl describe component appconfig -n production
```

Check the sidecar logs for initialization errors:

```bash
kubectl logs deployment/my-service -c daprd | grep -i "configuration\|component\|error" | head -20
```

Common initialization errors:

```text
# Redis keyspace notifications not enabled
"error initializing configuration store: ERR Redis keyspace notifications are not enabled"

# Wrong connection string format
"error initializing configuration store: dial tcp: connection refused"

# Missing required metadata field
"error parsing configuration store metadata: required field 'connectionString' not set"
```

## Fix: Enable Redis Keyspace Notifications

If you see the keyspace notification error, fix it:

```bash
# Check current setting
redis-cli CONFIG GET notify-keyspace-events

# Enable keyspace notifications
redis-cli CONFIG SET notify-keyspace-events "KEA"

# Verify
redis-cli CONFIG GET notify-keyspace-events
# Should return: notify-keyspace-events, KEA
```

## Debugging Missing Key Returns

If the configuration API returns empty items for a key you expect to exist:

```bash
# Test the raw API call
curl -v "http://localhost:3500/v1.0/configuration/appconfig?key=my-key"
```

Then check the actual key format in Redis:

```bash
# List all keys in the config store
redis-cli KEYS "*"

# Configuration store keys are stored as plain keys (no app-id prefix)
# The value format is: <value>||<version>
# Example key: my-key, value: my-value||1
redis-cli GET "my-key"
```

If the key exists in Redis but the API returns nothing, check that the value includes a version:

```bash
# Set the key with the correct value format (value||version)
redis-cli SET "my-key" "my-value||1"
```

## Debugging Subscription Not Firing

If subscriptions are set up but callbacks are not firing when values change:

```bash
# Manually trigger a keyspace event in Redis
redis-cli SET "my-key" "new-value||1"

# Monitor keyspace notifications to confirm they're firing
redis-cli SUBSCRIBE "__keyevent@0__:set"
```

Then update the key again and verify the subscription fires. If you see the notification in `redis-cli SUBSCRIBE` but not in your application, the issue is in the subscription callback or the sidecar log level:

```bash
# Increase sidecar log level to debug
kubectl patch deployment my-service -p \
  '{"spec":{"template":{"metadata":{"annotations":{"dapr.io/log-level":"debug"}}}}}'

# Watch for subscription events
kubectl logs -f deployment/my-service -c daprd | grep -i "subscription\|config"
```

## Common Component YAML Mistakes

```yaml
# WRONG - type is mistyped
spec:
  type: configuration.Redis  # case sensitive!

# CORRECT
spec:
  type: configuration.redis

# WRONG - PostgreSQL table doesn't exist yet
spec:
  type: configuration.postgresql
  metadata:
    - name: table
      value: "app_config"  # table must be created manually first

# WRONG - missing keyspace notifications for Redis
# Component will load but subscriptions will silently fail
```

## Testing Configuration API Health

Create a simple health check that verifies config retrieval works:

```bash
#!/bin/bash
# health-check-config.sh
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:3500/v1.0/configuration/appconfig?key=health-check")

if [ "$RESPONSE" = "200" ]; then
  echo "Configuration API: OK"
else
  echo "Configuration API: FAILED (HTTP $RESPONSE)"
  exit 1
fi
```

## Summary

Debugging Dapr Configuration API issues starts with checking component initialization in sidecar logs, then verifying Redis keyspace notifications are enabled, checking that key names and values use the correct format (including the `value||version` convention), and monitoring keyspace events to confirm subscriptions fire. Increasing the sidecar log level to debug provides the most visibility into what the configuration component is doing internally.
