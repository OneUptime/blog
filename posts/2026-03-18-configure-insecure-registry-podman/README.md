# How to Configure an Insecure Registry in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Insecure, TLS, Development

Description: Learn how to configure Podman to work with insecure registries that use HTTP or self-signed certificates for development and testing purposes.

---

> Insecure registries should only be used in development environments where security is not a concern.

During development and testing, you may need to work with container registries that do not have proper TLS certificates or that run over plain HTTP. Podman allows you to mark specific registries as insecure so you can pull and push images without TLS verification. This guide covers all the ways to configure insecure registries in Podman.

---

## When to Use Insecure Registries

Insecure registries are appropriate in limited scenarios.

```bash
# Common scenarios for insecure registries:

# - Local development registries running on localhost
# - CI/CD build environments with internal registries
# - Testing environments with self-signed certificates
# - Air-gapped environments without a CA infrastructure

# NEVER use insecure registries in production
```

## Configuring via registries.conf

The recommended way to mark a registry as insecure is through the configuration file.

```bash
# Back up the current configuration
sudo cp /etc/containers/registries.conf /etc/containers/registries.conf.bak

# Add an insecure registry block
sudo tee -a /etc/containers/registries.conf <<'EOF'

# Development registry running without TLS
[[registry]]
prefix = "dev-registry.local:5000"
location = "dev-registry.local:5000"
insecure = true
EOF
```

## Configuring for Localhost

Registries running on localhost are a common development pattern.

```bash
# Start a local registry without TLS
podman run -d \
  --name local-registry \
  -p 5000:5000 \
  docker.io/library/registry:2

# Configure Podman to treat localhost:5000 as insecure
sudo tee -a /etc/containers/registries.conf <<'EOF'

[[registry]]
prefix = "localhost:5000"
location = "localhost:5000"
insecure = true
EOF
```

```bash
# Test pushing to the local insecure registry
podman pull docker.io/library/alpine:latest
podman tag docker.io/library/alpine:latest localhost:5000/alpine:latest
podman push localhost:5000/alpine:latest

# Verify the image is in the registry
curl -s http://localhost:5000/v2/_catalog
```

## Using the --tls-verify Flag

You can skip TLS verification on a per-command basis without modifying configuration files.

```bash
# Pull from an insecure registry using the flag
podman pull --tls-verify=false dev-registry.local:5000/myapp:latest

# Push to an insecure registry using the flag
podman push --tls-verify=false localhost:5000/myapp:latest

# Login to an insecure registry
podman login --tls-verify=false dev-registry.local:5000
```

## Insecure Mirrors

You can also mark registry mirrors as insecure independently from the primary registry.

```toml
# /etc/containers/registries.conf

[[registry]]
prefix = "docker.io"
location = "docker.io"
insecure = false

# Local mirror running without TLS
[[registry.mirror]]
location = "local-cache.internal:5000"
insecure = true
```

## User-Level Insecure Configuration

Rootless users can configure insecure registries without root access.

```bash
# Create user-level configuration directory
mkdir -p ~/.config/containers

# Add insecure registry at user level
cat > ~/.config/containers/registries.conf <<'EOF'
unqualified-search-registries = ["docker.io"]

[[registry]]
prefix = "localhost:5000"
location = "localhost:5000"
insecure = true

[[registry]]
prefix = "dev-registry.local:5000"
location = "dev-registry.local:5000"
insecure = true
EOF
```

## Verifying the Configuration

Confirm that the insecure registry is properly configured.

```bash
# Check Podman's registry configuration
podman info --format '{{.Registries}}'

# Test with debug logging to see TLS behavior
podman --log-level=debug pull localhost:5000/alpine:latest 2>&1 | grep -i "tls\|insecure\|http"

# Verify connectivity to the insecure registry
curl -s http://dev-registry.local:5000/v2/_catalog
```

## Security Considerations

Even in development, take precautions with insecure registries.

```bash
# Restrict insecure registries to specific network interfaces
# When running a local registry, bind to localhost only
podman run -d \
  --name secure-local-registry \
  -p 127.0.0.1:5000:5000 \
  docker.io/library/registry:2

# Never expose insecure registries to public networks
# Use firewall rules to restrict access
sudo firewall-cmd --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" port port="5000" protocol="tcp" accept'
```

## Reverting Insecure Configuration

When moving to production, remove insecure registry settings.

```bash
# Remove insecure flags from registry blocks
sudo sed -i '/insecure = true/d' /etc/containers/registries.conf

# Or restore from backup
sudo cp /etc/containers/registries.conf.bak /etc/containers/registries.conf

# Verify the change
podman info --format '{{.Registries}}'
```

## Summary

Podman supports insecure registries for development and testing through the `insecure = true` setting in `registries.conf` or the `--tls-verify=false` flag on individual commands. Always limit insecure registries to development environments, bind them to localhost when possible, and remove insecure configurations before deploying to production. The per-command flag approach is preferred for one-off operations as it does not persist the insecure setting.
