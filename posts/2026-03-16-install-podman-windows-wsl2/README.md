# How to Install Podman on Windows with WSL2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, Window, WSL2

Description: Learn how to install and run Podman on Windows using WSL2, including both the native Windows installer and the WSL2 Linux approach.

---

> With WSL2 and the Podman Windows installer, you can run Linux containers on Windows without Docker Desktop.

Podman on Windows works through two approaches: the native Podman for Windows installer that uses a managed WSL2 or Hyper-V machine, or installing Podman directly inside a WSL2 Linux distribution. This guide covers both methods so you can choose the one that best fits your workflow.

---

## Prerequisites

- Windows 11 for the Podman for Windows installer, or Windows 10 version 2004+ for installing Podman directly inside WSL2
- WSL2 enabled
- Administrator access
- At least 4GB of free RAM

## Method 1: Podman for Windows Installer (Recommended)

### Step 1: Install WSL2

If you have not already enabled WSL2:

```bash
# Open PowerShell as Administrator and enable WSL2

wsl --install

# Restart your computer if prompted
# After restart, verify WSL2 is the default version
wsl --set-default-version 2
```

### Step 2: Download and Install Podman

Download the Podman Windows installer using PowerShell:

```bash
# Download the latest Podman installer using winget
winget install RedHat.Podman
```

Alternatively, download the MSI installer from the Podman GitHub releases page and run it.

### Step 3: Initialize the Podman Machine

Open a new PowerShell or Command Prompt window:

```bash
# Initialize a Podman machine (creates a WSL2-based machine if WSL is the selected provider)
podman machine init

# Start the machine
podman machine start
```

### Step 4: Verify the Installation

```bash
# Check the Podman version
podman --version

# View system information
podman info

# Run a test container
podman run --rm docker.io/library/hello-world
```

## Method 2: Install Podman Inside WSL2

### Step 1: Install a WSL2 Linux Distribution

```bash
# List available distributions
wsl --list --online

# Install Ubuntu (or your preferred distribution)
wsl --install -d Ubuntu
```

### Step 2: Update the WSL2 Distribution

Open your WSL2 terminal:

```bash
# Update packages inside WSL2
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Podman in WSL2

```bash
# Install Podman inside the WSL2 distribution
sudo apt install -y podman

# Install rootless dependencies
sudo apt install -y slirp4netns uidmap fuse-overlayfs
```

### Step 4: Configure Rootless Containers

```bash
# Add subuid and subgid mappings
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)
```

### Step 5: Verify the Installation

```bash
# Check the version
podman --version

# Run a test container
podman run --rm docker.io/library/hello-world
```

## Configuring Docker Compatibility on Windows

### Set Up the Docker CLI Alias

For Method 1 (Podman for Windows):

```bash
# In PowerShell, create a Docker alias
# Add this to your PowerShell profile ($PROFILE)
Set-Alias -Name docker -Value podman
```

For Method 2 (WSL2 installation):

```bash
# Inside WSL2, add the alias to your shell profile
echo 'alias docker=podman' >> ~/.bashrc
source ~/.bashrc
```

## Running a Practical Example

### Using Podman from Windows (Method 1)

```bash
# Run Nginx and access it from Windows
podman run -d --name web-test -p 8080:80 docker.io/library/nginx:latest

# Test from PowerShell
Invoke-WebRequest -Uri http://localhost:8080

# Or open in your browser
start http://localhost:8080

# Clean up
podman stop web-test
podman rm web-test
```

### Using Podman from WSL2 (Method 2)

```bash
# Run a container inside WSL2
podman run -d --name web-test -p 8080:80 docker.io/library/nginx:latest

# Test from WSL2
curl http://localhost:8080

# Access from Windows browser at http://localhost:8080

# Clean up
podman stop web-test
podman rm web-test
```

## Managing the Podman Machine (Method 1)

```bash
# Check machine status
podman machine list

# Stop the machine when not in use
podman machine stop

# Start it again when needed
podman machine start

# SSH into the machine for troubleshooting
podman machine ssh

# Remove and recreate the machine if needed
podman machine rm
podman machine init
podman machine start
```

## Integrating with VS Code

Use Podman with Visual Studio Code Dev Containers:

```bash
# Install the Dev Containers extension in VS Code
# Then set the Docker path to Podman

# For Method 1, add to VS Code settings.json:
# "dev.containers.dockerPath": "podman"

# For Method 2, add to VS Code settings.json:
# "dev.containers.dockerPath": "podman"
# "dev.containers.executeInWSL": true
```

## Troubleshooting

If `podman machine start` fails:

```bash
# Check WSL2 status
wsl --status

# Ensure WSL2 is the default version
wsl --set-default-version 2

# Update WSL2
wsl --update

# Try reinitializing the machine
podman machine rm
podman machine init
podman machine start
```

If port forwarding does not work from Windows:

```bash
# For WSL2 method, check localhost forwarding in %USERPROFILE%\.wslconfig
# Create or edit the file from Windows and add:
# [wsl2]
# localhostForwarding=true

# Restart WSL from PowerShell
wsl --shutdown
```

If containers run slowly:

```bash
# Allocate more resources to WSL2
# Create or edit %USERPROFILE%\.wslconfig in Windows
# Add:
# [wsl2]
# memory=4GB
# processors=2

# Restart WSL for changes to take effect
wsl --shutdown
```

## Summary

Podman on Windows gives you full Linux container support without Docker Desktop. The native Podman for Windows installer with its managed WSL2 machine provides the simplest experience, while installing directly inside WSL2 gives more control. Both methods support rootless containers and Docker CLI compatibility.
