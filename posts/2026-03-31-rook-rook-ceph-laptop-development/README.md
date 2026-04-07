# How to Set Up Rook-Ceph on a Laptop for Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Development, Laptop, Kind, Minikube

Description: Set up a minimal Rook-Ceph environment on a developer laptop using kind with loop devices, tuned for low resource usage without sacrificing API compatibility.

---

Running Rook-Ceph on a laptop is feasible with the right configuration. This guide optimizes for low memory usage and fast startup while maintaining full API compatibility with production Rook deployments.

## Resource Requirements

For a minimal laptop setup:
- RAM: 8GB minimum (16GB recommended)
- CPU: 4 cores
- Disk: 20GB free for loop devices and container images

## Option 1: kind with Loop Devices

kind is the most resource-efficient option for laptop development:

```bash
# Install kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind

# Create loop devices for OSDs
sudo mkdir -p /mnt/disks
for i in 1 2 3; do
  sudo dd if=/dev/zero of=/mnt/disks/osd${i}.img bs=1M count=2048
  sudo losetup /dev/loop${i}0 /mnt/disks/osd${i}.img
done
```

```yaml
# kind-laptop.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    image: kindest/node:v1.28.0
    extraMounts:
      - hostPath: /dev/loop10
        containerPath: /dev/loop10
      - hostPath: /dev/loop20
        containerPath: /dev/loop20
      - hostPath: /dev/loop30
        containerPath: /dev/loop30
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            max-pods: "250"
```

```bash
kind create cluster --config kind-laptop.yaml --name ceph-dev
```

## Memory-Optimized Rook Configuration

```bash
# Add the Rook Helm repository
helm repo add rook-release https://charts.rook.io/release
helm repo update

# Install operator with reduced resource requests
helm install rook-ceph rook-release/rook-ceph \
  -n rook-ceph --create-namespace \
  --set resources.requests.cpu=100m \
  --set resources.requests.memory=128Mi \
  --set csi.csiRBDPluginResource.requests.memory=64Mi \
  --set csi.csiCephFSPluginResource.requests.memory=64Mi
```

## Minimal Cluster YAML for Laptops

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
    allowUnsupported: true
  dataDirHostPath: /var/lib/rook
  skipUpgradeChecks: false
  continueUpgradeAfterChecksEvenIfNotHealthy: false
  mon:
    count: 1
    allowMultiplePerNode: true
  mgr:
    count: 1
    allowMultiplePerNode: true
    modules:
      - name: pg_autoscaler
        enabled: true
  dashboard:
    enabled: false  # saves ~100MB RAM
  monitoring:
    enabled: false  # disable Prometheus for laptop
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^loop[0-9][0-9]"
  resources:
    mon:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        memory: 512Mi
    osd:
      requests:
        cpu: 100m
        memory: 512Mi
      limits:
        memory: 1Gi
    mgr:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        memory: 512Mi
  disruptionManagement:
    managePodBudgets: false
```

## Quick Development Workflow

```bash
# Start kind cluster
kind create cluster --config kind-laptop.yaml --name ceph-dev

# Add Rook Helm repo and install operator
helm repo add rook-release https://charts.rook.io/release
helm repo update
helm install rook-ceph rook-release/rook-ceph -n rook-ceph --create-namespace
kubectl apply -f ceph-cluster-laptop.yaml

# Wait for cluster
kubectl -n rook-ceph wait CephCluster/rook-ceph \
  --for=jsonpath='{.status.phase}'=Ready --timeout=600s

# Create a test pool
kubectl apply -f - << 'EOF'
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: test-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 1
    requireSafeReplicaSize: false
EOF

# Deploy the Rook toolbox for running Ceph commands
kubectl apply -f https://raw.githubusercontent.com/rook/rook/release-1.13/deploy/examples/toolbox.yaml
kubectl -n rook-ceph wait deploy/rook-ceph-tools --for=condition=Available --timeout=120s

# Run tests
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status

# Teardown (fast reset)
kind delete cluster --name ceph-dev
sudo losetup -d /dev/loop10 /dev/loop20 /dev/loop30
```

## Tips for Fast Iteration

```bash
# Pre-pull the Ceph image before creating the cluster
docker pull quay.io/ceph/ceph:v18.2.0
kind load docker-image quay.io/ceph/ceph:v18.2.0 --name ceph-dev

# Export kubeconfig to access the cluster from your host
kind export kubeconfig --name ceph-dev

# Use Skaffold for rapid Rook operator iteration
skaffold dev --profile local
```

## Summary

Running Rook-Ceph on a laptop is practical with kind, loop devices, and tuned resource limits that reduce memory consumption to around 3-4GB for the full cluster. Disabling the dashboard and Prometheus monitoring frees significant RAM, while the loop device setup avoids needing dedicated disks and makes the environment easy to reset and recreate.
