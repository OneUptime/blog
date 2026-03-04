# How to Install Docker on Debian 12 Bookworm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Debian, Linux, Installation, DevOps, Containers, Debian 12, Bookworm

Description: Step-by-step instructions for installing Docker Engine on Debian 12 Bookworm, covering repository setup, GPG key configuration, and post-install best practices.

---

Debian 12 (codenamed Bookworm) is one of the most popular Linux distributions for servers and development machines. Its stability and predictable release cycle make it a natural fit for running Docker containers in production. This guide covers the complete installation process from a fresh Debian 12 system to a fully functional Docker setup.

## Prerequisites

You will need:

- A Debian 12 Bookworm machine (bare metal, VM, or cloud instance)
- A non-root user with `sudo` privileges
- A working internet connection

## Step 1: Remove Older Docker Packages

Debian's default repositories include older Docker packages under different names. Remove them to avoid conflicts.

```bash
# Remove any legacy Docker packages from the default Debian repos
sudo apt-get remove -y docker docker-engine docker.io containerd runc
```

This command is safe to run even if none of these packages are installed. It will simply report that there is nothing to remove.

## Step 2: Update the Package Index and Install Dependencies

Refresh your package lists and install the utilities Docker needs for its repository.

```bash
# Update the apt package index
sudo apt-get update

# Install packages required for HTTPS repository access
sudo apt-get install -y ca-certificates curl gnupg lsb-release
```

These packages enable `apt` to communicate securely with Docker's HTTPS-based package repository.

## Step 3: Add Docker's Official GPG Key

Docker signs its packages with a GPG key. You need to add this key to your system's keyring so `apt` trusts the packages.

```bash
# Create the keyring directory
sudo install -m 0755 -d /etc/apt/keyrings

# Download Docker's official GPG key
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc

# Set read permissions for all users
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

## Step 4: Set Up the Docker Repository

Add Docker's repository to your apt sources.

```bash
# Add the Docker repository to apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

This creates a new file in `/etc/apt/sources.list.d/` that tells apt where to find Docker packages. The `signed-by` clause ensures only packages signed with Docker's GPG key are accepted.

Update the package index again so apt can see the newly added repository.

```bash
# Refresh package index to include Docker's repo
sudo apt-get update
```

## Step 5: Install Docker Engine

Now install Docker Engine, the CLI, containerd, and the official plugins.

```bash
# Install Docker Engine and related components
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

This gives you the full Docker toolchain: the daemon, the command-line client, the container runtime, multi-platform build support via Buildx, and Docker Compose v2.

## Step 6: Verify the Installation

Run the hello-world container as a quick smoke test.

```bash
# Run the hello-world image to verify Docker works
sudo docker run hello-world
```

You should see the "Hello from Docker!" message, confirming the installation succeeded.

## Step 7: Manage Docker as a Non-Root User

Running Docker commands with `sudo` every time is inconvenient for development work. Add your user to the `docker` group.

```bash
# Add current user to the docker group
sudo usermod -aG docker $USER
```

Apply the new group membership without logging out.

```bash
# Activate the new group in the current session
newgrp docker
```

Verify it works.

```bash
# Run a container without sudo
docker run hello-world
```

Note: the `docker` group grants privileges equivalent to the root user. Only add trusted users to this group.

## Step 8: Enable Docker to Start on Boot

On Debian 12, Docker should be enabled automatically, but verify this explicitly.

```bash
# Enable Docker and containerd to start at boot
sudo systemctl enable docker.service
sudo systemctl enable containerd.service
```

Check the current status.

```bash
# Verify Docker is running
sudo systemctl status docker
```

## Configuring Log Rotation

Docker containers can produce large amounts of log data. Configure automatic log rotation to prevent disk space issues.

```bash
# Create a daemon.json file with log rotation settings
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker to apply the configuration
sudo systemctl restart docker
```

Each container will now keep a maximum of 3 log files, each capped at 10 MB. This prevents runaway log growth from filling your disk.

## Setting Up UFW Firewall Rules

Debian 12 often runs the `ufw` firewall. Docker manipulates iptables directly, which can bypass UFW rules. If you need strict firewall control, you should be aware of this behavior.

To allow traffic on a specific port through UFW:

```bash
# Allow external traffic to reach port 8080
sudo ufw allow 8080/tcp
```

For more granular control, you can configure Docker to respect UFW by editing `/etc/docker/daemon.json` and setting `"iptables": false`. However, this means you must manage all container networking rules manually, which is not recommended unless you fully understand iptables.

## Installing Docker Compose (Standalone Binary)

The `docker-compose-plugin` you installed earlier gives you `docker compose` as a subcommand. If you need the older standalone `docker-compose` command for legacy scripts:

```bash
# Download the latest standalone docker-compose
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify the version
docker-compose version
```

## Using Docker with Apt Pinning

If you want to prevent Docker from being upgraded accidentally during system updates, use apt pinning.

```bash
# Pin Docker packages to their current version
cat <<'EOF' | sudo tee /etc/apt/preferences.d/docker-pin
Package: docker-ce
Pin: version 5:27.*
Pin-Priority: 1001

Package: docker-ce-cli
Pin: version 5:27.*
Pin-Priority: 1001
EOF
```

Adjust the version number to match whatever version you have installed. This is especially useful in production environments where unexpected upgrades can cause problems.

## Troubleshooting

### "E: Package docker-ce has no installation candidate"

This typically means the Docker repository was not added correctly. Verify the repo file exists and contains the right content.

```bash
# Check the Docker repo file
cat /etc/apt/sources.list.d/docker.list
```

Make sure the codename is `bookworm` (not `bullseye` or something else).

### Docker daemon fails to start

Check the journal for error messages.

```bash
# View recent Docker daemon logs
sudo journalctl -u docker --no-pager -n 30
```

Common causes: a syntax error in `/etc/docker/daemon.json`, or a port conflict with another service.

### DNS resolution issues inside containers

If containers cannot resolve domain names, Docker's default DNS may be conflicting with your host's DNS setup. Set explicit DNS servers in the daemon config.

```bash
# Add DNS configuration to daemon.json
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "dns": ["8.8.8.8", "8.8.4.4"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

## Updating Docker

Keep Docker up to date with the standard apt workflow.

```bash
# Update package lists and upgrade Docker
sudo apt-get update
sudo apt-get install -y --only-upgrade docker-ce docker-ce-cli containerd.io
```

## Summary

Docker installs cleanly on Debian 12 Bookworm with just a few commands: add the GPG key, configure the repository, and install the packages. Post-install, adding your user to the `docker` group and configuring log rotation will make your day-to-day Docker usage smoother. Debian's stability combined with Docker's containerization creates a solid foundation for both development and production workloads.
