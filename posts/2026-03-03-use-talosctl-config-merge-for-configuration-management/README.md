# How to Use talosctl config merge for Configuration Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Configuration, Cluster Management, DevOps

Description: Learn how to use talosctl config merge to combine and manage multiple Talos Linux cluster configurations efficiently

---

When you manage multiple Talos Linux clusters, keeping track of their configurations can get complicated fast. The `talosctl config merge` command lets you combine configuration files from different clusters into a single talosctl config, similar to how kubectl manages multiple cluster contexts in a single kubeconfig file. This guide explains how to use it effectively.

## Understanding the talosctl Configuration

The talosctl configuration file (typically stored at `~/.talos/config`) contains the information talosctl needs to connect to your Talos Linux clusters. This includes API endpoints, client certificates, and cluster contexts. Each cluster you manage gets its own context within this file.

When you generate a new cluster configuration with `talosctl gen config`, it creates a `talosconfig` file alongside the machine configurations. This `talosconfig` is what you merge into your main configuration file.

## Basic Merge Operation

The most common use of `talosctl config merge` is to add a new cluster's configuration to your existing setup:

```bash
# After generating config for a new cluster
talosctl gen config production-cluster https://10.0.1.100:6443

# Merge the new talosconfig into your main config
talosctl config merge ./talosconfig
```

This takes the context from the `talosconfig` file and adds it to your default configuration at `~/.talos/config`. If the file does not exist yet, it creates it.

## Merging From a Specific Path

If your talosconfig file is in a custom location, just specify the path:

```bash
# Merge from a specific file path
talosctl config merge /path/to/project/talosconfig

# Merge from another team member's config
talosctl config merge ~/Downloads/shared-talosconfig
```

## Viewing the Current Configuration

Before and after merging, you can inspect your configuration:

```bash
# View the current configuration summary
talosctl config info

# List all available contexts
talosctl config contexts

# See which context is currently active
talosctl config info | grep context
```

## Managing Multiple Clusters

Here is a typical workflow for managing multiple clusters:

```bash
# Generate config for the development cluster
talosctl gen config dev-cluster https://dev-api.example.com:6443 \
  --output-dir ./dev-config

# Generate config for the staging cluster
talosctl gen config staging-cluster https://staging-api.example.com:6443 \
  --output-dir ./staging-config

# Generate config for the production cluster
talosctl gen config prod-cluster https://prod-api.example.com:6443 \
  --output-dir ./prod-config

# Merge all three into your main config
talosctl config merge ./dev-config/talosconfig
talosctl config merge ./staging-config/talosconfig
talosctl config merge ./prod-config/talosconfig

# List all contexts
talosctl config contexts
```

After merging, you can switch between clusters easily:

```bash
# Switch to the development cluster
talosctl config context dev-cluster

# Now all talosctl commands target the dev cluster
talosctl version
talosctl services

# Switch to production
talosctl config context prod-cluster
talosctl version
```

## Handling Merge Conflicts

If you try to merge a configuration that has the same context name as an existing one, the merge command will update the existing context with the new values. This is useful when you regenerate cluster configurations:

```bash
# Regenerate config for an existing cluster
talosctl gen config prod-cluster https://new-endpoint.example.com:6443 \
  --output-dir ./updated-config

# Merge will update the existing prod-cluster context
talosctl config merge ./updated-config/talosconfig
```

If you want to keep both the old and new configurations, rename the context before merging:

```bash
# You can edit the talosconfig file to change the context name
# before merging, or use config rename after merging
talosctl config context prod-cluster-v2
```

## Merging Into a Custom Config File

By default, `talosctl config merge` writes to `~/.talos/config`. If you want to use a different base configuration file:

```bash
# Set a custom config location via environment variable
export TALOSCONFIG=/path/to/my/custom/config

# Now merge will use this file as the base
talosctl config merge ./talosconfig
```

