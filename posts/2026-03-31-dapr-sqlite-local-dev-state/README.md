# How to Use SQLite for Local Development with Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SQLite, Local Development, State Store, Testing, Developer Experience

Description: Use SQLite as a Dapr state store for local development and testing, enabling fast iteration without external infrastructure dependencies.

---

## Overview

SQLite is a file-based SQL database that requires no server setup. Dapr's SQLite state store component is ideal for local development, integration testing, and CI pipelines where spinning up Redis, PostgreSQL, or MongoDB would add unnecessary complexity.

## Dapr Component Configuration for Local Dev

Create a local components directory with the SQLite configuration:

```bash
mkdir -p ~/.dapr/components
```

Create the SQLite state store component:

```yaml
# ~/.dapr/components/state.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.sqlite
  version: v1
  metadata:
  - name: connectionString
    value: "file:/tmp/dapr-state.db?mode=rwc"
  - name: tableName
    value: "state"
  - name: timeout
    value: "20s"
  - name: cleanupInterval
    value: "1h"
  - name: disableWAL
    value: "false"
  - name: actorStateStore
    value: "true"
```

## Running Dapr with SQLite Locally

```bash
# Start your app with Dapr using SQLite state store
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --components-path ~/.dapr/components \
  -- node app.js
```

## Application Code

Since SQLite uses the same Dapr state API as any other backend, your application code remains unchanged:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function main() {
  // Save state
  await client.state.save('statestore', [
    { key: 'order:001', value: { id: '001', status: 'pending', amount: 99.99 } },
    { key: 'order:002', value: { id: '002', status: 'shipped', amount: 149.00 } }
  ]);

  // Get state
  const order = await client.state.get('statestore', 'order:001');
  console.log('Retrieved:', order);

  // Delete state
  await client.state.delete('statestore', 'order:001');
  console.log('Deleted order:001');
}

main();
```

## Environment-Based Configuration

Use different component files for different environments:

```bash
# Development: SQLite
# .dapr/components/dev/state.yaml -> state.sqlite

# Staging: PostgreSQL
# .dapr/components/staging/state.yaml -> state.postgresql

# Production: Redis
# .dapr/components/prod/state.yaml -> state.redis
```

Use a Makefile to switch environments:

```makefile
dev:
    dapr run \
      --app-id order-service \
      --components-path .dapr/components/dev \
      -- go run main.go

staging:
    dapr run \
      --app-id order-service \
      --components-path .dapr/components/staging \
      -- go run main.go
```

## Inspecting SQLite State

Since SQLite is a local file, you can inspect state directly:

```bash
# Open the SQLite database
sqlite3 /tmp/dapr-state.db

-- List all state keys
SELECT key, etag, update_time FROM state;

-- View specific state value
SELECT key, value FROM state WHERE key = 'order-service||order:001';

-- Check expiring state
SELECT key, expiration_time FROM state WHERE expiration_time IS NOT NULL;
```

## CI/CD Integration Testing

Use SQLite in GitHub Actions for fast integration tests:

```yaml
name: Integration Tests

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Install Dapr CLI
      run: |
        wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh
        chmod +x install.sh && ./install.sh

    - name: Initialize Dapr
      run: dapr init --slim

    - name: Run integration tests
      run: |
        dapr run \
          --app-id test-service \
          --components-path ./test/components \
          -- go test ./integration/...
```

## Summary

SQLite as a Dapr state store eliminates infrastructure setup friction for local development and CI testing. Because Dapr abstracts the state store API, developers write the same code that runs against Redis or PostgreSQL in production. Environment-based component directories make it trivial to switch backends without code changes, enabling fast local iteration while maintaining production fidelity in staging.
