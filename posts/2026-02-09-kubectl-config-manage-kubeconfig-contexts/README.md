# How to Use kubectl config Commands to Manage Multiple Kubeconfig Contexts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Configuration Management

Description: Master kubectl config commands to manage multiple clusters, contexts, and namespaces efficiently, enabling seamless switching between development, staging, and production environments.

---

Managing multiple Kubernetes clusters means juggling contexts, credentials, and namespaces. kubectl config commands organize this complexity, letting you switch between environments without editing configuration files or setting environment variables constantly.

## Understanding Kubeconfig Structure

Kubeconfig files contain three components:

```bash
# View current config
kubectl config view

# Components:
# - clusters: API server URLs and certificates
# - users: Authentication credentials
# - contexts: Cluster + user + namespace combinations
```

Contexts bind clusters to users and optional default namespaces.

## Listing Contexts

See all available contexts:

```bash
# List all contexts
kubectl config get-contexts

# Show current context (marked with *)
kubectl config current-context

# List contexts with full details
kubectl config get-contexts -o name

# Show contexts from specific config file
kubectl config get-contexts --kubeconfig=~/.kube/custom-config
```

This reveals all configured cluster connections.

## Switching Contexts

Change the active cluster:

```bash
# Switch to a context
kubectl config use-context production

# Switch to development
kubectl config use-context development

# Switch to staging
kubectl config use-context staging

# Verify switch
kubectl config current-context
```

Switching contexts changes which cluster kubectl commands target.

## Creating Contexts

Define new contexts:

```bash
# Create context manually
kubectl config set-context dev-context \
  --cluster=development-cluster \
  --user=dev-user \
  --namespace=default

# Create context with specific namespace
kubectl config set-context prod-backend \
  --cluster=production-cluster \
  --user=prod-user \
  --namespace=backend

# Create from existing context
kubectl config set-context staging-copy \
  --cluster=staging-cluster \
  --user=staging-user
```

Contexts combine cluster access with user credentials.

## Setting Default Namespaces

Contexts can include default namespaces:

```bash
# Set namespace for context
kubectl config set-context production \
  --namespace=production-app

# Set namespace for current context
kubectl config set-context --current --namespace=backend

# Create context with namespace
kubectl config set-context dev-frontend \
  --cluster=dev-cluster \
  --user=dev-user \
  --namespace=frontend
```

Default namespaces eliminate repetitive `-n namespace` flags.

## Managing Clusters

Add and modify cluster entries:

```bash
# Add cluster
kubectl config set-cluster production-cluster \
  --server=https://prod-api.example.com:6443 \
  --certificate-authority=/path/to/ca.crt

# Add cluster with embedded certificate
kubectl config set-cluster staging-cluster \
  --server=https://staging-api.example.com:6443 \
  --certificate-authority-data=$(cat ca.crt | base64)

# Skip TLS verification (not recommended for production)
kubectl config set-cluster test-cluster \
  --server=https://test-api.example.com:6443 \
  --insecure-skip-tls-verify=true

# List clusters
kubectl config get-clusters
```

Cluster entries specify API server locations and certificates.

## Managing Users

Configure user credentials:

```bash
# Set user with certificate
kubectl config set-credentials prod-user \
  --client-certificate=/path/to/client.crt \
  --client-key=/path/to/client.key

# Set user with token
kubectl config set-credentials dev-user \
  --token=eyJhbGc...

# Set user with embedded certificate
kubectl config set-credentials staging-user \
  --client-certificate-data=$(cat client.crt | base64) \
  --client-key-data=$(cat client.key | base64)

# Set user with username/password (deprecated)
kubectl config set-credentials basic-user \
  --username=admin \
  --password=secret123
```

User entries contain authentication credentials.

## Viewing Configuration

Inspect kubeconfig contents:

```bash
# View entire config
kubectl config view

# View without sensitive data
kubectl config view

# View specific context
kubectl config view --context=production

# View as YAML
kubectl config view --raw

# View minified (current context only)
kubectl config view --minify

# View from specific file
kubectl config view --kubeconfig=~/.kube/other-config
```

This reveals configuration details for debugging.

## Deleting Configuration

Remove contexts, clusters, and users:

```bash
# Delete context
kubectl config delete-context old-dev

# Delete cluster
kubectl config delete-cluster old-cluster

# Delete user
kubectl config delete-user old-user

# Verify deletion
kubectl config get-contexts
```

Clean up unused configurations to reduce clutter.

## Renaming Contexts

Change context names for clarity:

```bash
# Rename context
kubectl config rename-context old-name new-name

# Rename to descriptive name
kubectl config rename-context gke_project_zone_cluster production-gke

# Rename for consistency
kubectl config rename-context context-1 dev-cluster-1
```

Descriptive names improve context selection clarity.

## Working with Multiple Config Files

Kubernetes merges multiple config files:

```bash
# Set KUBECONFIG to multiple files
export KUBECONFIG=~/.kube/config:~/.kube/dev-config:~/.kube/prod-config

# View merged configuration
kubectl config view

# Contexts from all files are available
kubectl config get-contexts

# Switch between contexts from different files
kubectl config use-context context-from-dev-config
```

Multiple files organize credentials by environment or team.

## Creating Isolated Config Files

Separate credentials for security:

```bash
# Create new config file
export KUBECONFIG=~/.kube/isolated-config

# Add cluster to isolated config
kubectl config set-cluster isolated-cluster \
  --server=https://isolated-api.example.com:6443

# Add user
kubectl config set-credentials isolated-user \
  --token=eyJhbGc...

# Create context
kubectl config set-context isolated \
  --cluster=isolated-cluster \
  --user=isolated-user

# Use isolated config
kubectl config use-context isolated
kubectl get nodes
```

Isolated configs prevent accidental cross-cluster operations.

## Setting Current Context Namespace

Quickly change namespace without switching contexts:

```bash
# Set namespace for current context
kubectl config set-context --current --namespace=production

# Verify change
kubectl config view --minify | grep namespace

# All subsequent commands use this namespace
kubectl get pods  # Lists pods in production namespace

# Switch namespace again
kubectl config set-context --current --namespace=staging
```

This avoids creating multiple contexts for the same cluster.

## Unset Namespace

Remove default namespace from context:

```bash
# Clear namespace from current context
kubectl config set-context --current --namespace=""

# Now commands default to 'default' namespace
kubectl get pods
```

This returns to requiring explicit namespace specifications.

## Embedding Certificates

Store certificates directly in kubeconfig:

```bash
# Embed cluster CA certificate
kubectl config set-cluster embedded-cluster \
  --server=https://api.example.com:6443 \
  --certificate-authority-data=$(cat /path/to/ca.crt | base64 -w0)

# Embed client certificate and key
kubectl config set-credentials embedded-user \
  --client-certificate-data=$(cat /path/to/client.crt | base64 -w0) \
  --client-key-data=$(cat /path/to/client.key | base64 -w0)
```

Embedded certificates make config files portable without separate cert files.

## Extracting Kubeconfig from Cloud Providers

Generate configs for cloud-managed clusters:

```bash
# GKE (Google Kubernetes Engine)
gcloud container clusters get-credentials cluster-name --region=us-central1

# EKS (Amazon Elastic Kubernetes Service)
aws eks update-kubeconfig --name cluster-name --region us-west-2

# AKS (Azure Kubernetes Service)
az aks get-credentials --resource-group my-rg --name cluster-name

# These commands update ~/.kube/config automatically
kubectl config get-contexts
```

Cloud CLIs add contexts to your kubeconfig automatically.

## Script-Friendly Context Switching

Automate context switching in scripts:

```bash
#!/bin/bash
# deploy-to-envs.sh

CONTEXTS=("development" "staging" "production")

for ctx in "${CONTEXTS[@]}"; do
    echo "Deploying to $ctx..."
    kubectl config use-context $ctx
    kubectl apply -f deployment.yaml
    kubectl rollout status deployment/webapp
done

echo "Deployment complete across all environments"
```

Scripted switching enables multi-environment operations.

## Temporary Context Switching

Change context temporarily without persisting:

```bash
# Use context for single command
kubectl get pods --context=production

# Run multiple commands with temporary context
kubectl --context=staging get deployments
kubectl --context=staging get services

# Current context remains unchanged
kubectl config current-context  # Shows previous context
```

Temporary context usage prevents accidental context switches.

## Validating Context Configuration

Test context connectivity:

```bash
# Check if context is valid
kubectl cluster-info --context=production

# Test authentication
kubectl get nodes --context=staging

# Verify namespace access
kubectl get pods --context=dev --namespace=default

# Comprehensive validation
kubectl cluster-info dump --context=production > /dev/null && echo "Context valid" || echo "Context invalid"
```

Validation ensures contexts work before relying on them.

## Organizing Contexts by Environment

Name contexts systematically:

```bash
# Rename contexts with environment prefix
kubectl config rename-context gke-cluster-1 prod-gke-cluster-1
kubectl config rename-context gke-cluster-2 staging-gke-cluster-2
kubectl config rename-context minikube dev-local-minikube

# Set namespaces matching environments
kubectl config set-context prod-gke-cluster-1 --namespace=production
kubectl config set-context staging-gke-cluster-2 --namespace=staging
kubectl config set-context dev-local-minikube --namespace=development

# List organized contexts
kubectl config get-contexts
```

Systematic naming prevents accidental operations on wrong clusters.

## Backing Up Kubeconfig

Preserve configuration before changes:

```bash
# Backup current config
cp ~/.kube/config ~/.kube/config.backup.$(date +%Y%m%d)

# Restore from backup if needed
cp ~/.kube/config.backup.20260209 ~/.kube/config

# Version control for team configs
git add ~/.kube/team-config
git commit -m "Update production cluster credentials"
git push
```

Backups recover from configuration mistakes.

## Cleaning Up Kubeconfig

Remove outdated entries:

```bash
#!/bin/bash
# cleanup-kubeconfig.sh

echo "Checking for unreachable contexts..."

for ctx in $(kubectl config get-contexts -o name); do
    if ! kubectl cluster-info --context=$ctx &>/dev/null; then
        echo "Context $ctx is unreachable"
        read -p "Delete context $ctx? (yes/no): " confirm
        if [[ "$confirm" == "yes" ]]; then
            kubectl config delete-context $ctx
        fi
    fi
done

echo "Cleanup complete"
```

Regular cleanup keeps config files manageable.

## Context Aliases

Create shell aliases for frequent contexts:

```bash
# Add to .bashrc or .zshrc
alias kprod='kubectl config use-context production'
alias kstage='kubectl config use-context staging'
alias kdev='kubectl config use-context development'

# Switch contexts quickly
kprod
kubectl get nodes

kdev
kubectl get pods
```

Aliases speed up context switching.

## Merging Kubeconfig Files

Combine multiple config files:

```bash
# Set KUBECONFIG to merge sources
export KUBECONFIG=~/.kube/config:~/.kube/config-2:~/.kube/config-3

# View merged config
kubectl config view --flatten

# Save merged config
kubectl config view --flatten > ~/.kube/merged-config

# Use merged config
export KUBECONFIG=~/.kube/merged-config
```

See https://oneuptime.com/blog/post/merge-multiple-kubeconfig-files/view for detailed merging instructions.

kubectl config commands organize multi-cluster complexity into manageable operations. Define contexts for each environment, switch between them confidently, and set default namespaces to streamline workflows. Master these commands and cluster management becomes second nature. For more context management techniques, check out https://oneuptime.com/blog/post/kubectl-aliases-shell-functions/view.
