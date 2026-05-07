# How to Add a Custom Registry to Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Custom Registry, Private Registry

Description: Step-by-step instructions for adding a custom container registry to Podman, including configuration, authentication, and testing.

---

> Adding a custom registry to Podman lets you pull and push images from your own infrastructure or third-party providers.

Organizations often run their own container registries for security, compliance, or performance reasons. Podman makes it straightforward to add custom registries alongside or in place of public ones like Docker Hub. This guide covers everything from adding the registry to your configuration to authenticating and testing connectivity.

---

## Prerequisites

Before adding a custom registry, confirm your Podman installation and note your registry's address.

```bash
# Verify Podman is installed

podman --version

# Confirm the registry is reachable from your machine
curl -s https://myregistry.example.com/v2/ | head -5

# If using a self-signed certificate, test with -k
curl -sk https://myregistry.example.com/v2/
```

## Adding the Registry to registries.conf

Add a new registry block to your Podman configuration.

```bash
# Back up the existing configuration
sudo cp /etc/containers/registries.conf /etc/containers/registries.conf.bak

# Add the custom registry block
sudo tee -a /etc/containers/registries.conf <<'EOF'

# Custom private registry
[[registry]]
prefix = "myregistry.example.com"
location = "myregistry.example.com"
insecure = false
EOF
```

## Adding the Registry to the Search List

If you want Podman to search your custom registry when pulling unqualified image names, add it to the search list.

```bash
# View the current search list
podman info --format '{{.Registries.Search}}'

# Edit the configuration to add your registry
sudo nano /etc/containers/registries.conf
```

```toml
# Update the unqualified-search-registries line
unqualified-search-registries = ["docker.io", "quay.io", "myregistry.example.com"]
```

## Authenticating to the Custom Registry

Most private registries require authentication.

```bash
# Log in to the custom registry
podman login myregistry.example.com
# Enter your username and password when prompted

# Log in non-interactively (useful for CI/CD)
podman login myregistry.example.com \
  --username myuser \
  --password-stdin <<< "mypassword"

# Verify the credentials were stored
cat ${XDG_RUNTIME_DIR}/containers/auth.json
```

## Configuring TLS for the Custom Registry

If your registry uses a self-signed or custom CA certificate, configure Podman to trust it.

```bash
# Create the certificate directory for the registry
sudo mkdir -p /etc/containers/certs.d/myregistry.example.com

# Copy the CA certificate to the directory
sudo cp /path/to/ca.crt /etc/containers/certs.d/myregistry.example.com/ca.crt

# If using client certificates for mutual TLS
sudo cp /path/to/client.cert /etc/containers/certs.d/myregistry.example.com/client.cert
sudo cp /path/to/client.key /etc/containers/certs.d/myregistry.example.com/client.key
```

## Marking a Registry as Insecure (Development Only)

For development environments with self-signed certificates, you can mark the registry as insecure.

```toml
# /etc/containers/registries.conf

[[registry]]
prefix = "myregistry.example.com"
location = "myregistry.example.com"
insecure = true
```

```bash
# Alternatively, use the --tls-verify flag per command
podman pull --tls-verify=false myregistry.example.com/myimage:latest
```

## Pulling Images from the Custom Registry

Test your configuration by pulling an image.

```bash
# Pull an image using the fully qualified name
podman pull myregistry.example.com/myapp:v1.0

# List the pulled image
podman images | grep myregistry

# Inspect the image to confirm origin
podman inspect myregistry.example.com/myapp:v1.0 --format '{{.RepoTags}}'
```

## Pushing Images to the Custom Registry

Tag and push a local image to your custom registry.

```bash
# Tag an existing image for the custom registry
podman tag localhost/myapp:latest myregistry.example.com/myapp:latest

# Push the tagged image
podman push myregistry.example.com/myapp:latest

# Verify the image is on the registry
podman pull myregistry.example.com/myapp:latest
```

## Configuring for Rootless Users

Rootless Podman users can configure registries at the user level.

```bash
# Create user-level configuration directory
mkdir -p ~/.config/containers

# Create user-level registries.conf
cat > ~/.config/containers/registries.conf <<'EOF'
unqualified-search-registries = ["myregistry.example.com", "docker.io"]

[[registry]]
prefix = "myregistry.example.com"
location = "myregistry.example.com"
insecure = false
EOF

# Confirm the user-level config is active
podman info --format '{{.Registries}}'
```

## Summary

Adding a custom registry to Podman involves editing the `registries.conf` file, optionally adding the registry to the unqualified search list, and configuring authentication and TLS certificates. You can work at both the system level and the user level for rootless setups. Always test connectivity and authentication after making changes to ensure images can be pulled and pushed successfully.
