# How to Mount Parallelstore as a Persistent Volume in GKE Using the Parallelstore CSI Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud, Parallelstore, GKE, Kubernetes, CSI Driver, Persistent Volume

Description: Learn how to mount Google Cloud Parallelstore as a persistent volume in GKE using the Parallelstore CSI driver for high-performance parallel file storage.

---

If you have ever worked with machine learning workloads on GKE, you know that standard storage solutions can become a bottleneck pretty quickly. Traditional persistent disks are great for many use cases, but when you need to feed terabytes of training data to dozens of GPU nodes simultaneously, you need something purpose-built for parallel I/O. That is where Google Cloud Parallelstore comes in, and mounting it as a persistent volume in GKE through the CSI driver makes the whole experience feel native to Kubernetes.

Parallelstore is a managed high-performance parallel file system based on Intel DAOS technology. It delivers the kind of throughput and IOPS that AI/ML workloads demand - we are talking hundreds of GB/s of aggregate throughput across a cluster. The Parallelstore CSI driver lets your GKE pods consume this storage just like any other persistent volume, which means your existing Kubernetes workflows stay intact.

## Prerequisites

Before diving in, make sure you have a few things ready:

- A GKE cluster running version 1.29 or later
- The Parallelstore CSI driver add-on enabled on your cluster
- A Parallelstore instance created in the same VPC and region as your GKE cluster
- The gcloud CLI installed and configured
- kubectl configured to talk to your GKE cluster

## Step 1: Create a Parallelstore Instance

First, create a Parallelstore instance if you have not already. The instance needs to be in the same VPC network as your GKE cluster for direct connectivity.

```bash
# Create a Parallelstore instance with 12 TiB capacity
# The instance must be in the same region and VPC as your GKE cluster
gcloud parallelstore instances create my-parallelstore \
    --project=my-project \
    --location=us-central1-a \
    --capacity-gib=12288 \
    --network=projects/my-project/global/networks/default \
    --description="Parallelstore for ML training data"
```

This takes a few minutes to provision. You can check the status with:

```bash
# Check the instance status - wait until it shows ACTIVE
gcloud parallelstore instances describe my-parallelstore \
    --project=my-project \
    --location=us-central1-a
```

Once the instance is active, note down the access points (IP addresses) - you will need these later.

## Step 2: Enable the Parallelstore CSI Driver on Your GKE Cluster

The CSI driver needs to be enabled as a cluster add-on. If you did not enable it during cluster creation, you can update an existing cluster.

```bash
# Enable the Parallelstore CSI driver on an existing GKE cluster
gcloud container clusters update my-gke-cluster \
    --project=my-project \
    --location=us-central1 \
    --update-addons=ParallelstoreCsiDriver=ENABLED
```

Verify the driver is running by checking for the CSI driver pods:

```bash
# Verify the CSI driver pods are running in the kube-system namespace
kubectl get pods -n kube-system -l app=parallelstore-csi-driver
```

You should see driver pods running on each node in your cluster.

## Step 3: Create a StorageClass

Now create a StorageClass that references the Parallelstore CSI driver. This tells Kubernetes how to provision and mount Parallelstore volumes.

```yaml
# parallelstore-storageclass.yaml
# This StorageClass configures the Parallelstore CSI driver
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: parallelstore-sc
provisioner: parallelstore.csi.storage.gke.io
parameters:
  # The network must match your Parallelstore instance network
  network: projects/my-project/global/networks/default
volumeBindingMode: Immediate
reclaimPolicy: Delete
```

Apply the StorageClass:

```bash
# Apply the StorageClass to your cluster
kubectl apply -f parallelstore-storageclass.yaml
```

## Step 4: Create a PersistentVolume and PersistentVolumeClaim

For pre-existing Parallelstore instances, you create a PV that points to your instance and a PVC that binds to it.

