# How to Configure Fission for Kubernetes Serverless on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kubernetes, Serverless, Fission, Function

Description: Step-by-step guide to installing and configuring Fission serverless framework on Kubernetes running on Ubuntu, with examples for deploying and scaling functions.

---

Fission is an open-source serverless function framework that runs on Kubernetes. Unlike AWS Lambda or Azure Functions, Fission runs entirely on your own Kubernetes cluster, giving you full control over the infrastructure. Functions run in Kubernetes pods managed by Fission, and Fission handles pooling warm containers, routing HTTP traffic, and scaling. This is particularly useful for teams already running Kubernetes who want serverless-style deployment without vendor lock-in.

## Prerequisites

You need a running Kubernetes cluster. This guide assumes you have:
- A Kubernetes cluster (kubeadm, k3s, or managed cloud Kubernetes)
- `kubectl` configured with cluster access
- `helm` installed for the Fission deployment
- Kubernetes 1.27 or higher
- At least 2GB of free memory in the cluster

Verify your cluster is accessible:

```bash
kubectl cluster-info
kubectl get nodes
```

## Installing Fission with Helm

```bash
# Add the Fission Helm repository

helm repo add fission-charts https://fission.github.io/fission-charts/
helm repo update

# Create a namespace for Fission
kubectl create namespace fission

# Install Fission CRDs
kubectl create -k "github.com/fission/fission/crds/v1?ref=v1.23.0"

# Install Fission
helm install --version 1.23.0 \
    --namespace fission \
    --set serviceType=NodePort,routerServiceType=NodePort \
    fission \
    fission-charts/fission-all

# Verify Fission pods are running
kubectl get pods -n fission
```

Wait for all pods to reach `Running` state:

```bash
kubectl wait --for=condition=ready pod --all -n fission --timeout=120s
```

## Installing the Fission CLI

```bash
# Download the Fission CLI binary
curl -Lo fission https://github.com/fission/fission/releases/download/v1.23.0/fission-v1.23.0-linux-amd64

# Install to /usr/local/bin
chmod +x fission
sudo mv fission /usr/local/bin/

# Verify CLI works
fission version
```

Set the Fission router endpoint:

```bash
# Get the router's NodePort
export FISSION_ROUTER_PORT=$(kubectl get svc router -n fission -o jsonpath='{.spec.ports[0].nodePort}')
export FISSION_ROUTER_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
export FISSION_ROUTER="$FISSION_ROUTER_IP:$FISSION_ROUTER_PORT"

# Or if using LoadBalancer
export FISSION_ROUTER=$(kubectl get svc router -n fission -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
```

## Creating Your First Function

Fission supports multiple languages. Start with a Python function:

```bash
# Create the function code
cat > hello.py << 'EOF'
# hello.py - Simple Fission Python function
from flask import request

def main():
    # The main() function is the entry point for Fission
    name = request.args.get('name', 'World')
    return f"Hello, {name}!\n"
EOF
```

### Setting Up the Environment

Fission uses "environments" which are pre-built container images for each language:

```bash
# Create a Python environment
fission environment create \
    --name python \
    --image ghcr.io/fission/python-env \
    --builder ghcr.io/fission/python-builder

# List available environments
fission environment list
```

### Deploying the Function

```bash
# Create the function
fission function create \
    --name hello-world \
    --env python \
    --code hello.py

# Create an HTTP trigger to expose the function
fission httptrigger create \
    --name hello-trigger \
    --function hello-world \
    --url /hello \
    --method GET

# Test the function
curl http://$FISSION_ROUTER/hello
curl http://$FISSION_ROUTER/hello?name=Ubuntu
```

## Node.js Function Example

