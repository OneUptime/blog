# How to Deploy Fission on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Fission, Serverless, Function, Kubernetes, Fast Cold Start

Description: Deploy Fission serverless framework on Rancher with pre-warmed pools for fast cold starts, environment management, and function routing.

## Introduction

Fission is a serverless framework for Kubernetes focused on fast function execution. Its pre-warmed pool architecture eliminates cold start latency by keeping container environments ready before functions are invoked. Fission supports Node.js, Python, Ruby, Go, PHP, and custom environments.

## Step 1: Install Fission via Helm

```bash
helm repo add fission-charts https://fission.github.io/fission-charts/
helm repo update

# Install Fission with all components

helm install fission fission-charts/fission-all \
  --namespace fission \
  --create-namespace \
  --set serviceType=ClusterIP \
  --set routerServiceType=LoadBalancer

# Verify installation
kubectl get pods -n fission
```

## Step 2: Install Fission CLI

```bash
# macOS
curl -Lo fission https://github.com/fission/fission/releases/latest/download/fission-darwin-amd64 \
  && chmod +x fission && sudo mv fission /usr/local/bin/

# Linux
curl -Lo fission https://github.com/fission/fission/releases/latest/download/fission-linux-amd64 \
  && chmod +x fission && sudo mv fission /usr/local/bin/

# Set the Fission router URL
export FISSION_ROUTER=$(kubectl get svc router -n fission -o=jsonpath='{.status.loadBalancer.ingress[0].ip}')
```

## Step 3: Create an Environment

Environments are pre-warmed container pools for each language runtime:

```bash
# Create a Node.js environment
fission environment create \
  --name nodejs \
  --image ghcr.io/fission/node-env \
  --mincpu 40 \
  --maxcpu 200 \
  --minmemory 64 \
  --maxmemory 256 \
  --poolsize 3    # Keep 3 pre-warmed pods

# Create a Python environment
fission environment create \
  --name python \
  --image ghcr.io/fission/python-env \
  --builder ghcr.io/fission/python-builder
```

## Step 4: Deploy a Function

```javascript
// hello.js
module.exports = async function(context) {
    return {
        status: 200,
        body: `Hello from Fission on Rancher! Input: ${JSON.stringify(context.request.body)}`
    };
};
```

```bash
# Deploy the function
fission function create \
  --name hello \
  --env nodejs \
  --code hello.js

# Create an HTTP trigger
fission httptrigger create \
  --url /hello \
  --function hello \
  --method GET
```

## Step 5: Test the Function

```bash
# Test the function directly
fission function test --name hello

# Call via HTTP
curl http://$FISSION_ROUTER/hello
```

## Step 6: Create a Time Trigger

```bash
# Run a function every minute
fission timetrigger create \
  --name cleanup-trigger \
  --function cleanup \
  --cron "*/1 * * * *"
```

## Step 7: Create a Message Queue Trigger

```bash
# Trigger function on Kafka message
fission mqtrigger create \
  --name order-processor \
  --function process-order \
  --mqtype kafka \
  --topic orders \
  --resptopic order-results \
  --maxretries 3
```

## Conclusion

Fission on Rancher provides serverless function execution with minimal cold start latency through pre-warmed environments. The poolsize configuration balances resource cost against startup time. For latency-sensitive workloads, keep at least 2-3 pool instances warmed up in the environment configuration.
