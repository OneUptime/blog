# How to Install Docker CE on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Docker, Containers, Linux

Description: Learn how to install Docker CE on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Docker CE (Community Edition) can be installed on RHEL 9 alongside or as an alternative to Podman. While RHEL ships with Podman by default, some workloads and development teams prefer Docker for its ecosystem compatibility.

## Prerequisites

- RHEL 9
- Root or sudo access

## Step 1: Remove Conflicting Packages

```bash
sudo dnf remove -y podman buildah containers-common
```

## Step 2: Add Docker Repository

```bash
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
```

## Step 3: Install Docker

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Step 4: Start and Enable Docker

```bash
sudo systemctl enable --now docker
sudo systemctl status docker
```

## Step 5: Add User to Docker Group

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## Step 6: Verify Installation

```bash
docker run hello-world
docker version
docker info
```

## Step 7: Configure Docker Daemon

```bash
sudo vi /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-address-pools": [
    {"base": "172.17.0.0/16", "size": 24}
  ]
}
```

```bash
sudo systemctl restart docker
```

## Step 8: Configure Firewall

Docker manages its own iptables rules, but you may need:

```bash
sudo firewall-cmd --permanent --zone=trusted --add-interface=docker0
sudo firewall-cmd --reload
```

## Conclusion

Docker CE on RHEL 9 provides the familiar Docker experience with daemon-based container management. While Podman is the RHEL default, Docker remains a popular choice for teams with existing Docker-based workflows and CI/CD pipelines.
