# How to Deploy Longhorn Storage with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, longhorn, kubernetes, storage, gitops, persistent volumes, cloud-native

Description: A step-by-step guide to deploying Longhorn distributed block storage on Kubernetes using Flux CD for GitOps-driven storage management.

---

## Introduction

Longhorn is a lightweight, reliable, and easy-to-use distributed block storage system for Kubernetes. Developed by Rancher Labs (now part of SUSE), Longhorn provides persistent storage with features like incremental snapshots, backups to external storage, and cross-cluster disaster recovery.

This guide demonstrates how to deploy and manage Longhorn using Flux CD, enabling a fully GitOps-driven storage solution for your Kubernetes clusters.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.25 or later) with at least three worker nodes
- Each node should have open-iscsi installed (required by Longhorn)
- Flux CD installed and bootstrapped on your cluster
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Preparing Nodes for Longhorn

Longhorn requires open-iscsi on every node. You can verify and install it using the following commands:

```bash
# Check if open-iscsi is installed on nodes
kubectl get nodes -o wide

# Deploy the Longhorn environment check script
kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/v1.6.0/scripts/environment_check.yaml

# View results
kubectl logs -l app=longhorn-environment-check -n default
```

## Repository Structure

```
clusters/
  my-cluster/
    storage/
      longhorn/
        namespace.yaml
        helmrepository.yaml
        helmrelease.yaml
        storageclass.yaml
        kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/storage/longhorn/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: longhorn-system
  labels:
    # Longhorn uses this label for component identification
    app.kubernetes.io/name: longhorn
    app.kubernetes.io/part-of: longhorn
```

## Step 2: Add the Longhorn Helm Repository

```yaml
# clusters/my-cluster/storage/longhorn/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: longhorn
  namespace: longhorn-system
spec:
  interval: 1h
  # Official Longhorn Helm chart repository
  url: https://charts.longhorn.io
```

## Step 3: Deploy Longhorn via HelmRelease

```yaml
# clusters/my-cluster/storage/longhorn/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: longhorn
  namespace: longhorn-system
spec:
  interval: 30m
  chart:
    spec:
      chart: longhorn
      version: "1.6.x"
      sourceRef:
        kind: HelmRepository
        name: longhorn
        namespace: longhorn-system
  timeout: 15m
  values:
    # Default settings for Longhorn
    defaultSettings:
      # Number of replicas for each volume
      defaultReplicaCount: 3
      # Percentage of storage to reserve on each node
      storageOverProvisioningPercentage: 200
      storageMinimalAvailablePercentage: 15
      # Automatic salvage of volumes after node failure
      autoSalvage: true
      # Create the default disk on tagged nodes only
      createDefaultDiskLabeledNodes: false
      # Default data path on the host
      defaultDataPath: /var/lib/longhorn/
      # Backup target configuration (S3 example)
      # backupTarget: s3://longhorn-backups@us-east-1/
      # backupTargetCredentialSecret: longhorn-s3-secret
      # Guaranteed engine manager CPU allocation
      guaranteedInstanceManagerCPU: 12
      # Node drain policy
      nodeDrainPolicy: block-if-contains-last-replica
    persistence:
      # Set Longhorn as the default storage class
      defaultClass: true
      defaultFsType: ext4
      defaultClassReplicaCount: 3
      reclaimPolicy: Delete
    # Longhorn UI configuration
    longhornUI:
      replicas: 2
    # Ingress for the Longhorn UI
    ingress:
      enabled: false
      # Uncomment and configure for external access
      # host: longhorn.example.com
      # tls: true
      # tlsSecret: longhorn-tls
    # Resource configuration for Longhorn components
    longhornManager:
      tolerations: []
      nodeSelector: {}
    longhornDriver:
      tolerations: []
      nodeSelector: {}
```

## Step 4: Create a Custom Storage Class

Define an additional storage class with specific retention policies.

