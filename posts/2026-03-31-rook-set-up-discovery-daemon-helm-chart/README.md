# How to Set Up Discovery Daemon in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, Discovery, OSD

Description: Enable and configure the Rook-Ceph discovery daemon via Helm to automatically detect available block devices for OSD provisioning.

---

## Overview

The Rook-Ceph discovery daemon runs as a DaemonSet on all cluster nodes, periodically scanning for available block devices. When new disks are added to nodes, the discovery daemon detects them and stores the results in ConfigMaps (named `local-device-<nodename>`). This enables dynamic OSD provisioning without manual cluster CR updates.

## Enabling the Discovery Daemon

In the operator Helm chart values:

```yaml
enableDiscoveryDaemon: true

# Optional: configure the polling interval (default: 60 minutes)
discoveryDaemonInterval: 60m
```

## Discovery Daemon DaemonSet

Once enabled, a discovery DaemonSet is created in the Rook namespace:

```bash
kubectl get daemonset -n rook-ceph rook-discover
```

View which devices were discovered on a specific node:

```bash
kubectl get configmap -n rook-ceph \
  -l app=rook-discover \
  -o yaml
```

## Using Discovered Devices

When the `CephCluster` is configured to use all available devices, discovery automates OSD creation:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]"
```

With `discoveryDaemonInterval` set, the operator detects newly discovered devices matching `deviceFilter` and provisions new OSDs automatically.

## Resource Configuration for the Discovery Daemon

```yaml
# In Helm values
discover:
  resources:
    limits:
      cpu: 100m
      memory: 128Mi
    requests:
      cpu: 15m
      memory: 64Mi
```

## Security Context for Discovery

The discovery daemon needs access to host block devices. The operator automatically sets the required security context (`privileged: true`, `runAsUser: 0`) when deploying the discovery DaemonSet. This is hardcoded in the operator and does not need to be configured via Helm values.

## Disabling Discovery for Static Configurations

If you manage OSD assignments manually and do not want automatic device discovery:

```yaml
enableDiscoveryDaemon: false
```

With discovery disabled, you must specify devices explicitly in the `CephCluster` CR:

```yaml
spec:
  storage:
    nodes:
      - name: worker-1
        devices:
          - name: sdb
          - name: sdc
```

## Applying the Configuration

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set enableDiscoveryDaemon=true \
  --set discoveryDaemonInterval=30m
```

## Summary

The Rook discovery daemon simplifies scaling storage capacity by automatically detecting new block devices. Enable it via Helm for dynamic clusters where disks are added to nodes frequently, and configure the polling interval to balance detection speed against resource overhead.
