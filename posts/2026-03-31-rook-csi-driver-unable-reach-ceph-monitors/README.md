# How to Troubleshoot CSI Driver Unable to Reach Ceph Monitors in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, Monitor, Networking

Description: Diagnose and fix CSI driver connectivity failures to Ceph monitors in Rook-Ceph, including network policy, DNS, and monitor address issues.

---

## Overview

When the Rook-Ceph CSI driver cannot reach Ceph monitors, all volume operations fail. PVCs stay Pending, pods fail to mount volumes, and CSI logs show connection timeout or refused errors. This is a network-layer problem that requires systematic diagnosis.

## Identifying Monitor Connectivity Issues

Check CSI provisioner logs for connection errors:

```bash
kubectl logs -n rook-ceph \
  -l app=csi-rbdplugin-provisioner \
  -c csi-rbdplugin | grep -i "monitor\|connection\|refused\|timeout"
```

Common error messages:

```text
WARN admin op failed, will be retried: ms/async: connect failed
error connecting to monitor
```

Get the current monitor addresses:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph mon dump | grep -E "^[0-9]"
```

## Testing Monitor Reachability

Test connectivity to each monitor from inside the cluster:

```bash
kubectl run -it --rm debug \
  --image=busybox \
  --restart=Never \
  -- sh -c "nc -zv <monitor-ip> 6789 && echo 'SUCCESS' || echo 'FAILED'"
```

Replace `<monitor-ip>` with the actual monitor address from `ceph mon dump`.

## Common Causes and Fixes

### NetworkPolicy Blocking CSI Traffic

In clusters with strict NetworkPolicy, CSI pods may be blocked from reaching monitors. Check existing policies:

```bash
kubectl get networkpolicy -n rook-ceph
```

Allow ingress to monitors on ports 6789 and 3300:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-csi-to-monitors
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-mon
  ingress:
    - from:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 6789
        - protocol: TCP
          port: 3300
```

### Monitor ConfigMap Stale Data

Rook maintains a ConfigMap with monitor addresses used by CSI drivers. If monitors moved to different IPs, this map may be stale:

```bash
kubectl get configmap -n rook-ceph rook-ceph-mon-endpoints -o yaml
```

The operator updates this automatically, but force reconciliation by restarting the operator:

```bash
kubectl rollout restart deployment rook-ceph-operator -n rook-ceph
```

### CSI Driver Using Wrong Namespace Monitor Data

Verify the ConfigMap name referenced in the CSI driver matches the actual Rook namespace:

```bash
kubectl get configmap -n rook-ceph | grep mon
```

### Monitor Pods Not Running

If monitors themselves are not running, CSI can never connect:

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-mon
```

Check monitor pod logs for startup failures:

```bash
kubectl logs -n rook-ceph -l app=rook-ceph-mon --tail=50
```

## Enabling CSI Host Networking as a Workaround

If NetworkPolicy cannot be adjusted, enable host networking for CSI pods:

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set csi.enableCSIHostNetwork=true
```

## Verifying Fix

After applying changes, check that a new PVC can be provisioned:

```bash
kubectl describe pvc <pending-pvc> | grep -A10 Events
```

## Summary

CSI-to-monitor connectivity failures in Rook-Ceph stem from NetworkPolicy restrictions, stale monitor endpoint data, or monitor pods themselves being unhealthy. Test reachability directly with netcat, inspect and update NetworkPolicies, and ensure the monitor endpoints ConfigMap is current. CSI host networking is an effective bypass for restrictive network environments.
