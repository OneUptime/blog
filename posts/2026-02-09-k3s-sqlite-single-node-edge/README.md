# How to Configure K3s with SQLite Storage for Single-Node Edge Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, k3s, Edge Computing

Description: Learn how to deploy K3s with SQLite storage for lightweight single-node edge deployments, perfect for resource-constrained environments like IoT gateways and remote monitoring stations.

---

Not every edge location needs a multi-node Kubernetes cluster. IoT gateways, remote monitoring stations, and small retail locations often run on single machines with limited resources. For these environments, K3s with SQLite provides a complete Kubernetes implementation in an incredibly small footprint.

In this guide, you'll deploy K3s using SQLite storage, optimize it for resource-constrained hardware, and implement patterns for managing fleets of single-node edge clusters.

## Why SQLite for Edge

K3s defaults to SQLite for single-server deployments, requiring no external database. This makes it perfect for edge because:

- Zero external dependencies
- Lower memory overhead than embedded etcd
- Simple backup and restore (small datastore directory)
- Works on low-power ARM devices
- No network requirements for cluster state

SQLite mode trades off high availability for simplicity and resource efficiency. For single-node deployments, this is the right tradeoff.

## Minimum Hardware Requirements

K3s with SQLite runs on modest hardware, but current K3s releases list higher minimums for server nodes than for agent-only nodes:

- 2GB RAM for a server node
- 2 CPU cores for a server node
- 2GB disk space for K3s (add more for workloads)
- armhf, ARM64/aarch64, or x86_64 architecture

For this guide, we'll use a Raspberry Pi 4 with 4GB RAM as our edge device.

## Installing K3s with SQLite

SSH to your edge device and install K3s:

```bash
# Basic installation (SQLite is default for single server)

curl -sfL https://get.k3s.io | sh -

# With custom settings for resource constraints
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --disable servicelb \
  --disable traefik \
  --kube-apiserver-arg='max-requests-inflight=100' \
  --kube-apiserver-arg='max-mutating-requests-inflight=50'
```

The `--disable` flags remove components you may not need, reducing memory usage.

Verify installation:

```bash
kubectl get nodes
k3s check-config
```

Check the datastore being used:

```bash
sudo ls -lh /var/lib/rancher/k3s/server/db/state.db
sudo sqlite3 /var/lib/rancher/k3s/server/db/state.db "PRAGMA database_list;"
```

This SQLite database stores all Kubernetes state.

## Optimizing for Low Resources

For devices close to the minimum server requirements, tune K3s aggressively:

```bash
# Create custom configuration
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
write-kubeconfig-mode: "0644"
disable:
  - servicelb
  - traefik
  - local-storage
  - metrics-server
kube-apiserver-arg:
  - "max-requests-inflight=50"
  - "max-mutating-requests-inflight=25"
kube-controller-manager-arg:
  - "node-monitor-period=10s"
  - "node-monitor-grace-period=20s"
kubelet-arg:
  - "max-pods=20"
  - "eviction-hard=memory.available<100Mi,nodefs.available<1Gi"
  - "kube-api-qps=5"
  - "kube-api-burst=10"
EOF

# Restart K3s to apply
sudo systemctl restart k3s
```

These settings limit concurrent requests and cap pod count to match hardware capabilities.

## Configuring Resource Limits

Set node-level resource reservations:

```bash
# Update kubelet configuration
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/10-reservations.yaml > /dev/null <<EOF
kubelet-arg+:
  - "system-reserved=memory=200Mi,cpu=100m"
  - "kube-reserved=memory=200Mi,cpu=100m"
  - "eviction-hard=memory.available<100Mi"
  - "eviction-soft=memory.available<200Mi"
  - "eviction-soft-grace-period=memory.available=1m"
EOF

sudo systemctl restart k3s
```

This reserves 400MB total for system and Kubernetes, leaving the rest for workloads.

## Deploying Lightweight Workloads

Deploy applications with aggressive resource limits:

```yaml
# edge-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temperature-monitor
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: temp-monitor
  template:
    metadata:
      labels:
        app: temp-monitor
    spec:
      containers:
        - name: monitor
          image: alpine:3.19
          command:
            - /bin/sh
            - -c
            - |
              while true; do
                TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
                echo "Temperature: $((TEMP/1000))C"
                sleep 60
              done
          resources:
            requests:
              cpu: "10m"
              memory: "16Mi"
            limits:
              cpu: "50m"
              memory: "64Mi"
      restartPolicy: Always
```

Apply lightweight workloads:

```bash
kubectl apply -f edge-app.yaml
```

## Implementing Persistent Storage

Use local-path-provisioner for persistent storage:

```bash
# Install local-path-provisioner
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.36/deploy/local-path-storage.yaml

# Set as default storage class
kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

Create a PVC:

```yaml
# data-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sensor-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 1Gi
```

## Backing Up SQLite Database

Create automated backups of the SQLite database:

```bash
# Create backup script
sudo tee /usr/local/bin/k3s-backup.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/k3s"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Stop K3s briefly for consistent backup
systemctl stop k3s

# Backup SQLite datastore directory
tar -czf $BACKUP_DIR/k3s-db-$DATE.tar.gz \
  /var/lib/rancher/k3s/server/db

# Backup certificates and config
tar -czf $BACKUP_DIR/k3s-config-$DATE.tar.gz \
  /etc/rancher/k3s \
  /var/lib/rancher/k3s/server/tls \
  /var/lib/rancher/k3s/server/token

# Start K3s
systemctl start k3s

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "k3s-db-*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
EOF

