# How to Test Dapr State Management Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Testing, Local Development, Docker

Description: Learn how to run and test Dapr state management on your local machine using dapr init, Docker-based Redis, and the Dapr CLI for rapid iteration.

---

## Prerequisites

To test Dapr state management locally, you need:
- Docker Desktop running
- Dapr CLI installed
- Node.js or Python (or any language with a Dapr SDK)

Install the Dapr CLI and initialize the local environment:

```bash
# Install Dapr CLI (macOS)
brew install dapr/tap/dapr-cli

# Initialize Dapr locally (spins up Redis and Zipkin in Docker)
dapr init
```

`dapr init` creates a local Redis container that acts as the default state store, and writes component YAML files to `~/.dapr/components/`.

## Verifying the Default State Store

Check that the default state store component exists:

```bash
cat ~/.dapr/components/statestore.yaml
```

You should see a Redis-backed state store named `statestore`.

## Writing a Simple Test Service

Create a minimal Express service that reads and writes state:

```javascript
// app.js
const express = require("express");
const { DaprClient } = require("@dapr/dapr");

const app = express();
app.use(express.json());
const client = new DaprClient();

app.post("/state/:key", async (req, res) => {
  await client.state.save("statestore", [
    { key: req.params.key, value: req.body },
  ]);
  res.json({ saved: true });
});

app.get("/state/:key", async (req, res) => {
  const value = await client.state.get("statestore", req.params.key);
  res.json({ key: req.params.key, value });
});

app.listen(3000, () => console.log("Listening on 3000"));
```

## Running the Service with Dapr

Start the service with the Dapr CLI:

```bash
dapr run \
  --app-id my-test-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  -- node app.js
```

## Testing State Operations with curl

With the service running, test state save and retrieval:

```bash
# Save state
curl -s -X POST http://localhost:3000/state/user-42 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "role": "admin"}'

# Read state
curl -s http://localhost:3000/state/user-42

# Read directly via Dapr HTTP API
curl -s http://localhost:3500/v1.0/state/statestore/user-42

# Delete state
curl -s -X DELETE http://localhost:3500/v1.0/state/statestore/user-42
```

## Testing with a Custom Local Component

You can override the default component for testing with a specific configuration. Create a local components folder:

```bash
mkdir -p ./components
```

Then write a custom component file:

```yaml
# ./components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: keyPrefix
    value: none
```

Run dapr with the custom components directory:

```bash
dapr run \
  --app-id my-test-service \
  --app-port 3000 \
  --resources-path ./components \
  -- node app.js
```

## Inspecting State Directly in Redis

Use the Redis CLI inside the Docker container to inspect stored keys:

```bash
docker exec -it dapr_redis redis-cli
KEYS *
GET "my-test-service||user-42"
```

Dapr uses a key prefix of `<appId>||<key>` by default when `keyPrefix` is set to `appid`.

## Summary

Testing Dapr state management locally is straightforward with `dapr init`, which sets up a Docker-based Redis and default component configuration. You can run any service with `dapr run`, exercise state operations via curl or the SDK, and inspect stored data directly in Redis for fast debugging without needing a Kubernetes cluster.
