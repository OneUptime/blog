# How to Configure Component Hot Reload in Dapr Self-Hosted Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Hot Reload, Component, Self-Hosted, Configuration

Description: Enable and use Dapr component hot reload in self-hosted mode to update component configurations at runtime without restarting your applications.

---

## Overview

Dapr component hot reload allows you to modify component YAML files and have Dapr pick up the changes without restarting the sidecar or your application. This feature is available from Dapr v1.12+ and is especially useful during development.

## Prerequisites

- Dapr v1.12+ CLI and runtime
- Self-hosted mode initialized

## Step 1: Enable Hot Reload

Hot reload is enabled via the `--enable-hot-reload` flag on `dapr run`:

```bash
dapr run \
  --app-id myapp \
  --app-port 8080 \
  --enable-hot-reload \
  node app.js
```

## Step 2: Default Components Directory

Components are loaded from `~/.dapr/components/` by default. You can override this:

```bash
dapr run \
  --app-id myapp \
  --app-port 8080 \
  --resources-path ./components \
  --enable-hot-reload \
  node app.js
```

## Step 3: Modify a Component at Runtime

Start with an initial state store pointing to Redis:

```yaml
# ~/.dapr/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
    - name: redisPassword
      value: ""
```

Modify the `keyPrefix` without restarting:

```yaml
# Edit statestore.yaml - add keyPrefix
    - name: keyPrefix
      value: "appv2"
```

Watch the Dapr logs - you should see:

```bash
# Output from dapr run
INFO  component updated: statestore (state.redis/v1)
```

## Step 4: Add a New Component at Runtime

Drop a new component file into the components directory:

```yaml
# ~/.dapr/components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: newpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
```

Dapr detects the new file and loads the component:

```bash
INFO  component loaded: newpubsub (pubsub.redis/v1)
```

## Step 5: Remove a Component

Delete the YAML file:

```bash
rm ~/.dapr/components/newpubsub.yaml
```

Dapr logs:

```bash
INFO  component removed: newpubsub (pubsub.redis/v1)
```

## Step 6: Verify the Active Components

```bash
curl http://localhost:3500/v1.0/metadata | python3 -m json.tool | grep -A2 components
```

## Summary

Dapr component hot reload eliminates the need to restart sidecars when modifying component configurations. By launching apps with `--enable-hot-reload`, changes to YAML files in the components directory are detected and applied automatically. This significantly speeds up iteration during development by allowing real-time component reconfiguration.
