# How to Configure Proxy Settings in Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Proxy, Networking, Enterprise

Description: Learn how to configure HTTP and HTTPS proxy settings in Podman Desktop for pulling images and running containers behind corporate firewalls.

---

> Proper proxy configuration ensures Podman Desktop can pull images, access registries, and build containers even when all traffic must route through a corporate proxy.

In corporate environments, direct internet access is often unavailable and all outbound traffic must flow through HTTP or HTTPS proxies. Podman Desktop needs proxy configuration at multiple levels: for pulling images, for building containers, and for containers that need internet access at runtime. This guide covers all the proxy configuration points.

---

## Proxy Configuration Levels

Podman Desktop uses proxy settings at three levels:

1. **System-level**: Inherited from your OS proxy settings when Podman Desktop is set to use the system proxy.
2. **Podman engine-level**: Configured in containers.conf for image operations.
3. **Container-level**: Passed to running containers as environment variables.

On Linux, Podman Desktop proxy settings do not affect Podman itself; configure Podman with environment variables or `containers.conf`.

```bash
# Check if system proxy variables are set

echo "HTTP_PROXY: $HTTP_PROXY"
echo "HTTPS_PROXY: $HTTPS_PROXY"
echo "NO_PROXY: $NO_PROXY"
```

## Configuring Proxy in Podman Desktop UI

Podman Desktop provides proxy settings in its preferences:

1. Open Podman Desktop and go to **Settings** (gear icon).
2. Navigate to **Proxy** from the left navigation pane.
3. Select **System**, **Manual**, or **Disabled**.
4. If you select **Manual**, enter your HTTP proxy URL (e.g., `http://proxy.company.com:8080`).
5. Enter your HTTPS proxy URL (often the same as HTTP).
6. Add bypass proxy entries for internal addresses.
7. Click **Update** to apply the settings, then confirm the notification.

## Setting Proxy via Environment Variables

Configure proxy at the shell level for all Podman operations:

```bash
# Set proxy environment variables
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="http://proxy.company.com:8080"
export NO_PROXY="localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.company.com"

# Make them permanent
cat >> ~/.zshrc << 'EOF'
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="http://proxy.company.com:8080"
export NO_PROXY="localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.company.com"
EOF
source ~/.zshrc

# Verify the settings
env | grep -i proxy
```

## Configuring Proxy in containers.conf

Set proxy at the Podman engine level:

```bash
# Create or edit the containers configuration
mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
# Pass proxy settings to all new containers
http_proxy = true

[engine]
# Environment variables for Podman engine operations
env = [
  "HTTP_PROXY=http://proxy.company.com:8080",
  "HTTPS_PROXY=http://proxy.company.com:8080",
  "NO_PROXY=localhost,127.0.0.1,.company.com"
]
EOF
```

## Configuring Proxy for Image Pulls

Image pulls from registries need proxy access:

```bash
# Test pulling an image through the proxy
HTTP_PROXY="http://proxy.company.com:8080" \
HTTPS_PROXY="http://proxy.company.com:8080" \
podman pull docker.io/library/nginx:alpine

# If using authentication with the proxy
export HTTP_PROXY="http://username:password@proxy.company.com:8080"
export HTTPS_PROXY="http://username:password@proxy.company.com:8080"

podman pull alpine
```

## Passing Proxy to Containers at Runtime

Containers that need internet access require proxy settings:

```bash
# Pass proxy settings when running a container
podman run -d --name web-app \
  -e HTTP_PROXY="http://proxy.company.com:8080" \
  -e HTTPS_PROXY="http://proxy.company.com:8080" \
  -e NO_PROXY="localhost,127.0.0.1" \
  -e http_proxy="http://proxy.company.com:8080" \
  -e https_proxy="http://proxy.company.com:8080" \
  -e no_proxy="localhost,127.0.0.1" \
  my-app:latest

# Test internet access from inside the container
podman exec web-app curl -s https://httpbin.org/ip
```

Note that both uppercase and lowercase variable names are set because different tools check different cases.

## Configuring Proxy for Container Builds

Builds need proxy access to download dependencies:

```bash
# Pass proxy as build arguments
podman build \
  --build-arg HTTP_PROXY="http://proxy.company.com:8080" \
  --build-arg HTTPS_PROXY="http://proxy.company.com:8080" \
  --build-arg NO_PROXY="localhost,127.0.0.1" \
  -t my-app:latest .

# Or set them in the Containerfile
# Note: build args are not persisted in the final image
```

Example Containerfile with proxy support:

```dockerfile
FROM node:18-alpine

# These are set via --build-arg, not hardcoded
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

WORKDIR /app
COPY package*.json ./

# npm will use the proxy for downloading packages
RUN npm install

COPY . .
CMD ["node", "server.js"]
```

## Configuring Proxy for the Podman Machine (macOS)

On macOS, configure the Podman Desktop proxy settings and restart the Podman machine from **Settings > Resources**. To pass proxy settings into containers running inside the Podman machine, edit `containers.conf` inside the VM:

```bash
# SSH into the Podman machine
podman machine ssh

# Edit the rootless containers.conf file inside the VM
mkdir -p ~/.config/containers

cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
http_proxy = true
env = [
  "http_proxy=http://proxy.company.com:8080",
  "https_proxy=http://proxy.company.com:8080",
  "no_proxy=localhost,127.0.0.1"
]
EOF

exit

# Restart the Podman machine from Podman Desktop Settings > Resources
```

## Proxy with Authentication

For proxies that require credentials:

```bash
# URL-encoded credentials in the proxy URL
export HTTP_PROXY="http://user:p%40ssword@proxy.company.com:8080"
export HTTPS_PROXY="http://user:p%40ssword@proxy.company.com:8080"

# Special characters in passwords must be URL-encoded
# @ = %40, # = %23, : = %3A, / = %2F
```

## Troubleshooting Proxy Issues

```bash
# Test proxy connectivity
curl -x http://proxy.company.com:8080 https://registry-1.docker.io/v2/

# Check if Podman is using the proxy
podman info 2>&1 | grep -i proxy

# Debug image pull with verbose output
podman pull --log-level=debug docker.io/library/alpine 2>&1 | head -50

# Verify no-proxy exceptions are working
podman run --rm alpine wget -q -O- http://internal.company.com/health
```

## Summary

Configuring proxy settings in Podman Desktop requires attention to multiple layers: the Podman engine for image pulls, individual containers for runtime access, and build processes for dependency downloads. By setting proxy variables at the shell level, in the containers.conf file, and through the Podman Desktop UI, you ensure all container operations work correctly behind corporate firewalls. Proper no-proxy exceptions prevent unnecessary routing of internal traffic through the proxy.
