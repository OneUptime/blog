# How to Use the dapr init Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Installation, Kubernetes, Self-Hosted

Description: Learn how to use the dapr init command to install and initialize Dapr in self-hosted mode and on Kubernetes clusters.

---

## Overview

The `dapr init` command is the first command you run when setting up Dapr. It installs the Dapr runtime, creates default component configurations, and sets up the control plane - either locally for development or on a Kubernetes cluster for production.

## Installing for Self-Hosted Development

The simplest form initializes Dapr locally, pulling Docker images and creating default Redis and Zipkin containers:

```bash
dapr init
```

This installs:
- The Dapr sidecar binary
- A Redis container for state and pub/sub
- A Zipkin container for distributed tracing
- A placement service container for actor support
- A scheduler service container for job scheduling
- Default component YAML files in `~/.dapr/components/`

## Specifying a Dapr Version

Pin a specific version to ensure consistency across your team:

```bash
dapr init --runtime-version 1.13.0
```

## Slim Mode (No Docker)

Use slim mode when Docker is not available, such as in CI environments:

```bash
dapr init --slim
```

Slim mode installs the sidecar binaries without spinning up any Docker containers (no Redis, Zipkin, placement, or scheduler). Default configuration files are not created, so you must supply your own component configurations.

## Kubernetes Installation

Install Dapr on a Kubernetes cluster with:

```bash
dapr init --kubernetes --wait
```

The `--wait` flag blocks until all control plane pods are running. Verify the installation:

```bash
kubectl get pods -n dapr-system
```

Expected output:

```text
NAME                                     READY   STATUS    RESTARTS
dapr-operator-7d7d8d6c9b-xyz34           1/1     Running   0
dapr-placement-server-0                  1/1     Running   0
dapr-scheduler-server-0                  1/1     Running   0
dapr-sentry-6f5b9c7d8-def56             1/1     Running   0
dapr-sidecar-injector-8b9c7d5f6-ghi78   1/1     Running   0
```

## Installing into a Specific Namespace

```bash
dapr init --kubernetes --namespace my-dapr-system --wait
```

## Using a Private Registry

When your environment does not have public internet access:

```bash
dapr init --image-registry myregistry.example.com/dapr \
          --kubernetes \
          --wait
```

## Checking After Init

After initialization, confirm the CLI and runtime match:

```bash
dapr version
```

```text
CLI version: 1.13.0
Runtime version: 1.13.0
```

## Summary

`dapr init` sets up the full Dapr runtime for both local development and Kubernetes deployments. Self-hosted mode spins up helper containers automatically, while Kubernetes mode installs the control plane components. Use `--slim` for CI environments and `--wait` to ensure Kubernetes pods are ready before running workloads.
