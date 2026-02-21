# How to Use Execution Environments with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, Podman, Containers

Description: Build and run Ansible Execution Environments with Podman, including rootless mode, pod networking, and Podman-specific configuration tips.

---

Podman is the default container runtime for Ansible Execution Environments. Both ansible-builder and ansible-navigator prefer Podman over Docker when both are available. Podman has several advantages for the Ansible use case: it runs rootless by default, does not require a daemon, and is fully compatible with Docker image formats. This post covers everything specific to using EEs with Podman, from installation through advanced usage.

## Installing Podman

On RHEL/CentOS/Fedora, Podman is usually pre-installed or available in the default repositories:

```bash
# Install Podman on RHEL/CentOS/Fedora
sudo dnf install -y podman

# Install Podman on Ubuntu
sudo apt-get update && sudo apt-get install -y podman

# Install Podman on macOS
brew install podman
podman machine init
podman machine start

# Verify the installation
podman --version
podman info
```

## Setting Podman as the Container Runtime

ansible-builder and ansible-navigator default to Podman, but you can explicitly configure it:

```bash
# Explicitly use Podman for building
ansible-builder build --tag my-ee:1.0 --container-runtime podman

# Configure ansible-navigator to use Podman
```

In the ansible-navigator config:

```yaml
# ansible-navigator.yml - Explicit Podman configuration
---
ansible-navigator:
  execution-environment:
    container-engine: podman
    image: quay.io/myorg/ansible-ee:2.1.0
    pull:
      policy: missing
```

## Rootless Podman with EEs

One of Podman's key features is rootless container execution. You do not need sudo or root access to build and run EEs.

Verify rootless mode is working:

```bash
# Check that you can run containers without root
podman run --rm quay.io/ansible/ansible-runner:latest whoami

# Should output 'root' (root inside the container, but unprivileged on the host)

# Check your subuid/subgid mappings
cat /etc/subuid
cat /etc/subgid
```

If rootless mode fails, configure subuid/subgid:

```bash
# Add subuid/subgid mappings for your user
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $(whoami)

# Reset Podman storage after adding mappings
podman system migrate
```

## Building EEs with Podman

Build an EE using Podman:

```yaml
# execution-environment.yml
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

dependencies:
  galaxy:
    collections:
      - name: community.general
        version: ">=8.0.0"
      - name: ansible.posix
        version: ">=1.5.0"
  python:
    - jmespath>=1.0.0
    - netaddr>=0.8.0
  system:
    - openssh-clients [platform:rhel-8 platform:rhel-9]
    - sshpass [platform:rhel-8 platform:rhel-9]
```

Build with Podman:

```bash
# Build the EE
ansible-builder build \
  --tag my-ee:1.0 \
  --container-runtime podman \
  --verbosity 2

# Verify the image
podman images my-ee
```

## Running Playbooks with Podman

ansible-navigator automatically uses Podman to run the EE container. Here are some Podman-specific considerations:

```bash
# Basic run
ansible-navigator run site.yml \
  --execution-environment-image my-ee:1.0 \
  --mode stdout

# With additional Podman options
ansible-navigator run site.yml \
  --execution-environment-image my-ee:1.0 \
  --execution-environment-container-options="--net=host" \
  --mode stdout
```

## SSH Agent Forwarding with Podman

ansible-navigator forwards the SSH agent socket into the Podman container by default. Make sure your agent is running:

```bash
# Start the SSH agent and add your key
eval $(ssh-agent)
ssh-add ~/.ssh/ansible_key

# Verify the agent is working
ssh-add -l

# Run ansible-navigator (SSH agent is forwarded automatically)
ansible-navigator run site.yml \
  --execution-environment-image my-ee:1.0 \
  --mode stdout
```

If automatic forwarding does not work (which sometimes happens with rootless Podman), mount the socket explicitly:

```yaml
# ansible-navigator.yml - Explicit SSH agent mount
---
ansible-navigator:
  execution-environment:
    image: my-ee:1.0
    container-engine: podman
    volume-mounts:
      - src: "${SSH_AUTH_SOCK}"
        dest: /run/user/1000/ssh-agent.sock
        options: rw
    environment-variables:
      set:
        SSH_AUTH_SOCK: /run/user/1000/ssh-agent.sock
```

## Managing Podman Storage

Podman stores images and containers in your home directory by default (rootless mode). This can fill up your home partition.

```bash
# Check Podman storage usage
podman system df

# Show detailed image sizes
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.Created}}"

# Clean up unused images
podman image prune -a

# Clean up everything (images, containers, volumes)
podman system prune -a --volumes

# Check where Podman stores data
podman info --format '{{.Store.GraphRoot}}'
```

Configure a different storage location if needed:

```bash
# Create a Podman storage config
mkdir -p ~/.config/containers

cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"
graphroot = "/data/podman/storage"
EOF

# Migrate existing storage
podman system migrate
```

## Podman Network Configuration for EEs

