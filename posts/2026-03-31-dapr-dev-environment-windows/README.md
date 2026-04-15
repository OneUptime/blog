# How to Set Up Dapr Development Environment on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Window, Development, Setup, WSL

Description: Set up a complete Dapr development environment on Windows using Docker Desktop and the Dapr CLI, with tips for WSL2 and PowerShell workflows.

---

## Overview

Dapr runs well on Windows with Docker Desktop. This guide covers installation via PowerShell, initialization of the runtime, and optional WSL2 configuration for a Linux-compatible workflow.

## Prerequisites

- Windows 10/11 (64-bit)
- Docker Desktop for Windows
- PowerShell 5.1+ or Windows Terminal

## Step 1: Install Docker Desktop

Download from https://www.docker.com/products/docker-desktop/ and install. Enable WSL2 backend during setup for better performance.

Verify:

```powershell
docker version
docker run hello-world
```

## Step 2: Install the Dapr CLI

Via PowerShell (run as Administrator):

```powershell
powershell -Command "iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1 | iex"
```

Or use winget:

```powershell
winget install Dapr.CLI
```

Verify:

```powershell
dapr --version
# CLI version: 1.14.0
```

## Step 3: Initialize Dapr

```powershell
dapr init
```

Confirm containers started:

```powershell
docker ps
# dapr_redis     localhost:6379
# dapr_zipkin    localhost:9411
```

Default component files are created at:

```powershell
ls $env:USERPROFILE\.dapr\components\
# pubsub.yaml  statestore.yaml
```

## Step 4: Install a Language SDK

For .NET:

```powershell
dotnet add package Dapr.Client
dotnet add package Dapr.AspNetCore
```

For Node.js (install Node.js from https://nodejs.org/):

```powershell
npm install @dapr/dapr
```

## Step 5: Run Your First Application

Create `app.js`:

```javascript
const { DaprClient } = require('@dapr/dapr');

async function main() {
  const client = new DaprClient({ daprHost: '127.0.0.1', daprPort: '3500' });

  await client.state.save('statestore', [
    { key: 'greet', value: 'Hello from Windows!' }
  ]);

  const val = await client.state.get('statestore', 'greet');
  console.log(val);
  await client.stop();
}

main();
```

Run with Dapr:

```powershell
dapr run --app-id winapp --dapr-http-port 3500 node app.js
```

## Step 6: Using WSL2 (Optional)

For a Linux-compatible environment, install Dapr CLI inside WSL2:

```bash
# Inside WSL2 Ubuntu terminal
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash
dapr init
```

WSL2 shares the Docker daemon with Windows, so containers started by either environment are visible in Docker Desktop.

## Step 7: Open the Dashboard

```powershell
dapr dashboard
# Opens http://localhost:8080 in your default browser
```

## Summary

Dapr works seamlessly on Windows with Docker Desktop, providing the same Redis and Zipkin-backed local environment as Linux and macOS. Whether you prefer PowerShell, Windows Terminal, or WSL2, the Dapr CLI installs quickly and initializes with a single command. WSL2 is recommended for teams that need consistent Linux tooling across platforms.
