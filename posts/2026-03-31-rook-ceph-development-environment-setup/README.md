# How to Set Up a Ceph Development Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Development, Environment, Setup, Testing

Description: Set up a complete Ceph development environment using minikube or kind for local testing, with the Rook operator and a minimal cluster configuration.

---

A local Ceph development environment lets you test code changes, experiment with configurations, and debug issues without touching production. This guide sets up a minimal but functional Ceph cluster on your workstation using minikube or kind.

## Prerequisites

```bash
# Install required tools
# Docker or Podman
docker --version

# minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Starting minikube with Sufficient Resources

Ceph requires memory and CPU headroom:

```bash
minikube start \
  --driver=docker \
  --cpus=4 \
  --memory=8192 \
  --disk-size=40g \
  --kubernetes-version=v1.28.0 \
  --extra-config=kubelet.max-pods=250
```

Alternatively, if you need extra disks for OSD testing, use a VM-based driver that supports the `--extra-disks` flag:

```bash
minikube start \
  --driver=kvm2 \
  --cpus=4 \
  --memory=8192 \
  --disk-size=40g \
  --extra-disks=3
```

## Using kind for Development

kind (Kubernetes in Docker) is faster to start and reset:

```yaml
# kind-ceph.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
    extraMounts:
      - hostPath: /tmp/ceph-osd1
        containerPath: /var/lib/rook/osd1
    labels:
      role: storage
  - role: worker
    extraMounts:
      - hostPath: /tmp/ceph-osd2
        containerPath: /var/lib/rook/osd2
    labels:
      role: storage
  - role: worker
    extraMounts:
      - hostPath: /tmp/ceph-osd3
        containerPath: /var/lib/rook/osd3
    labels:
      role: storage
```

```bash
# Create host directories for OSDs
mkdir -p /tmp/ceph-osd{1,2,3}

# Create cluster
kind create cluster --config kind-ceph.yaml --name ceph-dev
```

## Installing Rook-Ceph in Development Mode

```bash
# Add the Rook Helm repository
helm repo add rook-release https://charts.rook.io/release
helm repo update

# Install operator with development settings
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set csi.enableRbdDriver=true \
  --set csi.enableCephfsDriver=true \
  --set logLevel=DEBUG
```

## Minimal Dev Cluster Configuration

```yaml
# ceph-cluster-dev.yaml
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
  mon:
    count: 1
    allowMultiplePerNode: true
  mgr:
    count: 1
  dashboard:
    enabled: true
    ssl: false
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: "ceph-dev-worker"
        devices:
          - name: "loop0"
      - name: "ceph-dev-worker2"
        devices:
          - name: "loop0"
      - name: "ceph-dev-worker3"
        devices:
          - name: "loop0"
```

```bash
kubectl apply -f ceph-cluster-dev.yaml

# Watch cluster come up
kubectl -n rook-ceph get pods -w

# Deploy the Rook toolbox (not included with the operator or cluster by default)
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml

# Access Ceph tools
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

## Setting Up Loop Devices for OSDs

```bash
# On each worker node, create loop devices
# Note: kind names workers as ceph-dev-worker, ceph-dev-worker2, ceph-dev-worker3
for node in ceph-dev-worker ceph-dev-worker2 ceph-dev-worker3; do
  docker exec ${node} bash -c "
    dd if=/dev/zero of=/tmp/osd.img bs=1M count=5120
    losetup /dev/loop0 /tmp/osd.img
  "
done
```

## Summary

A Ceph development environment on minikube or kind with loop devices gives you a full working cluster on a developer laptop. Using minimal replica counts and single monitors reduces resource usage while still exercising all the same code paths as production, making it practical for development, testing, and learning.