By default, Podman creates a bridged network for containers. For Ansible, you often need host networking so the container can reach the same networks as your workstation.

```yaml
# ansible-navigator.yml - Host networking
---
ansible-navigator:
  execution-environment:
    image: my-ee:1.0
    container-engine: podman
    container-options:
      - "--net=host"
```

Or use custom DNS settings:

```yaml
execution-environment:
  container-options:
    - "--dns=10.0.0.1"
    - "--dns-search=example.com"
```

## Podman Registry Authentication

Configure Podman to authenticate with container registries:

```bash
# Login to a registry
podman login quay.io

# Login to multiple registries
podman login docker.io
podman login ghcr.io
podman login registry.internal.example.com

# Check your logins
podman login --get-login quay.io

# Credentials are stored in
cat ~/.config/containers/auth.json
```

For automation, use a dedicated auth file:

```bash
# Create an auth file for automation
podman login quay.io \
  --username "myorg+cibot" \
  --password "TOKEN" \
  --authfile /etc/containers/auth.json
```

## Podman and SELinux

On SELinux-enforcing systems, Podman volume mounts need the `:z` or `:Z` label:

```yaml
# ansible-navigator.yml - SELinux volume labels
---
ansible-navigator:
  execution-environment:
    image: my-ee:1.0
    container-engine: podman
    volume-mounts:
      # :z = shared label (multiple containers can access)
      - src: "${HOME}/.ssh"
        dest: /home/runner/.ssh
        options: "ro,z"
      # :Z = private label (only this container can access)
      - src: "/opt/ansible/secrets"
        dest: /secrets
        options: "ro,Z"
```

Without the SELinux labels, you will get permission denied errors even though the file permissions look correct.

## Building Multi-Architecture EEs

Podman supports multi-architecture builds, which is useful if your team uses both x86_64 and ARM (Apple Silicon) machines:

```bash
# Build for a specific architecture
podman build --platform linux/amd64 -t my-ee:amd64 context/

# Build for ARM
podman build --platform linux/arm64 -t my-ee:arm64 context/

# Create a multi-arch manifest
podman manifest create my-ee:multi
podman manifest add my-ee:multi my-ee:amd64
podman manifest add my-ee:multi my-ee:arm64

# Push the manifest
podman manifest push my-ee:multi docker://quay.io/myorg/my-ee:latest
```

## Podman Compose for Complex Scenarios

If you need to test playbooks against services (like databases or message queues), use podman-compose to run the services alongside your EE:

```yaml
# podman-compose.yml - EE with test services
version: '3'
services:
  ansible:
    image: my-ee:1.0
    volumes:
      - ./playbooks:/runner/project:z
      - ./inventory:/runner/inventory:z
    networks:
      - test-network
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: ansible
      POSTGRES_PASSWORD: test123
    networks:
      - test-network

  redis:
    image: redis:7
    networks:
      - test-network

networks:
  test-network:
    driver: bridge
```

Run the test environment:

```bash
# Start the test services
podman-compose up -d postgres redis

# Run the playbook inside the EE with access to test services
podman-compose run ansible ansible-playbook /runner/project/test.yml \
  -i /runner/inventory/test.yml

# Clean up
podman-compose down
```

## Troubleshooting Podman with EEs

Common issues and solutions:

```bash
# Issue: "ERRO[0000] cannot find UID/GID for user"
# Fix: Reset Podman state
podman system migrate

# Issue: "permission denied" on volume mounts
# Fix: Add SELinux labels
# Change options from "ro" to "ro,z"

# Issue: "image not found" even after pull
# Fix: Check image storage
podman images --all
podman system info | grep graphRoot

# Issue: Slow builds
# Fix: Use Podman build cache
podman system prune --filter "until=24h"  # Clean old cache only

# Issue: Network timeouts inside the container
# Fix: Use host networking
ansible-navigator run site.yml \
  --execution-environment-container-options="--net=host" \
  --mode stdout

# Issue: "unable to connect to Podman" on macOS
# Fix: Start the Podman machine
podman machine start
```

## Performance Tips

Podman has some performance characteristics that affect EE builds and runs:

```bash
# Use overlay storage driver for best performance
podman info | grep graphDriverName
# Should show: overlay

# Speed up builds with layer caching
# Don't use --no-cache unless needed

# Pre-pull base images to avoid build delays
podman pull quay.io/ansible/ansible-runner:latest

# Use local registry mirror if available
# This reduces pull times significantly

# For macOS: Allocate more resources to the Podman machine
podman machine set --cpus 4 --memory 4096 --disk-size 50
podman machine stop && podman machine start
```

## Wrapping Up

Podman is the natural choice for running Ansible Execution Environments. It is rootless by default, does not need a daemon, and is the recommended runtime by the Ansible community. The main things to watch out for are SELinux volume labels, SSH agent forwarding in rootless mode, and storage management. Once you have Podman configured correctly, the EE workflow is seamless: build with ansible-builder, run with ansible-navigator, and let Podman handle the container lifecycle without requiring root privileges.
