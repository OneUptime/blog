# How to Merge Multiple Kubeconfig Files into a Single Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Configuration Management

Description: Learn how to merge multiple kubeconfig files into a single unified configuration, eliminating the need to switch between config files when managing multiple Kubernetes clusters.

---

Working with multiple Kubernetes clusters often results in separate kubeconfig files from cloud providers, tools, or manual configurations. Managing these files individually becomes cumbersome. Merging them into a single config simplifies cluster access and context switching.

## Why Merge Kubeconfig Files

Separate kubeconfig files create friction:

```bash
# Before merging - switching config files
export KUBECONFIG=~/.kube/config-gke
kubectl get nodes

export KUBECONFIG=~/.kube/config-eks
kubectl get nodes

export KUBECONFIG=~/.kube/config-aks
kubectl get nodes
```

After merging, all contexts exist in one file:

```bash
# After merging - switching contexts
kubectl config use-context gke-production
kubectl config use-context eks-staging
kubectl config use-context aks-development
```

Single config files reduce context-switching overhead.

## Understanding KUBECONFIG Environment Variable

KUBECONFIG accepts colon-separated file paths:

```bash
# View single config
export KUBECONFIG=~/.kube/config
kubectl config view

# View multiple configs merged temporarily
export KUBECONFIG=~/.kube/config:~/.kube/config-2:~/.kube/config-3
kubectl config view

# All contexts from all files appear
kubectl config get-contexts
```

This merges configs in memory without creating a new file.

## Merging Configs with kubectl

Use kubectl config view to merge and save:

```bash
# Set KUBECONFIG to include all source files
export KUBECONFIG=~/.kube/config:~/.kube/config-gke:~/.kube/config-eks

# View merged configuration
kubectl config view --flatten

# Save merged config to new file
kubectl config view --flatten > ~/.kube/config-merged

# Replace original config with merged version
mv ~/.kube/config ~/.kube/config.backup
mv ~/.kube/config-merged ~/.kube/config

# Verify merge
kubectl config get-contexts
```

The `--flatten` flag embeds all certificates and credentials.

## Manual Merge Script

Automate merging with a script:

```bash
#!/bin/bash
# merge-kubeconfigs.sh

# Backup existing config
cp ~/.kube/config ~/.kube/config.backup.$(date +%Y%m%d)

# Build KUBECONFIG path with all config files
CONFIGS=$(find ~/.kube -name 'config*' -type f | tr '\n' ':')

# Remove trailing colon
CONFIGS=${CONFIGS%:}

# Merge and save
KUBECONFIG=$CONFIGS kubectl config view --flatten > ~/.kube/config-new

# Replace config
mv ~/.kube/config-new ~/.kube/config

echo "Merged $(echo $CONFIGS | tr ':' '\n' | wc -l) config files"
echo "Backup saved to ~/.kube/config.backup.$(date +%Y%m%d)"
```

This finds and merges all config files automatically.

## Merging Specific Files

Merge selected configs only:

```bash
# Choose specific files to merge
export KUBECONFIG=~/.kube/config:~/.kube/gke-prod:~/.kube/eks-staging

# Create merged config
kubectl config view --flatten > ~/.kube/merged-prod-staging

# Use merged config
export KUBECONFIG=~/.kube/merged-prod-staging
kubectl config get-contexts
```

Selective merging creates purpose-specific config files.

## Handling Duplicate Context Names

Duplicate context names cause conflicts:

```bash
# If both files have context named "default"
export KUBECONFIG=file1:file2
kubectl config get-contexts
# Only one "default" context appears (last one wins)

# Rename contexts before merging
kubectl config rename-context default gke-default --kubeconfig=~/.kube/config-gke
kubectl config rename-context default eks-default --kubeconfig=~/.kube/config-eks

# Now merge
export KUBECONFIG=~/.kube/config-gke:~/.kube/config-eks
kubectl config view --flatten > ~/.kube/config
```

Rename conflicting contexts to preserve all configurations.

## Preserving Current Context

Merged configs should maintain the active context:

```bash
# Check current context before merge
kubectl config current-context

# Perform merge
KUBECONFIG=~/.kube/config:~/.kube/config-2 kubectl config view --flatten > ~/.kube/merged

# Set current context in merged config
kubectl config use-context production --kubeconfig=~/.kube/merged

# Replace config
mv ~/.kube/merged ~/.kube/config
```

This ensures the active context persists after merging.

## Adding New Clusters to Existing Config

Merge new cluster configs without recreating entire config:

