# How to Set Up a Ceph Lab Environment in 30 Minutes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Lab, Testing, Kubernetes

Description: Spin up a functional Ceph lab environment in 30 minutes using Minikube or kind with Rook-Ceph to learn and test Ceph operations without dedicated hardware.

---

You do not need a rack of servers to learn Ceph. Using Minikube or kind with Rook, you can have a functional Ceph cluster running on a laptop in under 30 minutes.

## Prerequisites

Install the required tools:

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
chmod +x minikube-linux-amd64 && sudo mv minikube-linux-amd64 /usr/local/bin/minikube

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Step 1 - Start Minikube with Extra Disks

Ceph needs raw block devices. Minikube supports this with extra disk flags:

```bash
minikube start \
  --cpus=4 \
  --memory=8192 \
  --disk-size=50g \
  --driver=docker \
  --nodes=3 \
  --extra-config=kubelet.eviction-hard="memory.available<200Mi" \
  --addons=default-storageclass,storage-provisioner
```

Add loop devices for OSD storage:

```bash
minikube ssh "sudo dd if=/dev/zero of=/data/disk1.img bs=1M count=10240 && sudo losetup /dev/loop1 /data/disk1.img"
```

## Step 2 - Deploy Rook Operator

```bash
# Add Rook Helm repository
helm repo add rook-release https://charts.rook.io/release
helm repo update

# Install Rook operator
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set "image.tag=v1.16.0"

# Wait for operator to be ready
kubectl wait --for=condition=Available deployment/rook-ceph-operator \
  -n rook-ceph --timeout=120s
```

## Step 3 - Create a Ceph Cluster

```yaml
# cluster-test.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.2
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
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "loop"
```

```bash
kubectl apply -f cluster-test.yaml
watch kubectl get pods -n rook-ceph
```

## Step 4 - Access the Dashboard

```bash
# Get the dashboard password
kubectl get secret rook-ceph-dashboard-password -n rook-ceph \
  -o jsonpath="{['data']['password']}" | base64 --decode

# Port forward the dashboard
kubectl port-forward svc/rook-ceph-mgr-dashboard 7000:7000 -n rook-ceph
# Open http://localhost:7000 in your browser
```

## Step 5 - Create a Test Pool and StorageClass

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/pool.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/storageclass.yaml
```

## Summary

A Ceph lab environment on Minikube with Rook takes about 30 minutes to set up and requires only a modern laptop with 8 GB RAM. It provides a real Ceph cluster for learning commands, testing configurations, and practicing recovery procedures without any risk to production data.
