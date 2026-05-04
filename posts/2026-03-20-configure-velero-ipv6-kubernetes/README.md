# How to Configure Velero with IPv6 Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, IPv6, Backup, Disaster Recovery, S3, MinIO

Description: Configure Velero for backup and disaster recovery of IPv6-enabled Kubernetes clusters, including cluster backup, namespace backup, and restoration procedures.

---

Velero is the standard tool for Kubernetes cluster backup and disaster recovery. In IPv6-enabled clusters, Velero itself runs as pods and inherits cluster networking, but the backup storage configuration requires special attention for IPv6 endpoints.

## Prerequisites

```bash
# Verify IPv6 Kubernetes cluster is running

kubectl get nodes -o wide
# Check for IPv6 addresses in the INTERNAL-IP column

# Verify pod IPv6 connectivity
kubectl run test --rm -it --image=alpine -- ping6 -c 3 2001:4860:4860::8888
```

## Installing Velero CLI

```bash
# Download Velero CLI
VERSION="v1.12.0"
wget https://github.com/vmware-tanzu/velero/releases/download/$VERSION/velero-$VERSION-linux-amd64.tar.gz
tar xvf velero-$VERSION-linux-amd64.tar.gz
sudo mv velero-$VERSION-linux-amd64/velero /usr/local/bin/

velero version --client-only
```

## Setting Up MinIO as S3 Backend on IPv6

For clusters without AWS, use MinIO as the backup storage backend:

```yaml
# minio-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: velero
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
        - name: minio
          image: minio/minio:latest
          args:
            - server
            - /data
            - --address
            # Listen on IPv6
            - "[::]:9000"
          env:
            - name: MINIO_ROOT_USER
              value: "minioAdmin"
            - name: MINIO_ROOT_PASSWORD
              value: "minioPassword123"
          ports:
            - containerPort: 9000
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: minio-pvc
```

## Installing Velero with MinIO (S3-Compatible)

```bash
# Create credentials file
cat > /tmp/credentials-velero << 'EOF'
[default]
aws_access_key_id = minioAdmin
aws_secret_access_key = minioPassword123
EOF

# Install Velero with S3-compatible backend
# Use IPv6 MinIO endpoint
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket velero-backups \
  --secret-file /tmp/credentials-velero \
  --use-volume-snapshots=false \
  --backup-location-config \
    region=minio,s3ForcePathStyle=true,s3Url=http://[2001:db8::1]:9000 \
  --image velero/velero:v1.12.0

# Verify installation
kubectl get pods -n velero
velero backup-location get
```

## Creating Cluster Backups

```bash
# Create a full cluster backup
velero backup create cluster-backup-$(date +%Y%m%d) \
  --include-namespaces "*" \
  --ttl 720h

# Backup specific namespaces
velero backup create production-backup \
  --include-namespaces production,staging

# Check backup status
velero backup describe cluster-backup-20260320
velero backup logs cluster-backup-20260320

# List all backups
velero backup get
```

## Scheduled Backups

```bash
# Create a schedule for daily backups at 2am
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces "*" \
  --ttl 168h  # 7 days retention

# List schedules
velero schedule get
```

## Restoring from Backup in IPv6 Cluster

```bash
# List available backups
velero backup get

# Restore a full cluster backup
velero restore create \
  --from-backup cluster-backup-20260320

# Restore specific namespaces
velero restore create \
  --from-backup cluster-backup-20260320 \
  --include-namespaces production

# Check restore status
velero restore get
velero restore describe <restore-name>
velero restore logs <restore-name>
```

## Verifying IPv6 Backup Storage Connectivity

```bash
# Test connectivity from Velero pod to MinIO over IPv6
kubectl exec -n velero \
  $(kubectl get pod -n velero -l app.kubernetes.io/name=velero -o name | head -1) \
  -- curl -6 http://[2001:db8::1]:9000

# Check Velero logs for connectivity issues
kubectl logs -n velero \
  -l app.kubernetes.io/name=velero \
  --tail=100 | grep -i "error\|ipv6\|connect"
```

## Backup Location for AWS S3 with IPv6

For AWS S3 (which supports IPv6 via dualstack endpoint):

```bash
velero backup-location create aws-s3 \
  --provider aws \
  --bucket my-velero-backups \
  --config \
    region=us-east-1,\
    s3Url=https://s3.dualstack.us-east-1.amazonaws.com
```

Velero integrates seamlessly with IPv6 Kubernetes clusters, and using IPv6-capable S3-compatible storage backends ensures complete disaster recovery capability for IPv6-native Kubernetes deployments.
