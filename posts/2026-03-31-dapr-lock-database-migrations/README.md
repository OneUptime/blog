# How to Use Dapr Distributed Lock for Database Migrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Database Migration, Kubernetes, DevOps

Description: Use Dapr distributed locks to safely run database migrations in Kubernetes environments where multiple pods start simultaneously and risk executing migrations concurrently.

---

In Kubernetes, rolling deployments or pod restarts can cause multiple application instances to start at the same time. If each pod runs database migrations on startup, you risk concurrent schema changes, duplicate data seeding, or migration conflicts. A Dapr distributed lock solves this with minimal infrastructure.

## The Migration Race Condition

When 3 pods start simultaneously:

```text
Pod A: starting... running migrations...
Pod B: starting... running migrations... (conflict!)
Pod C: starting... running migrations... (conflict!)
```

Only one pod should run migrations; others should wait and proceed after the schema is ready.

## Lock Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lockstore
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

## Migration Guard Implementation

Wrap your migration logic with a Dapr lock:

```python
import os
import time
from dapr.clients import DaprClient

MIGRATION_LOCK = "db-migration"
MIGRATION_EXPIRY = 300  # 5 minutes max for migrations
POD_NAME = os.getenv("POD_NAME", "unknown-pod")

def run_migrations_with_lock():
    with DaprClient() as client:
        print(f"[{POD_NAME}] Attempting to acquire migration lock...")
        resp = client.try_lock(
            store_name="lockstore",
            resource_id=MIGRATION_LOCK,
            lock_owner=POD_NAME,
            expiry_in_seconds=MIGRATION_EXPIRY
        )

        if resp.success:
            print(f"[{POD_NAME}] Lock acquired - running migrations")
            try:
                run_all_migrations()
                print(f"[{POD_NAME}] Migrations complete")
            finally:
                client.unlock("lockstore", MIGRATION_LOCK, POD_NAME)
                print(f"[{POD_NAME}] Migration lock released")
        else:
            print(f"[{POD_NAME}] Migrations running elsewhere - waiting...")
            wait_for_migrations()

def wait_for_migrations(timeout=300, interval=5):
    elapsed = 0
    while elapsed < timeout:
        time.sleep(interval)
        elapsed += interval
        if migrations_complete():
            print("Migrations done - proceeding")
            return
    raise RuntimeError("Timed out waiting for migrations")

def migrations_complete():
    # Check a migration version table or health endpoint
    return check_schema_version() == EXPECTED_VERSION
```

## Using an Init Container

You can run migrations in a Kubernetes init container so they complete before the main application starts. However, because the Dapr sidecar is injected as a regular container, it is not available during init container execution by default. To make Dapr accessible to init containers, enable the native sidecar feature (requires Kubernetes 1.28+):

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "myapp"
    dapr.io/enable-native-sidecar: "true"
spec:
  initContainers:
  - name: migrate
    image: myapp:latest
    command: ["python", "migrate.py"]
    env:
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
    - name: DAPR_HTTP_PORT
      value: "3500"
```

With native sidecar injection, the Dapr sidecar starts as a Kubernetes native sidecar container (an init container with `restartPolicy: Always`) before the migration init container, so Dapr APIs are available. Migrations are then guaranteed to complete before the main app container starts.

## Kubernetes Job Alternative

Use a Kubernetes Job with Dapr for one-time migrations. Set `restartPolicy` to `Never` so the pod does not restart after the Dapr sidecar shuts down:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "migrator"
    spec:
      restartPolicy: Never
      containers:
      - name: migrator
        image: myapp:latest
        command: ["python", "migrate.py"]
```

After migrations complete, you must call the Dapr shutdown API so the sidecar exits and the Job finishes. Otherwise the pod will hang indefinitely:

```python
import requests

def shutdown_dapr():
    requests.post("http://localhost:3500/v1.0/shutdown")
```

Call `shutdown_dapr()` at the end of your `migrate.py` script after all migrations have run.

## Locking Per Migration Version

For finer control, lock on the migration version rather than a single global lock:

```python
def run_version(version: str):
    lock_key = f"migration-v{version}"
    resp = client.try_lock("lockstore", lock_key, POD_NAME, expiry_in_seconds=120)
    if resp.success:
        apply_migration(version)
        client.unlock("lockstore", lock_key, POD_NAME)
```

## Summary

Dapr distributed locks prevent concurrent database migrations in horizontally scaled Kubernetes deployments. The pattern is simple: acquire a named migration lock on startup, run migrations if acquired, or wait and verify completion if not. Combined with init containers or Kubernetes Jobs, this guarantees schema consistency without external migration orchestration tools.
