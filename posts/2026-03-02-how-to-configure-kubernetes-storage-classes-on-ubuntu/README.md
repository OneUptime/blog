# How to Configure Kubernetes Storage Classes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kubernetes, Storage, PersistentVolume, DevOps

Description: Comprehensive guide to configuring Kubernetes Storage Classes on Ubuntu, including local storage, NFS provisioners, and dynamic volume provisioning for stateful workloads.

---

Stateful applications in Kubernetes need persistent storage that survives pod restarts and rescheduling. Storage Classes are the mechanism Kubernetes uses to define different tiers of storage - fast SSDs, slower HDDs, network-attached storage - and automate volume provisioning. Rather than administrators manually creating volumes ahead of time, a Storage Class allows Kubernetes to provision storage on demand when a PersistentVolumeClaim is created.

## Storage Concepts in Kubernetes

Before configuring Storage Classes, it helps to understand the three related objects:

- **PersistentVolume (PV)**: A piece of storage in the cluster, either provisioned manually by an admin or dynamically by a provisioner.
- **PersistentVolumeClaim (PVC)**: A request for storage by a workload, specifying size, access mode, and optionally a Storage Class.
- **StorageClass**: Defines the provisioner, reclaim policy, and parameters for dynamic provisioning.

When a PVC references a Storage Class, the associated provisioner creates a PV automatically and binds it to the claim.

## Checking Existing Storage Classes

```bash
# List available storage classes
kubectl get storageclass

# Show detailed information about a storage class
kubectl describe storageclass <name>
```

On a fresh cluster, there may be no storage classes. Some distributions (MicroK8s, kind, GKE) ship with defaults. Check for the default marker:

```bash
# The default storage class has the annotation storageclass.kubernetes.io/is-default-class: "true"
kubectl get storageclass -o wide
```

## Local Path Provisioner

For single-node clusters or development environments, the local path provisioner creates PVs using directories on the node's filesystem. Rancher maintains the most commonly used implementation.

```bash
# Install the local path provisioner
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml

# Verify the provisioner pod is running
kubectl get pods -n local-path-storage

# View the storage class that was created
kubectl get storageclass local-path
```

Set it as the default if needed:

```bash
kubectl patch storageclass local-path \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'
```

Test by creating a PVC:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 1Gi
EOF

# The PVC should bind to a dynamically created PV
kubectl get pvc test-pvc

# Clean up
kubectl delete pvc test-pvc
```

## NFS Storage Class

NFS is commonly used for shared storage that supports `ReadWriteMany` access mode - multiple pods can mount the same volume simultaneously. This is essential for workloads like shared file servers or media processing pipelines.

### Setting Up an NFS Server on Ubuntu

If you do not already have an NFS server:

```bash
# Install NFS server
sudo apt-get install -y nfs-kernel-server

# Create the export directory
sudo mkdir -p /srv/nfs/k8s
sudo chown nobody:nogroup /srv/nfs/k8s
sudo chmod 0777 /srv/nfs/k8s

# Add the export to /etc/exports
echo '/srv/nfs/k8s 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)' | \
  sudo tee -a /etc/exports

# Apply the exports
sudo exportfs -rav

# Enable and start NFS
sudo systemctl enable --now nfs-kernel-server
```

### Installing the NFS Provisioner

```bash
# Install Helm if not already present
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add the NFS provisioner Helm chart repo
helm repo add nfs-subdir-external-provisioner \
  https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/
helm repo update

# Install the provisioner pointing at your NFS server
helm install nfs-provisioner \
  nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --set nfs.server=192.168.1.10 \
  --set nfs.path=/srv/nfs/k8s \
  --set storageClass.name=nfs-client \
  --set storageClass.defaultClass=false

# Check the storage class was created
kubectl get storageclass nfs-client
```

Each PVC backed by the NFS Storage Class gets its own subdirectory under `/srv/nfs/k8s`.

## Creating Custom Storage Classes

You can define your own Storage Classes with specific parameters. Here is a Storage Class using the local provisioner with custom settings:

```yaml
# custom-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-local
  annotations:
    # Set this to true to make it the default
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: rancher.io/local-path
reclaimPolicy: Delete        # Delete PV when PVC is deleted
volumeBindingMode: WaitForFirstConsumer  # Wait until pod is scheduled before provisioning
allowVolumeExpansion: true   # Allow PVCs to be resized after creation
```

```bash
kubectl apply -f custom-storage-class.yaml
```

### Retain Policy Storage Class

If you need volumes to survive PVC deletion (useful for database storage):

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: retain-local
provisioner: rancher.io/local-path
reclaimPolicy: Retain    # Keep the PV even after PVC is deleted
volumeBindingMode: WaitForFirstConsumer
```

With `Retain`, the PV moves to `Released` state when its PVC is deleted. You must manually delete and recreate it to reuse the storage.

## Configuring Volume Binding Mode

The `volumeBindingMode` field controls when volume binding happens:

- **Immediate**: The PV is provisioned and bound as soon as the PVC is created. Problematic for topology-constrained volumes on multi-zone clusters.
- **WaitForFirstConsumer**: Provisioning waits until a pod using the PVC is scheduled. Ensures the volume is created in the same zone as the pod.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: zone-aware-storage
provisioner: rancher.io/local-path
volumeBindingMode: WaitForFirstConsumer
```

## Using Storage Classes in Deployments

A StatefulSet for a database using NFS storage:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
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
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: "changeme"
        volumeMounts:
        - name: pgdata
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: pgdata
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: nfs-client   # Reference the storage class
      resources:
        requests:
          storage: 10Gi
```

```bash
kubectl apply -f postgres-statefulset.yaml

# Watch the PVC get created and bound
kubectl get pvc --watch
```

## Managing Existing Storage Classes

### Removing the Default Storage Class

If multiple storage classes are marked as default, PVC requests without an explicit class will fail:

```bash
# Remove the default annotation from a storage class
kubectl patch storageclass <name> \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "false"}}}'
```

### Deleting a Storage Class

```bash
# Deleting a storage class does NOT delete existing PVs or PVCs
kubectl delete storageclass <name>

# Existing PVCs that used this class continue to work
# New PVCs referencing the deleted class will fail
```

## Troubleshooting

**PVC stuck in Pending**: Check that the provisioner pod is running and the Storage Class name in the PVC matches exactly.

```bash
kubectl describe pvc <name>
kubectl get pods -n <provisioner-namespace>
kubectl logs -n <provisioner-namespace> <provisioner-pod>
```

**NFS volume mount failures**: Ensure the NFS client packages are installed on all worker nodes:

```bash
sudo apt-get install -y nfs-common
```

**Volume not expanding**: Check that `allowVolumeExpansion: true` is set on the Storage Class, and that the underlying storage supports it.

Storage Classes are the foundation of data persistence in Kubernetes. Getting them right early - choosing the correct reclaim policy and binding mode for your workload type - saves considerable pain when managing stateful applications at scale.
