# How to Install Docker on Linux Mint

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Linux Mint, Ubuntu, Linux, Installation, DevOps, Containers, Desktop Linux

Description: Step-by-step Docker installation on Linux Mint, addressing the Ubuntu base codename mapping issue and post-install developer workflow tips.

---

Linux Mint is one of the most popular desktop Linux distributions, built on top of Ubuntu. While it is primarily used as a desktop OS, many developers run Docker on their Mint machines for local development, testing, and containerized workflows. The installation process is almost identical to Ubuntu, with one critical difference: Linux Mint uses its own codenames that Docker's repository does not recognize. This guide handles that quirk and gets Docker running smoothly.

## Prerequisites

- Linux Mint 21.x (based on Ubuntu 22.04) or Mint 22.x (based on Ubuntu 24.04)
- A user with sudo access
- An active internet connection

## Understanding the Codename Issue

Linux Mint has its own release codenames (Victoria, Virginia, Wilma, etc.), but Docker's repository uses Ubuntu codenames (jammy, noble, etc.). If you blindly follow Docker's standard Ubuntu instructions, the repository URL will contain the Mint codename, and `apt` will fail to find packages.

The fix is simple: map your Mint version to its Ubuntu base codename.

| Linux Mint | Ubuntu Base | Codename |
|-----------|-------------|----------|
| 21.x      | 22.04       | jammy    |
| 22.x      | 24.04       | noble    |

You can find your Ubuntu base codename with this command.

```bash
# Get the Ubuntu codename underlying your Mint installation
cat /etc/upstream-release/lsb-release | grep CODENAME
```

This returns something like `DISTRIB_CODENAME=noble`.

## Step 1: Remove Old Docker Packages

Clean up any outdated Docker installations.

```bash
# Remove legacy Docker packages
sudo apt-get remove -y docker docker-engine docker.io containerd runc
```

## Step 2: Install Dependencies

Install the packages Docker needs for repository access over HTTPS.

```bash
# Update package index and install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
```

## Step 3: Add Docker's GPG Key

```bash
# Create the keyring directory
sudo install -m 0755 -d /etc/apt/keyrings

# Download Docker's GPG key
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Note that we use the Ubuntu GPG key URL, not a Mint-specific one, because Mint is based on Ubuntu.

## Step 4: Add the Docker Repository (with Ubuntu Codename)

This is where the Mint-specific fix comes in. Instead of using `$(lsb_release -cs)` which would return the Mint codename, we explicitly use the Ubuntu codename.

```bash
# Get the Ubuntu base codename
UBUNTU_CODENAME=$(cat /etc/upstream-release/lsb-release | grep CODENAME | cut -d '=' -f 2)

# Add Docker's repository with the correct Ubuntu codename
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $UBUNTU_CODENAME stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Verify the repository file was created correctly.

```bash
# Check the Docker repo entry
cat /etc/apt/sources.list.d/docker.list
```

The output should reference `jammy` or `noble`, not a Mint codename.

Update the package index.

```bash
# Refresh package lists to include Docker's repo
sudo apt-get update
```

## Step 5: Install Docker Engine

```bash
# Install Docker Engine and all related components
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Step 6: Start and Enable Docker

Docker should start automatically after installation on Mint. Verify this.

```bash
# Check Docker service status
sudo systemctl status docker
```

If it is not running, start and enable it.

```bash
# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker
```

## Step 7: Test the Installation

```bash
# Run the hello-world test container
sudo docker run hello-world
```

## Step 8: Add Your User to the Docker Group

```bash
# Add current user to the docker group
sudo usermod -aG docker $USER
```

Log out and log back in, or run `newgrp docker`.

```bash
# Verify Docker works without sudo
docker ps
```

## Setting Up Docker for Development

Linux Mint is a developer-friendly desktop. Here are some Docker configurations that make development work smoother.

### Enable BuildKit

BuildKit is Docker's improved build engine. It is faster and more cache-efficient.

```bash
# Enable BuildKit globally via daemon.json
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "features": {
    "buildkit": true
  },
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

Or enable it per-build with an environment variable.

```bash
# Use BuildKit for a single build
DOCKER_BUILDKIT=1 docker build -t my-app .
```

### Bind Mount Performance

When developing on Linux Mint, bind mounts perform natively because there is no virtualization layer (unlike Docker Desktop on macOS or Windows). Your source code mounts directly into the container filesystem.

```bash
# Mount your project directory into a container for development
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  -p 3000:3000 \
  node:20-alpine sh -c "npm install && npm run dev"
```

Changes to files on your host are instantly visible inside the container.

### VS Code Dev Containers

If you use VS Code, the Dev Containers extension works seamlessly with Docker on Linux Mint.

```bash
# Install the Dev Containers extension
code --install-extension ms-vscode-remote.remote-containers
```

Create a `.devcontainer/devcontainer.json` in your project.

```json
{
  "name": "My Dev Container",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {},
    "ghcr.io/devcontainers/features/python:1": {}
  },
  "forwardPorts": [3000, 8080],
  "postCreateCommand": "npm install"
}
```

Open the project in VS Code and select "Reopen in Container" from the command palette.

## Running GUI Applications in Docker

Since Mint is a desktop OS, you may want to run GUI applications inside Docker containers.

```bash
# Allow X11 connections from Docker
xhost +local:docker

# Run a GUI application (Firefox example)
docker run -it --rm \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  jess/firefox
```

For Wayland sessions (if you use Cinnamon on Wayland), the approach is different and depends on your compositor.

## Docker Disk Usage Management

Development workflows create a lot of images and containers. Keep your disk clean.

```bash
# See what Docker is using
docker system df

# Remove stopped containers and unused images
docker system prune -f

# Also remove unused volumes (careful - this deletes data)
docker system prune -f --volumes

# Remove images older than 24 hours
docker image prune -a --filter "until=24h"
```

Set up a cron job to clean automatically.

```bash
# Add a weekly Docker cleanup cron job
(crontab -l 2>/dev/null; echo "0 2 * * 0 docker system prune -af --volumes") | crontab -
```

## Troubleshooting

### "E: The repository does not have a Release file"

This almost always means the Mint codename leaked into the Docker repository URL. Check the file.

```bash
# Verify the Docker repo uses the Ubuntu codename
cat /etc/apt/sources.list.d/docker.list
```

Fix it by replacing the Mint codename with the correct Ubuntu codename.

### Docker slows down the desktop

Docker containers share the host kernel and resources. If containers consume too much CPU or memory, your desktop will lag.

```bash
# Limit container resources
docker run -d --cpus=2 --memory=1g my-heavy-app

# Check resource usage across all containers
docker stats
```

### Network Manager conflicts

Mint uses NetworkManager, which can occasionally conflict with Docker's bridge networking. If you lose internet after starting Docker:

```bash
# Restart NetworkManager and Docker
sudo systemctl restart NetworkManager
sudo systemctl restart docker
```

### Permission errors after system update

Mint updates can sometimes reset group memberships. Verify your user is still in the docker group.

```bash
# Check group membership
groups $USER
```

If `docker` is missing, re-add yourself with `sudo usermod -aG docker $USER`.

## Summary

Installing Docker on Linux Mint requires one extra step compared to Ubuntu: mapping the Mint codename to its Ubuntu base when adding Docker's repository. Once that is handled, Docker runs identically to how it runs on Ubuntu. For developers, the combination of Mint's polished desktop experience and Docker's containerization makes for a productive workstation setup.
