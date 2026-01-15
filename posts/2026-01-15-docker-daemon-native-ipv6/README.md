# How to Configure Docker Daemon for Native IPv6 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Docker, Containers, Networking, DevOps, Configuration

Description: A comprehensive guide to enabling native IPv6 support in Docker daemon, covering daemon.json configuration, network creation, troubleshooting, and production best practices.

---

IPv4 address exhaustion is no longer a theoretical concern - it is an operational reality. Major cloud providers now charge premiums for public IPv4 addresses, and many modern infrastructures are built IPv6-first. Yet Docker's default configuration remains stubbornly IPv4-only, leaving containers unable to communicate over IPv6 without explicit setup.

This guide walks through enabling native IPv6 support in the Docker daemon, from basic configuration to production-hardened deployments. By the end, your containers will have first-class IPv6 connectivity without NAT workarounds or tunnel hacks.

## Why Enable IPv6 in Docker?

Before diving into configuration, let us understand why IPv6 support matters for containerized workloads:

**Address availability**: IPv4's 4.3 billion addresses are exhausted. IPv6 provides 340 undecillion addresses - enough for every container on Earth to have its own globally routable address.

**End-to-end connectivity**: IPv6 eliminates the need for NAT in most cases, simplifying network debugging and enabling direct container-to-container communication across hosts.

**Cloud cost optimization**: AWS, GCP, and Azure now charge for public IPv4 addresses. IPv6 addresses remain free, making dual-stack deployments economically attractive.

**Regulatory compliance**: Some government and enterprise networks mandate IPv6 support. Containers without IPv6 capability cannot participate in these environments.

**Future-proofing**: IPv6 adoption grows every year. Building IPv6-native infrastructure now prevents costly retrofits later.

## Prerequisites

Before configuring Docker for IPv6, ensure your environment meets these requirements:

1. **Host IPv6 connectivity**: Your Docker host must have working IPv6 connectivity. Verify with:

```bash
# Test IPv6 connectivity to a public server
ping6 -c 4 ipv6.google.com

# Check your host's IPv6 addresses
ip -6 addr show
```

2. **IPv6 forwarding enabled**: The Linux kernel must forward IPv6 packets:

```bash
# Check current forwarding status
cat /proc/sys/net/ipv6/conf/all/forwarding

# Enable IPv6 forwarding (temporary)
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Enable IPv6 forwarding (persistent)
echo "net.ipv6.conf.all.forwarding=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

3. **Docker version**: IPv6 support varies by Docker version. Use Docker 20.10+ for the most reliable experience:

```bash
# Check Docker version
docker version --format '{{.Server.Version}}'
```

4. **Available IPv6 subnet**: You need an IPv6 prefix to allocate to containers. This can be:
   - A globally routable prefix from your ISP or cloud provider
   - A Unique Local Address (ULA) prefix (fd00::/8) for private networks
   - A link-local prefix for single-host testing

## Understanding Docker's IPv6 Networking Model

Docker's IPv6 implementation differs from IPv4 in several important ways:

**No built-in NAT66**: Unlike IPv4 where Docker provides NAT through iptables, IPv6 traffic is routed directly. Containers receive globally routable addresses or addresses from your specified prefix.

**Fixed subnet size**: Docker requires a /80 or smaller prefix for IPv6 networks to accommodate its internal addressing scheme. A /64 prefix is recommended for compatibility.

**Dual-stack by default**: When IPv6 is enabled, Docker networks become dual-stack, supporting both IPv4 and IPv6 simultaneously.

**Manual routing may be required**: If using ULA addresses or addresses from a different subnet than your host, you must configure routing on your network infrastructure.

## Basic daemon.json Configuration

The Docker daemon reads its configuration from `/etc/docker/daemon.json`. This file may not exist on fresh installations - create it if needed.

### Minimal IPv6 Configuration

Here is the simplest configuration to enable IPv6 on the default bridge network:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64"
}
```

Let us break down each option:

