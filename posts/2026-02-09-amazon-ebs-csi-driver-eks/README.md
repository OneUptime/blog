# How to Configure Amazon EBS CSI Driver for EKS Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, EKS, Storage

Description: Set up and configure the Amazon EBS CSI driver on EKS for dynamic persistent volume provisioning with support for snapshots, resizing, and volume types.

---

Amazon EKS no longer includes the in-tree EBS volume plugin as of Kubernetes 1.23. The Amazon EBS Container Storage Interface (CSI) driver is now the recommended way to provision and manage EBS volumes for persistent storage in EKS clusters.

This guide shows you how to install and configure the EBS CSI driver, create storage classes for different workload requirements, and manage volume snapshots.

## Understanding the EBS CSI Driver

The EBS CSI driver implements the Container Storage Interface specification, providing a standard way for Kubernetes to interact with EBS volumes. Key features include:

**Dynamic provisioning** - Automatically creates EBS volumes when PersistentVolumeClaims are created.

**Volume snapshots** - Create point-in-time snapshots of volumes for backup and recovery.

**Volume resizing** - Expand volumes without downtime.

**Multiple volume types** - Support for gp3, gp2, io1, io2, st1, and sc1 volume types.

The driver runs as a DaemonSet on cluster nodes and a Deployment for the controller.

## Installing the EBS CSI Driver

Create an IAM role for the CSI driver using IRSA (IAM Roles for Service Accounts):

```bash
# Get your cluster OIDC provider
CLUSTER_NAME="my-eks-cluster"
OIDC_ID=$(aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --query "cluster.identity.oidc.issuer" \
  --output text | cut -d '/' -f 5)

# Create IAM policy
cat > ebs-csi-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateSnapshot",
        "ec2:AttachVolume",
        "ec2:DetachVolume",
        "ec2:ModifyVolume",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeInstances",
        "ec2:DescribeSnapshots",
        "ec2:DescribeTags",
        "ec2:DescribeVolumes",
        "ec2:DescribeVolumesModifications"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateTags"
      ],
      "Resource": [
        "arn:aws:ec2:*:*:volume/*",
        "arn:aws:ec2:*:*:snapshot/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteTags"
      ],
      "Resource": [
        "arn:aws:ec2:*:*:volume/*",
        "arn:aws:ec2:*:*:snapshot/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVolume"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteVolume"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteSnapshot"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name AmazonEBSCSIDriverPolicy \
  --policy-document file://ebs-csi-policy.json
```

Create the IAM role and service account:

```bash
eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=ebs-csi-controller-sa \
  --attach-policy-arn=arn:aws:iam::ACCOUNT_ID:policy/AmazonEBSCSIDriverPolicy \
  --approve \
  --role-name AmazonEKS_EBS_CSI_DriverRole
```

Install the EBS CSI driver using the EKS addon:

```bash
aws eks create-addon \
  --cluster-name $CLUSTER_NAME \
  --addon-name aws-ebs-csi-driver \
  --service-account-role-arn arn:aws:iam::ACCOUNT_ID:role/AmazonEKS_EBS_CSI_DriverRole
```

Alternatively, install using Helm:

```bash
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm repo update

helm install aws-ebs-csi-driver \
  --namespace kube-system \
  aws-ebs-csi-driver/aws-ebs-csi-driver \
  --set controller.serviceAccount.create=false \
  --set controller.serviceAccount.name=ebs-csi-controller-sa
```

## Creating Storage Classes

Create storage classes for different EBS volume types:

```yaml
# gp3-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  fsType: ext4
  encrypted: "true"
```

Create io2 storage class for high-performance workloads:

```yaml
# io2-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: io2-high-perf
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
parameters:
  type: io2
  iops: "10000"
  fsType: ext4
  encrypted: "true"
```

Apply the storage classes:

```bash
kubectl apply -f gp3-storage-class.yaml
kubectl apply -f io2-storage-class.yaml
```

## Using Persistent Volume Claims

Create a PVC using the gp3 storage class:

```yaml
# postgres-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      storage: 50Gi
```

Deploy PostgreSQL using the PVC:

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          value: "changeme"
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: gp3
      resources:
        requests:
          storage: 50Gi
```

Apply the configurations:

```bash
kubectl apply -f postgres-deployment.yaml
```

Verify the volume:

```bash
# Check PVC status
kubectl get pvc

# Check PV details
kubectl get pv

