# How to Set Up EFS CSI Driver for EKS Shared Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, EFS, Storage

Description: Step-by-step guide to installing the Amazon EFS CSI driver on EKS for shared, persistent storage across multiple pods and nodes.

---

Most Kubernetes storage solutions give you a volume that's attached to a single node. That works fine for databases and single-pod workloads, but what about applications that need shared storage across multiple pods - maybe a CMS that stores uploaded files, or a batch processing system where workers need access to the same data? That's where Amazon EFS comes in.

EFS provides a fully managed NFS filesystem that can be mounted by pods running on any node in your cluster, simultaneously. The EFS CSI driver makes this work seamlessly with Kubernetes' PersistentVolume system.

## Why EFS for Kubernetes

EBS volumes are great for single-pod workloads, but they have a limitation - an EBS volume can only be attached to one node at a time (with the exception of io2 multi-attach). EFS solves this with a few key characteristics:

- **ReadWriteMany (RWX)** access mode - multiple pods on multiple nodes can read and write simultaneously
- **Elastic capacity** - no need to pre-provision storage size, it grows and shrinks automatically
- **Cross-AZ** - accessible from any availability zone in the region
- **Automatic backups** - integrates with AWS Backup

## Prerequisites

Before setting up the EFS CSI driver, you need:

- An EKS cluster running Kubernetes 1.23 or later
- An OIDC provider associated with your cluster (see our [IRSA guide](https://oneuptime.com/blog/post/2026-02-12-set-up-iam-roles-for-eks-service-accounts-irsa/view))
- kubectl and Helm configured

## Step 1: Create an EFS File System

First, identify the VPC and subnets your EKS cluster uses:

```bash
# Get the VPC ID for your EKS cluster
VPC_ID=$(aws eks describe-cluster --name my-cluster --query "cluster.resourcesVpcConfig.vpcId" --output text)

# Get the CIDR block for security group rules
CIDR_BLOCK=$(aws ec2 describe-vpcs --vpc-ids $VPC_ID --query "Vpcs[0].CidrBlock" --output text)
```

Create a security group that allows NFS traffic from your cluster:

```bash
# Create security group for EFS mount targets
SG_ID=$(aws ec2 create-security-group \
  --group-name EFS-EKS-SG \
  --description "Allow NFS traffic from EKS" \
  --vpc-id $VPC_ID \
  --query "GroupId" --output text)

# Allow inbound NFS traffic from the VPC CIDR
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 2049 \
  --cidr $CIDR_BLOCK
```

Create the EFS filesystem:

```bash
# Create the EFS file system
FS_ID=$(aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=eks-shared-storage \
  --query "FileSystemId" --output text)

echo "EFS File System ID: $FS_ID"
```

Create mount targets in each subnet where your nodes run:

```bash
# Get the subnet IDs used by your EKS cluster
SUBNET_IDS=$(aws eks describe-cluster --name my-cluster \
  --query "cluster.resourcesVpcConfig.subnetIds" --output text)

# Create a mount target in each subnet
for SUBNET in $SUBNET_IDS; do
  aws efs create-mount-target \
    --file-system-id $FS_ID \
    --subnet-id $SUBNET \
    --security-groups $SG_ID
done
```

Wait for the mount targets to become available:

```bash
# Check mount target status
aws efs describe-mount-targets --file-system-id $FS_ID \
  --query "MountTargets[*].{SubnetId:SubnetId,State:LifeCycleState}"
```

## Step 2: Install the EFS CSI Driver

Create the IAM role for the driver using IRSA:

```bash
# Create IRSA role for the EFS CSI driver
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --namespace kube-system \
  --name efs-csi-controller-sa \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEFSCSIDriverPolicy \
  --approve
```

Install the driver using Helm:

```bash
# Add the AWS EFS CSI driver Helm chart repo
helm repo add aws-efs-csi-driver https://kubernetes-sigs.github.io/aws-efs-csi-driver/
helm repo update

# Install the EFS CSI driver
helm install aws-efs-csi-driver aws-efs-csi-driver/aws-efs-csi-driver \
  --namespace kube-system \
  --set controller.serviceAccount.create=false \
  --set controller.serviceAccount.name=efs-csi-controller-sa
```

Verify the driver is running:

```bash
# Check that the EFS CSI driver pods are running
kubectl get pods -n kube-system -l app=efs-csi-controller
kubectl get pods -n kube-system -l app=efs-csi-node
```

You should see a controller pod and a node pod on each worker node.

## Step 3: Create a StorageClass

Define a StorageClass that tells Kubernetes how to provision EFS volumes:

```yaml
# storageclass.yaml - EFS StorageClass for dynamic provisioning
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef0  # Replace with your EFS ID
  directoryPerms: "700"
  gidRangeStart: "1000"
  gidRangeEnd: "2000"
```

```bash
# Create the StorageClass
kubectl apply -f storageclass.yaml
```

## Step 4: Create a PersistentVolumeClaim

Now create a PVC that uses the EFS StorageClass:

```yaml
# pvc.yaml - PersistentVolumeClaim for EFS shared storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: efs-shared-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 5Gi  # EFS ignores this value but it's required by K8s
```

```bash
# Create the PVC
kubectl apply -f pvc.yaml

# Verify it's bound
kubectl get pvc efs-shared-pvc
```

Note that the storage size doesn't actually limit the EFS volume. EFS is elastic and grows as needed. The value is just required by the Kubernetes API.

## Step 5: Mount the Volume in Pods

Use the PVC in your pod spec:

```yaml
# shared-app.yaml - Deployment using EFS shared storage
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shared-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shared-app
  template:
    metadata:
      labels:
        app: shared-app
    spec:
      containers:
        - name: app
          image: nginx:1.25
          volumeMounts:
            - name: shared-storage
              mountPath: /usr/share/nginx/html
      volumes:
        - name: shared-storage
          persistentVolumeClaim:
            claimName: efs-shared-pvc
```

```bash
# Deploy the application
kubectl apply -f shared-app.yaml
```

All three replicas will mount the same EFS filesystem at `/usr/share/nginx/html`. Files written by one pod are immediately visible to the others.

## Using Static Provisioning

For more control, you can create the PersistentVolume manually. This is useful when you want to mount a specific EFS access point or subdirectory:

```yaml
# static-pv.yaml - Manually defined PersistentVolume
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-static-pv
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0123456789abcdef0:/data/myapp
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: efs-static-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 5Gi
  volumeName: efs-static-pv
```

## Performance Considerations

EFS throughput depends on the amount of data stored and the throughput mode you choose:

- **Bursting mode** - baseline throughput scales with storage size, with burst credits for peaks
- **Provisioned mode** - you specify throughput independently of storage size (good for small datasets with high I/O needs)
- **Elastic mode** - automatically scales throughput up and down based on demand (recommended for most workloads)

For latency-sensitive workloads, consider using EBS volumes with [stateful applications](https://oneuptime.com/blog/post/2026-02-12-deploy-stateful-applications-on-eks/view) instead. EFS adds a few milliseconds of latency compared to EBS.

## Troubleshooting

If pods get stuck in ContainerCreating, check the CSI node logs:

```bash
# Check EFS CSI node driver logs
kubectl logs -n kube-system -l app=efs-csi-node -c efs-plugin --tail=50
```

Common issues include security group misconfiguration (port 2049 not open), missing mount targets in the pod's availability zone, and DNS resolution failures. Make sure your VPC DNS is enabled and the mount targets are in all subnets where your nodes run.

EFS gives your EKS workloads the shared storage capability that's otherwise missing from Kubernetes on AWS. It's not the fastest storage option, but for use cases that require ReadWriteMany access, it's the simplest and most reliable choice.
