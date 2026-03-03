# How to Install talosctl on macOS, Linux, and Windows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Installation, macOS, Linux, Windows, CLI

Description: Step-by-step instructions for installing the talosctl command-line tool on macOS, Linux, and Windows systems.

---

The `talosctl` command-line tool is your primary interface for managing Talos Linux clusters. Unlike traditional Linux distributions where you would SSH into machines and run commands directly, Talos Linux has no shell access at all. Every interaction with a Talos node happens through `talosctl`, which communicates with the Talos API running on each node.

Before you can create or manage a Talos Linux cluster, you need `talosctl` installed on your workstation. This guide covers installation on all three major operating systems.

## What talosctl Does

Think of `talosctl` as your Swiss Army knife for Talos Linux. It handles:

- Generating machine configurations for your cluster
- Applying configurations to nodes
- Bootstrapping Kubernetes
- Retrieving kubeconfig files
- Viewing logs and service status on nodes
- Upgrading Talos Linux on nodes
- Running diagnostics and health checks

It replaces what would traditionally require SSH, systemctl, journalctl, and a handful of other system tools.

## Installing on macOS

The easiest way to install `talosctl` on macOS is through Homebrew.

### Using Homebrew

```bash
# Add the Sidero Labs tap
brew install siderolabs/tap/talosctl
```

That is it. Homebrew handles downloading the correct binary for your architecture, whether you are on an Intel Mac or Apple Silicon.

### Manual Installation on macOS

If you prefer not to use Homebrew, download the binary directly:

```bash
# For Apple Silicon (M1/M2/M3/M4)
curl -sL https://talos.dev/install | sh

# Or download a specific version manually
curl -LO https://github.com/siderolabs/talos/releases/latest/download/talosctl-darwin-arm64
chmod +x talosctl-darwin-arm64
sudo mv talosctl-darwin-arm64 /usr/local/bin/talosctl
```

For Intel Macs, replace `arm64` with `amd64`:

```bash
# For Intel Macs
curl -LO https://github.com/siderolabs/talos/releases/latest/download/talosctl-darwin-amd64
chmod +x talosctl-darwin-amd64
sudo mv talosctl-darwin-amd64 /usr/local/bin/talosctl
```

### Verify the Installation

```bash
# Check the version
talosctl version --client

# Expected output:
# Client:
#     Tag:         v1.9.x
#     SHA:         <commit hash>
#     Built:       ...
#     Go version:  go1.22.x
#     OS/Arch:     darwin/arm64
```

## Installing on Linux

Linux has several installation options depending on your preferences.

### Using the Install Script

The quickest method is the official install script:

```bash
# Download and run the install script
curl -sL https://talos.dev/install | sh
```

This script detects your architecture and downloads the right binary to `/usr/local/bin/talosctl`.

### Manual Download on Linux

For more control, download the binary yourself:

```bash
# For x86_64 / amd64
curl -LO https://github.com/siderolabs/talos/releases/latest/download/talosctl-linux-amd64
chmod +x talosctl-linux-amd64
sudo mv talosctl-linux-amd64 /usr/local/bin/talosctl
```

For ARM64 systems (like Raspberry Pi 4 or AWS Graviton):

```bash
# For arm64
curl -LO https://github.com/siderolabs/talos/releases/latest/download/talosctl-linux-arm64
chmod +x talosctl-linux-arm64
sudo mv talosctl-linux-arm64 /usr/local/bin/talosctl
```

### Using a Package Manager on Linux

On Arch Linux, `talosctl` is available in the AUR:

```bash
# Install from AUR using yay
yay -S talosctl-bin
```

For Nix users:

```bash
# Install with Nix
nix-env -iA nixpkgs.talosctl
```

### Verify the Installation

```bash
# Confirm talosctl is available
talosctl version --client
```

## Installing on Windows

Windows support works well, though most Talos users tend to work from WSL2 (Windows Subsystem for Linux). Both approaches are covered here.

### Using Scoop

Scoop is a popular command-line package manager for Windows:

```powershell
# Install talosctl via Scoop
scoop bucket add sidero https://github.com/siderolabs/scoop-bucket.git
scoop install talosctl
```

### Using Chocolatey

If you use Chocolatey:

```powershell
# Install talosctl via Chocolatey
choco install talosctl
```

### Manual Download on Windows

Download the Windows binary directly:

```powershell
# Download using PowerShell
Invoke-WebRequest -Uri "https://github.com/siderolabs/talos/releases/latest/download/talosctl-windows-amd64.exe" -OutFile "talosctl.exe"
```

Move `talosctl.exe` to a directory that is in your PATH. A common location is `C:\Program Files\talosctl\`:

```powershell
# Create a directory and move the binary
New-Item -ItemType Directory -Path "C:\Program Files\talosctl" -Force
Move-Item talosctl.exe "C:\Program Files\talosctl\talosctl.exe"

# Add to your PATH (run as Administrator)
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\talosctl", "Machine")
```

Open a new terminal window and verify:

```powershell
# Verify the installation
talosctl version --client
```

### Using WSL2 (Recommended for Windows Users)

Many Talos users on Windows prefer working through WSL2, since you get a native Linux environment:

```bash
# Inside your WSL2 terminal, install as you would on Linux
curl -sL https://talos.dev/install | sh
```

This gives you the same experience as working on a Linux workstation.

## Installing a Specific Version

Sometimes you need a specific version of `talosctl`, particularly if your cluster is running an older version of Talos. The client and server versions should ideally match.

```bash
# Install a specific version (replace v1.9.0 with your desired version)
curl -LO https://github.com/siderolabs/talos/releases/download/v1.9.0/talosctl-linux-amd64
chmod +x talosctl-linux-amd64
sudo mv talosctl-linux-amd64 /usr/local/bin/talosctl
```

## Setting Up Shell Completion

`talosctl` supports shell completion for bash, zsh, fish, and PowerShell. This is highly recommended because it makes discovering commands and flags much faster.

```bash
# For bash
talosctl completion bash > /etc/bash_completion.d/talosctl

# For zsh (add to your .zshrc)
echo 'source <(talosctl completion zsh)' >> ~/.zshrc

# For fish
talosctl completion fish > ~/.config/fish/completions/talosctl.fish
```

For PowerShell:

```powershell
# Add to your PowerShell profile
talosctl completion powershell >> $PROFILE
```

## Quick Sanity Check

Once installed, run a few commands to make sure everything is working:

```bash
# Show the client version
talosctl version --client

# Show available commands
talosctl --help

# Generate a sample config (does not require a cluster)
talosctl gen config test-cluster https://10.0.0.1:6443 --output-dir /tmp/talos-test
ls /tmp/talos-test
```

The last command generates sample configuration files. If it works, your `talosctl` installation is fully functional and ready to manage clusters.

## Keeping talosctl Updated

When you upgrade your Talos Linux cluster, you should also upgrade your `talosctl` client to match. With Homebrew:

```bash
# Update talosctl on macOS
brew update && brew upgrade talosctl
```

On Linux, just re-run the install script or download the new version manually. The version mismatch between client and server usually works within a minor version range, but it is best practice to keep them aligned.

With `talosctl` installed, you are ready to start building Talos Linux clusters. The next step is typically generating machine configurations and applying them to your nodes.
