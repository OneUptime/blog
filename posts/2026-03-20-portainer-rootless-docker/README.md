# How to Use Portainer with Rootless Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Rootless, Security, Linux

Description: Configure Portainer to manage containers running in rootless Docker mode for improved security and reduced attack surface.

## Introduction

Rootless Docker allows non-root users to run Docker without requiring root privileges. This significantly reduces security risks. Portainer can connect to a rootless Docker socket to provide GUI management while maintaining the security benefits of rootless containers.

## Prerequisites

- Linux host with kernel 5.11+ for rootless `overlay2`, or 4.18+ with `fuse-overlayfs`
- Docker 20.10+ packages installed, or the ability to install Docker with the rootless setup script
- `newuidmap` and `newgidmap` utilities
- A non-root user with proper subordinate UID/GID ranges

## Setting Up Rootless Docker

### Install Dependencies

```bash
# Install required packages (Ubuntu/Debian)

sudo apt-get install -y \
  uidmap \
  dbus-user-session \
  fuse-overlayfs \
  slirp4netns

# Install required packages (RHEL/CentOS)
sudo dnf install -y \
  shadow-utils \
  fuse-overlayfs \
  slirp4netns
```

### Configure Subordinate UIDs and GIDs

```bash
# Check existing subuid/subgid entries
cat /etc/subuid
cat /etc/subgid

# If your user is not listed, add entries
echo "myuser:100000:65536" | sudo tee -a /etc/subuid
echo "myuser:100000:65536" | sudo tee -a /etc/subgid
```

### Install Rootless Docker

```bash
# Run the rootless Docker installation script
curl -fsSL https://get.docker.com/rootless | sh

# The script installs Docker under ~/bin/
# Add to PATH
export PATH=/home/myuser/bin:$PATH
echo 'export PATH=/home/myuser/bin:$PATH' >> ~/.bashrc

# Set the Docker host socket path
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
echo 'export DOCKER_HOST=unix:///run/user/'"$(id -u)"'/docker.sock' >> ~/.bashrc
```

### Enable Rootless Docker Service

```bash
# Enable and start Docker as a user systemd service
systemctl --user enable --now docker

# Check service status
systemctl --user status docker

# Verify rootless Docker is working
docker info | grep -i "rootless"
# Should show "rootless" under Security Options
```

## Deploying Portainer with Rootless Docker

```bash
# Create a volume for Portainer
docker volume create portainer_data

# Run Portainer using the rootless Docker socket
# Note: your Docker CLI must point to the rootless daemon
# (for example, via the rootless context or DOCKER_HOST)
docker run -d \
  --name portainer \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /run/user/$(id -u)/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Verify Portainer is running
docker ps
```

## Configuring Portainer as a Systemd Service

```bash
# Create user systemd service directory
mkdir -p ~/.config/systemd/user/

# Create the Portainer service file
# Docker recommends using either restart policies or a process manager, not both.
cat > ~/.config/systemd/user/portainer.service << 'EOF'
[Unit]
Description=Portainer Container Management
After=docker.service
Requires=docker.service

[Service]
Environment=DOCKER_HOST=unix://%t/docker.sock
ExecStartPre=%h/bin/docker container inspect --format '{{.Id}}' portainer
ExecStartPre=-%h/bin/docker stop portainer
ExecStart=%h/bin/docker start -a portainer
ExecStop=%h/bin/docker stop portainer
Restart=always

[Install]
WantedBy=default.target
EOF

# Enable and start the service
systemctl --user daemon-reload
systemctl --user enable --now portainer.service
```

## Enabling Linger for Non-Interactive Sessions

```bash
# Allow user services to run without being logged in
sudo loginctl enable-linger myuser

# Verify linger is enabled
loginctl show-user myuser | grep Linger
# Should show: Linger=yes
```

## Port Forwarding Considerations

Rootless containers cannot bind to privileged ports (below 1024) by default:

```bash
# Allow unprivileged port binding for ports below 1024 (requires root)
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=0

# Make permanent
echo "net.ipv4.ip_unprivileged_port_start=0" | sudo tee -a /etc/sysctl.conf

# Or use port forwarding with iptables
sudo iptables -t nat -A PREROUTING \
  -p tcp --dport 443 \
  -j REDIRECT --to-port 9443
```

## Limitations of Rootless Docker

- Only `overlay2` (kernel 5.11+), `fuse-overlayfs` or `btrfs` (kernel 4.18+), and `vfs` storage drivers are supported
- cgroup-related resource limits require cgroup v2 and systemd
- AppArmor, checkpoint, overlay network, and exposing SCTP ports are not supported
- `--net=host` is namespaced inside RootlessKit, so published ports should still use `-p`

## Verifying Security Benefits

```bash
# Check that Docker daemon runs as non-root
ps -ef | grep '[d]ockerd'
# Should show your username, not root

# Verify container processes are mapped to non-root UIDs
cat /proc/$(docker inspect --format '{{.State.Pid}}' my-container)/status | grep Uid
```

## Conclusion

Rootless Docker with Portainer provides a secure container management environment where even if a container is compromised, the attacker does not gain root access on the host. This setup is ideal for multi-tenant environments, development workstations, and any scenario where reducing the attack surface is a priority.
