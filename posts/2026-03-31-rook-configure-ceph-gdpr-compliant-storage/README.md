# How to Configure Ceph for GDPR-Compliant Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, GDPR, Compliance, Privacy, Encryption

Description: Configure Rook-managed Ceph to meet GDPR requirements including data encryption, geographic data residency, right to erasure, and access audit trails.

---

The General Data Protection Regulation (GDPR) requires organizations handling EU personal data to implement appropriate technical measures. Ceph can be configured to support GDPR obligations including encryption, data residency, erasure, and audit logging.

## 1. Encryption for Personal Data at Rest

Enable OSD-level encryption in the Rook CephCluster spec:

```yaml
spec:
  storage:
    nodes:
    - name: "eu-node1"
      devices:
      - name: "sdb"
        config:
          encryptedDevice: "true"
    - name: "eu-node2"
      devices:
      - name: "sdc"
        config:
          encryptedDevice: "true"
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.internal.example.com:8200
        VAULT_BACKEND_PATH: secret/ceph-gdpr
      tokenSecretName: rook-vault-token
```

Enable per-object encryption in RGW for user data:

```bash
# Enable SSE-S3 by default on GDPR-scoped buckets
aws s3api put-bucket-encryption \
  --bucket user-data-eu \
  --endpoint-url https://rgw.example.com \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

## 2. Data Residency - Keep Data in EU

Use node labels to constrain Ceph OSDs to EU nodes:

```bash
kubectl label node eu-node1 topology.kubernetes.io/region=eu-west-1
kubectl label node eu-node2 topology.kubernetes.io/region=eu-west-1
```

Configure the CephCluster to use only EU-labeled nodes:

```yaml
spec:
  placement:
    osd:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: topology.kubernetes.io/region
              operator: In
              values:
              - eu-west-1
              - eu-central-1
```

Verify that multisite replication, if configured, only includes EU zones:

```bash
# List all zones and verify only EU endpoints are present
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone list

# Inspect the zonegroup to confirm no non-EU zones are configured
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup get
```

## 3. Right to Erasure (Article 17)

Implement the ability to delete all personal data for a user:

```bash
#!/bin/bash
USER_ID=$1

# Delete all objects in the user's bucket
aws s3 rm s3://user-data-eu/${USER_ID}/ \
  --recursive \
  --endpoint-url https://rgw.example.com

# Delete the bucket itself
aws s3 rb s3://user-data-eu-${USER_ID} \
  --endpoint-url https://rgw.example.com

# Remove the RGW user account
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user rm --uid=${USER_ID} --purge-data
```

## 4. Data Access Audit Log

Enable ops logging to record all data access:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_enable_ops_log true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_ops_log_rados true
```

## 5. Enforce TLS for Data in Transit

Require HTTPS for all RGW connections:

```yaml
spec:
  gateway:
    securePort: 443
    sslCertificateRef: rgw-eu-tls
    instances: 2
```

Redirect HTTP to HTTPS:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_frontend_defaults "beast ssl_certificate=/etc/ceph/server.crt ssl_private_key=/etc/ceph/server.key"
```

## 6. Data Minimization and Retention

Set lifecycle policies to automatically delete personal data after retention periods expire:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket user-data-eu \
  --endpoint-url https://rgw.example.com \
  --lifecycle-configuration \
  '{"Rules":[{"ID":"gdpr-retention","Status":"Enabled","Expiration":{"Days":730},"Filter":{"Prefix":""}}]}'
```

## Summary

GDPR compliance with Ceph requires encryption at rest and in transit, geographic data residency controls through node affinity, a documented erasure procedure using `radosgw-admin user rm --purge-data`, access audit logs via RGW ops logging, and automated lifecycle policies for data minimization. Document each control with evidence of configuration to demonstrate compliance during audits.