- `ipv6`: Enables IPv6 support globally for the Docker daemon
- `fixed-cidr-v6`: Specifies the IPv6 subnet for the default bridge network. Replace `2001:db8:1::/64` with your actual IPv6 prefix.

Apply the configuration by restarting Docker:

```bash
# Restart Docker daemon to apply changes
sudo systemctl restart docker

# Verify Docker is running
sudo systemctl status docker
```

### Verifying Basic IPv6 Configuration

After restarting Docker, verify IPv6 is enabled:

```bash
# Check the default bridge network for IPv6 configuration
docker network inspect bridge --format '{{json .IPAM.Config}}' | jq

# Expected output shows both IPv4 and IPv6 subnets:
# [
#   {"Subnet": "172.17.0.0/16", "Gateway": "172.17.0.1"},
#   {"Subnet": "2001:db8:1::/64", "Gateway": "2001:db8:1::1"}
# ]
```

Test IPv6 connectivity from a container:

```bash
# Run a container and test IPv6 connectivity
docker run --rm -it alpine sh -c "ping6 -c 4 ipv6.google.com"
```

## Complete Production Configuration

A production-ready daemon.json includes additional settings for reliability, security, and operational visibility:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64",
  "ip6tables": true,
  "experimental": false,
  "default-address-pools": [
    {
      "base": "172.17.0.0/12",
      "size": 24
    },
    {
      "base": "2001:db8::/104",
      "size": 112
    }
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false,
  "iptables": true
}
```

### Configuration Options Explained

**ipv6** (boolean): Master switch for IPv6 support. When true, Docker creates dual-stack networks by default.

**fixed-cidr-v6** (string): The IPv6 subnet for the default bridge network. Containers on this network receive addresses from this range. Must be a /64 or smaller.

**ip6tables** (boolean): When true, Docker manages ip6tables rules for container traffic, similar to how it manages iptables for IPv4. Essential for container isolation and port publishing.

**default-address-pools** (array): Defines the pools from which Docker allocates subnets to user-defined networks. Include both IPv4 and IPv6 pools for dual-stack support.

**userland-proxy** (boolean): When false, Docker uses iptables/ip6tables for port forwarding instead of a userland proxy process. Improves performance but requires iptables support.

**iptables** (boolean): Enables Docker's IPv4 firewall management. Should remain true unless you manage iptables externally.

**live-restore** (boolean): Keeps containers running during daemon restarts. Critical for production environments.

### Applying the Complete Configuration

```bash
# Backup existing configuration
sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.bak 2>/dev/null || true

# Write the new configuration (use your preferred editor)
sudo vim /etc/docker/daemon.json

# Validate JSON syntax before restarting
python3 -m json.tool /etc/docker/daemon.json > /dev/null && echo "JSON valid"

# Restart Docker with the new configuration
sudo systemctl restart docker

# Verify daemon started successfully
sudo systemctl status docker
journalctl -u docker --no-pager -n 50
```

## Creating IPv6-Enabled Networks

While the default bridge network now supports IPv6, production deployments should use user-defined networks for better isolation and DNS resolution.

### Creating a Dual-Stack Bridge Network

```bash
# Create a dual-stack bridge network with explicit subnets
docker network create \
  --driver bridge \
  --subnet 10.10.0.0/24 \
  --gateway 10.10.0.1 \
  --ipv6 \
  --subnet 2001:db8:2::/64 \
  --gateway 2001:db8:2::1 \
  myapp-network

# Verify network configuration
docker network inspect myapp-network --format '{{json .IPAM.Config}}' | jq
```

### Creating an IPv6-Only Network

For environments where IPv4 is unnecessary:

```bash
# Create an IPv6-only network
docker network create \
  --driver bridge \
  --ipv6 \
  --subnet 2001:db8:3::/64 \
  --gateway 2001:db8:3::1 \
  ipv6only-network

# Note: Containers on this network will only have IPv6 addresses
# They cannot communicate with IPv4-only services
```

### Network Creation with Docker Compose

Define IPv6-enabled networks in your Compose file:

```yaml
version: "3.9"

