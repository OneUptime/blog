# How to Set Up OpenEBS Local PV on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, OpenEBS, Kubernetes, Local Storage, Persistent Volume

Description: Learn how to deploy OpenEBS Local PV for high-performance local persistent storage on your Talos Linux Kubernetes cluster.

---

OpenEBS is a popular open-source storage platform for Kubernetes that provides multiple storage engines. The Local PV Hostpath engine is particularly interesting for Talos Linux because it gives you high-performance local storage with proper Kubernetes integration. Unlike direct hostPath volumes in application manifests, OpenEBS Local PV Hostpath dynamically provisions Kubernetes Local PersistentVolumes with lifecycle management through StorageClasses and PVCs.

This guide covers setting up OpenEBS Local PV Hostpath on Talos Linux. OpenEBS LocalPV Device and Node Disk Manager were deprecated and migrated to the OpenEBS Archive in 2024, so new OpenEBS 4.x installs should use Hostpath, LVM, or ZFS Local PV instead of the older device-based provisioner.

## Why OpenEBS Local PV?

Local storage offers the best possible I/O performance because data reads and writes go directly to the local disk without any network overhead. The tradeoff is that data is tied to a specific node, so if that node goes down, the data is unavailable until the node comes back. This is fine for workloads that have their own replication (like Cassandra, Elasticsearch, or Kafka) or for non-critical data that can be recreated.

OpenEBS Local PV adds proper Kubernetes primitives around local storage:

- Dynamic provisioning through StorageClasses
- Automatic cleanup when PVCs are deleted
- PV and PVC lifecycle management
- Optional filesystem quotas when configured on supported filesystems

## Preparing Talos Linux

OpenEBS Local PV needs access to specific host paths. Create a machine config patch:

```yaml
# openebs-patch.yaml

machine:
  kubelet:
    extraMounts:
      - destination: /var/openebs/local
        type: bind
        source: /var/openebs/local
        options:
          - bind
          - rshared
          - rw
```

Apply the patch to your worker nodes:

```bash
# Create the host path on each worker before adding it as a kubelet bind mount
talosctl exec --nodes <worker-1-ip> -- mkdir -p /var/openebs/local
talosctl exec --nodes <worker-2-ip> -- mkdir -p /var/openebs/local
talosctl exec --nodes <worker-3-ip> -- mkdir -p /var/openebs/local

# Apply to each worker node
talosctl patch machineconfig \
  --nodes <worker-1-ip> \
  --patch @openebs-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-2-ip> \
  --patch @openebs-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-3-ip> \
  --patch @openebs-patch.yaml

# Verify the path is created
talosctl ls /var/openebs --nodes <worker-1-ip>
```

## Installing OpenEBS Local PV with Helm

```bash
# Add the OpenEBS Helm repository
helm repo add openebs https://openebs.github.io/openebs
helm repo update
```

Create a values file that enables only the Local PV engine (we do not need the full OpenEBS suite):

```yaml
# openebs-values.yaml
localpv-provisioner:
  localpv:
    basePath: /var/openebs/local
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi
  hostpathClass:
    enabled: true
    name: openebs-hostpath
    reclaimPolicy: Delete

# Disable engines and observability components we do not need
engines:
  local:
    lvm:
      enabled: false
    zfs:
      enabled: false
    rawfile:
      enabled: false
  replicated:
    mayastor:
      enabled: false

loki:
  enabled: false
alloy:
  enabled: false
```

```bash
# Install OpenEBS
helm install openebs openebs/openebs \
  --namespace openebs \
  --create-namespace \
  -f openebs-values.yaml

# Watch the pods come up
kubectl -n openebs get pods -w
```

## Verifying the Installation

```bash
# Check that all OpenEBS pods are running
kubectl -n openebs get pods

# Verify the StorageClasses were created
kubectl get storageclass | grep openebs

```

You should see the `openebs-hostpath` storage class for hostpath-based local PVs.

