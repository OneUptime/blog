# How to Configure AWS EBS Storage in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, AWS EBS

Description: A step-by-step guide to configuring AWS EBS volumes for persistent storage in Rancher-managed Kubernetes clusters.

Amazon Elastic Block Store (EBS) provides scalable, high-performance block storage for Kubernetes workloads running on AWS. Rancher-managed clusters should use the AWS EBS CSI driver for new storage classes. Existing in-tree `kubernetes.io/aws-ebs` volumes can be migrated, but new provisioning should use the CSI driver.

## Prerequisites

- A running Rancher instance
- An AWS-based Kubernetes cluster with Linux worker nodes on EC2 (for example, EKS or RKE on EC2)
- IAM permissions for the EBS CSI driver
- kubectl and Helm access to your cluster

## Step 1: Configure IAM Permissions

The EBS CSI driver needs IAM permissions for EBS operations. On EKS, attach these permissions to the IAM role used by the `ebs-csi-controller-sa` service account. On self-managed EC2 clusters, attach the equivalent permissions to the instance profile used by the driver:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVolume",
        "ec2:DeleteVolume",
        "ec2:AttachVolume",
        "ec2:DetachVolume",
        "ec2:ModifyVolume",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeSnapshots",
        "ec2:DescribeTags",
        "ec2:DescribeVolumes",
        "ec2:DescribeVolumesModifications",
        "ec2:DescribeVolumeStatus",
        "ec2:CreateSnapshot",
        "ec2:DeleteSnapshot",
        "ec2:CreateTags",
        "ec2:DeleteTags"
      ],
      "Resource": "*"
    }
  ]
}
```

If you use a customer-managed KMS key, also grant the driver `kms:Decrypt`, `kms:GenerateDataKeyWithoutPlaintext`, and `kms:CreateGrant` on that key. If you use an EC2 instance profile instead of IRSA, make sure the driver can reach IMDS.

## Step 2: Install the EBS CSI Driver

Install the AWS EBS CSI driver using Helm:

```bash
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm repo update

helm upgrade --install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
  --namespace kube-system
```

If you use IRSA on EKS, add the service account annotation to the Helm install: `--set controller.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="arn:aws:iam::123456789012:role/EBS_CSI_DriverRole"`.

Verify the installation:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver
kubectl get csidrivers | grep ebs
```

## Step 3: Create EBS Storage Classes

Create storage classes for different EBS volume types:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  csi.storage.k8s.io/fstype: ext4
  encrypted: "true"
  iops: "3000"
  throughput: "125"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-io2
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  csi.storage.k8s.io/fstype: ext4
  encrypted: "true"
  iops: "10000"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-st1
provisioner: ebs.csi.aws.com
parameters:
  type: st1
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f ebs-storageclasses.yaml
```

## Step 4: Create a PVC with EBS Storage

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ebs-claim
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-gp3
  resources:
    requests:
      storage: 20Gi
```

```bash
kubectl apply -f ebs-claim.yaml
```

Because these storage classes use `WaitForFirstConsumer`, this PVC remains `Pending` until a Pod references it.

## Step 5: Deploy an Application with EBS Storage

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: default
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    name: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: default
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
        env:
        - name: POSTGRES_PASSWORD
          value: mysecretpassword
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes:
        - ReadWriteOnce
      storageClassName: ebs-gp3
      resources:
        requests:
          storage: 50Gi
```

```bash
kubectl apply -f postgres.yaml
```

Wait until the StatefulSet is running so the `postgres-data-postgres-0` PVC is bound before taking a snapshot.

## Step 6: Configure Encrypted Volumes

Enable encryption with a custom KMS key:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-encrypted
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  csi.storage.k8s.io/fstype: ext4
  encrypted: "true"
  kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/abcd-1234-efgh-5678
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

## Step 7: Configure Volume Snapshots

Create a VolumeSnapshotClass for EBS. Make sure the snapshot CRDs and snapshot controller are installed in the cluster first, because the EBS CSI Helm chart does not install them:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-snapshot-class
driver: ebs.csi.aws.com
deletionPolicy: Retain
```

Take a snapshot of the bound PVC created by the StatefulSet (`postgres-data-postgres-0` in this example):

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: ebs-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: ebs-snapshot-class
  source:
    persistentVolumeClaimName: postgres-data-postgres-0
```

## Step 8: Restore from a Snapshot

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-claim
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-gp3
  resources:
    requests:
      storage: 50Gi
  dataSource:
    name: ebs-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

## Step 9: Configure Topology Awareness

Ensure volumes are created in the same AZ as pods:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-zone-aware
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
allowedTopologies:
- matchLabelExpressions:
  - key: topology.ebs.csi.aws.com/zone
    values:
    - us-east-1a
    - us-east-1b
volumeBindingMode: WaitForFirstConsumer
```

## Step 10: Monitor EBS Volumes

```bash
# Check PVCs and their status

kubectl get pvc --all-namespaces

# View EBS volume details
kubectl get pv -o custom-columns='NAME:.metadata.name,CAPACITY:.spec.capacity.storage,CLASS:.spec.storageClassName,STATUS:.status.phase'

# Check CSI driver logs
kubectl logs -n kube-system deployment/ebs-csi-controller -c ebs-plugin --tail=50

# Describe a PV to see the EBS volume ID
kubectl describe pv <pv-name> | grep VolumeHandle

# Check volume in AWS CLI
aws ec2 describe-volumes --volume-ids <vol-id>
```

## Troubleshooting

- **PVC Pending**: Check IAM permissions and CSI driver pods
- **Wrong AZ**: Use `WaitForFirstConsumer` binding mode
- **Volume limit reached**: EC2 instances have limits on attached EBS volumes
- **Encryption errors**: Verify KMS key permissions
- **Detach failures**: Check for force-detach in AWS console if needed

## Summary

AWS EBS storage in Rancher provides reliable, high-performance block storage for Kubernetes workloads. The EBS CSI driver enables dynamic provisioning, volume expansion, snapshots, and encryption. By using different EBS volume types (gp3, io2, st1), you can match storage performance to workload requirements while keeping costs optimized.
