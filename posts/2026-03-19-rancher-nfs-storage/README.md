# How to Configure NFS Storage in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, NFS

Description: A step-by-step guide to configuring NFS storage for persistent volumes in Rancher-managed Kubernetes clusters.

NFS (Network File System) is a popular choice for shared storage in Kubernetes because it supports ReadWriteMany access mode, allowing multiple pods to read and write to the same volume simultaneously. This guide shows how to set up NFS storage in Rancher.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster
- An NFS server accessible from cluster nodes
- kubectl and Helm access to your cluster

## Step 1: Set Up an NFS Server

If you do not have an NFS server, set one up on a Linux machine:

```bash
# Install NFS server

sudo apt update
sudo apt install nfs-kernel-server -y

# Create export directory
sudo mkdir -p /srv/nfs/k8s-data
sudo chown nobody:nogroup /srv/nfs/k8s-data
sudo chmod 777 /srv/nfs/k8s-data

# Configure exports
echo "/srv/nfs/k8s-data *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports

# Apply exports and start NFS
sudo exportfs -ra
sudo systemctl enable --now nfs-kernel-server
```

Verify the export:

```bash
showmount -e localhost
```

## Step 2: Test NFS Connectivity from Cluster Nodes

SSH to a cluster node and test the mount:

```bash
sudo apt install nfs-common -y
sudo mount -t nfs nfs-server.example.com:/srv/nfs/k8s-data /mnt
ls /mnt
sudo umount /mnt
```

## Step 3: Create a Static NFS Persistent Volume

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  nfs:
    server: nfs-server.example.com
    path: /srv/nfs/k8s-data
  mountOptions:
    - hard
    - nfsvers=4.1
```

```bash
kubectl apply -f nfs-pv.yaml
```

## Step 4: Create a PVC for the NFS Volume

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: ""
  volumeName: nfs-pv
```

```bash
kubectl apply -f nfs-pvc.yaml
kubectl get pvc nfs-pvc
```

## Step 5: Install the NFS CSI Driver

For dynamic provisioning, install the NFS CSI driver:

```bash
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm repo update

helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system \
  --set kubeletDir=/var/lib/kubelet
```

Verify the installation:

```bash
kubectl get pods -n kube-system | grep csi-nfs
kubectl get csidrivers
```

## Step 6: Create an NFS Storage Class

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  server: nfs-server.example.com
  share: /srv/nfs/k8s-data
  subDir: ${pvc.metadata.namespace}/${pvc.metadata.name}
reclaimPolicy: Delete
volumeBindingMode: Immediate
mountOptions:
  - hard
  - nfsvers=4.1
  - rsize=1048576
  - wsize=1048576
```

```bash
kubectl apply -f nfs-storageclass.yaml
```

## Step 7: Use Dynamic NFS Provisioning

Create a PVC using the NFS StorageClass:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-nfs-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-csi
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f dynamic-nfs-pvc.yaml
kubectl get pvc dynamic-nfs-pvc
```

## Step 8: Deploy an Application with NFS Storage

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shared-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shared-app
  template:
    metadata:
      labels:
        app: shared-app
    spec:
      containers:
      - name: app
        image: nginx:latest
        volumeMounts:
        - name: shared-data
          mountPath: /usr/share/nginx/html
      volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: nfs-pvc
```

All three replicas share the same NFS volume.

## Step 9: Configure NFS Permissions

Handle file permissions using security context:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-permissions
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-with-permissions
  template:
    metadata:
      labels:
        app: app-with-permissions
    spec:
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      containers:
      - name: app
        image: nginx:latest
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: nfs-pvc
```

## Step 10: Monitor NFS Storage

```bash
# Check PV and PVC status
kubectl get pv | grep nfs
kubectl get pvc --all-namespaces | grep nfs

# Check disk usage from inside a pod
kubectl exec <pod-name> -- df -h /usr/share/nginx/html

# Check NFS mount on nodes
kubectl get pods -o wide  # find which node the pod is on
# Then SSH to the node and check:
mount | grep nfs

# Check CSI driver logs
kubectl logs -n kube-system -l app=csi-nfs-controller -c nfs --tail=50
```

## Troubleshooting

- **Mount failed**: Install `nfs-common` or `nfs-utils` on all cluster nodes
- **Permission denied**: Check NFS export permissions and security context
- **Stale file handle**: Restart the pod or check NFS server connectivity
- **Timeout**: Verify firewall allows NFS ports (2049, 111)
- **Dynamic provisioning fails**: Check CSI driver logs and NFS server path permissions

## Summary

NFS storage in Rancher provides a straightforward solution for shared storage across pods, supporting the ReadWriteMany access mode that many block storage backends do not offer. Using the NFS CSI driver enables dynamic provisioning, eliminating the need to manually create PVs. NFS is well-suited for shared configuration, media files, and applications that need concurrent access from multiple pods.
