# How to Set Up Flux CD on EKS Distro (EKS-D)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Eks distro, Eks-d, Kubernetes, GitOps, AWS, Continuous Delivery, Self-Managed

Description: A step-by-step guide to deploying Flux CD on Amazon EKS Distro for GitOps-driven application delivery on self-managed AWS-compatible Kubernetes clusters.

---

## Introduction

Amazon EKS Distro (EKS-D) is the same Kubernetes distribution that powers Amazon EKS, but available for self-managed deployments anywhere. It includes the same versions of Kubernetes, etcd, CoreDNS, and other components that Amazon tests and validates for EKS. Running EKS-D gives you the same Kubernetes build that runs on EKS, but on your own infrastructure.

Pairing EKS-D with Flux CD gives you a GitOps-managed Kubernetes platform that uses the same components as EKS, whether you run it on-premises, in your own AWS account, or on any other infrastructure.

## Prerequisites

Before you begin, ensure you have:

- A Linux machine with at least 4 CPU cores and 8 GB RAM
- Docker or containerd installed
- `kubectl` and `flux` CLI installed
- A GitHub account with a personal access token
- Familiarity with Kubernetes administration

## Understanding EKS-D Deployment Options

EKS-D can be deployed using several tools:

- **kOps** - For cloud-based deployments (AWS recommended)
- **kubeadm** - For bare metal or VM-based deployments
- **EKS Anywhere** - For on-premises deployments with EKS-D
- **Kind/Minikube** - For local development

This guide covers deploying EKS-D with the official EKS-D kOps scripts on AWS.

## Installing Required Tools

```bash
# Install Flux CLI

curl -s https://fluxcd.io/install.sh | sudo bash

# Install kOps
curl -Lo kops https://github.com/kubernetes/kops/releases/latest/download/kops-linux-amd64
chmod +x kops
sudo mv kops /usr/local/bin/kops

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installations
flux --version
kops version
aws --version
```

## Setting Up AWS Prerequisites

Configure AWS resources for kOps:

```bash
# Configure AWS credentials
aws configure

# Create an S3 bucket for kOps state store
aws s3 mb s3://flux-eksd-kops-state --region us-east-1

# Create an IAM user for kOps (if not already done)
aws iam create-group --group-name kops
aws iam attach-group-policy --group-name kops --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess
aws iam attach-group-policy --group-name kops --policy-arn arn:aws:iam::aws:policy/AmazonRoute53FullAccess
aws iam attach-group-policy --group-name kops --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-group-policy --group-name kops --policy-arn arn:aws:iam::aws:policy/IAMFullAccess
aws iam attach-group-policy --group-name kops --policy-arn arn:aws:iam::aws:policy/AmazonVPCFullAccess
aws iam attach-group-policy --group-name kops --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
aws iam attach-group-policy --group-name kops --policy-arn arn:aws:iam::aws:policy/AmazonEventBridgeFullAccess

# Set environment variables
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=$AWS_REGION
export KOPS_STATE_STORE=s3://flux-eksd-kops-state
export KOPS_CLUSTER_NAME=flux-eksd.k8s.local
export NAME=$KOPS_CLUSTER_NAME
```

## Creating an EKS-D Cluster with kOps

Create the cluster configuration with the EKS-D kOps scripts:

```bash
git clone https://github.com/aws/eks-distro.git
cd eks-distro/development/kops

# Pin the EKS-D release channel and release
export RELEASE_BRANCH=1-30
export RELEASE=12
export NODE_INSTANCE_TYPE=t3.large

# Install script requirements and generate the kOps configuration
./install_requirements.sh
./create_values_yaml.sh
./create_configuration.sh
```

Review the generated values as needed:

```yaml
# ./${KOPS_CLUSTER_NAME}/values.yaml (key sections)
kubernetesVersion: https://distro.eks.amazonaws.com/kubernetes-1-30/releases/12/artifacts/kubernetes/v1.30.3
clusterName: flux-eksd.k8s.local
configBase: s3://flux-eksd-kops-state/flux-eksd.k8s.local
awsRegion: us-east-1
instanceType: t3.large
architecture: amd64
pause:
  repository: public.ecr.aws/eks-distro/kubernetes/pause
  tag: v1.30.3-eks-1-30-12
```

Apply the cluster configuration:

```bash
# Create the cluster
./create_cluster.sh

# Wait for the cluster to be ready (this takes several minutes)
./cluster_wait.sh
```

## Configuring kubectl Access

```bash
# kOps automatically configures kubectl context
# Verify access
kubectl get nodes
kubectl cluster-info

# Export the kubeconfig for use with Flux
kops export kubeconfig --name $KOPS_CLUSTER_NAME --admin
export KUBECONFIG=~/.kube/config
```

## Running Flux Pre-flight Checks

```bash
# Verify EKS-D cluster compatibility
flux check --pre
```

EKS-D provides the same APIs as EKS, so Flux pre-flight checks should pass without issues.

## Bootstrapping Flux CD

```bash
# Set GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=eksd-gitops \
  --branch=main \
  --path=./clusters/eksd \
  --personal \
  --read-write-key \
  --components-extra=image-reflector-controller,image-automation-controller
```

## Verifying the Installation

```bash
# Verify Flux health
flux check

# List Flux pods
kubectl get pods -n flux-system

# Check Git source status
flux get sources git

# Verify all controllers
flux get all
```

## Setting Up the Repository Structure

```bash
# Clone the repository
git clone https://github.com/$GITHUB_USER/eksd-gitops.git
cd eksd-gitops

# Create directory structure
mkdir -p clusters/eksd/infrastructure
mkdir -p clusters/eksd/apps
mkdir -p infrastructure/aws
mkdir -p infrastructure/sources
mkdir -p infrastructure/controllers
mkdir -p apps/base
mkdir -p apps/production
```

