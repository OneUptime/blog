# How to Install a Specific Version of Docker Engine on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Ubuntu, Linux, Installation, Version Management, DevOps, Containers, Version Pinning

Description: How to install a specific version of Docker Engine on Ubuntu instead of the latest, with version pinning to prevent unwanted automatic upgrades.

---

Installing the latest Docker version is not always what you want. Production environments often require a specific, tested version. Kubernetes clusters mandate compatible Docker versions. CI/CD pipelines need reproducible builds across machines. Whatever the reason, this guide shows you how to install an exact Docker Engine version on Ubuntu and lock it in place.

## Why Install a Specific Version?

- **Kubernetes compatibility**: Each Kubernetes release supports specific Docker versions
- **Reproducibility**: All servers in a cluster should run the same Docker version
- **Stability**: Avoid regressions from untested updates
- **Compliance**: Some organizations mandate specific software versions for audit purposes
- **Testing**: Verify your application against a particular Docker release before upgrading production

## Prerequisites

- Ubuntu 22.04, 24.04, or later
- A user with sudo access
- An active internet connection

## Step 1: Set Up Docker's Repository

If you have not added Docker's repository yet, do it now.

```bash
# Install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker's repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package lists
sudo apt-get update
```

## Step 2: List Available Docker Versions

Use `apt-cache madison` to see all available versions in the repository.

```bash
# List all available Docker CE versions
apt-cache madison docker-ce
```

This outputs a table like this:

```
 docker-ce | 5:27.5.1-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages
 docker-ce | 5:27.4.1-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages
 docker-ce | 5:27.3.1-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages
 docker-ce | 5:27.2.1-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages
 docker-ce | 5:27.1.2-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages
 docker-ce | 5:26.1.4-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages
```

The version string in the second column is what you will use for installation. Note the full version format: `5:27.3.1-1~ubuntu.24.04~noble`.

You can also list versions for the CLI.

```bash
# List available Docker CLI versions
apt-cache madison docker-ce-cli
```

The Docker CE and CLI versions should match.

## Step 3: Install the Specific Version

Set the version string and install.

```bash
# Define the version you want to install
VERSION_STRING="5:27.3.1-1~ubuntu.24.04~noble"

# Install Docker CE, CLI, and containerd at the specific version
sudo apt-get install -y \
  docker-ce=$VERSION_STRING \
  docker-ce-cli=$VERSION_STRING \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

If a different version of Docker is already installed, add `--allow-downgrades`.

```bash
# Install a specific version even if a newer one is present
sudo apt-get install -y --allow-downgrades \
  docker-ce=$VERSION_STRING \
  docker-ce-cli=$VERSION_STRING \
  containerd.io
```

## Step 4: Verify the Installed Version

```bash
# Check the Docker version
docker version
```

The output should show your target version for both the Client and Server.

```bash
# Also verify with docker info
docker info | grep "Server Version"
```

## Step 5: Pin the Version

This is the most important step. Without pinning, a regular `apt-get upgrade` will upgrade Docker to the latest version, undoing your careful version selection.

### Method 1: apt-mark hold

```bash
# Hold Docker packages to prevent upgrades
sudo apt-mark hold docker-ce docker-ce-cli containerd.io
```

Verify the hold is in place.

```bash
# List held packages
apt-mark showhold
```

This is the simplest approach. When you run `apt-get upgrade`, held packages are skipped entirely.

To release the hold later:

```bash
# Remove the hold when you're ready to upgrade
sudo apt-mark unhold docker-ce docker-ce-cli containerd.io
```

### Method 2: Apt Preferences (Pin Priority)

For more granular control, use apt preferences.

```bash
# Create a pin file for Docker
sudo tee /etc/apt/preferences.d/docker <<'EOF'
Package: docker-ce
Pin: version 5:27.3.1*
Pin-Priority: 1001

Package: docker-ce-cli
Pin: version 5:27.3.1*
Pin-Priority: 1001

