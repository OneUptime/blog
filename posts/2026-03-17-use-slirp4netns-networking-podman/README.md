# How to Use slirp4netns Networking with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, slirp4netns, Rootless

Description: Learn how to use slirp4netns as the rootless networking backend in Podman and configure its options.

---

> slirp4netns provides user-mode networking for rootless containers, enabling network connectivity without requiring root privileges or iptables access.

slirp4netns is a user-space networking tool that creates a TAP device in the container's network namespace and translates network traffic. It was the original rootless networking backend for Podman and remains available as an alternative to pasta.

---

## Checking slirp4netns Availability

```bash
# Check if slirp4netns is installed

which slirp4netns

# Check the version
slirp4netns --version

# Verify Podman can use it
podman info | grep -A3 slirp4netns
```

## Using slirp4netns Explicitly

```bash
# Run a container with slirp4netns networking
podman run -d --name web \
  --network slirp4netns \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Verify connectivity
podman run --rm --network slirp4netns \
  docker.io/library/alpine:latest ping -c 3 8.8.8.8
curl http://localhost:8080
```

## slirp4netns Configuration Options

```bash
# Enable IPv6 support
podman run -d --name app \
  --network slirp4netns:enable_ipv6=true \
  docker.io/library/alpine:latest tail -f /dev/null

# Set custom MTU
podman run -d --name app2 \
  --network slirp4netns:mtu=1400 \
  docker.io/library/alpine:latest tail -f /dev/null

# Set custom CIDR
podman run -d --name app3 \
  --network slirp4netns:cidr=10.0.3.0/24 \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Port Handler Options

slirp4netns supports different port handler backends:

```bash
# Use rootlesskit port handler (the default)
podman run -d --name web-rootlesskit \
  --network slirp4netns:port_handler=rootlesskit \
  -p 8082:80 \
  docker.io/library/nginx:latest

# Use slirp4netns built-in port handler
podman run -d --name web2 \
  --network slirp4netns:port_handler=slirp4netns \
  -p 8081:80 \
  docker.io/library/nginx:latest
```

## Accessing the Host from slirp4netns

```bash
# The host is accessible via the gateway IP (default 10.0.2.2)
podman run --rm --network slirp4netns \
  docker.io/library/alpine:latest ip route show
# default via 10.0.2.2

# Allow access to services bound to the host loopback address
podman run --rm \
  --network slirp4netns:allow_host_loopback=true \
  docker.io/library/alpine:latest ping -c 2 10.0.2.2
```

## Network Configuration Inside slirp4netns

```bash
# Check the network configuration
podman run --rm --network slirp4netns \
  docker.io/library/alpine:latest sh -c "
    echo '=== IP Address ==='
    ip addr show
    echo '=== Routes ==='
    ip route show
    echo '=== DNS ==='
    cat /etc/resolv.conf
  "
# Typical output:
# IP: 10.0.2.100
# Gateway: 10.0.2.2
# DNS: 10.0.2.3
```

## Setting slirp4netns as Default

```bash
# Configure in containers.conf
# Edit ~/.config/containers/containers.conf

# [network]
# default_rootless_network_cmd = "slirp4netns"
```

## slirp4netns Limitations

- Slower than pasta due to user-space packet processing
- Limited IPv6 support
- Higher memory overhead per container
- Port forwarding requires additional handler processes

```bash
# For better performance, consider switching to pasta
podman run -d --name fast-web \
  --network pasta \
  -p 8083:80 \
  docker.io/library/nginx:latest
```

## Troubleshooting slirp4netns

```bash
# Check if slirp4netns is running for a container
ps aux | grep slirp4netns

# Debug connectivity issues
podman run --rm --network slirp4netns \
  docker.io/library/alpine:latest sh -c "
    ping -c 1 10.0.2.2 && echo 'Gateway reachable' || echo 'Gateway unreachable'
    ping -c 1 8.8.8.8 && echo 'Internet reachable' || echo 'Internet unreachable'
    nslookup google.com && echo 'DNS works' || echo 'DNS fails'
  "

# Run with debug logging
podman --log-level=debug run --rm --network slirp4netns \
  docker.io/library/alpine:latest ip addr show 2>&1 | head -30
```

## Summary

slirp4netns provides user-mode networking for rootless Podman containers by creating a TAP device and translating packets in user space. Configure it with options for IPv6, MTU, CIDR, and port handlers. While functional and widely available, slirp4netns has been largely superseded by pasta which offers better performance. Use slirp4netns when pasta is not available or when compatibility with older Podman versions is needed.
