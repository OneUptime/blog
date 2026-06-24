# How to Install Podman on openSUSE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, openSUSE

Description: A complete guide to installing and configuring Podman on openSUSE Leap and Tumbleweed, including rootless setup and YaST integration.

---

> openSUSE provides Podman through its official repositories with integration into the standard system management tools.

openSUSE, backed by SUSE, offers strong container support through both its stable Leap and rolling-release Tumbleweed editions. Podman is available in the default repositories for both. This guide covers installation, configuration, and practical usage.

---

## Prerequisites

- openSUSE Leap 16.0+ or openSUSE Tumbleweed
- A user account with sudo privileges
- An active internet connection

## Step 1: Update Your System

Refresh repositories and update packages. On Leap, use:

```bash
# Refresh repositories and update all packages

sudo zypper refresh
sudo zypper update -y
```

On Tumbleweed, use a distribution upgrade to move to the latest snapshot:

```bash
sudo zypper refresh
sudo zypper dup -y
```

## Step 2: Install Podman

### openSUSE Tumbleweed

```bash
# Install Podman on Tumbleweed
sudo zypper install -y podman
```

### openSUSE Leap

```bash
# Install Podman on Leap
sudo zypper install -y podman
```

For a more complete container toolkit:

```bash
# Install additional container tools
sudo zypper install -y podman buildah skopeo podman-docker
```

The `podman-docker` package provides a Docker CLI wrapper that redirects Docker commands to Podman.

## Step 3: Verify the Installation

```bash
# Check the Podman version
podman --version

# View detailed system information
podman info
```

## Step 4: Configure Rootless Containers

Set up your user for rootless container operation:

```bash
# Check for existing subuid/subgid mappings
cat /etc/subuid
cat /etc/subgid

# Add mappings if they do not exist
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)
```

Install the default rootless networking helper:

```bash
# Install the pasta user-mode networking helper
sudo zypper install -y passt
```

## Step 5: Run a Test Container

```bash
# Run a quick test
podman run --rm docker.io/library/hello-world
```

## Step 6: Enable the Podman Socket

```bash
# Enable the user-level Podman socket
systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Set Docker compatibility environment variable
echo 'export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock' >> ~/.bashrc
source ~/.bashrc
```

## Step 7: Configure the Firewall

openSUSE uses `firewalld`. Open ports for your containers:

```bash
# Open a port for container access
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-ports
```

## Running a Practical Example

Run a MariaDB database container:

```bash
# Create a volume for persistent data
podman volume create mariadb-data

# Run MariaDB with a persistent volume
podman run -d \
  --name my-mariadb \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=testdb \
  -p 3306:3306 \
  -v mariadb-data:/var/lib/mysql \
  docker.io/library/mariadb:latest

# Check the container status
podman ps

# View the logs
podman logs my-mariadb

# Connect to the database
podman exec -it my-mariadb mariadb -uroot -prootpassword testdb

# Clean up
podman stop my-mariadb
podman rm my-mariadb
podman volume rm mariadb-data
```

## Using the podman-docker Wrapper

The `podman-docker` package lets you use Docker commands with Podman:

```bash
# Install the Docker compatibility wrapper
sudo zypper install -y podman-docker

# Now Docker commands are redirected to Podman
docker ps
docker images
docker run --rm docker.io/library/alpine echo "Hello from Podman"
```

## Generating systemd Services

Auto-start containers on boot:

```bash
# Create a Quadlet container unit
mkdir -p ~/.config/containers/systemd
cat > ~/.config/containers/systemd/my-service.container <<'EOF'
[Container]
Image=docker.io/library/nginx:latest
ContainerName=my-service
PublishPort=8080:80

[Install]
WantedBy=default.target
EOF

# Start the generated service
systemctl --user daemon-reload
systemctl --user start my-service.service

# Enable lingering for user services to start at boot
sudo loginctl enable-linger $(whoami)
```

## Troubleshooting

If you encounter AppArmor-related errors:

```bash
# Check AppArmor status
sudo aa-status

# If Podman profiles are blocking, set them to complain mode
sudo aa-complain /usr/bin/podman
```

If rootless containers fail with permission errors:

```bash
# Reset Podman storage
podman system reset

# Verify kernel support for user namespaces
sysctl user.max_user_namespaces
```

## Summary

Podman integrates smoothly with openSUSE on both Leap and Tumbleweed. The `podman-docker` wrapper package makes migration from Docker seamless. Combined with openSUSE's firewall management and systemd integration, Podman provides a production-ready container environment.
