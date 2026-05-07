# How to Fix Rootless Podman Networking Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Container, Networking, Rootless, Troubleshooting

Description: A comprehensive guide to diagnosing and fixing networking issues specific to rootless Podman, covering slirp4netns, pasta, port mapping, container-to-container communication, and host access.

---

> Rootless Podman networking works fundamentally differently from rootful networking. Understanding the constraints of user namespace networking is the key to fixing connectivity issues, port binding failures, and container isolation problems.

Rootless Podman cannot create real network bridges or modify iptables rules because those operations require root privileges. Instead, it uses userspace networking solutions like `slirp4netns` or `pasta` to provide network connectivity to containers. These tools create a virtual network stack that translates between the container's network namespace and the host network without requiring elevated privileges.

This architectural difference means some networking features that work in rootful mode either behave differently or are not available in rootless mode. This guide covers the common issues and their solutions.

---

## Understanding Rootless Networking Backends

Podman supports two rootless networking backends:

### slirp4netns

The original rootless networking solution. It creates a TAP device connected to the container and performs userspace TCP/IP translation. It works reliably but has some performance overhead and limitations.

### pasta (from passt)

A newer, faster alternative to slirp4netns that uses a different approach to userspace networking. It provides better performance and more features. It is the default in newer Podman versions.

Check which Podman network backend you are using:

```bash
podman info --format '{{.Host.NetworkBackend}}'
```

This reports `netavark` or `cni`. To check which rootless networking command is configured, inspect `containers.conf`:

```bash
grep -R "default_rootless_network_cmd" ~/.config/containers/containers.conf /etc/containers/containers.conf /usr/share/containers/containers.conf 2>/dev/null
```

## Port Binding Failures

### Cannot Bind to Privileged Ports

By default, non-root users cannot bind to ports below 1024. If you try to expose port 80 or 443, it fails:

```bash
podman run -p 80:80 nginx
# Error: rootlessport cannot expose privileged port 80

```

**Solution 1**: Use a non-privileged port and redirect:

```bash
podman run -p 8080:80 nginx
```

**Solution 2**: Lower the unprivileged port start:

```bash
sudo sysctl net.ipv4.ip_unprivileged_port_start=80
```

Make it permanent:

```bash
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee /etc/sysctl.d/podman-privileged-ports.conf
sudo sysctl --system
```

**Solution 3**: Redirect from the privileged port to an unprivileged one with a proxy, firewall rule, or redirection tool:

```bash
sudo firewall-cmd --add-forward-port=port=80:proto=tcp:toport=8080 --permanent
sudo firewall-cmd --reload
```

### Port Already in Use

The error "address already in use" means another process is listening on that port:

```bash
# Find what is using the port
ss -tlnp | grep :8080
```

Use a different port or stop the conflicting process.

### Port Not Accessible from Other Machines

By default, rootless Podman binds to `0.0.0.0`, which should be accessible from other machines. If it is not, check for firewall rules:

```bash
sudo firewall-cmd --list-all
```

Add the port to the firewall:

```bash
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

## Container-to-Container Communication

### Containers Cannot Reach Each Other by Name

In rootless mode, DNS resolution between containers requires a custom network. Containers on the default network cannot resolve each other by name.

Create a custom network and connect containers to it:

```bash
# Create a network with DNS enabled
podman network create mynet

# Start containers on the same network
podman run -d --name web --network mynet nginx
podman run -d --name app --network mynet myapp

