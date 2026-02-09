# How to Configure Velero with MinIO as an S3-Compatible Backup Storage Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, MinIO, Self-Hosted Storage

Description: Learn how to configure Velero with MinIO as an S3-compatible backup storage backend, enabling self-hosted, cost-effective backup storage for Kubernetes disaster recovery without cloud provider dependencies.

---

While cloud object storage services like AWS S3 offer convenience, they come with ongoing costs and create cloud vendor dependencies. MinIO provides an S3-compatible object storage solution that runs in your own infrastructure, giving you control over backup storage while maintaining compatibility with Velero's S3 integration.

## Why Use MinIO for Velero Backups

MinIO offers several advantages:

- No recurring cloud storage costs
- Complete control over backup data
- No internet bandwidth charges for backups
- Works in air-gapped environments
- Compatible with Velero's AWS S3 plugin
- Can run on-premises or in different cloud regions

This makes MinIO ideal for organizations with strict data residency requirements or those looking to reduce cloud costs.

## Installing MinIO on Kubernetes

Deploy MinIO using the official operator:

```bash
# Add MinIO operator repository
kubectl apply -f https://github.com/minio/operator/releases/latest/download/operator.yaml

# Wait for operator to be ready
kubectl wait --for=condition=ready pod -l name=minio-operator -n minio-operator --timeout=300s
```

Create a MinIO tenant for Velero backups:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: minio-tenant
---
apiVersion: v1
kind: Secret
metadata:
  name: minio-creds
  namespace: minio-tenant
type: Opaque
stringData:
  accesskey: velero-backup-user
  secretkey: changeme-strong-password-here
---
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: velero-storage
  namespace: minio-tenant
spec:
  image: minio/minio:latest
  imagePullPolicy: IfNotPresent
  pools:
  - servers: 4
    name: pool-0
    volumesPerServer: 4
    volumeClaimTemplate:
      metadata:
        name: data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
        storageClassName: standard
  mountPath: /export
  requestAutoCert: false
  credsSecret:
    name: minio-creds
  env:
  - name: MINIO_BROWSER
    value: "on"
  - name: MINIO_STORAGE_CLASS_STANDARD
    value: "EC:2"
```

Apply the configuration:

```bash
kubectl apply -f minio-tenant.yaml

# Wait for MinIO to be ready
kubectl wait --for=condition=ready pod -l v1.min.io/tenant=velero-storage -n minio-tenant --timeout=600s
```

## Creating Velero Backup Bucket

Access MinIO and create the backup bucket:

```bash
# Port-forward to MinIO console
kubectl port-forward svc/velero-storage-console -n minio-tenant 9001:9001

# Or use MinIO client
kubectl run mc-client --image=minio/mc --rm -it --restart=Never -- /bin/bash

# Inside the mc-client pod
mc alias set minio http://velero-storage-hl.minio-tenant.svc.cluster.local:9000 velero-backup-user changeme-strong-password-here

# Create bucket
mc mb minio/velero-backups

# Set versioning (recommended)
mc version enable minio/velero-backups

# Set lifecycle policy
mc ilm add --expiry-days 30 minio/velero-backups
```

## Configuring Velero to Use MinIO

Create a credentials file for Velero:

```bash
cat > credentials-minio <<EOF
[default]
aws_access_key_id = velero-backup-user
aws_secret_access_key = changeme-strong-password-here
EOF
```

Install Velero with MinIO configuration:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-backups \
  --secret-file ./credentials-minio \
  --backup-location-config \
    region=minio,s3ForcePathStyle="true",s3Url=http://velero-storage-hl.minio-tenant.svc.cluster.local:9000 \
  --use-volume-snapshots=false
```

Key configuration parameters:

- `s3ForcePathStyle="true"`: Required for MinIO compatibility
- `s3Url`: Points to MinIO service endpoint
- `region=minio`: Any value works, MinIO doesn't use regions like AWS

## Verifying Velero-MinIO Integration

Test the configuration:

```bash
# Check backup storage location
velero backup-location get

# Expected output
NAME      PROVIDER   BUCKET/PREFIX     PHASE       LAST VALIDATED
default   aws        velero-backups    Available   2026-02-09 10:30:00 +0000 UTC

# Create a test backup
velero backup create minio-test \
  --include-namespaces default \
  --wait

# Verify backup completed
velero backup describe minio-test
```

Check that data appears in MinIO:

```bash
# List objects in MinIO
kubectl run mc-client --image=minio/mc --rm -it --restart=Never -- \
  mc ls minio/velero-backups/backups/
```

## Configuring MinIO for High Availability

For production use, configure MinIO with proper redundancy:

```yaml
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: velero-storage-ha
  namespace: minio-tenant
spec:
  image: minio/minio:latest
  pools:
  - servers: 4  # 4 MinIO servers
    name: pool-0
    volumesPerServer: 4  # 4 drives per server = 16 total drives
    volumeClaimTemplate:
      metadata:
        name: data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 500Gi
        storageClassName: fast-ssd
  mountPath: /export
  credsSecret:
    name: minio-creds
  env:
  - name: MINIO_STORAGE_CLASS_STANDARD
    value: "EC:4"  # Erasure coding with 4 parity drives
  requestAutoCert: false
  resources:
    requests:
      memory: 4Gi
      cpu: 2
    limits:
      memory: 8Gi
      cpu: 4
```

This configuration provides:
- 4 MinIO server instances for redundancy
- 16 total drives (4 per server)
- Erasure coding with 4 parity drives (can lose 4 drives)
- 500GB per drive = 6TB usable with EC:4

## Enabling MinIO TLS

Secure MinIO traffic with TLS:

