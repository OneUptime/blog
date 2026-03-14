# How to Deploy GKE Filestore CSI Driver with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, GKE, Google Cloud, Filestore, CSI, Persistent Volumes

Description: Deploy and configure the GKE Filestore CSI driver using Flux CD to provision ReadWriteMany persistent volumes backed by Google Cloud Filestore.

---

## Introduction

Many stateful applications — including shared content management systems, ML training jobs that read the same dataset from multiple workers, and legacy applications — require persistent volumes that can be mounted by more than one pod simultaneously. Kubernetes' ReadWriteOnce volumes, backed by standard block storage, cannot satisfy this requirement. Google Cloud Filestore provides a fully managed NFS file server, and the GKE Filestore CSI driver surfaces it as a native Kubernetes storage class.

Managing the CSI driver installation and the associated StorageClass, PersistentVolumeClaim, and application manifests through a GitOps workflow gives you reproducibility and auditability. Flux CD continuously reconciles the cluster state against your Git repository, meaning the driver and all dependent resources are always installed at the revision you have approved.

This guide walks through enabling the GKE Filestore CSI driver on a Standard GKE cluster, installing it via Flux using a HelmRelease, and deploying a sample application that uses a ReadWriteMany PVC.

## Prerequisites

- A GKE Standard cluster (GKE 1.21+ for Filestore CSI driver support)
- `flux` CLI installed and bootstrapped against your cluster
- The GKE Filestore CSI driver add-on enabled on the cluster (or enabled via Terraform/gcloud)
- Sufficient IAM permissions to create Filestore instances (`roles/file.editor`)
- `kubectl` configured for the target cluster

## Step 1: Enable the Filestore CSI Driver on the GKE Cluster

```bash
# Enable the Filestore CSI add-on on an existing cluster
gcloud container clusters update my-cluster \
  --region us-central1 \
  --update-addons GcpFilestoreCsiDriver=ENABLED

# Verify the driver DaemonSet is running
kubectl get daemonset -n kube-system \
  -l app=filestore-node
```

## Step 2: Create the Flux GitRepository Source

Point Flux at the repository that holds your storage manifests.

```yaml
# clusters/my-cluster/infrastructure/sources/gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: infra-manifests
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/infra-manifests
  ref:
    branch: main
  secretRef:
    name: infra-manifests-auth   # SSH or HTTPS credentials secret
```

## Step 3: Define the StorageClass for Filestore

The GKE Filestore CSI driver provides the `filestore.csi.storage.gke.io` provisioner. Create a StorageClass that provisions enterprise-tier Filestore instances.

```yaml
# infrastructure/storage/filestore-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: filestore-rwx
  annotations:
    # Optionally make this the default class for RWX workloads
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: filestore.csi.storage.gke.io
parameters:
  tier: standard          # Options: standard, premium, enterprise
  network: default        # VPC network name
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Retain     # Retain data after PVC deletion
```

## Step 4: Create a Flux Kustomization for Infrastructure Storage

```yaml
# clusters/my-cluster/infrastructure/storage/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-storage
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: infra-manifests
  path: ./infrastructure/storage
  prune: true
  # Wait for the StorageClass to be ready before dependent apps
  healthChecks:
    - apiVersion: storage.k8s.io/v1
      kind: StorageClass
      name: filestore-rwx
```

## Step 5: Create a PersistentVolumeClaim and Application Deployment

```yaml
# apps/shared-content/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-content-pvc
  namespace: shared-content
spec:
  accessModes:
    - ReadWriteMany       # Multiple pods can mount this volume simultaneously
  storageClassName: filestore-rwx
  resources:
    requests:
      storage: 1Ti        # Filestore minimum is 1 TiB for standard tier
---
# apps/shared-content/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: content-server
  namespace: shared-content
spec:
  replicas: 3             # All three replicas share the same NFS volume
  selector:
    matchLabels:
      app: content-server
  template:
    metadata:
      labels:
        app: content-server
    spec:
      containers:
        - name: nginx
          image: nginx:1.27
          ports:
            - containerPort: 80
          volumeMounts:
            - name: shared-content
              mountPath: /usr/share/nginx/html
      volumes:
        - name: shared-content
          persistentVolumeClaim:
            claimName: shared-content-pvc
```

## Step 6: Flux Kustomization for the Application

```yaml
# clusters/my-cluster/apps/shared-content/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: shared-content-app
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    # Ensure the StorageClass exists before the PVC is created
    - name: infra-storage
  sourceRef:
    kind: GitRepository
    name: infra-manifests
  path: ./apps/shared-content
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: content-server
      namespace: shared-content
```

## Step 7: Verify the Deployment

```bash
# Check Flux reconciliation status
flux get kustomizations

# Verify the PVC is bound to a Filestore instance
kubectl get pvc -n shared-content

# Confirm all replicas are running and mounted
kubectl get pods -n shared-content
kubectl describe pv $(kubectl get pvc shared-content-pvc -n shared-content -o jsonpath='{.spec.volumeName}')
```

## Best Practices

- Always use `reclaimPolicy: Retain` for production Filestore PVCs to prevent accidental data loss when a PVC is deleted.
- Set explicit `capacity` in StorageClass parameters when using enterprise tier, as Filestore instances have fixed capacity.
- Use Flux `dependsOn` to enforce ordering so applications never attempt to create PVCs before the StorageClass is available.
- Tag Filestore instances with GCP labels by adding `labels` under StorageClass `parameters` for cost attribution.
- Monitor Filestore utilization through Cloud Monitoring; NFS volumes do not automatically expand at capacity.
- Use separate namespaces and RBAC for storage infrastructure and application teams to limit blast radius.

## Conclusion

The GKE Filestore CSI driver combined with Flux CD provides a clean GitOps path to ReadWriteMany persistent storage on GKE. Your StorageClass, PVCs, and application manifests all live in Git, giving you full auditability and easy disaster recovery. Flux's dependency management ensures resources are created in the correct order every time.
