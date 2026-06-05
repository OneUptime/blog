# How to Install Docker on CentOS Stream 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, CentOS, Linux, Installation, DevOps, Container, CentOS Stream 9

Description: A complete step-by-step guide to installing Docker Engine on CentOS Stream 9, including repository setup, post-install configuration, and troubleshooting tips.

---

CentOS Stream 9 serves as the upstream development branch for Red Hat Enterprise Linux. It ships with Podman by default, but many teams still prefer Docker for its widespread ecosystem and tooling. This guide walks you through a clean Docker Engine installation on CentOS Stream 9, from scratch to running your first container.

## Prerequisites

Before you begin, make sure you have:

- A CentOS Stream 9 machine (physical or virtual) with at least 2 GB of RAM
- A user account with `sudo` privileges
- An active internet connection
- SELinux in enforcing or permissive mode (we will handle both cases)

## Step 1: Remove Old or Conflicting Packages

CentOS Stream 9 may have older Docker packages or distribution-provided Docker-compatible packages installed. These can conflict with Docker's official packages, so remove them first.

```bash
# Remove old Docker remnants

sudo dnf remove -y docker docker-client docker-client-latest \
  docker-common docker-latest docker-latest-logrotate \
  docker-logrotate docker-engine
```

This ensures a clean slate. If none of these packages are installed, the command simply skips them.

## Step 2: Install Required Dependencies

Docker needs the DNF plugin package to set up its repository.

```bash
# Install dnf-plugins-core, which provides dnf config-manager
sudo dnf install -y dnf-plugins-core
```

The `dnf-plugins-core` package provides the `dnf config-manager` command that makes adding third-party repositories straightforward.

## Step 3: Add the Docker CE Repository

Docker publishes its own RPM repository for CentOS. Add it with a single command.

```bash
# Add the official Docker CE repository
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

You can verify the repo was added by listing the enabled repositories.

```bash
# Confirm the Docker repo appears in the list
sudo dnf repolist | grep docker
```

You should see something like `docker-ce-stable` in the output.

## Step 4: Install Docker Engine

With the repository in place, install Docker Engine along with the CLI and containerd.

```bash
# Install Docker Engine, CLI, containerd, and compose plugin
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

This pulls in the latest stable release. The `docker-compose-plugin` gives you `docker compose` (v2) as a subcommand, replacing the older standalone `docker-compose` binary.

If you encounter a GPG key prompt, verify that the fingerprint matches Docker's official signing key, `060A 61C5 1B55 8A7F 742B 77AA C52F EB6B 621E 9F35`, and then accept it.

## Step 5: Start and Enable the Docker Service

Docker does not start automatically after installation. Start it now and enable it for future reboots.

```bash
# Start the Docker daemon
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker
```

Check that the service is running.

```bash
# Verify Docker is active
sudo systemctl status docker
```

You should see `active (running)` in the output.

## Step 6: Verify the Installation

Run the classic hello-world container to confirm everything works.

```bash
# Pull and run the hello-world test image
sudo docker run hello-world
```

If you see "Hello from Docker!" in the output, Docker is installed and functioning correctly.

## Step 7: Run Docker as a Non-Root User

By default, Docker commands require `sudo`. You can add your user to the `docker` group to avoid typing `sudo` every time.

```bash
# Create the docker group (may already exist)
sudo groupadd -f docker

# Add your user to the docker group
sudo usermod -aG docker $USER
```

Log out and log back in for the group change to take effect. Then test without `sudo`.

```bash
# Test Docker without sudo
docker run hello-world
```

Keep in mind that adding a user to the `docker` group grants root-equivalent access to the Docker daemon. Only add trusted users.

## Step 8: Configure Docker to Use Systemd Cgroup Driver

CentOS Stream 9 uses systemd as its init system and cgroup manager. Docker should align with this to avoid conflicts, especially if you plan to run Kubernetes.

Create or edit the Docker daemon configuration file.

```bash
# Create the daemon.json config file
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF
```

Restart Docker to apply the changes.

```bash
# Restart Docker to pick up the new configuration
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## Handling SELinux

CentOS Stream 9 runs SELinux in enforcing mode by default. Docker works fine with SELinux enabled, but you need the `container-selinux` package.

```bash
# Install container-selinux if not already present
sudo dnf install -y container-selinux
```

If you run into permission-denied errors with bind mounts, append `:z` or `:Z` to the volume flag.

```bash
# Mount a host directory with SELinux relabeling
docker run -v /host/path:/container/path:z nginx
```

The lowercase `z` indicates a shared label (multiple containers can access it), while uppercase `Z` sets a private label.

## Configuring Firewall Rules

CentOS Stream 9 uses `firewalld`. Docker creates the firewall rules it needs for bridge networks and, when firewalld is running, creates a `docker` zone for Docker bridge interfaces. If you need to expose container ports to external traffic, make sure the appropriate host firewall rules are in place.

For specific port exposure, you can add rules like this.

```bash
# Open port 8080 on the host firewall
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Installing Docker Compose (Standalone - Optional)

The `docker-compose-plugin` you installed earlier provides `docker compose` as a subcommand. If you still need the standalone `docker-compose` binary for compatibility with older scripts, install it separately.

```bash
# Download the latest standalone docker-compose binary
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify the installation
docker-compose --version
```

## Troubleshooting Common Issues

### "package docker-ce has no installation candidate"

This usually means the Docker repository was not added correctly. Double-check with `dnf repolist` and re-add the repo with `dnf config-manager` if needed.

### Conflicting packages

If `dnf` complains about conflicts, ensure you removed the conflicting packages listed in Step 1. You can also use `--allowerasing` as a last resort.

```bash
# Force install Docker even if there are minor conflicts
sudo dnf install -y --allowerasing docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Docker fails to start after reboot

Check the system journal for errors.

```bash
# View Docker daemon logs
sudo journalctl -u docker --no-pager -n 50
```

Common causes include a corrupted daemon.json file or a missing storage driver module.

### Permission denied on /var/run/docker.sock

This means your user is not in the `docker` group, or you have not logged out and back in after adding yourself. Run `groups` to verify your group membership.

## Keeping Docker Updated

Docker releases updates regularly. Keep your installation current with a simple `dnf update`.

```bash
# Update Docker and all other packages
sudo dnf update -y
```

To update only Docker packages specifically:

```bash
# Update only Docker-related packages
sudo dnf update -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Summary

Installing Docker on CentOS Stream 9 involves removing conflicting packages, adding Docker's official repository, installing the engine, and performing basic post-install configuration. Once running, you get access to the full Docker ecosystem including Compose, Buildx, and the vast library of container images on Docker Hub.

For monitoring your Docker containers and the services running inside them, consider setting up [OneUptime](https://oneuptime.com) to track uptime, performance, and logs in a single dashboard.
