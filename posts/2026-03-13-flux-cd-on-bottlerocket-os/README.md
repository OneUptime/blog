# How to Set Up Flux CD on Bottlerocket OS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Bottlerocket, AWS, Immutable OS, EKS

Description: Configure Flux CD on AWS Bottlerocket OS for security-hardened, immutable Kubernetes nodes with GitOps-managed workloads on EKS or self-managed clusters.

---

## Introduction

Bottlerocket is Amazon's purpose-built, open-source Linux operating system for running containers. Like Flatcar Container Linux, Bottlerocket is immutable - its root filesystem is read-only, and changes are made through a strictly defined API rather than shell access. It has a minimal footprint, automatic atomic updates, and built-in SELinux enforcement, making it one of the most security-hardened node operating systems available for Kubernetes.

On AWS EKS, Bottlerocket AMIs are available as a first-class node group option. On self-managed clusters, Bottlerocket can be bootstrapped with kubeadm. In either case, Flux CD manages the workloads running on top of these hardened nodes, creating a fully GitOps-managed stack on security-optimized infrastructure.

This guide covers deploying EKS node groups with Bottlerocket AMIs, configuring cluster access, and bootstrapping Flux CD.

## Prerequisites

- AWS account with EKS cluster already created (or plan to create one)
- `eksctl`, `kubectl`, and `flux` CLI on your workstation
- IAM permissions for EKS node group management
- A Git repository for Flux CD bootstrap

## Step 1: Create an EKS Node Group with Bottlerocket AMI

Using `eksctl`:

```yaml
# bottlerocket-nodegroup.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: my-eks-cluster
  region: us-east-1

managedNodeGroups:
  - name: bottlerocket-nodes
    # Use the Bottlerocket AMI family
    amiFamily: Bottlerocket
    instanceType: m5.large
    desiredCapacity: 3
    minSize: 2
    maxSize: 5
    # Bottlerocket-specific settings
    bottlerocket:
      enableAdminContainer: false  # Disable for production security
      settings:
        kubernetes:
          # Node labels for Flux scheduling decisions
          node-labels:
            os-type: bottlerocket
            security-profile: hardened
    volumeSize: 50
    # Enable SSM for emergency access (replaces SSH on Bottlerocket)
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
```

```bash
eksctl create nodegroup -f bottlerocket-nodegroup.yaml
```

## Step 2: Configure kubectl Access

```bash
# Update kubeconfig for the EKS cluster
aws eks update-kubeconfig \
  --region us-east-1 \
  --name my-eks-cluster

# Verify Bottlerocket nodes are ready
kubectl get nodes -l os-type=bottlerocket
# Expected:
# NAME                       STATUS   ROLES    AGE
# ip-10-0-1-100.ec2.internal Ready    <none>   5m
# ip-10-0-1-101.ec2.internal Ready    <none>   4m
# ip-10-0-1-102.ec2.internal Ready    <none>   3m

# Check Bottlerocket OS version
kubectl get nodes -l os-type=bottlerocket \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.osImage}{"\n"}{end}'
```

## Step 3: Bootstrap Flux CD on EKS with Bottlerocket Nodes

```bash
export GITHUB_TOKEN=ghp_your_github_token

flux bootstrap github \
  --owner=my-org \
  --repository=bottlerocket-fleet \
  --branch=main \
  --path=clusters/eks-bottlerocket \
  --personal

# Flux controllers will schedule on Bottlerocket worker nodes
kubectl get pods -n flux-system -o wide
```

## Step 4: Configure Bottlerocket Settings via SSM (API-based management)

Bottlerocket is configured through its API - not through shell commands. Use AWS SSM for emergency access and `apiclient` for configuration:

```bash
# Access a Bottlerocket node via SSM (not SSH)
aws ssm start-session \
  --target i-0123456789abcdef0 \
  --region us-east-1

# Inside the SSM session (limited shell):
# Check Bottlerocket settings
apiclient get settings

# Configure kernel parameters
apiclient set kernel.sysctl.net.ipv4.tcp_max_syn_backlog=65536
```

## Step 5: Manage Bottlerocket Updates via Flux

Deploy the Bottlerocket Update Operator (BRUPOP) to manage OS updates through Kubernetes:

```yaml
# clusters/eks-bottlerocket/system/brupop-helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bottlerocket
  namespace: flux-system
spec:
  url: https://bottlerocket-os.github.io/bottlerocket-update-operator/charts
  interval: 10m
```

```yaml
# clusters/eks-bottlerocket/system/brupop-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: bottlerocket-update-operator
  namespace: flux-system
spec:
  interval: 15m
  targetNamespace: brupop-bottlerocket-aws
  chart:
    spec:
      chart: bottlerocket-update-operator
      version: "1.x.x"
      sourceRef:
        kind: HelmRepository
        name: bottlerocket
        namespace: flux-system
  values:
    # Schedule updates during maintenance windows
    scheduler:
      maxUnavailablePercentage: 33
```

## Step 6: Enforce Workload Security on Bottlerocket Nodes

Bottlerocket's SELinux enforcement and read-only filesystem affect some workloads. Use Flux to manage pod security policies:

```yaml
# clusters/eks-bottlerocket/apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    spec:
      # Enforce non-root and read-only filesystem for Bottlerocket compatibility
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
        fsGroup: 65534
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: myapp
          image: myapp:latest
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            # Use emptyDir for writable temp space
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
```

## Best Practices

- Disable the Bottlerocket admin container (`enableAdminContainer: false`) in production; use AWS SSM Session Manager for emergency access instead.
- Deploy the Bottlerocket Update Operator (BRUPOP) via Flux to manage OS updates with Kubernetes-aware drain and cordon behavior.
- Use Bottlerocket node labels (e.g., `os-type: bottlerocket`) with node affinity rules to ensure security-sensitive workloads run specifically on hardened Bottlerocket nodes.
- All containers running on Bottlerocket benefit from SELinux enforcement; ensure your container images do not require SELinux disabled.
- Use `readOnlyRootFilesystem: true` and `allowPrivilegeEscalation: false` on all containers - Bottlerocket's hardened baseline makes these security settings easier to enforce.

## Conclusion

Bottlerocket OS provides an AWS-optimized, security-hardened foundation for EKS workloads that aligns naturally with Flux CD's GitOps model. The immutable OS eliminates configuration drift at the node level, while Flux eliminates configuration drift at the application level. Together, they create a cluster where both the infrastructure and the workloads are managed declaratively, updated automatically, and audited continuously.
