# How to Use Telepresence with Rancher Clusters - With Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Telepresence, Developer Experience, Kubernetes, Local Development, Debugging

Description: Use Telepresence to intercept traffic from a Rancher cluster service to your local machine, enabling fast development and debugging against real cluster dependencies.

## Introduction

Telepresence creates a two-way proxy between your local machine and a Rancher-managed Kubernetes cluster. You can run your service locally while it accesses all cluster services (databases, APIs, message queues) as if running inside the cluster. Incoming traffic to the cluster service can be intercepted and redirected to your local process.

## Prerequisites

- Rancher cluster with `kubectl` access
- Telepresence CLI installed locally
- Cluster admin permissions (for initial setup)

## Step 1: Install Telepresence

```bash
# macOS

brew install telepresenceio/telepresence/telepresence-oss

# Linux
sudo curl -fL https://github.com/telepresenceio/telepresence/releases/latest/download/telepresence-linux-amd64 \
  -o /usr/local/bin/telepresence
sudo chmod a+x /usr/local/bin/telepresence
```

## Step 2: Install the Traffic Manager in the Cluster

The Traffic Manager is a cluster-side component that manages intercepts:

```bash
# Install the Traffic Manager in your Rancher cluster
telepresence helm install --kubeconfig ~/.kube/rancher-production.yaml

# Verify the Traffic Manager is running
kubectl --kubeconfig ~/.kube/rancher-production.yaml get pods -n ambassador
```

## Step 3: Connect to the Cluster

```bash
# Connect your laptop to the cluster network
telepresence connect --kubeconfig ~/.kube/rancher-production.yaml

# Verify connectivity
telepresence status

# You can now resolve cluster DNS from your laptop
curl http://myapi.production.svc.cluster.local:8080/health
```

## Step 4: Intercept a Service

Intercept redirects all or a portion of a service's traffic to your local process:

```bash
# Intercept all traffic to the 'order-service' in the cluster
telepresence intercept order-service \
  --namespace production \
  --port 8080:8080    # local-port:service-port
```

Traffic to `order-service.production.svc.cluster.local` now hits your local port 8080.

## Step 5: Personal Intercepts (Partial Traffic)

For environments with real production traffic, use header-based routing to intercept only your requests:

```bash
# Intercept only requests with a specific header
telepresence intercept order-service \
  --namespace production \
  --port 8080:8080 \
  --http-header "x-developer=nawazdhandala"    # Only intercept matching requests

# Send a test request targeting your intercept
curl -H "x-developer: nawazdhandala" \
  http://myapp.example.com/orders
```

## Step 6: Develop and Debug Locally

While the intercept is active, run your service locally:

```bash
# Run the service locally with your IDE debugger attached
# Export the settings your local process needs
export DB_HOST=postgres.production.svc.cluster.local   # Cluster DNS resolves locally!
export REDIS_URL=redis://redis.production.svc.cluster.local:6379

node server.js --inspect    # Attach VS Code debugger
```

## Step 7: Leave and Clean Up

```bash
# Stop the intercept
telepresence leave order-service

# Disconnect from the cluster
telepresence quit
```

## Conclusion

Telepresence transforms the Kubernetes development experience by eliminating the image build/push/deploy loop for iterative changes. Development against real cluster dependencies eliminates environment-specific bugs, and personal intercepts allow simultaneous development by multiple engineers on the same cluster.