```bash
# Get new cluster config from cloud provider
gcloud container clusters get-credentials new-cluster

# This adds to ~/.kube/config automatically
# If it created a separate file:

export KUBECONFIG=~/.kube/config:~/.kube/new-cluster-config
kubectl config view --flatten > ~/.kube/config-temp
mv ~/.kube/config-temp ~/.kube/config
```

Incremental merging grows your config over time.

## Extracting Contexts from Merged Config

Separate a single context back into its own file:

```bash
#!/bin/bash
# extract-context.sh

CONTEXT=$1
OUTPUT_FILE=$2

# Get context cluster and user
CLUSTER=$(kubectl config view -o jsonpath="{.contexts[?(@.name==\"$CONTEXT\")].context.cluster}")
USER=$(kubectl config view -o jsonpath="{.contexts[?(@.name==\"$CONTEXT\")].context.user}")

# Extract to new config
kubectl config view --minify --context=$CONTEXT --flatten > $OUTPUT_FILE

echo "Extracted $CONTEXT to $OUTPUT_FILE"
```

This creates isolated configs for sharing or backup.

## Merging with Embedded Certificates

The `--flatten` flag embeds external certificate files:

```bash
# Before flatten - certificates are file paths
kubectl config view
# certificate-authority: /path/to/ca.crt
# client-certificate: /path/to/client.crt
# client-key: /path/to/client.key

# After flatten - certificates are embedded
kubectl config view --flatten
# certificate-authority-data: LS0tLS1CRUdJTi...
# client-certificate-data: LS0tLS1CRUdJTi...
# client-key-data: LS0tLS1CRUdJTi...
```

Flattened configs are portable without external certificate files.

## Merging Cloud Provider Configs

Cloud CLIs create separate configs:

```bash
# GKE creates or modifies ~/.kube/config
gcloud container clusters get-credentials prod-cluster

# EKS writes to specified location
aws eks update-kubeconfig --name staging-cluster --kubeconfig ~/.kube/config-eks

# AKS can append or create new file
az aks get-credentials --name dev-cluster --file ~/.kube/config-aks

# Merge all
export KUBECONFIG=~/.kube/config:~/.kube/config-eks:~/.kube/config-aks
kubectl config view --flatten > ~/.kube/config-all
mv ~/.kube/config-all ~/.kube/config
```

This consolidates multi-cloud configurations.

## Verifying Merged Configuration

Test all contexts after merging:

```bash
#!/bin/bash
# verify-merged-config.sh

echo "Testing all contexts in merged config..."

for ctx in $(kubectl config get-contexts -o name); do
    echo "Testing context: $ctx"
    if kubectl cluster-info --context=$ctx &>/dev/null; then
        echo "  ✓ $ctx is reachable"
    else
        echo "  ✗ $ctx is NOT reachable"
    fi
done
```

Validation ensures the merge succeeded without breaking access.

## Handling Merge Conflicts

When clusters or users share names:

```bash
# Check for name conflicts
cat ~/.kube/config-1 | grep "name:" | sort
cat ~/.kube/config-2 | grep "name:" | sort

# If conflicts exist, rename in source files
kubectl config rename-context conflicting-name unique-name-1 --kubeconfig=~/.kube/config-1
kubectl config rename-cluster conflicting-cluster unique-cluster-1 --kubeconfig=~/.kube/config-1
kubectl config rename-user conflicting-user unique-user-1 --kubeconfig=~/.kube/config-1

# Then merge
export KUBECONFIG=~/.kube/config-1:~/.kube/config-2
kubectl config view --flatten > ~/.kube/config
```

Resolving conflicts before merging prevents data loss.

## Merging with Environment-Specific Namespaces

Preserve namespace settings during merge:

```bash
# Source configs have different default namespaces
kubectl config view --kubeconfig=~/.kube/config-prod | grep namespace
# namespace: production

kubectl config view --kubeconfig=~/.kube/config-dev | grep namespace
# namespace: development

# Merge preserves namespace settings
export KUBECONFIG=~/.kube/config-prod:~/.kube/config-dev
kubectl config view --flatten > ~/.kube/config

# Verify namespaces preserved
kubectl config get-contexts
```

Namespace configurations transfer during merges.

## Creating Team Shared Config

Build standardized configs for teams:

```bash
#!/bin/bash
# create-team-config.sh

# Collect configs from team members
TEAM_CONFIGS=""
for member in alice bob charlie; do
    if [ -f ~/team-configs/$member-config ]; then
        TEAM_CONFIGS="$TEAM_CONFIGS:~/team-configs/$member-config"
    fi
done

# Remove leading colon
TEAM_CONFIGS=${TEAM_CONFIGS#:}

# Merge team configs
KUBECONFIG=$TEAM_CONFIGS kubectl config view --flatten > ~/team-configs/shared-config

# Distribute to team
# (upload to shared storage, git repo, etc.)
```

