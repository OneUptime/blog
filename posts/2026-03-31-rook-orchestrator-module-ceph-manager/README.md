# How to Configure the Orchestrator Module in Ceph Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Orchestrator, Kubernetes, Deployment

Description: Learn how to configure the Ceph Manager Orchestrator module to manage daemon placement, scaling, and lifecycle through an orchestration backend like Rook.

---

The Ceph Manager Orchestrator module provides a unified interface for managing Ceph daemon deployment, placement, and scaling. It acts as an abstraction layer over orchestration backends such as Rook (Kubernetes) or cephadm.

## Understanding the Orchestrator Interface

The orchestrator module does not deploy daemons itself. Instead, it delegates to a backend module that knows how to interact with the underlying infrastructure. Available backends include:

- `rook` - Manages daemons via Kubernetes custom resources
- `cephadm` - Manages the full daemon lifecycle using SSH and containers (the default backend since Octopus)

## Setting the Active Orchestrator

Enable the backend module and set it as the active orchestration backend:

```bash
ceph mgr module enable rook
ceph orch set backend rook
```

Verify the current backend:

```bash
ceph orch status
```

## Listing Hosts

With the orchestrator configured, list all registered hosts:

```bash
ceph orch host ls
```

Example output:

```text
HOST          ADDR           LABELS  STATUS
node-1        192.168.1.11   osd
node-2        192.168.1.12   osd
node-3        192.168.1.13   mon
```

## Managing Services via the Orchestrator

List deployed services:

```bash
ceph orch ls
```

Scale a specific service:

```bash
ceph orch apply osd --all-available-devices
ceph orch apply mon --placement="3"
```

## Inspecting Daemon Status

Check the status of individual daemons:

```bash
ceph orch ps
```

```text
NAME        HOST    STATUS   REFRESHED
osd.0       node-1  running  1m ago
osd.1       node-2  running  1m ago
mon.a       node-3  running  2m ago
```

## Using the Rook Backend

When using Rook as the orchestrator backend, the module translates orchestrator commands into Kubernetes custom resource updates:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  mon:
    count: 3
  mgr:
    count: 2
```

Applying this updates the monitor and manager deployment counts, which the Rook operator reconciles.

## Placement Specifications

Control where daemons are scheduled using placement specs:

```bash
# Place OSDs only on nodes with the Ceph host label "storage"
ceph orch apply osd --placement="label:storage"

# Pin monitors to specific hosts
ceph orch apply mon --placement="node-1 node-2 node-3"
```

## Summary

The Ceph Manager Orchestrator module abstracts daemon lifecycle management behind a consistent interface, allowing the same `ceph orch` commands to work with Rook or cephadm backends. Setting a backend, listing hosts and services, and applying placement specifications are the core operations that give operators full control over cluster topology.
