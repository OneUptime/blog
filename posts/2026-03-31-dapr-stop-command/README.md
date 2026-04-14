# How to Use the dapr stop Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Development, Process Management

Description: Learn how to use the dapr stop command to gracefully shut down running Dapr applications and their sidecar processes in self-hosted mode.

---

## Overview

The `dapr stop` command stops a running Dapr application and its associated sidecar process by app ID. This is the clean alternative to killing the process manually, ensuring that the sidecar shuts down properly and releases its resources.

## Basic Usage

Stop a running application by its app ID:

```bash
dapr stop --app-id my-app
```

This sends a termination signal to both the application process and the Dapr sidecar, then waits for them to exit.

## Stopping Multiple Applications

You can stop multiple apps in sequence:

```bash
dapr stop --app-id frontend
dapr stop --app-id backend
dapr stop --app-id order-processor
```

## Stopping All Apps from a Multi-App Run File

If you started services with `dapr run -f dapr.yaml`, stop them all with:

```bash
dapr stop -f dapr.yaml
```

This is the cleanest way to shut down a local multi-service development stack.

## Verifying the App Stopped

After stopping, confirm the app is no longer listed:

```bash
dapr list
```

If successful, the app ID will no longer appear in the output.

## Example: Full Development Lifecycle

```bash
# Start services
dapr run -f dapr.yaml

# (develop and test)

# Stop all services cleanly
dapr stop -f dapr.yaml
```

## Stopping by App ID in Scripts

Use `dapr stop` in shell scripts for CI teardown:

```bash
#!/bin/bash
APP_IDS=("order-service" "inventory-service" "notification-service")

for app_id in "${APP_IDS[@]}"; do
  echo "Stopping $app_id..."
  dapr stop --app-id "$app_id"
done

echo "All Dapr apps stopped."
```

## What Happens During Stop

When `dapr stop` is called:

1. Dapr sends a `SIGTERM` signal to your application
2. Your app has a grace period (default 5 seconds) to finish in-flight requests
3. The Dapr sidecar then shuts down and deregisters from the placement service
4. Any open state transactions are flushed if the store supports it

## Graceful Shutdown in Your App

Configure your app to handle termination signals so it shuts down cleanly:

```javascript
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  await server.close();
  process.exit(0);
});
```

## Summary

`dapr stop` provides a clean way to terminate Dapr-enabled applications in self-hosted mode. It ensures both the sidecar and application process exit properly. For multi-service environments started with `dapr run -f`, use `dapr stop -f` to shut down the entire stack with a single command.
