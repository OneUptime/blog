# How to Use kubectl Plugins with Krew Package Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Krew

Description: Discover how to install and manage kubectl plugins using Krew, the official package manager that extends kubectl with hundreds of community-built tools and utilities.

---

kubectl provides core Kubernetes functionality, but the plugin ecosystem extends it far beyond the basics. Krew manages these plugins, making installation, updates, and discovery simple. Think of it as apt or brew for kubectl extensions.

## What is Krew

Krew is the official kubectl plugin manager maintained by Kubernetes SIG CLI. It provides access to over 200 plugins that add commands for monitoring, debugging, security scanning, cost analysis, and cluster management. Instead of downloading and installing plugins manually, Krew handles dependencies, updates, and removal.

## Installing Krew

Install Krew on Linux or macOS:

```bash
# Install Krew
(
  set -x; cd "$(mktemp -d)" &&
  OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/\(arm\)\(64\)\?.*/\1\2/' -e 's/aarch64$/arm64/')" &&
  KREW="krew-${OS}_${ARCH}" &&
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
  tar zxvf "${KREW}.tar.gz" &&
  ./"${KREW}" install krew
)

# Add Krew to PATH (add to .bashrc or .zshrc)
export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"

# Verify installation
kubectl krew version
```

For Windows, use the PowerShell installation script from the Krew documentation. Once installed, krew updates itself through the standard plugin update mechanism.

## Basic Krew Commands

Krew uses subcommands similar to package managers:

```bash
# Update plugin index
kubectl krew update

# Search for plugins
kubectl krew search

# Search for specific plugin
kubectl krew search ctx

# Get plugin information
kubectl krew info ctx

# Install a plugin
kubectl krew install ctx

# List installed plugins
kubectl krew list

# Update all plugins
kubectl krew upgrade

# Uninstall a plugin
kubectl krew uninstall ctx
```

The `update` command refreshes the plugin index, similar to `apt update` or `brew update`. Always run it before searching or installing plugins.

## Essential Plugins to Install

Start with these widely-used plugins that enhance daily workflows:

```bash
# Context and namespace switching
kubectl krew install ctx
kubectl krew install ns

# Resource statistics
kubectl krew install resource-capacity
kubectl krew install view-utilization

# Interactive pod management
kubectl krew install neat
kubectl krew install tree

# Security scanning
kubectl krew install rbac-tool
kubectl krew install score

# Networking tools
kubectl krew install sniff
kubectl krew install net-forward
```

Each plugin adds new kubectl subcommands. After installing `ctx`, you run `kubectl ctx` to switch contexts.

## Context and Namespace Management

The `ctx` and `ns` plugins simplify context and namespace switching:

```bash
# List all contexts
kubectl ctx

# Switch to a context
kubectl ctx production

# Switch to previous context
kubectl ctx -

# List namespaces
kubectl ns

# Switch to namespace
kubectl ns kube-system

# Switch to previous namespace
kubectl ns -
```

These replace the verbose `kubectl config use-context` and `kubectl config set-context --current --namespace` commands. The `-` flag switches to the previous context or namespace, similar to `cd -` in bash.

## Resource Analysis Plugins

Analyze cluster resource usage with capacity plugins:

```bash
# Install resource capacity plugin
kubectl krew install resource-capacity

# Show resource capacity across nodes
kubectl resource-capacity

# Show capacity by pods
kubectl resource-capacity --pods

# Show capacity with utilization percentages
kubectl resource-capacity --util

# Install view-utilization for pod-level details
kubectl krew install view-utilization

# View CPU and memory utilization
kubectl view-utilization
kubectl view-utilization --namespace default
```

These plugins aggregate resource requests, limits, and actual usage across nodes and pods, providing capacity planning insights.

## Cleaning Up Resource Output

The `neat` plugin removes cluster-internal metadata from resource definitions:

```bash
# Install neat
kubectl krew install neat

# Get clean YAML output
kubectl get pod webapp -o yaml | kubectl neat

# Get clean JSON output
kubectl get service api -o json | kubectl neat

# Compare dirty vs clean output
kubectl get deployment nginx -o yaml > dirty.yaml
kubectl get deployment nginx -o yaml | kubectl neat > clean.yaml
diff dirty.yaml clean.yaml
```

This strips out status fields, managed fields, and other cluster-generated data, leaving only the essential configuration. It's invaluable when copying resources between clusters or creating templates.

## Resource Hierarchy Visualization

The `tree` plugin shows resource ownership hierarchies:

```bash
# Install tree plugin
kubectl krew install tree

# Show resources owned by a deployment
kubectl tree deployment webapp

# Show resources for a namespace
kubectl tree namespace production

# Include events
kubectl tree deployment webapp --events
```

This reveals relationships between deployments, replicasets, pods, and other owned resources, clarifying how Kubernetes controllers manage resources.

## RBAC Analysis

RBAC permissions grow complex quickly. The `rbac-tool` plugin analyzes roles and bindings:

```bash
# Install RBAC tool
kubectl krew install rbac-tool

# Show all permissions for a user
kubectl rbac-tool lookup user@example.com

# Show all permissions for a service account
kubectl rbac-tool lookup system:serviceaccount:default:my-app

# Generate permission matrix
kubectl rbac-tool viz

# Show who can perform an action
kubectl rbac-tool who-can create pods
kubectl rbac-tool who-can delete deployments
```

These commands reveal permission grants and help debug authorization issues.

## Security Scanning with Scorecard

