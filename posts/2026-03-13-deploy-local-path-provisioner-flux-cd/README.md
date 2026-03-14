# How to Deploy local-path-provisioner with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, local-path-provisioner, Local Storage, Development

Description: Deploy local-path-provisioner for local node storage on Kubernetes using Flux CD for GitOps-managed lightweight local persistent volumes.

---

## Introduction

The `local-path-provisioner` from Rancher dynamically provisions PersistentVolumes using local directories on Kubernetes nodes. Unlike `hostPath` volumes which require manual management, `local-path-provisioner` provides automatic PV creation and cleanup through a StorageClass. It is the default storage class in K3s and is popular for development clusters, single-node setups, and edge deployments where distributed storage is overkill.

Deploying `local-path-provisioner` through Flux CD gives you GitOps-managed local storage configuration - including the storage base path, reclaimPolicy, and cleanup behavior.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- Adequate free disk space on nodes
- `kubectl` and `flux` CLIs installed

## Step 1: Add the HelmRepository

```yaml
# infrastructure/sources/local-path-provisioner-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: local-path-provisioner
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.containeroo.ch
```

Alternatively, deploy directly from the official manifests via GitRepository:

```yaml
# infrastructure/sources/local-path-git.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: local-path-provisioner
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/rancher/local-path-provisioner
  ref:
    tag: v0.0.28
```

## Step 2: Deploy local-path-provisioner

```yaml
# infrastructure/storage/local-path/provisioner.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: local-path-provisioner
  namespace: local-path-storage
spec:
  interval: 30m
  chart:
    spec:
      chart: local-path-provisioner
      version: "0.0.28"
      sourceRef:
        kind: HelmRepository
        name: local-path-provisioner
        namespace: flux-system
  values:
    # Storage path on each node
    storageClass:
      name: local-path
      defaultClass: true          # set as default for dev/edge clusters
      reclaimPolicy: Delete
      pathPattern: "{{ .node.name }}/{{ .claim.namespace }}-{{ .claim.name }}"

    # Configuration for the provisioner
    nodePathMap:
      - node: DEFAULT
        paths:
          - /opt/local-path-provisioner  # all nodes use this path

    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "200m"
        memory: "128Mi"
```

## Step 3: Custom Storage Path Configuration

Override the default storage path with a ConfigMap:

```yaml
# infrastructure/storage/local-path/config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-path-config
  namespace: local-path-storage
data:
  config.json: |
    {
      "nodePathMap": [
        {
          "node": "DEFAULT",
          "paths": ["/opt/local-path-provisioner"]
        },
        {
          "node": "storage-node-1",
          "paths": ["/mnt/nvme/local-path"]
        },
        {
          "node": "storage-node-2",
          "paths": ["/mnt/nvme/local-path"]
        }
      ]
    }
  setup: |
    #!/bin/sh
    set -eu
    mkdir -m 0777 -p "$VOL_DIR"

  teardown: |
    #!/bin/sh
    set -eu
    rm -rf "$VOL_DIR"

  helperPod.yaml: |
    apiVersion: v1
    kind: Pod
    metadata:
      name: helper-pod
    spec:
      containers:
      - name: helper-pod
        image: busybox
        imagePullPolicy: IfNotPresent
```

## Step 4: Create Multiple StorageClasses for Different Paths

```yaml
# infrastructure/storage/local-path/extra-storageclasses.yaml
# High-performance local storage (NVMe path)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path-nvme
provisioner: rancher.io/local-path
volumeBindingMode: WaitForFirstConsumer  # provision after pod is scheduled
reclaimPolicy: Delete
parameters:
  nodePath: /mnt/nvme/local-path
---
# Retain policy for important data
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path-retain
provisioner: rancher.io/local-path
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain   # keep local directory on PVC deletion
```

## Step 5: Test Local Path PVC

```yaml
# Test PVC creation
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: local-path-test
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: local-path-test-pod
  namespace: default
spec:
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "echo 'local-path works!' > /data/test.txt && cat /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: local-path-test
```

## Step 6: Flux Kustomization

```yaml
# clusters/development/local-path-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: local-path-provisioner
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/local-path
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: local-path-provisioner
      namespace: local-path-storage
```

## Step 7: Verify

```bash
# Check provisioner is running
kubectl get deployment local-path-provisioner -n local-path-storage

# Check StorageClasses
kubectl get storageclass | grep local-path

# Test PVC creation
kubectl get pvc local-path-test

# Verify PV was created
kubectl get pv | grep local-path-test

# Check which node the volume was provisioned on
kubectl get pv $(kubectl get pvc local-path-test -o jsonpath='{.spec.volumeName}') \
  -o jsonpath='{.spec.nodeAffinity}'

# Find the directory on the node
kubectl describe pv $(kubectl get pvc local-path-test -o jsonpath='{.spec.volumeName}') \
  | grep Path
```

## Best Practices

- Use `volumeBindingMode: WaitForFirstConsumer` to ensure volumes are provisioned on the same node where the pod will run.
- Use `local-path` for development and edge clusters where distributed storage is not justified, but not for production HA deployments.
- Set `reclaimPolicy: Retain` for data you cannot afford to lose - `Delete` removes the directory immediately on PVC deletion.
- Specify per-node paths in the ConfigMap to direct volumes to dedicated disks on storage-class nodes.
- Avoid using `local-path-provisioner` for StatefulSets that need to migrate between nodes - volumes are node-local and don't follow pods.

## Conclusion

The `local-path-provisioner` deployed via Flux CD provides the simplest path to dynamic PV provisioning on Kubernetes using local node storage. It is ideal for development clusters, K3s deployments, and edge environments where simplicity is more important than resilience. With Flux managing the provisioner and StorageClass configuration, even your simplest storage setup is version-controlled and reproducible across clusters.