Shared configs standardize team cluster access.

## Selective Context Extraction

Create configs with subsets of contexts:

```bash
#!/bin/bash
# extract-production-contexts.sh

# Get all production contexts
PROD_CONTEXTS=$(kubectl config get-contexts -o name | grep prod)

# Create temp config
> ~/.kube/config-prod-only

for ctx in $PROD_CONTEXTS; do
    # Export to temp file
    kubectl config view --minify --context=$ctx --flatten > /tmp/ctx-$ctx

    # Merge into prod-only config
    KUBECONFIG=~/.kube/config-prod-only:/tmp/ctx-$ctx kubectl config view --flatten > /tmp/merged
    mv /tmp/merged ~/.kube/config-prod-only
done

echo "Production-only config created: ~/.kube/config-prod-only"
```

This creates environment-specific config files from merged configs.

## Merging with Git for Version Control

Track config changes with git:

```bash
# Initialize config repo
mkdir ~/kubeconfig-repo
cd ~/kubeconfig-repo
git init

# Copy and merge configs
cp ~/.kube/config-gke ./config-gke
cp ~/.kube/config-eks ./config-eks
cp ~/.kube/config-aks ./config-aks

# Create merged version
KUBECONFIG=config-gke:config-eks:config-aks kubectl config view --flatten > config-merged

# Commit
git add .
git commit -m "Initial config merge"

# Update merged config
cp config-merged ~/.kube/config
```

Version control tracks config evolution and enables rollback.

## Automating Regular Merges

Keep config current with scheduled merges:

```bash
#!/bin/bash
# scheduled-merge.sh

LOG_FILE=~/kubeconfig-merge.log

echo "$(date): Starting config merge" >> $LOG_FILE

# Backup current config
cp ~/.kube/config ~/.kube/config.backup.$(date +%Y%m%d-%H%M%S)

# Find all config files
CONFIGS=$(find ~/.kube -name 'config-*' -type f | tr '\n' ':')
CONFIGS="~/.kube/config:${CONFIGS%:}"

# Merge
KUBECONFIG=$CONFIGS kubectl config view --flatten > ~/.kube/config-new

# Replace if merge succeeded
if [ $? -eq 0 ]; then
    mv ~/.kube/config-new ~/.kube/config
    echo "$(date): Merge successful" >> $LOG_FILE
else
    echo "$(date): Merge failed" >> $LOG_FILE
    exit 1
fi
```

Run this via cron to maintain merged config automatically.

## Cleaning Up After Merge

Remove source files after successful merge:

```bash
# Verify merged config works
kubectl config get-contexts
kubectl cluster-info

# Archive source configs
mkdir -p ~/.kube/archive
mv ~/.kube/config-gke ~/.kube/archive/
mv ~/.kube/config-eks ~/.kube/archive/
mv ~/.kube/config-aks ~/.kube/archive/

# Or delete if confident
rm ~/.kube/config-gke ~/.kube/config-eks ~/.kube/config-aks
```

This simplifies the ~/.kube directory.

## Troubleshooting Merge Issues

When merges fail or produce unexpected results:

```bash
# Check for invalid YAML in source configs
for config in ~/.kube/config-*; do
    echo "Validating $config"
    kubectl config view --kubeconfig=$config --flatten > /dev/null
    if [ $? -ne 0 ]; then
        echo "ERROR: $config is invalid"
    fi
done

# Compare before and after context counts
BEFORE=$(kubectl config get-contexts -o name | wc -l)
# Perform merge
AFTER=$(kubectl config get-contexts -o name | wc -l)

if [ $AFTER -lt $BEFORE ]; then
    echo "WARNING: Lost contexts during merge"
fi
```

Validation catches issues before they break access.

## Best Practices for Config Merging

Follow these guidelines:

1. Always backup before merging
2. Rename conflicting contexts first
3. Use --flatten to embed certificates
4. Verify all contexts after merging
5. Test connectivity to each cluster
6. Keep source files until verification complete
7. Document which configs were merged

Merging kubeconfig files centralizes cluster access into a single configuration. Use kubectl config view with --flatten to combine configs, rename conflicts before merging, and validate afterwards. A unified config eliminates file switching and simplifies multi-cluster management. For more config management techniques, see https://oneuptime.com/blog/post/2026-02-09-kubectl-config-manage-kubeconfig-contexts/view.
