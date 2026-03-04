# How to Install Docker CE on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Docker, Containers, Docker CE, DevOps

Description: Learn how to install Docker Community Edition on RHEL, configure it for non-root usage, and set up storage drivers.

---

Docker CE (Community Edition) provides container runtime capabilities on RHEL. While RHEL ships with Podman as the default container tool, Docker CE can be installed from Docker's official repository.

## Removing Conflicting Packages

```bash
# Remove any conflicting packages
sudo dnf remove -y docker \
  docker-client \
  docker-client-latest \
  docker-common \
  docker-latest \
  docker-latest-logrotate \
  docker-logrotate \
  docker-engine \
  podman \
  runc
```

## Adding the Docker Repository

```bash
# Install required packages
sudo dnf install -y dnf-plugins-core

# Add Docker's official repository
sudo dnf config-manager --add-repo \
  https://download.docker.com/linux/rhel/docker-ce.repo
```

## Installing Docker CE

```bash
# Install Docker CE, CLI, and containerd
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl enable --now docker

# Verify the installation
sudo docker run hello-world
```

## Running Docker as Non-Root

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker

# Verify non-root access
docker run hello-world
```

## Configuring the Docker Daemon

```bash
# Create the daemon configuration file
sudo mkdir -p /etc/docker
cat << 'DAEMON' | sudo tee /etc/docker/daemon.json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-address-pools": [
    {"base": "172.17.0.0/16", "size": 24}
  ],
  "live-restore": true
}
DAEMON

# Restart Docker to apply
sudo systemctl restart docker
```

## Configuring Storage

```bash
# Check the current storage driver
docker info | grep "Storage Driver"

# If you have a dedicated disk for Docker, configure it:
sudo systemctl stop docker
sudo mv /var/lib/docker /var/lib/docker.bak

# Mount a dedicated filesystem
sudo mkfs.xfs /dev/sdb
sudo mkdir /var/lib/docker
sudo mount /dev/sdb /var/lib/docker

# Add to /etc/fstab for persistence
echo "/dev/sdb /var/lib/docker xfs defaults 0 0" | sudo tee -a /etc/fstab

sudo systemctl start docker
```

## Firewall Configuration

```bash
# Docker manages iptables rules automatically
# If using firewalld, add the docker zone
sudo firewall-cmd --permanent --zone=trusted --add-interface=docker0
sudo firewall-cmd --reload
```

## Verifying the Installation

```bash
# Check Docker version
docker version

# Check Docker system info
docker info

# Run a test container
docker run -d -p 8080:80 --name test-nginx nginx
curl http://localhost:8080
docker rm -f test-nginx
```

The `live-restore` option in the daemon configuration allows containers to keep running when the Docker daemon is stopped or upgraded, reducing downtime during Docker updates.