sudo chmod +x /usr/local/bin/k3s-backup.sh

# Schedule daily backups
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/k3s-backup.sh
```

## Restoring from Backup

To restore a corrupted SQLite database:

```bash
# Stop K3s
sudo systemctl stop k3s

# Restore database directory
sudo rm -rf /var/lib/rancher/k3s/server/db
sudo tar -xzf /var/backups/k3s/k3s-db-20260209-020000.tar.gz -C /

# Restore config if needed
sudo tar -xzf /var/backups/k3s/k3s-config-20260209-020000.tar.gz -C /

# Start K3s
sudo systemctl start k3s

# Verify cluster
kubectl get nodes
kubectl get pods --all-namespaces
```

## Managing Fleet of Edge Nodes

For multiple single-node edge deployments, use a management pattern:

```bash
# Install Fleet on the central cloud cluster
helm repo add fleet https://rancher.github.io/fleet-helm-charts/
helm -n cattle-fleet-system install --create-namespace --wait fleet-crd \
  fleet/fleet-crd
helm -n cattle-fleet-system install --create-namespace --wait fleet \
  fleet/fleet
```

Register edge clusters with Fleet:

```bash
# On central cluster, create a registration token
kubectl create namespace clusters --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<EOF
kind: ClusterRegistrationToken
apiVersion: "fleet.cattle.io/v1alpha1"
metadata:
  name: edge-token
  namespace: clusters
spec:
  ttl: 240h
EOF

# Get agent values for Helm
kubectl --namespace clusters get secret edge-token \
  -o 'jsonpath={.data.values}' | base64 --decode > values.yaml

# Copy values.yaml to your edge cluster admin machine, then on each edge cluster
helm -n cattle-fleet-system install --create-namespace --wait \
  --values values.yaml \
  fleet-agent fleet/fleet-agent
```

## Monitoring Resource Usage

Monitor K3s resource consumption:

```bash
# Create monitoring script
sudo tee /usr/local/bin/k3s-monitor.sh > /dev/null <<'EOF'
#!/bin/bash
echo "=== K3s Resource Usage ==="
echo "Memory:"
ps aux | grep k3s | awk '{sum+=$6} END {print sum/1024 " MB"}'

echo "CPU:"
ps aux | grep k3s | awk '{sum+=$3} END {print sum "%"}'

echo "Disk (SQLite DB):"
du -h /var/lib/rancher/k3s/server/db/state.db

echo "Pod Count:"
kubectl get pods --all-namespaces --no-headers | wc -l
EOF

sudo chmod +x /usr/local/bin/k3s-monitor.sh

# Run monitoring
/usr/local/bin/k3s-monitor.sh
```

## Implementing Log Rotation

Prevent disk space issues with log rotation:

```bash
# Configure kubelet container log rotation
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/20-log-rotation.yaml > /dev/null <<EOF
kubelet-arg+:
  - "container-log-max-size=10Mi"
  - "container-log-max-files=3"
EOF

sudo systemctl restart k3s
```

## Configuring Offline Operations

For disconnected edge locations, pre-pull images:

```bash
# List required images before disconnecting, or when using a reachable private registry
sudo mkdir -p /var/lib/rancher/k3s/agent/images
sudo tee /var/lib/rancher/k3s/agent/images/required-images.txt > /dev/null <<EOF
alpine:3.19
busybox:latest
nginx:alpine
EOF

# K3s imports the listed images into containerd
sudo k3s crictl images
```

## Securing Single-Node Edge

Harden security for exposed edge nodes:

```bash
# Enable firewall
sudo ufw allow 22/tcp
sudo ufw allow 6443/tcp  # K8s API (restrict to management network)
sudo ufw enable

# Disable unnecessary K3s ports
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/audit-policy.yaml > /dev/null <<EOF
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata
EOF

sudo tee /etc/rancher/k3s/config.yaml.d/30-security.yaml > /dev/null <<EOF
disable+:
  - servicelb
  - traefik
kube-apiserver-arg+:
  - "anonymous-auth=false"
  - "audit-policy-file=/etc/rancher/k3s/audit-policy.yaml"
  - "audit-log-path=/var/log/k3s-audit.log"
  - "audit-log-maxage=30"
EOF

sudo systemctl restart k3s
```

## Upgrading K3s

Safely upgrade single-node K3s:

```bash
# Backup before upgrade
sudo /usr/local/bin/k3s-backup.sh

# Download the chosen version
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=vX.Y.Z+k3s1 sh -s -

# Verify upgrade
k3s --version
kubectl get nodes
```

## Handling Database Corruption

If SQLite database becomes corrupted:

```bash
# Check database integrity
sudo sqlite3 /var/lib/rancher/k3s/server/db/state.db "PRAGMA integrity_check;"

# If corrupted, restore from backup
sudo systemctl stop k3s
sudo mv /var/lib/rancher/k3s/server/db /var/lib/rancher/k3s/server/db.corrupt
sudo tar -xzf /var/backups/k3s/k3s-db-20260209-020000.tar.gz -C /
sudo systemctl start k3s
```

## Conclusion

K3s with SQLite provides a complete Kubernetes experience on single-node edge devices with minimal overhead. By tuning resource limits, implementing proper backups, and using fleet management tools, you can reliably operate hundreds of single-node edge clusters from a central location.

Start with conservative resource limits, monitor actual usage patterns, and adjust based on your workload characteristics. The combination of SQLite's simplicity and K3s's efficiency makes Kubernetes viable even on IoT gateways and ARM-based edge devices.
