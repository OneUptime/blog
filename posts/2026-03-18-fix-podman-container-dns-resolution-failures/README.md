# How to Fix Podman Container DNS Resolution Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Container, DNS, Networking, Troubleshooting

Description: A complete guide to diagnosing and fixing DNS resolution failures in Podman containers, covering systemd-resolved, custom networks, aardvark-dns, and resolv.conf configuration.

---

> DNS resolution failures in Podman containers prevent applications from reaching external services and other containers by name. The causes range from systemd-resolved incompatibility to missing aardvark-dns to incorrect network configuration. This guide covers every common scenario.

When a container cannot resolve hostnames, almost everything breaks. Application code that connects to databases by hostname, API clients that need to reach external services, and package managers that need to download dependencies all fail. DNS resolution failures in Podman containers are common because the container's network namespace has its own DNS configuration that does not automatically inherit the host's working setup.

This guide walks through each cause and provides tested solutions.

---

## Quick Diagnosis

Start by identifying exactly what is failing:

```bash
# Test if DNS works at all

podman run --rm alpine nslookup google.com

# Test if raw IP connectivity works (bypasses DNS)
podman run --rm alpine ping -c3 8.8.8.8

# Test if internal container DNS works (on custom networks)
podman run --rm --network mynet alpine nslookup other-container
```

If IP connectivity works but DNS does not, the problem is specifically with DNS configuration, not with networking in general.

## The systemd-resolved Problem

The most common cause of DNS failures in Podman containers is `systemd-resolved`. On many modern Linux distributions (Ubuntu, Fedora, Arch), DNS is handled by systemd-resolved, which listens on `127.0.0.53`. The host's `/etc/resolv.conf` points to this address:

```text
nameserver 127.0.0.53
```

The problem is that `127.0.0.53` is only reachable on the host's loopback interface. Inside a container's network namespace, that address does not exist.

### Check if You Are Affected

```bash
cat /etc/resolv.conf
```

If you see `nameserver 127.0.0.53`, you have this problem.

### Solution 1: Use the Resolved Upstream Configuration

systemd-resolved also creates a file with the actual upstream DNS servers. Point Podman to use these instead.

Check what file `/etc/resolv.conf` is symlinked to:

```bash
ls -la /etc/resolv.conf
```

If it points to `/run/systemd/resolve/stub-resolv.conf`, change it to use the full configuration:

```bash
sudo ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf
```

This file contains the actual upstream DNS servers instead of `127.0.0.53`.

### Solution 2: Configure DNS Servers in Podman

Set explicit DNS servers in your Podman configuration. Edit `~/.config/containers/containers.conf`:

```ini
[containers]
dns_servers = ["8.8.8.8", "8.8.4.4", "1.1.1.1"]
```

### Solution 3: Specify DNS Per Container

```bash
podman run --dns 8.8.8.8 --dns 8.8.4.4 myimage
```

### Solution 4: Configure systemd-resolved to Listen on the Podman Bridge

Edit the resolved configuration:

```bash
sudo mkdir -p /etc/systemd/resolved.conf.d/
sudo tee /etc/systemd/resolved.conf.d/podman.conf >/dev/null << 'EOF'
[Resolve]
DNSStubListenerExtra=10.88.0.1
EOF
sudo systemctl restart systemd-resolved
```

This makes resolved listen on the Podman bridge address, which containers can reach. Then configure Podman or the container to use that bridge address:

```bash
podman run --dns 10.88.0.1 myimage
```

## DNS Between Containers (aardvark-dns)

When using Podman with the Netavark networking backend, container-to-container DNS resolution is handled by `aardvark-dns`. This allows containers on the same custom network to resolve each other by name.

### Verify aardvark-dns Is Installed

```bash
which aardvark-dns
rpm -q aardvark-dns 2>/dev/null || dpkg -l aardvark-dns 2>/dev/null
```

If it is not installed:

```bash
# Fedora/RHEL
sudo dnf install aardvark-dns

# Ubuntu/Debian
sudo apt install aardvark-dns
```

### Container DNS Only Works on Custom Networks

The default `podman` network does not enable DNS by default. You must create a custom network. Custom networks have DNS enabled by default:

```bash
podman network create mynet
```

If you need to explicitly disable DNS on a custom network, use the `--disable-dns` flag. To verify DNS is enabled on the network:

```bash
podman network inspect mynet --format '{{.DNSEnabled}}'
```

### Testing Container-to-Container DNS

```bash
# Create a network
podman network create testnet

# Start two containers
podman run -d --name server --network testnet nginx
podman run -d --name client --network testnet alpine sleep 3600

# Test DNS resolution
podman exec client nslookup server
podman exec client ping -c3 server
```

If `nslookup` fails but the containers are on the same network, check that aardvark-dns is running:

```bash
ps aux | grep aardvark
```

### Restarting aardvark-dns

If aardvark-dns is not running or is in a bad state, restart it by recreating the network:

```bash
podman network disconnect mynet mycontainer
podman network connect mynet mycontainer
```

Or remove and recreate the containers on the network.

## DNS Failures in Rootless Mode

Rootless Podman uses slirp4netns or pasta for networking, each with its own DNS handling.

### slirp4netns DNS

slirp4netns has a built-in DNS forwarder that listens on `10.0.2.3` inside the container. If DNS fails with slirp4netns:

```bash
# Check what DNS the container is using
podman run --rm myimage cat /etc/resolv.conf
```

You should see `10.0.2.3` as the nameserver. If it shows something else, override it:

```bash
podman run --dns 10.0.2.3 myimage
```

If `10.0.2.3` itself is not resolving, it means slirp4netns cannot reach the host's DNS. Check that the host's DNS is working:

```bash
# On the host
nslookup google.com
```

### pasta DNS

pasta passes through the host's DNS configuration more directly. If DNS fails with pasta, check:

```bash
podman run --rm --network=pasta myimage cat /etc/resolv.conf
```

The resolv.conf should contain the host's actual DNS servers. If it contains `127.0.0.53`, apply the systemd-resolved fixes from earlier.

## Custom resolv.conf in Containers

You can provide a custom resolv.conf to containers:

```bash
# Create a custom resolv.conf
cat > /tmp/resolv.conf << 'EOF'
nameserver 8.8.8.8
nameserver 8.8.4.4
search example.com
options ndots:5 timeout:2 attempts:3
EOF

# Mount it into the container
podman run -v /tmp/resolv.conf:/etc/resolv.conf:ro myimage
```

## DNS Search Domains

If short hostnames are not resolving but fully qualified names work, the issue is with search domains:

```bash
# This works
podman exec mycontainer nslookup api.internal.example.com

# This does not
podman exec mycontainer nslookup api
```

Add search domains to the container:

```bash
podman run --dns-search example.com --dns-search internal.example.com myimage
```

Or in `containers.conf`:

```ini
[containers]
dns_searches = ["example.com", "internal.example.com"]
```

## DNS with Podman Compose

In `podman-compose` or `docker-compose` files, DNS configuration can be specified per service:

```yaml
services:
  web:
    image: nginx
    dns:
      - 8.8.8.8
      - 8.8.4.4
    dns_search:
      - example.com
    networks:
      - appnet

  api:
    image: myapi
    depends_on:
      - web
    networks:
      - appnet

networks:
  appnet:
    driver: bridge
```

Services on the same custom network can resolve each other by service name.

## DNS Caching Issues

If DNS resolution was working and suddenly stops, cached DNS entries might be stale. Inside the container, most applications do not cache DNS (they resolve on each connection). But the host's systemd-resolved does cache.

Flush the host DNS cache:

```bash
sudo resolvectl flush-caches
```

## Debugging DNS Issues

### Check What DNS Server the Container Uses

```bash
podman exec mycontainer cat /etc/resolv.conf
```

### Test DNS with Specific Servers

```bash
podman exec mycontainer nslookup google.com 8.8.8.8
```

If this works but the default DNS does not, the problem is with the configured nameserver, not with network connectivity.

### Trace DNS Queries

```bash
podman run --rm --cap-add NET_RAW alpine sh -c "apk add --no-cache bind-tools && dig +trace google.com"
```

### Check Podman Network Configuration

```bash
podman network inspect podman
```

Look for the `dns_enabled` field and the `subnets` configuration.

### Enable Debug Logging

```bash
podman --log-level=debug run --rm myimage nslookup google.com 2>&1 | grep -i dns
```

## IPv6 DNS Issues

If your host has IPv6 enabled but the container does not, DNS queries over IPv6 may time out before falling back to IPv4:

```bash
# Disable IPv6 DNS in the container
podman run --sysctl net.ipv6.conf.all.disable_ipv6=1 myimage
```

Or in slirp4netns:

```bash
podman run --network slirp4netns:enable_ipv6=false myimage
```

## Conclusion

DNS resolution failures in Podman containers most commonly come from three sources: systemd-resolved using `127.0.0.53` (which is unreachable from container namespaces), missing aardvark-dns for container-to-container resolution, and using the default network instead of a custom network with DNS enabled. Fix systemd-resolved issues by pointing `/etc/resolv.conf` to `/run/systemd/resolve/resolv.conf` or by configuring explicit DNS servers in `containers.conf`. For inter-container DNS, create custom networks (which have DNS enabled by default) and ensure aardvark-dns is installed. When in doubt, test with `--dns 8.8.8.8` to confirm the issue is DNS configuration and not a broader networking problem.
