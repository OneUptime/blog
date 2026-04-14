# How to Upgrade Dapr CLI to the Latest Version

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Upgrade, Installation, Maintenance

Description: Learn how to upgrade the Dapr CLI to the latest version on Linux, macOS, and Windows using package managers and direct installation scripts.

---

## Why Keep the Dapr CLI Updated

The Dapr CLI manages your local development environment, initializes Dapr runtimes, and interacts with Kubernetes clusters. Upgrading ensures you have access to new commands, bug fixes, and compatibility with the latest Dapr runtime versions.

## Check Your Current Version

Before upgrading, check what version you have installed:

```bash
dapr --version
# CLI version: 1.13.0
# Runtime version: 1.13.3
```

## Upgrading on Linux and macOS

Run the official installation script to get the latest version:

```bash
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
```

Or using curl:

```bash
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash
```

The script automatically detects your OS and architecture, then replaces the existing binary at `/usr/local/bin/dapr`.

## Upgrading on macOS with Homebrew

```bash
brew upgrade dapr/tap/dapr-cli
```

Verify the install:

```bash
dapr --version
```

## Upgrading on Windows

Using the PowerShell script:

```powershell
powershell -Command "iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1 | iex"
```

Or using Winget:

```powershell
winget upgrade Dapr.CLI
```

## Installing a Specific Version

To pin a specific CLI version:

```bash
# Install CLI version 1.12.0
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - \
  | /bin/bash -s 1.12.0
```

## Upgrading the Dapr Runtime After CLI Upgrade

After upgrading the CLI, you may also need to upgrade the Dapr runtime:

```bash
# Upgrade self-hosted runtime by reinitializing
dapr uninstall
dapr init

# Upgrade Kubernetes runtime
dapr upgrade -k --runtime-version 1.13.3
```

## Verifying the Upgrade

```bash
dapr --version
dapr status -k   # for Kubernetes deployments
```

## Summary

Upgrade the Dapr CLI by re-running the official installation script or using a package manager like Homebrew or Winget. After upgrading the CLI, also upgrade the Dapr runtime — use `dapr uninstall` followed by `dapr init` for self-hosted, or `dapr upgrade -k` for Kubernetes — to maintain version compatibility between the CLI and runtime.
