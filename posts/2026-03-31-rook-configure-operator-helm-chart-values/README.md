# How to Configure the Rook-Ceph Operator Helm Chart Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, Operator, Configuration

Description: A practical guide to customizing Rook-Ceph operator Helm chart values to control operator behavior, image settings, and resource allocation.

---

## Overview

The Rook-Ceph operator Helm chart (`rook-ceph`) provides extensive configuration through its `values.yaml`. Understanding the key settings helps you tailor the operator for different environments from development to production.

## Inspecting Default Values

Before customizing, review all available defaults:

```bash
helm show values rook-release/rook-ceph > rook-operator-defaults.yaml
```

This gives you the full reference for every configurable parameter.

## Creating a Custom Values File

Rather than modifying the chart directly, maintain a separate values override file:

```yaml
# rook-operator-values.yaml

# Image configuration
image:
  repository: rook/ceph
  tag: v1.13.0
  pullPolicy: IfNotPresent

# Operator log level: DEBUG, INFO, WARNING, ERROR
logLevel: INFO

# Resource requests and limits
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

# Tolerations for the operator pod
tolerations:
  - key: node-role.kubernetes.io/control-plane
    operator: Exists
    effect: NoSchedule

# Node selector
nodeSelector:
  kubernetes.io/os: linux

```

## Installing with Custom Values

Pass the values file during installation:

```bash
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  -f rook-operator-values.yaml
```

Or upgrade an existing installation:

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f rook-operator-values.yaml
```

## Key Configuration Sections

### Monitoring

Enable Prometheus metrics scraping for the operator:

```yaml
monitoring:
  enabled: true
```

### Unreachable Node Tolerance

Control how long the operator waits before acting on an unreachable node:

```yaml
unreachableNodeTolerationSeconds: 5
```

### RBAC Settings

The chart creates RBAC resources by default. To disable if managing RBAC externally:

```yaml
rbacEnable: false
```

## Verifying Applied Configuration

After applying custom values, check the operator deployment to confirm settings took effect:

```bash
kubectl get deployment rook-ceph-operator -n rook-ceph -o yaml | grep -A5 resources
```

Check current Helm values in use:

```bash
helm get values rook-ceph -n rook-ceph
```

## Summary

Configuring the Rook-Ceph operator Helm chart through a dedicated values file keeps customizations version-controlled and reproducible. Focus on image versions, resource limits, node placement, and monitoring toggles as the primary levers for adapting the operator to your cluster environment.
