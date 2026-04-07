# How to Set Cluster Management Timeouts in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, Timeout, Operator

Description: Configure operator timeout values in the Rook-Ceph Helm chart to control how long the operator waits for cluster operations before taking corrective action.

---

## Overview

The Rook-Ceph operator uses several internal timeouts to decide when a node or component is truly unreachable versus temporarily slow. Misconfigured timeouts can cause premature OSD removal or delayed failover responses. The Helm chart exposes these as configurable values.

## Key Timeout Settings

### Unreachable Node Tolerance

Controls how long the operator waits before treating a node as permanently failed:

```yaml
unreachableNodeTolerationSeconds: 5
```

The default is 5 seconds. This is deliberately short - increase it in environments with intermittent network partitions to avoid unnecessary OSD replacement:

```yaml
unreachableNodeTolerationSeconds: 30
```

## CephCluster-Level Timeouts

Beyond Helm values, several timeouts are set in the `CephCluster` CR rather than the operator chart:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  healthCheck:
    daemonHealth:
      mon:
        disabled: false
        interval: 45s
      osd:
        disabled: false
        interval: 60s
      status:
        disabled: false
        interval: 60s
    livenessProbe:
      mon:
        probe:
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 30
          failureThreshold: 3
```

## Applying Helm Timeout Values

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set unreachableNodeTolerationSeconds=30
```

## Viewing Operator Environment Variables

The operator timeout values are passed as environment variables to the operator pod. Verify them:

```bash
kubectl exec -n rook-ceph \
  deploy/rook-ceph-operator -- \
  env | grep -i timeout
```

## Tuning for Different Environments

**High-latency WAN cluster:**
```yaml
unreachableNodeTolerationSeconds: 120
```

**On-premises fast network:**
```yaml
unreachableNodeTolerationSeconds: 5
```

**Cloud provider with spot/preemptible nodes:**
```yaml
unreachableNodeTolerationSeconds: 60
```

Use longer tolerations on cloud environments where spot instance termination may briefly appear as a network failure before the actual node drain occurs.

## Monitor Timeout Handling

If monitors lose quorum due to a node going unreachable, the timeout determines how quickly the operator attempts to place a new monitor:

```bash
kubectl get events -n rook-ceph | grep -i monitor
```

Events showing monitor replacement attempts indicate the unreachable tolerance was reached.

## Summary

Timeout settings in the Rook Helm chart control how aggressively the operator responds to unreachable nodes. Increase `unreachableNodeTolerationSeconds` for environments with transient connectivity issues, and tune CephCluster health check intervals to match your infrastructure's expected response characteristics.
