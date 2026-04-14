# How to Handle Dapr Performance at Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scale, Performance, Cluster, Optimization

Description: Learn how to handle Dapr performance challenges when operating hundreds of services at scale, including control plane tuning and component optimization.

---

## Overview

At scale - hundreds of services and thousands of pods - Dapr's control plane components (Sentry, Placement, Operator) themselves become performance concerns. This guide addresses control plane scaling, component connection pooling, and cluster-wide optimization strategies.

## Scaling the Dapr Control Plane

Scale the Dapr Operator for faster component reconciliation:

```bash
kubectl scale deployment dapr-operator \
  --replicas=3 \
  -n dapr-system
```

Scale the Dapr Sentry for faster certificate issuance:

```bash
kubectl scale deployment dapr-sentry \
  --replicas=3 \
  -n dapr-system
```

## Tuning the Placement Service for Actors

For large actor deployments, enable high availability for the Placement service:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_placement.ha=true \
  --set dapr_placement.logLevel=warn
```

## Namespace Isolation for Large Clusters

Separate performance-critical services into dedicated namespaces with their own Dapr configurations:

```bash
# Create isolated namespace
kubectl create namespace payments-prod
kubectl label namespace payments-prod dapr.io/enabled=true

# Deploy namespace-specific components
kubectl apply -f payments-components/ -n payments-prod
```

## Enable the Injector Watchdog for Reliable Sidecar Injection

The Dapr Operator includes an injector watchdog that periodically polls all pods to confirm sidecar injection succeeded. This is useful at scale where occasional injection failures can occur. It is disabled by default:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_operator.watchInterval=60s   # Default is 0 (disabled)
```

## Connection Pool Sizing for High-Pod-Count Clusters

Configure state store connection pools to handle many sidecars:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: poolSize
    value: "200"    # Max connections per sidecar (each pod gets its own pool)
  - name: maxRetries
    value: "3"
```

## mTLS Certificate Management at Scale

Monitor certificate issuance rates at scale:

```bash
# Check Sentry metrics
kubectl port-forward svc/dapr-sentry 9090:9090 -n dapr-system
# Query: dapr_sentry_cert_sign_request_received_total
```

Ensure Sentry has enough resources:

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "256Mi"
  limits:
    cpu: "2000m"
    memory: "1Gi"
```

## Audit Cluster-Wide Dapr Resource Usage

```bash
# Total sidecar resource usage across entire cluster
kubectl top pods --containers -A | \
  awk '/daprd/ {cpu+=$3; mem+=$4; count++} \
  END {printf "Sidecars: %d, CPU: %sm, Memory: %sMi\n", count, cpu, mem}'
```

## Summary

At scale, Dapr performance depends on both per-service optimizations and control plane capacity. Scale the Operator, Sentry, and Placement services to handle large cluster sizes, enable the injector watchdog for reliable sidecar injection, configure state store connection pools to handle many concurrent sidecar connections, and use namespace isolation to prevent noisy-neighbor effects between service domains.