```yaml
# clusters/my-cluster/storage/longhorn/storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-retain
  annotations:
    # Not the default storage class - the HelmRelease creates the default one
    storageclass.kubernetes.io/is-default-class: "false"
parameters:
  # Number of replicas for volumes using this class
  numberOfReplicas: "3"
  # Enable data locality for better performance
  dataLocality: "best-effort"
  # Filesystem type
  fsType: "ext4"
  # Recurring snapshot schedule (daily at midnight)
  recurringJobSelector: '[{"name": "daily-snapshot", "isGroup": false}]'
provisioner: driver.longhorn.io
reclaimPolicy: Retain
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

## Step 5: Configure Recurring Snapshots and Backups

```yaml
# clusters/my-cluster/storage/longhorn/recurring-jobs.yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-snapshot
  namespace: longhorn-system
spec:
  # Run daily at midnight
  cron: "0 0 * * *"
  task: snapshot
  groups: []
  # Keep the last 7 snapshots
  retain: 7
  concurrency: 2
  labels:
    type: daily
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: weekly-backup
  namespace: longhorn-system
spec:
  # Run weekly on Sunday at 2 AM
  cron: "0 2 * * 0"
  task: backup
  groups: []
  # Keep the last 4 backups
  retain: 4
  concurrency: 1
  labels:
    type: weekly
```

## Step 6: Create the Kustomization

```yaml
# clusters/my-cluster/storage/longhorn/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
  - storageclass.yaml
  - recurring-jobs.yaml
```

## Step 7: Create the Flux Kustomization

```yaml
# clusters/my-cluster/storage/longhorn-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: longhorn
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/storage/longhorn
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: longhorn
      namespace: longhorn-system
  timeout: 20m
```

## Step 8: Verify the Deployment

```bash
# Check Flux reconciliation status
flux get kustomizations longhorn

# Check the HelmRelease status
flux get helmreleases -n longhorn-system

# Verify Longhorn pods are running
kubectl get pods -n longhorn-system

# Check Longhorn nodes and disks
kubectl get nodes.longhorn.io -n longhorn-system

# Verify the storage class
kubectl get storageclass

# Check Longhorn volumes
kubectl get volumes.longhorn.io -n longhorn-system
```

## Step 9: Test Storage Provisioning

```yaml
# test-longhorn-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-longhorn-volume
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: test-longhorn-pod
  namespace: default
spec:
  containers:
    - name: test
      image: busybox:1.36
      command: ["sh", "-c", "echo 'Longhorn storage works!' > /data/test.txt && sleep 3600"]
      volumeMounts:
        - mountPath: /data
          name: test-volume
  volumes:
    - name: test-volume
      persistentVolumeClaim:
        claimName: test-longhorn-volume
```

## Configuring Backup to S3

To enable backups to an S3-compatible object store, create a secret and update the Longhorn settings.

```yaml
# clusters/my-cluster/storage/longhorn/backup-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-s3-secret
  namespace: longhorn-system
type: Opaque
stringData:
  # Replace with your actual credentials
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
  AWS_ENDPOINTS: "https://s3.amazonaws.com"
  AWS_REGION: "us-east-1"
```

Then update the `defaultSettings` in your HelmRelease values:

```yaml
defaultSettings:
  backupTarget: s3://longhorn-backups@us-east-1/
  backupTargetCredentialSecret: longhorn-s3-secret
```

## Monitoring Longhorn

Longhorn exposes Prometheus metrics out of the box. To scrape them, create a ServiceMonitor:

```yaml
# clusters/my-cluster/storage/longhorn/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: longhorn-prometheus
  namespace: longhorn-system
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: longhorn-manager
  endpoints:
    - port: manager
      interval: 30s
      path: /metrics
```

## Troubleshooting

1. **Volumes stuck in Attaching state**: Check that the iSCSI initiator is running on all nodes with `systemctl status iscsid`.

2. **Replica scheduling failure**: Ensure nodes have sufficient disk space and that the storage minimal available percentage is not too restrictive.

3. **Backup failures**: Verify the backup target credentials and network connectivity to the S3 endpoint.

```bash
# Check Longhorn manager logs
kubectl logs -n longhorn-system -l app=longhorn-manager --tail=100

# Check specific volume status
kubectl get volumes.longhorn.io -n longhorn-system -o yaml
```

## Conclusion

You have successfully deployed Longhorn storage on Kubernetes using Flux CD. Longhorn provides a simple yet powerful distributed block storage solution with built-in backup, snapshot, and disaster recovery capabilities. With Flux CD managing the deployment, your storage configuration is fully version-controlled and automatically reconciled from your Git repository.
