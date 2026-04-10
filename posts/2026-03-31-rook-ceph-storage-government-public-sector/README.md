# How to Configure Ceph Storage for Government and Public Sector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Government, Compliance, FedRAMP, FISMA, Encryption, Air Gap

Description: Configure Rook/Ceph storage for government and public sector workloads with FedRAMP, FISMA, and NIST compliance, air-gapped deployments, and data sovereignty requirements.

---

## Government Storage Requirements

Government IT storage must address:
- **Compliance**: FedRAMP, FISMA, NIST SP 800-53, CMMC
- **Air-gapped deployment**: No internet connectivity
- **Data sovereignty**: Data must remain within jurisdiction
- **FIPS 140-2 encryption**: Cryptographic modules must be FIPS-validated
- **Access control**: Role-based access with CAC/PIV integration
- **Audit logging**: Complete, tamper-proof audit trails

## Deploying Rook in an Air-Gapped Environment

In air-gapped environments, images must be mirrored to an internal registry:

```bash
# Mirror Rook and Ceph images to internal registry
INTERNAL_REGISTRY="registry.gov.internal"
ROOK_VERSION="v1.16.0"
CEPH_VERSION="v19.2.0"

# Tag and push Rook operator
docker pull rook/ceph:${ROOK_VERSION}
docker tag rook/ceph:${ROOK_VERSION} ${INTERNAL_REGISTRY}/rook/ceph:${ROOK_VERSION}
docker push ${INTERNAL_REGISTRY}/rook/ceph:${ROOK_VERSION}

# Update operator deployment to use internal registry
helm install rook-ceph rook-ceph/rook-ceph \
  --set image.repository=${INTERNAL_REGISTRY}/rook/ceph \
  --set csi.cephcsi.repository=${INTERNAL_REGISTRY}/cephcsi/cephcsi \
  --set csi.cephcsi.tag=v3.13.0
```

## FIPS-Compliant Encryption Configuration

Configure Vault with FIPS 140-2 compliant keys for KMS integration in the CephCluster CRD:

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
        VAULT_ADDR: https://vault.gov.internal:8200
        VAULT_SECRET_ENGINE: kv
        VAULT_BACKEND_PATH: rook-ceph
        VAULT_AUTH_METHOD: kubernetes
        VAULT_AUTH_KUBERNETES_ROLE: rook-ceph-role
        VAULT_CACERT: /etc/vault-tls/ca.crt
```

## Network Encryption (Msgr2)

Enable encryption for all Ceph daemon communication:

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
      requireMsgr2: true
```

## RGW for FedRAMP Data Storage

Configure RGW with TLS and bucket policies for data classification:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: gov-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    securePort: 443
    sslCertificateRef: gov-tls-cert
    instances: 3
```

Apply bucket policies to enforce classification boundaries:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::classified-data/*",
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

## Audit Logging Configuration

Enable comprehensive RGW access logging using the S3 Bucket Logging API:

```bash
# Enable per-bucket logging via the S3 API
aws --endpoint-url https://rgw.gov.internal \
  s3api put-bucket-logging \
  --bucket classified-data \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "audit-logs",
      "TargetPrefix": "classified-data/"
    }
  }'

# Verify logging configuration
aws --endpoint-url https://rgw.gov.internal \
  s3api get-bucket-logging --bucket classified-data
```

## RBAC for Multi-Agency Access

Use RGW IAM to create per-agency users with scoped permissions:

```bash
# Create an agency-specific user
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid agency-dod-user \
  --display-name "DoD Agency User" \
  --max-buckets 50

# Apply agency-scoped quota
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin quota set \
  --quota-scope user \
  --uid agency-dod-user \
  --max-size 10T

# Enable the quota (required after setting it)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin quota enable \
  --quota-scope user \
  --uid agency-dod-user
```

## Summary

Rook/Ceph meets government storage requirements through air-gapped image mirroring, FIPS-compliant encryption via Vault KMS, Msgr2 wire encryption, S3 bucket policies for data classification enforcement, and comprehensive RGW access logging for audit trails. The platform's open-source nature also allows organizations to perform their own security reviews, which is increasingly required for FedRAMP authorization.