The `score` plugin evaluates pod security configurations:

```bash
# Install score
kubectl krew install score

# Score a pod
kubectl score pod webapp

# Score all pods in namespace
kubectl score --all-namespaces

# Get detailed recommendations
kubectl score pod webapp -o detailed
```

Scorecard checks for security best practices like running as non-root, read-only filesystems, and resource limits.

## Network Debugging

Debug network issues with packet capture and port forwarding plugins:

```bash
# Install network plugins
kubectl krew install sniff
kubectl krew install net-forward

# Capture packets from a pod
kubectl sniff webapp -o capture.pcap

# Capture from specific interface
kubectl sniff webapp -i eth0

# Forward multiple ports
kubectl net-forward webapp 8080:80 9090:9090
```

The `sniff` plugin runs tcpdump inside containers and streams packet captures to your local machine. Open captures with Wireshark for detailed analysis.

## Image Security Scanning

Scan container images for vulnerabilities:

```bash
# Install image scan plugin
kubectl krew install scan

# Scan all images in a namespace
kubectl scan namespace production

# Scan specific deployment images
kubectl scan deployment webapp
```

This integrates vulnerability scanning into kubectl workflows without separate tools.

## Cost Analysis

Understand cluster costs with cost analysis plugins:

```bash
# Install cost plugin
kubectl krew install cost

# Show costs per namespace
kubectl cost namespace

# Show costs per node
kubectl cost node

# Detailed cost breakdown
kubectl cost --detailed
```

Cost plugins estimate cloud provider charges based on resource requests and node types.

## Plugin Management Best Practices

Keep plugins updated and remove unused ones:

```bash
# Update plugin index weekly
kubectl krew update

# Upgrade all plugins
kubectl krew upgrade

# List installed plugins
kubectl krew list

# Remove unused plugins
kubectl krew uninstall old-plugin

# Check plugin info before installing
kubectl krew info plugin-name
```

Some plugins require additional dependencies or cluster permissions. Read plugin info before installation.

## Creating Plugin Index Repositories

Krew supports custom plugin indexes beyond the default index:

```bash
# Add a custom index
kubectl krew index add custom-index https://github.com/org/custom-index.git

# Install from custom index
kubectl krew install custom-index/custom-plugin

# List indexes
kubectl krew index list

# Remove custom index
kubectl krew index remove custom-index
```

Organizations can maintain internal plugin indexes for private tools.

## Discovering New Plugins

Search the plugin index to find tools for specific needs:

```bash
# Search by keyword
kubectl krew search security
kubectl krew search cost
kubectl krew search debug

# Show all plugins (200+)
kubectl krew search | wc -l

# Get detailed plugin info
kubectl krew info plugin-name
```

The search output includes plugin descriptions, helping you find the right tool for your workflow.

## Troubleshooting Plugin Installation

If plugin installation fails:

```bash
# Update krew itself
kubectl krew upgrade krew

# Update plugin index
kubectl krew update

# Check krew configuration
ls -la "${KREW_ROOT:-$HOME/.krew}"

# Verify PATH includes krew bin directory
echo $PATH | grep krew

# Reinstall a problematic plugin
kubectl krew uninstall plugin-name
kubectl krew install plugin-name
```

Some plugins require specific kubectl versions. Check plugin info for compatibility requirements.

## Plugin Performance Considerations

Plugins execute as separate binaries. Complex plugins can be slower than native kubectl commands:

```bash
# Fast - native kubectl
kubectl get pods

# Slower - plugin processing
kubectl tree deployment webapp

# Very slow on large clusters
kubectl resource-capacity --pods --util
```

Use plugins when their functionality justifies the performance trade-off. For frequently-run commands, consider creating shell aliases that optimize performance.

## Writing Your Own Plugins

You can write custom plugins and distribute them through Krew. See https://oneuptime.com/blog/post/write-kubectl-plugins-bash-go/view for a detailed guide on creating kubectl plugins.

## Alternative Plugin Managers

While Krew dominates kubectl plugin management, alternatives exist:

```bash
# Manual plugin installation
curl -LO https://example.com/kubectl-custom
chmod +x kubectl-custom
mv kubectl-custom /usr/local/bin/

# Plugin is now available
kubectl custom
```

Manual installation works for one-off plugins but lacks update management and discovery features.

## Integration with CI/CD

Install plugins in CI/CD pipelines for automated workflows:

```bash
#!/bin/bash
# Install krew in CI environment
export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"
curl -fsSL https://krew.sigs.k8s.io/install | bash

# Install required plugins
kubectl krew install neat
kubectl krew install score

# Use plugins in pipeline
kubectl get deployment app -o yaml | kubectl neat > deployment.yaml
kubectl score deployment app
```

This enables plugin functionality in automated testing and deployment workflows.

## Plugin Security Considerations

Plugins execute with your kubectl credentials. Only install plugins from trusted sources:

```bash
# Check plugin source before installing
kubectl krew info plugin-name

# Review plugin manifest
kubectl krew info plugin-name -o yaml

# Verify plugin author and repository
```

The default Krew index curates plugins, but custom indexes might contain untrusted code. Exercise caution with third-party plugin sources.

Krew transforms kubectl from a basic CLI into a powerful extensible platform. Install essential plugins, explore the ecosystem, and extend kubectl to match your workflow. The right plugins eliminate custom scripts and external tools, consolidating cluster management into a single interface. For more kubectl efficiency tips, check out https://oneuptime.com/blog/post/kubectl-aliases-shell-functions/view.
