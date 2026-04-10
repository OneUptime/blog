# How to Configure Ceph Storage for Healthcare Imaging (DICOM)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Healthcare, DICOM, Medical Imaging, Compliance, HIPAA, Storage

Description: Configure Rook/Ceph storage for healthcare DICOM imaging workloads with the durability, encryption, access controls, and compliance features required for medical data.

---

## Healthcare Storage Requirements

Medical imaging (DICOM) data has unique storage requirements:
- **High durability**: Medical records must be retained for 7-10+ years
- **Encryption**: PHI (Protected Health Information) must be encrypted at rest and in transit
- **Access control**: Fine-grained access to patient data
- **Large objects**: DICOM files range from 100 KB to several GB per study
- **Compliance**: HIPAA, HITECH, and local regulations

## Architecture Overview

Ceph RGW (S3-compatible object storage) is ideal for DICOM archival. DICOM servers like Orthanc and dcm4chee can use S3-compatible backends.

## Configuring an Encrypted Pool for DICOM Data

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: dicom-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  parameters:
    compression_mode: none  # DICOM images are already compressed
  enableRBDStats: true
```

Enable encryption at the StorageClass level:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-dicom-encrypted
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: dicom-pool
  encrypted: "true"
  encryptionKMSID: vault-kms
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

Note `reclaimPolicy: Retain` to prevent accidental deletion of medical data.

## Configuring S3-Compatible Storage for DICOM Archival

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: dicom-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
    parameters:
      compression_mode: none
  gateway:
    port: 80
    securePort: 443
    instances: 2
    sslCertificateRef: dicom-tls-cert
  security:
    objectLock:
      enabled: true
```

## Configuring Object Lock for Compliance

Enable S3 Object Lock to enforce WORM (Write Once, Read Many) retention:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: dicom-archive-bucket
  namespace: healthcare
spec:
  generateBucketName: dicom-archive
  storageClassName: rook-ceph-bucket
  additionalConfig:
    maxObjects: "0"
    maxSize: "0"
```

After the bucket is created, configure Object Lock retention via the S3 API:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  aws --endpoint-url http://rook-ceph-rgw-dicom-store.rook-ceph.svc \
  s3api put-object-lock-configuration \
  --bucket dicom-archive \
  --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"COMPLIANCE","Days":3650}}}'
```

## Setting Up Orthanc with Ceph S3

Configure Orthanc to use the Ceph RGW endpoint:

```json
{
  "AwsS3Storage": {
    "BucketName": "dicom-archive",
    "Region": "us-east-1",
    "Endpoint": "https://rook-ceph-rgw-dicom-store.rook-ceph.svc",
    "AccessKey": "AKIAIOSFODNN7EXAMPLE",
    "SecretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "VirtualAddressing": false,
    "StorageEncryption": {
      "Enable": true,
      "MasterKey": [1, "/path/to/master.key"]
    }
  }
}
```

## Auditing Access

Enable RGW usage logging for HIPAA audit trails:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin usage show --uid=<uid> \
  --start-date=2026-03-01 --end-date=2026-03-31 \
  --show-log-entries=true
```

## Summary

Ceph provides the durability, encryption, and compliance features required for healthcare DICOM storage. Using RBD with encryption for active imaging workloads and RGW with S3 Object Lock for long-term archival covers both the operational and compliance aspects of medical data storage. Configuring `reclaimPolicy: Retain` and enabling WORM object lock prevents accidental or malicious deletion of patient records.
