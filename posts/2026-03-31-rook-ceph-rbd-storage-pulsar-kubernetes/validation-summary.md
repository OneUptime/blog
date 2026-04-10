# Validation Summary: How to Set Up Ceph RBD Storage for Apache Pulsar on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Pulsar (messaging and streaming platform)
- Apache BookKeeper (Pulsar's storage layer)
- Apache ZooKeeper (Pulsar's metadata store)
- Rook-Ceph RBD (block storage via CSI)
- Rook-Ceph RGW (S3-compatible object storage for tiered offloading)
- Kubernetes StorageClasses and PersistentVolumeClaims
- StreamNative Pulsar Operator

## Sources Consulted
- Apache Pulsar tiered storage docs: https://pulsar.apache.org/docs/next/tiered-storage-aws/ and https://pulsar.apache.org/docs/next/tiered-storage-s3/
- Apache Pulsar broker configuration reference: https://pulsar.apache.org/docs/2.10.x/reference-configuration/
- Pulsar GitHub issue #8220 (config property name mismatches): https://github.com/apache/pulsar/issues/8220
- Pulsar GitHub PR #8310 (OffloadPolicies field name fix): https://github.com/apache/pulsar/pull/8310
- Apache Pulsar broker.conf on GitHub: https://github.com/apache/pulsar/blob/master/conf/broker.conf
- StreamNative Pulsar Operator docs: https://docs.streamnative.io/operator/understand-pulsar-operator
- StreamNative Pulsar Operators tutorial: https://streamnative.io/blog/pulsar-operators-tutorial-part-1-create-apache-pulsar-cluster-kubernetes
- StreamNative deploy docs: https://docs.streamnative.io/operator/pulsar-operator-deploy-pulsar
- Rook-Ceph Object Storage (RGW) docs: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook-Ceph CephObjectStore CRD: https://rook.io/docs/rook/v1.10/CRDs/Object-Storage/ceph-object-store-crd/

## Issues Found

### 1. ZooKeeper StorageClass missing `volumeBindingMode`
**What was wrong:** The ZooKeeper StorageClass was missing `volumeBindingMode: WaitForFirstConsumer`, while the BookKeeper StorageClass had it. This inconsistency could cause zone-affinity issues in multi-zone clusters.
**What was changed:** Added `volumeBindingMode: WaitForFirstConsumer` to the ZooKeeper StorageClass for consistency.

### 2. StreamNative Operator CRD was fabricated
**What was wrong:** The blog used a non-existent `PulsarCluster` kind with `pulsar.streamnative.io/v1alpha1`. The StreamNative Operator does not have a unified `PulsarCluster` CRD — it uses separate CRDs: `ZooKeeperCluster` (`zookeeper.streamnative.io/v1alpha1`), `BookKeeperCluster` (`bookkeeper.streamnative.io/v1alpha1`), and `PulsarBroker` (`pulsar.streamnative.io/v1alpha1`). The field names (`storageClassName`, `dataVolumeClaimSpec`, `journalVolumeClaimSpec`, `ledgersVolumeClaimSpec`) were also incorrect.
**What was changed:** Replaced the single `PulsarCluster` YAML with three separate resources using the correct CRD kinds, API versions, and storage field structures matching the StreamNative operator's actual API.

### 3. Non-existent S3 credential config properties
**What was wrong:** `s3ManagedLedgerOffloadCredentialId` and `s3ManagedLedgerOffloadCredentialSecret` are not valid Pulsar broker configuration properties. Pulsar's S3 offloader uses the standard AWS SDK credential chain (environment variables `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, IAM roles, or credentials files).
**What was changed:** Removed the two fake credential properties and added a note explaining that S3 credentials must be provided via environment variables on the broker pods.

### 4. Incorrect offload threshold property name
**What was wrong:** `managedLedgerOffloadThresholdInBytes` is an internal Java field name, not the broker.conf property. The correct property name is `managedLedgerOffloadAutoTriggerSizeThresholdBytes` (documented in Pulsar GitHub issue #8220).
**What was changed:** Replaced `managedLedgerOffloadThresholdInBytes` with `managedLedgerOffloadAutoTriggerSizeThresholdBytes`.

### 5. Incorrect Rook-Ceph RGW service endpoint
**What was wrong:** The endpoint `http://rook-ceph-rgw.rook-ceph.svc.cluster.local` is missing the object store name. Rook-Ceph RGW services follow the naming pattern `rook-ceph-rgw-<objectStoreName>`.
**What was changed:** Updated to `http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local` with a placeholder store name.

## Review Notes
- The `managedLedgerOffloadDeletionLagMs` property name was verified as correct — it matches the broker.conf property name (the internal Java field name `managedLedgerOffloadDeletionLagInMillis` was the source of confusion, fixed in Pulsar PR #8310).
- The Ceph pool creation commands, RBD pool init, and StorageClass parameters are all correct for Rook-Ceph RBD CSI.
- The `pulsar-admin` commands for namespace offload threshold and offload status are correct.
- The Pulsar architecture description (separating compute from storage, ZooKeeper for metadata, BookKeeper for ledgers, stateless brokers/proxy) is accurate.
- Readers should adapt the `my-store` placeholder in the RGW endpoint to match their actual `CephObjectStore` resource name.
- The StreamNative operator CRDs may evolve; readers should consult the operator documentation for their specific version.
