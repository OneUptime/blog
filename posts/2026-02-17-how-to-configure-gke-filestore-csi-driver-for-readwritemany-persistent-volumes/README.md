# How to Configure GKE Filestore CSI Driver for ReadWriteMany Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Filestore, CSI Driver, Persistent Volumes, Kubernetes, Storage

Description: Learn how to set up the Filestore CSI driver on GKE to create ReadWriteMany persistent volumes that multiple pods can access simultaneously.

---

Most storage on Kubernetes is ReadWriteOnce - a single pod can mount the volume at a time. That works fine for databases and single-instance applications, but what about workloads where multiple pods need to read and write to the same files? Content management systems, shared configuration, media processing pipelines - these all need ReadWriteMany (RWX) volumes.

Google Cloud Filestore provides NFS-based file storage that integrates with GKE through the Filestore CSI driver. It gives you ReadWriteMany volumes that any number of pods across any number of nodes can mount simultaneously.

## Enabling the Filestore CSI Driver

The Filestore CSI driver comes as a GKE addon. Enable it on your existing cluster:

```bash
# Enable the Filestore CSI driver addon on a GKE cluster
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --update-addons=GcpFilestoreCsiDriver=ENABLED
```

For new clusters, include it at creation time:

```bash
# Create a new cluster with the Filestore CSI driver enabled
gcloud container clusters create my-cluster \
  --zone us-central1-a \
  --addons=GcpFilestoreCsiDriver \
  --num-nodes=3
```

Verify the driver is running:

```bash
# Check that the Filestore CSI driver pods are running
kubectl get pods -n kube-system -l app=gcp-filestore-csi-driver
```

## Creating a StorageClass

The Filestore CSI driver includes default StorageClasses, but creating your own gives you more control:

```yaml
# filestore-sc.yaml - StorageClass for Filestore HDD tier
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: filestore-standard
provisioner: filestore.csi.storage.gke.io
parameters:
  # Filestore tier: BASIC_HDD, BASIC_SSD, ENTERPRISE, or ZONAL
  tier: BASIC_HDD
  # Network where the Filestore instance will be created
  network: default
volumeBindingMode: Immediate
allowVolumeExpansion: true
reclaimPolicy: Delete
```

For workloads that need better performance, use the SSD tier:

```yaml
# filestore-ssd-sc.yaml - StorageClass for Filestore SSD tier
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: filestore-ssd
provisioner: filestore.csi.storage.gke.io
parameters:
  tier: BASIC_SSD
  network: default
volumeBindingMode: Immediate
allowVolumeExpansion: true
reclaimPolicy: Delete
```

Apply the StorageClass:

```bash
kubectl apply -f filestore-sc.yaml
```

## Creating a PersistentVolumeClaim

Now create a PVC that uses the Filestore StorageClass:

```yaml
# pvc.yaml - PersistentVolumeClaim with ReadWriteMany access
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
  namespace: default
spec:
  accessModes:
    # ReadWriteMany allows multiple pods on multiple nodes to mount this volume
    - ReadWriteMany
  storageClassName: filestore-standard
  resources:
    requests:
      # Minimum size for BASIC_HDD is 1Ti, for BASIC_SSD is 2.5Ti
      storage: 1Ti
```

Apply the PVC:

```bash
kubectl apply -f pvc.yaml
```

Wait for the Filestore instance to be provisioned:

```bash
# Watch the PVC status - it will go from Pending to Bound
kubectl get pvc shared-data --watch
```

Provisioning a Filestore instance takes a few minutes. Once the status shows `Bound`, the volume is ready.

## Mounting the Volume in Multiple Pods

Here is a deployment where multiple replicas all mount the same Filestore volume:

```yaml
# deployment.yaml - Multiple pods sharing the same ReadWriteMany volume
apiVersion: apps/v1
kind: Deployment
metadata:
  name: content-processor
  namespace: default
spec:
  replicas: 5
  selector:
    matchLabels:
      app: content-processor
  template:
    metadata:
      labels:
        app: content-processor
    spec:
      containers:
        - name: processor
          image: us-docker.pkg.dev/my-project/my-repo/processor:v1.0
          volumeMounts:
            # All 5 replicas can read and write to this path simultaneously
            - name: shared-data
              mountPath: /data
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: shared-data
```

