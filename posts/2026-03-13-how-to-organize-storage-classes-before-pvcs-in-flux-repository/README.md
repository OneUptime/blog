# How to Organize Storage Classes Before PVCs in Flux Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Storage, PersistentVolume, Repository Structure

Description: Learn how to structure your Flux repository to ensure StorageClasses and CSI drivers are deployed before PersistentVolumeClaims that depend on them.

---

## Why Storage Ordering Matters

Kubernetes PersistentVolumeClaims (PVCs) reference StorageClasses to dynamically provision storage. If a PVC is created before the StorageClass or the underlying CSI driver is available, the PVC will remain in a Pending state and any Pod mounting it will fail to start. Flux dependency management solves this problem.

## Repository Structure

```text
flux-repo/
├── clusters/
│   └── production/
│       ├── infrastructure.yaml
│       ├── storage.yaml
│       └── apps.yaml
├── infrastructure/
│   └── csi-drivers/
│       ├── kustomization.yaml
│       └── ebs-csi-driver.yaml
├── storage/
│   └── production/
│       ├── kustomization.yaml
│       ├── fast-ssd.yaml
│       └── standard.yaml
└── apps/
    └── production/
        ├── kustomization.yaml
        └── database/
            ├── statefulset.yaml
            ├── service.yaml
            └── pvc.yaml
```

## Layer 1: CSI Drivers

Install the CSI drivers that provide the storage backend:

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 1h
  retryInterval: 1m
  timeout: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/csi-drivers
  prune: true
  wait: true
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: ebs-csi-node
      namespace: kube-system
    - apiVersion: apps/v1
      kind: Deployment
      name: ebs-csi-controller
      namespace: kube-system
```

## Layer 2: StorageClasses

Define StorageClasses that depend on the CSI driver infrastructure:

```yaml
# clusters/production/storage.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: storage
  namespace: flux-system
spec:
  dependsOn:
    - name: infrastructure
  interval: 1h
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./storage/production
  prune: true
  wait: true
```

Define the StorageClass resources:

```yaml
# storage/production/fast-ssd.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "5000"
  throughput: "250"
  encrypted: "true"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

```yaml
# storage/production/standard.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Layer 3: Applications with PVCs

Applications that use PVCs depend on the storage layer:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
    - name: infrastructure
    - name: storage
  interval: 1h
  retryInterval: 1m
  timeout: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
```

The PVC can safely reference the StorageClass:

```yaml
# apps/production/database/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi
```

And the StatefulSet that uses it:

```yaml
# apps/production/database/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: default
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

## Handling Multiple Storage Backends

When you need multiple CSI drivers (for example, EBS for block storage and EFS for shared file storage), organize them within the infrastructure layer:

```yaml
# infrastructure/csi-drivers/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ebs-csi-driver.yaml
  - efs-csi-driver.yaml
```

Then define StorageClasses for each backend:

```yaml
# storage/production/efs-shared.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-shared
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef
  directoryPerms: "700"
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

## Verifying the Dependency Chain

```bash
# Check kustomization status and ordering
flux get kustomizations

# Verify StorageClasses exist
kubectl get storageclasses

# Check PVC status
kubectl get pvc --all-namespaces

# Verify CSI driver pods are running
kubectl get pods -n kube-system -l app=ebs-csi-controller
```

## Conclusion

By organizing CSI drivers, StorageClasses, and PVCs into separate Flux Kustomization layers with explicit dependencies, you ensure that storage infrastructure is fully operational before any workload attempts to use it. This prevents PVCs from getting stuck in Pending state and ensures reliable storage provisioning across your cluster.
