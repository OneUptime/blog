# How to Configure Dapr Arguments and Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Flag, Configuration, Sidecar

Description: Learn how to configure Dapr sidecar behavior using CLI flags and Kubernetes annotations for ports, protocols, components paths, and logging.

---

## Overview

The Dapr sidecar (daprd) accepts a rich set of command-line flags that control its runtime behavior. Understanding these flags helps you tune sidecar startup, component loading, network settings, and observability both locally and in Kubernetes.

## Key daprd Flags

| Flag | Annotation Equivalent | Description |
|---|---|---|
| `--app-id` | `dapr.io/app-id` | Unique application identifier |
| `--app-port` | `dapr.io/app-port` | Port your app listens on |
| `--app-protocol` | `dapr.io/app-protocol` | `http`, `https`, `grpc`, `grpcs`, or `h2c` |
| `--dapr-http-port` | N/A | Sidecar HTTP API port |
| `--dapr-grpc-port` | `dapr.io/grpc-port` | Sidecar gRPC API port |
| `--resources-path` | N/A | Directory for component YAMLs |
| `--config` | `dapr.io/config` | Configuration file or resource |
| `--log-level` | `dapr.io/log-level` | Log verbosity |
| `--enable-metrics` | N/A | Enable Prometheus metrics |

## Running daprd Directly

For advanced local testing, run daprd directly with explicit flags:

```bash
daprd \
  --app-id myservice \
  --app-port 8080 \
  --app-protocol http \
  --dapr-http-port 3500 \
  --dapr-grpc-port 50001 \
  --resources-path ./components \
  --config ./config.yaml \
  --log-level debug \
  --enable-metrics true \
  --metrics-port 9090
```

## Using the Dapr CLI (Recommended for Development)

The Dapr CLI wraps daprd flags for easier use:

```bash
dapr run \
  --app-id myservice \
  --app-port 8080 \
  --app-protocol http \
  --dapr-http-port 3500 \
  --resources-path ./components \
  --config ./config.yaml \
  --log-level debug \
  -- python app.py
```

## Passing Extra Arguments in Kubernetes

Use Dapr annotations on your pod spec to configure the sidecar:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myservice"
  dapr.io/app-port: "8080"
```

For flags not exposed as annotations, customize the Dapr deployment via the Helm chart:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_operator.watchInterval=30s
```

## Component Path Configuration

In self-hosted mode, specify where Dapr looks for component files:

```bash
dapr run --app-id myservice \
  --resources-path /etc/dapr/components \
  --app-port 8080 \
  -- ./myservice
```

Structure your components directory:

```bash
mkdir -p /etc/dapr/components
# Place state store, pubsub, binding YAML files here
ls /etc/dapr/components/
# statestore.yaml  pubsub.yaml  binding.yaml
```

## Viewing All Available Flags

To see all available daprd flags:

```bash
daprd --help
```

Or list flags for the Dapr CLI run command:

```bash
dapr run --help
```

## Summary

Dapr's CLI flags and Kubernetes annotations give you comprehensive control over sidecar behavior. Use `dapr run` flags for local development, pod annotations for Kubernetes deployments, and direct daprd invocation when you need flags not exposed through annotations. Always document which flags your service relies on in your deployment manifests.
