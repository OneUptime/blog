# How to Configure AWS EBS CSI Driver on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, EBS, CSI Driver, Kubernetes, Storage

Description: Step-by-step guide to deploying and configuring the AWS EBS CSI driver on Talos Linux for persistent storage in Kubernetes.

---

Persistent storage is one of the first things you need to sort out when running stateful workloads on Kubernetes. If your cluster is on AWS and you are using Talos Linux, the AWS EBS CSI driver is the standard way to provision and manage Elastic Block Store volumes. This guide covers everything from IAM setup to deploying the driver and testing it with a real workload.

## Why the EBS CSI Driver Matters

Kubernetes used to handle AWS EBS volumes through an in-tree plugin built directly into the kubelet and controller manager. That approach is now deprecated. The Container Storage Interface, or CSI, is the modern standard. It runs as a set of pods in your cluster and communicates with the AWS API to create, attach, resize, and snapshot EBS volumes on demand.

The CSI approach has several advantages. It decouples storage logic from the core Kubernetes codebase. Updates and bug fixes ship independently. You also get access to newer EBS features like io2 volumes and faster snapshot operations that the in-tree plugin never supported.

## Prerequisites

You will need the following before getting started:

- A running Talos Linux cluster on AWS
- The AWS cloud provider configured (external cloud controller manager)
- `kubectl` and `talosctl` installed
- Helm installed (version 3 or later)
- IAM permissions to create roles and policies

## Creating the IAM Policy

The EBS CSI driver needs its own IAM policy to interact with EC2 and EBS APIs. Create a policy with the following permissions:

```json
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
        "ec2:DescribeVolumesModifications",
        "ec2:CreateVolume",
        "ec2:DeleteVolume",
        "ec2:DeleteSnapshot",
        "ec2:CreateTags",
        "ec2:DeleteTags"
      ],
      "Resource": "*"
    }
  ]
}
```

Save this as `ebs-csi-policy.json` and create the policy:

```bash
# Create the IAM policy for the EBS CSI driver
aws iam create-policy \
  --policy-name AmazonEBSCSIDriverPolicy \
  --policy-document file://ebs-csi-policy.json
```

## Setting Up IAM for the Driver

There are two main approaches for granting the CSI driver access to AWS APIs. The simplest is to attach the policy to the IAM role already assigned to your worker nodes. The more secure approach is to use IAM Roles for Service Accounts (IRSA) if you have an OIDC provider set up.

For the node-role approach, attach the policy directly:

```bash
# Attach the EBS CSI policy to the worker node IAM role
aws iam attach-role-policy \
  --role-name talos-worker-role \
  --policy-arn arn:aws:iam::123456789012:policy/AmazonEBSCSIDriverPolicy
```

If you prefer IRSA, you need to set up an OIDC provider for your cluster and create a trust relationship. This is more involved but limits the blast radius since only the CSI driver pods get the permissions.

## Deploying the EBS CSI Driver with Helm

The recommended way to deploy the driver is through Helm. Add the EBS CSI chart repository and install it:

```bash
# Add the AWS EBS CSI driver Helm repository
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm repo update

# Install the driver into the kube-system namespace
helm install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
  --namespace kube-system \
  --set controller.serviceAccount.create=true \
  --set controller.serviceAccount.name=ebs-csi-controller-sa \
  --set node.serviceAccount.create=true \
  --set node.serviceAccount.name=ebs-csi-node-sa
```

If you are using IRSA, add the annotation to the service account:

```bash
# Install with IRSA annotation for the service account
helm install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
  --namespace kube-system \
  --set controller.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::123456789012:role/ebs-csi-role
```

## Verifying the Deployment

After installation, check that the driver pods are running:

```bash
# Verify CSI driver pods are healthy
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver

# Check the CSI driver registration
kubectl get csinodes
```

You should see a controller deployment and a daemonset running on every worker node. The controller handles volume creation and deletion, while the node plugin handles attaching and mounting volumes on individual nodes.

## Creating a StorageClass

Now create a StorageClass that uses the EBS CSI driver:

```yaml
# ebs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  # gp3 gives you 3000 IOPS and 125 MB/s baseline for free
  encrypted: "true"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

```bash
# Apply the StorageClass
kubectl apply -f ebs-storageclass.yaml
```

The `WaitForFirstConsumer` binding mode is important. It ensures the volume gets created in the same availability zone as the pod that claims it. Without this, you can end up with a volume in one AZ and a pod scheduled in another, which causes mount failures.

## Testing with a PersistentVolumeClaim

Let us create a test PVC and a pod to verify everything works end to end:

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-ebs-claim
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-gp3
  resources:
    requests:
      storage: 10Gi
---
# test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-ebs-pod
spec:
  containers:
    - name: app
      image: busybox
      command: ["sh", "-c", "echo 'EBS volume works!' > /data/test.txt && sleep 3600"]
      volumeMounts:
        - mountPath: /data
          name: ebs-volume
  volumes:
    - name: ebs-volume
      persistentVolumeClaim:
        claimName: test-ebs-claim
```

```bash
# Deploy the test workload
kubectl apply -f test-pvc.yaml

# Wait for the pod to be running
kubectl get pod test-ebs-pod --watch

# Verify the volume is mounted and writable
kubectl exec test-ebs-pod -- cat /data/test.txt
```

## Volume Snapshots

The EBS CSI driver also supports volume snapshots. First, install the snapshot controller and CRDs if they are not already present:

```bash
# Install the snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
```

Then create a VolumeSnapshotClass and take a snapshot:

```yaml
# snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-snapshot-class
driver: ebs.csi.aws.com
deletionPolicy: Delete
```

## Troubleshooting

If volumes are stuck in a Pending state, check the CSI controller logs:

```bash
# Check controller logs for errors
kubectl logs -n kube-system -l app=ebs-csi-controller -c ebs-plugin
```

Common issues include missing IAM permissions, incorrect availability zone configuration, and reaching the EBS volume limit for your account. The default limit is 5,000 volumes per region, but smaller instance types have lower per-instance attachment limits.

## Conclusion

The AWS EBS CSI driver is essential for running stateful workloads on Talos Linux clusters in AWS. The setup involves creating the right IAM policies, deploying the driver through Helm, and configuring a StorageClass that matches your performance and cost requirements. With gp3 volumes as your default, you get solid baseline performance without paying for provisioned IOPS unless you actually need them.
