# How to Install Portainer on WSL2 with Ubuntu - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, WSL2, Ubuntu, Docker, Window, Self-Hosted, Development

Description: Run Portainer inside WSL2 on Windows 10/11 using Docker Engine directly in Ubuntu, without Docker Desktop, for a lightweight development container management setup.

## Introduction

WSL2 (Windows Subsystem for Linux 2) lets you run a full Linux environment inside Windows. Installing Docker Engine directly in WSL2 Ubuntu and running Portainer gives you a lightweight container management setup without requiring Docker Desktop. This is particularly useful for development environments and home labs on Windows machines.

## Prerequisites

- Windows 10 version 2004+ or Windows 11
- WSL2 enabled with Ubuntu 22.04 or 24.04
- 8GB RAM recommended

## Step 1: Install and Configure WSL2

```powershell
# In PowerShell (Admin), install WSL2 with Ubuntu

wsl --install -d Ubuntu-22.04
# Restart Windows if prompted

# Set WSL2 as default version
wsl --set-default-version 2

# Verify Ubuntu is using WSL2
wsl -l -v
# Should show Ubuntu-22.04 with VERSION 2
```

## Step 2: Configure WSL2 Resources

Create or edit `%USERPROFILE%\.wslconfig` in Windows:

```ini
[wsl2]
# Allocate up to 8GB RAM (adjust based on your system)
memory=8GB
# Use up to 4 processor cores
processors=4
# Swap file size
swap=2GB
# Enable localhost forwarding
localhostForwarding=true

[experimental]
# Automatically free memory when WSL2 is idle
autoMemoryReclaim=dropCache
```

Apply changes:

```powershell
wsl --shutdown
# Then reopen Ubuntu
```

## Step 3: Update Ubuntu and Install Dependencies

Inside WSL2 Ubuntu:

```bash
# Update Ubuntu
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    iptables
```

## Step 4: Verify Firewall Compatibility

Docker is compatible with both `iptables-nft` and `iptables-legacy` on Ubuntu, so you do not need to switch to `iptables-legacy` just for Docker:

```bash
# Verify
sudo iptables --version
# On current Ubuntu releases this commonly shows: iptables v1.8.x (nf_tables)
```

## Step 5: Install Docker Engine

```bash
# Install Docker Engine (official convenience script for development environments)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

sudo usermod -aG docker $USER
newgrp docker
```

## Step 6: Start Docker in WSL2

Docker doesn't persist across WSL restarts unless you start it again or enable systemd. The supported approach on current WSL releases is to enable systemd:

```bash
# Enable systemd in WSL2
sudo tee /etc/wsl.conf > /dev/null << 'EOF'
[boot]
systemd=true
EOF

# Restart WSL (from PowerShell)
# wsl --shutdown
# Then reopen Ubuntu and enable Docker
sudo systemctl enable --now docker
```

If your WSL build does not support systemd yet, start Docker manually when you open Ubuntu:

```bash
sudo service docker start
```

## Step 7: Deploy Portainer

```bash
docker volume create portainer_data

docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```

## Step 8: Access Portainer from Windows

With WSL2's localhost forwarding, access directly from Windows browser:

```text
https://localhost:9443
```

Portainer uses HTTPS by default on port 9443, so your browser will show a self-signed certificate warning on first access. No additional configuration is needed - WSL2 forwards localhost ports to Windows by default.

## Step 9: Windows Terminal Integration

Windows Terminal automatically creates WSL profiles. If you want a custom entry, add a profile like this:

```json
{
  "name": "Ubuntu-Docker",
  "commandline": "wsl.exe -d Ubuntu-22.04"
}
```

## Start WSL at Windows Logon with Task Scheduler

If you enabled systemd in the previous step, you can launch the Ubuntu distro at Windows logon and let Docker start as part of distro startup:

```powershell
# Create a VBScript to start WSL silently
Set-Content -Path "$env:APPDATA\StartWSL.vbs" -Value @'
Set objShell = CreateObject("WScript.Shell")
objShell.Run "wsl.exe -d Ubuntu-22.04", 0, False
'@

# Register as Task Scheduler task at logon
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "$env:APPDATA\StartWSL.vbs"
$trigger = New-ScheduledTaskTrigger -AtLogon
Register-ScheduledTask -TaskName "Start WSL Docker" -User "$env:USERDOMAIN\$env:USERNAME" -Action $action -Trigger $trigger
```

## Conclusion

WSL2 with Docker Engine and Portainer provides a full Linux container development environment inside Windows without Docker Desktop's licensing requirements. The WSL2 localhost forwarding makes Portainer accessible directly from Windows browsers. With systemd enabled, Docker starts automatically, making this a seamless integrated development environment.
