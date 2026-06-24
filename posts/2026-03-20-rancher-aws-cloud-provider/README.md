# How to Configure AWS Cloud Provider in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, AWS, Cloud Provider

Description: Configure the AWS cloud provider in Rancher-managed clusters to enable native AWS LoadBalancers, EBS volumes, and EC2 node lifecycle management.

## Introduction

In Kubernetes 1.27 and later, AWS integration in Rancher-managed RKE2 clusters uses the out-of-tree AWS cloud controller manager for Services of type `LoadBalancer` and EC2 node lifecycle management, and the AWS EBS CSI driver for dynamic EBS provisioning. This guide covers configuring both pieces for RKE2 clusters managed by Rancher.

## Prerequisites

- Rancher managing an RKE2 cluster running on AWS EC2
- An IAM role attached to the EC2 instances used by the cluster, or another supported AWS credential source for the EBS CSI driver
- The cluster's nodes, subnets, and one security group tagged with `kubernetes.io/cluster/<cluster-id>: owned`

## Required IAM Permissions

Create an IAM policy for the credentials used by `aws-cloud-controller-manager` with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:DescribeLaunchConfigurations",
        "autoscaling:DescribeTags",
        "ec2:DescribeInstances",
        "ec2:DescribeRegions",
        "ec2:DescribeRouteTables",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSubnets",
        "ec2:DescribeVolumes",
        "ec2:DescribeAvailabilityZones",
        "ec2:CreateSecurityGroup",
        "ec2:CreateTags",
        "ec2:CreateVolume",
        "ec2:ModifyInstanceAttribute",
        "ec2:ModifyVolume",
        "ec2:AttachVolume",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:CreateRoute",
        "ec2:DeleteRoute",
        "ec2:DeleteSecurityGroup",
        "ec2:DeleteVolume",
        "ec2:DetachVolume",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:DescribeVpcs",
        "ec2:DescribeInstanceTopology",
        "elasticloadbalancing:AddTags",
        "elasticloadbalancing:AttachLoadBalancerToSubnets",
        "elasticloadbalancing:ApplySecurityGroupsToLoadBalancer",
        "elasticloadbalancing:CreateLoadBalancer",
        "elasticloadbalancing:CreateLoadBalancerPolicy",
        "elasticloadbalancing:CreateLoadBalancerListeners",
        "elasticloadbalancing:ConfigureHealthCheck",
        "elasticloadbalancing:DeleteLoadBalancer",
        "elasticloadbalancing:DeleteLoadBalancerListeners",
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeLoadBalancerAttributes",
        "elasticloadbalancing:DetachLoadBalancerFromSubnets",
        "elasticloadbalancing:DeregisterInstancesFromLoadBalancer",
        "elasticloadbalancing:ModifyLoadBalancerAttributes",
        "elasticloadbalancing:RegisterInstancesWithLoadBalancer",
        "elasticloadbalancing:SetLoadBalancerPoliciesForBackendServer",
        "elasticloadbalancing:CreateListener",
        "elasticloadbalancing:CreateTargetGroup",
        "elasticloadbalancing:DeleteListener",
        "elasticloadbalancing:DeleteTargetGroup",
        "elasticloadbalancing:DescribeListeners",
        "elasticloadbalancing:DescribeLoadBalancerPolicies",
        "elasticloadbalancing:DescribeTargetGroups",
        "elasticloadbalancing:DescribeTargetHealth",
        "elasticloadbalancing:ModifyListener",
        "elasticloadbalancing:ModifyTargetGroup",
        "elasticloadbalancing:RegisterTargets",
        "elasticloadbalancing:DeregisterTargets",
        "elasticloadbalancing:SetLoadBalancerPoliciesOfListener",
        "iam:CreateServiceLinkedRole",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
```

## Step 1: Tag AWS Resources

Tag every cluster node, the subnet used by the cluster, and one security group used by the cluster:

```bash
# Replace these with the resources used by your cluster.
CLUSTER_ID="my-rancher-cluster"
INSTANCE_IDS="i-0123456789abcdef0 i-0fedcba9876543210"
SUBNET_ID="subnet-xxxxxxxx"
SECURITY_GROUP_ID="sg-xxxxxxxx"

aws ec2 create-tags \
  --resources $INSTANCE_IDS "$SUBNET_ID" "$SECURITY_GROUP_ID" \
  --tags "Key=kubernetes.io/cluster/${CLUSTER_ID},Value=owned"
```

Use `shared` instead of `owned` if the subnet or security group is intentionally shared across clusters.

## Step 2: Configure the Cloud Provider in RKE2

On server nodes, configure RKE2 so the Kubernetes components use the external AWS cloud provider:

```yaml
# /etc/rancher/rke2/config.yaml (server nodes)
cloud-provider-name: aws
disable-cloud-controller: true
kube-apiserver-arg:
  - cloud-provider=external
kube-controller-manager-arg:
  - cloud-provider=external
kubelet-arg:
  - cloud-provider=external
```

## Step 3: Configure RKE2 to Use the Cloud Provider

Update the RKE2 agent configuration:

```yaml
# /etc/rancher/rke2/config.yaml (agent nodes)
cloud-provider-name: aws
kubelet-arg:
  - cloud-provider=external
