# How to Deploy Rook-Ceph with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, rook-ceph, kubernetes, storage, gitops, ceph, persistent storage

Description: A practical guide to deploying Rook-Ceph distributed storage on Kubernetes using Flux CD and GitOps principles.

---

## Introduction

Rook-Ceph is a cloud-native storage orchestrator for Kubernetes that turns distributed storage software Ceph into self-managing, self-scaling, and self-healing storage services. When combined with Flux CD, you get a fully declarative, GitOps-driven approach to managing your storage infrastructure.

This guide walks you through deploying Rook-Ceph on Kubernetes using Flux CD, covering the operator installation, cluster configuration, and storage class provisioning.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster (v1.25 or later) with at least three worker nodes
- Each worker node should have an unformatted, unmounted disk attached
- Flux CD installed and bootstrapped on your cluster
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Repository Structure

Organize your GitOps repository with the following structure for the Rook-Ceph deployment:

```
clusters/
  my-cluster/
    storage/
      rook-ceph/
        namespace.yaml
        helmrepository.yaml
        helmrelease-operator.yaml
        helmrelease-cluster.yaml
        storageclass.yaml
        kustomization.yaml
```

## Step 1: Create the Namespace

Start by defining the namespace where Rook-Ceph will be deployed.

```yaml
# clusters/my-cluster/storage/rook-ceph/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rook-ceph
  labels:
    # Label for easy identification of storage components
    app.kubernetes.io/part-of: rook-ceph
```

## Step 2: Add the Rook-Ceph Helm Repository

Define the Helm repository source so Flux CD can pull the Rook-Ceph charts.

```yaml
# clusters/my-cluster/storage/rook-ceph/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: rook-release
  namespace: rook-ceph
spec:
  interval: 1h
  # Official Rook Helm chart repository
  url: https://charts.rook.io/release
```

## Step 3: Deploy the Rook-Ceph Operator

The operator manages the lifecycle of Ceph components in your cluster.

```yaml
# clusters/my-cluster/storage/rook-ceph/helmrelease-operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: rook-ceph-operator
  namespace: rook-ceph
spec:
  interval: 30m
  chart:
    spec:
      chart: rook-ceph
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: rook-release
        namespace: rook-ceph
  # Timeout for the Helm install/upgrade operation
  timeout: 15m
  values:
    # Enable the CSI driver for volume provisioning
    csi:
      enableRbdDriver: true
      enableCephfsDriver: true
      # Resource limits for CSI provisioner pods
      provisionerReplicas: 2
    # Enable monitoring if Prometheus is available
    monitoring:
      enabled: true
    # Resource requests and limits for the operator
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

## Step 4: Deploy the Ceph Cluster

Configure the Ceph cluster using the rook-ceph-cluster Helm chart.

```yaml
# clusters/my-cluster/storage/rook-ceph/helmrelease-cluster.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: rook-ceph-cluster
  namespace: rook-ceph
spec:
  interval: 30m
  # Ensure the operator is deployed before the cluster
  dependsOn:
    - name: rook-ceph-operator
  chart:
    spec:
      chart: rook-ceph-cluster
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: rook-release
        namespace: rook-ceph
  timeout: 30m
  values:
    # Toolbox enables the Ceph CLI for debugging
    toolbox:
      enabled: true
    monitoring:
      enabled: true
      createPrometheusRules: true
    cephClusterSpec:
      # Number of Ceph monitors (should be odd: 1, 3, or 5)
      mon:
        count: 3
        allowMultiplePerNode: false
      # Manager daemon configuration
      mgr:
        count: 2
        allowMultiplePerNode: false
      # Configure the Ceph dashboard
      dashboard:
        enabled: true
        ssl: true
      # Storage configuration - use all available devices
      storage:
        useAllNodes: true
        useAllDevices: true
        # Alternatively, specify devices explicitly:
        # nodes:
        #   - name: "worker-1"
        #     devices:
        #       - name: "sdb"
        #   - name: "worker-2"
        #     devices:
        #       - name: "sdb"
      # Resource limits for Ceph daemons
      resources:
        osd:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
        mon:
          requests:
            cpu: 250m
            memory: 1Gi
          limits:
            cpu: "1"
            memory: 2Gi
    # Create default storage classes
    cephBlockPools:
      - name: ceph-blockpool
        spec:
          failureDomain: host
          replicated:
            size: 3
        storageClass:
          enabled: true
          name: ceph-block
          isDefault: true
          reclaimPolicy: Delete
          allowVolumeExpansion: true
    # CephFS shared filesystem
    cephFileSystems:
      - name: ceph-filesystem
        spec:
          metadataPool:
            replicated:
              size: 3
          dataPools:
            - failureDomain: host
              replicated:
                size: 3
          metadataServer:
            activeCount: 1
            activeStandby: true
        storageClass:
          enabled: true
          name: ceph-filesystem
          reclaimPolicy: Delete
          allowVolumeExpansion: true