```yaml
# parallelstore-pv-pvc.yaml
# PersistentVolume referencing the existing Parallelstore instance
apiVersion: v1
kind: PersistentVolume
metadata:
  name: parallelstore-pv
spec:
  storageClassName: parallelstore-sc
  capacity:
    storage: 12Ti
  accessModes:
    - ReadWriteMany  # Parallelstore supports concurrent read/write from multiple pods
  persistentVolumeReclaimPolicy: Retain
  csi:
    driver: parallelstore.csi.storage.gke.io
    # The volumeHandle format is projects/<project>/locations/<zone>/instances/<instance-name>
    volumeHandle: projects/my-project/locations/us-central1-a/instances/my-parallelstore
    volumeAttributes:
      network: projects/my-project/global/networks/default
---
# PersistentVolumeClaim that binds to the PV above
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: parallelstore-pvc
spec:
  storageClassName: parallelstore-sc
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 12Ti
  volumeName: parallelstore-pv
```

Apply both resources:

```bash
# Create the PV and PVC
kubectl apply -f parallelstore-pv-pvc.yaml

# Verify the PVC is bound to the PV
kubectl get pvc parallelstore-pvc
```

The PVC status should show as "Bound".

## Step 5: Mount the Volume in a Pod

With the PVC ready, mount it into your workload pods. Here is an example deployment that mounts the Parallelstore volume at /data:

```yaml
# ml-training-deployment.yaml
# A sample deployment that mounts Parallelstore for ML training data
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training
spec:
  replicas: 4  # Multiple replicas can read/write simultaneously
  selector:
    matchLabels:
      app: ml-training
  template:
    metadata:
      labels:
        app: ml-training
    spec:
      containers:
      - name: trainer
        image: us-docker.pkg.dev/my-project/ml/trainer:latest
        resources:
          limits:
            nvidia.com/gpu: 1
        volumeMounts:
        - name: training-data
          mountPath: /data  # Your training scripts read data from here
        - name: checkpoints
          mountPath: /checkpoints
          subPath: checkpoints  # Use a subdirectory for model checkpoints
      volumes:
      - name: training-data
        persistentVolumeClaim:
          claimName: parallelstore-pvc
      - name: checkpoints
        persistentVolumeClaim:
          claimName: parallelstore-pvc
```

Deploy the workload:

```bash
# Deploy the ML training workload
kubectl apply -f ml-training-deployment.yaml

# Verify pods are running and the volume is mounted
kubectl get pods -l app=ml-training
kubectl exec -it $(kubectl get pod -l app=ml-training -o jsonpath='{.items[0].metadata.name}') -- df -h /data
```

## Performance Tuning Tips

Getting the mount working is one thing - getting the best performance out of it requires a few tweaks.

First, consider your mount options. The CSI driver supports passing DAOS-specific mount options that can significantly impact performance. For sequential read workloads, larger read-ahead buffers help. For random I/O patterns, smaller buffers reduce wasted prefetch.

Second, think about your node pool configuration. Parallelstore performance scales with the number of nodes accessing it. If you are running a distributed training job across 8 GPU nodes, each node gets its own connection to the Parallelstore instance, and the aggregate throughput scales linearly.

Third, make sure your GKE nodes and Parallelstore instance are in the same zone. Cross-zone access works but adds latency that can eat into your throughput gains.

## Troubleshooting Common Issues

If the PVC stays in "Pending" state, check that the CSI driver is running and that the volumeHandle in your PV matches the exact resource path of your Parallelstore instance. A mismatch in the project ID, zone, or instance name will prevent binding.

If pods cannot mount the volume, verify that the VPC network specified in the StorageClass matches the network your Parallelstore instance is connected to. Network mismatches are the most common cause of mount failures.

If you see permission errors, ensure your GKE node service account has the `roles/parallelstore.user` IAM role on the Parallelstore instance.

## Wrapping Up

Mounting Parallelstore as a persistent volume in GKE through the CSI driver gives you the best of both worlds - the raw performance of a parallel file system with the orchestration and scheduling capabilities of Kubernetes. The setup is straightforward once you understand the relationship between the Parallelstore instance, the CSI driver, and the standard Kubernetes PV/PVC model. For AI/ML workloads that need to process large datasets across multiple nodes, this combination is hard to beat.