```

Restart the appropriate RKE2 service on each node after updating the configuration.

## Step 4: Configure via Rancher UI (Cluster Edit)

1. In Rancher, navigate to **Cluster Management** → select the cluster → **⋮ → Edit Config**.
2. For Rancher-provisioned RKE2 clusters, apply the equivalent AWS cloud provider settings through Rancher instead of editing `/etc/rancher/rke2/config.yaml` by hand.
3. Save the changes and let Rancher roll them out to the cluster.

## Step 5: Install the AWS Cloud Controller Manager

For RKE2 clusters, install the out-of-tree AWS CCM:

```bash
# Add the AWS CCM Helm chart
cat << 'EOF' > aws-ccm-values.yaml
hostNetworking: true
nodeSelector:
  node-role.kubernetes.io/control-plane: 'true'
tolerations:
  - effect: NoSchedule
    key: node.cloudprovider.kubernetes.io/uninitialized
    value: 'true'
  - effect: NoSchedule
    key: node-role.kubernetes.io/control-plane
    operator: Exists
args:
  - --use-service-account-credentials=true
  - --configure-cloud-routes=false
  - --v=2
  - --cloud-provider=aws
clusterRoleRules:
  - apiGroups:
      - ""
    resources:
      - events
    verbs:
      - create
      - patch
      - update
  - apiGroups:
      - ""
    resources:
      - nodes
    verbs:
      - "*"
  - apiGroups:
      - ""
    resources:
      - nodes/status
    verbs:
      - patch
  - apiGroups:
      - ""
    resources:
      - services
    verbs:
      - list
      - patch
      - update
      - watch
  - apiGroups:
      - ""
    resources:
      - services/status
    verbs:
      - list
      - patch
      - update
      - watch
  - apiGroups:
      - ""
    resources:
      - serviceaccounts
    verbs:
      - create
      - get
  - apiGroups:
      - ""
    resources:
      - persistentvolumes
    verbs:
      - get
      - list
      - update
      - watch
  - apiGroups:
      - ""
    resources:
      - endpoints
    verbs:
      - create
      - get
      - list
      - watch
      - update
  - apiGroups:
      - coordination.k8s.io
    resources:
      - leases
    verbs:
      - create
      - get
      - list
      - watch
      - update
  - apiGroups:
      - ""
    resources:
      - serviceaccounts/token
    verbs:
      - create
  - apiGroups:
      - authentication.k8s.io
    resources:
      - tokenreviews
    verbs:
      - create
  - apiGroups:
      - authorization.k8s.io
    resources:
      - subjectaccessreviews
    verbs:
      - create
EOF

helm repo add aws-cloud-controller-manager https://kubernetes.github.io/cloud-provider-aws
helm repo update

# Install the CCM
helm upgrade --install aws-cloud-controller-manager aws-cloud-controller-manager/aws-cloud-controller-manager \
  --namespace kube-system \
  --values aws-ccm-values.yaml

kubectl rollout status daemonset/aws-cloud-controller-manager -n kube-system
```

## Step 6: Install the EBS CSI Driver

```bash
# Attach the AWS-managed policy AmazonEBSCSIDriverPolicyV2 to the IAM role
# or other credential source used by the EBS CSI driver before installing it.

# Add the AWS EBS CSI driver
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm repo update

# Install the EBS CSI driver
helm upgrade --install aws-ebs-csi-driver \
  --namespace kube-system \
  aws-ebs-csi-driver/aws-ebs-csi-driver

kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver
```

## Step 7: Verify the Integration

```bash
# Create a test deployment and LoadBalancer service
kubectl apply -f - << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: aws-lb-test
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
EOF

# Wait for the deployment, then watch for the external IP (ELB/NLB DNS name) to appear.
# Stop the watch after the external address is assigned, then continue.
kubectl rollout status deployment/nginx --timeout=180s
kubectl get service aws-lb-test -w

# Create a StorageClass, PVC, and test pod to verify EBS provisioning
kubectl apply -f - << 'EOF'
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ebs-claim
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-sc
  resources:
    requests:
      storage: 4Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: ebs-test-app
spec:
  containers:
    - name: app
      image: public.ecr.aws/amazonlinux/amazonlinux
      command: ["/bin/sh"]
      args: ["-c", "while true; do echo $(date -u) >> /data/out.txt; sleep 5; done"]
      volumeMounts:
        - name: persistent-storage
          mountPath: /data
  volumes:
    - name: persistent-storage
      persistentVolumeClaim:
        claimName: ebs-claim
EOF

kubectl wait --for=condition=Ready pod/ebs-test-app --timeout=180s
kubectl get pvc ebs-claim
kubectl exec ebs-test-app -- cat /data/out.txt
```

## Conclusion

Configuring the AWS cloud provider in Rancher enables seamless integration with AWS infrastructure services. Once configured, the AWS cloud controller manager can provision AWS load balancers for Services of type `LoadBalancer`, and the AWS EBS CSI driver can provision EBS volumes for PVCs that use an `ebs.csi.aws.com` StorageClass. Proper IAM role configuration and tagging the cluster's nodes, subnets, and security group are the most common prerequisites that, when missed, cause integration failures.