This is useful when you want to maintain separate config files for different purposes:

```bash
# Personal development environments
export TALOSCONFIG=~/.talos/dev-config
talosctl config merge ./dev-talosconfig

# Shared team environments
export TALOSCONFIG=~/.talos/team-config
talosctl config merge ./team-talosconfig
```

## Scripted Configuration Setup

When onboarding new team members or setting up new workstations, you can script the entire configuration setup:

```bash
#!/bin/bash
# setup-talos-configs.sh - Set up talosctl configs for all environments

CONFIG_DIR="/secure/shared/talos-configs"

echo "Setting up talosctl configurations..."

# Merge configurations for all environments
for env in dev staging prod; do
  if [ -f "$CONFIG_DIR/$env/talosconfig" ]; then
    echo "Merging $env cluster configuration..."
    talosctl config merge "$CONFIG_DIR/$env/talosconfig"
  else
    echo "WARNING: No talosconfig found for $env"
  fi
done

# Set the default context to dev
talosctl config context dev-cluster

# Verify all contexts are available
echo "Available contexts:"
talosctl config contexts

echo "Setup complete. Default context: dev-cluster"
```

## Working with Config in CI/CD Pipelines

In CI/CD environments, you often need to construct the talosctl config dynamically:

```bash
#!/bin/bash
# CI/CD pipeline script

# Store talosconfig as a base64-encoded secret in your CI system
echo "$TALOSCONFIG_B64" | base64 -d > /tmp/talosconfig

# Merge into the config
talosctl config merge /tmp/talosconfig

# Set the correct context for this pipeline
talosctl config context "$TARGET_CLUSTER"

# Verify connectivity
talosctl version

# Clean up sensitive files
rm -f /tmp/talosconfig
```

For GitHub Actions, you might structure it like this:

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Set up talosctl
      run: |
        curl -sL https://talos.dev/install | sh

    - name: Configure talosctl
      run: |
        echo "${{ secrets.TALOSCONFIG }}" | base64 -d > /tmp/talosconfig
        talosctl config merge /tmp/talosconfig
        talosctl config context production
        rm /tmp/talosconfig

    - name: Verify cluster
      run: |
        talosctl health --wait-timeout 2m
```

## Backing Up Your Configuration

Your talosctl configuration contains sensitive information like client certificates. Back it up securely:

```bash
# Back up your current config
cp ~/.talos/config ~/.talos/config.backup.$(date +%Y%m%d)

# Or encrypt it before storing
gpg --symmetric --cipher-algo AES256 ~/.talos/config -o ~/secure-backups/talosconfig.gpg
```

## Inspecting Configuration Details

Sometimes you need to look at the details of a specific context:

```bash
# View the full configuration (be careful - this contains secrets)
talosctl config info

# Check the endpoints for the current context
talosctl config info | grep -i endpoint

# Check which nodes are configured
talosctl config info | grep -i node
```

## Cleaning Up Old Configurations

When you decommission a cluster, remove its context from your configuration:

```bash
# List current contexts
talosctl config contexts

# Remove a context you no longer need
talosctl config remove old-cluster

# Verify it was removed
talosctl config contexts
```

## Best Practices

- Always merge new cluster configurations immediately after generating them, so you do not lose track of the `talosconfig` file.
- Use descriptive context names that clearly identify each cluster (like `prod-us-east`, `staging-eu`, `dev-local`).
- Back up your `~/.talos/config` file regularly, since it contains the keys needed to manage your clusters.
- In CI/CD, treat the talosconfig as a secret and handle it accordingly.
- Clean up contexts for decommissioned clusters to keep your configuration tidy.
- Use environment-specific config files when you need strict separation between environments.
- Never commit talosconfig files to public version control repositories.

The `talosctl config merge` command is a small but important part of your Talos Linux workflow. Using it consistently makes switching between clusters seamless and keeps your configuration organized as your infrastructure grows.
