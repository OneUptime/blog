# How to Set Up Dynamic Volume Provisioning in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, StorageClass, Persistent Volume

Description: Learn how to configure dynamic volume provisioning in Rancher to automatically create persistent volumes when applications request storage.

Dynamic volume provisioning eliminates the need for cluster administrators to manually create persistent volumes. When a PVC is created, Kubernetes automatically provisions a matching PV using the configured StorageClass and its provisioner. This guide shows how to set up and manage dynamic provisioning in Rancher.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster
- A storage backend with a compatible CSI driver or dynamic provisioner installed
- kubectl access to your cluster

## Understanding Dynamic Provisioning

In static provisioning, an administrator creates PVs manually and users create PVCs to claim them. Dynamic provisioning automates this by using StorageClasses that define how to create volumes on demand.

The workflow is:

1. Admin creates a StorageClass with a provisioner
2. User creates a PVC referencing the StorageClass
3. The provisioner automatically creates a PV
4. The PVC binds to the new PV
5. A pod mounts the PVC

## Step 1: Identify Available CSI Drivers

Check which CSI drivers are installed:

```bash
kubectl get csidrivers
```

Common CSI drivers include:

- `ebs.csi.aws.com` - AWS EBS
- `disk.csi.azure.com` - Azure Disk
- `pd.csi.storage.gke.io` - Google Persistent Disk
- `csi.vsphere.vmware.com` - vSphere
- `nfs.csi.k8s.io` - NFS

If you're using Rancher's Local Path Provisioner, its provisioner name is `rancher.io/local-path`, but it is not a CSI driver and does not appear in `kubectl get csidrivers`.

## Step 2: Create a StorageClass for Dynamic Provisioning

The following example uses the AWS EBS CSI driver. Replace the provisioner and parameters for your own storage backend.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: dynamic-storage
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  csi.storage.k8s.io/fstype: ext4
  encrypted: "true"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f dynamic-storage-class.yaml
```

## Step 3: Create a PVC to Trigger Provisioning

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: auto-provisioned-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: dynamic-storage
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f auto-pvc.yaml
```

With `WaitForFirstConsumer`, volume binding and provisioning are delayed until a pod that uses the PVC is created. With `Immediate`, the PV is created right away.

## Step 4: Use the Default StorageClass

PVCs that omit storageClassName use the default StorageClass:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: default-class-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

To prevent using the default, explicitly set `storageClassName: ""` to require manual binding.

## Step 5: Configure Multiple Storage Tiers

The following example shows different classes for AWS EBS:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iopsPerGB: "50"
  encrypted: "true"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: economy
provisioner: ebs.csi.aws.com
parameters:
  type: st1
reclaimPolicy: Delete
allowVolumeExpansion: false
volumeBindingMode: WaitForFirstConsumer
```

## Step 6: Dynamic Provisioning with StatefulSets

StatefulSets leverage volumeClaimTemplates for automatic per-replica provisioning:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: default
spec:
  clusterIP: None
  selector:
    app: nginx
  ports:
  - name: web
    port: 80
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
  namespace: default
spec:
  serviceName: nginx
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: registry.k8s.io/nginx-slim:0.24
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes:
        - ReadWriteOnce
      storageClassName: fast
      resources:
        requests:
          storage: 10Gi
```

This creates three PVCs (`www-web-0`, `www-web-1`, `www-web-2`), each dynamically provisioned.

## Step 7: Configure via the Rancher UI

1. Click **☰ > Cluster Management**.
2. Open the target cluster and click **Explore**.
3. Go to **Storage** > **StorageClasses**.
4. Click **Create**.
5. Enter a name and select the provisioner.
6. Configure parameters specific to your storage backend.
7. Click **Create**.

To use the StorageClass with a StatefulSet in the Rancher UI:

1. In the left navigation bar, click **Workload**.
2. Click **Create** > **StatefulSet**.
3. In **Volume Claim Templates**, click **Add Claim Template**.
4. Select the StorageClass and mount point.
5. Click **Launch**.

## Step 8: Restrict Dynamic Provisioning

Use ResourceQuotas to limit storage consumption per namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: development
spec:
  hard:
    requests.storage: 100Gi
    persistentvolumeclaims: "10"
    fast.storageclass.storage.k8s.io/requests.storage: 50Gi
    fast.storageclass.storage.k8s.io/persistentvolumeclaims: "5"
```

This limits the `development` namespace to 100Gi total storage and 10 PVCs, with additional limits for the `fast` StorageClass.

## Step 9: Verify Dynamic Provisioning

Watch the provisioning workflow:

```bash
# Create the PVC

kubectl apply -f auto-pvc.yaml

# Watch PVC status
kubectl get pvc auto-provisioned-pvc -w

# Deploy a pod that uses it
kubectl apply -f pod-with-pvc.yaml

# Verify PV was created
kubectl get pv

# Check the provisioned volume details
kubectl describe pv <auto-created-pv-name>
```

## Step 10: Troubleshoot Provisioning Failures

```bash
# Check PVC events
kubectl describe pvc <pvc-name> -n <namespace>

# Find the relevant storage controller or provisioner pods
kubectl get pods --all-namespaces | grep -E 'csi|provisioner|storage'

# Check logs from the relevant controller pod
kubectl logs -n <namespace> <controller-pod-name> --tail=100

# Verify StorageClass exists
kubectl get storageclass

# Look for provisioning events
kubectl get events --all-namespaces --sort-by='.metadata.creationTimestamp' | grep -i provision
```

Common issues:
- **No provisioner found**: Matching CSI driver or external provisioner is not installed, or the `StorageClass` provisioner name does not match
- **Quota exceeded**: ResourceQuota limits reached
- **Zone mismatch**: Use `WaitForFirstConsumer` binding mode
- **Insufficient capacity**: Storage backend has no space

## Summary

Dynamic volume provisioning in Rancher automates the creation of persistent storage, reducing administrative overhead and enabling self-service storage for development teams. By configuring StorageClasses with appropriate provisioners, parameters, and policies, you can provide different storage tiers while maintaining control through resource quotas and reclaim policies. This is the recommended approach for production Kubernetes environments.