services:
  web:
    image: nginx:alpine
    networks:
      - frontend
    ports:
      - "80:80"
      - "[::]:80:80"  # Bind to IPv6 as well

  api:
    image: myapp/api:latest
    networks:
      - frontend
      - backend

  db:
    image: postgres:16
    networks:
      - backend

networks:
  frontend:
    driver: bridge
    enable_ipv6: true
    ipam:
      driver: default
      config:
        - subnet: 10.20.0.0/24
          gateway: 10.20.0.1
        - subnet: 2001:db8:10::/64
          gateway: 2001:db8:10::1

  backend:
    driver: bridge
    enable_ipv6: true
    ipam:
      driver: default
      config:
        - subnet: 10.21.0.0/24
          gateway: 10.21.0.1
        - subnet: 2001:db8:11::/64
          gateway: 2001:db8:11::1
```

## Assigning Static IPv6 Addresses to Containers

For services that require predictable addresses, assign static IPv6 addresses:

```bash
# Run a container with a specific IPv6 address
docker run -d \
  --name dns-server \
  --network myapp-network \
  --ip6 2001:db8:2::53 \
  coredns/coredns

# Verify the assigned address
docker inspect dns-server --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}'
```

With Docker Compose:

```yaml
version: "3.9"

services:
  dns:
    image: coredns/coredns
    networks:
      internal:
        ipv6_address: 2001:db8:10::53

networks:
  internal:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 10.30.0.0/24
        - subnet: 2001:db8:10::/64
```

## Configuring IPv6 Port Publishing

Publishing ports over IPv6 requires explicit configuration, as Docker defaults to IPv4 binding.

### Publishing to Both IPv4 and IPv6

```bash
# Publish port 80 on both IPv4 and IPv6
docker run -d \
  --name webserver \
  -p 80:80 \
  -p "[::]:80:80" \
  nginx:alpine

# Verify listening addresses
docker port webserver
# Output:
# 80/tcp -> 0.0.0.0:80
# 80/tcp -> [::]:80
```

### Publishing to IPv6 Only

```bash
# Publish port 443 only on IPv6
docker run -d \
  --name secure-web \
  -p "[::]:443:443" \
  nginx:alpine
```

### Publishing to a Specific IPv6 Address

```bash
# Bind to a specific IPv6 address on the host
docker run -d \
  --name api \
  -p "[2001:db8::1]:8080:8080" \
  myapp/api:latest
```

## Routing Configuration for Production

When using globally routable IPv6 addresses, your network infrastructure must know how to reach the container subnet.

### Host-Based Routing

If your Docker host has direct IPv6 connectivity, configure the upstream router to route traffic for your container subnet to the Docker host:

```bash
# On your router/gateway (example using Linux router)
ip -6 route add 2001:db8:1::/64 via 2001:db8::docker-host

# Verify routing on the Docker host
ip -6 route show
```

### NDP Proxy for Shared Prefixes

If your containers share the same /64 prefix as your host, enable NDP proxy:

```bash
# Enable NDP proxy on the host interface
sudo sysctl -w net.ipv6.conf.eth0.proxy_ndp=1

# Add proxy entries for container addresses
sudo ip -6 neigh add proxy 2001:db8:1::container1 dev eth0
```

Automate this with a script triggered by Docker events:

```bash
#!/bin/bash
# /usr/local/bin/docker-ndp-proxy.sh
# Add NDP proxy entries for new containers

docker events --filter type=container --filter event=start --format '{{json .}}' | while read event; do
  CONTAINER_ID=$(echo "$event" | jq -r '.Actor.ID')
  IPV6=$(docker inspect "$CONTAINER_ID" --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}')
  if [ -n "$IPV6" ]; then
    ip -6 neigh add proxy "$IPV6" dev eth0 2>/dev/null || true
    echo "Added NDP proxy for $IPV6"
  fi
done
```

### Using ULA Addresses with NAT66

For private networks using ULA addresses (fd00::/8), you may need NAT66 for external connectivity:

```bash
# Enable NAT66 using ip6tables
sudo ip6tables -t nat -A POSTROUTING -s fd00:1::/64 ! -o docker0 -j MASQUERADE

