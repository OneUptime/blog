# How to Install Timoni CLI for Flux Module Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Timoni, CLI, Module-Management

Description: A complete guide to installing the Timoni CLI and using it to manage Flux modules for Kubernetes deployments.

---

## Introduction

Timoni is a package manager for Kubernetes that uses CUE language for defining and distributing application configurations as modules. It integrates tightly with Flux, providing a higher-level abstraction for managing Flux resources like Kustomizations, HelmReleases, and source configurations. The Timoni CLI allows you to create, publish, and consume modules from OCI registries, making it a powerful companion to Flux for managing complex deployments.

This guide covers installing the Timoni CLI on various platforms, verifying the installation, and getting started with basic Flux module management operations.

## Prerequisites

- A workstation running macOS, Linux, or Windows
- `kubectl` configured for your target cluster
- `flux` CLI installed (recommended for interoperability)
- An OCI-compatible registry for storing modules (optional for initial setup)

## Step 1: Install Timoni CLI

### macOS with Homebrew

The simplest way to install Timoni on macOS:

```bash
brew install stefanprodan/tap/timoni
```

Verify the installation:

```bash
timoni version
```

### Linux

Download the latest release binary:

```bash
curl -sSL https://github.com/stefanprodan/timoni/releases/latest/download/timoni_linux_amd64.tar.gz | tar xz
sudo mv timoni /usr/local/bin/timoni
```

For ARM-based Linux:

```bash
curl -sSL https://github.com/stefanprodan/timoni/releases/latest/download/timoni_linux_arm64.tar.gz | tar xz
sudo mv timoni /usr/local/bin/timoni
```

### Windows

Using Scoop:

```powershell
scoop bucket add stefanprodan https://github.com/stefanprodan/scoop-bucket.git
scoop install timoni
```

Or download the binary manually from the GitHub releases page and add it to your PATH.

### Install a Specific Version

To install a specific version:

```bash
TIMONI_VERSION=0.22.0
curl -sSL "https://github.com/stefanprodan/timoni/releases/download/v${TIMONI_VERSION}/timoni_linux_amd64.tar.gz" | tar xz
sudo mv timoni /usr/local/bin/timoni
```

## Step 2: Configure Shell Completion

Enable shell completion for faster command entry:

### Bash

```bash
echo 'source <(timoni completion bash)' >> ~/.bashrc
source ~/.bashrc
```

### Zsh

```bash
echo 'source <(timoni completion zsh)' >> ~/.zshrc
source ~/.zshrc
```

### Fish

```bash
timoni completion fish > ~/.config/fish/completions/timoni.fish
```

## Step 3: Verify the Installation

Run a comprehensive check:

```bash
timoni version

# Check available commands
timoni --help
```

Expected output structure:

```text
A package manager for Kubernetes powered by CUE.

Usage:
  timoni [command]

Available Commands:
  apply        Install or upgrade a module instance
  build        Build a module and print the resulting Kubernetes resources
  bundle       Commands for managing bundles
  completion   Generate the autocompletion script
  delete       Uninstall a module instance
  inspect      Commands for inspecting instances
  list         List all module instances in a namespace
  mod          Commands for managing modules
  pull         Pull a module from an OCI registry
  push         Push a module to an OCI registry
  status       Display the status of a module instance
  version      Print the version
```

## Step 4: Pull Your First Flux Module

Timoni modules are distributed via OCI registries. Pull a Flux module to examine it locally:

```bash
timoni mod pull oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --version latest \
  --output ./flux-git-sync
```

Examine the module structure:

```bash
ls -la ./flux-git-sync/
```

A typical module contains:

```text
flux-git-sync/
  cue.mod/
    module.cue
  templates/
    config.cue
    gitrepository.cue
    kustomization.cue
  values.cue
  timoni.cue
  README.md
```

## Step 5: Inspect Module Values

View the configurable values of a module:

```bash
timoni mod values oci://ghcr.io/stefanprodan/modules/flux-git-sync
```

This shows the CUE schema for all configurable parameters, including defaults and constraints.

## Step 6: Build and Preview

Build a module locally to see the generated Kubernetes manifests without applying them:

```bash
timoni build my-app oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values values.yaml \
  --namespace flux-system
```

Create a values file for your deployment:

```yaml
# values.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra"
    ref:
      branch: "main"
    path: "./clusters/production"
  sync:
    interval: "5m"
    prune: true
    wait: true
```

Preview the resources that would be created:

```bash
timoni build my-app oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values values.yaml \
  --namespace flux-system
```

## Step 7: Apply a Module Instance

Deploy the module to your cluster:

```bash
timoni apply my-app oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values values.yaml \
  --namespace flux-system
```

Check the deployed instance:

```bash
timoni list -n flux-system
timoni status my-app -n flux-system
```

## Step 8: Manage Module Lifecycle

Update an existing instance with new values:

```bash
timoni apply my-app oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values updated-values.yaml \
  --namespace flux-system
```

Inspect what resources an instance manages:

```bash
timoni inspect resources my-app -n flux-system
```

Delete an instance and its managed resources:

```bash
timoni delete my-app -n flux-system
```

## Step 9: Configure OCI Registry Authentication

For private registries, configure authentication:

```bash
timoni registry login ghcr.io \
  --username your-username \
  --password your-token
```

Or use environment variables:

```bash
export TIMONI_REGISTRY_USERNAME=your-username
export TIMONI_REGISTRY_PASSWORD=your-token
```

## Conclusion

The Timoni CLI provides a streamlined way to manage Flux modules for Kubernetes deployments. With CUE-based type checking, OCI distribution, and built-in lifecycle management, Timoni bridges the gap between raw Kubernetes manifests and fully opinionated platforms. Once installed, you can pull modules from OCI registries, preview generated resources, and deploy them to your clusters with a single command. In subsequent guides, we will explore specific Flux modules for Git sync, OCI sync, and Helm release management using Timoni.
