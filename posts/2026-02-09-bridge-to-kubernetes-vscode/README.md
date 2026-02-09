# How to Set Up Bridge to Kubernetes for Visual Studio Code Local Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevEx, Development

Description: Learn how to configure Bridge to Kubernetes in VS Code to debug applications locally while connecting to remote Kubernetes services, enabling fast iterative development without container rebuilds.

---

Debugging Kubernetes applications traditionally requires building container images, pushing them to registries, updating deployments, and waiting for pods to restart. This cycle can take several minutes per iteration, drastically slowing development. Bridge to Kubernetes (formerly Local Process with Kubernetes) solves this by allowing you to run and debug code locally while seamlessly routing traffic from your cluster to your development machine.

This enables you to set breakpoints, step through code, and inspect variables in your local IDE while your application interacts with real Kubernetes services. In this guide, you'll learn how to set up and use Bridge to Kubernetes with Visual Studio Code.

## Understanding Bridge to Kubernetes Architecture

Bridge to Kubernetes works by intercepting traffic destined for a specific Kubernetes service and redirecting it to your local development machine. It creates a bidirectional connection where your local process can call cluster services and cluster services can call your local process.

The tool modifies your local network stack to make Kubernetes services accessible via their cluster DNS names, injects environment variables from the target pod, mounts volumes used by the pod, and routes traffic through a sidecar proxy. This creates a hybrid environment where your code runs locally but behaves as if it's running in the cluster.

## Installing Bridge to Kubernetes Extension

First, install the required tools:

```bash
# Install VS Code Bridge to Kubernetes extension
# Open VS Code and search for "Bridge to Kubernetes" in extensions marketplace
# Or install via CLI
code --install-extension mindaro.mindaro

# Verify kubectl is installed and configured
kubectl version --client
kubectl cluster-info

# Ensure you have cluster access
kubectl get nodes
```

Configure VS Code workspace settings:

```json
{
  "bridge-to-kubernetes.namespace": "development",
  "bridge-to-kubernetes.isolateAs": "your-name",
  "bridge-to-kubernetes.useKubernetesServiceEnvironmentVariables": true
}
```

## Creating a Debuggable Application

Create a sample Node.js application that calls other services:

```javascript
// app.js
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Service URLs from environment variables
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service';
const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || 'http://data-service';

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

app.get('/api/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // Call auth service to verify token
        const authResponse = await axios.get(`${AUTH_SERVICE_URL}/verify`, {
            headers: {
                'Authorization': req.headers.authorization
            }
        });

        // Call data service to get user data
        const userResponse = await axios.get(`${DATA_SERVICE_URL}/users/${userId}`);

        res.json({
            authenticated: authResponse.data.valid,
            user: userResponse.data,
            debugMode: process.env.DEBUG_MODE === 'true'
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.post('/api/data', async (req, res) => {
    try {
        const response = await axios.post(`${DATA_SERVICE_URL}/data`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`AUTH_SERVICE_URL: ${AUTH_SERVICE_URL}`);
    console.log(`DATA_SERVICE_URL: ${DATA_SERVICE_URL}`);
});
```

Create launch configuration for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Bridge to Kubernetes - api-service",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app",
      "sourceMaps": true,
      "skipFiles": [
        "<node_internals>/**"
      ]
    },
    {
      "name": "Local Debug (without Bridge)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/app.js",
      "env": {
        "PORT": "3000",
        "NODE_ENV": "development",
        "DEBUG_MODE": "true"
      }
    }
  ]
}
```

## Configuring Kubernetes Resources

Deploy the service to Kubernetes:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: development
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
      - name: api
        image: your-registry/api-service:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: AUTH_SERVICE_URL
          value: "http://auth-service.development.svc.cluster.local"
        - name: DATA_SERVICE_URL
          value: "http://data-service.development.svc.cluster.local"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: development
spec:
  selector:
    app: api-service
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
```

Apply the manifests:

```bash
kubectl apply -f k8s/
kubectl wait --for=condition=available --timeout=60s deployment/api-service -n development
```

## Using Bridge to Kubernetes

Start debugging with Bridge to Kubernetes:

1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Run "Bridge to Kubernetes: Configure"
3. Select the service to replace (api-service)
4. Select the port to forward (3000)
5. Choose isolation mode (isolated or not)
6. Select launch configuration

The extension will:
- Create a connection to the cluster
- Redirect traffic from the service to your local machine
- Inject environment variables
- Make cluster services accessible via DNS
- Start your application in debug mode

## Advanced Bridge Configuration

