# How to Create an EKS Cluster with eksctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, eksctl, DevOps

Description: Learn how to create and configure an Amazon EKS cluster using eksctl, the official CLI tool for provisioning Kubernetes clusters on AWS.

---

If you've ever tried creating an EKS cluster through the AWS Console or raw CloudFormation templates, you know it's not exactly a walk in the park. There are VPCs to configure, IAM roles to set up, node groups to provision, and about a dozen things that can go wrong along the way. That's where eksctl comes in - it's the official CLI tool from Weaveworks and AWS that turns a complex multi-step process into a single command.

In this guide, I'll walk you through everything from installing eksctl to creating production-ready EKS clusters with custom configurations.

## Prerequisites

Before we start, you'll need a few things installed:

- An AWS account with appropriate permissions
- AWS CLI configured with valid credentials
- kubectl installed for interacting with your cluster later

## Installing eksctl

The installation process differs depending on your operating system. Here's how to get eksctl on the most common platforms.

On macOS, you can install it through Homebrew:

```bash
# Install eksctl using Homebrew on macOS
brew tap weaveworks/tap
brew install weaveworks/tap/eksctl
```

On Linux, download the binary directly:

```bash
# Download and install eksctl on Linux
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
```

Verify the installation worked:

```bash
# Check that eksctl is properly installed
eksctl version
```

## Creating Your First Cluster

The simplest way to spin up an EKS cluster is with a single command. This creates a cluster with default settings - two m5.large nodes in us-west-2.

```bash
# Create a basic EKS cluster with default settings
eksctl create cluster --name my-cluster --region us-west-2
```

This command does a surprising amount of work behind the scenes. It creates a VPC with public and private subnets, sets up an internet gateway, configures route tables, creates the EKS control plane, provisions worker nodes, and configures kubectl to connect to your new cluster. The whole process takes about 15-20 minutes.

## Using a Configuration File

For anything beyond a quick test, you'll want to use a configuration file. It gives you much more control and makes your cluster reproducible.

Here's a configuration file that creates a production-ready cluster:

```yaml
# cluster-config.yaml - Production EKS cluster configuration
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: production-cluster
  region: us-west-2
  version: "1.29"

vpc:
  cidr: "10.0.0.0/16"
  nat:
    gateway: HighlyAvailable  # One NAT gateway per AZ

managedNodeGroups:
  - name: general-workload
    instanceType: m5.xlarge
    minSize: 2
    maxSize: 10
    desiredCapacity: 3
    volumeSize: 100
    volumeType: gp3
    labels:
      workload-type: general
    tags:
      Environment: production
    iam:
      withAddonPolicies:
        autoScaler: true
        cloudWatch: true
        ebs: true

  - name: compute-intensive
    instanceType: c5.2xlarge
    minSize: 0
    maxSize: 5
    desiredCapacity: 0
    labels:
      workload-type: compute
    taints:
      - key: workload-type
        value: compute
        effect: NoSchedule
```

Apply this configuration to create the cluster:

```bash
# Create the cluster using the configuration file
eksctl create cluster -f cluster-config.yaml
```

## Understanding Node Groups

EKS supports two types of node groups, and it's important to understand when to use each one.

**Managed Node Groups** are the recommended option for most workloads. AWS handles the provisioning, updating, and termination of nodes. You get automatic AMI updates and simplified version upgrades.

**Self-managed Node Groups** give you full control over the EC2 instances. They're useful when you need custom AMIs or specific instance configurations that managed node groups don't support.

Here's how you'd add a self-managed node group to your config:

```yaml
# Self-managed node group for custom requirements
nodeGroups:
  - name: custom-nodes
    instanceType: m5.large
    desiredCapacity: 3
    ami: ami-0123456789abcdef0  # Your custom AMI
    overrideBootstrapCommand: |
      #!/bin/bash
      /etc/eks/bootstrap.sh production-cluster \
        --kubelet-extra-args '--node-labels=custom=true'
```

## Enabling Add-ons

eksctl can also install essential Kubernetes add-ons during cluster creation. Add these to your configuration file:

```yaml
# Add-ons section in your cluster config
addons:
  - name: vpc-cni
    version: latest
    configurationValues: |-
      enableNetworkPolicy: "true"
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
  - name: aws-ebs-csi-driver
    version: latest
    wellKnownPolicies:
      ebsCSIController: true
```

## Configuring IAM and Security

Security should never be an afterthought. eksctl makes it straightforward to set up IAM roles for service accounts (IRSA), which is the recommended way to grant AWS permissions to your pods.

```yaml
# IAM configuration with OIDC provider for IRSA
iam:
  withOIDC: true
  serviceAccounts:
    - metadata:
        name: s3-reader
        namespace: default
      attachPolicyARNs:
        - "arn:aws:iam::policy/AmazonS3ReadOnlyAccess"
    - metadata:
        name: cluster-autoscaler
        namespace: kube-system
      wellKnownPolicies:
        autoScaler: true
```

For more details on setting up IRSA, check out our guide on [IAM Roles for EKS Service Accounts](https://oneuptime.com/blog/post/set-up-iam-roles-for-eks-service-accounts-irsa/view).

## Verifying Your Cluster

Once the cluster is created, verify everything's working:

```bash
# Check that kubectl is configured and can reach the cluster
kubectl get nodes

# Verify the cluster info
eksctl get cluster --name production-cluster --region us-west-2

# Check that all system pods are running
kubectl get pods -n kube-system
```

You should see your nodes in a Ready state and all kube-system pods running without issues.

## Common Configuration Options

There are several other useful options you might want in your configuration.

To enable CloudWatch logging for the control plane:

```yaml
# Enable control plane logging
cloudWatch:
  clusterLogging:
    enableTypes:
      - api
      - audit
      - authenticator
      - controllerManager
      - scheduler
```

To restrict API server access to specific CIDR ranges:

```yaml
# Restrict API server endpoint access
vpc:
  clusterEndpoints:
    publicAccess: true
    privateAccess: true
  publicAccessCIDRs:
    - "203.0.113.0/24"  # Your office IP range
```

## Cleaning Up

When you're done testing, don't forget to delete the cluster. EKS isn't cheap, and leaving it running will rack up charges quickly.

```bash
# Delete the cluster and all associated resources
eksctl delete cluster --name production-cluster --region us-west-2
```

This tears down everything - the nodes, the control plane, the VPC, all of it. Just make sure you've backed up anything important first.

## What's Next

Creating the cluster is really just the beginning. You'll want to set up [kubectl access](https://oneuptime.com/blog/post/configure-kubectl-for-eks/view), configure the [Cluster Autoscaler](https://oneuptime.com/blog/post/configure-eks-cluster-autoscaler/view), and set up proper [monitoring with Prometheus and Grafana](https://oneuptime.com/blog/post/set-up-prometheus-and-grafana-on-eks/view).

eksctl is genuinely one of the best tools in the EKS ecosystem. It takes what used to be a painful, error-prone process and makes it repeatable and version-controllable. Once you've got your cluster config file dialed in, spinning up identical environments becomes trivial.