# Make the rule persistent
sudo apt-get install iptables-persistent
sudo netfilter-persistent save
```

Note: NAT66 is generally discouraged in favor of proper routing, but may be necessary in certain network topologies.

## IPv6 Firewall Configuration

When `ip6tables` is enabled in daemon.json, Docker manages basic firewall rules. However, production deployments often require additional hardening.

### Default Docker ip6tables Rules

Docker creates chains in ip6tables similar to its IPv4 iptables rules:

```bash
# View Docker's IPv6 firewall rules
sudo ip6tables -L -n -v

# Key chains:
# DOCKER-USER - For custom rules (processed first)
# DOCKER-ISOLATION-STAGE-1/2 - Network isolation
# DOCKER - Container port forwarding
```

### Adding Custom Firewall Rules

Always add custom rules to the DOCKER-USER chain, which persists across daemon restarts:

```bash
# Allow established connections
sudo ip6tables -I DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow ICMPv6 (essential for IPv6 operation)
sudo ip6tables -I DOCKER-USER -p ipv6-icmp -j ACCEPT

# Allow traffic from trusted subnet
sudo ip6tables -I DOCKER-USER -s 2001:db8:trusted::/48 -j ACCEPT

# Drop all other external traffic to containers (example)
sudo ip6tables -A DOCKER-USER -i eth0 -j DROP

# Save rules persistently
sudo ip6tables-save > /etc/iptables/rules.v6
```

### Firewall Configuration with UFW

If using UFW, ensure it does not conflict with Docker:

```bash
# /etc/ufw/after6.rules - Add before COMMIT line

# Allow Docker IPv6 traffic
-A ufw6-after-forward -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
-A ufw6-after-forward -i docker0 -j ACCEPT
-A ufw6-after-forward -o docker0 -j ACCEPT
```

## Troubleshooting IPv6 Issues

### Container Cannot Reach External IPv6 Hosts

1. **Verify host connectivity**:
```bash
ping6 -c 4 ipv6.google.com
```

2. **Check IPv6 forwarding**:
```bash
cat /proc/sys/net/ipv6/conf/all/forwarding
# Should output: 1
```

3. **Verify routing**:
```bash
ip -6 route show
# Look for default route and container subnet
```

4. **Test from container**:
```bash
docker run --rm -it alpine sh
# Inside container:
ip -6 addr show
ip -6 route show
ping6 ipv6.google.com
```

### External Hosts Cannot Reach Container

1. **Check port publishing**:
```bash
docker port container-name
# Ensure IPv6 binding exists: 80/tcp -> [::]:80
```

2. **Verify ip6tables rules**:
```bash
sudo ip6tables -L DOCKER -n -v
# Look for ACCEPT rules for your container port
```

3. **Test connectivity**:
```bash
# From external host
curl -6 http://[2001:db8:1::container]:80
```

4. **Check for upstream firewall**:
```bash
# On Docker host
sudo tcpdump -i eth0 ip6 and port 80
```

### Docker Daemon Fails to Start

1. **Check daemon.json syntax**:
```bash
python3 -m json.tool /etc/docker/daemon.json
```

2. **Review daemon logs**:
```bash
journalctl -u docker --no-pager -n 100
```

3. **Common errors**:
   - Invalid IPv6 prefix: Ensure prefix is valid and sized correctly
   - Conflicting subnets: Check for overlapping IPv4/IPv6 ranges
   - Permission issues: Verify file ownership and permissions

### Containers Have No IPv6 Address

1. **Verify network has IPv6 enabled**:
```bash
docker network inspect networkname --format '{{.EnableIPv6}}'
# Should output: true
```

2. **Check network IPAM configuration**:
```bash
docker network inspect networkname --format '{{json .IPAM.Config}}' | jq
# Should show both IPv4 and IPv6 subnets
```

3. **Inspect container network settings**:
```bash
docker inspect containername --format '{{json .NetworkSettings.Networks}}' | jq
```

## IPv6 with Docker Swarm

Docker Swarm supports IPv6 with additional considerations for overlay networks.

### Enabling IPv6 in Swarm Mode

On all Swarm manager and worker nodes, configure daemon.json:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:docker::/64",
  "default-address-pools": [
    {"base": "10.0.0.0/8", "size": 24},
    {"base": "fd00:swarm::/48", "size": 64}
  ]
}
```

