# How to Plan a Disaster Recovery Strategy for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Disaster Recovery, Strategy, Planning

Description: Build a comprehensive disaster recovery strategy for Rook-Ceph covering RPO, RTO, backup types, failure scenarios, and recovery procedures.

---

A disaster recovery (DR) strategy for Rook-Ceph must address multiple failure scenarios: single node failure, multi-node failure, cluster-wide outage, data corruption, and complete site loss. Without a documented DR plan, recovery becomes guesswork under pressure - the worst time to improvise.

## Defining Recovery Objectives

Start with business requirements before choosing technical solutions:

- **RPO (Recovery Point Objective):** How much data loss is acceptable? Minutes? Hours? Zero?
- **RTO (Recovery Time Objective):** How long can the system be unavailable? 15 minutes? 4 hours?

For Rook-Ceph deployments, typical objectives might be:
- Critical databases: RPO 5 min, RTO 30 min
- Application block storage: RPO 1 hour, RTO 2 hours
- Object storage archives: RPO 24 hours, RTO 8 hours

Document these per workload type, not cluster-wide.

## Failure Scenario Classification

Classify failures by severity to select the appropriate recovery procedure:

```text
Level 1 - Single component failure
  - One OSD disk fails
  - One mon pod crashes
  - One worker node reboots
  Recovery: Automatic via Ceph replication + Rook operator

Level 2 - Multiple component failure
  - Multiple OSD disks fail simultaneously
  - Two of three monitors lost
  - Entire rack goes offline
  Recovery: Manual intervention, mon quorum restore

Level 3 - Cluster-wide failure
  - Namespace deletion
  - CRD deletion
  - Kubernetes control plane failure
  Recovery: Full cluster restore from backup

Level 4 - Site disaster
  - Data center outage
  - Physical destruction
  Recovery: Failover to replicated secondary site
```

## Architecture for DR

Design Rook-Ceph with DR in mind from the start:

```yaml
# CephCluster with stretch topology for zone awareness
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  mon:
    count: 5
    stretchCluster:
      failureDomainLabel: topology.kubernetes.io/zone
      subFailureDomain: host
      zones:
      - name: zone-a
        arbiter: false
      - name: zone-b
        arbiter: false
      - name: zone-c
        arbiter: true
  storage:
    useAllNodes: false
    nodes:
    - name: node-zone-a-1
    - name: node-zone-a-2
    - name: node-zone-b-1
    - name: node-zone-b-2
```

Use replication factor 3 minimum for all data pools:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true
```

## Backup Strategy by Layer

A complete DR strategy covers three layers:

**Layer 1 - Kubernetes configuration backup:**
Use Velero to back up all Rook CRDs, CRs, ConfigMaps, and Secrets daily:

```bash
velero schedule create rook-config-backup \
  --schedule="0 2 * * *" \
  --include-namespaces rook-ceph \
  --include-cluster-resources=true
```

**Layer 2 - Application data backup:**
Use RBD mirroring for block storage DR across clusters:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror pool enable replicapool image
```

**Layer 3 - Object storage replication:**
Configure multi-site object store replication to a secondary Rook cluster.

## Network Topology Considerations

Document network dependencies for recovery:

```text
Primary site: 192.168.1.0/24
Secondary site: 192.168.2.0/24
Mon endpoints:
  - mon-a: 192.168.1.10:3300
  - mon-b: 192.168.1.11:3300
  - mon-c: 192.168.1.12:3300
OSD nodes: node-1 through node-6
```

Store this documentation in a location accessible during outages - not only in the cluster itself.

## DR Runbook Template

Each DR scenario needs a written runbook:

```text
Scenario: Mon quorum loss
Trigger: ceph status hangs or shows no quorum
RTO target: 30 minutes
Steps:
  1. Identify surviving monitors
  2. Check pod status: kubectl -n rook-ceph get pods -l app=rook-ceph-mon
  3. Check node health: kubectl get nodes
  4. If one mon alive: annotate cluster for restore-quorum
  5. Wait for operator to rebuild quorum
  6. Verify: ceph status shows quorum
  7. Remove annotation after 3 mons healthy
Contacts: storage-team@example.com
```

## Testing Requirements

A DR plan that has never been tested is not a DR plan. Schedule:
- Quarterly: Failover test for Level 1 scenarios
- Semi-annual: Level 2 scenarios in staging
- Annual: Full Level 3/4 recovery drill

## Summary

A Rook-Ceph DR strategy requires defining RPO and RTO per workload, classifying failure scenarios by severity, designing the cluster topology with zone awareness, backing up Kubernetes configuration with Velero, replicating data using RBD mirroring or multi-site object storage, and maintaining written runbooks for each failure scenario. Regular testing is non-negotiable for a strategy that works under real disaster conditions.
