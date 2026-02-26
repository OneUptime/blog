# How to Install ArgoCD CLI on macOS, Linux, and Windows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI

Description: A complete guide to installing the ArgoCD command-line interface on macOS, Linux, and Windows, including version management and shell completions.

---

The ArgoCD CLI is the primary tool for interacting with ArgoCD from the command line. While the web UI is great for visualization, the CLI is essential for scripting, CI/CD integration, and quick operations. It lets you create applications, trigger syncs, manage repositories, configure RBAC, and much more - all without opening a browser.

This guide covers installation on every major platform, version management, shell completions, and common post-install configuration.

## macOS Installation

### Using Homebrew (Recommended)

Homebrew is the easiest way to install and update the ArgoCD CLI on macOS.

```bash
# Install ArgoCD CLI
brew install argocd

# Verify installation
argocd version --client
```

To update later:

```bash
brew upgrade argocd
```

### Using curl (Manual Download)

If you prefer not to use Homebrew, download the binary directly.

For Apple Silicon (M1/M2/M3/M4):

```bash
# Download for Apple Silicon
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-darwin-arm64

# Make it executable
chmod +x argocd

# Move to a directory in your PATH
sudo mv argocd /usr/local/bin/

# Verify
argocd version --client
```

For Intel Macs:

```bash
# Download for Intel Mac
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-darwin-amd64

chmod +x argocd
sudo mv argocd /usr/local/bin/

argocd version --client
```

### Specific Version on macOS

To install a specific version instead of the latest:

```bash
ARGOCD_VERSION=v2.13.3

# Apple Silicon
curl -sSL -o argocd \
  https://github.com/argoproj/argo-cd/releases/download/${ARGOCD_VERSION}/argocd-darwin-arm64

# Intel
curl -sSL -o argocd \
  https://github.com/argoproj/argo-cd/releases/download/${ARGOCD_VERSION}/argocd-darwin-amd64

chmod +x argocd
sudo mv argocd /usr/local/bin/
```

## Linux Installation

### Using curl (Recommended)

```bash
# Download the latest ArgoCD CLI for Linux
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64

# Make it executable
chmod +x argocd

# Move to a directory in your PATH
sudo mv argocd /usr/local/bin/

# Verify
argocd version --client
```

For ARM64 (like Raspberry Pi, AWS Graviton):

```bash
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-arm64
chmod +x argocd
sudo mv argocd /usr/local/bin/
```

### Using Package Managers

On Arch Linux:

```bash
# From AUR
yay -S argocd-bin
```

On NixOS:

```bash
nix-env -iA nixpkgs.argocd
```

### Specific Version on Linux

```bash
ARGOCD_VERSION=v2.13.3
curl -sSL -o argocd \
  https://github.com/argoproj/argo-cd/releases/download/${ARGOCD_VERSION}/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/
```

## Windows Installation

### Using Chocolatey

```powershell
# Install with Chocolatey
choco install argocd-cli

# Verify
argocd version --client
```

### Using Scoop

```powershell
# Install with Scoop
scoop install argocd

# Verify
argocd version --client
```

### Manual Download

Download the Windows binary manually.

```powershell
# Download using PowerShell
$version = "v2.13.3"
Invoke-WebRequest -Uri "https://github.com/argoproj/argo-cd/releases/download/$version/argocd-windows-amd64.exe" -OutFile "argocd.exe"

# Move to a directory in your PATH
Move-Item argocd.exe C:\Windows\System32\argocd.exe

# Verify
argocd version --client
```

Or download the latest version:

```powershell
Invoke-WebRequest -Uri "https://github.com/argoproj/argo-cd/releases/latest/download/argocd-windows-amd64.exe" -OutFile "argocd.exe"
```

## Docker-Based Installation

If you do not want to install the CLI on your host, run it from a Docker container.

```bash
# Run ArgoCD CLI from Docker
docker run --rm -it argoproj/argocd:v2.13.3 argocd version --client

# Create an alias for convenience
alias argocd='docker run --rm -it -v ~/.kube:/home/argocd/.kube argoproj/argocd:v2.13.3 argocd'
```

## Post-Install Setup

### Shell Completion

Set up tab completion for faster CLI usage.

For Bash:

```bash
# Generate and install bash completion
argocd completion bash | sudo tee /etc/bash_completion.d/argocd > /dev/null

# Or add to your .bashrc
echo 'source <(argocd completion bash)' >> ~/.bashrc
source ~/.bashrc
```

