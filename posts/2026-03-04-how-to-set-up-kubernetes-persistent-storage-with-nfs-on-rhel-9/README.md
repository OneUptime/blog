# How to Set Up Kubernetes Persistent Storage with NFS on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Kubernetes, NFS

Description: Step-by-step guide on set up kubernetes persistent storage with nfs on rhel 9 with practical examples and commands.

---

NFS persistent storage for Kubernetes on RHEL 9 provides shared storage across pods and nodes.

## Set Up the NFS Server

On the NFS server:

```bash
sudo dnf install -y nfs-utils
sudo mkdir -p /srv/nfs/k8s-data
sudo chown nobody:nobody /srv/nfs/k8s-data
sudo chmod 777 /srv/nfs/k8s-data

echo "/srv/nfs/k8s-data *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
sudo systemctl enable --now nfs-server
sudo firewall-cmd --permanent --add-service=nfs
sudo firewall-cmd --reload
```

## Install NFS CSI Driver

```bash
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system
```

## Create a StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  server: nfs-server.example.com
  share: /srv/nfs/k8s-data
reclaimPolicy: Retain
volumeBindingMode: Immediate
```

## Create a PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  storageClassName: nfs-csi
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
```

## Use in a Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx
        volumeMounts:
        - name: data
          mountPath: /usr/share/nginx/html
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: app-data
```

## Conclusion

NFS persistent storage on RHEL 9 Kubernetes provides shared ReadWriteMany storage across pods. Use the NFS CSI driver for dynamic provisioning and proper lifecycle management.