## Deploying AWS-Specific Infrastructure

Since EKS-D uses the same Kubernetes APIs as EKS, you can use the same AWS integrations when the cluster runs on AWS and the controller IAM permissions are configured:

```yaml
# infrastructure/sources/aws.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: aws-ebs-csi
  namespace: flux-system
spec:
  interval: 24h
  url: https://kubernetes-sigs.github.io/aws-ebs-csi-driver
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: aws-load-balancer
  namespace: flux-system
spec:
  interval: 24h
  url: https://aws.github.io/eks-charts
```

```yaml
# infrastructure/aws/ebs-csi.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: aws-ebs-csi-driver
  namespace: flux-system
spec:
  interval: 15m
  chart:
    spec:
      chart: aws-ebs-csi-driver
      version: ">=2.25.0"
      sourceRef:
        kind: HelmRepository
        name: aws-ebs-csi
        namespace: flux-system
  targetNamespace: kube-system
  values:
    controller:
      serviceAccount:
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AmazonEKS_EBS_CSI_DriverRole
      resources:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi
    storageClasses:
      - name: gp3
        annotations:
          storageclass.kubernetes.io/is-default-class: "true"
        parameters:
          type: gp3
          encrypted: "true"
        reclaimPolicy: Delete
        volumeBindingMode: WaitForFirstConsumer
```

```yaml
# infrastructure/aws/load-balancer-controller.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: aws-load-balancer-controller
  namespace: flux-system
spec:
  interval: 15m
  chart:
    spec:
      chart: aws-load-balancer-controller
      version: ">=1.6.0"
      sourceRef:
        kind: HelmRepository
        name: aws-load-balancer
        namespace: flux-system
  targetNamespace: kube-system
  values:
    clusterName: flux-eksd.k8s.local
    # Service account with IAM role
    serviceAccount:
      create: true
      name: aws-load-balancer-controller
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AWSLoadBalancerControllerIAMRole
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

Wire the infrastructure together:

```yaml
# clusters/eksd/infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../infrastructure/sources/aws.yaml
  - ../../../infrastructure/aws/ebs-csi.yaml
  - ../../../infrastructure/aws/load-balancer-controller.yaml
```

```yaml
# clusters/eksd/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/eksd/infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

## Deploying Applications

Create an application deployment:

```yaml
# apps/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo
  labels:
    managed-by: flux
```

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eksd-app
  namespace: demo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: eksd-app
  template:
    metadata:
      labels:
        app: eksd-app
    spec:
      containers:
        - name: app
          image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/eksd-app:1.0.0 # {"$imagepolicy": "flux-system:eksd-app"}
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 3
            periodSeconds: 5
```

```yaml
# apps/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: eksd-app
  namespace: demo
  annotations:
    # Use AWS Load Balancer Controller
    service.beta.kubernetes.io/aws-load-balancer-type: external
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: instance
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
spec:
  selector:
    app: eksd-app
  ports:
    - port: 80
      targetPort: 80
  type: LoadBalancer
```

```yaml
# apps/base/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: eksd-app
  namespace: demo
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: eksd-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

```yaml
# apps/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - hpa.yaml
```

```yaml
# clusters/eksd/apps/demo-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: demo-app
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: infrastructure
  path: ./apps/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: eksd-app
      namespace: demo
  timeout: 3m
```

## Using ECR with Flux Image Automation

Set up automated image updates from Amazon ECR:

```yaml
# clusters/eksd/apps/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: eksd-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/eksd-app
  interval: 5m
  provider: aws
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: eksd-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: eksd-app
  policy:
    semver:
      range: ">=1.0.0 <2.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: eksd-app-automation
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-automation
        email: flux@example.com
      messageTemplate: "chore: update eksd-app image"
    push:
      branch: main
  update:
    path: ./apps/base
```

## Monitoring with CloudWatch Integration

Deploy monitoring that integrates with AWS CloudWatch:

```yaml
# infrastructure/aws/cloudwatch-agent.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: aws-cloudwatch
  namespace: flux-system
spec:
  interval: 24h
  url: https://aws.github.io/eks-charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: aws-cloudwatch-metrics
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: aws-cloudwatch-metrics
      sourceRef:
        kind: HelmRepository
        name: aws-cloudwatch
        namespace: flux-system
  targetNamespace: amazon-cloudwatch
  install:
    createNamespace: true
  values:
    clusterName: flux-eksd.k8s.local
```

## Troubleshooting

Common debugging steps for Flux on EKS-D:

```bash
# Check Flux controller logs
kubectl logs -n flux-system deploy/source-controller
kubectl logs -n flux-system deploy/kustomize-controller
kubectl logs -n flux-system deploy/helm-controller

# Force reconciliation
flux reconcile kustomization flux-system --with-source

# Check kOps cluster health
kops validate cluster --name $KOPS_CLUSTER_NAME

# Verify AWS IAM permissions
aws sts get-caller-identity

# Check EKS-D component versions
kubectl get nodes -o jsonpath='{.items[0].status.nodeInfo.kubeletVersion}'

# View Flux events
flux events

# Debug image automation
flux get images repository
flux get images policy
```

## Conclusion

You now have Flux CD running on an EKS Distro cluster managed by kOps. This setup gives you the same Kubernetes components that power Amazon EKS, with the flexibility to run anywhere and the automation of GitOps through Flux CD. Your applications, infrastructure components, and even image update policies are all managed through Git, providing a complete audit trail and consistent deployment process across your self-managed EKS-D clusters.
