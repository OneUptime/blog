# How to Use Telepresence with Rancher Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Telepresence, Development, Inner Loop

Description: Use Telepresence with Rancher to run microservices locally while connecting them to your remote Kubernetes cluster for realistic development and debugging.

## Introduction

Telepresence allows you to run a single service locally while connecting it to a remote Rancher Kubernetes cluster. Your local service can make calls to and receive calls from other services in the cluster as if it were running there. This provides a realistic development environment without needing to build and push container images for every code change.

## Prerequisites

- Telepresence CLI installed
- kubectl configured for your Rancher cluster
- Cluster admin access to install the Traffic Manager, or an existing Telepresence installation in the cluster
- A local development environment

## Step 1: Install Telepresence

```bash
# macOS

brew install telepresenceio/homebrew-telepresence/telepresence-oss

# Linux
sudo curl -fL https://github.com/telepresenceio/telepresence/releases/latest/download/telepresence-linux-amd64 \
  -o /usr/local/bin/telepresence
sudo chmod +x /usr/local/bin/telepresence

# Verify
telepresence version
```

## Step 2: Connect to Your Rancher Cluster

```bash
# Install the Traffic Manager once per cluster if it is not already installed
telepresence helm install

# Connect Telepresence to your cluster
telepresence connect

# Verify connection
telepresence status

# List intercept-able services
telepresence list --namespace production
```

## Step 3: Intercept a Service

```bash
# Full intercept: all traffic to the service goes to your local process
telepresence intercept my-service \
  --namespace production \
  --port 3000:3000

# Now run your service locally
python src/main.py
# or
node server.js
# or
go run main.go

# Your local service now receives all traffic destined for my-service in the cluster
```

## Step 4: Personal Intercepts (Multi-Developer)

Personal intercepts only route traffic with specific headers to your local service:

```bash
# Intercept only requests with a specific header
telepresence intercept my-service \
  --namespace production \
  --port 3000:3000 \
  --http-header x-developer=alice

# Now, requests with the header 'x-developer: alice' go to your local service
# All other requests continue to the in-cluster service

# Test your intercept
curl -H "x-developer: alice" http://my-service.production.svc.cluster.local:3000/api/orders
```

## Step 5: Access Cluster Services from Local Machine

Once connected, you can access cluster services directly using the right protocol/client:

```bash
# HTTP services
curl http://my-service.production.svc.cluster.local:3000/api/health

# Raw TCP connectivity to databases and brokers
python -c "import socket; socket.create_connection(('postgresql.databases.svc.cluster.local', 5432), 5); print('PostgreSQL reachable')"
python -c "import socket; socket.create_connection(('redis.databases.svc.cluster.local', 6379), 5); print('Redis reachable')"
python -c "import socket; socket.create_connection(('kafka.kafka.svc.cluster.local', 9092), 5); print('Kafka reachable')"

# Use cluster DNS
nslookup my-service.production.svc.cluster.local
```

## Step 6: Configure Environment Variables for Local Service

```bash
# Get environment variables from a running pod
telepresence intercept my-service \
  --namespace production \
  --port 3000 \
  --env-syntax sh:export \
  --env-file /tmp/my-service.env

# Load the environment and start your service
source /tmp/my-service.env
node server.js

# Or use docker with the env file
docker run --rm \
  --env-file /tmp/my-service.env \
  -p 3000:3000 \
  my-app:dev
```

## Step 7: Mount Cluster Volumes Locally

```bash
# Mount config volumes from the pod to your local filesystem
telepresence intercept my-service \
  --namespace production \
  --port 3000 \
  --mount /tmp/cluster-volumes

# Access cluster ConfigMaps and secrets locally
ls /tmp/cluster-volumes/var/run/secrets/kubernetes.io/
find /tmp/cluster-volumes -maxdepth 3 -type f | head
```

## Step 8: Debug with a Remote Shell

```bash
# Use your local shell with Telepresence networking
telepresence connect
curl http://my-service.production:3000/api/health

# Or use a debug pod if you want a shell inside the cluster
kubectl run debug-pod --rm -it \
  --namespace production \
  --image=python:3.11 \
  -- bash

# From inside the debug pod, you can reach all cluster services
curl http://my-service:3000/api/health
python -c "import socket; socket.create_connection(('postgresql.databases', 5432), 5); print('Connected to PostgreSQL')"
```

## Step 9: Disconnect and Cleanup

```bash
# Leave the intercept (restore original service)
telepresence leave my-service

# Disconnect from the cluster and stop local Telepresence daemons
telepresence quit -s

# Uninstall Traffic Manager from cluster (optional)
telepresence helm uninstall
```

## Step 10: Configure Telepresence for Team Use

```yaml
# config.yml - Team configuration

intercept:
  defaultPort: 8080

cluster:
  mappedNamespaces:
    - production
    - databases

grpc:
  maxReceiveSize: 256Mi
```

## Troubleshooting

```bash
# Check Telepresence Traffic Manager status
# Replace ambassador if your Traffic Manager is installed in another namespace
kubectl get deployment -n ambassador traffic-manager

# Check Telepresence logs
telepresence loglevel DEBUG
kubectl logs -n ambassador deployment/traffic-manager

# Reset stuck connection
telepresence quit -s  # Quit daemon
telepresence connect   # Reconnect

# Check intercept status
telepresence list -n production
```

## Conclusion

Telepresence revolutionizes the Kubernetes development workflow by eliminating the build-push-deploy cycle for iterative development. The ability to run a service locally while fully integrated with the remote Rancher cluster means you can use your usual local reload and debugging tools while still having realistic access to cluster services, databases, and configuration. Personal intercepts are particularly valuable for teams, allowing multiple developers to test their changes simultaneously without interfering with each other.