For Zsh:

```bash
# Generate and install zsh completion
argocd completion zsh > "${fpath[1]}/_argocd"

# Or add to your .zshrc
echo 'source <(argocd completion zsh)' >> ~/.zshrc
source ~/.zshrc
```

For Fish:

```bash
# Generate and install fish completion
argocd completion fish | source

# Or save permanently
argocd completion fish > ~/.config/fish/completions/argocd.fish
```

For PowerShell:

```powershell
# Add to your PowerShell profile
argocd completion powershell | Out-String | Invoke-Expression

# Or save permanently
argocd completion powershell >> $PROFILE
```

### Set Default Flags

If you always use certain flags, set them as environment variables.

```bash
# Always use --insecure (for self-signed certs)
export ARGOCD_OPTS="--insecure"

# For core mode (no API server)
export ARGOCD_OPTS="--core"

# Set the ArgoCD server address
export ARGOCD_SERVER="argocd.yourdomain.com"

# Add to your shell profile
echo 'export ARGOCD_SERVER="argocd.yourdomain.com"' >> ~/.bashrc
echo 'export ARGOCD_OPTS="--insecure"' >> ~/.bashrc
```

### Authentication Tokens

For CI/CD pipelines, use authentication tokens instead of username/password.

```bash
# Generate an auth token
argocd account generate-token --account pipeline-user

# Use the token in scripts
export ARGOCD_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIs..."
argocd app list
```

## Managing Multiple ArgoCD Instances

If you work with multiple ArgoCD servers, manage contexts.

```bash
# Login to different servers
argocd login argocd-dev.example.com --name dev
argocd login argocd-staging.example.com --name staging
argocd login argocd-prod.example.com --name prod

# Switch between contexts
argocd context dev
argocd context staging

# List all contexts
argocd context
```

The context information is stored in `~/.config/argocd/config` (or `~/.argocd/config` on older versions).

## Verify CLI-Server Compatibility

The CLI and server versions should match. Check for version mismatches.

```bash
# Show both client and server versions
argocd version

# Output will show something like:
# argocd: v2.13.3+abcdef
# argocd-server: v2.13.3+abcdef
```

If the versions do not match, you may encounter unexpected behavior. Always update the CLI when you upgrade the server.

## Common CLI Commands Quick Reference

Here are the most frequently used commands after installation.

```bash
# Login
argocd login <server-address>

# List applications
argocd app list

# Create an application
argocd app create <name> --repo <url> --path <path> --dest-server <server> --dest-namespace <ns>

# Sync an application
argocd app sync <name>

# Get application details
argocd app get <name>

# View application logs
argocd app logs <name>

# Delete an application
argocd app delete <name>

# List repositories
argocd repo list

# Add a repository
argocd repo add <url>

# List clusters
argocd cluster list

# Add a cluster
argocd cluster add <context>
```

## Troubleshooting

### "command not found" After Installation

Make sure the binary is in a directory listed in your PATH.

```bash
# Check your PATH
echo $PATH

# Check where the binary is
which argocd

# If installed to a custom location, add it to PATH
export PATH=$PATH:/path/to/argocd/directory
```

### Permission Denied

If you get a permission denied error on macOS:

```bash
# macOS may quarantine the downloaded binary
xattr -d com.apple.quarantine /usr/local/bin/argocd
```

### SSL Certificate Errors

When connecting to ArgoCD with self-signed certificates:

```bash
# Use --insecure flag
argocd login argocd.example.com --insecure

# Or set it globally
export ARGOCD_OPTS="--insecure"
```

## Further Reading

- Configure the CLI with your cluster: [Configure ArgoCD CLI](https://oneuptime.com/blog/post/2026-02-26-configure-argocd-cli-with-cluster/view)
- First-time login guide: [Login to ArgoCD CLI](https://oneuptime.com/blog/post/2026-02-26-login-argocd-cli-first-time/view)
- Get the admin password: [Retrieve ArgoCD admin password](https://oneuptime.com/blog/post/2026-02-26-retrieve-argocd-admin-password/view)

The ArgoCD CLI is a fast, scriptable interface to your GitOps platform. Install it on every machine where you need to interact with ArgoCD, set up shell completions, and match the CLI version to your server version for the best experience.
