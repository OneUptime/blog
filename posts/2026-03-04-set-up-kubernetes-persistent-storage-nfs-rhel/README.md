# How to Set Up Kubernetes Persistent Storage with NFS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, NFS, Storage, Persistent Volumes

Description: Configure NFS-based persistent storage for Kubernetes on RHEL using PersistentVolumes and an NFS provisioner.

---

Kubernetes applications that need to persist data require PersistentVolumes. NFS is a straightforward choice for shared storage, especially when you already have NFS infrastructure. Here is how to set it up on RHEL.

## Setting Up the NFS Server

On a dedicated RHEL NFS server (or one of your existing servers):

```bash
# Install NFS server packages
sudo dnf install nfs-utils -y

# Create the export directory
sudo mkdir -p /srv/nfs/k8s
sudo chown nobody:nobody /srv/nfs/k8s
sudo chmod 777 /srv/nfs/k8s

# Configure the export
sudo tee /etc/exports << 'EOF'
/srv/nfs/k8s 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)
EOF

# Enable and start NFS
sudo systemctl enable --now nfs-server

# Apply the exports
sudo exportfs -rav

# Open firewall ports for NFS
sudo firewall-cmd --permanent --add-service=nfs
sudo firewall-cmd --permanent --add-service=rpc-bind
sudo firewall-cmd --permanent --add-service=mountd
sudo firewall-cmd --reload
```

## Installing NFS Client on All Kubernetes Nodes

```bash
# On every Kubernetes node
sudo dnf install nfs-utils -y

# Test the NFS mount
sudo mount -t nfs nfs-server:/srv/nfs/k8s /mnt
ls /mnt
sudo umount /mnt
```

## Creating Static PersistentVolumes

For a small number of volumes, create them manually:

```bash
# Create subdirectories for each PV
sudo mkdir -p /srv/nfs/k8s/pv-{1,2,3}

# Create a PersistentVolume in Kubernetes
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv-1
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs
  nfs:
    server: 192.168.1.30
    path: /srv/nfs/k8s/pv-1
EOF

# Create a PersistentVolumeClaim
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-nfs-claim
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs
  resources:
    requests:
      storage: 10Gi
EOF

# Verify the binding
kubectl get pv,pvc
```

## Installing the NFS Subdir External Provisioner

For dynamic provisioning (automatic PV creation), use the NFS subdir provisioner:

```bash
# Add the Helm repository
helm repo add nfs-subdir-external-provisioner \
  https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/

# Install the provisioner
helm install nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --namespace nfs-provisioner \
  --create-namespace \
  --set nfs.server=192.168.1.30 \
  --set nfs.path=/srv/nfs/k8s \
  --set storageClass.name=nfs-dynamic \
  --set storageClass.defaultClass=true

# Verify the provisioner is running
kubectl get pods -n nfs-provisioner
kubectl get storageclass
```

## Testing Dynamic Provisioning

```bash
# Create a PVC and the provisioner will automatically create the PV
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-nfs-claim
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-dynamic
  resources:
    requests:
      storage: 5Gi
EOF

# Verify automatic provisioning
kubectl get pvc dynamic-nfs-claim
# STATUS should be "Bound"

# Use it in a pod
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: nfs-test-pod
spec:
  containers:
    - name: app
      image: busybox
      command: ["sh", "-c", "echo 'Hello NFS' > /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: nfs-storage
          mountPath: /data
  volumes:
    - name: nfs-storage
      persistentVolumeClaim:
        claimName: dynamic-nfs-claim
EOF
```

NFS-backed persistent storage is easy to set up and works well for applications that need shared read-write access across multiple pods.
