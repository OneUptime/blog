# How to Use Podman with IPv6-Only Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, IPv6, Networking, Container, Linux

Description: Learn how to configure Podman containers to run on IPv6-only networks, including network creation, DNS configuration, NAT64, and dual-stack setups.

---

> As IPv4 address exhaustion continues, IPv6-only deployments are becoming increasingly common. Podman supports IPv6 networking natively, allowing you to run containers on pure IPv6 networks or in dual-stack configurations where both protocols coexist.

The transition to IPv6 is well underway, with major cloud providers and hosting companies offering IPv6-only instances at lower cost. Running your containerized services on IPv6 reduces dependency on scarce IPv4 addresses and prepares your infrastructure for the future. Podman's networking stack supports IPv6 through its bridge driver, macvlan, and custom network configurations.

This guide covers setting up IPv6-only Podman networks, configuring dual-stack containers, handling DNS in IPv6 environments, and working with NAT64 for backward compatibility with IPv4-only services.

---

## Prerequisites

- Podman 4.0 or later
- A Linux system with IPv6 support enabled
- Basic understanding of IPv6 addressing

Verify IPv6 is enabled on your system:

```bash
sysctl net.ipv6.conf.all.disable_ipv6
```

A value of `0` means IPv6 is enabled. If it shows `1`, enable it:

```bash
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0
```

## IPv6 Addressing Basics

Before diving into configuration, here is a quick reference for common IPv6 address ranges:

- `fd00::/8` - Unique Local Addresses (ULA), equivalent to private IPv4 ranges like 10.0.0.0/8
- `fe80::/10` - Link-local addresses, automatically assigned to every interface
- `2001:db8::/32` - Documentation range, used for examples
- `::1` - Loopback address (equivalent to 127.0.0.1)

For container networks, ULA addresses (`fd00::/8`) are the standard choice for internal communication.

## Creating an IPv6-Only Podman Network

Create a network with only an IPv6 subnet. In current Podman releases, use the `--ipv6` flag together with an IPv6 subnet to create an IPv6-enabled bridge network without assigning an IPv4 subnet:

```bash
podman network create \
  --ipv6 \
  --subnet fd00:dead:beef::/64 \
  --gateway fd00:dead:beef::1 \
  ipv6-net
```

Inspect the network to confirm the configuration:

```bash
podman network inspect ipv6-net
```

## Running Containers on IPv6

Launch a container on the IPv6 network:

```bash
podman run -d \
  --name ipv6-app \
  --network ipv6-net \
  docker.io/library/nginx:alpine
```

Check the container's IPv6 address:

```bash
podman inspect ipv6-app --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{.GlobalIPv6Address}}{{end}}'
```

Test IPv6 connectivity between containers:

```bash
podman run -d --name ipv6-app2 --network ipv6-net docker.io/library/alpine sleep 3600

# Get the first container's IPv6 address

IPV6_ADDR=$(podman inspect ipv6-app --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}')

# Ping from the second container
podman exec ipv6-app2 ping6 -c 3 "$IPV6_ADDR"
```

## Assigning Static IPv6 Addresses

Assign a specific IPv6 address to a container:

```bash
podman run -d \
  --name static-ipv6 \
  --network ipv6-net \
  --ip6 fd00:dead:beef::100 \
  docker.io/library/nginx:alpine
```

Verify the assignment:

```bash
podman exec static-ipv6 ip -6 addr show
```

## Dual-Stack Configuration

Dual-stack networks support both IPv4 and IPv6, allowing containers to communicate over either protocol. Create one by providing both an IPv4 and an IPv6 subnet:

```bash
podman network create \
  --subnet 10.100.0.0/24 \
  --gateway 10.100.0.1 \
  --subnet fd00:100::/64 \
  --gateway fd00:100::1 \
  dual-stack-net
```

Run a container on the dual-stack network:

