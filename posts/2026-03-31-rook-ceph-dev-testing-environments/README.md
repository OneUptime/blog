# How to Set Up Ceph for Development and Testing Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Development, Testing, Local

Description: Configure a lightweight Ceph cluster for development and testing using vstart.sh, single-node Rook, or Minikube to enable fast iteration without dedicated hardware.

---

Production Ceph clusters are heavyweight. For development and testing, you need lightweight options that give you real Ceph behavior without requiring dedicated hardware or a multi-day setup.

## Option 1 - vstart.sh (Single Machine Dev)

The fastest option is Ceph's built-in `vstart.sh` script, which runs a full cluster on one machine:

```bash
# Build Ceph from source or install debug packages
git clone https://github.com/ceph/ceph.git
cd ceph && ./install-deps.sh
cmake -DCMAKE_BUILD_TYPE=Debug -B build && cmake --build build -j$(nproc)

# Start a local cluster with 1 MON, 3 OSDs
cd build
OSD=3 MON=1 MGR=1 ../src/vstart.sh -n -x

# Use the cluster
export CEPH_CONF=./ceph.conf
./bin/ceph status
./bin/ceph osd pool create test
./bin/rados -p test put myobject /etc/hosts
```

Tear down with:

```bash
../src/stop.sh
```

## Option 2 - Single-Node Rook with Minikube

For Kubernetes-based testing:

```bash
minikube start --cpus=4 --memory=8192 --disk-size=40g

# Deploy Rook with test cluster settings
helm repo add rook-release https://charts.rook.io/release
helm install rook-ceph rook-release/rook-ceph -n rook-ceph --create-namespace

kubectl apply -f - <<'EOF'
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.2
    allowUnsupported: false
  dataDirHostPath: /var/lib/rook
  mon:
    count: 1
    allowMultiplePerNode: true
  mgr:
    count: 1
  storage:
    useAllNodes: true
    useAllDevices: true
  resources:
    osd:
      requests:
        cpu: "500m"
        memory: "512Mi"
EOF
```

## Option 3 - kind with Local Path Provisioner

For CI pipelines where Minikube is unavailable:

```bash
# Create a kind cluster
cat > kind-config.yaml <<'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
  extraMounts:
  - hostPath: /tmp/ceph-data
    containerPath: /var/lib/rook
- role: worker
  extraMounts:
  - hostPath: /tmp/ceph-data2
    containerPath: /var/lib/rook
EOF

kind create cluster --config kind-config.yaml
```

## Dev-Specific Configuration

For dev clusters, relax durability requirements for speed:

```yaml
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.2
  storage:
    useAllNodes: true
    useAllDevices: true
  # Dev-only: allow single OSD
  mon:
    count: 1
    allowMultiplePerNode: true
```

Create a pool with single replica for dev:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool create dev-pool 8 8 replicated
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set dev-pool size 1 --yes-i-really-mean-it
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set dev-pool min_size 1
```

## Summary

Three practical options exist for Ceph dev/test environments: `vstart.sh` for pure Ceph development on a single machine, single-node Rook with Minikube for Kubernetes integration testing, and kind for CI pipelines. Using reduced replication and smaller resource requests makes these environments lightweight while still providing real Ceph behavior for testing.
