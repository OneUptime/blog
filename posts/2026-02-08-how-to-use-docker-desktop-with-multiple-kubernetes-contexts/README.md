# How to Use Docker Desktop with Multiple Kubernetes Contexts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Desktop, Kubernetes, kubectl, Contexts, DevOps, K8s

Description: Manage multiple Kubernetes clusters from Docker Desktop by switching between contexts for local, staging, and production.

---

Most developers work with more than one Kubernetes cluster. You have the local cluster in Docker Desktop, a staging cluster in the cloud, and a production cluster you need to access for debugging. Each cluster is a separate "context" in your kubeconfig, and switching between them incorrectly can lead to deploying to the wrong environment. Running a production delete command against your staging cluster, or worse, the other way around, is a mistake that only takes once to learn from.

This guide covers managing multiple Kubernetes contexts alongside Docker Desktop's built-in Kubernetes cluster, including safe switching practices and tooling that prevents costly mistakes.

## Understanding Kubernetes Contexts

A Kubernetes context combines three pieces of information: a cluster (API server address), a user (authentication credentials), and a namespace. Your kubeconfig file stores multiple contexts, and `kubectl` uses the current context to determine which cluster receives your commands.

```bash
# View your current kubeconfig with all contexts
kubectl config view

# List all available contexts
kubectl config get-contexts

# Show the currently active context
kubectl config current-context
```

The output shows something like this:

```
CURRENT   NAME                 CLUSTER              AUTHINFO             NAMESPACE
*         docker-desktop       docker-desktop       docker-desktop
          staging-eks          staging-eks          staging-user         default
          production-eks       production-eks       prod-user            default
```

The asterisk marks the active context. Every kubectl command runs against that cluster.

## Enabling Kubernetes in Docker Desktop

Docker Desktop includes a built-in single-node Kubernetes cluster. Enable it through Settings > Kubernetes > "Enable Kubernetes."

After enabling, Docker Desktop downloads the Kubernetes components and starts the cluster. This adds a `docker-desktop` context to your kubeconfig automatically.

```bash
# Verify Docker Desktop's Kubernetes is running
kubectl config use-context docker-desktop
kubectl get nodes

# Check the cluster info
kubectl cluster-info
```

The Docker Desktop Kubernetes cluster runs locally and resets when you disable and re-enable it. This makes it perfect for development and testing.

## Adding Remote Cluster Contexts

Add contexts for your remote clusters. Cloud providers give you commands to configure this.

```bash
# AWS EKS - Add a cluster context
aws eks update-kubeconfig --name my-staging-cluster --region us-east-1 --alias staging-eks

# Google GKE - Add a cluster context
gcloud container clusters get-credentials my-staging-cluster --zone us-central1-a --project my-project

# Azure AKS - Add a cluster context
az aks get-credentials --resource-group mygroup --name my-staging-cluster

# Verify the new context was added
kubectl config get-contexts
```

You can also add contexts manually by editing the kubeconfig.

```yaml
# ~/.kube/config - Manual context configuration
apiVersion: v1
kind: Config
clusters:
  - name: docker-desktop
    cluster:
      server: https://kubernetes.docker.internal:6443
      certificate-authority-data: <base64-cert>
  - name: staging-cluster
    cluster:
      server: https://staging.k8s.example.com
      certificate-authority-data: <base64-cert>
contexts:
  - name: docker-desktop
    context:
      cluster: docker-desktop
      user: docker-desktop
  - name: staging
    context:
      cluster: staging-cluster
      user: staging-user
      namespace: my-team
users:
  - name: docker-desktop
    user:
      client-certificate-data: <base64-cert>
      client-key-data: <base64-key>
  - name: staging-user
    user:
      token: <service-account-token>
current-context: docker-desktop
```

## Switching Between Contexts Safely

The basic way to switch contexts uses `kubectl config use-context`.

```bash
# Switch to your local Docker Desktop cluster
kubectl config use-context docker-desktop

# Switch to staging
kubectl config use-context staging-eks

# Switch to production (be careful)
kubectl config use-context production-eks
```

This changes the current context globally, which affects every terminal window. A safer approach uses the `--context` flag for individual commands.

```bash
# Run a command against a specific context without switching globally
kubectl --context=staging-eks get pods
kubectl --context=docker-desktop get services
kubectl --context=production-eks get deployments

# You can also set the context per-terminal using an environment variable
export KUBECONFIG_CONTEXT=staging-eks
kubectl get pods --context=$KUBECONFIG_CONTEXT
```

## Using kubectx for Faster Switching

Install `kubectx` for a better context-switching experience.

```bash
# Install kubectx and kubens on macOS
brew install kubectx

# List contexts (interactive with fzf if installed)
kubectx

# Switch to docker-desktop context
kubectx docker-desktop

# Switch to the previous context (like cd -)
kubectx -

# Rename a context for easier typing
kubectx staging=staging-eks-us-east-1-my-long-cluster-name
```

