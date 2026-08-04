# How to Deploy Rook-Ceph on Amazon EKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Amazon EKS, Kubernetes, Storage, AWS, Block Storage

Description: Step-by-step guide to deploying Rook-Ceph on Amazon EKS with EBS volumes as OSDs for persistent distributed storage.

---

## Overview

Amazon EKS provides a managed Kubernetes environment where Rook-Ceph can run as the storage layer. EKS does not provide raw block devices out of the box, so you need to attach EBS volumes to worker nodes and configure them as Ceph OSDs. This guide covers EKS-specific requirements and deployment steps.

## Prerequisites

- An EKS cluster with at least 3 worker nodes
- Worker nodes with instance types supporting additional EBS volumes (e.g., m5.xlarge)
- `kubectl`, `helm`, and AWS CLI configured
- At least 3 unformatted EBS volumes attached (one per node)

## Step 1 - Attach EBS Volumes to Worker Nodes

Create and attach EBS volumes to each worker node:

```bash
# Get node instance IDs
aws ec2 describe-instances \
  --filters "Name=tag:eks:cluster-name,Values=my-cluster" \
  --query "Reservations[*].Instances[*].InstanceId" \
  --output text

# Create and attach an EBS volume (repeat for each node)
VOL_ID=$(aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 100 \
  --volume-type gp3 \
  --query VolumeId --output text)

aws ec2 attach-volume \
  --volume-id $VOL_ID \
  --instance-id i-0abc1234def56789 \
  --device /dev/xvdf
```

## Step 2 - Install Rook-Ceph Operator

Add the Rook Helm repository and install the operator:

```bash
helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set csi.enableCSIHostNetwork=true
```

Wait for the operator to be ready:

```bash
kubectl -n rook-ceph rollout status deployment/rook-ceph-operator
```

## Step 3 - Create a CephCluster

Create a cluster manifest using the raw device path:

```yaml
# cluster-eks.yaml
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
    count: 3
    allowMultiplePerNode: false
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: "ip-10-0-1-10.ec2.internal"
        devices:
          - name: "xvdf"
      - name: "ip-10-0-1-11.ec2.internal"
        devices:
          - name: "xvdf"
      - name: "ip-10-0-1-12.ec2.internal"
        devices:
          - name: "xvdf"
```

```bash
kubectl apply -f cluster-eks.yaml
```

## Step 4 - Create a CephBlockPool and Storage Class

Create a CephBlockPool before the StorageClass, since Rook does not create pools automatically:

```yaml
# blockpool.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
```

```bash
kubectl apply -f blockpool.yaml
```

Create an RBD storage class for block volumes:

```yaml
# storageclass-rbd.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
kubectl apply -f storageclass-rbd.yaml
```

## Step 5 - Verify the Deployment

Deploy the Rook toolbox to run Ceph commands:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml
kubectl -n rook-ceph rollout status deployment/rook-ceph-tools
```

Check cluster health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

Test a PVC:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/wordpress.yaml
kubectl get pvc
```

## Summary

Deploying Rook-Ceph on Amazon EKS requires attaching raw EBS volumes to worker nodes, installing the Rook operator via Helm, and creating a CephCluster manifest that explicitly references the attached block devices. Once the cluster is healthy, RBD and CephFS storage classes can be created to provide persistent volume support for EKS workloads.