# Now 'app' can reach 'web' by hostname
podman exec app curl http://web:80
```

### Containers Cannot Communicate on Default Network

In the default rootless network mode, each container gets its own isolated slirp4netns or pasta instance. They cannot communicate directly.

**Solution**: Always use a custom network for containers that need to talk to each other:

```bash
podman network create --driver bridge appnet
podman run -d --name db --network appnet postgres:15
podman run -d --name api --network appnet -e DB_HOST=db myapi
```

## Accessing Host Services from Containers

Containers often need to connect to services running on the host (databases, caches, APIs). In rootless mode, the Docker-compatible `host.docker.internal` name is not guaranteed unless Podman can add it for the container's network setup.

### Using host.containers.internal

Newer versions of Podman add `host.containers.internal` to the container's `/etc/hosts`:

```bash
podman run --rm myimage ping -c1 host.containers.internal
```

### Using Host Network Mode

For full access to the host network:

```bash
podman run --network host myimage
```

This disables network isolation entirely. The container shares the host's network stack and can access all host services on `localhost`.

### Using the Gateway Address

With slirp4netns, the container's default gateway is commonly `10.0.2.2`. Host loopback access through that address may require `allow_host_loopback=true`:

```bash
podman run --rm --network slirp4netns:allow_host_loopback=true myimage ip route | grep default
# default via 10.0.2.2 dev tap0
# Access host services via 10.0.2.2
```

## Slow Network Performance

Rootless networking adds overhead because all traffic passes through a userspace proxy. If you notice slow network performance:

### Switch to pasta

`pasta` generally has better performance than `slirp4netns`:

```bash
# Install pasta/passt
sudo dnf install passt
# or
sudo apt install passt
```

Configure Podman to use pasta. Edit `~/.config/containers/containers.conf`:

```ini
[network]
default_rootless_network_cmd = "pasta"
```

### Use Host Network for Performance-Sensitive Workloads

```bash
podman run --network host myimage
```

This eliminates all userspace networking overhead but sacrifices isolation.

### Tune slirp4netns Options

If you must use slirp4netns, tune it for better performance:

```bash
podman run --network slirp4netns:enable_ipv6=false,mtu=65520 myimage
```

Disabling IPv6 and increasing the MTU can improve throughput.

## DNS Resolution Failures in Rootless Mode

Containers might fail to resolve external hostnames:

```bash
podman run --rm alpine nslookup google.com
# ;; connection timed out; no servers could be reached
```

### Check Host DNS Configuration

Rootless containers inherit DNS from the host or from slirp4netns/pasta configuration. Check the host DNS:

```bash
cat /etc/resolv.conf
```

If `/etc/resolv.conf` points to `127.0.0.53` (systemd-resolved), the container cannot reach this address because it is in a different network namespace.

**Solution**: Configure Podman to use a public DNS server. Edit `~/.config/containers/containers.conf`:

```ini
[containers]
dns_servers = ["8.8.8.8", "8.8.4.4"]
```

Or specify DNS per container:

```bash
podman run --dns 8.8.8.8 myimage
```

### DNS with Custom Networks

When using custom networks with Netavark, DNS is handled by `aardvark-dns`. Ensure it is installed:

```bash
which aardvark-dns
# Should output: /usr/libexec/podman/aardvark-dns
```

If it is missing, install it:

```bash
sudo dnf install aardvark-dns
# or
sudo apt install aardvark-dns
```

## Firewall and Network Namespace Issues

### Firewalld Blocking Container Traffic

On Fedora and RHEL systems, firewalld can block container traffic. Check the firewall zone for the container interface:

```bash
sudo firewall-cmd --get-active-zones
```

For rootful bridge networks, add the Podman interface to the trusted zone:

```bash
sudo firewall-cmd --zone=trusted --add-interface=podman0 --permanent
sudo firewall-cmd --reload
```

For rootless custom networks, the interface name varies and may be inside the user's network namespace. Check the specific network with:

```bash
podman network inspect appnet --format '{{.NetworkInterface}}'
```

### nftables Rules

On newer systems using nftables, check for rules that might block container traffic:

```bash
sudo nft list ruleset | grep -i drop
```

## Debugging Rootless Networking

### Check Container Network Configuration

```bash
podman exec mycontainer ip addr show
podman exec mycontainer ip route
podman exec mycontainer cat /etc/resolv.conf
```

### Test Connectivity Step by Step

```bash
# Test outbound connectivity
podman run --rm alpine ping -c3 8.8.8.8

# Test DNS
podman run --rm alpine nslookup google.com

# Test HTTP
podman run --rm alpine wget -qO- http://example.com
```

### Check the Networking Process

For slirp4netns:

```bash
ps aux | grep slirp4netns
```

For pasta:

```bash
ps aux | grep pasta
```

### Enable Debug Logging

```bash
podman --log-level=debug run --rm -p 8080:80 nginx 2>&1 | grep -i network
```

## Conclusion

Rootless Podman networking issues stem from the fundamental constraint that non-root users cannot create bridges or manipulate iptables. The userspace proxies (slirp4netns and pasta) provide connectivity but with trade-offs in performance and features. Use custom networks for container-to-container communication, configure DNS servers explicitly when the host uses systemd-resolved, use `pasta` for better performance, and lower the unprivileged port start if you need ports below 1024. For workloads where network performance is critical and isolation is less important, `--network host` bypasses the userspace proxy entirely.
