# How to Configure Podman Registry Mirroring and Caching on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Linux

Description: Step-by-step guide on configure podman registry mirroring and caching using Red Hat Enterprise Linux 9.

---

Registry mirroring caches container images locally, reducing bandwidth usage and speeding up image pulls. This is particularly valuable in air-gapped environments or locations with slow internet connections.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Podman and container tools installed

## Step 1: Configure the Cache Registry

Install the container tools package and create a configuration file for a local pull-through cache. This example caches Docker Hub images on port 5000:

```bash
# Install Podman and related container tools
sudo dnf install -y container-tools

# Create directories for registry configuration and cached image data
sudo mkdir -p /opt/registry-cache /var/lib/registry-cache

# Create the registry configuration
sudo tee /opt/registry-cache/config.yml >/dev/null <<'EOF'
version: 0.1
log:
  fields:
    service: registry
storage:
  filesystem:
    rootdirectory: /var/lib/registry
http:
  addr: :5000
proxy:
  remoteurl: https://registry-1.docker.io
EOF
```

Adjust `remoteurl` if you want to cache a different upstream registry. If the upstream registry requires authentication, add the supported `username` and `password` values under `proxy`.

```bash
# Start the cache registry
sudo podman run -d --name registry-cache \
  --restart=always \
  -p 5000:5000 \
  -v /opt/registry-cache/config.yml:/etc/docker/registry/config.yml:Z \
  -v /var/lib/registry-cache:/var/lib/registry:Z \
  docker.io/library/registry:2
```

## Step 2: Configure Podman to Use the Mirror

Edit `/etc/containers/registries.conf` and add a mirror entry for Docker Hub:

```bash
sudo vi /etc/containers/registries.conf
```

```toml
[[registry]]
location = "docker.io"

[[registry.mirror]]
location = "localhost:5000"
insecure = true
```

The `insecure = true` setting is required because this local example uses HTTP instead of TLS. For production, place the cache behind TLS and remove the insecure setting.

## Step 3: Enable and Start the Service

```bash
# Enable Podman's restart service so containers with restart policies come back after reboot
sudo systemctl enable podman-restart.service

# Check that the cache registry container is running
sudo podman ps --filter name=registry-cache
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Verify Podman is working
podman info

# Pull through the configured mirror
podman pull docker.io/library/alpine:latest

# Run a test container from the pulled image
podman run --rm docker.io/library/alpine:latest echo "Hello from Podman"
```

## Troubleshooting

- If the cache container fails to start, check the logs with `podman logs registry-cache`.
- Ensure the required container tools are installed with `rpm -q podman containers-common`.
- If image pulls do not use the mirror, check the registry configuration with `podman info -f json | jq '.registries'`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