`kubens` (included with kubectx) handles namespace switching.

```bash
# List namespaces in the current context
kubens

# Switch to a specific namespace
kubens my-team

# Switch back to the previous namespace
kubens -
```

## Separate Kubeconfig Files

For maximum safety, use separate kubeconfig files for different environments instead of putting everything in one file.

```bash
# Store each cluster's config in a separate file
ls ~/.kube/
# config-docker-desktop
# config-staging
# config-production

# Merge them temporarily using the KUBECONFIG environment variable
export KUBECONFIG=~/.kube/config-docker-desktop:~/.kube/config-staging:~/.kube/config-production

# Now kubectl sees all contexts from all files
kubectl config get-contexts

# For a single terminal, only load specific configs
export KUBECONFIG=~/.kube/config-docker-desktop:~/.kube/config-staging
# Production context is not available in this terminal
```

Add this to your shell profile for automatic loading.

```bash
# Add to ~/.bashrc or ~/.zshrc
export KUBECONFIG=$(find ~/.kube -name 'config-*' -type f | tr '\n' ':')
```

## Visual Context Indicators

Add the current Kubernetes context to your shell prompt so you always know where commands will run.

```bash
# Add to ~/.bashrc or ~/.zshrc - Show current k8s context in prompt
kube_context() {
    local ctx=$(kubectl config current-context 2>/dev/null)
    if [ -n "$ctx" ]; then
        # Color production context red as a warning
        if [[ "$ctx" == *"prod"* ]]; then
            echo -e "\033[31m[$ctx]\033[0m"
        else
            echo "[$ctx]"
        fi
    fi
}
export PS1='$(kube_context) \w $ '
```

For a more polished solution, use kube-ps1.

```bash
# Install kube-ps1
brew install kube-ps1

# Add to your shell profile
source "/opt/homebrew/opt/kube-ps1/share/kube-ps1.sh"
PS1='$(kube_ps1) \w $ '
```

## Context-Specific Docker Desktop Workflow

A practical daily workflow that keeps Docker Desktop as your development cluster while safely accessing remote clusters.

```bash
# Morning: Start with Docker Desktop for local development
kubectx docker-desktop

# Deploy your application locally
kubectl apply -f k8s/development/

# Test locally
kubectl port-forward svc/myapp 8080:80

# Need to check something in staging? Use --context flag
kubectl --context=staging get pods -n my-team

# Deploy to staging after local testing passes
kubectl --context=staging apply -f k8s/staging/

# Check staging logs without switching context
kubectl --context=staging logs -f deployment/myapp -n my-team

# Back to local development (you never left)
kubectl get pods
```

## Preventing Accidental Production Commands

Add safeguards to prevent running dangerous commands against production.

```bash
#!/bin/bash
# safe-kubectl.sh - Wrapper that warns before production commands

CONTEXT=$(kubectl config current-context 2>/dev/null)

# Define dangerous commands
DANGEROUS_CMDS="delete|scale|drain|cordon|taint|edit|patch|replace"

# Check if current context is production and command is dangerous
if [[ "$CONTEXT" == *"prod"* ]] && echo "$@" | grep -qE "$DANGEROUS_CMDS"; then
    echo "WARNING: You are about to run a destructive command on PRODUCTION ($CONTEXT)"
    echo "Command: kubectl $@"
    read -p "Are you sure? Type 'yes-production' to confirm: " confirm
    if [ "$confirm" != "yes-production" ]; then
        echo "Aborted."
        exit 1
    fi
fi

kubectl "$@"
```

```bash
# Create an alias for the safe wrapper
alias k='bash ~/scripts/safe-kubectl.sh'

# This works normally for non-production contexts
k delete pod old-pod

# This prompts for confirmation on production
# WARNING: You are about to run a destructive command on PRODUCTION
```

## Docker Desktop Context in CI/CD

When running CI/CD pipelines, always set the context explicitly rather than relying on defaults.

```yaml
# .github/workflows/deploy.yml - Explicit context in CI
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - name: Configure kubectl
        run: |
          aws eks update-kubeconfig --name staging-cluster --region us-east-1
          kubectl config use-context arn:aws:eks:us-east-1:123456:cluster/staging-cluster

      - name: Verify context before deployment
        run: |
          CURRENT=$(kubectl config current-context)
          if [[ "$CURRENT" != *"staging"* ]]; then
            echo "ERROR: Expected staging context, got $CURRENT"
            exit 1
          fi

      - name: Deploy
        run: kubectl apply -f k8s/staging/
```

Managing multiple Kubernetes contexts well is mostly about building habits and safety nets. Use Docker Desktop for local development, use `--context` flags for one-off commands against remote clusters, and add visual indicators and safeguards for production. These small practices prevent the kinds of mistakes that keep engineers up at night.
