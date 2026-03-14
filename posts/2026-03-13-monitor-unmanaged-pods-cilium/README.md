# How to Monitor Unmanaged Pods in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF

Description: Learn how to detect and monitor pods that are not managed by Cilium to identify networking gaps, security policy blind spots, and CNI misconfiguration.

---

## Introduction

In a Cilium-managed cluster, every pod should have a corresponding Cilium Endpoint that tracks its networking state and enforces network policies. Pods that exist in Kubernetes but lack a Cilium Endpoint-known as "unmanaged pods"-are invisible to Cilium's policy enforcement engine and can create security blind spots.

Unmanaged pods may occur due to CNI configuration errors, node initialization failures, Cilium pod restarts, or the presence of a secondary CNI via Multus. Detecting and monitoring these gaps is essential for maintaining consistent network policy enforcement across all workloads.

This guide covers how to detect unmanaged pods using the Cilium CLI, Hubble, and Prometheus alerting.

## Prerequisites

- Cilium v1.12+ installed on Kubernetes
- `cilium` CLI installed
- `kubectl` access with cluster-admin permissions
- Hubble enabled for flow observability

## Step 1: List All Cilium Endpoints

Compare Cilium Endpoints against running pods to find unmanaged workloads.

```bash
# List all Cilium Endpoints and their state
cilium endpoint list

# Get endpoint count
cilium endpoint list | wc -l

# Show endpoints in non-ready state
cilium endpoint list | grep -v "ready"
```

## Step 2: Detect Pods Without Cilium Endpoints

Find pods that are running but do not have corresponding Cilium Endpoints.

```bash
# Get all running pod IPs
kubectl get pods -A --field-selector status.phase=Running \
  -o jsonpath='{range .items[*]}{.status.podIP}{"\n"}{end}' | sort > /tmp/pod-ips.txt

# Get all Cilium endpoint IPs
cilium endpoint list -o json | \
  jq -r '.[].status.networking.addressing[].ipv4' | sort > /tmp/cilium-eps.txt

# Find pods without Cilium endpoints
comm -23 /tmp/pod-ips.txt /tmp/cilium-eps.txt
```

## Step 3: Check Cilium Endpoint State Per Node

Investigate unmanaged pods at the node level.

```bash
# Check endpoint status on a specific node's cilium-agent pod
kubectl exec -n kube-system <cilium-pod> -- cilium endpoint list

# Check for endpoints in 'not-ready' or 'disconnected' state
kubectl exec -n kube-system <cilium-pod> -- \
  cilium endpoint list --output json | jq '.[] | select(.status.state != "ready")'

# View Cilium agent logs for endpoint creation failures
kubectl logs -n kube-system <cilium-pod> | grep -i "endpoint\|unmanaged\|failed"
```

## Step 4: Use Cilium CLI to Check for Unmanaged Pods

```bash
# Run Cilium connectivity test to check for policy gaps
cilium connectivity test --test-namespace cilium-test

# Check Cilium status for any unmanaged endpoint warnings
cilium status --output json | jq '.cilium.controllers[] | select(.status.failureCount > 0)'

# List nodes with endpoint synchronization issues
cilium status | grep -i "unmanaged\|not managed"
```

## Step 5: Prometheus Alert for Unmanaged Pods

```yaml
# prometheusrule-unmanaged-pods.yaml
# Alert when the number of Cilium endpoints is less than expected running pods
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-unmanaged-pods
  namespace: monitoring
spec:
  groups:
    - name: cilium.endpoints
      rules:
        - alert: CiliumUnmanagedPodsDetected
          expr: |
            (count(kube_pod_status_phase{phase="Running"}) -
             count(cilium_endpoint_state{endpoint_state="ready"})) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Running pods exist without corresponding Cilium endpoints"
        - alert: CiliumEndpointNotReady
          expr: |
            cilium_endpoint_state{endpoint_state!="ready"} > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Cilium endpoints in non-ready state detected on {{ $labels.instance }}"
```

## Best Practices

- Run regular reconciliation checks comparing running pods to Cilium endpoints
- Enable Cilium endpoint garbage collection to remove stale endpoints
- Monitor Cilium agent restarts as they may temporarily leave pods unmanaged
- Use strict network policies as default-deny to catch unmanaged pod traffic via policy violations
- Audit Multus secondary interface configurations to ensure Cilium manages the primary CNI

## Conclusion

Detecting and monitoring unmanaged pods in Cilium is a critical security and reliability practice. By comparing Kubernetes pod states against Cilium endpoint lists and alerting on discrepancies, you can quickly identify and remediate networking gaps. Regular endpoint audits combined with proactive alerting ensure that Cilium's network policy enforcement covers all workloads in your cluster.
