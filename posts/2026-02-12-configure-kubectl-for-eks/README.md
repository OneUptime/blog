# How to Configure kubectl for EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, kubectl

Description: A complete guide to configuring kubectl for Amazon EKS clusters, including authentication, context management, and troubleshooting common connection issues.

---

kubectl is the command-line tool you'll use every day to interact with your EKS clusters. But getting it configured properly - especially when you're juggling multiple clusters across different AWS accounts - can be trickier than it sounds. This guide covers everything from the initial setup to advanced multi-cluster management.

## Prerequisites

You'll need these tools installed before we start:

- AWS CLI v2 configured with valid credentials
- kubectl (version should match your cluster's Kubernetes version, plus or minus one minor version)
- An existing EKS cluster (if you need to create one, see our [eksctl guide](https://oneuptime.com/blog/post/2026-02-12-create-eks-cluster-with-eksctl/view))

## Installing kubectl

If you haven't installed kubectl yet, here's the quickest way on each platform.

For macOS:

```bash
# Install kubectl on macOS via Homebrew
brew install kubectl
```

For Linux:

```bash
# Download the latest kubectl binary for Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

Verify the version:

```bash
# Check kubectl version
kubectl version --client
```

## Updating Your Kubeconfig

The primary way to configure kubectl for EKS is through the AWS CLI's update-kubeconfig command. This writes the necessary connection details and authentication configuration to your kubeconfig file.

```bash
# Add EKS cluster configuration to kubeconfig
aws eks update-kubeconfig --name my-cluster --region us-west-2
```

This does three things: it adds the cluster's API server endpoint, sets up the certificate authority data, and configures authentication using the aws eks get-token command. The configuration gets written to `~/.kube/config` by default.

You can specify a different kubeconfig file if you prefer:

```bash
# Write cluster config to a custom kubeconfig file
aws eks update-kubeconfig --name my-cluster --region us-west-2 --kubeconfig ~/.kube/eks-config
```

## Understanding the Kubeconfig File

Let's look at what the generated kubeconfig actually contains. Understanding this helps when things go wrong.

```yaml
# Example kubeconfig structure for EKS
apiVersion: v1
kind: Config
clusters:
  - cluster:
      server: https://ABCDEF1234567890.gr7.us-west-2.eks.amazonaws.com
      certificate-authority-data: LS0tLS1CRUdJTi...
    name: arn:aws:eks:us-west-2:123456789012:cluster/my-cluster

contexts:
  - context:
      cluster: arn:aws:eks:us-west-2:123456789012:cluster/my-cluster
      user: arn:aws:eks:us-west-2:123456789012:cluster/my-cluster
    name: arn:aws:eks:us-west-2:123456789012:cluster/my-cluster

current-context: arn:aws:eks:us-west-2:123456789012:cluster/my-cluster

users:
  - name: arn:aws:eks:us-west-2:123456789012:cluster/my-cluster
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1beta1
        command: aws
        args:
          - eks
          - get-token
          - --cluster-name
          - my-cluster
          - --region
          - us-west-2
```

The key piece is the `exec` section under `users`. Every time kubectl needs to authenticate, it runs `aws eks get-token` to get a temporary bearer token. This token is tied to your current AWS credentials.

## Managing Multiple Clusters

When you're working with multiple EKS clusters, context management becomes essential. Each cluster gets its own context, and you switch between them to target different clusters.

List all available contexts:

```bash
# List all configured kubectl contexts
kubectl config get-contexts
```

Switch to a different context:

```bash
# Switch to a specific cluster context
kubectl config use-context arn:aws:eks:us-west-2:123456789012:cluster/staging-cluster
```

The context names that EKS generates are long ARNs, which isn't great for daily use. You can create shorter aliases:

```bash
# Set a friendly alias for a cluster context
kubectl config rename-context \
  arn:aws:eks:us-west-2:123456789012:cluster/my-cluster \
  production

# Now you can switch contexts with the alias
kubectl config use-context production
```

## Using AWS Profiles

If you manage clusters across different AWS accounts, you'll want to use named profiles. You can tell the kubeconfig to use a specific AWS profile for authentication.

```bash
# Configure kubectl to use a specific AWS profile for a cluster
aws eks update-kubeconfig \
  --name production-cluster \
  --region us-west-2 \
  --profile production-account
```

This adds the `--profile` flag to the exec command in your kubeconfig. You can also set it manually by editing the kubeconfig:

```yaml
# Kubeconfig user section with AWS profile specified
users:
  - name: production-cluster
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1beta1
        command: aws
        args:
          - eks
          - get-token
          - --cluster-name
          - production-cluster
          - --region
          - us-west-2
        env:
          - name: AWS_PROFILE
            value: production-account
```

## Using IAM Roles for Access

For cross-account access or role-based access patterns, you can configure kubectl to assume a specific IAM role:

```bash
# Configure kubectl with an assumed IAM role
aws eks update-kubeconfig \
  --name my-cluster \
  --region us-west-2 \
  --role-arn arn:aws:iam::123456789012:role/EKSClusterAdmin
```

This is particularly useful in organizations where different teams manage different clusters and access is controlled through IAM roles. For more on this topic, see our post on [cross-account EKS access](https://oneuptime.com/blog/post/2026-02-12-set-up-cross-account-eks-cluster-access/view).

## Verifying Connectivity

After configuration, verify that kubectl can reach your cluster:

```bash
# Verify cluster connectivity and authentication
kubectl cluster-info

# Check that you can list nodes
kubectl get nodes

# Verify your identity within the cluster
kubectl auth whoami
```

If `kubectl cluster-info` works but `kubectl get nodes` fails with an authorization error, it means authentication is working but your IAM entity isn't mapped in the cluster's aws-auth ConfigMap. You'll need to add the appropriate mapping.

## Troubleshooting Common Issues

**"Unable to connect to the server"** - This usually means your network can't reach the cluster's API endpoint. If it's a private cluster, you'll need VPN or Direct Connect access. Check your [cluster endpoint configuration](https://oneuptime.com/blog/post/2026-02-12-configure-eks-control-plane-endpoint-access/view).

**"You must be logged in to the server (Unauthorized)"** - Your AWS credentials are either expired, invalid, or the IAM entity isn't mapped in the cluster. Run `aws sts get-caller-identity` to verify your current identity, then check the aws-auth ConfigMap.

```bash
# Check the aws-auth ConfigMap for IAM mappings
kubectl describe configmap aws-auth -n kube-system
```

**Token expiration issues** - EKS tokens are valid for 15 minutes. kubectl handles token refresh automatically through the exec plugin, but if you're caching tokens externally, you'll run into expiration problems.

**Wrong cluster** - Double-check your current context:

```bash
# See which cluster you're currently targeting
kubectl config current-context
```

## Using kubectx and kubens

If you find yourself switching contexts and namespaces frequently, install kubectx and kubens. They make the process much faster.

```bash
# Install kubectx and kubens on macOS
brew install kubectx

# Switch context interactively
kubectx

# Switch namespace quickly
kubens my-namespace
```

## Best Practices

Keep your kubeconfig organized. Separate config files for different environments can prevent accidentally running commands against production. Use the KUBECONFIG environment variable to merge multiple files:

```bash
# Use multiple kubeconfig files
export KUBECONFIG=~/.kube/config:~/.kube/staging-config:~/.kube/production-config

# View the merged configuration
kubectl config view
```

Always use named profiles and role assumptions rather than hard-coding credentials. And consider using short-lived credentials through AWS SSO (Identity Center) for better security.

kubectl is the gateway to your EKS clusters. Getting the configuration right saves you time and prevents the kind of mistakes that come from accidentally running commands against the wrong cluster.
