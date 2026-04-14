# How to Install Dapr on KiND (Kubernetes in Docker)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kind, Kubernetes, Installation, Local Development

Description: Install Dapr on a KiND (Kubernetes in Docker) cluster for fast local development and CI pipeline testing of Dapr-enabled microservices.

---

## Prerequisites

Install KiND and Dapr CLI:

```bash
# Install KiND
go install sigs.k8s.io/kind@v0.31.0
# Or with brew on macOS
brew install kind

# Install Dapr CLI
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Verify
kind version
dapr --version
```

## Create a KiND Cluster

Create a multi-node KiND cluster with a configuration file:

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
```

```bash
kind create cluster --name dapr-dev --config kind-config.yaml --wait 5m

# Set kubectl context
kubectl cluster-info --context kind-dapr-dev
```

## Install Dapr on KiND

```bash
dapr init --kubernetes --wait

# Verify all control plane pods are running
kubectl get pods -n dapr-system -w
```

Expected output once stable:

```bash
NAME                                     READY   STATUS    RESTARTS   AGE
dapr-operator-6f7bb9f4d9-m2v9p          1/1     Running   0          90s
dapr-placement-server-0                  1/1     Running   0          90s
dapr-sentry-7f6c4bcfb6-qrwzn            1/1     Running   0          90s
dapr-sidecar-injector-678976ccd-vn8kp   1/1     Running   0          90s
```

## Load Local Images into KiND

A key advantage of KiND for development is loading local container images without a registry:

```bash
# Build your application image
docker build -t myapp:dev .

# Load into KiND cluster
kind load docker-image myapp:dev --name dapr-dev

# Use imagePullPolicy: Never in your deployment
```

```yaml
# deployment.yaml
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "myapp"
        dapr.io/app-port: "3000"
    spec:
      containers:
      - name: myapp
        image: myapp:dev
        imagePullPolicy: Never
```

## Using KiND in CI Pipelines

```yaml
# .github/workflows/integration-test.yaml
- name: Create KiND cluster
  uses: helm/kind-action@v1.14.0
  with:
    cluster_name: dapr-test

- name: Install Dapr
  run: |
    dapr init --kubernetes --wait
    dapr status -k
```

## Cleanup

```bash
kind delete cluster --name dapr-dev
```

## Summary

KiND provides a lightweight, Docker-based Kubernetes environment ideal for local Dapr development and CI pipelines. Loading local images directly into the cluster eliminates the need for a container registry during development. Use multi-node KiND configurations to test Dapr component scheduling and replica behavior.
