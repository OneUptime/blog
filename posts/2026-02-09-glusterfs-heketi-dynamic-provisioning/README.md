# How to Deploy GlusterFS with Heketi for Dynamic Volume Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, GlusterFS

Description: Implement GlusterFS distributed storage with Heketi for dynamic Kubernetes volume provisioning, enabling scalable and replicated persistent volumes across your cluster.

---

GlusterFS provides distributed file system capabilities that scale horizontally across commodity hardware while maintaining strong consistency guarantees. When combined with Heketi, a RESTful volume management interface, GlusterFS becomes a dynamic storage backend for Kubernetes that automatically provisions and manages volumes without manual intervention.

This guide demonstrates deploying a production-ready GlusterFS cluster managed by Heketi, configuring Kubernetes integration, and using it for stateful application storage. You'll learn topology setup, volume replication configuration, and troubleshooting techniques for common scenarios.

## Understanding GlusterFS and Heketi Architecture

GlusterFS creates a unified namespace across multiple storage servers by aggregating raw block devices into bricks. These bricks form volumes that are distributed and optionally replicated across the cluster. When a client writes data, GlusterFS's distributed hash algorithm determines which bricks store the data based on the file path, ensuring even distribution.

Heketi sits between Kubernetes and GlusterFS, translating CSI or provisioner API calls into GlusterFS administrative commands. When you create a PVC, Heketi selects appropriate nodes, creates bricks from available storage, assembles them into a GlusterFS volume, and returns mount information to Kubernetes. This automation eliminates manual volume management while respecting replica and placement constraints.

## Preparing Storage Nodes

GlusterFS requires dedicated raw block devices on each storage node. These should be separate from your root filesystem to prevent full-disk scenarios from impacting system stability. Start by preparing three nodes with raw disks.

```bash
# On each storage node, identify available disks
lsblk
sudo fdisk -l

# Verify the disk has no filesystem or partitions
# Example: /dev/sdb is our target disk
sudo wipefs -a /dev/sdb

# Do NOT format or partition the disk
# Heketi will manage disk initialization
```

Install GlusterFS server packages on all storage nodes.

```bash
# On Ubuntu 22.04 or 24.04
sudo apt-get update
sudo apt-get install -y software-properties-common
sudo add-apt-repository ppa:gluster/glusterfs-10
sudo apt-get update
sudo apt-get install -y glusterfs-server

# Start and enable GlusterFS daemon
sudo systemctl enable --now glusterd
sudo systemctl status glusterd

# Verify GlusterFS version
gluster --version
```

## Deploying Heketi on Kubernetes

Heketi runs as a pod within your Kubernetes cluster and manages the external GlusterFS nodes through SSH. Create a ConfigMap with the cluster topology.

```yaml
# heketi-topology.json
{
  "clusters": [
    {
      "nodes": [
        {
          "node": {
            "hostnames": {
              "manage": ["storage01.example.com"],
              "storage": ["192.168.1.101"]
            },
            "zone": 1
          },
          "devices": [
            {
              "name": "/dev/sdb",
              "destroydata": false
            }
          ]
        },
        {
          "node": {
            "hostnames": {
              "manage": ["storage02.example.com"],
              "storage": ["192.168.1.102"]
            },
            "zone": 2
          },
          "devices": [
            {
              "name": "/dev/sdb",
              "destroydata": false
            }
          ]
        },
        {
          "node": {
            "hostnames": {
              "manage": ["storage03.example.com"],
              "storage": ["192.168.1.103"]
            },
            "zone": 3
          },
          "devices": [
            {
              "name": "/dev/sdb",
              "destroydata": false
            }
          ]
        }
      ]
    }
  ]
}
```

The topology defines three nodes across three zones for replica placement. The manage hostname is used for SSH connections while storage IP is used for GlusterFS traffic.

Create SSH keys for Heketi to authenticate with storage nodes.

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 2048 -f ./heketi_key -N ""

# Copy public key to all storage nodes
for node in storage01 storage02 storage03; do
  ssh-copy-id -i ./heketi_key.pub root@${node}
done

# Verify passwordless SSH works
ssh -i ./heketi_key root@storage01 hostname
```

Create Kubernetes resources for Heketi deployment.

```yaml
# heketi-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gluster-system
---
apiVersion: v1
kind: Secret
metadata:
  name: heketi-ssh-key
  namespace: gluster-system
type: Opaque
data:
  # Base64 encoded private key
  ssh-privatekey: <paste base64 encoded key here>
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: heketi-config
  namespace: gluster-system
