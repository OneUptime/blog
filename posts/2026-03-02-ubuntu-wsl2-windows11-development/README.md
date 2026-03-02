# How to Install Ubuntu WSL 2 on Windows 11 for Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WSL2, Windows, Development

Description: Step-by-step guide to installing Ubuntu on WSL 2 in Windows 11 and configuring it for a productive development workflow.

---

WSL 2 (Windows Subsystem for Linux 2) gives you a genuine Linux kernel running inside Windows, which is a substantial improvement over the translation-layer approach of WSL 1. For developers who work on Windows machines but need a Linux environment, it is significantly more capable than either a virtual machine or Cygwin-style compatibility layers.

## Prerequisites and System Requirements

WSL 2 requires Windows 11 or Windows 10 version 1903 or later (build 18362+). On Windows 11, the setup is much smoother since WSL 2 is the default.

Check your Windows version:
- Press `Win + R`, type `winver`, press Enter

You also need virtualization enabled in BIOS/UEFI. Most modern machines have this on by default, but if WSL fails to start, check your firmware settings for "Intel VT-x" or "AMD-V."

## Installing WSL and Ubuntu

Open PowerShell or Command Prompt as Administrator:

```powershell
# Install WSL with the default Ubuntu distribution
wsl --install

# Or install with a specific Ubuntu version
wsl --install -d Ubuntu-24.04
```

This command enables the necessary Windows features, downloads the Linux kernel, and installs Ubuntu from the Microsoft Store. After it completes, you need to reboot Windows.

After rebooting, Ubuntu will launch automatically and prompt you to create a Linux username and password. This is independent of your Windows credentials.

```bash
# After the initial setup completes, update the package list
sudo apt update && sudo apt upgrade -y
```

### Listing Available Distributions

```powershell
# See what distributions are available to install
wsl --list --online

# See what's currently installed
wsl --list --verbose
```

### Verifying WSL 2 Is Active

```powershell
# Check which version is running
wsl --status

# Ensure Ubuntu is using WSL 2 (not WSL 1)
wsl --list --verbose
# Look for VERSION column showing 2
```

If a distribution shows VERSION 1, convert it:

```powershell
wsl --set-version Ubuntu-24.04 2
```

## Accessing the Ubuntu Environment

You can open an Ubuntu terminal from:
- Start menu - search for "Ubuntu"
- Windows Terminal (recommended) - it automatically adds Ubuntu as a profile
- `wsl` command in PowerShell or Command Prompt

Windows Terminal is the best way to work with WSL. Install it from the Microsoft Store if it is not already present.

## Navigating the Filesystem

WSL 2 mounts Windows drives under `/mnt/`:

```bash
# Access Windows C: drive
ls /mnt/c/Users/YourWindowsUsername/

# Navigate to Windows Desktop
cd /mnt/c/Users/YourWindowsUsername/Desktop
```

Your Linux home directory is separate from Windows:

```bash
# Linux home
echo $HOME
# /home/yourusername

# Access Linux files from Windows Explorer
# Type this in the address bar: \\wsl$\Ubuntu-24.04\home\yourusername
```

For performance-sensitive work, keep your project files in the Linux filesystem (`~/projects/`) rather than on `/mnt/c/`. Filesystem operations across the WSL/Windows boundary are significantly slower than native Linux filesystem operations.

## Setting Up a Development Environment

### Installing Common Development Tools

```bash
# Essential build tools
sudo apt install -y build-essential git curl wget

# Node.js via nvm (recommended over apt for version management)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts

# Python tools
sudo apt install -y python3 python3-pip python3-venv

# Docker CLI (see Docker Desktop WSL integration section)
```

### Installing Docker

The cleanest approach is installing Docker Desktop on Windows with WSL 2 backend enabled. Docker Desktop integrates directly with WSL 2 distributions, meaning you can run `docker` commands from Ubuntu without running a separate Docker daemon inside WSL.

Alternatively, install Docker Engine directly inside WSL:

```bash
# Remove any old Docker packages
sudo apt remove docker docker-engine docker.io containerd runc

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add the Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Add your user to the docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo service docker start
```

## Configuring WSL Resources

By default, WSL 2 can use up to 50% of your system RAM and all logical processors. You can tune this in a `.wslconfig` file in your Windows home directory:

```ini
# C:\Users\YourWindowsUsername\.wslconfig

[wsl2]
# Limit memory usage
memory=8GB

# Limit CPU cores
processors=4

# Set custom swap size
swap=4GB

# Disable page reporting (can improve performance)
pageReporting=false
```

Apply changes by restarting WSL:

```powershell
wsl --shutdown
# Then reopen Ubuntu
```

## Configuring the Ubuntu Environment

### Shell Setup

```bash
# Install zsh and oh-my-zsh for a better shell experience
sudo apt install -y zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Or customize bash with a better prompt
echo 'PS1="\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> ~/.bashrc
```

### SSH Key Generation

```bash
# Generate an SSH key for GitHub or other services
ssh-keygen -t ed25519 -C "your_email@example.com"

# Start ssh-agent and add the key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard (from WSL)
cat ~/.ssh/id_ed25519.pub | clip.exe
```

### Git Configuration

```bash
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"
git config --global core.autocrlf false  # Important: prevent CRLF issues
git config --global init.defaultBranch main
```

Setting `core.autocrlf false` is important. Without it, Git may convert line endings when checking out files, which causes issues with shell scripts and config files.

## VS Code Integration

Visual Studio Code has first-class WSL support through the Remote - WSL extension. Install VS Code on Windows, then from inside Ubuntu:

```bash
# Open current directory in VS Code (connects via WSL)
code .
```

This installs a VS Code server inside WSL and connects the Windows VS Code client to it. Extensions run inside Linux, giving you proper Linux toolchain access without any path issues.

## Common Issues

### WSL is slow to start

```powershell
# Check if any WSL processes are stuck
wsl --list --running

# Shut down all distributions and restart
wsl --shutdown
```

### Network connectivity issues inside WSL

```bash
# If DNS is broken, check /etc/resolv.conf
cat /etc/resolv.conf

# Manually set a DNS server
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
```

### Cannot access localhost from Windows

WSL 2 uses a virtual network, so `localhost` inside WSL maps to the WSL VM's IP, not the Windows host. Windows 11 22H2 and later have automatic localhost forwarding. For older builds, find the WSL IP:

```bash
# Get WSL IP address
ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
```

WSL 2 remains one of the most practical ways to run a full Linux development environment alongside Windows. The filesystem performance and kernel compatibility are close enough to native Linux that most development workflows translate without modification.
