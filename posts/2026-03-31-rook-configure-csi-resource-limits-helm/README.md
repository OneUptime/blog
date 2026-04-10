# How to Configure CSI Resource Limits in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, Helm, Resource

Description: Set CPU and memory resource requests and limits for Rook-Ceph CSI plugin and provisioner containers via Helm to prevent resource contention.

---

## Overview

CSI components in Rook-Ceph run as containers alongside application workloads. Without resource limits, CSI pods may consume excessive CPU or memory during peak provisioning activity. The Helm chart provides granular resource configuration for each CSI container type.

## CSI Component Containers

Each CSI DaemonSet and Deployment contains multiple containers. The main ones that need resource limits are:

- `csi-rbdplugin` - RBD node plugin
- `csi-cephfsplugin` - CephFS node plugin
- `csi-provisioner` - volume provisioner sidecar
- `csi-attacher` - volume attacher sidecar
- `csi-resizer` - volume resizer sidecar
- `csi-snapshotter` - snapshot controller sidecar

## Setting Resource Limits

The Helm chart groups resources by component:

```yaml
csi:
  csiRBDPluginResource: |
    - name: driver-registrar
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
          cpu: 100m
    - name: csi-rbdplugin
      resource:
        requests:
          memory: 512Mi
          cpu: 250m
        limits:
          memory: 1Gi
          cpu: 500m
    - name: liveness-prometheus
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
          cpu: 100m

  csiCephFSPluginResource: |
    - name: driver-registrar
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
          cpu: 100m
    - name: csi-cephfsplugin
      resource:
        requests:
          memory: 512Mi
          cpu: 250m
        limits:
          memory: 1Gi
          cpu: 500m
    - name: liveness-prometheus
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
          cpu: 100m

  csiRBDProvisionerResource: |
    - name: csi-provisioner
      resource:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 200m
    - name: csi-attacher
      resource:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 200m
    - name: csi-resizer
      resource:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 200m
    - name: csi-rbdplugin
      resource:
        requests:
          memory: 512Mi
          cpu: 250m
        limits:
          memory: 1Gi
          cpu: 500m
    - name: csi-snapshotter
      resource:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 200m
    - name: liveness-prometheus
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
          cpu: 100m

  csiCephFSProvisionerResource: |
    - name: csi-provisioner
      resource:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 200m
    - name: csi-attacher
      resource:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 200m
    - name: csi-resizer
      resource:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 200m
    - name: csi-cephfsplugin
      resource:
        requests:
          memory: 512Mi
          cpu: 250m
        limits:
          memory: 1Gi
          cpu: 500m
    - name: csi-snapshotter
      resource:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 200m
    - name: liveness-prometheus
      resource:
        requests:
          memory: 128Mi
          cpu: 50m
        limits:
          memory: 256Mi
          cpu: 100m
```

## Applying the Configuration

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f rook-csi-resources.yaml
```

## Verifying Resource Settings

After upgrade, check applied resources:

```bash
kubectl get pod -n rook-ceph csi-rbdplugin-<id> -o json \
  | jq '.spec.containers[] | {name: .name, resources: .resources}'
```

## Summary

Configuring CSI resource limits in the Rook Helm chart prevents provisioning workloads from starving application pods. Set requests conservatively to guarantee scheduling, and limits at 2-3x requests to handle provisioning bursts without unbounded consumption.