data:
  heketi.json: |
    {
      "_port_comment": "Heketi Server Port Number",
      "port": "8080",
      "_use_auth": "Enable JWT authorization",
      "use_auth": true,
      "_jwt": "JWT configuration",
      "jwt": {
        "admin": {
          "key": "adminkey"
        },
        "user": {
          "key": "userkey"
        }
      },
      "_glusterfs_comment": "GlusterFS Configuration",
      "glusterfs": {
        "executor": "ssh",
        "sshexec": {
          "keyfile": "/etc/heketi/ssh-key",
          "user": "root",
          "port": "22",
          "fstab": "/etc/fstab"
        },
        "db": "/var/lib/heketi/heketi.db",
        "loglevel": "info"
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: heketi
  namespace: gluster-system
  labels:
    app: heketi
spec:
  replicas: 1
  selector:
    matchLabels:
      app: heketi
  template:
    metadata:
      labels:
        app: heketi
    spec:
      containers:
      - name: heketi
        image: heketi/heketi:10
        ports:
        - containerPort: 8080
        env:
        - name: HEKETI_EXECUTOR
          value: "ssh"
        - name: HEKETI_FSTAB
          value: "/var/lib/heketi/fstab"
        - name: HEKETI_SNAPSHOT_LIMIT
          value: "14"
        volumeMounts:
        - name: db
          mountPath: /var/lib/heketi
        - name: config
          mountPath: /etc/heketi
        - name: ssh-key
          mountPath: /etc/heketi/ssh-key
          subPath: ssh-privatekey
          readOnly: true
        readinessProbe:
          httpGet:
            path: /hello
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /hello
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 30
      volumes:
      - name: db
        emptyDir: {}
      - name: config
        configMap:
          name: heketi-config
      - name: ssh-key
        secret:
          secretName: heketi-ssh-key
---
apiVersion: v1
kind: Service
metadata:
  name: heketi
  namespace: gluster-system
  labels:
    app: heketi
spec:
  ports:
  - port: 8080
    targetPort: 8080
  selector:
    app: heketi
```

Before applying, base64 encode your SSH private key and insert it into the secret.

```bash
cat ./heketi_key | base64 -w 0
# Copy output and paste into ssh-privatekey field
```

Deploy Heketi and load the topology.

```bash
kubectl apply -f heketi-deployment.yaml
kubectl wait --for=condition=ready pod -l app=heketi -n gluster-system --timeout=120s

# Load topology into Heketi
kubectl cp heketi-topology.json gluster-system/$(kubectl get pod -n gluster-system -l app=heketi -o jsonpath='{.items[0].metadata.name}'):/tmp/

# Execute topology load
kubectl exec -n gluster-system deployment/heketi -- heketi-cli topology load --json=/tmp/heketi-topology.json --user=admin --secret=adminkey

# Verify cluster setup
kubectl exec -n gluster-system deployment/heketi -- heketi-cli cluster list --user=admin --secret=adminkey
kubectl exec -n gluster-system deployment/heketi -- heketi-cli node list --user=admin --secret=adminkey
```

## Creating a Dynamic Storage Class

Configure a StorageClass that uses the GlusterFS provisioner with Heketi backend.

```yaml
# gluster-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gluster-heketi
provisioner: kubernetes.io/glusterfs
parameters:
  resturl: "http://heketi.gluster-system.svc.cluster.local:8080"
  restuser: "admin"
  restuserkey: "adminkey"
  volumetype: "replicate:3"
  # Optional: Set snapshot limit
  snapshot: "enabled"
  snapfactor: "10"
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

The `volumetype: "replicate:3"` parameter ensures each volume has three replicas across different nodes for high availability.

```bash
kubectl apply -f gluster-storageclass.yaml
kubectl get storageclass gluster-heketi
```

## Testing Dynamic Provisioning

Create a PVC to verify dynamic provisioning works.

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gluster-test-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 5Gi
  storageClassName: gluster-heketi
```

Apply and watch the provisioning process.

```bash
kubectl apply -f test-pvc.yaml
kubectl get pvc gluster-test-pvc -w

# Check events for provisioning details
kubectl describe pvc gluster-test-pvc

# Verify volume was created in GlusterFS
kubectl exec -n gluster-system deployment/heketi -- heketi-cli volume list --user=admin --secret=adminkey
```

Create a test pod that mounts the volume.

```yaml
# test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gluster-test-pod
spec:
  containers:
  - name: test
    image: busybox
    command: ['sh', '-c', 'echo "Hello from GlusterFS" > /mnt/test.txt && tail -f /dev/null']
    volumeMounts:
    - name: data
      mountPath: /mnt
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: gluster-test-pvc
```

Verify data persistence by creating files and destroying the pod.

```bash
kubectl apply -f test-pod.yaml
kubectl wait --for=condition=ready pod/gluster-test-pod
kubectl exec gluster-test-pod -- cat /mnt/test.txt
kubectl delete pod gluster-test-pod

# Recreate pod and verify data persists
kubectl apply -f test-pod.yaml
kubectl wait --for=condition=ready pod/gluster-test-pod
kubectl exec gluster-test-pod -- cat /mnt/test.txt
```

## Deploying Multi-Pod Applications

GlusterFS supports ReadWriteMany access, enabling multiple pods to mount the same volume concurrently.

```yaml
# shared-storage-deployment.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 20Gi
  storageClassName: gluster-heketi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-servers
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        volumeMounts:
        - name: content
          mountPath: /usr/share/nginx/html
      volumes:
      - name: content
        persistentVolumeClaim:
          claimName: shared-data
```

All three nginx pods share the same content directory, perfect for serving static assets or implementing shared upload directories.

## Monitoring and Maintenance

Check GlusterFS volume health and Heketi status regularly.

```bash
# List all volumes
kubectl exec -n gluster-system deployment/heketi -- heketi-cli volume list --user=admin --secret=adminkey

# Get detailed volume info
kubectl exec -n gluster-system deployment/heketi -- heketi-cli volume info <volume-id> --user=admin --secret=adminkey

# Check node status
kubectl exec -n gluster-system deployment/heketi -- heketi-cli node list --user=admin --secret=adminkey

# Check available space
kubectl exec -n gluster-system deployment/heketi -- heketi-cli cluster info --user=admin --secret=adminkey
```

On storage nodes, monitor GlusterFS directly for brick health.

```bash
# Check peer status
sudo gluster peer status

# List volumes
sudo gluster volume list

# Check volume info
sudo gluster volume info <volume-name>

# Check brick status
sudo gluster volume status <volume-name>
```

GlusterFS with Heketi provides production-grade distributed storage with dynamic provisioning capabilities that rival cloud provider solutions. The combination of horizontal scaling, replica configuration, and ReadWriteMany support makes it ideal for applications requiring shared storage across multiple pods. By automating volume lifecycle through Heketi, you eliminate manual storage management while maintaining full control over your storage infrastructure.
