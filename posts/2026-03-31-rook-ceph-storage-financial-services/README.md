# How to Configure Ceph Storage for Financial Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Financial Services, Compliance, Encryption, Durability, Storage, SOX

Description: Configure Rook/Ceph storage for financial services workloads with the low-latency, encryption, auditability, and high-availability requirements of banking and trading systems.

---

## Financial Services Storage Requirements

Financial data storage must meet strict requirements:
- **Low latency**: Trading systems require sub-millisecond storage responses
- **High availability**: 99.999% uptime for core banking systems
- **Encryption**: Data at rest and in transit encryption
- **Auditability**: Complete audit trails for SOX, PCI-DSS compliance
- **Data retention**: Transaction records for 7+ years
- **Disaster recovery**: RPO near zero, RTO under 4 hours

## High-Performance Pool for Trading Systems

For low-latency trading data, use NVMe-backed pools with replica 3:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: trading-nvme-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  deviceClass: nvme
  parameters:
    pg_num: "256"
    pg_autoscale_mode: "on"
```

## Encrypted StorageClass for Financial Data

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-financial-encrypted
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: trading-nvme-pool
  encrypted: "true"
  encryptionKMSID: vault-financial-kms
  csi.storage.k8s.io/fstype: xfs
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## Enabling In-Transit Encryption for All Ceph Traffic

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    connections:
      encryption:
        enabled: true
      compression:
        enabled: false  # Disable compression for latency-sensitive workloads
      requireMsgr2: true
```

## High-Availability Object Storage for Audit Logs

Use RGW with Object Lock for immutable audit trail storage:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: audit-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    instances: 3  # Three gateways for HA
    securePort: 443
    sslCertificateRef: financial-tls-cert
```

## Configuring S3 Object Lock for SOX Compliance

```bash
# Create a bucket with Object Lock for 7-year retention
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  aws --endpoint-url http://rook-ceph-rgw-audit-store:80 \
  s3api create-bucket \
  --bucket sox-audit-logs \
  --object-lock-enabled-for-bucket

# Set default retention
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  aws --endpoint-url http://rook-ceph-rgw-audit-store:80 \
  s3api put-object-lock-configuration \
  --bucket sox-audit-logs \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Years": 7
      }
    }
  }'
```

## Monitoring Latency for SLA Compliance

Set Grafana alerts for average write latency thresholds:

```promql
# Alert if average OSD write latency exceeds 5ms
(
  rate(ceph_osd_op_w_latency_sum{namespace="rook-ceph"}[5m])
  /
  rate(ceph_osd_op_w_latency_count{namespace="rook-ceph"}[5m])
) * 1000 > 5
```

## Summary

Ceph on Rook can meet the demanding storage requirements of financial services when configured with NVMe-backed pools, encryption at rest and in transit, Object Lock for regulatory retention, and multiple RGW instances for HA. Key compliance-enabling features are `reclaimPolicy: Retain` to prevent accidental deletion, Vault-managed encryption keys for key rotation, and S3 Object Lock in COMPLIANCE mode for audit log immutability.
