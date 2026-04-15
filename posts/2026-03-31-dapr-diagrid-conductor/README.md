# How to Use Dapr with Diagrid Conductor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Diagrid, Conductor, Management, Platform

Description: Use Diagrid Conductor to manage, monitor, and operate Dapr deployments across multiple Kubernetes clusters with a centralized control plane.

---

## Overview

Diagrid Conductor is a managed Dapr operations platform from the creators of Dapr at Diagrid. It provides automated Dapr installation and upgrades, zero-downtime mTLS certificate rotation, observability with 150+ metrics, best-practice advisories, and multi-cluster management for Dapr deployments running across one or more Kubernetes clusters.

## Prerequisites

- Diagrid account (sign up at diagrid.ws/conductor-trial)
- `diagrid` CLI installed
- One or more Kubernetes clusters
- Dapr installed or installable on target clusters

## Installing the Diagrid CLI

```bash
# macOS/Linux
curl -o- https://downloads.diagrid.io/cli/install.sh | bash
sudo mv ./diagrid /usr/local/bin

# Verify installation
diagrid version
```

## Connecting a Cluster to Conductor

```bash
# Login to Diagrid
diagrid login

# Connect a Kubernetes cluster
diagrid clusters connect --name my-cluster
```

Conductor installs a lightweight agent in the cluster:

```bash
# Verify the agent is running
kubectl get pods -n diagrid-cloud
```

## Deploying Dapr Apps with Conductor

Conductor automatically discovers Dapr-enabled applications running in connected clusters. Deploy your application with standard Dapr annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 1
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
        dapr.io/log-level: "info"
    spec:
      containers:
      - name: order-service
        image: my-registry/order-service:latest
        ports:
        - containerPort: 8080
```

Apply via kubectl and monitor in the Conductor console:

```bash
kubectl apply -f order-service.yaml

# Open the Conductor web console to view discovered apps
diagrid web
```

## Managing Components with Conductor

Dapr components are managed using standard Kubernetes Dapr component YAMLs. Conductor monitors and provides visibility into these components across clusters:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    value: "secret"
```

```bash
# Apply the component via kubectl
kubectl apply -f statestore.yaml

# View components and their status in the Conductor console
diagrid web
```

## Monitoring with Conductor Dashboard

View real-time metrics in the Conductor web console:

```bash
# Open the Conductor web console
diagrid web
```

Conductor provides over 150 built-in metrics, an Apps Graph for visualizing service dependencies, and Grafana integration for custom dashboards. Metrics such as `dapr_http_server_request_count` can be explored through the console or via the Grafana integration.

## Conductor API for Automation

Integrate Conductor into CI/CD pipelines using API keys and the CLI:

```bash
# Generate an API key for CI/CD use
diagrid apikey create --name ci-pipeline

# Print an access token for API calls
diagrid auth print-access-token
```

You can also manage clusters programmatically using the Diagrid CLI in non-interactive mode:

```bash
# Connect a cluster in a CI/CD pipeline
diagrid clusters connect --name staging-cluster

# Run diagnostics on a connected cluster
diagrid diagnose --name staging-cluster
```

## Summary

Diagrid Conductor simplifies Dapr fleet management with automated Dapr installation and upgrades, zero-downtime mTLS certificate rotation, real-time monitoring, and multi-cluster observability. By moving Dapr operational concerns into Conductor, teams spend less time managing Dapr infrastructure and more time building business logic with Dapr's building blocks.
