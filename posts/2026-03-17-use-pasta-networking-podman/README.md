# How to Use Pasta Networking with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Pasta, Rootless

Description: Learn how to use pasta as the rootless networking backend in Podman for improved performance and features.

---

> Pasta is the modern rootless networking tool for Podman, offering better performance, IPv6 support, and simpler configuration compared to the legacy slirp4netns.

Pasta (Pack A Subtle Tap Abstraction) is a user-space networking tool that provides network connectivity for rootless containers. It is the default rootless networking tool in newer versions of Podman and offers significant improvements over slirp4netns.

---

## Checking if Pasta is Available

```bash
# Check if pasta is installed

which pasta

# Check the pasta executable detected by Podman
podman info --format '{{ .Host.Pasta.Executable }}'

# Verify pasta version
pasta --version 2>/dev/null || echo "pasta not found"
```

## Installing Pasta

```bash
# On Fedora/RHEL
sudo dnf install passt -y

# On Ubuntu/Debian
sudo apt install passt -y

# Verify installation
pasta --version
```

## Using Pasta Explicitly

```bash
# Run a container with pasta networking
podman run -d --name web \
  --network pasta \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Verify the container is using pasta
podman inspect web --format '{{ .HostConfig.NetworkMode }}'
```

## Pasta Configuration Options

```bash
# Pass options to pasta via the network flag
podman run -d --name app \
  --network pasta:--map-gw \
  -p 3000:3000 \
  docker.io/library/node:20 tail -f /dev/null

# Configure MTU
podman run -d --name app2 \
  --network pasta:--mtu,1400 \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Port Forwarding with Pasta

Pasta handles port forwarding natively:

```bash
# Standard port mapping
podman run -d --name web \
  --network pasta \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Multiple ports
podman run -d --name multi \
  --network pasta \
  -p 3000:3000 \
  -p 5432:5432 \
  docker.io/library/alpine:latest tail -f /dev/null

# Port ranges
podman run -d --name range \
  --network pasta \
  -p 9000-9010:9000-9010 \
  docker.io/library/alpine:latest tail -f /dev/null
```

## IPv6 with Pasta

Pasta has native IPv6 support:

```bash
# Pasta automatically provides IPv6 connectivity
podman run --rm --network pasta \
  docker.io/library/alpine:latest ip -6 addr show

# Publish on IPv6
podman run -d --name web6 \
  --network pasta \
  -p "[::]:8080:80" \
  docker.io/library/nginx:latest
```

## Pasta vs slirp4netns

| Feature | Pasta | slirp4netns |
|---------|-------|-------------|
| Performance | Better | Slower |
| IPv6 | Native | Limited |
| Port forwarding | Efficient | Overhead |
| Memory usage | Lower | Higher |
| Default in Podman | >= 5.0 | < 5.0 |

## Setting Pasta as Default

```bash
# Set pasta as default in containers.conf
# Edit ~/.config/containers/containers.conf

# [network]
# default_rootless_network_cmd = "pasta"

# Verify the default
podman run -d --name default-net docker.io/library/alpine:latest sleep 300
podman inspect default-net --format '{{ .HostConfig.NetworkMode }}'
podman rm -f default-net
```

## Troubleshooting Pasta

```bash
# Check pasta process
ps aux | grep pasta

# Run with debug logging
podman --log-level=debug run --rm --network pasta \
  docker.io/library/alpine:latest ip addr show 2>&1 | grep pasta

# Test basic connectivity
podman run --rm --network pasta \
  docker.io/library/alpine:latest ping -c 3 8.8.8.8

# Check if pasta binary is accessible
ls -la $(which pasta 2>/dev/null)
```

## Summary

Pasta is the modern rootless networking tool for Podman, providing better performance, native IPv6 support, and lower memory usage compared to slirp4netns. Install the `passt` package to get pasta, and use it explicitly with `--network pasta` or set it as the default in `containers.conf`. Pasta handles port forwarding natively and is the default rootless networking tool in Podman 5.0 and later.
