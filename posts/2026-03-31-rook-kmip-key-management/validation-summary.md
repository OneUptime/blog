# Validation Summary: How to Configure KMIP Key Management with Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- ceph-csi (CSI driver for Ceph)
- KMIP (Key Management Interoperability Protocol)
- Kubernetes Secrets, ConfigMaps, StorageClasses, PVCs
- TLS/mTLS certificate authentication
- OpenSSL (for connectivity testing)

## Sources Consulted
- [Rook Key Management System Documentation](https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/key-management-system/)
- [Rook KMS docs on GitHub](https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Advanced/key-management-system.md)
- [ceph-csi KMS config examples (kms-config.yaml)](https://github.com/ceph/ceph-csi/blob/devel/examples/kms/vault/kms-config.yaml)
- [ceph-csi CSI KMS connection details (csi-kms-connection-details.yaml)](https://github.com/ceph/ceph-csi/blob/devel/examples/kms/vault/csi-kms-connection-details.yaml)
- [ceph-csi KMIP credentials secret example](https://github.com/ceph/ceph-csi/blob/devel/examples/kms/vault/kmip-credentials.yaml)
- [Ceph KMIP Integration Documentation](https://docs.ceph.com/en/latest/radosgw/kmip/)

## Issues Found

### 1. Wrong KMS type configuration field
- **What was wrong:** The ConfigMap used `"encryptionKMSType": "kmip"` to identify the KMS provider.
- **What was changed:** Replaced with `"KMS_PROVIDER": "kmip"`, which is the correct field name for KMIP in ceph-csi.
- **Why:** The ceph-csi KMIP provider uses `KMS_PROVIDER` rather than `encryptionKMSType`. The `encryptionKMSType` field is used for Vault-based providers, while KMIP uses the `KMS_PROVIDER` field as shown in the official ceph-csi examples.

### 2. Wrong credential reference fields in ConfigMap
- **What was wrong:** The ConfigMap included three separate secret reference fields: `KMIP_CA_CERT`, `KMIP_CLIENT_CERT`, and `KMIP_CLIENT_KEY`, each pointing to individual Kubernetes Secrets.
- **What was changed:** Replaced with a single `"KMIP_SECRET_NAME": "ceph-csi-kmip-credentials"` field that references one combined credentials secret.
- **Why:** ceph-csi's KMIP implementation expects a single secret containing all TLS credentials, referenced by `KMIP_SECRET_NAME`. There are no `KMIP_CA_CERT`, `KMIP_CLIENT_CERT`, or `KMIP_CLIENT_KEY` configuration keys in the ceph-csi KMIP provider.

### 3. Wrong TLS server name field
- **What was wrong:** The ConfigMap used `"KMIP_TLS_SERVER_NAME"` as the key for the TLS server name.
- **What was changed:** Replaced with `"TLS_SERVER_NAME"`.
- **Why:** The correct configuration key in ceph-csi is `TLS_SERVER_NAME`, not `KMIP_TLS_SERVER_NAME`, per the official examples.

### 4. Wrong Kubernetes Secret format for certificates
- **What was wrong:** Step 1 created three separate secrets (`kmip-ca-cert`, `kmip-client-cert`, `kmip-client-key`) using `kubectl create secret generic` with `--from-file` flags and `cert`/`key` data keys.
- **What was changed:** Replaced with a single Secret manifest (`ceph-csi-kmip-credentials`) using `stringData` with `CA_CERT`, `CLIENT_CERT`, and `CLIENT_KEY` fields containing PEM-encoded certificate data inline.
- **Why:** The ceph-csi KMIP implementation expects a single secret named per the `KMIP_SECRET_NAME` config, containing `CA_CERT`, `CLIENT_CERT`, and `CLIENT_KEY` keys. The official example is at `ceph-csi/examples/kms/vault/kmip-credentials.yaml`.

### 5. Missing timeout configuration
- **What was wrong:** The ConfigMap did not include `READ_TIMEOUT` and `WRITE_TIMEOUT` fields.
- **What was changed:** Added `"READ_TIMEOUT": 10` and `"WRITE_TIMEOUT": 10` to the ConfigMap.
- **Why:** These are standard KMIP configuration fields shown in the official ceph-csi examples, with a default of 10 seconds. Including them makes the configuration more explicit and complete.

### 6. Inaccurate description
- **What was wrong:** The post description mentioned "OSD and CSI volume encryption" but the tutorial only demonstrates CSI volume encryption (StorageClass-based).
- **What was changed:** Updated to "CSI volume encryption" only.
- **Why:** The blog's configuration (using `rook-ceph-csi-kms-config` ConfigMap and StorageClass) is specifically for CSI per-volume encryption. OSD encryption uses a different configuration path via the CephCluster CR, which is not covered in this post.

## Review Notes
- The claim that KMIP support starts with "Rook 1.12" could not be precisely verified against release notes. KMIP examples exist in the current ceph-csi `devel` branch and in v3.13.1. Rook 1.12+ ships with compatible ceph-csi versions, so the claim is plausible.
- The KMIP port 5696 is correct - it is the IANA-registered port for KMIP over TLS.
- The ceph-csi KMIP credentials secret also supports an optional `UNIQUE_IDENTIFIER` field (not included in this post, which is fine since it's not always needed).
- The connectivity test in Step 4 uses placeholder paths for certificates inside an ephemeral pod. In practice, the certificates would need to be mounted into the pod or copied in. The placeholder convention is acceptable for a tutorial.
- The StorageClass configuration, PVC test, and overall encryption workflow are correct.
