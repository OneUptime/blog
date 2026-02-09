# How to Configure Longhorn Distributed Block Storage with Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Longhorn

Description: Deploy Longhorn distributed block storage on Kubernetes with volume replication, snapshots, and disaster recovery capabilities for highly available stateful workloads.

---

Longhorn transforms local node storage into a distributed block storage system that replicates data across your Kubernetes cluster. Unlike traditional SAN or NAS solutions that require dedicated storage hardware, Longhorn uses the disks already present in your worker nodes to create resilient persistent volumes with enterprise features like snapshots, backups, and cross-cluster disaster recovery.

This guide covers Longhorn installation, replica configuration, volume management through the web UI and kubectl, and best practices for production deployments requiring data durability and availability.

## Understanding Longhorn Architecture

Longhorn implements distributed block storage using a microservices approach. Each volume consists of a controller that manages I/O operations and multiple replicas distributed across different nodes. When an application writes data, the controller synchronously writes to all replicas before acknowledging the write, ensuring consistency.

The system comprises several components: the Longhorn Manager runs on each node and manages volumes and replicas, the Longhorn Engine handles actual data I/O and replication, the CSI driver integrates with Kubernetes for dynamic provisioning, and the web UI provides management capabilities. This architecture ensures that even if nodes fail, your data remains accessible through surviving replicas.

## Prerequisites and Node Preparation

Longhorn requires specific packages on each worker node for iSCSI connectivity and filesystem operations.

```bash
# On Ubuntu 22.04 or 24.04 nodes
sudo apt-get update
sudo apt-get install -y open-iscsi nfs-common curl

# Start and enable iSCSI daemon
sudo systemctl enable --now iscsid
sudo systemctl status iscsid

# Verify kernel modules are loaded
lsmod | grep iscsi_tcp
lsmod | grep dm_crypt

# If not loaded, load them
sudo modprobe iscsi_tcp
sudo modprobe dm_crypt

# Make modules load on boot
echo "iscsi_tcp" | sudo tee -a /etc/modules
echo "dm_crypt" | sudo tee -a /etc/modules
```

Check that nodes have available disk space. Longhorn uses the default data path `/var/lib/longhorn` unless configured otherwise.

```bash
# Verify available space on all nodes
df -h /var/lib

# Optionally, create a dedicated partition for Longhorn
# This example assumes you have /dev/sdb available
sudo mkfs.ext4 /dev/sdb
sudo mkdir -p /var/lib/longhorn
sudo mount /dev/sdb /var/lib/longhorn

# Add to fstab for persistence
echo "/dev/sdb /var/lib/longhorn ext4 defaults 0 2" | sudo tee -a /etc/fstab
```

## Installing Longhorn with Helm

Deploy Longhorn using the official Helm chart with customized settings.

```bash
# Add Longhorn Helm repository
helm repo add longhorn https://charts.longhorn.io
helm repo update

# Create namespace
kubectl create namespace longhorn-system

# Install Longhorn with custom values
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --set persistence.defaultClass=true \
  --set persistence.defaultClassReplicaCount=3 \
  --set defaultSettings.defaultReplicaCount=3 \
  --set defaultSettings.guaranteedInstanceManagerCPU=5 \
  --set defaultSettings.backupTarget=s3://backups@us-east-1/ \
  --set defaultSettings.backupTargetCredentialSecret=longhorn-backup-secret

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod \
  -l app=longhorn-manager \
  -n longhorn-system \
  --timeout=300s
```

Verify the installation deployed all required components.

```bash
# Check deployed resources
kubectl get pods -n longhorn-system
kubectl get daemonsets -n longhorn-system
kubectl get deployments -n longhorn-system
kubectl get services -n longhorn-system

# Verify CSI driver registration
kubectl get csidrivers | grep longhorn

# Check storage class was created
kubectl get storageclass longhorn
```

## Accessing the Longhorn UI

Expose the Longhorn web interface for volume management and monitoring.

```bash
# Port forward for local access
kubectl port-forward -n longhorn-system service/longhorn-frontend 8080:80

# Or create an Ingress for production access
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: longhorn-ingress
  namespace: longhorn-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - longhorn.example.com
    secretName: longhorn-tls
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
EOF
```

Access the UI at http://localhost:8080 or https://longhorn.example.com to see the dashboard showing volume status, node information, and system health.

## Configuring Backup Targets

Longhorn supports S3-compatible backup targets for off-cluster disaster recovery. Create a secret with S3 credentials.

