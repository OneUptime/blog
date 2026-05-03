# How to Deploy Fission on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Fission, Serverless, Kubernetes, Function

Description: Guide to deploying Fission serverless framework on Rancher for fast function execution with warm pods.

## Introduction

Fission is a fast, open-source serverless framework for Kubernetes. Unlike other serverless frameworks, Fission maintains a pool of warm pods to minimize cold start latency, making it ideal for latency-sensitive applications.

## Key Features

- Cold start in milliseconds (warm pod pool)
- Support for Python, NodeJS, Go, Java, Ruby, PHP
- Event-driven triggers (HTTP, timer, message queues)
- Workflow support via Fission Workflows
- Built-in monitoring and logging

## Step 1: Install Fission

```bash
# Add Fission Helm repository

helm repo add fission-charts https://fission.github.io/fission-charts/
helm repo update

# Create namespace
kubectl create namespace fission

# Install Fission with serviceType LoadBalancer
helm install fission fission-charts/fission-all \
  --namespace fission \
  --set serviceType=LoadBalancer \
  --set routerServiceType=LoadBalancer \
  --set persistence.enabled=true \
  --set persistence.storageClass=longhorn \
  --version 1.19.0

# Wait for Fission to be ready
kubectl wait pods --all \
  --for=condition=Ready \
  --namespace fission \
  --timeout=300s
```

## Step 2: Install fission CLI

```bash
# Download fission CLI
curl -Lo fission \
  https://github.com/fission/fission/releases/download/v1.19.0/fission-v1.19.0-linux-amd64

chmod +x fission
sudo mv fission /usr/local/bin/

# Set Fission server URL
export FISSION_NAMESPACE=fission
fission version
```

## Step 3: Create Your First Function

```python
# hello.py
def main():
    return "Hello from Rancher Fission!"
```

```bash
# Create a Python environment
fission environment create \
  --name python \
  --image fission/python-env:latest \
  --mincpu 40 --maxcpu 200 \
  --minmemory 64 --maxmemory 128

# Create function from file
fission function create \
  --name hello \
  --env python \
  --code hello.py \
  --minscale 1 \
  --maxscale 5

# Create HTTP route
fission httptrigger create \
  --method GET \
  --url /hello \
  --function hello

# Test the function
fission function test --name hello
```

## Step 4: NodeJS Function Example

```javascript
// greet.js
module.exports = async function(context) {
    const name = context.request.query.name || 'World';
    return {
        status: 200,
        body: `Hello ${name} from Fission on Rancher!`
    };
};
```

```bash
# Create Node environment
fission environment create \
  --name nodejs \
  --image fission/node-env:latest

# Deploy NodeJS function
fission function create \
  --name greet \
  --env nodejs \
  --code greet.js

fission httptrigger create \
  --method GET \
  --url /greet \
  --function greet
```

## Step 5: Configure Timer Triggers

```bash
# Run function every 5 minutes
fission timetrigger create \
  --name data-collector \
  --function hello \
  --cron "*/5 * * * *"

# List all triggers
fission timetrigger list
```

## Step 6: Message Queue Triggers (Kafka)

```yaml
# kafka-trigger.yaml
apiVersion: fission.io/v1
kind: MessageQueueTrigger
metadata:
  name: process-events
  namespace: fission
spec:
  functionref:
    type: name
    name: event-processor
  messageQueueType: kafka
  topic: events-input
  respTopic: events-output
  errorTopic: events-error
  contentType: application/json
  mqtkind: keda
```

## Step 7: Function Packages for Dependencies

```bash
# Create a package with dependencies
cat > requirements.txt << 'REQEOF'
requests==2.28.0
boto3==1.28.0
REQEOF

zip -j functions.zip hello.py requirements.txt

fission package create \
  --sourcearchive functions.zip \
  --env python \
  --name my-package \
  --buildcmd "pip3 install -r requirements.txt -t ."

fission function create \
  --name hello-with-deps \
  --env python \
  --pkg my-package \
  --entrypoint "hello.main"
```

## Monitoring Fission

```bash
# Check function status
fission function list

# View function logs
fission function log --name hello --follow

# Check executor pods (warm pool)
kubectl get pods -n fission | grep poolmgr
```

## Conclusion

Fission's warm pod pool approach minimizes cold start latency, making it suitable for production API workloads where response time matters. Its Kubernetes-native design integrates well with Rancher's management capabilities. Use Fission when cold start performance is a critical requirement.
