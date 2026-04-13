# How to Enable CSI Host Networking in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, Helm, Networking

Description: Enable host networking for Rook-Ceph CSI plugin pods via Helm to resolve connectivity issues in environments with restrictive pod network policies.

---

## Overview

By default, Rook-Ceph CSI plugin pods use the cluster's pod network. In some environments - particularly those with strict NetworkPolicy rules or CNI plugins that restrict cross-namespace traffic - CSI plugins may fail to reach Ceph monitors. Enabling host networking for CSI pods bypasses these restrictions.

## When to Enable CSI Host Networking

Enable host networking when you observe:

- Volume mount failures with "connection refused" or "timeout" errors to monitor addresses
- NetworkPolicy rules blocking traffic from the CSI pod namespace to the Ceph monitor ports (6789, 3300)
- CNI plugins that do not support cross-namespace pod-to-pod traffic properly

## Helm Configuration

```yaml
csi:
  enableCSIHostNetwork: true
```

This sets `hostNetwork: true` on the CSI plugin DaemonSet pods, giving them direct access to the node's network interfaces and bypassing pod network routing entirely.

## Applying the Change

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set csi.enableCSIHostNetwork=true
```

The CSI DaemonSet pods restart with host networking. Verify:

```bash
kubectl get pod -n rook-ceph -l app=csi-rbdplugin \
  -o jsonpath='{.items[0].spec.hostNetwork}'
```

Output should be `true`.

## Security Considerations

Host networking grants CSI pods access to all host network interfaces and ports. This is a privilege escalation relative to pod-network-only mode. To minimize risk:

1. Note that CSI node plugins require privileged access for mount and device operations - restrict capabilities to only what is needed rather than granting blanket privileges
2. Apply NetworkPolicy to restrict outbound traffic from CSI plugin pods to only Ceph monitor ports
3. Audit node-level firewall rules to verify CSI pods cannot reach unexpected services

Example NetworkPolicy for host-network pods is more complex - use HostEndpoints in Calico or similar constructs.

## Alternative: Multus CNI

If host networking is undesirable, consider using Multus CNI with a dedicated Ceph network interface instead. This provides direct Ceph connectivity without exposing the full host network:

```yaml
cephClusterSpec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/ceph-public
      cluster: rook-ceph/ceph-cluster
```

## Reverting CSI Host Networking

If host networking causes unintended side effects, revert by setting the value back:

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set csi.enableCSIHostNetwork=false
```

## Summary

Enabling CSI host networking in the Rook Helm chart resolves monitor connectivity issues in restrictive network environments. It is a targeted fix for specific CNI or NetworkPolicy constraints, but comes with security trade-offs. Evaluate Multus CNI as a more secure alternative for dedicated Ceph network access.
