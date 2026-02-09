# How to Migrate Container Runtime from Docker to containerd on Existing Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, containerd, Migration

Description: Learn how to migrate Kubernetes clusters from Docker to containerd runtime, including pre-migration validation, node-by-node migration procedure, troubleshooting, and post-migration verification for production environments.

---

Docker support was deprecated in Kubernetes 1.20 and removed in 1.24. Clusters still using Docker must migrate to a supported container runtime like containerd. While containerd has been the underlying runtime for Docker in Kubernetes, direct containerd integration provides better performance and simpler architecture. This guide demonstrates how to migrate existing clusters from Docker to containerd with minimal disruption.

This migration can be performed on running clusters using a rolling node update approach.

## Understanding the Migration

Docker in Kubernetes uses this stack:
```
kubelet -> dockershim -> Docker -> containerd -> runc
```

Direct containerd uses:
```
kubelet -> containerd -> runc
```

Benefits of direct containerd:
- Simpler architecture, fewer components
- Better performance, lower overhead
- Smaller attack surface
- Official Kubernetes support

## Pre-Migration Checklist

Before migrating, verify cluster readiness:

```bash
# 1. Check Kubernetes version (must be 1.24+)
kubectl version --short

# 2. Check current container runtime
kubectl get nodes -o wide
# Look for CONTAINER-RUNTIME column

# 3. Verify Docker is installed
ssh <node> "docker --version"

# 4. Check for Docker-specific features in use
# Socket mounts, privileged containers, specific Docker APIs

# 5. Backup critical workloads
kubectl get all --all-namespaces -o yaml > cluster-backup.yaml

# 6. Test in staging environment first
```

## Installing containerd

Install containerd on nodes before migration:

```bash
# On each node (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y containerd

# Configure containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Edit config for systemd cgroup driver
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

# Restart containerd
sudo systemctl restart containerd
sudo systemctl enable containerd

# Verify containerd is running
sudo systemctl status containerd
```

## Configuring containerd

Optimize containerd configuration:

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  sandbox_image = "registry.k8s.io/pause:3.9"

[plugins."io.containerd.grpc.v1.cri".containerd]
  snapshotter = "overlayfs"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
  SystemdCgroup = true

[plugins."io.containerd.grpc.v1.cri".cni]
  bin_dir = "/opt/cni/bin"
  conf_dir = "/etc/cni/net.d"

[plugins."io.containerd.grpc.v1.cri".registry]
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
      endpoint = ["https://registry-1.docker.io"]
```

Apply configuration:

```bash
sudo systemctl restart containerd
```

## Migrating Worker Nodes

Migrate worker nodes one at a time:

### Step 1: Drain the Node

```bash
# Mark node unschedulable and evict pods
kubectl drain worker-1 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s

# Verify node is drained
kubectl get nodes
# worker-1   Ready,SchedulingDisabled   <none>   10d   v1.28.0
```

### Step 2: Stop Docker and kubelet

On the node being migrated:

```bash
ssh worker-1

# Stop kubelet
sudo systemctl stop kubelet

# Stop Docker
sudo systemctl stop docker
sudo systemctl disable docker
```

### Step 3: Configure kubelet for containerd

```bash
# Create kubelet dropin directory
sudo mkdir -p /etc/systemd/system/kubelet.service.d

# Create containerd configuration
cat <<EOF | sudo tee /etc/systemd/system/kubelet.service.d/0-containerd.conf
[Service]
Environment="KUBELET_EXTRA_ARGS=--container-runtime=remote --container-runtime-endpoint=unix:///run/containerd/containerd.sock"
EOF

# Or update kubelet config file
sudo vim /var/lib/kubelet/config.yaml

# Add or update:
# containerRuntimeEndpoint: unix:///run/containerd/containerd.sock
```

Update kubelet configuration:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerRuntimeEndpoint: unix:///run/containerd/containerd.sock
cgroupDriver: systemd
```

### Step 4: Restart kubelet

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start kubelet
sudo systemctl start kubelet

