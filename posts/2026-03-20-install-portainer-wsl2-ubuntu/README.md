# How to Install Portainer on WSL2 with Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, WSL2, Ubuntu, Docker, Window, Self-Hosted

Description: Learn how to install Portainer CE inside WSL2 Ubuntu on Windows to get a Linux-native Docker container management UI on your Windows machine.

## Why Portainer on WSL2?

Windows Subsystem for Linux 2 (WSL2) provides a full Linux kernel on Windows 10/11. Running Docker and Portainer inside WSL2 Ubuntu gives you a native Linux container experience without needing a separate Linux machine or VM.

## Prerequisites

- Windows 10 version 2004+ or Windows 11
- WSL2 enabled
- Ubuntu 22.04 or 24.04 installed from Microsoft Store
- Enough available RAM for Docker workloads (4 GB is a reasonable baseline)

## Step 1: Enable WSL2

Open PowerShell as Administrator:

```powershell
wsl --install
wsl --set-default-version 2
```

Reboot if prompted, then launch Ubuntu to complete first-run setup. If you want a specific Ubuntu release, install it from the Microsoft Store.

## Step 2: Configure WSL2 Memory (Optional)

Create or edit `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
```

Restart WSL2:

```powershell
wsl --shutdown
```

## Step 3: Install Docker in WSL2 Ubuntu

Open your Ubuntu terminal:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

sudo usermod -aG docker $USER
newgrp docker
```

Start Docker:

```bash
sudo service docker start
```

On Windows 11, to start Docker when the distro launches, add to `/etc/wsl.conf`:

```ini
[boot]
command=service docker start
```

Then restart WSL2:

```powershell
wsl --shutdown
```

## Step 4: Create Portainer Volume

```bash
docker volume create portainer_data
```

## Step 5: Run Portainer CE

```bash
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 6: Access Portainer

From your Windows browser, navigate to:

```text
https://localhost:9443
```

WSL2 automatically forwards ports to the Windows host, so `localhost` works directly.

## Troubleshooting

**Docker socket not found:**
```bash
sudo service docker start
ls -la /var/run/docker.sock
```

**Port already in use:** Check Windows for conflicting processes:
```powershell
netstat -ano | findstr :9443
```

**WSL2 networking issues:**
```bash
# Get WSL2 IP

ip addr show eth0
```
Access via the WSL2 IP if localhost forwarding is not working.

## Updating Portainer

```bash
docker stop portainer && docker rm portainer
docker pull portainer/portainer-ce:lts
# Re-run the deploy command
```

## Conclusion

Running Portainer inside WSL2 Ubuntu is an excellent way to get a powerful Linux container management environment on Windows. Port forwarding works automatically, making Portainer accessible directly via localhost from your Windows browser.