# Get EBS volume ID
kubectl get pv -o jsonpath='{.items[0].spec.csi.volumeHandle}'
```

## Resizing Volumes

Expand a volume by editing the PVC:

```bash
# Edit PVC to increase size
kubectl patch pvc postgres-data -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# Watch the resize operation
kubectl get pvc postgres-data -w
```

The EBS CSI driver automatically:
1. Modifies the EBS volume size
2. Expands the filesystem inside the pod

For manual filesystem expansion:

```bash
# If automatic expansion fails, resize manually
kubectl exec postgres-0 -- resize2fs /dev/xvda
```

## Creating Volume Snapshots

Install snapshot CRDs and controller:

```bash
# Install snapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml

# Install snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

Create a VolumeSnapshotClass:

```yaml
# snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-snapshot-class
driver: ebs.csi.aws.com
deletionPolicy: Delete
```

Create a snapshot:

```yaml
# postgres-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot
spec:
  volumeSnapshotClassName: ebs-snapshot-class
  source:
    persistentVolumeClaimName: postgres-data
```

Apply and verify:

```bash
kubectl apply -f snapshot-class.yaml
kubectl apply -f postgres-snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot postgres-snapshot

# Get snapshot details
kubectl describe volumesnapshot postgres-snapshot
```

## Restoring from Snapshots

Create a PVC from a snapshot:

```yaml
# restore-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-restored
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  dataSource:
    name: postgres-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 50Gi
```

Deploy a new pod using the restored volume:

```bash
kubectl apply -f restore-pvc.yaml

# Use the restored volume in a pod
kubectl run postgres-restored \
  --image=postgres:15 \
  --overrides='
  {
    "spec": {
      "containers": [{
        "name": "postgres",
        "image": "postgres:15",
        "volumeMounts": [{
          "name": "data",
          "mountPath": "/var/lib/postgresql/data"
        }]
      }],
      "volumes": [{
        "name": "data",
        "persistentVolumeClaim": {
          "claimName": "postgres-restored"
        }
      }]
    }
  }'
```

## Volume Topology and Availability Zones

Use topology-aware volume binding to ensure pods and volumes are in the same AZ:

```yaml
# topology-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-topology
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
allowedTopologies:
- matchLabelExpressions:
  - key: topology.ebs.csi.aws.com/zone
    values:
    - us-east-1a
    - us-east-1b
parameters:
  type: gp3
  encrypted: "true"
```

The `WaitForFirstConsumer` binding mode ensures the volume is created in the same AZ as the pod.

## Monitoring EBS CSI Driver

Check driver components:

```bash
# Check controller pods
kubectl get pods -n kube-system -l app=ebs-csi-controller

# Check node pods
kubectl get pods -n kube-system -l app=ebs-csi-node

# View driver logs
kubectl logs -n kube-system -l app=ebs-csi-controller -c ebs-plugin
```

Monitor volume operations:

```bash
# View CSI events
kubectl get events --field-selector involvedObject.kind=PersistentVolumeClaim

# Check volume attachments
kubectl get volumeattachments
```

## Troubleshooting EBS CSI Issues

If volumes fail to provision:

```bash
# Check CSI controller logs
kubectl logs -n kube-system deployment/ebs-csi-controller -c ebs-plugin

# Verify IAM permissions
aws sts get-caller-identity

# Check PVC events
kubectl describe pvc postgres-data
```

If volumes fail to attach:

```bash
# Check node driver logs
kubectl logs -n kube-system -l app=ebs-csi-node -c ebs-plugin

# Verify volume exists in AWS
aws ec2 describe-volumes --volume-ids vol-xxxxx

# Check volume attachment status
kubectl get volumeattachments -o yaml
```

## Using Encrypted Volumes

Enable encryption by default in storage class:

```yaml
# encrypted-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-encrypted
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
parameters:
  type: gp3
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
```

All volumes created with this storage class use KMS encryption.

## Conclusion

The Amazon EBS CSI driver provides enterprise-grade persistent storage for EKS clusters with support for dynamic provisioning, snapshots, and volume expansion. Proper configuration of storage classes, IAM roles, and snapshot policies ensures reliable storage operations for stateful applications.

Key benefits include automated volume lifecycle management, backup and restore capabilities through snapshots, and the ability to choose appropriate EBS volume types for different workload requirements. The CSI driver is essential infrastructure for running databases and other stateful workloads on EKS.
