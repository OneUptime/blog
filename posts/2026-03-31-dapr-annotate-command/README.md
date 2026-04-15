# How to Use the dapr annotate Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Kubernetes, Annotation, Sidecar

Description: Learn how to use the dapr annotate command to inject Dapr sidecar annotations into Kubernetes manifest files without editing them manually.

---

## Overview

The `dapr annotate` command adds Dapr annotations to Kubernetes manifest files including Deployments, StatefulSets, Pods, ReplicaSets, DaemonSets, CronJobs, Jobs, and Lists. Instead of manually writing `dapr.io/enabled: "true"` and related annotations, `dapr annotate` lets you inject them from the command line, which is useful in CI/CD pipelines and GitOps workflows.

> **Note:** The `-k` (or `--kubernetes`) flag is required for all `dapr annotate` commands. The command writes the annotated manifest to stdout rather than modifying files in place.

## Basic Usage

Annotate a Kubernetes Deployment manifest and print the result to stdout:

```bash
dapr annotate -k deployment.yaml
```

This adds the minimal required annotations. When no `--app-id` is provided, Dapr auto-generates one using the format `<namespace>-<kind>-<name>`:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "default-deployment-order-service"
```

## Setting the App ID

```bash
dapr annotate -k deployment.yaml \
              --app-id order-service
```

This adds `dapr.io/app-id: "order-service"` to the deployment.

## Specifying App Port and Protocol

```bash
dapr annotate -k deployment.yaml \
              --app-id order-service \
              --app-port 8080 \
              --app-protocol http
```

Resulting annotations:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/app-port: "8080"
  dapr.io/app-protocol: "http"
```

## Attaching a Dapr Configuration

```bash
dapr annotate -k deployment.yaml \
              --app-id order-service \
              --config production-config
```

## Setting CPU and Memory Limits

```bash
dapr annotate -k deployment.yaml \
              --app-id order-service \
              --cpu-request "100m" \
              --cpu-limit "300m" \
              --memory-request "64Mi" \
              --memory-limit "256Mi"
```

## Enabling API Logging

```bash
dapr annotate -k deployment.yaml \
              --app-id order-service \
              --enable-api-logging
```

## Using in a CI/CD Pipeline

Inject annotations during the build step before applying to Kubernetes:

```bash
#!/bin/bash
APP_ID="order-service"
APP_PORT="8080"

# Annotate the manifest and apply to cluster
dapr annotate -k ./k8s/deployment.yaml \
              --app-id $APP_ID \
              --app-port $APP_PORT \
              --config production-config | \
  kubectl apply -f -
```

## Reading from stdin

Pipe a manifest through `dapr annotate`:

```bash
kubectl get deployment order-service -o yaml | \
  dapr annotate -k - --app-id order-service | \
  kubectl apply -f -
```

## Full Example Manifest After Annotation

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/app-protocol: "http"
        dapr.io/config: "production-config"
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-memory-request: "64Mi"
```

## Summary

`dapr annotate` eliminates manual annotation editing from your Kubernetes manifests and makes Dapr sidecar configuration reproducible and scriptable. It is especially valuable in CI/CD pipelines where manifests are generated or fetched dynamically before deployment.
