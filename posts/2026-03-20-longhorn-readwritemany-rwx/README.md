# How to Set Up Longhorn ReadWriteMany (RWX) Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, ReadWriteMany, RWX, NFS, Kubernetes, Storage, SUSE Rancher

Description: Learn how to configure Longhorn ReadWriteMany (RWX) volumes using the built-in NFS share manager, create RWX StorageClasses, and deploy workloads that share volumes across multiple pods.

---

Longhorn supports ReadWriteMany (RWX) access mode using a built-in NFS share manager. This enables multiple pods across different nodes to mount and write to the same volume simultaneously.

---

## How Longhorn RWX Works

Longhorn creates a RWX volume by:
1. Creating an NFS share manager pod on a node
2. Mounting the Longhorn block volume to the share manager pod
3. Creating a Service and exposing the volume as an NFS share
4. Mounting the NFS share to consumer pods

---

## Step 1: Verify RWX Prerequisites

```bash
# Each node that will mount the RWX volume needs an NFSv4 client installed.
# If RWX volumes are already in use, you should see share-manager pods here.

kubectl get pods -n longhorn-system | grep share-manager

# Inspect Longhorn settings using the fully qualified CRD name
kubectl get settings.longhorn.io -n longhorn-system
```

---

## Step 2: Create an RWX StorageClass

```yaml
# longhorn-rwx-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-rwx
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Retain
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
  fromBackup: ""
  fsType: "ext4"
  migratable: "false"
```

```bash
kubectl apply -f longhorn-rwx-storageclass.yaml
```

---

## Step 3: Create an RWX PersistentVolumeClaim

```yaml
# rwx-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: longhorn-rwx
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f rwx-pvc.yaml

# Verify the PVC is bound
kubectl get pvc shared-data
# STATUS should show: Bound
```

---

## Step 4: Deploy a Workload Using the RWX Volume

```yaml
# rwx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-servers
  namespace: default
spec:
  replicas: 3    # Multiple replicas all mounting the same volume
  selector:
    matchLabels:
      app: web-server
  template:
    metadata:
      labels:
        app: web-server
    spec:
      containers:
        - name: nginx
          image: nginx:1.24
          volumeMounts:
            - name: shared-content
              mountPath: /usr/share/nginx/html
      volumes:
        - name: shared-content
          persistentVolumeClaim:
            claimName: shared-data
```

```bash
kubectl apply -f rwx-deployment.yaml

# Verify all pods are running and mounted
kubectl get pods -l app=web-server
kubectl exec -it <pod-name> -- df -h /usr/share/nginx/html
```

---

## Step 5: Verify Cross-Node Sharing

```bash
# Check which nodes the pods are scheduled on, then pick two pods on different nodes if available
kubectl get pods -l app=web-server -o wide

# Write a file from one pod
kubectl exec <pod-on-node-a> -- sh -c "echo 'hello from pod1' > /usr/share/nginx/html/test.txt"

# Read the file from another pod on a different node
kubectl exec <pod-on-node-b> -- cat /usr/share/nginx/html/test.txt
# Should output: hello from pod1
```

---

## Step 6: Check the Share Manager Pod

```bash
# View the NFS share manager pod created by Longhorn
kubectl get pods -n longhorn-system | grep share-manager

# View share manager logs
kubectl logs -n longhorn-system \
  $(kubectl get pods -n longhorn-system -o name | grep share-manager | head -1)
```

---

## Troubleshooting RWX Issues

```bash
# PVC stuck in Pending state
kubectl describe pvc shared-data
# Check the PVC events and StorageClass configuration.
# A share-manager pod is created only after an RWX volume is attached for use.

# Mount fails on pods
kubectl describe pod <pod-name>
# Check: Can the node reach the share-manager Service or pod on NFS port (2049)?

# Test NFS connectivity from a node
kubectl debug node/<node-name> -it --image=busybox -- \
  nc -zv <share-manager-service-or-pod-ip> 2049
```

---

## Best Practices

- Use RWX volumes for content that genuinely needs concurrent multi-pod access, such as shared web content, uploads, or log aggregation.
- Note that RWX volumes have higher latency than RWO volumes due to the NFS layer - for performance-critical workloads, prefer RWO with appropriate application-level sharding.
- Ensure your network allows NFS traffic (port 2049) between nodes and the share-manager Service or pod - NetworkPolicy rules may block this if not explicitly allowed.
