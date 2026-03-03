# How to Install Longhorn Distributed Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Longhorn, Kubernetes, Distributed Storage, Persistent Storage

Description: Complete guide to installing and configuring Longhorn distributed storage on a Talos Linux Kubernetes cluster for reliable persistent volumes.

---

Longhorn is a lightweight, cloud-native distributed storage system for Kubernetes developed by Rancher Labs. It provides reliable persistent block storage by replicating data across multiple nodes. Compared to Ceph, Longhorn is simpler to set up and manage, making it an attractive option for smaller Talos Linux clusters or teams that want distributed storage without the operational overhead of Ceph.

This guide covers installing Longhorn on Talos Linux, configuring it properly, and using it for your workloads.

## Prerequisites

Before installing Longhorn, you need:

- A Talos Linux cluster with at least 3 worker nodes
- Each worker should have available disk space (either a dedicated disk or free space on the system disk)
- kubectl and Helm configured for your cluster
- The open-iscsi system extension installed on Talos nodes

## Preparing Talos Linux for Longhorn

Longhorn requires iSCSI support and specific host paths to be available. Create a machine config patch for your worker nodes:

```yaml
# longhorn-patch.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
  kubelet:
    extraMounts:
      - destination: /var/lib/longhorn
        type: bind
        source: /var/lib/longhorn
        options:
          - bind
          - rshared
          - rw
  sysctls:
    vm.max_map_count: "262144"
  files:
    - content: ""
      path: /var/lib/longhorn
      op: create
```

Apply this patch to all worker nodes:

```bash
# Apply the Longhorn patch to each worker
talosctl patch machineconfig \
  --nodes <worker-1-ip> \
  --patch @longhorn-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-2-ip> \
  --patch @longhorn-patch.yaml

talosctl patch machineconfig \
  --nodes <worker-3-ip> \
  --patch @longhorn-patch.yaml
```

Wait for the nodes to finish applying the configuration:

```bash
# Check node status
talosctl health --nodes <worker-1-ip>
```

## Installing Longhorn with Helm

```bash
# Add the Longhorn Helm repository
helm repo add longhorn https://charts.longhorn.io
helm repo update

# Create the namespace
kubectl create namespace longhorn-system
```

Create a values file tailored for Talos Linux:

```yaml
# longhorn-values.yaml
defaultSettings:
  defaultDataPath: /var/lib/longhorn
  defaultReplicaCount: 3
  storageMinimalAvailablePercentage: 15
  storageOverProvisioningPercentage: 100
  createDefaultDiskLabeledNodes: true
  defaultDataLocality: best-effort
  replicaSoftAntiAffinity: true
  replicaAutoBalance: best-effort
  guaranteedInstanceManagerCPU: 15
  backupTarget: ""
  backupTargetCredentialSecret: ""

persistence:
  defaultClass: true
  defaultFsType: ext4
  defaultClassReplicaCount: 3
  reclaimPolicy: Delete

longhornUI:
  replicas: 1

ingress:
  enabled: false

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

csi:
  attacherReplicaCount: 2
  provisionerReplicaCount: 2
  resizerReplicaCount: 2
  snapshotterReplicaCount: 2
```

```bash
# Install Longhorn
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  -f longhorn-values.yaml

# Watch the installation progress
kubectl -n longhorn-system get pods -w
```

## Verifying the Installation

Once all pods are running, verify Longhorn is operational:

```bash
# Check all Longhorn pods
kubectl -n longhorn-system get pods

# Verify the StorageClass was created
kubectl get storageclass longhorn

# Check Longhorn nodes
kubectl -n longhorn-system get nodes.longhorn.io
```

You should see a `longhorn` StorageClass that is set as the default.

## Accessing the Longhorn UI

Longhorn includes a web UI for monitoring and management:

```bash
# Port forward to the UI
kubectl -n longhorn-system port-forward svc/longhorn-frontend 8080:80

# Open http://localhost:8080 in your browser
```

