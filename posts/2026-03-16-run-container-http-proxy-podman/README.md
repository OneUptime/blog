# How to Run a Container with HTTP Proxy Configuration in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, HTTP Proxy

Description: Learn how to configure HTTP, HTTPS, and no-proxy settings when running containers in Podman for environments that require proxy access.

---

> Proper proxy configuration ensures your containers can reach external services even in restricted network environments.

Running containers behind a corporate firewall or in a restricted network often requires HTTP proxy configuration. Podman provides multiple ways to pass proxy settings to your containers, ensuring they can access external resources. This guide walks you through every method of configuring proxy settings for Podman containers.

---

## Understanding Proxy Configuration in Podman

Podman can pass proxy environment variables to containers automatically or manually. By default, Podman passes proxy settings from the host environment into containers when those variables are set for the Podman process. This behavior can be configured in `containers.conf`. You can also set proxy variables explicitly per container.

## Setting Proxy Variables with --env

The most direct way to configure proxy settings is by passing environment variables when running the container.

```bash
# Run a container with HTTP and HTTPS proxy settings

podman run --rm \
  --env HTTP_PROXY=http://proxy.example.com:8080 \
  --env HTTPS_PROXY=http://proxy.example.com:8443 \
  --env NO_PROXY=localhost,127.0.0.1,.example.com \
  docker.io/library/alpine:latest \
  wget -qO- http://httpbin.org/ip
```

You can also use lowercase variable names, which some applications prefer:

```bash
# Run with lowercase proxy variables (some tools prefer this)
podman run --rm \
  --env http_proxy=http://proxy.example.com:8080 \
  --env https_proxy=http://proxy.example.com:8443 \
  --env no_proxy=localhost,127.0.0.1,.example.com \
  docker.io/library/alpine:latest \
  sh -c 'echo "Proxy: $http_proxy"'
```

## Using an Environment File

For repeated use or to keep credentials out of shell history, store proxy settings in a file.

```bash
# Create a proxy environment file
cat > /tmp/proxy.env << 'EOF'
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8443
NO_PROXY=localhost,127.0.0.1,.example.com
EOF

# Run a container using the env file
podman run --rm \
  --env-file /tmp/proxy.env \
  docker.io/library/alpine:latest \
  sh -c 'echo "HTTP_PROXY=$HTTP_PROXY"'
```

## Configuring Proxy in containers.conf

For system-wide proxy settings that apply to all containers, edit the Podman configuration file.

```bash
# Common locations for containers.conf:
# System: /usr/share/containers/containers.conf
# System override: /etc/containers/containers.conf
# User: ~/.config/containers/containers.conf

# Edit the user-level configuration
mkdir -p ~/.config/containers
cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
http_proxy = true
env = [
  "HTTP_PROXY=http://proxy.example.com:8080",
  "HTTPS_PROXY=http://proxy.example.com:8443",
  "NO_PROXY=localhost,127.0.0.1,.example.com"
]
EOF
```

With `http_proxy = true` set in `containers.conf`, Podman automatically passes the host's proxy environment variables into every container. The `env` array under `[containers]` sets default environment variables for all containers.

## Proxy with Authentication

When your proxy requires authentication, include credentials in the URL.

```bash
# Run with authenticated proxy
podman run --rm \
  --env HTTP_PROXY=http://user:password@proxy.example.com:8080 \
  --env HTTPS_PROXY=http://user:password@proxy.example.com:8443 \
  docker.io/library/alpine:latest \
  wget -qO- http://httpbin.org/ip
```

For better security, use an environment file with restricted permissions:

```bash
# Create a secure proxy env file
cat > /tmp/proxy-auth.env << 'EOF'
HTTP_PROXY=http://user:password@proxy.example.com:8080
HTTPS_PROXY=http://user:password@proxy.example.com:8443
EOF

# Restrict file permissions
chmod 600 /tmp/proxy-auth.env

# Run container with the secure env file
podman run --rm \
  --env-file /tmp/proxy-auth.env \
  docker.io/library/alpine:latest \
  wget -qO- http://httpbin.org/ip
```

## Disabling Proxy for Specific Containers

If proxy settings are being inherited from the host but you need to bypass them for a specific container, disable proxy pass-through with `--http-proxy=false`.

```bash
# Disable proxy for a specific container
podman run --rm \
  --http-proxy=false \
  docker.io/library/alpine:latest \
  sh -c 'echo "No proxy: HTTP_PROXY=$HTTP_PROXY"'
```

If proxy variables are set with the `env` array in `containers.conf`, override the specific variables with empty values instead.

## Verifying Proxy Configuration Inside a Container

Always verify that proxy settings are correctly applied.

```bash
# Check all proxy-related environment variables inside the container
podman run --rm \
  --env HTTP_PROXY=http://proxy.example.com:8080 \
  --env HTTPS_PROXY=http://proxy.example.com:8443 \
  --env NO_PROXY=localhost,127.0.0.1 \
  docker.io/library/alpine:latest \
  sh -c 'env | grep -i proxy'
```

## Building Images Behind a Proxy

Proxy settings are also important during image builds.

```bash
# Build an image with proxy settings using podman build
podman build \
  --build-arg HTTP_PROXY=http://proxy.example.com:8080 \
  --build-arg HTTPS_PROXY=http://proxy.example.com:8443 \
  --build-arg NO_PROXY=localhost,127.0.0.1 \
  -t my-app:latest .
```

## Summary

Podman offers flexible proxy configuration through environment variables, env files, and global configuration. Use `--env` flags for one-off containers, env files for repeatable setups, and `containers.conf` for system-wide defaults. Always verify your proxy settings inside the container with `env | grep -i proxy` to confirm they are applied correctly.
