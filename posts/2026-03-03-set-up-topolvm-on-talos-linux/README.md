# How to Set Up TopoLVM on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TopoLVM, Kubernetes, LVM, Local Storage, CSI

Description: Deploy and configure TopoLVM for topology-aware LVM-based local storage provisioning on your Talos Linux Kubernetes cluster.

---

TopoLVM is a CSI plugin that provisions local storage using LVM (Logical Volume Manager) and provides topology-aware volume scheduling. What sets TopoLVM apart from simpler local storage provisioners is that it reports available storage capacity per node, so the Kubernetes scheduler can make informed decisions about where to place pods based on storage availability. This prevents the common problem where a pod gets scheduled on a node that does not have enough disk space.

On Talos Linux, TopoLVM gives you high-performance local storage with proper capacity management and dynamic provisioning.

## Prerequisites

- A Talos Linux cluster with at least 2 worker nodes
- Each worker should have a dedicated disk or partition for LVM
- The LVM2 utilities available through Talos system extensions
- Helm and kubectl configured for your cluster

## Preparing Talos Linux for TopoLVM

TopoLVM needs LVM support on the nodes. Create a machine config patch:

```yaml
# topolvm-patch.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/lvm2:v2.03.22-v1.6.0
  kubelet:
    extraMounts:
      - destination: /run/topolvm
        type: bind
        source: /run/topolvm
        options:
          - bind
          - rshared
          - rw
```

Apply the patch to worker nodes:

```bash
# Apply to each worker node
talosctl patch machineconfig \
  --nodes <worker-1-ip> \
  --patch @topolvm-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-2-ip> \
  --patch @topolvm-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-3-ip> \
  --patch @topolvm-patch.yaml
```

## Creating LVM Volume Groups

Before installing TopoLVM, you need to create LVM volume groups on each node. Talos Linux does not provide interactive shell access, so you will use a DaemonSet to set up the volume groups:

```yaml
# lvm-setup-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: lvm-setup
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: lvm-setup
  template:
    metadata:
      labels:
        app: lvm-setup
    spec:
      hostPID: true
      hostNetwork: true
      containers:
        - name: setup
          image: ubuntu:22.04
          command:
            - /bin/bash
            - -c
            - |
              # Install LVM tools
              apt-get update && apt-get install -y lvm2
              # Check if volume group already exists
              if ! vgs topolvm-vg 2>/dev/null; then
                echo "Creating LVM volume group on /dev/sdb"
                pvcreate /dev/sdb
                vgcreate topolvm-vg /dev/sdb
                echo "Volume group created successfully"
              else
                echo "Volume group already exists"
              fi
              # Keep running
              sleep infinity
          securityContext:
            privileged: true
          volumeMounts:
            - name: dev
              mountPath: /dev
      volumes:
        - name: dev
          hostPath:
            path: /dev
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - operator: Exists
```

```bash
# Run the LVM setup
kubectl apply -f lvm-setup-daemonset.yaml

# Check logs to verify VG creation
kubectl -n kube-system logs -l app=lvm-setup

# Once confirmed, remove the setup DaemonSet
kubectl delete -f lvm-setup-daemonset.yaml
```

## Installing TopoLVM

```bash
# Add the TopoLVM Helm repository
helm repo add topolvm https://topolvm.github.io/topolvm
helm repo update
```

Create a values file:

```yaml
# topolvm-values.yaml
controller:
  replicaCount: 2
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi

node:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi
  lvmd:
    managed: true
    deviceClasses:
      - name: ssd
        volume-group: topolvm-vg
        default: true
        spare-gb: 10
        type: thick

# The scheduler extender helps Kubernetes make better scheduling decisions
scheduler:
  enabled: true

storageClasses:
  - name: topolvm-ssd
    storageClass:
      fsType: xfs
      isDefaultClass: true
      volumeBindingMode: WaitForFirstConsumer
      allowVolumeExpansion: true
      reclaimPolicy: Delete
      additionalParameters:
        topolvm.io/device-class: ssd

webhook:
  caBundle: null
  mutatingWebhookConfiguration:
    enabled: true
```

```bash
# Install TopoLVM
helm install topolvm topolvm/topolvm \
  --namespace topolvm-system \
  --create-namespace \
  -f topolvm-values.yaml

# Watch the pods come up
kubectl -n topolvm-system get pods -w
```

