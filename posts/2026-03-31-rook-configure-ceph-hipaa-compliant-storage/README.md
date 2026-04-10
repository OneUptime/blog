# How to Configure Ceph for HIPAA-Compliant Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, HIPAA, Compliance, Encryption, Security

Description: Configure Rook-managed Ceph storage for HIPAA compliance by enabling encryption at rest, enforcing access controls, enabling audit logging, and establishing data retention policies.

---

HIPAA (Health Insurance Portability and Accountability Act) requires strict controls over Protected Health Information (PHI). When storing PHI in Ceph, several technical safeguards must be implemented: encryption, access controls, audit logging, and integrity verification.

## 1. Enable Encryption at Rest

Encrypt all OSD data using the `encryptedDevice` option in Rook:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
    - name: "node1"
      devices:
      - name: "sdb"
        config:
          encryptedDevice: "true"
    - name: "node2"
      devices:
      - name: "sdb"
        config:
          encryptedDevice: "true"
```

Store encryption keys in a KMS (Key Management System):

```yaml
spec:
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com:8200
        VAULT_BACKEND_PATH: secret/ceph
        VAULT_SECRET_ENGINE: kv
      tokenSecretName: rook-vault-token
```

## 2. Enable TLS for All Ceph Communications

Configure TLS for the RGW endpoint:

```yaml
spec:
  gateway:
    securePort: 443
    sslCertificateRef: rgw-tls-cert
    instances: 2
```

Create the TLS certificate Secret:

```bash
kubectl -n rook-ceph create secret tls rgw-tls-cert \
  --cert=tls.crt \
  --key=tls.key
```

## 3. Configure HIPAA-Compliant Access Controls

Create a dedicated CephX key for PHI access with minimal permissions:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.phi-service \
  mon 'allow r' \
  osd 'allow rw pool=phi-data'
```

Enable S3 server-side encryption for RGW buckets containing PHI:

```bash
# Create PHI bucket with SSE enabled
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
aws s3api create-bucket \
  --bucket phi-data \
  --endpoint-url https://rgw.example.com

aws s3api put-bucket-encryption \
  --bucket phi-data \
  --endpoint-url https://rgw.example.com \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

## 4. Enable Audit Logging

Enable comprehensive audit logging for PHI access:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_enable_ops_log true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_ops_log_rados true
```

Configure bucket-level access logging:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin bucket logging enable \
  --bucket=phi-data \
  --target-bucket=phi-audit-logs
```

## 5. Set Data Retention Policies

Create the audit logs bucket with object lock enabled, then configure a default retention policy:

```bash
aws s3api create-bucket \
  --bucket phi-audit-logs \
  --endpoint-url https://rgw.example.com \
  --object-lock-enabled-for-bucket

aws s3api put-object-lock-configuration \
  --bucket phi-audit-logs \
  --endpoint-url https://rgw.example.com \
  --object-lock-configuration \
  '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"COMPLIANCE","Days":2555}}}'
```

## 6. Enable Network Isolation

Use Kubernetes NetworkPolicy to restrict Ceph access to authorized namespaces:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ceph-phi-access
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-rgw
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          phi-access: "true"
    ports:
    - port: 443
```

## Summary

HIPAA-compliant Ceph storage requires encryption at rest (via `encryptedDevice` and KMS), encryption in transit (TLS on RGW), granular CephX access controls, comprehensive audit logging with immutable retention, and network isolation. Document all these controls and their configurations as evidence for HIPAA Technical Safeguard requirements.
