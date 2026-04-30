# How to Install OpenTofu on Windows Using Chocolatey

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Window, Chocolatey, Installation, Infrastructure as Code, DevOps

Description: A guide to installing OpenTofu on Windows using the Chocolatey package manager for easy management.

## Introduction

Chocolatey is a popular package manager for Windows that simplifies software installation and updates. This guide walks you through installing OpenTofu on Windows using Chocolatey.

## Prerequisites

- Windows 10 or Windows 11
- PowerShell 5.1 or later
- Administrator privileges

## Step 1: Install Chocolatey

If Chocolatey is not already installed, run the following in an elevated PowerShell:

```powershell
# Open PowerShell as Administrator, then run:

Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

```powershell
# Verify Chocolatey installation
choco --version
```

## Step 2: Install OpenTofu via Chocolatey

```powershell
# Open an elevated PowerShell or Command Prompt and run:
choco install opentofu

# Or install a specific version
choco install opentofu --version=1.9.0

# Accept prompts automatically
choco install opentofu -y
```

## Step 3: Verify the Installation

```powershell
# Check the installed version
tofu version

# Expected output:
# OpenTofu v1.x.y
# on windows_amd64

# Check binary location in PowerShell
(Get-Command tofu).Source
# C:\ProgramData\chocolatey\bin\tofu.exe
```

## Using OpenTofu on Windows

### Setting Up a Project

```powershell
# Create a project directory
New-Item -ItemType Directory -Path "C:\projects\tofu-test"
Set-Location "C:\projects\tofu-test"
```

```hcl
# C:\projects\tofu-test\main.tf
terraform {
  required_version = ">= 1.6"
}

variable "environment" {
  type    = string
  default = "development"
}

output "welcome" {
  value = "OpenTofu is running on Windows in ${var.environment}!"
}
```

```powershell
# Initialize and apply
tofu init
tofu plan
tofu apply -auto-approve
```

## Setting Up Shell Completion on Windows (Bash/Zsh)

```powershell
# OpenTofu's built-in autocomplete installer supports bash and zsh shells.
# If you use Git Bash or WSL on Windows, run:
tofu -install-autocomplete
```

## Working with Environment Variables

```powershell
# Set provider credentials as environment variables
$env:AWS_ACCESS_KEY_ID = "your-access-key"
$env:AWS_SECRET_ACCESS_KEY = "your-secret-key"
$env:AWS_DEFAULT_REGION = "us-east-1"

# Set OpenTofu variable via environment variable
$env:TF_VAR_environment = "production"

# Run OpenTofu
tofu plan
```

## Updating OpenTofu

```powershell
# Update OpenTofu using Chocolatey
choco upgrade opentofu

# Update to a specific version
choco upgrade opentofu --version=1.10.0

# Verify the new version
tofu version
```

## Uninstalling OpenTofu

```powershell
# Remove OpenTofu
choco uninstall opentofu

# Verify removal
Get-Command tofu -ErrorAction SilentlyContinue  # Should return no result
```

## Tips for Windows Users

### Using Windows Subsystem for Linux (WSL)

Many infrastructure engineers prefer using WSL on Windows for a Linux-like experience:

```bash
# In WSL, install OpenTofu using the Ubuntu/Debian method
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg

# Follow the Ubuntu installation guide
```

### Using with Windows Terminal

Windows Terminal provides a better experience for running OpenTofu:

```powershell
# Install Windows Terminal (if not installed)
choco install microsoft-windows-terminal

# Install OpenTofu
choco install opentofu
```

## Conclusion

Chocolatey makes installing and managing OpenTofu on Windows simple and consistent. With a single command, you can install, update, and remove OpenTofu without manually managing binaries and PATH variables. This is the recommended approach for Windows-based infrastructure engineers working with OpenTofu.