# Verify kubelet is running
sudo systemctl status kubelet

# Check kubelet logs
sudo journalctl -u kubelet -n 50
```

### Step 5: Verify Node Health

```bash
# Exit SSH back to control plane

# Check node status
kubectl get nodes

# Verify node is using containerd
kubectl get node worker-1 -o json | jq -r '.status.nodeInfo.containerRuntimeVersion'
# Should show: containerd://1.7.x

# Check pods are running
kubectl get pods --all-namespaces -o wide | grep worker-1
```

### Step 6: Uncordon Node

```bash
# Mark node schedulable
kubectl uncordon worker-1

# Verify pods can schedule
kubectl get nodes
# worker-1   Ready    <none>   10d   v1.28.0

# Watch pods schedule on migrated node
kubectl get pods --all-namespaces -o wide --watch | grep worker-1
```

### Step 7: Clean Up Docker (Optional)

After verifying containerd works:

```bash
ssh worker-1

# Remove Docker packages
sudo apt-get purge -y docker-ce docker-ce-cli

# Remove Docker data (careful!)
sudo rm -rf /var/lib/docker
sudo rm -rf /var/run/docker.sock

# Remove Docker configurations
sudo rm -rf /etc/docker
```

## Migrating Control Plane Nodes

Migrate control plane nodes using same procedure:

```bash
# Drain control plane node
kubectl drain control-plane-1 \
  --ignore-daemonsets \
  --delete-emptydir-data

# SSH to control plane
ssh control-plane-1

# Stop services
sudo systemctl stop kubelet docker

# Configure kubelet for containerd
sudo vim /var/lib/kubelet/config.yaml
# Update containerRuntimeEndpoint: unix:///run/containerd/containerd.sock

# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl start kubelet

# Uncordon
kubectl uncordon control-plane-1

# Verify control plane pods
kubectl get pods -n kube-system -o wide | grep control-plane-1
```

## Handling Image Migration

containerd stores images separately from Docker:

```bash
# List Docker images (before migration)
docker images

# After migration, pull images with crictl
sudo crictl pull nginx:latest

# Or import from Docker
docker save nginx:latest | sudo ctr -n k8s.io images import -
```

Pre-pull critical images:

```bash
# Create image list
cat > critical-images.txt <<EOF
registry.k8s.io/kube-proxy:v1.28.0
registry.k8s.io/kube-apiserver:v1.28.0
registry.k8s.io/coredns:v1.10.1
nginx:latest
EOF

# Pull images with containerd
while read image; do
  sudo crictl pull $image
done < critical-images.txt

# Verify images
sudo crictl images
```

## Troubleshooting Migration Issues

### Issue: Pods won't start after migration

```bash
# Check kubelet logs
sudo journalctl -u kubelet -f

# Common issues:
# - Wrong runtime endpoint
# - CNI plugin not found
# - Image pull failures

# Verify containerd socket
ls -la /run/containerd/containerd.sock

# Test containerd directly
sudo crictl ps
sudo crictl pods
```

### Issue: kubelet can't connect to containerd

```bash
# Check containerd is running
sudo systemctl status containerd

# Verify socket permissions
sudo ls -la /run/containerd/

# Check containerd config
sudo cat /etc/containerd/config.toml

# Restart both services
sudo systemctl restart containerd
sudo systemctl restart kubelet
```

### Issue: Image pull failures

```bash
# Check containerd registry config
sudo cat /etc/containerd/config.toml | grep -A 10 registry

# Test image pull manually
sudo crictl pull nginx:latest

# Check containerd logs
sudo journalctl -u containerd -f
```

### Issue: CNI errors

```bash
# Verify CNI plugins
ls -la /opt/cni/bin/

# Check CNI config
ls -la /etc/cni/net.d/

# Restart containerd and kubelet
sudo systemctl restart containerd
sudo systemctl restart kubelet
```

## Automated Migration Script

Create script to automate worker migration:

```bash
#!/bin/bash
# migrate-to-containerd.sh

