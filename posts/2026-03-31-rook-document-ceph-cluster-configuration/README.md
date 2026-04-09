# How to Document Your Ceph Cluster Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Documentation, Configuration, GitOps, Runbook, Operation

Description: Build comprehensive documentation for your Ceph cluster configuration including architecture diagrams, pool inventory, tuning parameters, and GitOps-managed configuration records.

---

## Why Cluster Documentation Matters

Undocumented Ceph clusters create operational risk. When a senior engineer leaves or an incident requires rapid diagnosis at 3 AM, team members need to understand the cluster's design decisions, pool layouts, tuning choices, and custom configurations. Good documentation turns tribal knowledge into team knowledge.

## What to Document

A complete Ceph cluster document should cover:
1. Architecture overview
2. Hardware inventory
3. Pool and StorageClass inventory
4. Custom tuning parameters
5. Non-default configuration changes and the reasons for them
6. Operational procedures summary

## Cluster Architecture Document Template

```markdown
# Ceph Cluster Architecture: production-cluster

## Overview
- **Cluster Name**: rook-ceph
- **Rook Version**: v1.16.0
- **Ceph Version**: v19.2.0 (Squid)
- **Kubernetes Cluster**: eks-prod-us-east-1
- **Deployment Date**: 2026-03-31

## Cluster Topology
- 3 Monitor nodes (m7i.xlarge)
- 12 OSD nodes:
  - 6 NVMe nodes (c7i.2xlarge + 2x NVMe 3.84TB) - hot tier
  - 6 HDD nodes (c7i.2xlarge + 12x HDD 16TB) - cold tier
- 2 MDS nodes for CephFS
- 3 RGW instances for object storage

## Network Layout
- Public network: 10.0.0.0/16
- Cluster network: 10.1.0.0/16 (dedicated for OSD replication)
```

## Exporting Current Configuration

Use Rook toolbox to export the current running config:

```bash
# Export full cluster config
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config dump > /tmp/ceph-config-dump-$(date +%Y%m%d).txt

# Export pool configuration
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool ls detail > /tmp/pool-list-$(date +%Y%m%d).txt

# Export CRUSH map
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd getcrushmap -o /tmp/crushmap.bin
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt
```

## Pool Inventory Template

Document each pool systematically:

```markdown
## Pool Inventory

| Pool Name | Type | Device Class | Compression | PGs | Used For |
|-----------|------|--------------|-------------|-----|----------|
| hot-nvme-pool | Replicated 3x | NVMe | none | auto | Production databases |
| warm-ssd-pool | Replicated 3x | SSD | passive | auto | Analytics, logs |
| cold-archive | EC 6+2 | HDD | aggressive | 256 | Compliance archive |
| .rgw.root | Replicated 3x | SSD | none | 32 | RGW metadata |
```

## Documenting Non-Default Tuning

Document every `ceph config set` override with the reason:

```markdown
## Non-Default Configuration Changes

| Config Key | Value | Reason | Changed By | Date |
|-----------|-------|--------|-----------|------|
| `osd bluestore_cache_size_ssd` | 8GB | NVMe nodes have 64GB RAM, increased cache to improve read hit rate | @ops-team | 2026-01-15 |
| `client.rgw rgw_max_chunk_size` | 4MB | Large object uploads from media ingest pipeline | @platform-team | 2026-02-01 |
| `osd osd_recovery_max_active` | 3 | Reduced from 5 to limit recovery impact on production IO | @ops-team | 2026-02-20 |
```

## GitOps Configuration Repository Structure

```bash
# Maintain Rook manifests in Git
ceph-config/
  kustomization.yaml
  cluster.yaml          # CephCluster definition
  pools/
    hot-pool.yaml
    warm-pool.yaml
    cold-pool.yaml
  object-store/
    rgw-store.yaml
  filesystem/
    cephfs.yaml
  storage-classes/
    hot-storageclass.yaml
    warm-storageclass.yaml
  configmaps/
    operator-config.yaml  # Rook operator tuning
```

## Automated Config Snapshot

Run a weekly cron job to capture cluster state:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-config-snapshot
  namespace: rook-ceph
spec:
  schedule: "0 2 * * 0"  # Weekly Sunday 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: snapshot
              image: rook/ceph:v1.16.0
              command: ["/bin/bash", "-c"]
              args:
                - |
                  # Generate ceph.conf from Rook-managed secrets
                  MON_ENDPOINTS=$(cat /etc/rook/mon-endpoints)
                  cat > /etc/ceph/ceph.conf <<EOF
                  [global]
                  mon_host = ${MON_ENDPOINTS}
                  [client.admin]
                  keyring = /etc/ceph/keyring
                  EOF
                  cp /var/lib/rook-ceph-mon/keyring /etc/ceph/keyring
                  chmod 600 /etc/ceph/keyring

                  ceph config dump > /snapshots/config-$(date +%Y%m%d).txt
                  ceph osd pool ls detail >> /snapshots/config-$(date +%Y%m%d).txt
              volumeMounts:
                - name: ceph-config
                  mountPath: /etc/ceph
                - name: mon-endpoint-volume
                  mountPath: /etc/rook
                - name: ceph-admin-secret
                  mountPath: /var/lib/rook-ceph-mon
                  readOnly: true
                - name: snapshots
                  mountPath: /snapshots
          volumes:
            - name: ceph-config
              emptyDir: {}
            - name: mon-endpoint-volume
              configMap:
                name: rook-ceph-mon-endpoints
                items:
                  - key: data
                    path: mon-endpoints
            - name: ceph-admin-secret
              secret:
                secretName: rook-ceph-mon
            - name: snapshots
              persistentVolumeClaim:
                claimName: ceph-config-snapshots
          restartPolicy: OnFailure
```

## Summary

Comprehensive Ceph cluster documentation reduces operational risk by preserving institutional knowledge about architecture decisions, pool inventory, and non-default tuning parameters. Storing Rook manifests in Git provides version-controlled infrastructure-as-code, while weekly automated config snapshots capture the actual running state. Every non-default configuration change should be documented with the rationale, owner, and date to make future troubleshooting faster and safer.
