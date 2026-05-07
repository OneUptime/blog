# How to Back Up Rancher to MinIO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Backup, MinIO

Description: Learn how to deploy MinIO and configure the Rancher Backup Operator to store backups in a self-hosted MinIO instance.

MinIO is a high-performance, S3-compatible object storage system that you can run on your own infrastructure. It is an excellent choice for organizations that want to keep backup data on-premises or within their private cloud. This guide covers deploying MinIO and configuring Rancher backups to use it.

## Prerequisites

- Rancher v2.5 or later with the Backup Operator installed
- kubectl access with cluster admin privileges
- Helm 3 installed
- Persistent storage available in your cluster

## Step 1: Deploy MinIO Using Helm

Add the MinIO Helm repository and install MinIO:

```bash
helm repo add minio https://charts.min.io/
helm repo update
```

Create a values file for the MinIO installation. Save as `minio-values.yaml`:

```yaml
mode: standalone
persistence:
  enabled: true
  size: 50Gi
resources:
  requests:
    memory: 512Mi
    cpu: 250m
rootUser: minioadmin
rootPassword: minioadmin123
buckets:
  - name: rancher-backups
    policy: none
    purge: false
consoleIngress:
  enabled: false
```

Install MinIO:

```bash
helm install minio minio/minio \
  -n minio-system \
  --create-namespace \
  -f minio-values.yaml
```

Verify MinIO is running:

```bash
kubectl get pods -n minio-system
```

## Step 2: Access the MinIO Console

Forward the MinIO console port to verify the installation:

```bash
kubectl port-forward svc/minio-console -n minio-system 9001:9001
```

Open `http://localhost:9001` in your browser and log in with the credentials you set.

## Step 3: Create a Dedicated Bucket

If you did not create the bucket via Helm values, create it using the MinIO client:

```bash
kubectl run minio-mc --rm -it --image=minio/mc --restart=Never -- \
  sh -c '
    mc alias set myminio http://minio.minio-system.svc:9000 minioadmin minioadmin123
    mc mb myminio/rancher-backups
    mc ls myminio/
  '
```

## Step 4: Create a Dedicated MinIO User

For security, create a dedicated user for Rancher backups instead of using the root credentials:

```bash
kubectl run minio-mc --rm -it --image=minio/mc --restart=Never -- \
  sh -c '
    mc alias set myminio http://minio.minio-system.svc:9000 minioadmin minioadmin123
    mc admin user add myminio rancher-backup backuppassword123
    mc admin policy attach myminio readwrite --user rancher-backup
  '
```

## Step 5: Create the Credentials Secret

Store the MinIO credentials as a Kubernetes secret:

```bash
kubectl create secret generic minio-creds \
  -n cattle-resources-system \
  --from-literal=accessKey=rancher-backup \
  --from-literal=secretKey=backuppassword123
```

## Step 6: Create a Backup Targeting MinIO

Create the Backup resource pointing to your MinIO instance:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-backup-minio
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 10
  storageLocation:
    s3:
      bucketName: rancher-backups
      folder: backups
      endpoint: minio.minio-system.svc:9000
      insecureTLSSkipVerify: true
      credentialSecretName: minio-creds
      credentialSecretNamespace: cattle-resources-system
```

After enabling TLS in Step 8, apply the backup:

```bash
kubectl apply -f backup-minio.yaml
```

## Step 7: Set Up Scheduled Backups

For automated daily backups to MinIO:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-daily-minio-backup
spec:
  resourceSetName: rancher-resource-set-full
  retentionCount: 30
  schedule: "0 2 * * *"
  storageLocation:
    s3:
      bucketName: rancher-backups
      folder: daily
      endpoint: minio.minio-system.svc:9000
      insecureTLSSkipVerify: true
      credentialSecretName: minio-creds
      credentialSecretNamespace: cattle-resources-system
```

## Step 8: Enable TLS for MinIO

Before applying the Backup resource, enable TLS on MinIO. Generate a TLS certificate and create a secret:

```bash
kubectl create secret generic minio-tls \
  -n minio-system \
  --from-file=public.crt=tls.crt \
  --from-file=private.key=tls.key
```

Update the MinIO Helm values to enable TLS:

```yaml
tls:
  enabled: true
  certSecret: minio-tls
```

Upgrade the Helm release:

```bash
helm upgrade minio minio/minio \
  -n minio-system \
  -f minio-values.yaml
```

If you are using a self-signed or private CA certificate, keep `insecureTLSSkipVerify: true` or provide `endpointCA`. When the certificate is trusted by the Rancher Backup Operator, you can remove `insecureTLSSkipVerify`.

## Step 9: Verify Backups

Check the backup status:

```bash
kubectl get backups.resources.cattle.io rancher-backup-minio -o yaml
```

List objects in the MinIO bucket:

```bash
kubectl run minio-mc --rm -it --image=minio/mc --restart=Never -- \
  sh -c '
    mc --insecure alias set myminio https://minio.minio-system.svc:9000 rancher-backup backuppassword123
    mc ls myminio/rancher-backups/backups/
  '
```

## Step 10: Configure MinIO for High Availability

For production workloads, deploy MinIO in distributed mode with multiple replicas:

```yaml
mode: distributed
replicas: 4
persistence:
  enabled: true
  size: 100Gi
resources:
  requests:
    memory: 1Gi
    cpu: 500m
```

This provides data redundancy and higher availability for your backup storage.

## Troubleshooting

### Connection Refused

Verify the MinIO service is accessible from the cattle-resources-system namespace:

```bash
kubectl run test-conn -n cattle-resources-system --rm -it --image=minio/mc --restart=Never -- \
  sh -c '
    mc --insecure alias set myminio https://minio.minio-system.svc:9000 minioadmin minioadmin123
    mc ls myminio/
  '
```

### Bucket Not Found

Ensure the bucket name matches exactly. Bucket names are case-sensitive.

### Disk Space Issues

Monitor MinIO storage usage and expand the PersistentVolume if needed:

```bash
kubectl exec -n minio-system \
  "$(kubectl get pod -n minio-system -l app=minio,release=minio -o jsonpath='{.items[0].metadata.name}')" -- \
  df -h /export
```

## Conclusion

MinIO provides a self-hosted, S3-compatible backup target for Rancher that keeps your data within your infrastructure. With TLS, dedicated users, and distributed mode, you can build a production-ready backup storage solution that does not depend on external cloud services.
