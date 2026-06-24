# How to Use the dapr components Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Component, Configuration, Kubernetes

Description: Learn how to use the dapr components command to list and inspect loaded Dapr components in self-hosted and Kubernetes environments.

---

## Overview

The `dapr components` command lists all Dapr components deployed in a Kubernetes cluster. Components include state stores, pub/sub brokers, bindings, secret stores, and more. This command is essential for verifying that your component configurations are being picked up correctly. Note that this command is supported only in Kubernetes mode and requires the `--kubernetes` (`-k`) flag.

## Listing Components in Kubernetes

```bash
dapr components -k
```

Sample output:

```text
  NAMESPACE  NAME        TYPE              VERSION  SCOPES  CREATED
  default    statestore  state.redis       v1               2026-03-31 10:00:00
  default    pubsub      pubsub.redis      v1               2026-03-31 10:00:00
  default    binding     bindings.cron     v1               2026-03-31 10:00:00
```

## Filtering Components by Namespace

```bash
dapr components -k --namespace production
```

## JSON Output for Scripting

```bash
dapr components -k --output json
```

Sample JSON output:

```json
[
  {
    "name": "statestore",
    "type": "state.redis",
    "version": "v1",
    "scopes": [],
    "created": "2026-03-31T10:00:00Z"
  },
  {
    "name": "pubsub",
    "type": "pubsub.rabbitmq",
    "version": "v1",
    "scopes": ["api-service"],
    "created": "2026-03-31T10:00:00Z"
  }
]
```

## Diagnosing Missing Components

If a component is not showing up, check:

1. That the YAML file is in the correct directory
2. That the `apiVersion` and `kind` fields are correct
3. That the component name matches what your app code references

```bash
# Check what directory dapr is loading components from
dapr run --app-id debug-app --resources-path ./components -- echo "checking"

# Then list components
dapr components -k
```

## Verifying Scoped Components

Scoped components are only available to specific app IDs. Verify scoping is configured correctly:

```yaml
# components/scoped-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: private-store
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-private:6379
scopes:
  - order-service
  - inventory-service
```

After applying, only `order-service` and `inventory-service` will see `private-store` in the component list.

## Summary

`dapr components -k` gives you a quick view of all active components in your Dapr Kubernetes environment. Use it to confirm that state stores, pub/sub brokers, and bindings are loaded correctly before debugging application behavior. JSON output makes it easy to integrate this check into automated deployment pipelines.
