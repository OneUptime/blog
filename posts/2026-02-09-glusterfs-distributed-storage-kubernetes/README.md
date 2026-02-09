# How to Set Up GlusterFS as a Distributed Storage Backend for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GlusterFS, DistributedStorage, Storage

Description: Learn how to deploy and configure GlusterFS as a distributed storage backend for Kubernetes, providing shared filesystem access across pods with high availability and horizontal scalability.

---

GlusterFS is a distributed filesystem that aggregates storage from multiple servers into a single global namespace. It provides ReadWriteMany (RWX) access for Kubernetes workloads, making it ideal for shared application data, content management systems, and collaborative tools.

## Understanding GlusterFS Architecture

GlusterFS uses these components:

1. **Bricks** - Storage directories on GlusterFS nodes
2. **Volumes** - Logical storage units combining bricks
3. **Glusterd** - Management daemon on each node
4. **Heketi** - RESTful volume management for Kubernetes

Volume types:
- **Distributed** - Files spread across bricks
- **Replicated** - Files mirrored across bricks
- **Distributed-Replicated** - Combination of both

## Prerequisites

You need at least 3 nodes with additional disks for GlusterFS storage. Label your nodes:

```bash
# Label storage nodes
kubectl label node node1 storagenode=glusterfs
kubectl label node node2 storagenode=glusterfs
kubectl label node node3 storagenode=glusterfs

# Verify labels
kubectl get nodes -l storagenode=glusterfs
```

## Installing GlusterFS on Nodes

SSH to each storage node and install GlusterFS:

```bash
# On Ubuntu/Debian nodes
sudo apt update
sudo apt install -y glusterfs-server

# Start and enable the service
sudo systemctl start glusterd
sudo systemctl enable glusterd

# Verify GlusterFS is running
sudo systemctl status glusterd

# On each node, prepare the brick directory
sudo mkdir -p /data/brick1/gv0
```

## Setting Up GlusterFS Cluster

From one of the storage nodes, create the trusted storage pool:

```bash
# SSH to node1
ssh node1

# Probe other nodes (use internal IPs)
sudo gluster peer probe node2
sudo gluster peer probe node3

# Verify peer status
sudo gluster peer status

# Should show:
# Number of Peers: 2
# State: Peer in Cluster
```

Create a replicated volume:

```bash
# Create a 3-way replicated volume
sudo gluster volume create gv0 replica 3 \
  node1:/data/brick1/gv0 \
  node2:/data/brick1/gv0 \
  node3:/data/brick1/gv0 \
  force

# Start the volume
sudo gluster volume start gv0

# Verify volume status
sudo gluster volume info gv0

# Output shows:
# Volume Name: gv0
# Type: Replicate
# Status: Started
# Number of Bricks: 1 x 3 = 3
```

## Deploying GlusterFS in Kubernetes

Use the GlusterFS DaemonSet for client support:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: glusterfs-client
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: glusterfs-client
  template:
    metadata:
      labels:
        name: glusterfs-client
    spec:
      hostNetwork: true
      containers:
      - name: glusterfs
        image: gluster/gluster-centos:latest
        securityContext:
          privileged: true
        volumeMounts:
        - name: glusterfs-cgroup
          mountPath: /sys/fs/cgroup
          readOnly: true
        - name: glusterfs-heketi
          mountPath: /var/lib/heketi
        - name: glusterfs-run
          mountPath: /run
        - name: glusterfs-lvm
          mountPath: /run/lvm
        - name: glusterfs-etc
          mountPath: /etc/glusterfs
        - name: glusterfs-logs
          mountPath: /var/log/glusterfs
        - name: glusterfs-config
          mountPath: /var/lib/glusterd
        - name: glusterfs-dev
          mountPath: /dev
        - name: glusterfs-misc
          mountPath: /var/lib/misc/glusterfsd
      volumes:
      - name: glusterfs-cgroup
        hostPath:
          path: /sys/fs/cgroup
      - name: glusterfs-heketi
        hostPath:
          path: /var/lib/heketi
      - name: glusterfs-run
        emptyDir: {}
      - name: glusterfs-lvm
        hostPath:
          path: /run/lvm
      - name: glusterfs-etc
        hostPath:
          path: /etc/glusterfs
      - name: glusterfs-logs
        hostPath:
          path: /var/log/glusterfs
      - name: glusterfs-config
        hostPath:
          path: /var/lib/glusterd
      - name: glusterfs-dev
        hostPath:
          path: /dev
      - name: glusterfs-misc
        hostPath:
          path: /var/lib/misc/glusterfsd
