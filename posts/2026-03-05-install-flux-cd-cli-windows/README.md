# How to Install Flux CD CLI on Windows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Windows, CLI, Chocolatey

Description: Step-by-step instructions for installing the Flux CD command-line interface on Windows using Chocolatey, direct download, and WSL.

---

The Flux CLI enables you to manage Flux CD, the GitOps toolkit for Kubernetes, directly from your Windows workstation. This guide covers three methods for installing the Flux CLI on Windows: Chocolatey package manager, direct binary download, and Windows Subsystem for Linux (WSL). Each approach is suitable for different workflows and preferences.

## Prerequisites

Before you begin, ensure you have:

- Windows 10 or later (64-bit)
- Administrator access to your machine
- Optionally, `kubectl` installed and configured for a Kubernetes cluster

## Method 1: Chocolatey (Recommended)

Chocolatey is the most popular package manager for Windows. If you already have it installed, this is the fastest way to get the Flux CLI.

### Install Chocolatey (If Not Already Installed)

Open PowerShell as Administrator and run the following.

```bash
# Install Chocolatey package manager (run in elevated PowerShell)
Set-ExecutionPolicy Bypass -Scope Process -Force; `
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; `
  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

Close and reopen PowerShell after installation.

### Install the Flux CLI

With Chocolatey installed, install the Flux CLI with a single command.

```bash
# Install Flux CLI via Chocolatey (run in elevated PowerShell)
choco install flux
```

Chocolatey downloads the latest Flux CLI release and adds it to your system PATH automatically.

### Verify the Installation

```bash
# Check the Flux CLI version
flux --version
```

You should see output showing the installed version number.

### Update the Flux CLI

When a new version is available, update with Chocolatey.

```bash
# Upgrade Flux CLI to the latest version
choco upgrade flux
```

## Method 2: Direct Binary Download

If you prefer not to use a package manager, you can download the Flux CLI binary directly from the GitHub releases page.

### Download and Extract

Open PowerShell and run the following commands.

```bash
# Set the desired Flux version
$FLUX_VERSION = "2.4.0"

# Create a temporary directory for the download
$TMP_DIR = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }

# Download the Windows binary
Invoke-WebRequest -Uri "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_windows_amd64.zip" -OutFile "$TMP_DIR\flux.zip"

# Extract the archive
Expand-Archive -Path "$TMP_DIR\flux.zip" -DestinationPath "$TMP_DIR"

# Move the binary to a permanent location
New-Item -ItemType Directory -Force -Path "$env:LOCALAPPDATA\flux"
Move-Item -Path "$TMP_DIR\flux.exe" -Destination "$env:LOCALAPPDATA\flux\flux.exe" -Force

# Clean up
Remove-Item -Recurse -Force $TMP_DIR
```

### Add to PATH

Add the Flux binary location to your system PATH so you can run it from any terminal.

```bash
# Add Flux to user PATH (persists across sessions)
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$env:LOCALAPPDATA\flux*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$env:LOCALAPPDATA\flux", "User")
}
```

Restart your terminal for the PATH change to take effect, then verify.

```bash
# Verify the installation
flux --version
```

## Method 3: Windows Subsystem for Linux (WSL)

If you use WSL for your development workflow, you can install the Linux version of the Flux CLI inside your WSL distribution.

Open your WSL terminal and run the standard Linux install command.

```bash
# Install Flux CLI inside WSL
curl -s https://fluxcd.io/install.sh | sudo bash
```

Verify the installation.

```bash
# Check the Flux CLI version in WSL
flux --version
```

This approach is ideal if you already do most of your Kubernetes work from WSL, as it keeps your tooling consistent with Linux environments.

## Running Pre-Flight Checks

Once installed, run the pre-flight check to validate your Kubernetes cluster compatibility.

```bash
# Run Flux pre-flight checks
flux check --pre
```

This verifies cluster connectivity, Kubernetes version, and required permissions.

## Setting Up PowerShell Autocompletion

The Flux CLI supports PowerShell autocompletion. Add it to your PowerShell profile for persistent tab completion.

```bash
# Add Flux autocompletion to your PowerShell profile
Add-Content -Path $PROFILE -Value 'command -v flux | Out-Null; if ($?) { flux completion powershell | Out-String | Invoke-Expression }'
```

If your profile file does not exist yet, create it first.

```bash
# Create the PowerShell profile if it does not exist
if (!(Test-Path -Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
}

# Add Flux completion
Add-Content -Path $PROFILE -Value 'flux completion powershell | Out-String | Invoke-Expression'
```

Reload your profile or restart PowerShell.

```bash
# Reload the PowerShell profile
. $PROFILE
```

## Common CLI Commands

Here are some frequently used Flux CLI commands to get started.

```bash
# Show all available commands
flux --help

# Bootstrap Flux on a cluster with GitHub
flux bootstrap github --owner=<user> --repository=<repo> --branch=main --path=./clusters/my-cluster --personal

# Check the health of Flux controllers
flux check

# List all Flux-managed resources
flux get all

# View controller logs
flux logs

# Reconcile a source immediately
flux reconcile source git flux-system
```

## Uninstalling the Flux CLI

To remove the Flux CLI from your Windows system.

Using Chocolatey.

```bash
# Uninstall Flux CLI via Chocolatey
choco uninstall flux
```

If you installed manually, delete the binary and remove the PATH entry.

```bash
# Remove the manually installed binary
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\flux"

# Remove from PATH (edit manually or use the following)
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPath = ($currentPath -split ";" | Where-Object { $_ -notlike "*flux*" }) -join ";"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
```

## Troubleshooting

**Chocolatey command not found:** Ensure you installed Chocolatey in an elevated (Administrator) PowerShell session. Close and reopen your terminal after installation.

**Flux command not recognized:** Your PATH may not include the directory where Flux was installed. For Chocolatey installations, the binary is typically placed in `C:\ProgramData\chocolatey\bin\`. For manual installations, verify the PATH entry points to the correct directory.

**Execution policy errors:** If PowerShell blocks script execution, set the execution policy for your user.

```bash
# Allow script execution for the current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**WSL networking issues:** If Flux in WSL cannot reach your Kubernetes cluster, ensure your kubeconfig is properly configured within the WSL environment and that networking between WSL and your cluster is functional.

## Conclusion

You now have the Flux CD CLI installed on your Windows system. Whether you chose Chocolatey for easy package management, a direct download for full control, or WSL for a Linux-native experience, you are ready to manage GitOps workflows with Flux. The next step is to configure your Kubernetes cluster access and bootstrap Flux to start deploying applications through Git.