All five replicas will mount the same Filestore volume at `/data`. They can all read and write files simultaneously.

## Using Filestore with a StatefulSet

For stateful workloads that need both shared storage and pod-specific storage, you can combine Filestore with regular Persistent Disks:

```yaml
# statefulset.yaml - Pods with both shared and individual storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: media-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: media-worker
  serviceName: media-worker
  template:
    metadata:
      labels:
        app: media-worker
    spec:
      containers:
        - name: worker
          image: us-docker.pkg.dev/my-project/my-repo/worker:v1.0
          volumeMounts:
            # Shared volume - all pods see the same files
            - name: shared-assets
              mountPath: /shared
            # Individual volume - each pod has its own scratch space
            - name: scratch
              mountPath: /scratch
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
      volumes:
        # Shared Filestore volume
        - name: shared-assets
          persistentVolumeClaim:
            claimName: shared-data
  # Individual PD volumes per pod
  volumeClaimTemplates:
    - metadata:
        name: scratch
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard-rwo
        resources:
          requests:
            storage: 50Gi
```

## Pre-Provisioned Filestore Instances

For production use, you might want to pre-provision a Filestore instance and use it as a static PV instead of relying on dynamic provisioning:

```bash
# Create a Filestore instance manually
gcloud filestore instances create my-filestore \
  --zone us-central1-a \
  --tier BASIC_SSD \
  --file-share name=vol1,capacity=2560Gi \
  --network name=default
```

Then create a PV that points to the existing instance:

```yaml
# static-pv.yaml - PersistentVolume pointing to a pre-created Filestore instance
apiVersion: v1
kind: PersistentVolume
metadata:
  name: filestore-pv
spec:
  capacity:
    storage: 2560Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  csi:
    driver: filestore.csi.storage.gke.io
    volumeHandle: "modeInstance/us-central1-a/my-filestore/vol1"
    volumeAttributes:
      ip: "10.0.0.2"  # Filestore instance IP
      volume: vol1
---
# static-pvc.yaml - PVC bound to the pre-created PV
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: filestore-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: ""
  volumeName: filestore-pv
  resources:
    requests:
      storage: 2560Gi
```

Get the Filestore instance IP:

```bash
# Get the IP address of your Filestore instance
gcloud filestore instances describe my-filestore \
  --zone us-central1-a \
  --format="value(networks[0].ipAddresses[0])"
```

## Performance Considerations

Filestore performance depends on the tier and capacity:

- BASIC_HDD: Good for general-purpose file sharing, sequential reads
- BASIC_SSD: Better for random I/O, lower latency
- ENTERPRISE: Regional availability, snapshots, higher performance
- ZONAL: High performance for demanding workloads

The minimum size for BASIC_HDD is 1 TiB, and for BASIC_SSD it is 2.5 TiB. These minimums mean Filestore is not economical for small volumes - it is designed for workloads that genuinely need shared storage at scale.

Performance scales with capacity. A 1 TiB BASIC_HDD instance gives you around 100 MiB/s throughput, while a 10 TiB instance gives you roughly 1,200 MiB/s. Choose your capacity based on both storage needs and performance requirements.

## Cost Optimization

Since the minimum size is 1 TiB, you want to make good use of that space. Consider sharing a single Filestore instance across multiple workloads using subdirectories:

```yaml
# deployment-a.yaml - First workload using a subdirectory
volumeMounts:
  - name: shared-data
    mountPath: /data
    subPath: app-a  # Uses /data/app-a on the Filestore

# deployment-b.yaml - Second workload using a different subdirectory
volumeMounts:
  - name: shared-data
    mountPath: /data
    subPath: app-b  # Uses /data/app-b on the Filestore
```

This lets multiple applications share the same Filestore instance while keeping their data separated.

## Troubleshooting

If your PVC is stuck in Pending state, check the events:

```bash
# Check events for a pending PVC
kubectl describe pvc shared-data
```

Common issues include the Filestore API not being enabled, insufficient quota, or network configuration problems. Make sure the Filestore API is enabled:

```bash
# Enable the Filestore API
gcloud services enable file.googleapis.com
```

Also check that the GKE node service account has the `roles/file.editor` role.

Filestore CSI on GKE gives you a straightforward path to ReadWriteMany volumes. The setup is simple, the integration is native, and once it is running, your pods can share files as easily as if they were on the same machine.
