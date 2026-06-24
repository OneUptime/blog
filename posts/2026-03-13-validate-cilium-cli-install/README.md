# Validate Cilium CLI Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, CLI, Kubernetes, Tool

Description: A step-by-step guide to installing and validating the Cilium CLI tool, ensuring it is correctly installed, matches your cluster's Cilium version, and can communicate with your cluster.

---

## Introduction

The Cilium CLI (`cilium`) is the primary tool for managing and validating Cilium installations on Kubernetes clusters. It provides commands for installing Cilium, checking status, running connectivity tests, enabling features like Hubble, and troubleshooting networking issues. Ensuring the CLI is correctly installed and version-compatible with your cluster is a prerequisite for all Cilium validation tasks.

Version mismatches between the CLI and the running Cilium version can cause subtle validation failures where commands succeed but report incorrect information. It is important to install a current CLI version that supports your cluster's Cilium version.

This guide covers CLI installation, version validation, and confirming the CLI can communicate with your Kubernetes cluster.

## Prerequisites

- Kubernetes cluster with Cilium installed
- `kubectl` configured to access the cluster
- Internet access for downloading the Cilium CLI binary
- Linux, macOS, or Windows (WSL2) workstation

## Step 1: Install the Cilium CLI

Install the Cilium CLI using the official installation method.

```bash
# Install the latest stable Cilium CLI on Linux

CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi

curl -L --fail-with-body \
  "https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz" \
  -o /tmp/cilium.tar.gz

# Extract and install to /usr/local/bin
sudo tar xzvfC /tmp/cilium.tar.gz /usr/local/bin
rm /tmp/cilium.tar.gz
```

```bash
# Install on macOS using Homebrew
brew install cilium-cli
```

## Step 2: Verify CLI Installation

Confirm the binary is accessible and working.

```bash
# Check the installed CLI version
cilium version

# Verify the binary is in PATH
which cilium

# Display client version information without requiring cluster access
cilium version --client
```

## Step 3: Validate CLI-to-Cluster Connectivity

Confirm the CLI can connect to your Kubernetes cluster using the current kubeconfig.

```bash
# The 'cilium status' command requires cluster access
# If this succeeds, the CLI is correctly connected to the cluster
cilium status

# Specify a custom kubeconfig if needed
cilium status --kubeconfig ~/.kube/configs/my-cluster.yaml

# Check a specific namespace if Cilium is not in kube-system
cilium status --namespace cilium-system
```

## Step 4: Verify CLI and Cluster Versions

```bash
# Get the Cilium version running in the cluster
kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Compare with the CLI version and confirm it is a current supported release
cilium version

# Check the latest stable CLI version available
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
echo "${CILIUM_CLI_VERSION}"
```

## Step 5: Test Key CLI Commands

Validate that all major CLI functions are operational.

```bash
# Test connectivity test command availability
cilium connectivity test --help

# Test Hubble commands
cilium hubble port-forward --help

# List Cilium-managed endpoints
kubectl get ciliumendpoints --all-namespaces
```

## Best Practices

- Keep the Cilium CLI updated to a current release that supports your cluster
- Use `cilium version` to confirm CLI-cluster version compatibility before running tests
- Install the CLI in your CI/CD pipeline alongside `kubectl` for automated validation
- Consider adding the CLI to your team's development tooling documentation
- Use `cilium sysdump` when collecting troubleshooting data for support tickets

## Conclusion

A correctly installed and version-compatible Cilium CLI is the foundation of all Cilium validation and troubleshooting workflows. By following the installation steps and verifying connectivity to your cluster, you ensure that CLI-based validation commands produce accurate results that reflect the actual state of your cluster's networking.
