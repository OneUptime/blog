# How to Configure Ceph Encryption for Compliance Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Compliance, Security, LUKS

Description: Configure Ceph encryption at rest and in transit to meet compliance requirements including FIPS 140-2, HIPAA, PCI-DSS, and SOC2 standards.

---

Compliance frameworks universally require encryption of sensitive data. Ceph supports encryption at multiple layers: OSD-level disk encryption, messenger encryption for in-transit data, and TLS for client connections.

## OSD Encryption at Rest with LUKS

Rook supports LUKS (Linux Unified Key Setup) for OSD encryption, which satisfies most compliance frameworks:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    storageClassDeviceSets:
      - name: encrypted-set
        count: 3
        encrypted: true
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              resources:
                requests:
                  storage: 500Gi
              storageClassName: local-storage
              volumeMode: Block
              accessModes:
                - ReadWriteOnce
```

Verify encryption is active on OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree
# Check that OSDs are using dmcrypt
kubectl -n rook-ceph exec -it <osd-pod> -- \
  ls /dev/mapper/ | grep ceph
```

## Key Management with Vault

For compliance frameworks requiring HSM or external KMS, integrate HashiCorp Vault:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com:8200
        VAULT_BACKEND_PATH: secret/ceph
        VAULT_SECRET_ENGINE: kv
      tokenSecretName: ceph-vault-token
```

Create the Vault token secret:

```bash
kubectl -n rook-ceph create secret generic ceph-vault-token \
  --from-literal=token=<vault-token>
```

## In-Transit Encryption with Messenger v2

Encrypt all communication between Ceph daemons using the secure messenger mode:

```bash
ceph config set global ms_cluster_mode secure
ceph config set global ms_service_mode secure
ceph config set global ms_client_mode secure

# Verify messenger encryption is active
ceph config get mon ms_cluster_mode
# Expected output: secure
```

## RGW TLS Configuration

Configure HTTPS-only access for S3-compatible storage:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    securePort: 443
    sslCertificateRef: rgw-tls-cert
    instances: 2
```

Ensure the TLS certificate meets compliance requirements (minimum TLS 1.2, strong cipher suites):

```bash
ceph config set client.rgw rgw_crypt_require_ssl true
```

## FIPS 140-2 Compliance

For FIPS compliance, ensure the underlying OS uses FIPS-approved algorithms. Ceph will use the system's OpenSSL in FIPS mode:

```bash
# Enable FIPS mode on the host
fips-mode-setup --enable

# Verify Ceph is using FIPS-approved ciphers
openssl ciphers -v 'HIGH:!aNULL' | grep -v "SSLv3\|RC4\|MD5"
```

## Verifying Encryption Status

```bash
# Check OSD encryption via dmcrypt devices
kubectl -n rook-ceph exec -it <osd-pod> -- \
  ls /dev/mapper/ | grep ceph

# Check encryption metadata for a specific OSD
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata 0 | grep -i dmcrypt
```

## Summary

Ceph provides layered encryption through LUKS-based OSD encryption, Messenger v2 secure mode, and TLS for RGW connections. For compliance frameworks requiring external key management, Vault integration ensures keys are managed separately from the data. Regularly verifying encryption status with health checks and cipher audits is essential for maintaining compliance.
