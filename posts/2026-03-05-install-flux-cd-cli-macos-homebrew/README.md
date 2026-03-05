# How to Install Flux CD CLI on macOS with Homebrew

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, macOS, Homebrew, CLI

Description: Learn how to install and configure the Flux CD command-line interface on macOS using Homebrew for managing GitOps workflows.

---

The Flux CLI is the primary tool for interacting with Flux CD, the GitOps toolkit for Kubernetes. It allows you to bootstrap Flux on clusters, manage sources and kustomizations, trigger reconciliations, and debug issues. On macOS, the easiest way to install the Flux CLI is through Homebrew. This guide covers the complete installation process, verification steps, and initial configuration.

## Prerequisites

Before installing the Flux CLI, ensure you have the following:

- macOS 10.15 (Catalina) or later
- Homebrew installed on your system
- A terminal application (Terminal.app, iTerm2, or similar)

If you do not have Homebrew installed, you can install it with the following command.

```bash
# Install Homebrew package manager
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Verify Homebrew is working.

```bash
# Check Homebrew version and status
brew --version
```

## Step 1: Add the Flux CD Tap

Flux CD maintains its own Homebrew tap (a third-party repository of formulae). You need to add this tap before installing the CLI.

```bash
# Add the Flux CD Homebrew tap
brew tap fluxcd/tap
```

This registers the `fluxcd/tap` repository so Homebrew knows where to find the Flux formula.

## Step 2: Install the Flux CLI

With the tap added, install the Flux CLI.

```bash
# Install Flux CLI via Homebrew
brew install fluxcd/tap/flux
```

Homebrew will download the latest stable release of the Flux CLI binary, place it in your Homebrew prefix directory (typically `/opt/homebrew/bin` on Apple Silicon or `/usr/local/bin` on Intel Macs), and link it to your PATH.

## Step 3: Verify the Installation

Confirm that the Flux CLI was installed correctly.

```bash
# Display the installed Flux CLI version
flux --version
```

You should see output like `flux version 2.x.x`. Next, check that the binary is in the expected location.

```bash
# Show the path to the flux binary
which flux
```

This should return `/opt/homebrew/bin/flux` on Apple Silicon Macs or `/usr/local/bin/flux` on Intel Macs.

## Step 4: Run a Pre-Flight Check

If you have a Kubernetes cluster configured, run the pre-flight check to ensure Flux can communicate with it.

```bash
# Run Flux pre-flight checks against your current cluster
flux check --pre
```

This validates your Kubernetes version, cluster connectivity, and RBAC permissions. If you do not have a cluster configured yet, you will see a connection error, which is expected.

## Step 5: Enable Shell Autocompletion

The Flux CLI supports shell autocompletion, which makes it much faster to work with. On macOS, most users run either Bash or Zsh. Since macOS Catalina, the default shell is Zsh.

For Zsh, generate and source the completion script.

```bash
# Add Flux autocompletion to your Zsh configuration
echo 'command -v flux >/dev/null && . <(flux completion zsh)' >> ~/.zshrc

# Reload your shell configuration
source ~/.zshrc
```

For Bash, you need `bash-completion` installed first.

```bash
# Install bash-completion if not already present
brew install bash-completion

# Add Flux autocompletion to your Bash configuration
echo 'command -v flux >/dev/null && . <(flux completion bash)' >> ~/.bash_profile

# Reload your shell configuration
source ~/.bash_profile
```

After this, you can type `flux` followed by a space and press Tab to see available subcommands.

## Updating the Flux CLI

Homebrew makes it easy to keep the Flux CLI up to date. Run the following commands periodically.

```bash
# Update Homebrew formulae and upgrade Flux CLI
brew update && brew upgrade fluxcd/tap/flux
```

You can also check if an update is available without installing it.

```bash
# Check for outdated packages including Flux
brew outdated
```

## Exploring the CLI

The Flux CLI has a rich set of commands. Here are some useful ones to get started.

```bash
# Display all available Flux commands
flux --help

# Get help for a specific command
flux bootstrap --help

# Check the status of all Flux resources on your cluster
flux get all

# View Flux controller logs
flux logs

# Export Flux resources as YAML
flux export source git --all
```

## Common CLI Operations

Here is a quick reference of frequently used Flux CLI commands.

```bash
# Bootstrap Flux on a cluster with GitHub
flux bootstrap github \
  --owner=<your-username> \
  --repository=<your-repo> \
  --branch=main \
  --path=./clusters/my-cluster \
  --personal

# Create a GitRepository source
flux create source git my-app \
  --url=https://github.com/example/my-app \
  --branch=main \
  --interval=1m

# Create a Kustomization to deploy from the source
flux create kustomization my-app \
  --source=my-app \
  --path="./deploy" \
  --prune=true \
  --interval=5m

# Trigger a manual reconciliation
flux reconcile kustomization my-app --with-source

# Suspend and resume a kustomization
flux suspend kustomization my-app
flux resume kustomization my-app
```

## Uninstalling the Flux CLI

If you need to remove the Flux CLI from your system, use Homebrew.

```bash
# Remove the Flux CLI
brew uninstall flux

# Optionally remove the tap
brew untap fluxcd/tap
```

## Troubleshooting

If you encounter issues during installation, here are some common solutions.

**Homebrew tap not found:** Make sure you added the tap with `brew tap fluxcd/tap` before attempting to install.

**Permission denied errors:** Ensure your Homebrew installation has the correct ownership. Run `brew doctor` to diagnose issues.

**Old version installed:** If you have a previously installed version via a different method (such as a direct binary download), it may conflict. Remove the old binary first and then install via Homebrew.

```bash
# Check if there are multiple flux binaries
type -a flux

# Remove a manually installed binary if it conflicts
sudo rm /usr/local/bin/flux
```

**Command not found after installation:** Your shell PATH may not include the Homebrew binary directory. Add it to your shell configuration.

```bash
# For Apple Silicon Macs, add Homebrew to PATH
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

## Conclusion

You now have the Flux CD CLI installed on your macOS system via Homebrew. The CLI is your gateway to managing GitOps workflows on Kubernetes clusters. With Homebrew handling updates, you can easily stay current with the latest Flux releases. Next steps include bootstrapping Flux on a Kubernetes cluster and setting up your first GitOps pipeline with automated deployments from a Git repository.
