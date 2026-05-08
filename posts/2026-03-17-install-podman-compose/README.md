# How to Install podman-compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Installation

Description: Learn how to install podman-compose on Linux, macOS, and other platforms to run Docker Compose files with Podman.

---

> podman-compose brings Docker Compose compatibility to Podman, letting you reuse existing docker-compose.yml files without Docker.

podman-compose is a Python-based tool that implements Docker Compose-style workflows using Podman as the container runtime. It reads standard `docker-compose.yml` files and translates them into Podman commands, making migration from Docker straightforward for many Compose files.

---

## Installing with pip

The most universal method works on any platform with Python 3.9+ and Podman.

```bash
# Install podman-compose using pip

pip3 install podman-compose

# Verify the installation
podman-compose --version
# Output: podman-compose version 1.x.x
```

## Installing on Fedora / RHEL / CentOS

```bash
# Install from Fedora repositories, or from EPEL-enabled RHEL / CentOS systems
sudo dnf install podman-compose

# Verify
podman-compose --version
```

## Installing on Ubuntu / Debian

```bash
# Install from the package manager
sudo apt update
sudo apt install podman-compose

# Or use pip if the package is not available
pip3 install podman-compose
```

## Installing on macOS

```bash
# Install Podman first if not already installed
brew install podman

# Initialize and start the Podman machine
podman machine init
podman machine start

# Install podman-compose with pip
pip3 install podman-compose

# Verify both are working
podman --version
podman-compose --version
```

## Installing from Source

```bash
# Clone the repository
git clone https://github.com/containers/podman-compose.git
cd podman-compose

# Install in development mode
pip3 install -e .

# Verify
podman-compose --version
```

## Installing with pipx (Isolated Environment)

```bash
# Install pipx if needed
pip3 install pipx
pipx ensurepath

# Install podman-compose in an isolated environment
pipx install podman-compose

# Verify
podman-compose --version
```

## Quick Smoke Test

```bash
# Create a minimal compose file to test
cat > docker-compose.yml << 'EOF'
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
EOF

# Run it with podman-compose
podman-compose up -d

# Verify the container is running
podman ps

# Clean up
podman-compose down
rm docker-compose.yml
```

## Summary

Install podman-compose with pip, your system package manager, or from source. It works on Linux, macOS, and anywhere Python and Podman are available. Once installed, you can run existing `docker-compose.yml` files using Podman as the backend.
