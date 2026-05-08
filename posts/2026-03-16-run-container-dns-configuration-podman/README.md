# How to Run a Container with DNS Configuration in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, DNS

Description: Learn how to configure custom DNS servers, search domains, and DNS options for Podman containers to control name resolution behavior.

---

> Proper DNS configuration ensures your containers can resolve the right hostnames in any network environment.

DNS resolution inside containers is critical for connecting to external services, databases, and APIs. By default, Podman inherits DNS settings from the host, but you often need to customize DNS behavior. You might want to use internal DNS servers, add search domains for short hostname resolution, or configure specific DNS options for reliability.

This guide covers common DNS configuration options available in Podman.

---

## Default DNS Behavior

By default, Podman copies the host's DNS configuration into the container:

```bash
# Check the default DNS configuration inside a container

podman run --rm alpine cat /etc/resolv.conf
```

## Setting Custom DNS Servers

Use the `--dns` flag to specify custom DNS servers:

```bash
# Use Google's public DNS servers
podman run --rm --dns 8.8.8.8 --dns 8.8.4.4 alpine cat /etc/resolv.conf

# Use Cloudflare DNS
podman run --rm --dns 1.1.1.1 --dns 1.0.0.1 alpine sh -c "
  cat /etc/resolv.conf
  echo '---'
  nslookup example.com
"

# Use an internal corporate DNS server
podman run --rm --dns 10.0.0.53 --dns 10.0.0.54 alpine cat /etc/resolv.conf
```

You can specify multiple `--dns` flags. On a container without Podman's embedded network DNS, the resolv.conf will list them in the order provided.

## Setting DNS Search Domains

Use `--dns-search` to add search domains for unqualified hostnames:

```bash
# Add search domains
podman run --rm \
  --dns-search example.com \
  --dns-search internal.corp \
  alpine cat /etc/resolv.conf

# With search domains, short hostnames are expanded
# "myservice" becomes "myservice.example.com" and "myservice.internal.corp"
podman run --rm \
  --dns 8.8.8.8 \
  --dns-search example.com \
  alpine sh -c "
    echo 'resolv.conf contents:'
    cat /etc/resolv.conf
  "
```

## Setting DNS Options

Use `--dns-option` to add options to resolv.conf:

```bash
# Add DNS options for timeout and retry behavior
podman run --rm \
  --dns 8.8.8.8 \
  --dns-option timeout:2 \
  --dns-option attempts:3 \
  --dns-option rotate \
  alpine cat /etc/resolv.conf

# Common DNS options:
# timeout:N  - set query timeout to N seconds
# attempts:N - number of retries before giving up
# rotate     - round-robin between nameservers
# ndots:N    - minimum dots in a name before absolute lookup
podman run --rm \
  --dns 8.8.8.8 \
  --dns-option ndots:5 \
  --dns-option timeout:1 \
  --dns-option attempts:5 \
  --dns-option rotate \
  alpine cat /etc/resolv.conf
```

## Combining All DNS Options

```bash
# Full DNS configuration for a production container
podman run -d --name production-app \
  --dns 10.0.0.53 \
  --dns 10.0.0.54 \
  --dns 8.8.8.8 \
  --dns-search mycompany.com \
  --dns-search internal.mycompany.com \
  --dns-option timeout:2 \
  --dns-option attempts:3 \
  --dns-option rotate \
  nginx:latest

# Verify the full DNS configuration
podman exec production-app cat /etc/resolv.conf
```

## DNS with Custom Networks

Custom networks in Podman provide built-in DNS resolution between containers:

```bash
# Create a custom network
podman network create app-network

# Start containers on the custom network
podman run -d --name db --network app-network alpine sleep infinity
podman run -d --name web --network app-network alpine sleep infinity

# Containers can resolve each other by name via the embedded DNS
podman exec web ping -c 2 db

# You can still add custom DNS servers for non-container queries
podman run -d --name api \
  --network app-network \
  --dns 8.8.8.8 \
  alpine sleep infinity

# With DNS enabled on the network, Podman's embedded DNS resolves container names
# and forwards external queries to the configured DNS server
podman exec api sh -c "
  ping -c 1 db && echo 'Can resolve container name'
  ping -c 1 google.com && echo 'Can resolve external host'
"
```

## Adding Host Entries with --add-host

For specific hostname-to-IP mappings, use `--add-host`:

```bash
# Add custom host entries (written to /etc/hosts)
podman run --rm \
  --add-host mydb:10.0.0.50 \
  --add-host myapi:10.0.0.51 \
  --add-host "cache.local:10.0.0.52" \
  alpine sh -c "
    cat /etc/hosts
    echo '---'
    ping -c 1 mydb
  "

# Map a hostname to the host machine
podman run --rm \
  --add-host host.local:host-gateway \
  alpine sh -c "
    echo 'Host gateway entry:'
    grep host.local /etc/hosts
  "
```

## Disabling DNS for a Container

If you need a container with no DNS resolution:

```bash
# Using --network none disables networking, so DNS queries cannot succeed
podman run --rm --network none alpine sh -c "
  cat /etc/resolv.conf 2>/dev/null || echo 'No resolv.conf'
  ping -c 1 google.com 2>&1 || echo 'No DNS resolution (expected)'
"
```

## Debugging DNS Issues

When DNS is not working as expected:

```bash
# Check resolv.conf inside the container
podman exec production-app cat /etc/resolv.conf

# Check /etc/hosts
podman exec production-app cat /etc/hosts

# Test DNS resolution with nslookup
podman run --rm \
  --dns 8.8.8.8 \
  alpine sh -c "
    nslookup google.com
    echo '---'
    nslookup example.com
  "

# Test with a specific DNS server using dig (if available)
podman run --rm \
  --dns 8.8.8.8 \
  alpine sh -c "
    apk add --no-cache bind-tools > /dev/null 2>&1
    dig @8.8.8.8 google.com +short
  "
```

## DNS Configuration in Pods

When running pods, DNS settings apply at the pod level:

```bash
# Create a pod with DNS configuration
podman pod create --name my-pod \
  --dns 8.8.8.8 \
  --dns-search example.com

# Containers in the pod inherit the pod's DNS settings
podman run -d --pod my-pod --name pod-web alpine sleep infinity
podman exec pod-web cat /etc/resolv.conf
```

## Summary

DNS configuration in Podman gives you full control over name resolution:

- `--dns`: Specify custom DNS servers
- `--dns-search`: Add search domains for short hostname resolution
- `--dns-option`: Set resolver options like timeout, attempts, and rotation
- `--add-host`: Add static hostname-to-IP mappings
- Custom networks provide automatic container-to-container DNS
- `--network none` disables networking, so DNS queries cannot succeed

Configure DNS to match your network environment, and use search domains and DNS options to optimize resolution behavior for your workloads.
