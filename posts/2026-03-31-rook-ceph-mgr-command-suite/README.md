# How to Use the ceph mgr Command Suite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CLI, Manager, MGR, Module, Operation

Description: Use the ceph mgr commands to manage Ceph Manager modules, check daemon health, and enable monitoring and dashboard features.

---

## Introduction

The Ceph Manager (MGR) daemon runs alongside monitors and provides additional cluster management functionality through a module system. Modules provide features like the dashboard, Prometheus metrics, and the balancer. The `ceph mgr` command suite manages these modules and daemon operations.

## Checking MGR Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Basic manager status
ceph mgr stat

# Detailed manager dump
ceph mgr dump
```

Example `mgr stat` output:

```json
{
  "epoch": 14,
  "available": true,
  "active_name": "a",
  "num_standby": 1
}
```

## Listing Available Modules

```bash
# List all modules with enabled/disabled status
ceph mgr module ls
```

Output shows `always_on_modules`, `enabled_modules`, and `disabled_modules` sections.

## Enabling and Disabling Modules

```bash
# Enable the Prometheus metrics module
ceph mgr module enable prometheus

# Enable the dashboard
ceph mgr module enable dashboard

# Enable the balancer
ceph mgr module enable balancer

# Disable a module
ceph mgr module disable iostat
```

## Configuring the Dashboard Module

```bash
# Set dashboard credentials
ceph dashboard ac-user-create admin -i /tmp/password administrator

# Check dashboard URL
ceph mgr services
```

## Configuring Prometheus Metrics

```bash
# After enabling the prometheus module
ceph mgr module enable prometheus

# Check the metrics endpoint
ceph mgr services | python3 -m json.tool
```

In Rook, the Prometheus endpoint is automatically exposed:

```yaml
# In CephCluster spec
monitoring:
  enabled: true
```

Create a ServiceMonitor for Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
spec:
  endpoints:
  - port: http-metrics
  selector:
    matchLabels:
      app: rook-ceph-mgr
```

## Balancer Module

```bash
# Enable and configure the balancer
ceph mgr module enable balancer
ceph balancer mode upmap
ceph balancer on

# Check balancer status
ceph balancer status

# Generate a balancing plan without applying
ceph balancer eval
ceph balancer optimize myplan
ceph balancer show myplan
```

Apply the plan:

```bash
ceph balancer execute myplan
```

## Failing an MGR for Standby Promotion

```bash
# Force a failover to standby
ceph mgr fail a
ceph mgr stat  # Verify standby is now active
```

## Checking Module Logs

```bash
kubectl -n rook-ceph logs rook-ceph-mgr-a-<pod-id> | grep -i "prometheus\|balancer\|dashboard"
```

## Summary

The Ceph MGR command suite manages the manager daemon and its module ecosystem. Enabling key modules like Prometheus, the balancer, and the dashboard extends cluster functionality without requiring daemon restarts. In Rook environments, modules like Prometheus are configured via the CephCluster spec, while the CLI provides direct control for advanced tuning and emergency failover operations.
