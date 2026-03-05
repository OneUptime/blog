# How to Install Flux CD CLI on Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Linux, CLI, Installation

Description: A complete guide to installing the Flux CD command-line interface on Linux using the official install script and alternative methods.

---

The Flux CLI is essential for managing Flux CD, the leading GitOps toolkit for Kubernetes. It handles bootstrapping Flux on clusters, creating and managing sources, triggering reconciliations, and troubleshooting deployments. This guide covers multiple methods for installing the Flux CLI on Linux, including the official install script, direct binary download, and package managers.

## Prerequisites

Make sure you have the following before starting:

- A Linux distribution (Ubuntu, Debian, Fedora, CentOS, Arch, or similar)
- `curl` or `wget` installed
- `sudo` access for system-wide installation
- Optionally, `kubectl` configured for a Kubernetes cluster

## Method 1: Official Install Script (Recommended)

The simplest way to install the Flux CLI on Linux is using the official install script provided by the Flux project.

```bash
# Download and run the official Flux install script
curl -s https://fluxcd.io/install.sh | sudo bash
```

This script detects your system architecture (amd64, arm64, etc.), downloads the appropriate binary, verifies its checksum, and places it in `/usr/local/bin/`.

Verify the installation.

```bash
# Confirm Flux CLI is installed and check version
flux --version
```

## Method 2: Direct Binary Download

If you prefer not to pipe scripts to bash, you can download the binary manually. First, determine your system architecture.

```bash
# Check your system architecture
uname -m
```

Then download the appropriate release from GitHub.

```bash
# Set the desired version (check https://github.com/fluxcd/flux2/releases for latest)
FLUX_VERSION=2.4.0

# Download the binary for amd64 (adjust for your architecture)
curl -sLO "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_linux_amd64.tar.gz"

# Extract the binary
tar xzf flux_${FLUX_VERSION}_linux_amd64.tar.gz

# Move it to a directory in your PATH
sudo mv flux /usr/local/bin/flux

# Make it executable
sudo chmod +x /usr/local/bin/flux

# Clean up the archive
rm flux_${FLUX_VERSION}_linux_amd64.tar.gz
```

For ARM-based systems (such as Raspberry Pi or AWS Graviton), replace `amd64` with `arm64` in the download URL.

```bash
# Download for arm64 architecture
curl -sLO "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_linux_arm64.tar.gz"
```

## Method 3: Using Homebrew on Linux

Homebrew is also available on Linux. If you have it installed, you can use the same method as macOS.

```bash
# Install Flux CLI via Homebrew on Linux
brew install fluxcd/tap/flux
```

## Verifying the Installation

Regardless of which method you used, verify the installation.

```bash
# Display the Flux CLI version
flux --version

# Show where the binary is located
which flux

# Display detailed version information
flux version --client
```

## Running Pre-Flight Checks

If you have a Kubernetes cluster configured, validate that Flux can work with it.

```bash
# Run pre-flight checks against your cluster
flux check --pre
```

This checks your Kubernetes version, cluster connectivity, and required permissions. All checks should return green to indicate compatibility.

## Setting Up Shell Autocompletion

Enable autocompletion to speed up your workflow. For Bash, the most common shell on Linux, do the following.

```bash
# Generate and install Bash completion
# Option 1: Add to your .bashrc for the current user
echo 'command -v flux >/dev/null && . <(flux completion bash)' >> ~/.bashrc
source ~/.bashrc

# Option 2: Install system-wide (requires sudo)
sudo flux completion bash > /etc/bash_completion.d/flux
```

For Zsh users on Linux, use the following.

```bash
# Add Flux completion to Zsh
echo 'command -v flux >/dev/null && . <(flux completion zsh)' >> ~/.zshrc
source ~/.zshrc
```

After setting up autocompletion, pressing Tab after `flux` will show available commands and flags.

## Updating the Flux CLI

To update the Flux CLI to the latest version, simply rerun the install script.

```bash
# Update Flux CLI to the latest version
curl -s https://fluxcd.io/install.sh | sudo bash
```

If you installed via direct download, repeat the download process with the newer version number. If you used Homebrew, run the following.

```bash
# Update via Homebrew
brew update && brew upgrade fluxcd/tap/flux
```

## Exploring the CLI Commands

Get familiar with the available commands.

```bash
# Show all available commands
flux --help

# Get help for bootstrap commands
flux bootstrap --help

# List all Flux resources on your cluster
flux get all

# Check the health of Flux controllers
flux check

# View controller logs
flux logs --all-namespaces

# Export all Git sources as YAML
flux export source git --all
```

## Installing on Specific Distributions

Here are distribution-specific notes for common Linux environments.

### Ubuntu / Debian

The official install script works out of the box. Ensure `curl` is installed.

```bash
# Install curl if not present
sudo apt-get update && sudo apt-get install -y curl

# Then install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash
```

### Fedora / RHEL / CentOS

Similarly, ensure `curl` is available.

```bash
# Install curl if not present
sudo dnf install -y curl

# Then install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash
```

### Arch Linux

Flux is available in the AUR (Arch User Repository).

```bash
# Install from AUR using yay
yay -S flux-bin
```

Alternatively, use the official install script.

## Uninstalling the Flux CLI

To remove the Flux CLI binary from your system.

```bash
# Remove the Flux binary
sudo rm /usr/local/bin/flux

# Remove completion scripts if installed system-wide
sudo rm -f /etc/bash_completion.d/flux
```

If installed via Homebrew.

```bash
# Remove via Homebrew
brew uninstall flux
```

## Troubleshooting

**Permission denied when running the install script:** Make sure you use `sudo` when piping the install script, or download the binary manually and move it with `sudo`.

**Binary not found after installation:** Ensure `/usr/local/bin` is in your PATH. Check with `echo $PATH`. If missing, add it to your shell configuration.

```bash
# Add /usr/local/bin to PATH if missing
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Architecture mismatch:** The install script auto-detects your architecture. If you download manually, make sure you choose the correct binary for your CPU (amd64 vs arm64).

**Checksum verification failure:** This usually indicates a corrupt download. Delete the file and try downloading again. Ensure you have a stable internet connection.

## Conclusion

You have successfully installed the Flux CD CLI on your Linux system. The CLI is your primary interface for managing GitOps workflows with Flux. Whether you used the official install script, a direct download, or Homebrew, you now have the tools needed to bootstrap Flux on Kubernetes clusters and manage continuous delivery pipelines. The next step is to connect the CLI to your Kubernetes cluster and bootstrap Flux with your Git repository.
