# How to Use Podman Desktop in Restricted Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Security, Enterprise, Restricted Environments

Description: Learn how to configure and use Podman Desktop in restricted corporate or air-gapped environments where network access and permissions are limited.

---

> Podman Desktop can work well in restricted environments when paired with Podman's rootless engine and user-level configuration for proxies, registries, and offline image workflows.

Many enterprise environments impose restrictions on network access, software installation, and system permissions. Podman is well-suited for these environments because it runs rootless by default and supports offline workflows, proxy configurations, and custom registries. Podman Desktop can still be used as the UI, but on Linux it connects to the native rootless Podman connection rather than managing Podman configuration directly, while on macOS and Windows it uses a Podman machine. This guide covers the strategies and configurations needed to use Podman Desktop effectively behind firewalls and in locked-down systems.

---

## Understanding Restricted Environment Challenges

Restricted environments typically present these challenges:

- No root or sudo access on developer machines
- Network traffic routed through proxies
- Limited or no internet access (air-gapped)
- Custom certificate authorities for TLS inspection
- Restricted container registries
- Disk and memory quotas

```bash
# Check your current user permissions

id
groups

# Verify you do not need root for Podman
podman info --format '{{.Host.Security.Rootless}}'
# Should output: true
```

## Running Podman Rootless

Podman runs without root privileges by default, which is ideal for restricted environments:

```bash
# Verify rootless mode
podman info --format '{{.Host.Security.Rootless}}'

# Check the storage location (user-level, no root needed)
podman info --format '{{.Store.GraphRoot}}'

# Run a container without any elevated privileges
podman run --rm docker.io/library/alpine echo "Running rootless"

# Check user namespace mappings
podman unshare cat /proc/self/uid_map
```

## Configuring Offline Image Access

In air-gapped environments, pre-load images from external media:

```bash
# On a machine with internet access, save required images
podman pull docker.io/library/nginx:alpine
podman pull docker.io/library/postgres:16-alpine
podman pull docker.io/library/node:18-alpine
podman save -m -o offline-images.tar \
  docker.io/library/nginx:alpine \
  docker.io/library/postgres:16-alpine \
  docker.io/library/node:18-alpine

# Transfer offline-images.tar to the restricted machine via USB or file share

# On the restricted machine, load the images
podman load -i offline-images.tar

# Verify the images are available
podman images
```

## Setting Up a Local Registry

Run a local registry to serve images within your restricted network. On macOS and Windows with Podman Desktop, make the `registries.conf` change inside `podman machine ssh` and restart the Podman machine afterward; on Linux, edit the host file directly:

```bash
# Save the registry image on an internet-connected machine
podman pull docker.io/library/registry:2
podman save -o registry.tar docker.io/library/registry:2

# Load it on the restricted network
podman load -i registry.tar

# Start the local registry
podman run -d \
  --name local-registry \
  -p 5000:5000 \
  -v registry-data:/var/lib/registry \
  docker.io/library/registry:2

# Configure Podman to trust the local registry before pushing to it
mkdir -p ~/.config/containers
cat > ~/.config/containers/registries.conf << 'EOF'
unqualified-search-registries = ["localhost:5000"]

[[registry]]
location = "localhost:5000"
insecure = true
EOF

# Push pre-loaded images to the local registry
podman tag docker.io/library/nginx:alpine localhost:5000/nginx:alpine
podman push localhost:5000/nginx:alpine
```

## Configuring Proxy Settings

Set up proxy access for environments that route through corporate proxies. On Linux, Podman Desktop proxy settings do not configure Podman itself, so set Podman's configuration directly. On macOS and Windows, make the same `containers.conf` change inside `podman machine ssh` and restart the Podman machine afterward:

```bash
# Set proxy environment variables for Podman
mkdir -p ~/.config/containers
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
env = [
  "http_proxy=http://proxy.corporate.com:8080",
  "https_proxy=http://proxy.corporate.com:8080",
  "no_proxy=localhost,127.0.0.1,.corporate.com,10.0.0.0/8",
]

[containers]
http_proxy = true
EOF

# Set environment variables for image pulls
export HTTP_PROXY="http://proxy.corporate.com:8080"
export HTTPS_PROXY="http://proxy.corporate.com:8080"
export NO_PROXY="localhost,127.0.0.1,.corporate.com,10.0.0.0/8"

# Test connectivity through the proxy
podman pull docker.io/library/alpine
```

## Installing Custom CA Certificates

For TLS-inspecting proxies that use custom certificate authorities, trust the CA appropriately. On macOS and Windows with Podman Desktop, add the CA inside the Podman machine instead of trusting it only on the host:

```bash
# Trust a custom CA for a specific registry
mkdir -p ~/.config/containers/certs.d/registry.corporate.com
cp /path/to/corporate-ca.crt \
  ~/.config/containers/certs.d/registry.corporate.com/ca.crt

# On macOS or Windows with Podman Desktop, copy the CA into the Podman machine
cat /path/to/corporate-ca.crt | \
  podman machine ssh podman-machine-default "cat > corporate-ca.crt"
podman machine ssh podman-machine-default \
  sudo cp corporate-ca.crt /etc/pki/ca-trust/source/anchors/corporate-ca.crt
podman machine ssh podman-machine-default sudo update-ca-trust

# For system-wide trust on RHEL, Fedora, or CentOS when you have admin access
sudo cp /path/to/corporate-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

## Managing Storage Quotas

When disk space is limited, configure storage carefully:

```bash
# Check current storage usage
podman system df

# Set storage location and rootless overlay options in storage.conf
mkdir -p ~/.config/containers
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"
graphroot = "$HOME/.local/share/containers/storage"

[storage.options.overlay]
# Use fuse-overlayfs for rootless
mount_program = "/usr/bin/fuse-overlayfs"
EOF

# Regular cleanup to stay within quotas
podman system prune -af --volumes

# Remove old images aggressively
podman image prune -af
```

## Running Without Internet Access

For fully air-gapped operation, point Podman at your internal registry and block the external registries you know should not be used:

```bash
# Prefer your local registry for short names
mkdir -p ~/.config/containers
cat > ~/.config/containers/registries.conf << 'EOF'
unqualified-search-registries = ["localhost:5000"]

# Block specific external registries
[[registry]]
location = "docker.io"
blocked = true

[[registry]]
location = "quay.io"
blocked = true

# Only allow your internal registry
[[registry]]
location = "localhost:5000"
insecure = true
EOF

# Unqualified pulls now resolve to localhost:5000, and pulls from docker.io or quay.io are blocked
podman pull localhost:5000/nginx:alpine
```

## Summary

Podman Desktop can fit restricted environments when paired with Podman's rootless engine and the right registry, proxy, and certificate configuration. By pre-loading images for air-gapped operation, configuring proxies for corporate networks, and setting up a local registry, you can maintain a productive container workflow even with significant restrictions. On Linux, apply these settings to Podman itself; on macOS and Windows, make the equivalent changes inside the Podman machine.