NODE=$1

if [ -z "$NODE" ]; then
  echo "Usage: $0 <node-name>"
  exit 1
fi

set -e

echo "=== Draining $NODE ==="
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data --timeout=300s

echo "=== Migrating $NODE to containerd ==="
ssh $NODE << 'EOF'
  # Stop services
  sudo systemctl stop kubelet docker

  # Configure kubelet
  sudo mkdir -p /etc/systemd/system/kubelet.service.d
  cat <<EOL | sudo tee /etc/systemd/system/kubelet.service.d/0-containerd.conf
[Service]
Environment="KUBELET_EXTRA_ARGS=--container-runtime=remote --container-runtime-endpoint=unix:///run/containerd/containerd.sock"
EOL

  # Restart kubelet
  sudo systemctl daemon-reload
  sudo systemctl start kubelet
  sudo systemctl disable docker
EOF

echo "=== Uncordoning $NODE ==="
kubectl uncordon $NODE

echo "=== Verifying $NODE ==="
sleep 30
kubectl get node $NODE -o json | jq -r '.status.nodeInfo.containerRuntimeVersion'
kubectl get pods --all-namespaces -o wide | grep $NODE | head -5

echo "=== Migration complete for $NODE ==="
```

Usage:

```bash
chmod +x migrate-to-containerd.sh
./migrate-to-containerd.sh worker-1
```

## Validating Migration

Verify entire cluster migrated:

```bash
# Check all nodes using containerd
kubectl get nodes -o custom-columns=NAME:.metadata.name,RUNTIME:.status.nodeInfo.containerRuntimeVersion

# Expected output:
# NAME              RUNTIME
# control-plane-1   containerd://1.7.2
# worker-1          containerd://1.7.2
# worker-2          containerd://1.7.2

# Verify all pods running
kubectl get pods --all-namespaces

# Check for pod errors
kubectl get events --all-namespaces --field-selector type=Warning

# Test pod creation
kubectl run test-nginx --image=nginx
kubectl get pod test-nginx
kubectl delete pod test-nginx
```

## Monitoring containerd

Set up monitoring after migration:

```bash
# Check containerd metrics
curl http://localhost:1338/v1/metrics

# Monitor with Prometheus
# containerd exposes metrics on :1338/v1/metrics

# View containerd tasks
sudo crictl ps

# Check containerd version
sudo crictl version
```

## Post-Migration Cleanup

After successful migration:

```bash
# On each node:
# 1. Remove Docker packages
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io

# 2. Clean up Docker data
sudo rm -rf /var/lib/docker

# 3. Remove Docker socket
sudo rm -rf /var/run/docker.sock

# 4. Update documentation
# Record new runtime in cluster docs

# 5. Update monitoring
# Switch from Docker metrics to containerd metrics
```

## Best Practices

1. **Migrate incrementally**: One node at a time, never drain multiple nodes

2. **Test thoroughly**: Validate in staging before production migration

3. **Pre-pull images**: Cache critical images before migration

4. **Monitor closely**: Watch for issues during and after migration

5. **Keep Docker initially**: Don't remove Docker immediately, keep for rollback

6. **Document runtime**: Update cluster documentation with new runtime

7. **Train team**: Ensure team knows crictl commands vs docker commands

Common crictl commands:

```bash
# Pods
sudo crictl pods
sudo crictl pods -n <namespace>

# Containers
sudo crictl ps
sudo crictl ps -a

# Images
sudo crictl images
sudo crictl pull <image>

# Logs
sudo crictl logs <container-id>

# Exec
sudo crictl exec -it <container-id> /bin/sh

# Inspect
sudo crictl inspect <container-id>
```

Migrating from Docker to containerd eliminates deprecated dockershim dependency and provides better performance with simpler architecture. Perform migration using rolling node updates, validate each node before proceeding to the next, monitor cluster health throughout the process, and maintain detailed documentation of the migration for future reference and troubleshooting.