For persistent access, create an ingress:

```yaml
# longhorn-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: longhorn-ingress
  namespace: longhorn-system
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: longhorn-basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
spec:
  ingressClassName: nginx
  rules:
    - host: longhorn.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: longhorn-frontend
                port:
                  number: 80
```

## Creating and Using Persistent Volumes

With Longhorn installed, create PVCs like you would with any storage class:

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-longhorn-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: longhorn
---
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
spec:
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "while true; do echo $(date) >> /data/log.txt; sleep 5; done"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: test-longhorn-pvc
```

```bash
# Create the test workload
kubectl apply -f test-pvc.yaml

# Verify the PVC is bound
kubectl get pvc test-longhorn-pvc

# Check the pod is running
kubectl get pod test-pod

# Verify data is being written
kubectl exec test-pod -- cat /data/log.txt
```

## Custom Storage Classes

Create additional storage classes for different workload requirements:

```yaml
# longhorn-fast.yaml - for databases (fewer replicas, better performance)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-fast
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Retain
parameters:
  numberOfReplicas: "2"
  staleReplicaTimeout: "2880"
  fromBackup: ""
  fsType: xfs
  dataLocality: strict-local
```

```yaml
# longhorn-durable.yaml - for critical data (more replicas)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-durable
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Retain
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "2880"
  fromBackup: ""
  fsType: ext4
```

## Configuring Backups

Longhorn supports backups to S3-compatible storage and NFS:

```bash
# Create a secret with S3 credentials
kubectl -n longhorn-system create secret generic s3-backup-secret \
  --from-literal=AWS_ACCESS_KEY_ID=your-access-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-secret-key \
  --from-literal=AWS_ENDPOINTS=https://s3.amazonaws.com
```

Then configure the backup target in Longhorn settings:

```bash
# Set backup target via Longhorn settings
kubectl -n longhorn-system patch settings.longhorn.io backup-target \
  --type merge -p '{"value": "s3://longhorn-backups@us-east-1/"}'

kubectl -n longhorn-system patch settings.longhorn.io backup-target-credential-secret \
  --type merge -p '{"value": "s3-backup-secret"}'
```

## Volume Snapshots and Recurring Jobs

Set up automated snapshots:

```yaml
# recurring-job.yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-snapshot
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"
  task: snapshot
  groups:
    - default
  retain: 7
  concurrency: 5
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: weekly-backup
  namespace: longhorn-system
spec:
  cron: "0 3 * * 0"
  task: backup
  groups:
    - default
  retain: 4
  concurrency: 2
```

## Monitoring Longhorn

Check storage usage and volume health:

```bash
# List all Longhorn volumes
kubectl -n longhorn-system get volumes.longhorn.io

# Check replica status for a volume
kubectl -n longhorn-system get replicas.longhorn.io

# View engine status
kubectl -n longhorn-system get engines.longhorn.io

# Check node disk status
kubectl -n longhorn-system get nodes.longhorn.io -o yaml
```

## Troubleshooting

Common issues on Talos Linux:

```bash
# Check if iSCSI is working
talosctl services --nodes <worker-ip> | grep iscsid

# Check Longhorn manager logs
kubectl -n longhorn-system logs -l app=longhorn-manager --tail=50

# Check CSI driver logs
kubectl -n longhorn-system logs -l app=longhorn-csi-plugin --tail=50

# Verify the host path exists on nodes
talosctl ls /var/lib/longhorn --nodes <worker-ip>
```

## Summary

Longhorn provides a simpler alternative to Ceph for distributed storage on Talos Linux. With its built-in UI, automated backups, and straightforward configuration, it is well suited for teams that want reliable persistent storage without dedicating significant time to storage operations. The key to success on Talos Linux is properly configuring the machine patches for iSCSI support and host paths. Once that is done, Longhorn integrates smoothly with Kubernetes through standard StorageClasses and PersistentVolumeClaims.
