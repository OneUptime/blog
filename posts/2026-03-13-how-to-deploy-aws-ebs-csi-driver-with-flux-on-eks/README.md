# How to Deploy AWS EBS CSI Driver with Flux on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, EBS, CSI Driver, Storage, Helm

Description: Learn how to deploy the AWS EBS CSI driver on EKS using Flux for GitOps-managed persistent block storage with dynamic provisioning and volume snapshots.

---

## What is the AWS EBS CSI Driver

The AWS EBS CSI (Container Storage Interface) driver enables Kubernetes to manage Amazon EBS volumes as persistent storage. It replaces the legacy in-tree EBS provisioner and provides features like volume resizing, snapshots, and encryption with customer-managed KMS keys.

## Prerequisites

- An EKS cluster with the OIDC provider enabled
- Flux installed on the EKS cluster
- IAM permissions for EBS volume management
- The Kubernetes CSI snapshot CRDs and snapshot controller installed if you want to use VolumeSnapshots

## Repository Structure

```text
flux-repo/
├── clusters/
│   └── production/
│       ├── infrastructure.yaml
│       ├── storage.yaml
│       └── apps.yaml
└── infrastructure/
    └── ebs-csi/
        ├── kustomization.yaml
        ├── helmrepository.yaml
        ├── helmrelease.yaml
        └── service-account.yaml
```

## Step 1: Use the IAM Policy

Use the AWS managed IAM policy for the EBS CSI driver:

```bash
EBS_CSI_POLICY_ARN=arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicyV2
```

If you use a customer-managed KMS key for encrypted EBS volumes, attach an additional KMS policy scoped to that key.

## Step 2: Create the IAM Role

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
EBS_CSI_POLICY_ARN=arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicyV2
OIDC_PROVIDER=$(aws eks describe-cluster --name my-cluster \
  --query "cluster.identity.oidc.issuer" --output text | sed 's|https://||')

cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:kube-system:ebs-csi-controller-sa",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name AmazonEKS_EBS_CSI_DriverRole \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name AmazonEKS_EBS_CSI_DriverRole \
  --policy-arn "${EBS_CSI_POLICY_ARN}"
```

## Step 3: Define Flux Resources

```yaml
# infrastructure/ebs-csi/helmrepository.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: aws-ebs-csi-driver
  namespace: flux-system
spec:
  interval: 24h
  url: https://kubernetes-sigs.github.io/aws-ebs-csi-driver
```

```yaml
# infrastructure/ebs-csi/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ebs-csi-controller-sa
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AmazonEKS_EBS_CSI_DriverRole
```

```yaml
# infrastructure/ebs-csi/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: aws-ebs-csi-driver
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: aws-ebs-csi-driver
      version: "2.59.x"
      sourceRef:
        kind: HelmRepository
        name: aws-ebs-csi-driver
        namespace: flux-system
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    controller:
      serviceAccount:
        create: false
        name: ebs-csi-controller-sa
      replicaCount: 2
      resources:
        requests:
          cpu: 10m
          memory: 40Mi
        limits:
          cpu: 100m
          memory: 256Mi
    node:
      tolerateAllTaints: true
    storageClasses:
      - name: gp3
        annotations:
          storageclass.kubernetes.io/is-default-class: "true"
        parameters:
          type: gp3
          encrypted: "true"
        reclaimPolicy: Delete
        volumeBindingMode: WaitForFirstConsumer
        allowVolumeExpansion: true
      - name: io2
        parameters:
          type: io2
          iops: "5000"
          encrypted: "true"
        reclaimPolicy: Retain
        volumeBindingMode: WaitForFirstConsumer
        allowVolumeExpansion: true
    volumeSnapshotClasses:
      - name: ebs-snapshot
        deletionPolicy: Delete
```

```yaml
# infrastructure/ebs-csi/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helmrepository.yaml
  - service-account.yaml
  - helmrelease.yaml
```

## Step 4: Configure Flux Kustomization with Health Checks

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ebs-csi
  namespace: flux-system
spec:
  interval: 1h
  retryInterval: 1m
  timeout: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/ebs-csi
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: ebs-csi-controller
      namespace: kube-system
    - apiVersion: apps/v1
      kind: DaemonSet
      name: ebs-csi-node
      namespace: kube-system
```

## Step 5: Using EBS Volumes in Applications

With the CSI driver deployed, create PVCs that use the gp3 StorageClass:

```yaml
# apps/production/database/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      storage: 100Gi
```

Create a volume snapshot:

```yaml
# apps/production/database/snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-data-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: ebs-snapshot
  source:
    persistentVolumeClaimName: postgres-data
```

Restore from a snapshot:

```yaml
# apps/production/database/restore-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      storage: 100Gi
  dataSource:
    name: postgres-data-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

## Verifying the Deployment

```bash
# Check CSI driver pods
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver

# Verify StorageClasses are created
kubectl get storageclasses

# Check CSI driver is registered
kubectl get csidriver

# Test by creating a PVC
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-ebs
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: gp3
  resources:
    requests:
      storage: 1Gi
EOF

kubectl get pvc test-ebs
```

## Conclusion

Deploying the AWS EBS CSI driver with Flux on EKS provides GitOps-managed persistent block storage with dynamic provisioning, encryption, and snapshot support. By defining StorageClasses through the Helm chart values, you can offer multiple storage tiers to your applications. The IRSA integration ensures secure, credential-free access to the EC2 and KMS APIs needed for volume management.
