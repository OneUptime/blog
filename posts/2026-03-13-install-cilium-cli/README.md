# Install Cilium CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, CLI, Kubernetes, Installation, Networking, eBPF

Description: How to install the Cilium CLI tool on various operating systems and use it to install, manage, and troubleshoot Cilium on Kubernetes clusters.

---

## Introduction

The Cilium CLI is the primary tool for installing, managing, and troubleshooting Cilium on Kubernetes clusters. It provides commands for installation, status checks, connectivity testing, and Hubble management — all from a single binary.

This guide covers installing the Cilium CLI on Linux, macOS, and Windows, and walks through the key commands used for day-to-day Cilium operations.

## Prerequisites

- `kubectl` installed and configured for a Kubernetes cluster
- Internet access for downloading the CLI binary
- Administrator/root access for system-wide installation

## Step 1: Install Cilium CLI on Linux

```bash
# Detect the system architecture
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi

# Download the Cilium CLI binary
curl -L --fail --remote-name-all \
  https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}

# Verify the checksum
sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum

# Extract and install to /usr/local/bin
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin

# Clean up downloaded files
rm cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}

# Verify the installation
cilium version
```

## Step 2: Install Cilium CLI on macOS

```bash
# Install via Homebrew (recommended for macOS)
brew install cilium-cli

# Verify installation
cilium version

# Alternatively, install manually:
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)

# Detect architecture (Intel or Apple Silicon)
if [ "$(uname -m)" = "arm64" ]; then
  curl -L --fail --remote-name-all \
    https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-darwin-arm64.tar.gz{,.sha256sum}
  shasum -a 256 -c cilium-darwin-arm64.tar.gz.sha256sum
  sudo tar xzvfC cilium-darwin-arm64.tar.gz /usr/local/bin
  rm cilium-darwin-arm64.tar.gz{,.sha256sum}
else
  curl -L --fail --remote-name-all \
    https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-darwin-amd64.tar.gz{,.sha256sum}
  shasum -a 256 -c cilium-darwin-amd64.tar.gz.sha256sum
  sudo tar xzvfC cilium-darwin-amd64.tar.gz /usr/local/bin
  rm cilium-darwin-amd64.tar.gz{,.sha256sum}
fi
```

## Step 3: Install Cilium CLI on Windows

```powershell
# Using PowerShell - download the Windows binary
$CILIUM_CLI_VERSION = (Invoke-WebRequest -URI "https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt" -UseBasicParsing).Content.Trim()
$ARCH = if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -eq "Arm64") { "arm64" } else { "amd64" }

# Download Cilium CLI for Windows
Invoke-WebRequest -URI "https://github.com/cilium/cilium-cli/releases/download/$CILIUM_CLI_VERSION/cilium-windows-$ARCH.zip" -OutFile "cilium-windows.zip"
Expand-Archive -Path "cilium-windows.zip" -DestinationPath "$Env:ProgramFiles\cilium"

# Add to PATH
$env:PATH += ";$Env:ProgramFiles\cilium"
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$Env:ProgramFiles\cilium", "User")

# Verify
cilium.exe version
```

## Step 4: Install Cilium on a Kubernetes Cluster

With the CLI installed, deploy Cilium to your cluster:

```bash
# Install Cilium with default settings
cilium install

# Install a specific version
cilium install --version 1.15.0

# Install with custom values
cilium install \
  --version 1.15.0 \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true

# Check installation status
cilium status --wait
```

## Step 5: Common Cilium CLI Commands

```bash
# Check Cilium status across all nodes
cilium status

# Run the built-in connectivity test suite
cilium connectivity test

# Enable Hubble observability
cilium hubble enable

# Open Hubble UI in browser
cilium hubble ui

# Upgrade Cilium to a new version
cilium upgrade --version 1.15.1

# View Cilium configuration
cilium config view

# Check for configuration issues
cilium sysdump --output-filename cilium-sysdump-$(date +%Y%m%d)

# Uninstall Cilium
cilium uninstall
```

## Best Practices

- Pin the Cilium CLI version to match your cluster's Cilium version for compatibility
- Run `cilium connectivity test` after every Cilium upgrade to verify network policies are working
- Use `cilium sysdump` to collect diagnostic information when troubleshooting network issues
- Install the Hubble CLI alongside the Cilium CLI for network flow observability
- Keep the Cilium CLI in your team's approved tooling list with a documented upgrade procedure

## Conclusion

The Cilium CLI is an essential tool for anyone operating Cilium on Kubernetes. Its installation commands, status checks, and connectivity tests make Cilium operations significantly easier than managing Helm releases directly. Install it on all platforms where your team manages Kubernetes clusters, and make `cilium status` and `cilium connectivity test` part of your standard cluster health check runbook.