```bash
podman run -d \
  --name dual-app \
  --network dual-stack-net \
  docker.io/library/nginx:alpine
```

The container receives both an IPv4 and IPv6 address:

```bash
podman inspect dual-app --format '{{range .NetworkSettings.Networks}}IPv4: {{.IPAddress}} IPv6: {{.GlobalIPv6Address}}{{end}}'
```

## Publishing Ports on IPv6

Publish container ports on IPv6 interfaces:

```bash
# Listen on all interfaces (IPv4 and IPv6)
podman run -d \
  --name web-ipv6 \
  --network ipv6-net \
  -p 80:80 \
  docker.io/library/nginx:alpine

# Listen on all IPv6 addresses only
podman run -d \
  --name web-ipv6-specific \
  --network ipv6-net \
  -p "[::]:8080:80" \
  docker.io/library/nginx:alpine
```

Test access over IPv6:

```bash
curl -6 http://[::1]:80
curl -6 http://[::1]:8080
```

## DNS Configuration for IPv6

### Using IPv6 DNS Servers

Configure containers to use IPv6 DNS servers:

```bash
podman run -d \
  --name dns-ipv6 \
  --network ipv6-net \
  --dns 2001:4860:4860::8888 \
  --dns 2001:4860:4860::8844 \
  docker.io/library/alpine sleep 3600
```

Verify DNS resolution:

```bash
podman exec dns-ipv6 nslookup google.com
```

### Running a Local DNS Resolver

Deploy a DNS resolver that supports IPv6:

```bash
podman run -d \
  --name dns-resolver \
  --network ipv6-net \
  --ip6 fd00:dead:beef::53 \
  -e "FTLCONF_dns_upstreams=2001:4860:4860::8888;2001:4860:4860::8844" \
  -e "FTLCONF_dns_listeningMode=all" \
  docker.io/pihole/pihole:latest
```

Point containers at the local resolver:

```bash
podman run -d \
  --name app-with-dns \
  --network ipv6-net \
  --dns fd00:dead:beef::53 \
  docker.io/library/nginx:alpine
```

## NAT64 for IPv4 Compatibility

In an IPv6-only environment, you may still need to reach IPv4-only services. NAT64 translates IPv6 packets to IPv4, typically combined with DNS64 to synthesize IPv6 addresses for IPv4-only destinations.

### Setting Up Jool NAT64

Install and configure Jool for NAT64 translation:

```bash
# Install Jool (Fedora/RHEL)
sudo dnf install jool-tools

# Load the Jool kernel module
sudo modprobe jool

# Configure NAT64
sudo jool instance add --netfilter --pool6 64:ff9b::/96
```

The `64:ff9b::/96` prefix is the well-known NAT64 prefix. When a container sends traffic to `64:ff9b::8.8.8.8` (which encodes the IPv4 address 8.8.8.8), Jool translates it to an IPv4 packet.

### Setting Up DNS64

DNS64 works with NAT64 by synthesizing AAAA records for domains that only have A records:

```bash
# Using BIND for DNS64
mkdir -p ~/dns64
cat > ~/dns64/named.conf << 'EOF'
options {
    listen-on-v6 { any; };
    dns64 64:ff9b::/96 {
        clients { any; };
    };
    forwarders {
        2001:4860:4860::8888;
    };
};
EOF

podman run -d \
  --name dns64 \
  --network ipv6-net \
  --ip6 fd00:dead:beef::64 \
  -v ~/dns64/named.conf:/etc/bind/named.conf:ro,Z \
  docker.io/internetsystemsconsortium/bind9:9.18
```

Configure containers to use the DNS64 resolver:

```bash
podman run -d \
  --name ipv6-only-app \
  --network ipv6-net \
  --dns fd00:dead:beef::64 \
  docker.io/library/alpine sleep 3600
```

Now the container can resolve IPv4-only destinations through DNS64 and reach translated IPv4 endpoints through NAT64:

```bash
podman exec ipv6-only-app nslookup nat64-tutorial.mx
podman exec ipv6-only-app ping6 -c 3 64:ff9b::8.8.8.8
```

## IPv6 Firewall Rules

Configure ip6tables for IPv6 container traffic:

```bash
# Allow established connections
sudo ip6tables -A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT

# Allow traffic from the container network
sudo ip6tables -A FORWARD -s fd00:dead:beef::/64 -j ACCEPT

# Allow ICMPv6 (required for IPv6 to function)
sudo ip6tables -A INPUT -p icmpv6 -j ACCEPT
sudo ip6tables -A FORWARD -p icmpv6 -j ACCEPT

# Allow container-to-container traffic on the same network
sudo ip6tables -A FORWARD -s fd00:dead:beef::/64 -d fd00:dead:beef::/64 -j ACCEPT
```

ICMPv6 is essential for IPv6 operations including neighbor discovery, path MTU detection, and router advertisements. Never block ICMPv6 entirely.

## IPv6 Reverse Proxy Configuration

Configure Nginx to listen on IPv6 for reverse proxy duties:

```bash
mkdir -p ~/nginx-ipv6/conf.d
cat > ~/nginx-ipv6/conf.d/default.conf << 'EOF'
server {
    listen [::]:80;
    server_name app.example.com;

    location / {
        proxy_pass http://[fd00:dead:beef::100]:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
```

## Monitoring IPv6 Connectivity

Create a script to monitor IPv6 health:

```bash
cat > ~/ipv6-monitor.sh << 'SCRIPT'
#!/bin/bash
echo "=== IPv6 Interface Status ==="
ip -6 addr show scope global

echo ""
echo "=== Container IPv6 Addresses ==="
for container in $(podman ps --format "{{.Names}}"); do
    IPV6=$(podman inspect "$container" --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}' 2>/dev/null)
    if [ -n "$IPV6" ]; then
        echo "$container: $IPV6"
    else
        echo "$container: No IPv6 address"
    fi
done

echo ""
echo "=== IPv6 Connectivity Test ==="
ping6 -c 1 -W 2 ::1 > /dev/null 2>&1 && echo "Loopback: OK" || echo "Loopback: FAIL"
SCRIPT
chmod +x ~/ipv6-monitor.sh
```

## Enabling IPv6 Forwarding

For routing between IPv6 container networks, enable IPv6 forwarding:

```bash
sudo tee /etc/sysctl.d/99-ipv6-forwarding.conf > /dev/null << 'EOF'
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.default.forwarding = 1
EOF

sudo sysctl --system
```

## Troubleshooting IPv6 Issues

### No IPv6 Address Assigned

```bash
# Check if the network has IPv6 enabled
podman network inspect ipv6-net | grep -A5 subnets

# Check if the container has an IPv6 address
podman exec ipv6-app ip -6 addr show
```

### Cannot Reach External IPv6 Addresses

```bash
# Test connectivity to the network gateway first
podman exec ipv6-app ping6 -c 1 fd00:dead:beef::1

# Check if the default route exists
podman exec ipv6-app ip -6 route show

# Verify IPv6 forwarding is enabled on the host
sysctl net.ipv6.conf.all.forwarding
```

### DNS Resolution Fails

```bash
# Test with a specific IPv6 DNS server
podman exec ipv6-app nslookup google.com 2001:4860:4860::8888
```

## Conclusion

Running Podman containers on IPv6-only networks is fully supported and becomes increasingly relevant as IPv4 addresses grow scarcer. Whether you choose a pure IPv6 setup, a dual-stack configuration, or an IPv6-only network with NAT64 for backward compatibility, Podman provides the networking primitives you need. The key considerations are ensuring IPv6 forwarding is enabled, ICMPv6 traffic is not blocked, and DNS is properly configured for IPv6 resolution. With these foundations in place, your containerized services can operate in any IPv6 environment.