### Creating IPv6 Overlay Networks

```bash
# Create an IPv6-enabled overlay network
docker network create \
  --driver overlay \
  --ipv6 \
  --subnet 10.100.0.0/24 \
  --subnet fd00:swarm:1::/64 \
  swarm-network
```

### Swarm Service with IPv6

```bash
# Deploy a service with IPv6 connectivity
docker service create \
  --name web \
  --network swarm-network \
  --publish published=80,target=80,mode=host \
  --publish published=80,target=80,mode=host,protocol=tcp \
  nginx:alpine
```

Note: Swarm mode ingress routing does not fully support IPv6 as of Docker 24.x. Use `mode=host` for direct container port binding.

## IPv6 with Kubernetes (Docker as Runtime)

If using Docker as the container runtime for Kubernetes, IPv6 configuration happens at the Kubernetes level, not Docker:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16,fd00:10:244::/48"
  serviceSubnet: "10.96.0.0/12,fd00:10:96::/108"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: "2001:db8::1"
```

The Docker daemon still needs IPv6 forwarding enabled, but subnet allocation is managed by the CNI plugin.

## Performance Considerations

### IPv6 vs IPv4 Performance

In most scenarios, IPv6 performs identically to IPv4. However, consider:

- **Path MTU Discovery**: IPv6 relies on PMTUD since fragmentation occurs only at the source. Ensure ICMPv6 "Packet Too Big" messages are not blocked.
- **Happy Eyeballs**: Dual-stack applications may introduce slight latency during connection establishment as they race IPv4 and IPv6.
- **DNS Resolution**: Ensure your DNS returns AAAA records. Consider DNS64 if communicating with IPv4-only services.

### Optimizing for IPv6

```bash
# Disable IPv6 privacy extensions for predictable container addresses
sudo sysctl -w net.ipv6.conf.all.use_tempaddr=0
sudo sysctl -w net.ipv6.conf.default.use_tempaddr=0

# Increase neighbor cache for large deployments
sudo sysctl -w net.ipv6.neigh.default.gc_thresh1=4096
sudo sysctl -w net.ipv6.neigh.default.gc_thresh2=8192
sudo sysctl -w net.ipv6.neigh.default.gc_thresh3=16384
```

## Security Best Practices

### Principle of Least Privilege

1. **Use private addresses internally**: Deploy ULA (fd00::/8) for east-west traffic, expose only necessary services with public addresses.

2. **Implement network policies**: Use Docker networks to isolate services that should not communicate.

3. **Enable ip6tables**: Always set `"ip6tables": true` in daemon.json for firewall management.

### Securing IPv6 Container Traffic

```bash
# Restrict container-to-container traffic by default
# In /etc/docker/daemon.json
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64",
  "ip6tables": true,
  "icc": false
}
```

With `icc: false`, containers cannot communicate unless explicitly linked or on user-defined networks.

### Monitoring IPv6 Traffic

```bash
# Monitor IPv6 traffic on docker0 interface
sudo tcpdump -i docker0 ip6 -n

# Watch for suspicious patterns
sudo tcpdump -i docker0 'ip6 and (tcp[tcpflags] & tcp-syn != 0)' -n
```

Integrate with OneUptime for alerting on unusual IPv6 traffic patterns.

## Automation and Infrastructure as Code

### Ansible Playbook for IPv6 Docker Setup

```yaml
---
- name: Configure Docker for IPv6
  hosts: docker_hosts
  become: true
  vars:
    docker_ipv6_subnet: "2001:db8:{{ inventory_hostname_short }}::/64"

  tasks:
    - name: Enable IPv6 forwarding
      ansible.posix.sysctl:
        name: net.ipv6.conf.all.forwarding
        value: "1"
        sysctl_set: true
        state: present
        reload: true

    - name: Configure Docker daemon
      ansible.builtin.copy:
        dest: /etc/docker/daemon.json
        content: |
          {
            "ipv6": true,
            "fixed-cidr-v6": "{{ docker_ipv6_subnet }}",
            "ip6tables": true,
            "experimental": false,
            "live-restore": true
          }
        mode: "0644"
      notify: Restart Docker

    - name: Ensure Docker is running
      ansible.builtin.systemd:
        name: docker
        state: started
        enabled: true

  handlers:
    - name: Restart Docker
      ansible.builtin.systemd:
        name: docker
        state: restarted