## Using OpenEBS Hostpath Local PV

The hostpath provisioner creates directories on the node for each PVC:

```yaml
# hostpath-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: my-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: openebs-hostpath
```

Deploy an application using this PVC:

```yaml
# app-with-local-pv.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: my-database
  namespace: my-app
spec:
  serviceName: my-database
  replicas: 1
  selector:
    matchLabels:
      app: my-database
  template:
    metadata:
      labels:
        app: my-database
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              value: "changeme"
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: openebs-hostpath
        resources:
          requests:
            storage: 20Gi
```

```bash
# Deploy the database
kubectl create namespace my-app
kubectl apply -f app-with-local-pv.yaml

# Check PVC binding
kubectl get pvc -n my-app

# Verify the pod is running
kubectl get pods -n my-app
```

## Custom Storage Classes

Create storage classes with different settings:

```yaml
# openebs-fast-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-local-fast
  annotations:
    openebs.io/cas-type: local
    cas.openebs.io/config: |
      - name: StorageType
        value: "hostpath"
      - name: BasePath
        value: "/var/openebs/local"
provisioner: openebs.io/local
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

```yaml
# openebs-temp-sc.yaml - for temporary data
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-local-temp
  annotations:
    openebs.io/cas-type: local
    cas.openebs.io/config: |
      - name: StorageType
        value: "hostpath"
      - name: BasePath
        value: "/var/openebs/local"
provisioner: openebs.io/local
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

The `WaitForFirstConsumer` binding mode is important because it ensures the PV is created on the same node where the pod is scheduled.

## Using Dedicated Disks

OpenEBS LocalPV Device and Node Disk Manager are deprecated in current OpenEBS releases, so the `openebs-device` StorageClass from older OpenEBS 3.x documentation should not be used for new OpenEBS 4.x installs. If you have dedicated disks on your Talos nodes, use OpenEBS Local PV LVM or ZFS instead.

## Node Affinity and Scheduling

Since local PVs are tied to specific nodes, you need to handle pod scheduling carefully:

```yaml
# statefulset with node awareness
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: search
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - elasticsearch
              topologyKey: kubernetes.io/hostname
      containers:
        - name: app
          image: busybox:1.36
          command:
            - sh
            - -c
            - "while true; do date >> /data/heartbeat.log; sleep 30; done"
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 1
              memory: 2Gi
            limits:
              cpu: 2
              memory: 4Gi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: openebs-hostpath
        resources:
          requests:
            storage: 100Gi
```

The pod anti-affinity rule ensures each pod runs on a different node, and WaitForFirstConsumer binding ensures the PVs are created on the correct nodes.

## Monitoring Storage Usage

```bash
# Check PV usage
kubectl get pv

# Check local storage on each node
talosctl ls /var/openebs/local --nodes <worker-ip>

# Get detailed PV information
kubectl describe pv <pv-name>

# Check OpenEBS provisioner logs
kubectl -n openebs logs -l name=openebs-localpv-provisioner --tail=50
```

## Cleanup and Reclaim

When using `reclaimPolicy: Delete`, the local data is automatically cleaned up when the PVC is deleted. With `Retain`, you need to manually clean up:

```bash
# Delete a PVC
kubectl delete pvc app-data -n my-app

# For Retain policy, the PV stays in Released state
kubectl get pv

# Manually delete the PV
kubectl delete pv <pv-name>

# Clean up the data on the node
talosctl exec --nodes <worker-ip> -- rm -rf /var/openebs/local/<pv-directory>
```

## Summary

OpenEBS Local PV gives you a properly managed local storage solution for Talos Linux clusters. It provides the performance benefits of local disk access with the convenience of Kubernetes-native provisioning and lifecycle management. For workloads that handle their own replication, or for development clusters where simplicity matters more than fault tolerance, OpenEBS Local PV is an excellent choice. The setup on Talos Linux is straightforward once you configure the host paths through machine config patches.