## Verifying the Installation

```bash
# Check all TopoLVM pods
kubectl -n topolvm-system get pods

# Verify the StorageClass was created
kubectl get storageclass topolvm-ssd

# Check node capacity reporting
kubectl get nodes -o custom-columns='NAME:.metadata.name,CAPACITY:.status.capacity.topolvm\.io/ssd'
```

The capacity column should show the available storage on each node. This is the key feature of TopoLVM - the scheduler uses this information to place pods on nodes with enough space.

## Using TopoLVM Storage

Create a PVC and use it in a pod:

```yaml
# test-topolvm.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: topolvm-test
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: topolvm-ssd
---
apiVersion: v1
kind: Pod
metadata:
  name: topolvm-test-pod
  namespace: default
spec:
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "dd if=/dev/zero of=/data/testfile bs=1M count=100 && ls -la /data/ && sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
      resources:
        requests:
          cpu: 100m
          memory: 64Mi
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: topolvm-test
```

```bash
kubectl apply -f test-topolvm.yaml

# Check that the PVC is bound
kubectl get pvc topolvm-test

# Verify the pod is running
kubectl get pod topolvm-test-pod

# Check the LVM logical volume was created
kubectl -n topolvm-system exec ds/topolvm-node -- lvs topolvm-vg
```

## StatefulSet with TopoLVM

TopoLVM works well with StatefulSets for databases and other stateful applications:

```yaml
# redis-topolvm.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: cache
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: topolvm-ssd
        resources:
          requests:
            storage: 10Gi
```

The scheduler extender ensures each Redis pod is placed on a node with at least 10Gi of available LVM storage.

## Multiple Device Classes

You can configure TopoLVM with multiple device classes for different storage tiers:

```yaml
# In the topolvm-values.yaml
node:
  lvmd:
    managed: true
    deviceClasses:
      - name: ssd
        volume-group: topolvm-ssd-vg
        default: true
        spare-gb: 10
        type: thick
      - name: hdd
        volume-group: topolvm-hdd-vg
        default: false
        spare-gb: 20
        type: thick
```

Create separate StorageClasses for each tier:

```yaml
# topolvm-hdd-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: topolvm-hdd
provisioner: topolvm.io
parameters:
  topolvm.io/device-class: hdd
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Thin Provisioning

TopoLVM supports LVM thin provisioning for overcommitting storage:

```yaml
# In topolvm-values.yaml, change the device class type
node:
  lvmd:
    managed: true
    deviceClasses:
      - name: ssd-thin
        volume-group: topolvm-vg
        default: true
        spare-gb: 5
        type: thin
        thin-pool:
          name: pool0
          overprovision-ratio: 5.0
```

With thin provisioning, you can allocate more storage than physically available, relying on the fact that applications typically do not use all their allocated space immediately.

## Monitoring and Capacity

```bash
# Check per-node capacity
kubectl get nodes -o custom-columns='NAME:.metadata.name,SSD:.status.capacity.topolvm\.io/ssd'

# Check actual LVM usage
kubectl -n topolvm-system exec ds/topolvm-node -- vgs topolvm-vg --units g

# List logical volumes
kubectl -n topolvm-system exec ds/topolvm-node -- lvs topolvm-vg

# Check TopoLVM controller logs
kubectl -n topolvm-system logs deploy/topolvm-controller --tail=50

# Check node agent logs
kubectl -n topolvm-system logs ds/topolvm-node --tail=50
```

## Expanding Volumes

TopoLVM supports online volume expansion:

```bash
# Expand a PVC
kubectl patch pvc topolvm-test -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'

# Monitor the resize
kubectl get pvc topolvm-test -w
```

## Summary

TopoLVM provides intelligent local storage provisioning for Talos Linux by combining LVM with topology-aware scheduling. The key advantage over simpler local storage solutions is that the Kubernetes scheduler knows exactly how much storage is available on each node, preventing scheduling failures due to insufficient disk space. The LVM foundation gives you features like thin provisioning and online volume expansion. For Talos Linux clusters that need fast local storage with proper capacity management, TopoLVM fills the gap between basic hostpath storage and full distributed storage systems.