```

## Creating Static GlusterFS PersistentVolumes

Define endpoints for GlusterFS servers:

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: glusterfs-cluster
subsets:
- addresses:
  - ip: 10.0.1.10  # node1 IP
  - ip: 10.0.1.11  # node2 IP
  - ip: 10.0.1.12  # node3 IP
  ports:
  - port: 1
---
apiVersion: v1
kind: Service
metadata:
  name: glusterfs-cluster
spec:
  ports:
  - port: 1
```

Create a PersistentVolume using GlusterFS:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: gluster-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
  - ReadWriteMany  # Multiple pods can mount
  glusterfs:
    endpoints: glusterfs-cluster
    path: gv0  # GlusterFS volume name
    readOnly: false
  persistentVolumeReclaimPolicy: Retain
```

Create a PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gluster-pvc
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
```

Apply the resources:

```bash
kubectl apply -f glusterfs-endpoints.yaml
kubectl apply -f glusterfs-pv.yaml
kubectl apply -f glusterfs-pvc.yaml

# Verify binding
kubectl get pvc gluster-pvc
# STATUS should be "Bound"
```

## Using GlusterFS in Pods

Deploy pods that use the shared storage:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-shared-storage
spec:
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
        image: nginx:latest
        ports:
        - containerPort: 80
        volumeMounts:
        - name: shared-data
          mountPath: /usr/share/nginx/html
      volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: gluster-pvc
```

Test shared access:

```bash
kubectl apply -f nginx-deployment.yaml

# Get pod names
kubectl get pods -l app=nginx

# Write from one pod
kubectl exec nginx-shared-storage-xxxxx-1 -- \
  sh -c 'echo "Hello from Pod 1" > /usr/share/nginx/html/index.html'

# Read from another pod
kubectl exec nginx-shared-storage-xxxxx-2 -- \
  cat /usr/share/nginx/html/index.html

# Output: "Hello from Pod 1"
# Data is shared across all pods!
```

## Installing Heketi for Dynamic Provisioning

Heketi enables dynamic volume provisioning:

```bash
# Create Heketi topology file
cat > topology.json <<EOF
{
  "clusters": [
    {
      "nodes": [
        {
          "node": {
            "hostnames": {
              "manage": ["node1"],
              "storage": ["10.0.1.10"]
            },
            "zone": 1
          },
          "devices": [
            "/dev/sdb"
          ]
        },
        {
          "node": {
            "hostnames": {
              "manage": ["node2"],
              "storage": ["10.0.1.11"]
            },
            "zone": 2
          },
          "devices": [
            "/dev/sdb"
          ]
        },
        {
          "node": {
            "hostnames": {
              "manage": ["node3"],
              "storage": ["10.0.1.12"]
            },
            "zone": 3
          },
          "devices": [
            "/dev/sdb"
          ]
        }
      ]
    }
  ]
}
EOF

# Deploy Heketi
kubectl create -f https://raw.githubusercontent.com/heketi/heketi/master/extras/kubernetes/heketi-deployment.yaml

# Load topology
kubectl exec -n default heketi-xxxxx -- heketi-cli topology load --json=/topology.json
```

Create a StorageClass for dynamic provisioning:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: glusterfs
provisioner: kubernetes.io/glusterfs
parameters:
  resturl: "http://heketi-service:8080"
  restuser: "admin"
  secretNamespace: "default"
  secretName: "heketi-secret"
  volumetype: "replicate:3"
allowVolumeExpansion: true
```

## Monitoring GlusterFS

Check cluster health:

```bash
# On any GlusterFS node
sudo gluster volume status gv0

# Check volume heal status
sudo gluster volume heal gv0 info

# Monitor peer status
sudo gluster peer status

# View volume info
sudo gluster volume info
```

Monitor from Kubernetes:

```bash
# Check GlusterFS endpoints
kubectl get endpoints glusterfs-cluster

# Verify PVs
kubectl get pv | grep glusterfs

# Check PVC usage
kubectl get pvc gluster-pvc -o yaml
```

## Expanding GlusterFS Volumes

Add more bricks to scale:

```bash
# Add new bricks to volume
sudo gluster volume add-brick gv0 replica 3 \
  node4:/data/brick1/gv0 \
  node5:/data/brick1/gv0 \
  node6:/data/brick1/gv0

# Rebalance data across bricks
sudo gluster volume rebalance gv0 start

# Monitor rebalance
sudo gluster volume rebalance gv0 status
```

## Best Practices

1. **Use replicated volumes** for data durability
2. **Separate network** for GlusterFS traffic
3. **Monitor disk space** on bricks
4. **Regular health checks** of cluster status
5. **Backup volumes** regularly
6. **Use Heketi** for dynamic provisioning
7. **Plan capacity** before running out of space
8. **Test failover** scenarios

GlusterFS provides a robust, scalable distributed storage solution for Kubernetes workloads requiring shared filesystem access, with the flexibility to grow as your storage needs increase.
