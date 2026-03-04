# How to Use Filestore with GKE for ReadWriteMany Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, GKE, Kubernetes, ReadWriteMany, Persistent Volumes

Description: Learn how to set up Filestore as a ReadWriteMany persistent volume backend for GKE workloads that require shared filesystem access across multiple pods.

---

Most Kubernetes storage backends only support ReadWriteOnce (RWO) access mode, meaning a volume can be mounted by a single node at a time. That works fine for databases and single-instance applications, but many workloads need ReadWriteMany (RWX) - the ability for multiple pods on different nodes to read and write the same volume simultaneously. Google Cloud Filestore, being an NFS service, naturally supports this. In this post, I will show you how to set up Filestore as an RWX persistent volume in GKE.

## When You Need ReadWriteMany

Here are some common scenarios where RWX volumes are essential:

- **Web applications** serving user-uploaded content from shared storage
- **CI/CD pipelines** where build artifacts need to be shared across worker pods
- **Machine learning** training jobs that read the same dataset from multiple parallel workers
- **Content management systems** like WordPress where multiple replicas need access to the same media folder
- **Log aggregation** where multiple pods write to a shared filesystem for collection

In all these cases, Persistent Disk (RWO) would limit you to a single pod accessing the data at a time. Filestore removes that limitation.

## Prerequisites

You need:

- A GKE cluster with the Filestore CSI driver enabled
- The Filestore API enabled in your project
- kubectl configured to talk to your cluster

Enable the Filestore CSI driver if it is not already:

```bash
# Enable the Filestore CSI driver on your GKE cluster
gcloud container clusters update my-cluster \
  --zone=us-central1-a \
  --update-addons=GcpFilestoreCsiDriver=ENABLED
```

## Option 1 - Dynamic Provisioning with StorageClass

The easiest approach is to let the Filestore CSI driver create instances automatically. Define a StorageClass that specifies Filestore as the provisioner.

Create a file called `filestore-rwx-sc.yaml`:

```yaml
# StorageClass for dynamically provisioned Filestore RWX volumes
# Uses Basic HDD tier for cost-effective shared storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: filestore-rwx
provisioner: filestore.csi.storage.gke.io
parameters:
  tier: standard
  network: default
volumeBindingMode: Immediate
allowVolumeExpansion: true
reclaimPolicy: Delete
```

Apply it:

```bash
# Create the StorageClass
kubectl apply -f filestore-rwx-sc.yaml
```

Now create a PersistentVolumeClaim with ReadWriteMany access. Create `shared-pvc.yaml`:

```yaml
# PVC requesting 1TB of ReadWriteMany Filestore storage
# Multiple pods can mount this volume simultaneously
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: filestore-rwx
  resources:
    requests:
      storage: 1Ti
```

Apply it:

```bash
# Create the PVC - triggers automatic Filestore instance creation
kubectl apply -f shared-pvc.yaml

# Monitor until the PVC is bound (takes a few minutes)
kubectl get pvc shared-data -w
```

The PVC stays in Pending state while Filestore provisions a new instance. This takes 3-5 minutes typically.

## Option 2 - Pre-existing Filestore Instance

If you already have a Filestore instance or want more control over the instance configuration, you can create a PV that points to it directly.

First, get the Filestore instance IP:

```bash
# Get the IP of your existing Filestore instance
gcloud filestore instances describe my-filestore \
  --zone=us-central1-a \
  --format="value(networks[0].ipAddresses[0])"
```

Create the PV and PVC pair in `filestore-existing-rwx.yaml`:

```yaml
# PV that references an existing Filestore instance
# The NFS server IP and path must match your Filestore configuration
apiVersion: v1
kind: PersistentVolume
metadata:
  name: filestore-rwx-pv
spec:
  capacity:
    storage: 1Ti
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  nfs:
    server: 10.0.0.2
    path: /vol1
  storageClassName: ""
---
# PVC that binds directly to the pre-existing PV above
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: ""
  volumeName: filestore-rwx-pv
  resources:
    requests:
      storage: 1Ti
```

Apply it:

```bash
# Create the PV and PVC
kubectl apply -f filestore-existing-rwx.yaml
```

This binds immediately since the PV already exists.

## Deploying an Application with the Shared Volume

Now deploy an application that uses the shared volume. Here is a Deployment with multiple replicas all mounting the same PVC:

```yaml
# Deployment with 5 replicas sharing the same Filestore volume
# All pods can read and write to /shared-data simultaneously
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
          volumeMounts:
            # Mount the shared volume at /usr/share/nginx/html
            - name: shared-data
              mountPath: /usr/share/nginx/html
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: shared-data
```

Apply it:

```bash
# Deploy the web application
kubectl apply -f web-app.yaml

# Verify all pods are running
kubectl get pods -l app=web-app
```

All five pods mount the same Filestore share at `/usr/share/nginx/html`. Any file written by one pod is immediately visible to all others.

## Testing Shared Access

Let me verify that shared access actually works:

```bash
# Write a file from the first pod
kubectl exec deploy/web-app -- bash -c \
  "echo 'Hello from pod' > /usr/share/nginx/html/test.html"

# Read the file from all pods to confirm visibility
kubectl get pods -l app=web-app -o name | while read pod; do
  echo "$pod:"
  kubectl exec "$pod" -- cat /usr/share/nginx/html/test.html
done
```

Every pod should print the same content.

## Using Filestore with StatefulSets

While Deployments share a single PVC across all pods, StatefulSets can also use Filestore. This is useful when you want each pod to have its own subdirectory but still use shared storage:

```yaml
# StatefulSet where each pod gets its own subdirectory on the shared volume
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: workers
spec:
  serviceName: workers
  replicas: 3
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
        - name: worker
          image: busybox
          command: ["sh", "-c", "while true; do echo working > /data/status; sleep 60; done"]
          volumeMounts:
            - name: shared-data
              # Each pod writes to a unique subdirectory
              mountPath: /data
              subPathExpr: $(POD_NAME)
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: shared-data
```

Each pod gets its own subdirectory under the Filestore share, preventing write conflicts while still using a single Filestore instance.

## Performance Considerations

NFS performance in GKE depends on several factors:

1. **Filestore tier** - Basic HDD maxes out at 100 MB/s. If multiple pods are doing heavy I/O, you will hit this limit fast. Use Basic SSD or Zonal tier for better throughput.

2. **Node count** - More nodes means more NFS clients, which means more concurrent I/O. Filestore handles this well, but the aggregate throughput is still capped by the tier.

3. **Pod placement** - If all your I/O-heavy pods land on the same node, that node's network bandwidth becomes the bottleneck. Use pod anti-affinity to spread pods across nodes.

4. **File access patterns** - Lots of small random reads perform worse on NFS than large sequential reads. If your workload is random-I/O heavy, consider whether a different storage solution (like a database) might be more appropriate.

## Cleanup

When you delete the PVC, the behavior depends on the StorageClass reclaim policy:

- `Delete` (default for dynamic provisioning) - The Filestore instance is deleted along with all data
- `Retain` - The Filestore instance is kept and must be manually deleted

```bash
# Delete the application and PVC
kubectl delete deploy web-app
kubectl delete pvc shared-data
```

Filestore with GKE gives you a straightforward path to ReadWriteMany persistent volumes. Dynamic provisioning keeps things simple, and pre-existing instances give you more control. Either way, you get reliable shared storage that works the way NFS has always worked, just without the operational burden of managing the NFS server yourself.
