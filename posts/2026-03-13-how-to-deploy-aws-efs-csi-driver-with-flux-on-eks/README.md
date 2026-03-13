# How to Deploy AWS EFS CSI Driver with Flux on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, EFS, CSI Driver, Storage, Helm, Shared Storage

Description: Learn how to deploy the AWS EFS CSI driver on EKS using Flux for GitOps-managed shared file storage that supports ReadWriteMany access across multiple pods.

---

## What is the AWS EFS CSI Driver

The AWS EFS CSI driver enables Kubernetes workloads to use Amazon Elastic File System (EFS) for shared, persistent file storage. Unlike EBS which provides block storage limited to a single pod, EFS provides NFS-based file storage that supports ReadWriteMany access, making it ideal for shared data, content management systems, and applications that need concurrent file access across multiple pods.

## Prerequisites

- An EKS cluster with the OIDC provider enabled
- Flux installed on the EKS cluster
- An EFS file system created in the same VPC as the EKS cluster
- Security groups configured to allow NFS traffic (port 2049) from EKS nodes

## Repository Structure

```
flux-repo/
├── clusters/
│   └── production/
│       ├── infrastructure.yaml
│       ├── storage.yaml
│       └── apps.yaml
└── infrastructure/
    └── efs-csi/
        ├── kustomization.yaml
        ├── helmrepository.yaml
        ├── helmrelease.yaml
        └── service-account.yaml
```

## Step 1: Create the EFS File System

```bash
# Get the VPC ID for the EKS cluster
VPC_ID=$(aws eks describe-cluster --name my-cluster \
  --query "cluster.resourcesVpcConfig.vpcId" --output text)

# Create the EFS file system
EFS_ID=$(aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=eks-efs Key=kubernetes.io/cluster/my-cluster,Value=owned \
  --query 'FileSystemId' --output text)

echo "EFS ID: $EFS_ID"

# Create a security group for EFS
EFS_SG=$(aws ec2 create-security-group \
  --group-name eks-efs-sg \
  --description "Security group for EFS mount targets" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' --output text)

# Get the EKS node security group
NODE_SG=$(aws eks describe-cluster --name my-cluster \
  --query "cluster.resourcesVpcConfig.clusterSecurityGroupId" --output text)

# Allow NFS traffic from EKS nodes
aws ec2 authorize-security-group-ingress \
  --group-id "$EFS_SG" \
  --protocol tcp \
  --port 2049 \
  --source-group "$NODE_SG"

# Create mount targets in each subnet
for SUBNET in $(aws eks describe-cluster --name my-cluster \
  --query "cluster.resourcesVpcConfig.subnetIds[]" --output text); do
  aws efs create-mount-target \
    --file-system-id "$EFS_ID" \
    --subnet-id "$SUBNET" \
    --security-groups "$EFS_SG" 2>/dev/null || true
done
```

## Step 2: Create the IAM Policy

```bash
cat > efs-csi-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:DescribeAccessPoints",
        "elasticfilesystem:DescribeFileSystems",
        "elasticfilesystem:DescribeMountTargets",
        "ec2:DescribeAvailabilityZones"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:CreateAccessPoint"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:RequestTag/efs.csi.aws.com/cluster": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:TagResource"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:ResourceTag/efs.csi.aws.com/cluster": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "elasticfilesystem:DeleteAccessPoint",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/efs.csi.aws.com/cluster": "true"
        }
      }
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name AmazonEFSCSIDriverPolicy \
  --policy-document file://efs-csi-policy.json
```

## Step 3: Create the IAM Role

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
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
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:kube-system:efs-csi-controller-sa",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name AmazonEKS_EFS_CSI_DriverRole \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name AmazonEKS_EFS_CSI_DriverRole \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/AmazonEFSCSIDriverPolicy"
```

## Step 4: Define Flux Resources

```yaml
# infrastructure/efs-csi/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: aws-efs-csi-driver
  namespace: flux-system
spec:
  interval: 24h
  url: https://kubernetes-sigs.github.io/aws-efs-csi-driver
```

```yaml
# infrastructure/efs-csi/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: efs-csi-controller-sa
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AmazonEKS_EFS_CSI_DriverRole
```

```yaml
# infrastructure/efs-csi/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: aws-efs-csi-driver
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: aws-efs-csi-driver
      version: "2.5.x"
      sourceRef:
        kind: HelmRepository
        name: aws-efs-csi-driver
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
        name: efs-csi-controller-sa
      resources:
        requests:
          cpu: 10m
          memory: 40Mi
        limits:
          cpu: 100m
          memory: 128Mi
    node:
      tolerateAllTaints: true
    storageClasses:
      - name: efs-sc
        parameters:
          provisioningMode: efs-ap
          fileSystemId: fs-0123456789abcdef0
          directoryPerms: "700"
          gidRangeStart: "1000"
          gidRangeEnd: "2000"
          basePath: "/dynamic_provisioning"
        reclaimPolicy: Delete
        volumeBindingMode: Immediate
```

```yaml
# infrastructure/efs-csi/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helmrepository.yaml
  - service-account.yaml
  - helmrelease.yaml
```

## Step 5: Configure Flux Kustomization

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: efs-csi
  namespace: flux-system
spec:
  interval: 1h
  retryInterval: 1m
  timeout: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/efs-csi
  prune: true
  wait: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: efs-csi-controller
      namespace: kube-system
    - apiVersion: apps/v1
      kind: DaemonSet
      name: efs-csi-node
      namespace: kube-system
```

## Step 6: Using EFS in Applications

Dynamic provisioning with access points:

```yaml
# apps/production/shared-storage/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 5Gi
```

Static provisioning with an existing EFS file system:

```yaml
# apps/production/shared-storage/pv-static.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-static-pv
spec:
  capacity:
    storage: 100Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-static
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0123456789abcdef0
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: efs-static-claim
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-static
  resources:
    requests:
      storage: 100Gi
```

Multiple pods sharing the same volume:

```yaml
# apps/production/shared-storage/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: nginx:latest
          volumeMounts:
            - name: shared-data
              mountPath: /usr/share/nginx/html
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: shared-data
```

## Verifying the Deployment

```bash
# Check EFS CSI driver pods
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-efs-csi-driver

# Verify the CSI driver is registered
kubectl get csidriver efs.csi.aws.com

# Check StorageClass
kubectl get storageclass efs-sc

# Verify PVCs are bound
kubectl get pvc --all-namespaces

# Check mount targets are available
aws efs describe-mount-targets --file-system-id fs-0123456789abcdef0
```

## Conclusion

Deploying the AWS EFS CSI driver with Flux on EKS enables GitOps-managed shared file storage for Kubernetes workloads. EFS is particularly valuable for applications that need ReadWriteMany access, such as content management systems, shared configuration stores, and machine learning training data. The dynamic provisioning mode with EFS access points provides isolated directory structures per PVC while sharing the same underlying file system, combining security isolation with operational simplicity.