Create a tasks.json for automated setup:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "bridge-to-kubernetes.service",
      "type": "bridge-to-kubernetes.service",
      "service": "api-service",
      "ports": [3000],
      "targetCluster": "development-cluster",
      "targetNamespace": "development",
      "isolateAs": "${env:USER}",
      "useKubernetesServiceEnvironmentVariables": true
    },
    {
      "label": "Install Dependencies",
      "type": "shell",
      "command": "npm install",
      "problemMatcher": []
    },
    {
      "label": "Prepare Debug Environment",
      "dependsOn": [
        "Install Dependencies",
        "bridge-to-kubernetes.service"
      ],
      "dependsOrder": "sequence"
    }
  ]
}
```

Update launch configuration to use the task:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Bridge to Kubernetes",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/app.js",
      "preLaunchTask": "bridge-to-kubernetes.service",
      "env": {
        "PORT": "3000",
        "DEBUG_MODE": "true"
      },
      "envFile": "${workspaceFolder}/.env.bridge",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Debugging Multiple Services

For microservices architectures, debug multiple services simultaneously:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Bridge: API Service",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/services/api/app.js",
      "preLaunchTask": "bridge-api-service",
      "env": {
        "PORT": "3000"
      }
    },
    {
      "name": "Bridge: Worker Service",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/services/worker/app.js",
      "preLaunchTask": "bridge-worker-service",
      "env": {
        "PORT": "3001"
      }
    }
  ],
  "compounds": [
    {
      "name": "Debug All Services",
      "configurations": [
        "Bridge: API Service",
        "Bridge: Worker Service"
      ]
    }
  ]
}
```

## Using Isolated Mode

Isolate your debugging session from other developers:

```bash
# Create isolated routing
# Bridge will create routing rules that only affect your traffic
# Other developers working on the same service won't be affected
```

Configure isolation in VS Code settings:

```json
{
  "bridge-to-kubernetes.isolateAs": "${env:USER}-debug",
  "bridge-to-kubernetes.useKubernetesServiceEnvironmentVariables": true,
  "bridge-to-kubernetes.enableAdvancedLogging": true
}
```

## Debugging Python Applications

For Python/Flask applications:

```python
# app.py
from flask import Flask, jsonify, request
import requests
import os

app = Flask(__name__)

AUTH_SERVICE = os.getenv('AUTH_SERVICE_URL', 'http://auth-service')
DATA_SERVICE = os.getenv('DATA_SERVICE_URL', 'http://data-service')

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/api/data/<int:id>')
def get_data(id):
    # Breakpoint here for debugging
    auth_response = requests.get(f"{AUTH_SERVICE}/verify")
    data_response = requests.get(f"{DATA_SERVICE}/items/{id}")

    return jsonify({
        "auth": auth_response.json(),
        "data": data_response.json()
    })

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=True
    )
```

Launch configuration for Python:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Bridge to Kubernetes - Python",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/app.py",
      "preLaunchTask": "bridge-to-kubernetes.service",
      "console": "integratedTerminal",
      "env": {
        "FLASK_APP": "app.py",
        "FLASK_ENV": "development",
        "PORT": "5000"
      }
    }
  ]
}
```

## Troubleshooting Common Issues

Create a troubleshooting script:

```bash
#!/bin/bash
# debug-bridge.sh

echo "Checking Bridge to Kubernetes setup..."

# Check cluster connectivity
echo "1. Testing cluster connectivity..."
kubectl cluster-info

# Check namespace
echo "2. Checking namespace..."
kubectl get all -n development

# Check service exists
echo "3. Verifying service..."
kubectl get svc api-service -n development

# Check DNS resolution
echo "4. Testing DNS resolution..."
nslookup auth-service.development.svc.cluster.local

# Check port availability
echo "5. Checking local port..."
lsof -i :3000 || echo "Port 3000 is available"

# Check Bridge processes
echo "6. Checking Bridge processes..."
ps aux | grep -i bridge

echo "Troubleshooting complete"
```

## Monitoring Bridge Connections

Track active Bridge connections:

```bash
# View Bridge logs
# On macOS/Linux
tail -f ~/.vscode/extensions/mindaro.mindaro-*/bridge-logs/*.log

# Check network routes added by Bridge
# On macOS
netstat -rn | grep -i bridge

# On Linux
ip route show

# Monitor traffic
sudo tcpdump -i any -n port 3000
```

Bridge to Kubernetes transforms the Kubernetes development experience by eliminating the container rebuild cycle. By allowing you to debug locally while connected to real cluster services, you can iterate rapidly with immediate feedback, dramatically improving productivity while maintaining production-like testing conditions.
