# How to Switch from slirp4netns to Pasta in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Pasta, slirp4netns, Migration

Description: Learn how to migrate from slirp4netns to pasta networking in Podman for better performance and features.

---

> Switching from slirp4netns to pasta improves rootless container networking performance, adds native IPv6 support, and can reduce networking overhead.

Pasta is the default rootless networking tool in current Podman releases and is the recommended replacement for slirp4netns. The migration is straightforward and brings significant networking improvements. This guide covers the steps to switch and verify the new rootless networking tool.

---

## Checking Your Current Rootless Networking Tool

```bash
# Check the Podman network backend (Netavark or CNI)
podman info --format '{{ .Host.NetworkBackend }}'

# Check the configured rootless networking tool
grep -R "default_rootless_network_cmd" \
  ~/.config/containers/containers.conf \
  /etc/containers/containers.conf \
  /usr/share/containers/containers.conf 2>/dev/null

# Check available rootless networking tools
podman info --format 'Pasta: {{ .Host.Pasta.Executable }}'
podman info --format 'slirp4netns: {{ .Host.Slirp4NetNS.Executable }}'
```

## Installing Pasta

```bash
# On Fedora/RHEL
sudo dnf install passt -y

# On Ubuntu/Debian
sudo apt install passt -y

# On Arch Linux
sudo pacman -S passt

# Verify installation
pasta --version
```

## Switching the Default Rootless Networking Tool

Create or edit `~/.config/containers/containers.conf`. If `[network]` already exists, add only the setting under that section.

```bash
mkdir -p ~/.config/containers
```

```toml
[network]
default_rootless_network_cmd = "pasta"
```

```bash
# Verify the change
podman run -d --name default-net docker.io/library/alpine:latest sleep 300
podman inspect default-net --format '{{ .HostConfig.NetworkMode }}'
podman rm -f default-net
```

## Testing Pasta with Existing Containers

```bash
# Stop running containers
podman stop --all

# Restart a container that uses the default rootless network
podman start web

# Or run a new test container
podman run --rm --network pasta \
  docker.io/library/alpine:latest sh -c "
    echo '=== Network Config ==='
    ip addr show
    echo '=== Connectivity ==='
    ping -c 2 8.8.8.8
    echo '=== DNS ==='
    nslookup google.com
  "
```

## Comparing Performance

```bash
# Test with slirp4netns
podman run --rm --network slirp4netns \
  docker.io/library/alpine:latest sh -c "
    apk add --no-cache curl > /dev/null 2>&1
    time curl -s -o /dev/null http://speedtest.tele2.net/1MB.zip
  "

# Test with pasta
podman run --rm --network pasta \
  docker.io/library/alpine:latest sh -c "
    apk add --no-cache curl > /dev/null 2>&1
    time curl -s -o /dev/null http://speedtest.tele2.net/1MB.zip
  "
```

## Verifying Port Forwarding Works

```bash
# Test port forwarding with pasta
podman run -d --name test-web \
  --network pasta \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Verify the port is published
podman port test-web
curl -s http://localhost:8080

# Clean up
podman rm -f test-web
```

## Handling Migration Issues

```bash
# If containers fail to start after switching, recreate them
podman rm -f mycontainer
podman run -d --name mycontainer \
  --network pasta \
  -p 8080:80 \
  docker.io/library/nginx:latest

# If pasta is not working, temporarily fall back to slirp4netns
podman run -d --name fallback \
  --network slirp4netns \
  -p 8081:80 \
  docker.io/library/nginx:latest
```

## Reverting to slirp4netns

```bash
# If you need to revert, update containers.conf
# Change the line to:
# default_rootless_network_cmd = "slirp4netns"

# Or remove the setting to use Podman's default
sed -i '/default_rootless_network_cmd/d' ~/.config/containers/containers.conf
```

## Key Improvements After Switching

| Feature | slirp4netns | Pasta |
|---------|-------------|-------|
| Throughput | Lower | Higher |
| IPv6 | Supported, but more limited | Native |
| Addressing | NAT-based by default | No NAT by default |
| Port forwarding | Uses a port handler | Preserves source IP by default |

## Summary

Switch from slirp4netns to pasta by installing the `passt` package and setting `default_rootless_network_cmd = "pasta"` in the `[network]` section of `~/.config/containers/containers.conf`. Pasta provides better throughput, native IPv6 support, no NAT by default, and source-IP-preserving port forwarding. Test port forwarding and connectivity after switching, and fall back to slirp4netns per-container if any issues arise during migration.