```

### Terraform Configuration

```hcl
# terraform/docker-ipv6.tf

resource "null_resource" "docker_ipv6_config" {
  triggers = {
    config_hash = sha256(local.daemon_json)
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p /etc/docker",
      "echo '${local.daemon_json}' | sudo tee /etc/docker/daemon.json",
      "sudo systemctl restart docker"
    ]
  }
}

locals {
  daemon_json = jsonencode({
    ipv6           = true
    fixed-cidr-v6  = var.docker_ipv6_subnet
    ip6tables      = true
    live-restore   = true
  })
}

variable "docker_ipv6_subnet" {
  description = "IPv6 subnet for Docker containers"
  type        = string
  default     = "fd00:docker::/64"
}
```

## Quick Reference: Configuration Summary

| Configuration Option | Location | Purpose | Example Value |
|---------------------|----------|---------|---------------|
| `ipv6` | daemon.json | Enable IPv6 globally | `true` |
| `fixed-cidr-v6` | daemon.json | Default bridge IPv6 subnet | `2001:db8:1::/64` |
| `ip6tables` | daemon.json | Enable IPv6 firewall management | `true` |
| `default-address-pools` | daemon.json | Pools for user-defined networks | `[{"base": "fd00::/48", "size": 64}]` |
| `--ipv6` | docker network create | Enable IPv6 on network | Flag |
| `--subnet` | docker network create | Specify IPv6 subnet | `2001:db8:2::/64` |
| `enable_ipv6` | docker-compose.yml | Enable IPv6 on Compose network | `true` |
| `ipv6_address` | docker-compose.yml | Static IPv6 for container | `2001:db8:2::10` |
| `net.ipv6.conf.all.forwarding` | sysctl | Enable kernel IPv6 routing | `1` |

## Quick Reference: Common Commands

```bash
# Verify Docker IPv6 configuration
docker network inspect bridge | grep -A5 IPv6

# Test IPv6 from container
docker run --rm alpine ping6 -c 4 ipv6.google.com

# Check container IPv6 address
docker inspect --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}' container

# List Docker's ip6tables rules
sudo ip6tables -L -n -v --line-numbers

# Monitor IPv6 container traffic
sudo tcpdump -i docker0 ip6

# Check IPv6 forwarding status
sysctl net.ipv6.conf.all.forwarding

# Restart Docker and verify
sudo systemctl restart docker && sudo systemctl status docker
```

## Conclusion

Enabling native IPv6 support in Docker transforms your container infrastructure from IPv4-constrained to future-ready. The key steps are:

1. **Enable IPv6 forwarding** on the Docker host
2. **Configure daemon.json** with `ipv6: true` and a valid `fixed-cidr-v6` subnet
3. **Enable ip6tables** for firewall management
4. **Create dual-stack networks** for your applications
5. **Configure routing** on your network infrastructure
6. **Test connectivity** from containers to external IPv6 hosts

With IPv6 enabled, your containers gain direct addressability, eliminate NAT complexity, and prepare your infrastructure for the IPv6-dominant future. Start with a test environment, validate connectivity, then roll out to production with the confidence that your containerized services can communicate on the modern internet.

---

For monitoring your IPv6-enabled Docker infrastructure, OneUptime provides comprehensive observability including network connectivity checks, container health monitoring, and alerting when IPv6 services become unreachable. Configure IPv6 endpoint monitors to ensure your dual-stack deployments maintain connectivity on both protocols.
