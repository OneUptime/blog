# How to Configure Telepresence Volume Mounts for Hot-Reloading Local Code Against Remote Kubernetes Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevEx, Development

Description: Learn how to configure Telepresence volume mounts to enable hot-reloading of local code while running against remote Kubernetes services, dramatically speeding up your development workflow.

---

Developing applications that depend on multiple Kubernetes services often requires constantly building and pushing container images, waiting for deployments to update, and dealing with slow feedback loops. This development cycle can take minutes for each code change, significantly slowing down productivity. Telepresence solves this by allowing you to run code locally while seamlessly connecting to remote services, but the real power comes when you combine it with volume mounts and hot-reloading.

With Telepresence volume mounts and hot-reloading configured correctly, you can edit code on your local machine and see changes reflected instantly in your application while it interacts with real Kubernetes services. In this guide, you'll learn how to set up this powerful development workflow.

## Understanding Telepresence Volume Mounts

Telepresence intercepts traffic to a Kubernetes service and redirects it to a process running on your local machine. Volume mounts extend this capability by making Kubernetes volumes accessible locally, and more importantly, by allowing you to mount local directories into the remote context.

This bidirectional mounting enables several powerful scenarios including running local code that reads from Kubernetes ConfigMaps and Secrets, accessing Persistent Volumes from your local environment, and most importantly, hot-reloading local code changes without rebuilding containers.

The key is that your local process runs with access to both local files and remote Kubernetes resources, creating a hybrid environment that feels local but behaves like it's running in the cluster.

## Installing and Configuring Telepresence

First, install Telepresence and set up the cluster-side components:

```bash
# Install Telepresence CLI
# For macOS
brew install datawire/blackbird/telepresence

# For Linux
sudo curl -fL https://app.getambassador.io/download/tel2/linux/amd64/latest/telepresence \
  -o /usr/local/bin/telepresence
sudo chmod a+x /usr/local/bin/telepresence

# Verify installation
telepresence version

# Connect to cluster and install traffic manager
telepresence connect

# Check connection status
telepresence status
```

Create a configuration file for Telepresence:

```yaml
# ~/.config/telepresence/config.yml
timeouts:
  agentInstall: 2m
  intercept: 30s

grpc:
  maxReceiveSize: 10Mi

images:
  registry: docker.io/datawire

logLevels:
  userDaemon: debug
  rootDaemon: info

intercept:
  appProtocolStrategy: http2Probe
  defaultPort: 8080
```

## Setting Up a Hot-Reload Development Environment

Create a Node.js application with hot-reloading as an example:

```javascript
// app.js
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', version: '1.0.0' });
});

// Main endpoint that calls other services
app.get('/api/data', async (req, res) => {
    try {
        // Call another service in the cluster
        const response = await axios.get('http://backend-service/api/users');

        res.json({
            message: 'Data from local service',
            timestamp: new Date().toISOString(),
            backend_data: response.data,
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch data',
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Hot module replacement support for development
if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => {
        console.log('Module disposed for hot reload');
    });
}
```

Create a package.json with hot-reloading configuration:

```json
{
  "name": "telepresence-demo",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon --watch . --exec node app.js",
    "dev:debug": "nodemon --watch . --inspect=0.0.0.0:9229 --exec node app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

Create nodemon configuration for optimal hot-reloading:

```json
{
  "watch": ["*.js", "src/**/*.js"],
  "ext": "js,json",
  "ignore": ["node_modules/", "test/"],
  "delay": "1000",
  "verbose": true,
  "execMap": {
    "js": "node"
  },
  "env": {
    "NODE_ENV": "development"
  }
}
```

## Configuring Telepresence Intercept with Volume Mounts

Create a Kubernetes deployment for your service:

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
        image: myregistry/api-service:latest
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: BACKEND_URL
          value: "http://backend-service"
        volumeMounts:
        - name: config
          mountPath: /app/config
        - name: data
          mountPath: /app/data
      volumes:
      - name: config
        configMap:
          name: api-config
      - name: data
        emptyDir: {}
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
    targetPort: 8080
    protocol: TCP
```

Create a Telepresence intercept configuration:

```yaml
# telepresence-intercept.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: telepresence-config
data:
  intercept.yaml: |
    workloads:
    - name: api-service
      intercepts:
      - handler: api-dev
        patterns:
        - name: volume-mount
          localMount: ./local-app
          remoteMount: /app
        - name: config-mount
          localMount: ./config
          remoteMount: /app/config
        global:
          - name: backend-service
            namespace: development
```

Start the intercept with volume mounts:

```bash
# Navigate to your project directory
cd ~/projects/api-service

# Start intercept with volume mounts
telepresence intercept api-service \
  --namespace development \
  --port 8080 \
  --mount=true \
  --docker-run \
  --mount-to=/telepresence-root

# Alternative: Manual intercept with specific mount points
telepresence intercept api-service \
  --namespace development \
  --port 8080:8080 \
  --env-file=.env.telepresence \
  --mount=/tmp/telepresence-mounts \
  --docker-mount=/tmp/telepresence-mounts:/telepresence-root
```

## Creating a Development Startup Script

Create a script to automate the setup:

```bash
#!/bin/bash
# start-dev.sh

set -e

echo "Starting Telepresence development environment..."

# Configuration
NAMESPACE="development"
SERVICE="api-service"
PORT="8080"
LOCAL_DIR="$(pwd)"

# Check if Telepresence is connected
if ! telepresence status | grep -q "Connected"; then
    echo "Connecting to Kubernetes cluster..."
    telepresence connect
fi

# Create environment file from cluster
echo "Extracting environment variables..."
telepresence intercept $SERVICE \
  --namespace $NAMESPACE \
  --port $PORT \
  --env-file .env.telepresence \
  --preview-url=false

# Start local development server with hot reload
echo "Starting local server with hot reload..."
echo "Local code will be served for requests to $SERVICE"
echo "Changes to local files will trigger automatic reload"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Load environment and start with nodemon
export $(cat .env.telepresence | xargs)
npm run dev

# Cleanup on exit
trap "telepresence leave $SERVICE" EXIT
```

Make the script executable and use it:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

## Configuring Hot-Reload for Different Languages

For Python with Flask and hot-reloading:

```python
# app.py
from flask import Flask, jsonify
import requests
import os

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/api/data')
def get_data():
    # Call remote service
    backend_url = os.getenv('BACKEND_URL', 'http://backend-service')
    try:
        response = requests.get(f"{backend_url}/api/users")
        return jsonify({
            "message": "Data from local Python service",
            "backend_data": response.json()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Enable debug mode for hot reload
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 8080)),
        debug=True,
        use_reloader=True
    )
```

Start Python development with Telepresence:

```bash
#!/bin/bash
# start-dev-python.sh

telepresence intercept api-service \
  --namespace development \
  --port 8080 \
  --env-file .env.telepresence

# Use watchdog for file watching with Flask
export $(cat .env.telepresence | xargs)
export FLASK_ENV=development
export FLASK_DEBUG=1

python app.py
```

For Go with hot-reloading using Air:

```toml
# .air.toml
root = "."
tmp_dir = "tmp"

[build]
  bin = "./tmp/main"
  cmd = "go build -o ./tmp/main ."
  delay = 1000
  exclude_dir = ["tmp", "vendor"]
  exclude_file = []
  exclude_regex = ["_test.go"]
  exclude_unchanged = false
  follow_symlink = false
  full_bin = ""
  include_dir = []
  include_ext = ["go", "tpl", "tmpl", "html"]
  kill_delay = "0s"
  log = "build-errors.log"
  send_interrupt = false
  stop_on_error = true

[color]
  app = ""
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[log]
  time = false

[misc]
  clean_on_exit = false
```

```bash
#!/bin/bash
# start-dev-go.sh

# Install Air if not present
which air || go install github.com/cosmtrek/air@latest

telepresence intercept api-service \
  --namespace development \
  --port 8080 \
  --env-file .env.telepresence

export $(cat .env.telepresence | xargs)
air
```

## Advanced Volume Mount Patterns

Configure selective volume mounts for optimal performance:

```bash
# Mount only specific directories
telepresence intercept api-service \
  --namespace development \
  --port 8080 \
  --mount=false \
  --docker-run \
  --docker-mount="$(pwd)/src:/app/src:cached" \
  --docker-mount="$(pwd)/config:/app/config:ro" \
  -- npm run dev

# Use docker-compose for complex setups
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    volumes:
      - ./src:/app/src:cached
      - ./config:/app/config:ro
      - node_modules:/app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
    network_mode: "host"

volumes:
  node_modules:
```

Start with docker-compose and Telepresence:

```bash
# Establish intercept
telepresence intercept api-service \
  --namespace development \
  --port 8080 \
  --docker-run

# Run with docker-compose
docker-compose up
```

## Monitoring and Debugging Intercepts

Create a monitoring script to track intercept status:

```bash
#!/bin/bash
# monitor-intercept.sh

watch -n 2 'echo "=== Telepresence Status ===" && \
            telepresence status && \
            echo "" && \
            echo "=== Active Intercepts ===" && \
            telepresence list && \
            echo "" && \
            echo "=== Network Traffic ===" && \
            netstat -an | grep 8080'
```

Debug connection issues:

```bash
# Check intercept details
telepresence list --namespace development --debug

# View daemon logs
telepresence gather-logs

# Test connectivity to remote services
telepresence intercept api-service \
  --namespace development \
  --port 8080

# In another terminal, test access to cluster services
curl http://backend-service.development.svc.cluster.local

# Check DNS resolution
nslookup backend-service.development.svc.cluster.local
```

## Creating a Complete Development Workflow

Put it all together in a comprehensive development script:

```bash
#!/bin/bash
# dev-workflow.sh

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="api-service"
NAMESPACE="development"
PORT="8080"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

cleanup() {
    log "Cleaning up..."
    telepresence leave $SERVICE_NAME 2>/dev/null || true
    telepresence quit 2>/dev/null || true
}

trap cleanup EXIT

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    log "Installing dependencies..."
    npm install
fi

# Connect to cluster
log "Connecting to Kubernetes cluster..."
telepresence connect

# Start intercept
log "Starting intercept for $SERVICE_NAME..."
telepresence intercept $SERVICE_NAME \
  --namespace $NAMESPACE \
  --port $PORT:$PORT \
  --env-file .env.telepresence \
  --mount=true

# Export environment variables
log "Loading environment from cluster..."
export $(grep -v '^#' .env.telepresence | xargs)

# Start development server
log "Starting development server with hot-reload..."
log "Edit files in $PROJECT_DIR to see changes instantly"
log "Service accessible at http://localhost:$PORT"
log ""
log "Press Ctrl+C to stop"

npm run dev
```

Telepresence volume mounts with hot-reloading transform Kubernetes development from a slow, container-centric process into a fast, local-first workflow. By running code locally while accessing remote services and volumes, you get instant feedback on code changes while working in a production-like environment, dramatically improving developer productivity and reducing the friction of cloud-native development.
