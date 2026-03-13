# How to Deploy AWS VPC CNI with Flux on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, VPC CNI, Networking, Helm

Description: Learn how to manage the AWS VPC CNI plugin on Amazon EKS using Flux for GitOps-driven network configuration and upgrades.

---

The AWS VPC CNI plugin is the default networking solution for Amazon EKS. It assigns VPC IP addresses directly to pods, enabling native VPC networking for your Kubernetes workloads. While EKS ships with the VPC CNI as a managed add-on, managing it through Flux gives you finer control over configuration, versioning, and custom settings. This guide covers how to deploy and manage the VPC CNI plugin using Flux on EKS.

## Prerequisites

- An existing EKS cluster (version 1.25 or later)
- Flux CLI installed and bootstrapped on your cluster
- AWS CLI configured with appropriate permissions
- kubectl configured to access your EKS cluster

## Understanding the VPC CNI on EKS

The VPC CNI plugin runs as a DaemonSet on every node and is responsible for:

- Allocating ENIs (Elastic Network Interfaces) to nodes
- Assigning secondary IP addresses from the VPC subnet to pods
- Managing the IP address warm pool for fast pod startup

When managing it through Flux, you can customize prefix delegation, custom networking, security group policies, and more.

## Step 1: Create an IAM Role for the VPC CNI

The VPC CNI requires IAM permissions to manage ENIs and IP addresses. Set up IRSA for the CNI service account.

```bash
eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=kube-system \
  --name=aws-node \
  --attach-policy-arn=arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy \
  --override-existing-serviceaccounts \
  --approve
```

## Step 2: Remove the EKS Managed Add-on

If the VPC CNI is currently managed as an EKS add-on, remove it first so Flux can take over management without conflicts.

```bash
aws eks delete-addon \
  --cluster-name my-cluster \
  --addon-name vpc-cni \
  --preserve
```

The `--preserve` flag keeps the running CNI in place while removing EKS management of it.

## Step 3: Add the EKS Helm Repository Source

Create a Flux `HelmRepository` pointing to the EKS charts repository.

```yaml
# clusters/my-cluster/vpc-cni/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: eks-charts
  namespace: flux-system
spec:
  interval: 24h
  url: https://aws.github.io/eks-charts
```

## Step 4: Create the HelmRelease for VPC CNI

Define the `HelmRelease` that manages the VPC CNI installation and configuration.

```yaml
# clusters/my-cluster/vpc-cni/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: aws-vpc-cni
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: aws-vpc-cni
      version: "1.16.*"
      sourceRef:
        kind: HelmRepository
        name: eks-charts
        namespace: flux-system
      interval: 24h
  values:
    init:
      env:
        DISABLE_TCP_EARLY_DEMUX: "true"
    env:
      ENABLE_PREFIX_DELEGATION: "true"
      WARM_PREFIX_TARGET: "1"
      MINIMUM_IP_TARGET: "5"
      WARM_IP_TARGET: "2"
      ENABLE_POD_ENI: "false"
    serviceAccount:
      create: false
      name: aws-node
    tolerations:
      - operator: Exists
    resources:
      requests:
        cpu: 25m
        memory: 64Mi
```

## Step 5: Enable Prefix Delegation (Optional)

Prefix delegation allows each ENI to use /28 prefixes instead of individual secondary IPs, dramatically increasing the number of pods per node.

The configuration is already included in the HelmRelease values above with `ENABLE_PREFIX_DELEGATION: "true"`. With prefix delegation enabled, each prefix provides 16 IP addresses, allowing significantly more pods per node.

Verify prefix delegation is working:

```bash
kubectl get ds aws-node -n kube-system -o yaml | grep ENABLE_PREFIX_DELEGATION
```

## Step 6: Configure Custom Networking (Optional)

Custom networking lets you assign pod IPs from a different subnet than the node's primary interface. This is useful when your primary subnet IP space is limited.

First, enable custom networking in the HelmRelease values:

```yaml
  values:
    env:
      AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG: "true"
      ENI_CONFIG_LABEL_DEF: "topology.kubernetes.io/zone"
```

Then create `ENIConfig` resources for each availability zone:

```yaml
# clusters/my-cluster/vpc-cni/eniconfig.yaml
apiVersion: crd.k8s.amazonaws.com/v1alpha1
kind: ENIConfig
metadata:
  name: us-west-2a
spec:
  subnet: subnet-0abc123def456
  securityGroups:
    - sg-0abc123def456
---
apiVersion: crd.k8s.amazonaws.com/v1alpha1
kind: ENIConfig
metadata:
  name: us-west-2b
spec:
  subnet: subnet-0def789ghi012
  securityGroups:
    - sg-0abc123def456
```

## Step 7: Configure Security Groups for Pods (Optional)

Security groups for pods allow you to assign AWS security groups directly to individual pods.

Update the HelmRelease values:

```yaml
  values:
    env:
      ENABLE_POD_ENI: "true"
      POD_SECURITY_GROUP_ENFORCING_MODE: "standard"
```

Then create a `SecurityGroupPolicy` resource:

```yaml
# clusters/my-cluster/vpc-cni/sgp.yaml
apiVersion: vpcresources.k8s.aws/v1beta1
kind: SecurityGroupPolicy
metadata:
  name: my-app-sgp
  namespace: my-app-ns
spec:
  podSelector:
    matchLabels:
      app: my-database-app
  securityGroups:
    groupIds:
      - sg-0abc123def456
```

## Step 8: Commit and Reconcile

Push all the manifests to your Git repository:

```bash
git add -A
git commit -m "Manage VPC CNI with Flux"
git push origin main
```

Force a reconciliation to apply changes immediately:

```bash
flux reconcile kustomization flux-system --with-source
```

## Step 9: Verify the Deployment

Check that the VPC CNI DaemonSet is running correctly:

```bash
kubectl get ds aws-node -n kube-system

kubectl get pods -n kube-system -l k8s-app=aws-node

flux get helmreleases -n kube-system
```

Verify the CNI configuration:

```bash
kubectl exec -n kube-system ds/aws-node -- env | grep ENABLE_PREFIX_DELEGATION
```

## Upgrading the VPC CNI

To upgrade, update the version in your HelmRelease and push to Git:

```yaml
spec:
  chart:
    spec:
      version: "1.17.*"
```

Flux will roll out the upgrade as a DaemonSet update across all nodes. Monitor the rollout:

```bash
kubectl rollout status ds/aws-node -n kube-system
```

## Troubleshooting

If pods are stuck in a pending state due to IP exhaustion, check the CNI logs:

```bash
kubectl logs -n kube-system -l k8s-app=aws-node --tail=50

kubectl get nodes -o custom-columns=NAME:.metadata.name,CAPACITY:.status.capacity.pods,ALLOCATABLE:.status.allocatable.pods
```

Common issues include subnet IP exhaustion, incorrect IAM permissions, or ENI limits being reached on the instance type.

## Conclusion

Managing the AWS VPC CNI through Flux on EKS provides a GitOps-driven approach to your cluster networking layer. You get version control over your CNI configuration, automated upgrades through Flux reconciliation, and the ability to customize features like prefix delegation, custom networking, and security groups for pods. This approach ensures your networking configuration is reproducible and auditable across all your EKS clusters.