Package: containerd.io
Pin: version 1.7.*
Pin-Priority: 1001
EOF
```

A pin priority above 1000 forces installation of that version even if it is a downgrade. A priority of 500-999 makes it preferred but does not force downgrades.

Verify the pinning.

```bash
# Check the pin for docker-ce
apt-cache policy docker-ce
```

The output should show your pinned version with a higher priority.

### Method 3: Exclude from Unattended Upgrades

If you use unattended-upgrades for automatic security updates, exclude Docker from automatic upgrades.

```bash
# Edit the unattended-upgrades blacklist
sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Package-Blacklist {
    "docker-ce";
    "docker-ce-cli";
    "containerd.io";
};
EOF
```

## Installing a Specific Version on Multiple Servers

For fleet-wide deployments, automate the version-specific installation.

### Shell Script

```bash
#!/bin/bash
# install-docker-version.sh - Install a specific Docker version

DOCKER_VERSION="5:27.3.1-1~ubuntu.24.04~noble"

# Set up repository (idempotent)
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update

# Install specific version
apt-get install -y --allow-downgrades \
  docker-ce=$DOCKER_VERSION \
  docker-ce-cli=$DOCKER_VERSION \
  containerd.io docker-buildx-plugin docker-compose-plugin

# Pin the version
apt-mark hold docker-ce docker-ce-cli containerd.io

# Enable and start Docker
systemctl enable docker
systemctl start docker

# Verify
docker version
```

### Ansible Playbook

```yaml
# install-docker.yml - Ansible playbook for specific Docker version
---
- hosts: docker_servers
  become: true
  vars:
    docker_version: "5:27.3.1-1~ubuntu.24.04~noble"

  tasks:
    - name: Install Docker prerequisites
      apt:
        name:
          - ca-certificates
          - curl
          - gnupg
        state: present
        update_cache: true

    - name: Add Docker GPG key
      get_url:
        url: https://download.docker.com/linux/ubuntu/gpg
        dest: /etc/apt/keyrings/docker.asc
        mode: '0644'

    - name: Add Docker repository
      apt_repository:
        repo: "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
        state: present

    - name: Install specific Docker version
      apt:
        name:
          - "docker-ce={{ docker_version }}"
          - "docker-ce-cli={{ docker_version }}"
          - containerd.io
          - docker-buildx-plugin
          - docker-compose-plugin
        state: present
        allow_downgrade: true
        update_cache: true

    - name: Hold Docker packages
      dpkg_selections:
        name: "{{ item }}"
        selection: hold
      loop:
        - docker-ce
        - docker-ce-cli
        - containerd.io

    - name: Start and enable Docker
      systemd:
        name: docker
        state: started
        enabled: true
```

## Checking Version Compatibility

### Docker and Kubernetes Compatibility

Each Kubernetes version documents which container runtimes it supports. Check the Kubernetes changelog for your version.

```bash
# Check your Kubernetes version
kubectl version --short

# Check the Docker version
docker version --format '{{.Server.Version}}'
```

### Docker and Docker Compose Compatibility

Docker Compose v2 is bundled as a plugin and typically works across Docker versions. The standalone `docker-compose` v1 may have specific version requirements.

```bash
# Check Docker Compose version
docker compose version
```

## Upgrading to a New Specific Version

When you are ready to move to a new version, the process is controlled.

```bash
# Remove the hold
sudo apt-mark unhold docker-ce docker-ce-cli containerd.io

# Set the new target version
NEW_VERSION="5:27.4.1-1~ubuntu.24.04~noble"

# Upgrade to the new specific version
sudo apt-get install -y \
  docker-ce=$NEW_VERSION \
  docker-ce-cli=$NEW_VERSION

# Re-apply the hold
sudo apt-mark hold docker-ce docker-ce-cli containerd.io

# Verify
docker version
```

## Troubleshooting

### "Version has no installation candidate"

The version string might not match exactly. Double-check with `apt-cache madison docker-ce` and copy the version string precisely.

### "Depends: containerd.io (>= X) but Y is installed"

Some Docker versions require a minimum containerd version. Install the matching containerd first.

```bash
# Install a compatible containerd version
sudo apt-get install -y containerd.io=1.7.22-1
```

### Held packages prevent system updates

If `apt-get upgrade` warns about held packages, that is expected behavior. The hold is doing its job. Update non-Docker packages with:

```bash
# Upgrade everything except held packages
sudo apt-get upgrade -y
```

## Summary

Installing a specific Docker version on Ubuntu comes down to three steps: list available versions with `apt-cache madison`, install the exact version with `apt-get install docker-ce=VERSION`, and pin it with `apt-mark hold`. The pinning step is what separates a reliable production setup from one that will break after the next unattended upgrade. For fleet deployments, wrap these steps in a shell script or Ansible playbook to ensure every server runs the same Docker version.