```bash
# Create AWS credentials secret
kubectl create secret generic longhorn-backup-secret \
  -n longhorn-system \
  --from-literal=AWS_ACCESS_KEY_ID=your-access-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-secret-key \
  --from-literal=AWS_ENDPOINTS=https://s3.amazonaws.com
```

Configure the backup target in Longhorn settings.

```yaml
# longhorn-settings.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: longhorn-default-setting
  namespace: longhorn-system
data:
  backup-target: s3://your-bucket@us-east-1/
  backup-target-credential-secret: longhorn-backup-secret
```

Apply the configuration and verify in the UI under Settings > General > Backup Target.

## Creating Volumes with Replication

Create a PVC using the Longhorn storage class. Longhorn automatically creates replicas based on the default replica count.

```yaml
# database-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 50Gi
```

Deploy a StatefulSet that uses this volume.

```yaml
# postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: changeme
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: longhorn
      resources:
        requests:
          storage: 50Gi
```

Apply and verify replica distribution.

```bash
kubectl apply -f postgres-statefulset.yaml
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s

# Check volume details in CLI
kubectl get volumes -n longhorn-system
kubectl describe volume -n longhorn-system <volume-name>
```

In the Longhorn UI, navigate to Volume to see replica placement across nodes.

## Configuring Custom Replica Counts

Override default replica count per volume using storage class parameters.

```yaml
# longhorn-replicated-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-5-replicas
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "5"
  staleReplicaTimeout: "2880"
  fromBackup: ""
  fsType: "ext4"
  dataLocality: "disabled"
```

This storage class creates volumes with five replicas instead of the default three, useful for critical data requiring extra redundancy.

## Implementing Volume Snapshots

Longhorn supports CSI snapshots for point-in-time backups.

```yaml
# volumesnapshotclass.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: longhorn-snapshot
driver: driver.longhorn.io
deletionPolicy: Delete
---
# volumesnapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot
spec:
  volumeSnapshotClassName: longhorn-snapshot
  source:
    persistentVolumeClaimName: postgres-data
```

Create the snapshot and verify.

```bash
kubectl apply -f volumesnapshot.yaml
kubectl get volumesnapshot postgres-snapshot

# Restore from snapshot
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  dataSource:
    name: postgres-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 50Gi
EOF
```

## Creating Backups to S3

Longhorn backups are full copies stored in S3, independent of snapshots.

```yaml
# backup.yaml
apiVersion: longhorn.io/v1beta1
kind: Backup
metadata:
  name: postgres-backup
  namespace: longhorn-system
spec:
  snapshotName: postgres-snapshot
  labels:
    app: postgres
    environment: production
```

Or trigger backups from the UI by selecting a volume and clicking "Create Backup". Backups run asynchronously and can be restored to any Longhorn cluster with access to the S3 bucket.

## Monitoring Volume Health

Check volume and replica health through kubectl.

```bash
# List all volumes
kubectl get volumes -n longhorn-system

# Get detailed volume status
kubectl get volume -n longhorn-system <volume-name> -o yaml

# Check replica status
kubectl get replicas -n longhorn-system

# View engines
kubectl get engines -n longhorn-system

# Check for degraded volumes
kubectl get volumes -n longhorn-system -o json | \
  jq '.items[] | select(.status.robustness != "healthy") | .metadata.name'
```

Monitor Longhorn metrics with Prometheus by enabling the ServiceMonitor.

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: longhorn-prometheus-servicemonitor
  namespace: longhorn-system
spec:
  selector:
    matchLabels:
      app: longhorn-manager
  endpoints:
  - port: manager
```

Key metrics to alert on include `longhorn_volume_robustness`, `longhorn_volume_replica_count`, and `longhorn_node_storage_usage_bytes`.

## Handling Node Failures

Longhorn automatically rebuilds replicas when nodes fail. Test this behavior by cordoning and draining a node.

```bash
# Cordon node to prevent new pods
kubectl cordon worker02

# Drain node (this will trigger replica rebuild)
kubectl drain worker02 --ignore-daemonsets --delete-emptydir-data

# Watch replica rebuild in UI or CLI
kubectl get volumes -n longhorn-system -w
```

Longhorn creates new replicas on healthy nodes to maintain the configured replica count. Once the node returns, you can rebalance replicas or leave them on new nodes.

Longhorn delivers enterprise storage capabilities without requiring specialized hardware or complex configuration. By leveraging existing node storage with intelligent replication and backup strategies, it provides data durability comparable to cloud provider block storage while maintaining full control over your infrastructure. The combination of CSI integration, web-based management, and automated recovery makes it an excellent choice for production Kubernetes workloads requiring persistent state.