```bash
# Create a Node.js function
cat > weather.js << 'EOF'
// weather.js - Example Node.js Fission function
const url = require('url');

module.exports = async function(context) {
    const query = url.parse(context.request.url, true).query;
    const city = query.city || 'London';

    // In a real function, you'd call a weather API
    const response = {
        city: city,
        temperature: Math.floor(Math.random() * 30) + 5,
        unit: 'celsius',
        conditions: 'partly cloudy'
    };

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
    };
};
EOF

# Create Node.js environment
fission environment create \
    --name nodejs \
    --image ghcr.io/fission/node-env

# Deploy the function
fission function create \
    --name weather \
    --env nodejs \
    --code weather.js

# Create trigger
fission httptrigger create \
    --name weather-trigger \
    --function weather \
    --url /weather \
    --method GET

# Test
curl "http://$FISSION_ROUTER/weather?city=Ubuntu"
```

## Functions with Dependencies

For functions that require external packages:

```bash
# Create a directory for the package-based function
mkdir my-api-function
cd my-api-function

# requirements.txt
cat > requirements.txt << 'EOF'
requests==2.31.0
flask==3.0.0
EOF

# The function code
cat > user.py << 'EOF'
# user.py - Function with external dependencies
import requests
from flask import request, jsonify

def main():
    url = request.args.get('url', 'https://httpbin.org/json')

    try:
        response = requests.get(url, timeout=5)
        return jsonify({
            'status': response.status_code,
            'content_type': response.headers.get('content-type'),
            'body': response.json() if 'json' in response.headers.get('content-type', '') else response.text[:500]
        })
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500
EOF

# Build script used by the Python builder
cat > build.sh << 'EOF'
#!/bin/sh
pip3 install -r ${SRC_PKG}/requirements.txt -t ${SRC_PKG} && cp -r ${SRC_PKG} ${DEPLOY_PKG}
EOF
chmod +x build.sh

zip -j my-api-pkg.zip requirements.txt user.py build.sh

# Deploy as a package (directory with dependencies)
fission package create \
    --name my-api-pkg \
    --env python \
    --sourcearchive my-api-pkg.zip \
    --buildcmd "./build.sh"

# Create function from package
fission function create \
    --name api-fetcher \
    --pkg my-api-pkg \
    --entrypoint "user.main"

cd ..
```

## Timer-Based Functions

Fission supports scheduled functions using cron-style triggers:

```bash
# Create a function that runs on a schedule
cat > cleanup.py << 'EOF'
# cleanup.py - Scheduled cleanup function
import datetime
import os

def main():
    now = datetime.datetime.now()
    print(f"Cleanup job running at {now}")

    # Your actual cleanup logic here
    # e.g., delete old records, send reports, etc.

    return f"Cleanup completed at {now}\n"
EOF

# Deploy the function
fission function create \
    --name cleanup-job \
    --env python \
    --code cleanup.py

# Create a timer trigger (runs every hour)
fission timetrigger create \
    --name hourly-cleanup \
    --function cleanup-job \
    --cron "@hourly"

# List time triggers
fission timetrigger list
```

## Monitoring Functions

```bash
# View function logs
fission function log --name hello-world

# Follow logs in real time
fission function log --name hello-world --follow

# Invoke the function from the CLI
fission function test --name hello-world

# List all functions
fission function list

# Check pods used by the function
fission function pods --name hello-world
```

## Updating Functions

```bash
# Update function code
cat > hello.py << 'EOF'
from flask import request

def main():
    name = request.args.get('name', 'World')
    version = "2.0"
    return f"Hello, {name}! (version {version})\n"
EOF

# Update the deployed function
fission function update --name hello-world --code hello.py

# Test the updated version
curl http://$FISSION_ROUTER/hello?name=test
```

## Configuring Function Resources

Set resource limits and concurrency for production functions:

```bash
# Create function with specific resource limits
fission function create \
    --name resource-limited \
    --env python \
    --code hello.py \
    --executortype newdeploy \
    --minscale 1 \
    --maxscale 10 \
    --minmemory 64 \
    --maxmemory 256 \
    --mincpu 100 \
    --maxcpu 500 \
    --targetcpu 80       # Scale up when CPU exceeds 80%
```

Fission's container pool mechanism keeps warm pods available for functions, reducing cold start latency for many workloads. For functions that need a constantly running replica, use the `newdeploy` executor with `--minscale 1`.
