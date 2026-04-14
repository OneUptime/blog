# How to Implement Health Endpoints in Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Health Check, Kubernetes, Probe, Observability

Description: Learn how to implement health check endpoints in Dapr applications for Kubernetes liveness and readiness probes alongside Dapr sidecar health validation.

---

## Overview

Kubernetes relies on liveness and readiness probes to manage pod lifecycle. Dapr-enabled applications need health endpoints at both the application level and the Dapr sidecar level. Properly implemented health checks prevent traffic from reaching unhealthy pods and allow Kubernetes to restart crashed containers automatically.

## Dapr Sidecar Health Endpoint

Dapr exposes built-in health endpoints on port 3500:

```bash
# Sidecar health check
curl http://localhost:3500/v1.0/healthz

# Sidecar outbound health check (checks Dapr services)
curl http://localhost:3500/v1.0/healthz/outbound
```

A healthy sidecar returns `HTTP 204 No Content`.

## Implementing Application Health Endpoints

Add liveness and readiness endpoints to your service:

```javascript
const express = require('express');
const { DaprClient } = require('@dapr/dapr');

const app = express();
const daprClient = new DaprClient();

// Liveness: is the process alive?
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness: is the service ready to accept traffic?
app.get('/health/ready', async (req, res) => {
  try {
    // Check Dapr state store connectivity
    await daprClient.state.get('redis-statestore', '__health__');

    // Check any critical dependencies
    const dbHealthy = await checkDatabaseConnection();

    if (!dbHealthy) {
      return res.status(503).json({ status: 'not ready', reason: 'database unavailable' });
    }

    res.status(200).json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not ready', reason: err.message });
  }
});

// Startup: for slow-starting services
app.get('/health/startup', async (req, res) => {
  const initialized = await isApplicationInitialized();
  if (initialized) {
    res.status(200).json({ status: 'started' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
});
```

## Configuring Kubernetes Probes

Configure Kubernetes probes targeting both app and Dapr health endpoints:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:latest
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 15
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 5
          startupProbe:
            httpGet:
              path: /health/startup
              port: 8080
            failureThreshold: 30
            periodSeconds: 5
```

## Waiting for Dapr Sidecar in the Startup Probe

Ensure the Dapr sidecar is ready before the app reports healthy:

```javascript
const waitForDapr = async (maxAttempts = 20) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:3500/v1.0/healthz');
      if (response.status === 204) return true;
    } catch {
      // Dapr not ready yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Dapr sidecar did not become ready');
};

// In startup health check
app.get('/health/startup', async (req, res) => {
  try {
    await waitForDapr(1);  // Single attempt - probe will retry
    res.status(200).json({ status: 'started' });
  } catch {
    res.status(503).json({ status: 'starting', waiting: 'dapr-sidecar' });
  }
});
```

## Python Health Endpoint Example

For Python FastAPI services:

```python
from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI()

@app.get("/health/live")
async def liveness():
    return {"status": "alive"}

@app.get("/health/ready")
async def readiness():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:3500/v1.0/healthz", timeout=2)
            if resp.status_code != 204:
                raise HTTPException(status_code=503, detail="Dapr sidecar not ready")
        return {"status": "ready"}
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Health check failed: {exc}")
```

## Summary

Health endpoints in Dapr applications require implementing liveness, readiness, and startup probes at the application level, combined with the Dapr sidecar's built-in `/v1.0/healthz` endpoint. Configure Kubernetes probes to target the application health endpoints, include Dapr sidecar connectivity checks in readiness probes, and use startup probes for services that require Dapr to be fully initialized before accepting traffic.
