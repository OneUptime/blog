# How to Configure Rancher Desktop Path Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, PATH, CLI Tools, Configuration, Shell

Description: Manage PATH integration in Rancher Desktop to ensure CLI tools like kubectl, helm, and nerdctl are accessible.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles CLI tools such as kubectl, Helm, nerdctl, and docker into a single application. On macOS and Linux, these utilities are located in `~/.rd/bin`, and Rancher Desktop can manage your shell `PATH` automatically or let you manage it manually. On Windows, the bundled CLI tools are added to `PATH` during installation. This guide covers How to Configure Rancher Desktop Path Management in detail.

## Prerequisites

- Rancher Desktop installed and running
- A supported version of macOS, Windows, or Linux
- WSL2 installed if you are using Rancher Desktop on Windows
- A shell profile you can edit if you want to manage `PATH` manually on macOS or Linux

## Overview

Rancher Desktop simplifies CLI access by providing:

- Bundled CLI tools such as `kubectl`, `helm`, `nerdctl`, and `docker`
- A `~/.rd/bin` directory for Rancher Desktop utilities on macOS and Linux
- Automatic or manual `PATH` management on macOS and Linux
- WSL integration on Windows for access to the Rancher Desktop Kubernetes configuration from WSL distributions

## Step 1: Initial Setup

```bash
# Verify Rancher Desktop CLI access
rdctl version

# macOS / Linux: list the bundled utilities
ls ~/.rd/bin

# macOS / Linux: confirm Rancher Desktop's bin directory is on PATH
printf '%s\n' "$PATH" | tr ':' '\n' | grep -Fx "$HOME/.rd/bin"
```

On Windows, Rancher Desktop adds the bundled CLI tools to `PATH` during installation. Open a new terminal session after installation before verifying the commands.

## Step 2: Configuration

Open Rancher Desktop Preferences to configure:

- **Application > Environment**: `Automatic` or `Manual` `PATH` management on macOS and Linux
- **Container Engine**: `containerd` or `moby (dockerd)` depending on whether you want to use `nerdctl` or the Docker API
- **WSL** (Windows only): WSL integration settings for using the Rancher Desktop Kubernetes configuration inside WSL distributions

```bash
# Enable automatic PATH management on macOS / Linux
rdctl set --application.path-management-strategy rcfiles

# Or switch to manual PATH management
rdctl set --application.path-management-strategy manual
```

## Step 3: Verify Container CLI Paths

```bash
# Verify nerdctl is available on PATH
command -v nerdctl

# Verify docker is available on PATH
command -v docker
```

`nerdctl` is used with the `containerd` engine. `docker` commands that talk to a Docker daemon require the `moby` container engine to be selected in Rancher Desktop.

## Step 4: Verify Kubernetes CLI Paths

```bash
# Verify kubectl is available on PATH
command -v kubectl

# Confirm the kubectl client is accessible
kubectl version --client
```

## Step 5: Verify Helm PATH Integration

```bash
# Verify helm is available on PATH
command -v helm

# Confirm the Helm client is accessible
helm version
```

## Common Configuration Tasks

```bash
# Show the current Rancher Desktop PATH management setting
rdctl list-settings | grep '"pathManagementStrategy"'

# Add Rancher Desktop utilities to PATH manually for bash
echo 'export PATH="$HOME/.rd/bin:$PATH"' >> ~/.bashrc

# Add Rancher Desktop utilities to PATH manually for zsh
echo 'export PATH="$HOME/.rd/bin:$PATH"' >> ~/.zshrc
```

After updating your shell profile manually, open a new terminal session so the updated `PATH` is loaded.

## Troubleshooting

```bash
# macOS / Linux: verify Rancher Desktop utilities are present
ls ~/.rd/bin

# Inspect the current PATH
printf '%s\n' "$PATH" | tr ':' '\n'

# Confirm the shell resolves Rancher Desktop CLIs
command -v kubectl
command -v helm
command -v nerdctl
command -v docker

# Check Rancher Desktop's current PATH management setting
rdctl list-settings | grep '"pathManagementStrategy"'
```

If the commands are still not available, use Rancher Desktop's `Troubleshooting > Show Logs` option and verify whether you need to open a new terminal session after changing `PATH` settings.

## Conclusion

How to Configure Rancher Desktop Path Management with Rancher Desktop is mainly about making sure the bundled utilities are available in your shell. On macOS and Linux, Rancher Desktop can manage `~/.rd/bin` for you automatically or you can add it yourself in manual mode. On Windows, the installer adds the CLI tools to `PATH`, and WSL integration can make the Rancher Desktop Kubernetes configuration available inside WSL distributions. Once `PATH` is configured correctly, tools like `kubectl`, `helm`, `nerdctl`, and `docker` are ready to use from your terminal.
