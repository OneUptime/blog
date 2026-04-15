# How to Set Up Dapr Development Environment on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, macOS, Development, Setup, Local Environment

Description: Complete guide to setting up a Dapr development environment on macOS including CLI installation, Docker Desktop setup, and running your first application.

---

## Overview

Setting up Dapr on macOS involves installing the CLI, ensuring Docker Desktop is running, and initializing the runtime. This guide covers everything needed to go from zero to a working local Dapr environment.

## Prerequisites

- macOS 12 (Monterey) or later
- Homebrew installed
- Docker Desktop running

## Step 1: Install Docker Desktop

Download from https://www.docker.com/products/docker-desktop/ or install via Homebrew:

```bash
brew install --cask docker
open /Applications/Docker.app
```

Verify Docker is running:

```bash
docker version
docker run hello-world
```

## Step 2: Install the Dapr CLI

```bash
brew install dapr/tap/dapr-cli
```

Or use the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash
```

Verify the installation:

```bash
dapr --version
# CLI version: 1.14.0
# Runtime version: n/a
```

## Step 3: Initialize Dapr

```bash
dapr init
```

This pulls Docker images and starts Redis and Zipkin containers:

```bash
Making the jump to hyperspace...
Installing runtime version 1.14.0
Downloading binaries and setting up components...
Pulling container images...
SUCCESS! dapr has been installed successfully.
```

## Step 4: Verify the Installation

```bash
dapr --version
docker ps --format "table {{.Names}}\t{{.Ports}}"
ls ~/.dapr/
# bin/  components/  config.yaml
```

## Step 5: Install Language SDKs

For Node.js development:

```bash
brew install node
npm install @dapr/dapr
```

For Python:

```bash
brew install python
pip3 install dapr
```

For Go:

```bash
brew install go
go get github.com/dapr/go-sdk
```

## Step 6: Create and Run Your First App

```javascript
// app.js
const { DaprClient } = require('@dapr/dapr');

async function main() {
  const client = new DaprClient();

  await client.state.save('statestore', [
    { key: 'hello', value: 'world' }
  ]);

  const value = await client.state.get('statestore', 'hello');
  console.log('Value:', value);

  await client.stop();
}

main().catch(console.error);
```

Run it:

```bash
dapr run --app-id hello-dapr -- node app.js
```

## Step 7: Open the Dapr Dashboard

```bash
dapr dashboard
# Opens http://localhost:8080
```

## Summary

Setting up Dapr on macOS is straightforward with Homebrew and Docker Desktop. After installing the CLI and running `dapr init`, you have a fully functional local environment with Redis state storage and Zipkin tracing. The Dapr Dashboard provides a visual interface for monitoring your local applications and components.
