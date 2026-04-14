# How to Use the dapr logs Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Logging, Debugging, Kubernetes

Description: Learn how to use the dapr logs command to fetch and stream Dapr sidecar logs for a running application in Kubernetes.

---

## Overview

The `dapr logs` command retrieves logs from the Dapr sidecar container of a running application. Unlike `kubectl logs`, it targets the Dapr sidecar specifically, filtering out your application container logs so you can focus on what the Dapr runtime is doing.

## Basic Usage in Kubernetes

Fetch recent sidecar logs for a specific app:

```bash
dapr logs --app-id order-service --kubernetes
```

Sample output:

```text
time="2026-03-31T10:00:01Z" level=info msg="starting Dapr Runtime -- version 1.13.0"
time="2026-03-31T10:00:01Z" level=info msg="log level set to: info"
time="2026-03-31T10:00:02Z" level=info msg="app max concurrency set to unlimited"
time="2026-03-31T10:00:03Z" level=info msg="component loaded. name: statestore, type: state.redis/v1"
time="2026-03-31T10:00:03Z" level=info msg="dapr initialized. Status: Running."
```

## Specifying a Namespace

```bash
dapr logs --app-id order-service \
          --kubernetes \
          --namespace production
```

## Targeting a Specific Pod

When multiple replicas are running, target a specific pod:

```bash
dapr logs --app-id order-service \
          --kubernetes \
          --pod-name order-service-7d8b9c6f5-abc12
```

## Tailing Logs in Real Time

The `dapr logs` command does not support a follow/streaming mode. To tail Dapr sidecar logs in real time, use `kubectl logs` and target the `daprd` container directly:

```bash
kubectl logs deployment/order-service -c daprd -n default --follow
```

Press `Ctrl+C` to stop following.

## Filtering by Time Window

The `dapr logs` command does not support time-based filtering. To fetch Dapr sidecar logs within a specific time window, use `kubectl logs` targeting the `daprd` container:

Fetch logs from the last 30 minutes:

```bash
kubectl logs deployment/order-service -c daprd -n default --since=30m
```

Or since a specific timestamp:

```bash
kubectl logs deployment/order-service -c daprd -n default --since-time="2026-03-31T09:30:00Z"
```

## Diagnosing Component Load Failures

When a component fails to load, the sidecar logs show the error clearly:

```text
level=error msg="error loading component. name: statestore, type: state.redis"
level=error msg="dial tcp: connection refused"
```

Use this to distinguish between application bugs and infrastructure connectivity issues.

## Comparing Sidecar vs Application Logs

```bash
# Dapr sidecar logs
dapr logs --app-id my-service --kubernetes

# Application container logs
kubectl logs deployment/my-service -c my-service -n default
```

## Combining with grep for Errors

```bash
dapr logs --app-id order-service --kubernetes 2>&1 | grep -i error
```

## Summary

`dapr logs` provides direct access to Dapr sidecar logs without navigating Kubernetes pod names and container selectors. It is the fastest way to diagnose component initialization failures, mTLS handshake errors, and sidecar startup issues. For real-time log tailing during incident investigation, use `kubectl logs` with `--follow` targeting the `daprd` container.
