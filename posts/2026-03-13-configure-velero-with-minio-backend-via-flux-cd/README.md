# How to Configure Velero with MinIO Backend via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, MinIO, On-Premises, GitOps, Kubernetes, Backup, Self-Hosted

Description: Configure Velero to use self-hosted MinIO for backup storage with Flux CD for on-premises or air-gapped Kubernetes backup.

---

## Introduction

MinIO is an S3-compatible object storage server that can run on Kubernetes, bare metal, or virtual machines. It is ideal for environments where you cannot or do not want to use a public cloud object store: on-premises data centers, air-gapped environments, or cost-sensitive deployments that want to avoid cloud egress fees.

Velero's AWS plugin works with any S3-compatible storage, including MinIO. By pointing the plugin at a MinIO endpoint, you get the same Velero backup capabilities as with S3, but with self-hosted storage. This guide covers deploying MinIO on Kubernetes with Flux and configuring Velero to use it as the backup backend.

## Prerequisites

- Kubernetes cluster with Velero installed
- Flux CD bootstrapped on the cluster
- Persistent storage available for MinIO (at least 100GB recommended)
- `kubectl` and `flux` CLIs installed

## Step 1: Deploy MinIO with Flux HelmRelease

```yaml
# infrastructure/minio/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: minio-operator
  namespace: flux-system
spec:
  url: https://operator.min.io/
  interval: 10m

---
# infrastructure/minio/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: minio
  namespace: minio
spec:
  interval: 10m
  chart:
    spec:
      chart: minio
      version: "5.x"
      sourceRef:
        kind: HelmRepository
        name: minio-operator
        namespace: flux-system
  values:
    # MinIO root credentials (encrypt with SOPS before committing)
    rootUser: minioadmin
    rootPassword: minioadmin-secret

    # Persistence configuration
    persistence:
      enabled: true
      size: 500Gi
      storageClass: standard

    # Deploy with 4 replicas for distributed mode
    replicas: 4
    mode: distributed

    # Resource configuration
    resources:
      requests:
        memory: 1Gi
        cpu: 250m
      limits:
        memory: 4Gi
        cpu: 1000m

    # Service configuration
    service:
      type: ClusterIP
      port: 9000

    # Console access
    consoleService:
      type: ClusterIP
      port: 9001

    # Create default buckets on startup
    buckets:
      - name: velero-backups
        policy: none
        purge: false
      - name: velero-backups-staging
        policy: none
        purge: false
```

## Step 2: Create MinIO Credentials for Velero

```bash
# Get the MinIO root credentials (or create a dedicated user)
# First, port-forward to the MinIO console
kubectl port-forward svc/minio-console -n minio 9001:9001

# Access the console at http://localhost:9001
# Create a service account for Velero with the policy below

# Or use the mc CLI
# Install mc (MinIO Client)
brew install minio/stable/mc

# Configure mc with the MinIO server
kubectl port-forward svc/minio -n minio 9000:9000 &
mc alias set myminio http://localhost:9000 minioadmin minioadmin-secret

# Create a Velero user with limited permissions
mc admin user add myminio velero-user velero-secret-key

# Create and attach a policy for the velero-backups bucket
cat > /tmp/velero-minio-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads"
      ],
      "Resource": "arn:aws:s3:::velero-backups"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListMultipartUploadParts",
        "s3:AbortMultipartUpload"
      ],
      "Resource": "arn:aws:s3:::velero-backups/*"
    }
  ]
}
EOF

mc admin policy create myminio velero-policy /tmp/velero-minio-policy.json
mc admin policy attach myminio velero-policy --user velero-user
```

## Step 3: Create the Velero MinIO Credentials Secret

```bash
# Create credentials file for Velero
cat > /tmp/velero-minio-credentials.txt << 'EOF'
[default]
aws_access_key_id=velero-user
aws_secret_access_key=velero-secret-key
EOF

kubectl create secret generic velero-minio-credentials \
  --from-file=cloud=/tmp/velero-minio-credentials.txt \
  --namespace velero

rm /tmp/velero-minio-credentials.txt
```

## Step 4: Configure Velero HelmRelease for MinIO

```yaml
# infrastructure/velero/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: velero
  namespace: velero
spec:
  interval: 10m
  chart:
    spec:
      chart: velero
      version: "6.x"
      sourceRef:
        kind: HelmRepository
        name: vmware-tanzu
        namespace: flux-system
  values:
    initContainers:
      - name: velero-plugin-for-aws
        image: velero/velero-plugin-for-aws:v1.9.0
        volumeMounts:
          - mountPath: /target
            name: plugins

    credentials:
      useSecret: true
      existingSecret: velero-minio-credentials

    configuration:
      backupStorageLocation:
        - name: primary
          provider: aws
          bucket: velero-backups
          config:
            region: "us-east-1"  # Required but unused for MinIO
            # Point to the internal MinIO service
            s3Url: http://minio.minio.svc.cluster.local:9000
            publicUrl: http://minio.minio.svc.cluster.local:9000
            # MinIO does not use path-style access by default
            s3ForcePathStyle: "true"
            # Disable SSL for internal cluster communication
            # (enable if MinIO has TLS configured)
            insecureSkipTLSVerify: "false"
          default: true

    # Note: Volume snapshots require a cloud provider plugin
    # For on-premises, use node-agent with Restic for PV backups
    deployNodeAgent: true
    nodeAgent:
      podVolumePath: /var/lib/kubelet/pods
      privileged: true
```

## Step 5: Create Flux Kustomizations

```yaml
# clusters/my-cluster/infrastructure/minio.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: minio
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/minio
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: minio
      namespace: minio

---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: velero
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/velero
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: minio
```

## Step 6: Verify and Test

```bash
# Check MinIO is running
kubectl get pods -n minio

# Verify Velero BSL status
kubectl get backupstoragelocation -n velero

# Create a test backup
velero backup create minio-test \
  --storage-location primary \
  --include-namespaces default \
  --ttl 1h \
  --wait

# Verify backup in MinIO
mc ls myminio/velero-backups/backups/minio-test/
```

## Best Practices

- Use distributed MinIO mode (4+ nodes) for production to avoid single points of failure and enable erasure coding for data protection.
- Enable MinIO TLS using a self-signed certificate or cert-manager. Use `insecureSkipTLSVerify: false` with a proper CA certificate instead of disabling TLS verification.
- Create a dedicated MinIO user for Velero with the minimum necessary permissions. Avoid using the root user.
- Configure MinIO lifecycle rules to automatically delete old backup objects to prevent unbounded storage growth.
- For on-premises PV backup, use Velero's file system backup mode (node-agent with Restic) since cloud volume snapshots are not available in on-premises environments.

## Conclusion

Velero is now configured with self-hosted MinIO as the backup backend, managed entirely through Flux CD. This setup is ideal for on-premises clusters, air-gapped environments, and deployments where cloud object storage is not an option. MinIO's S3 compatibility means Velero works identically whether the backend is MinIO or AWS S3, providing a consistent backup experience across environments.
