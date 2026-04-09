# How to Set Plugin and Provisioner Replicas in Rook CSI Helm Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, Helm, High Availability

Description: Configure replica counts for Rook-Ceph CSI plugin and provisioner deployments via Helm to achieve high availability and efficient resource usage.

---

## Overview

Rook-Ceph deploys CSI components as DaemonSets (plugins) and Deployments (provisioners). Plugin pods run on every node to handle volume attachment and mounting, while provisioner pods handle volume creation and deletion. Configuring replica counts for provisioners directly impacts availability and throughput.

## Understanding the Architecture

- **CSI Plugin DaemonSet**: Runs on every node. Replica count equals node count - no configuration needed.
- **CSI Provisioner Deployment**: Handles CreateVolume/DeleteVolume calls. Configurable replicas for HA.

```bash
kubectl get daemonset -n rook-ceph | grep csi
kubectl get deployment -n rook-ceph | grep csi
```

## Setting Provisioner Replicas

Configure the number of provisioner replicas in the Helm values:

```yaml
csi:
  provisionerReplicas: 2
```

The default is 2 for HA. For single-node clusters or resource-constrained environments, reduce to 1:

```yaml
csi:
  provisionerReplicas: 1
```

For high-throughput production clusters handling many simultaneous PVC requests, increase to 3:

```yaml
csi:
  provisionerReplicas: 3
```

## Provisioner Leader Election

When running multiple provisioner replicas, leader election ensures only one replica actively processes requests at a time. Leader election is always enabled in the provisioner deployment, regardless of replica count.

To explicitly control leader election timeouts, use the dedicated Helm values:

```yaml
csi:
  provisionerReplicas: 2
  csiLeaderElectionLeaseDuration: "137s"
  csiLeaderElectionRenewDeadline: "107s"
  csiLeaderElectionRetryPeriod: "26s"
```

## Node Affinity for Provisioners

For clusters where some nodes should not host provisioners, set affinity rules:

```yaml
csi:
  provisionerNodeAffinity: "role=storage-provisioner"
  provisionerTolerations:
    - key: storage-dedicated
      operator: Exists
      effect: NoSchedule
```

This ensures provisioner pods only land on nodes labeled with `role=storage-provisioner`.

## Applying the Configuration

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set csi.provisionerReplicas=2
```

Check provisioner deployment after upgrade:

```bash
kubectl get deployment -n rook-ceph csi-rbdplugin-provisioner
kubectl get deployment -n rook-ceph csi-cephfsplugin-provisioner
```

## Monitoring Provisioner Health

Watch provisioner pod logs for volume creation events:

```bash
kubectl logs -n rook-ceph \
  -l app=csi-rbdplugin-provisioner \
  -c csi-provisioner -f
```

## Summary

Provisioner replica counts in the Rook CSI Helm config balance high availability against resource consumption. Use 2 replicas for standard HA deployments, 1 for minimal environments, and 3 for high-throughput clusters. Provisioner leader election handles active/standby coordination automatically when multiple replicas are configured.
