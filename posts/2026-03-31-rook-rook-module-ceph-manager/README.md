# How to Set Up the Rook Module in Ceph Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Kubernetes, Orchestrator, Module

Description: Learn how to enable and configure the Rook orchestrator module in Ceph Manager to manage Ceph daemon lifecycle through Kubernetes custom resources.

---

The Rook module is a Ceph Manager plugin that implements the Orchestrator interface using the Rook operator on Kubernetes. It enables the `ceph orch` command family to manage daemon deployment, placement, and scaling by translating commands into Kubernetes custom resource (CR) operations.

## Prerequisites

Before enabling the Rook module, ensure:

- A Rook-Ceph operator is deployed in your Kubernetes cluster
- The Ceph cluster was bootstrapped via Rook
- The active Ceph Manager pod has Kubernetes RBAC access to the `rook-ceph` namespace

## Enabling the Rook Module

Enable the module and set it as the active orchestrator backend:

```bash
ceph mgr module enable rook
ceph orch set backend rook
```

Verify the setup:

```bash
ceph orch status
```

Expected output:

```yaml
Backend: rook
Available: Yes
```

## Configuring the Rook Module

The module auto-discovers the Kubernetes namespace from the `POD_NAMESPACE` environment variable when running inside a Rook-managed cluster. No manual namespace configuration is needed.

To set the storage class used for Local Storage Operator (LSO) discovered PersistentVolumes:

```bash
ceph config set mgr mgr/rook/storage_class rook-ceph-block
```

The default value is `local`.

## Listing Kubernetes-Managed Daemons

With the Rook module active, standard orchestrator commands show Kubernetes-managed daemons:

```bash
ceph orch ps
```

```text
NAME        HOST    STATUS   REFRESHED
osd.0       node-1  running  30s ago
osd.1       node-2  running  30s ago
mon.a       node-1  running  1m ago
mgr.a       node-2  running  1m ago
```

## Deploying New OSDs

The Rook backend does not support creating OSDs through the `ceph orch` CLI. OSD deployment must be configured directly in the `CephCluster` custom resource. Edit the CR to use all available devices:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph --type merge -p '{"spec":{"storage":{"useAllDevices":true,"useAllNodes":true}}}'
```

The Rook operator reconciles the CR and deploys OSD pods on discovered devices.

## Scaling Monitors

Change the monitor count through the orchestrator:

```bash
ceph orch apply mon --placement="3"
```

The Rook operator reconciles the `CephCluster` CR and adjusts monitor pods accordingly. Note that only count-based placement is supported with the Rook backend. Host list or label-based placement is not available.

## Checking Rook Operator Logs

When orchestrator operations fail, review the Rook operator logs:

```bash
kubectl logs -n rook-ceph deployment/rook-ceph-operator --tail=50
```

## Summary

The Rook Ceph Manager module connects the `ceph orch` interface to the Rook Kubernetes operator, enabling standard orchestrator commands to manage daemon deployment as Kubernetes custom resources. Enabling it requires setting the backend to `rook` and ensuring proper RBAC configuration, after which daemon scaling and placement operations translate directly into Kubernetes reconciliation events.