```

## Step 5: Create the Kustomization

Tie everything together with a Kustomization file.

```yaml
# clusters/my-cluster/storage/rook-ceph/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease-operator.yaml
  - helmrelease-cluster.yaml
```

## Step 6: Create the Flux Kustomization

Define the Flux Kustomization resource to reconcile the storage manifests.

```yaml
# clusters/my-cluster/storage/rook-ceph-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rook-ceph
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/storage/rook-ceph
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Health checks to verify the deployment
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: rook-ceph-operator
      namespace: rook-ceph
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: rook-ceph-cluster
      namespace: rook-ceph
  timeout: 45m
```

## Step 7: Verify the Deployment

After pushing your changes to the Git repository, Flux CD will reconcile the resources. Monitor the deployment progress.

```bash
# Check Flux Kustomization status
flux get kustomizations rook-ceph

# Check HelmRelease status
flux get helmreleases -n rook-ceph

# Verify the Rook-Ceph operator pods
kubectl get pods -n rook-ceph -l app=rook-ceph-operator

# Check the Ceph cluster health
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status

# Verify storage classes are created
kubectl get storageclass
```

## Step 8: Test with a Sample PVC

Create a test PersistentVolumeClaim to verify storage provisioning works.

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-ceph-block
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  # Use the Ceph block storage class
  storageClassName: ceph-block
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: test-ceph-pod
  namespace: default
spec:
  containers:
    - name: test
      image: busybox:1.36
      command: ["sleep", "3600"]
      volumeMounts:
        - mountPath: /data
          name: test-volume
  volumes:
    - name: test-volume
      persistentVolumeClaim:
        claimName: test-ceph-block
```

## Monitoring and Troubleshooting

### Checking Ceph Cluster Health

```bash
# Access the Ceph toolbox
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Inside the toolbox, check cluster status
ceph status
ceph osd status
ceph df
```

### Common Issues

1. **OSD pods not starting**: Verify that raw, unformatted disks are available on the nodes. Rook-Ceph requires clean disks without existing partitions or filesystems.

2. **Mon pods in CrashLoopBackOff**: Check that the nodes have sufficient resources and that the mon count matches the number of available nodes.

3. **PVC stuck in Pending**: Ensure the storage class name matches what was configured and that the Ceph cluster is healthy.

## Cleanup

To remove Rook-Ceph from your cluster, remove the manifests from your Git repository. Flux CD will handle the deletion. Note that you may need to manually clean the disks on each node after removal.

```bash
# After removing from Git, verify cleanup
kubectl get ns rook-ceph

# If needed, clean up finalizers on CephCluster
kubectl -n rook-ceph patch cephcluster rook-ceph \
  --type merge \
  -p '{"spec":{"cleanupPolicy":{"confirmation":"yes-really-destroy-data"}}}'
```

## Conclusion

You have successfully deployed Rook-Ceph on Kubernetes using Flux CD. This GitOps approach ensures your storage infrastructure is version-controlled, auditable, and reproducible. Rook-Ceph provides enterprise-grade distributed storage with block, filesystem, and object storage capabilities, all managed declaratively through your Git repository.
