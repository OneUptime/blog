# How to Configure Host Networking Mode for Containers in Portainer - Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Host Networking, Performance, Network, Linux

Description: Configure containers to use host networking mode in Portainer for maximum network performance and direct access to host network interfaces, understanding the security tradeoffs.

---

On supported Docker hosts, host networking mode removes the Docker network namespace isolation - the container shares the host's network stack directly. This provides the best possible network performance but eliminates port mapping and network isolation.

## When to Use Host Networking

**Good use cases:**
- Network monitoring tools that need to see all host traffic
- High-performance applications where NAT overhead is unacceptable
- Applications that need to bind to specific host network interfaces
- Protocol analyzers, packet sniffers, and network probes

**Avoid for:**
- Web applications that can use port mapping
- Applications that should be isolated from the host network
- Production services where multiple instances need different ports

## Configuring Host Networking in Portainer Stacks

```yaml
version: "3.8"
services:
  # Network monitoring tool using host networking
  net-monitor:
    image: nicolaka/netshoot:latest
    network_mode: host    # Share host network namespace
    # Note: No ports: section needed - container uses host ports directly
    restart: unless-stopped

  # High-performance DPDK application
  dpdk-app:
    image: dpdk-app:1.0
    network_mode: host
    # DPDK requirements vary by driver and device setup
    cap_add:
      - NET_ADMIN
      - SYS_RAWIO
    volumes:
      - /dev/hugepages:/dev/hugepages    # Hugepages for DPDK workloads
```

## Performance Comparison

```bash
# Compare the same client workload with and without host networking

# With bridge networking (default)
docker run --rm networkstatic/iperf3 -c iperf-server
# Baseline measurement for your environment

# With host networking
docker run --rm --network host networkstatic/iperf3 -c iperf-server
# Host networking removes NAT and userland-proxy overhead; measure the difference on your host
```

## Important Limitations

```yaml
# With host networking:
# 1. No port mapping - remove ports: entirely
services:
  app:
    network_mode: host
    # ports:
    #   - "8080:8080"    # Causes a runtime error in Compose

# 2. Application traffic uses host port 8080 directly
# 3. Multiple containers cannot use the same host port on the same host
# 4. No Docker service-name DNS on a Compose network - use reachable hostnames, IPs, or extra_hosts

# For multiple instances, use different listening ports in the app
```

## Security Considerations

Host networking bypasses Docker's network isolation:

```yaml
# Security controls to apply WITH host networking
services:
  net-app:
    network_mode: host
    # Still apply other isolation measures
    read_only: true
    cap_drop:
      - ALL
    cap_add:
      - NET_ADMIN    # Only what's needed
    security_opt:
      - no-new-privileges:true
    user: "1000:1000"    # Non-root user
```

## MacVLAN as a Better Alternative

For containers that need to appear on the physical network but with isolation:

```yaml
networks:
  macvlan-net:
    driver: macvlan
    driver_opts:
      parent: eth0    # Physical interface
    ipam:
      config:
        - subnet: "192.168.1.0/24"
          gateway: "192.168.1.1"
          ip_range: "192.168.1.200/29"    # IPs for containers

services:
  app:
    image: myapp:1.2.3
    networks:
      macvlan-net:
        ipv4_address: 192.168.1.201    # Specific IP on physical network
```

## Summary

Host networking mode in Portainer uses the host's network namespace, providing direct access to host network interfaces with minimal overhead. Use it for network tools and high-performance workloads that require direct network access. For most applications, bridge networking with port mapping is more appropriate and provides better isolation.
