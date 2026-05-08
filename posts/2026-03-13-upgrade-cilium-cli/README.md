# Upgrade the Cilium CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, CLI, Kubernetes, Tool

Description: Learn how to upgrade the Cilium CLI tool to stay current with new features and ensure compatibility with your Cilium cluster version, including verification and troubleshooting steps.

---

## Introduction

The Cilium CLI (`cilium`) is the primary operational tool for managing Cilium installations, running connectivity tests, enabling observability features, and performing upgrades. Keeping the Cilium CLI current is important for two reasons: CLI versions must be compatible with the Cilium version running in your cluster, and newer CLI versions include improved diagnostics, connectivity tests, and operational commands.

Unlike Cilium itself (which is a cluster component), the Cilium CLI is a local tool installed on operator workstations and CI/CD systems. It's easy to let the CLI fall behind, but an outdated CLI may fail to connect to newer Cilium APIs or lack important diagnostic capabilities.

This guide covers how to check the current Cilium CLI version, upgrade it to the latest or a specific version, verify the upgrade, and troubleshoot common upgrade issues across different operating systems and installation methods.

## Prerequisites

- `cilium` CLI currently installed
- `kubectl` configured for a cluster
- Internet access to download the new CLI version
- Write access to the CLI installation path (typically `/usr/local/bin`)

## Step 1: Check Current CLI Version and Compatibility

Before upgrading, check the current version and its compatibility with your cluster.

```bash
# Check current cilium CLI version without contacting the cluster
cilium version --client

# Compare with the Cilium version in the cluster
# The CLI should be a maintained release compatible with the cluster Cilium version
cilium status | grep -A3 "Image versions"

# Check cluster status details
cilium status --verbose
```

## Step 2: Find the Latest Cilium CLI Release

Check what versions are available before upgrading.

```bash
# Check the latest stable Cilium CLI release
curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt

# Or browse releases directly
# Visit: https://github.com/cilium/cilium-cli/releases

# Check available versions for a specific minor release
curl -s https://api.github.com/repos/cilium/cilium-cli/releases | \
  jq -r '.[].tag_name' | grep "^v0.19" | head -10
```

## Step 3: Upgrade the Cilium CLI on Linux

Download and install the new version on Linux.

```bash
# Set the target version
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)

# Detect system architecture
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi

# Download the CLI binary and its checksum
cd /tmp
curl -L --fail --remote-name-all \
  "https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz"{,.sha256sum}

# Verify the checksum before installing
sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum

# Extract and install
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin

# Verify the installed version
cilium version --client
```

## Step 4: Upgrade on macOS

Install via Homebrew or direct download on macOS.

```bash
# Option A: Upgrade via Homebrew (simplest)
brew upgrade cilium-cli

# Verify version
cilium version --client

# Option B: Direct download for specific version
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "arm64" ]; then CLI_ARCH=arm64; fi

cd /tmp
curl -L --fail --remote-name-all \
  "https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-darwin-${CLI_ARCH}.tar.gz"{,.sha256sum}

# Verify checksum
shasum -a 256 -c cilium-darwin-${CLI_ARCH}.tar.gz.sha256sum

# Install
sudo tar xzvfC cilium-darwin-${CLI_ARCH}.tar.gz /usr/local/bin
cilium version --client
```

## Step 5: Verify CLI Upgrade and Cluster Compatibility

After upgrading the CLI, verify it works correctly with your cluster.

```bash
# Verify the new CLI version
cilium version --client

# Test CLI connectivity to the cluster
cilium status

# Run a quick connectivity check to verify CLI-cluster compatibility
cilium connectivity test --test pod-to-pod --timeout 2m

# Enable Hubble if not enabled (new CLI versions may have enhanced hubble commands)
cilium hubble enable

# Verify Hubble is accessible
cilium hubble port-forward &
sleep 3
hubble status
```

## Best Practices

- Always verify the SHA256 checksum after downloading the CLI binary
- Keep the Cilium CLI version compatible with the Cilium version in your clusters
- Add the Cilium CLI upgrade to your platform team's regular maintenance checklist
- In CI/CD pipelines, pin the Cilium CLI version explicitly - don't use `latest`
- Keep multiple CLI versions available when managing clusters on different Cilium versions

## Conclusion

Keeping the Cilium CLI current ensures you have access to the latest diagnostic capabilities and that it remains compatible with the Cilium version in your cluster. The upgrade process is straightforward: download the binary, verify the checksum, replace the binary, and test against your cluster. For production operations teams, automating the CLI upgrade as part of regular maintenance ensures it never falls significantly behind the cluster version.
