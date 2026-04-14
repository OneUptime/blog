# How to Install and Configure the Dapr JavaScript SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, JavaScript, SDK, Node.js, Setup

Description: Step-by-step guide to installing and configuring the Dapr JavaScript SDK in a Node.js project for building distributed microservices.

---

## Introduction

The Dapr JavaScript SDK (`@dapr/dapr`) provides a client and server API for Node.js and browser applications to interact with the Dapr runtime. This guide covers installation, initial configuration, and a minimal working example.

## Prerequisites

- Node.js 18 or later
- Dapr CLI installed and initialized

```bash
# Install Dapr CLI on macOS/Linux
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Initialize Dapr locally
dapr init
```

## Installing the SDK

```bash
npm install @dapr/dapr
```

For TypeScript projects, types are included in the package - no separate `@types` package is needed.

## Basic Project Structure

```text
my-dapr-app/
  src/
    index.ts
    client.ts
    server.ts
  dapr/
    components/
      statestore.yaml
  package.json
  tsconfig.json
```

## Configuring the DaprClient

Create a client that connects to the Dapr sidecar:

```javascript
const { DaprClient, CommunicationProtocolEnum } = require("@dapr/dapr");

const daprHost = process.env.DAPR_HOST || "127.0.0.1";
const daprPort = process.env.DAPR_HTTP_PORT || "3500";

const client = new DaprClient({
  daprHost,
  daprPort,
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});

module.exports = { client };
```

## Using gRPC Instead of HTTP

```javascript
const { DaprClient, CommunicationProtocolEnum } = require("@dapr/dapr");

const client = new DaprClient({
  daprHost: "localhost",
  daprPort: process.env.DAPR_GRPC_PORT || "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});
```

## A Minimal State Store Example

```javascript
const { DaprClient } = require("@dapr/dapr");

async function main() {
  const client = new DaprClient();

  // Save state
  await client.state.save("statestore", [
    { key: "greeting", value: "Hello, Dapr!" },
  ]);

  // Get state
  const value = await client.state.get("statestore", "greeting");
  console.log("State value:", value);

  // Delete state
  await client.state.delete("statestore", "greeting");
  console.log("State deleted");
}

main().catch(console.error);
```

## Running the Application

Start the app with the Dapr sidecar:

```bash
dapr run \
  --app-id my-dapr-app \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --resources-path ./dapr/components \
  -- node src/index.js
```

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `DAPR_HOST` | `127.0.0.1` | Dapr sidecar host |
| `DAPR_HTTP_PORT` | `3500` | Dapr HTTP port |
| `DAPR_GRPC_PORT` | `50001` | Dapr gRPC port |

## Summary

Installing and configuring the Dapr JavaScript SDK takes just a few minutes. Add `@dapr/dapr` to your project, create a `DaprClient` pointing to your sidecar, and start the app with `dapr run`. The SDK supports both HTTP and gRPC communication and works with TypeScript out of the box.