```bash
# Create TLS certificate
openssl req -new -x509 -days 365 -nodes \
  -out minio.crt -keyout minio.key \
  -subj "/CN=velero-storage-hl.minio-tenant.svc.cluster.local"

# Create Kubernetes secret
kubectl create secret tls minio-tls \
  --cert=minio.crt \
  --key=minio.key \
  -n minio-tenant
```

Update tenant to use TLS:

```yaml
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: velero-storage
  namespace: minio-tenant
spec:
  # ... other configuration ...
  requestAutoCert: false
  externalCertSecret:
  - name: minio-tls
    type: kubernetes.io/tls
```

Update Velero to use HTTPS:

```bash
# Get certificate for Velero
kubectl get secret minio-tls -n minio-tenant -o jsonpath='{.data.ca\.crt}' | base64 -d > minio-ca.crt

# Create ConfigMap with CA certificate
kubectl create configmap minio-ca \
  --from-file=ca-bundle.crt=minio-ca.crt \
  -n velero

# Update Velero deployment
kubectl patch deployment velero -n velero --type=json \
  -p='[
    {
      "op": "add",
      "path": "/spec/template/spec/volumes/-",
      "value": {
        "name": "minio-ca",
        "configMap": {
          "name": "minio-ca"
        }
      }
    },
    {
      "op": "add",
      "path": "/spec/template/spec/containers/0/volumeMounts/-",
      "value": {
        "name": "minio-ca",
        "mountPath": "/etc/ssl/certs/minio-ca.crt",
        "subPath": "ca-bundle.crt"
      }
    }
  ]'

# Update backup storage location to use HTTPS
kubectl patch backupstoragelocation default -n velero --type=merge \
  -p='{"spec":{"config":{"s3Url":"https://velero-storage-hl.minio-tenant.svc.cluster.local:9000"}}}'
```

## Setting Up MinIO Monitoring

Monitor MinIO health and performance:

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: minio-metrics
  namespace: minio-tenant
spec:
  selector:
    matchLabels:
      v1.min.io/tenant: velero-storage
  endpoints:
  - port: minio
    path: /minio/v2/metrics/cluster
    interval: 30s
```

Key metrics to monitor:

```promql
# MinIO capacity usage
minio_cluster_capacity_usable_free_bytes / minio_cluster_capacity_usable_total_bytes

# Request rate
rate(minio_s3_requests_total[5m])

# Error rate
rate(minio_s3_requests_errors_total[5m])

# Drive status
minio_cluster_drive_offline_total
```

## Backing Up MinIO Data

MinIO stores backup data, but MinIO itself needs backup:

```bash
# Export MinIO bucket with mc mirror
mc mirror minio/velero-backups /backup/minio-velero-backups

# Or use MinIO built-in site replication
mc admin replicate add minio-primary minio-backup \
  --replicate "arn:minio:replication::velero-backups:*"
```

## Troubleshooting MinIO-Velero Issues

Common issues and solutions:

**Issue**: Velero can't connect to MinIO
```bash
# Check MinIO service
kubectl get svc -n minio-tenant

# Test connectivity from Velero pod
kubectl exec -n velero deployment/velero -- \
  curl http://velero-storage-hl.minio-tenant.svc.cluster.local:9000/minio/health/live
```

**Issue**: S3 path style errors
```bash
# Ensure s3ForcePathStyle is set
kubectl get backupstoragelocation default -n velero -o yaml | grep s3ForcePathStyle
```

**Issue**: Authentication failures
```bash
# Verify credentials match
kubectl get secret cloud-credentials -n velero -o jsonpath='{.data.cloud}' | base64 -d
```

## Migrating from S3 to MinIO

Move existing S3 backups to MinIO:

```bash
# Sync S3 bucket to MinIO
mc mirror s3/velero-backups minio/velero-backups

# Update Velero configuration
velero backup-location set default \
  --bucket velero-backups \
  --config \
    region=minio,s3ForcePathStyle="true",s3Url=http://velero-storage-hl.minio-tenant.svc.cluster.local:9000

# Verify backups are accessible
velero backup get
```

## Using External MinIO

Connect Velero to MinIO running outside Kubernetes:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-backups \
  --secret-file ./credentials-minio \
  --backup-location-config \
    region=minio,s3ForcePathStyle="true",s3Url=https://minio.example.com:9000 \
  --use-volume-snapshots=false
```

## Cost Comparison: MinIO vs Cloud Storage

Calculate savings using MinIO:

```
AWS S3 Standard:
- Storage: $0.023/GB/month
- PUT requests: $0.005 per 1,000
- GET requests: $0.0004 per 1,000

100GB of backups with daily updates:
- Storage: 100GB * $0.023 = $2.30/month
- Writes: 30 * $0.005 = $0.15/month
- Total: ~$2.50/month = $30/year

MinIO on Kubernetes:
- Initial storage cost (hardware/cloud disk)
- No ongoing per-GB charges
- No request charges
- Break-even at ~12 months for 100GB
```

For larger deployments, MinIO becomes significantly more cost-effective.

## Conclusion

MinIO provides a powerful, self-hosted alternative to cloud object storage for Velero backups. By running MinIO in your Kubernetes cluster or on-premises infrastructure, you gain control over backup data, eliminate recurring storage costs, and remove cloud vendor dependencies.

Configure MinIO with proper redundancy and monitoring for production use. Enable TLS for secure communication, and implement regular backups of MinIO data itself to ensure complete disaster recovery capability.

Whether you're looking to reduce costs, meet data residency requirements, or operate in air-gapped environments, MinIO offers a production-ready S3-compatible storage solution for Velero backups.
