# How to Configure SideroLink Network Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, SideroLink, Networking, WireGuard, Remote Management

Description: Detailed guide to configuring SideroLink network settings on Talos Linux for optimal connectivity and management tunnel performance

---

SideroLink is the networking layer that connects Talos Linux nodes to the Sidero Omni management platform. Under the hood, it uses WireGuard to create encrypted tunnels between each node and the Omni endpoint. While SideroLink works out of the box with default settings, understanding and tuning its network configuration can help you handle challenging network environments, improve tunnel reliability, and optimize management traffic flow.

This guide covers the SideroLink network architecture in detail and shows you how to configure it for various scenarios.

## SideroLink Network Architecture

SideroLink creates an overlay network using IPv6 addresses from the `fdae::/16` range. Each Omni instance gets a unique prefix, and each node gets a unique address within that prefix:

```
Omni Instance Prefix: fdae:41e4:649b:9303::/64

Address Assignments:
  Omni Server:    fdae:41e4:649b:9303::1
  Node 1:         fdae:41e4:649b:9303::a1b2:c3d4:e5f6:7890
  Node 2:         fdae:41e4:649b:9303::1122:3344:5566:7788
  Node 3:         fdae:41e4:649b:9303::aabb:ccdd:eeff:0011
```

The WireGuard tunnel carries three types of traffic:

1. **Management API traffic** - talosctl commands routed through Omni
2. **Event streaming** - Talos events forwarded to Omni for monitoring
3. **Log forwarding** - Kernel and service logs sent to Omni

Production traffic (pod-to-pod communication, service traffic, ingress) does NOT flow through SideroLink. It uses the regular network interfaces.

## Default SideroLink Configuration

When you boot a Talos node with an Omni-generated image, the SideroLink configuration is embedded in the kernel arguments:

```
# Default kernel arguments for SideroLink
siderolink.api=grpc://omni.example.com:8099?jointoken=TOKEN
talos.events.sink=[fdae:41e4:649b:9303::1]:8090
talos.logging.kernel=tcp://[fdae:41e4:649b:9303::1]:8092
```

These parameters configure:
- `siderolink.api` - The Omni endpoint address and authentication token
- `talos.events.sink` - Where to send Talos machine events
- `talos.logging.kernel` - Where to forward kernel log messages

## Customizing the SideroLink Endpoint

If your Omni instance uses a non-standard port or a custom domain, adjust the endpoint:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Custom Omni endpoint
      - siderolink.api=grpc://management.internal.company.com:8099?jointoken=your-token

      # Event sink using the SideroLink IPv6 address
      - talos.events.sink=[fdae:41e4:649b:9303::1]:8090

      # Kernel log forwarding
      - talos.logging.kernel=tcp://[fdae:41e4:649b:9303::1]:8092
```

For self-hosted Omni behind a load balancer:

```yaml
machine:
  install:
    extraKernelArgs:
      # Load balanced endpoint
      - siderolink.api=grpc://omni-lb.company.com:443?jointoken=your-token
```

## WireGuard Port Configuration

SideroLink uses UDP port 8099 by default for WireGuard traffic. In environments where this port is blocked, you may need to configure an alternative:

### On the Omni Server Side

```yaml
# omni-config.yaml (self-hosted)
siderolink:
  wireguardPort: 51820           # Use standard WireGuard port
```

### On the Talos Node Side

The port is determined by the Omni endpoint URL:

```yaml
machine:
  install:
    extraKernelArgs:
      # Connect to Omni on port 51820 instead of 8099
      - siderolink.api=grpc://omni.example.com:51820?jointoken=your-token
```

### Working Around Port Restrictions

Some corporate networks block UDP traffic on non-standard ports. Here are strategies:

```
Strategy 1: Use standard WireGuard port (51820/UDP)
  - Many firewalls allow common VPN ports
  - Configure Omni to listen on 51820

Strategy 2: Use port 443/UDP
  - Most firewalls allow 443
  - May conflict with HTTPS if Omni serves its API on the same port

Strategy 3: Use a TURN relay
  - For environments with aggressive firewalls
  - Wraps UDP in TCP/TLS
  - Adds latency but ensures connectivity
```

## MTU Configuration

The WireGuard tunnel adds overhead to each packet (60 bytes for WireGuard + 40 bytes for IPv6). The effective MTU inside the tunnel is lower than the physical MTU:

```
Physical MTU:    1500
WireGuard overhead: -60
IPv6 header:     -40
SideroLink MTU:  1400
```

If your physical network uses jumbo frames:

```
Physical MTU:    9000
WireGuard overhead: -60
IPv6 header:     -40
SideroLink MTU:  8900
```

SideroLink handles MTU discovery automatically, but if you experience fragmentation issues, you can adjust the physical MTU:

```yaml
# talos-machine-config.yaml
machine:
  network:
    interfaces:
    - interface: eth0
      mtu: 1500                  # Ensure physical MTU is set correctly
      addresses:
        - 10.0.0.1/24
```

## DNS Configuration for SideroLink

The Talos node must be able to resolve the Omni endpoint hostname. Configure DNS servers in the Talos machine configuration:

```yaml
# talos-machine-config.yaml
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
    # Or use internal DNS
    # nameservers:
    #   - 10.0.0.2
    #   - 10.0.0.3
```

If DNS resolution fails, the SideroLink tunnel cannot be established. You can verify DNS works:

```bash
# Check DNS resolution
talosctl read /etc/resolv.conf --nodes 10.0.0.1
```

For environments without DNS, use an IP address directly:

```yaml
machine:
  install:
    extraKernelArgs:
      - siderolink.api=grpc://203.0.113.10:8099?jointoken=your-token
```

## SideroLink and Network Interfaces

SideroLink creates a virtual network interface on the Talos node. This interface is separate from your physical and pod network interfaces:

```bash
# Check the SideroLink interface
talosctl get links --nodes 10.0.0.1

# Example output:
# NAMESPACE   TYPE    ID            VERSION   TYPE        KIND       HW ADDR
# network     Link    eth0          1         ether       physical   aa:bb:cc:dd:ee:ff
# network     Link    siderolink    1         wireguard   virtual    (none)
# network     Link    cilium_host   1         ether       virtual    ...

# Check the SideroLink address
talosctl get addresses --nodes 10.0.0.1

# Example output:
# NAMESPACE   TYPE      ID                    VERSION   ADDRESS
# network     Address   eth0/10.0.0.1/24      1         10.0.0.1/24
# network     Address   siderolink/fdae:...   1         fdae:41e4:649b:9303::a1b2/128
```

The SideroLink interface does not interfere with your regular networking. It uses a completely separate routing table for the fdae::/16 prefix.

## Bandwidth and Traffic Considerations

SideroLink traffic is lightweight under normal conditions. Here is what to expect:

```
Traffic Type              Approximate Bandwidth
-------------------------------------------------
Heartbeat keepalive       ~100 bytes/s
Event streaming           ~1-5 KB/s
Kernel log forwarding     ~2-10 KB/s
talosctl commands         ~5-50 KB/s (burst)
Configuration apply       ~10-100 KB (one-time burst)
```

Under normal operations, SideroLink uses less than 20 KB/s per node. This is negligible on any modern network.

However, if you stream full logs or run frequent talosctl commands across many nodes simultaneously, the traffic on the Omni server can add up:

```
100 nodes x 20 KB/s = 2 MB/s on the Omni endpoint
1000 nodes x 20 KB/s = 20 MB/s on the Omni endpoint
```

## Handling NAT and Firewalls

SideroLink handles NAT gracefully because WireGuard connections are initiated from the node side:

```yaml
# NAT traversal works automatically
# WireGuard sends periodic keepalive packets to maintain the NAT mapping

# For aggressive NAT that drops idle connections quickly,
# WireGuard's default keepalive (25 seconds) should be sufficient

# The connection flow:
# 1. Node sends WireGuard handshake to Omni endpoint (outbound UDP)
# 2. NAT creates a mapping for the connection
# 3. WireGuard keepalives prevent the mapping from expiring
# 4. Omni can send management traffic back through the established tunnel
```

For double NAT or carrier-grade NAT scenarios:

```
Node (192.168.1.100) -> Home NAT (100.64.x.x) -> ISP CGNAT -> Internet -> Omni

This works because:
- All traffic is outbound from the node
- WireGuard handles NAT traversal natively
- No port forwarding needed on any NAT device
```

## Connection Monitoring and Troubleshooting

Monitor SideroLink connection health:

```bash
# Check connection status from Omni
omnictl get links

# Check from the node side
talosctl get addresses --nodes 10.0.0.1 | grep siderolink

# Check for connection errors in Talos logs
talosctl logs controller-runtime --nodes 10.0.0.1 | grep -i siderolink

# Check WireGuard handshake status
talosctl dmesg --nodes 10.0.0.1 | grep -i wireguard
```

### Common Issues

```
Issue: Node not connecting to Omni
Check: DNS resolution of Omni endpoint
Check: Firewall allowing outbound UDP to Omni port
Check: Join token is valid and not expired

Issue: Intermittent disconnections
Check: NAT timeout settings (increase keepalive if needed)
Check: Network stability between node and Omni
Check: Load balancer in front of Omni (must support UDP)

Issue: High latency on management commands
Check: Geographic distance between node and Omni endpoint
Check: Network path quality (packet loss, jitter)
Check: Omni server resource utilization
```

## Logging Configuration

Configure what log data flows through SideroLink:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Forward kernel logs (useful for debugging hardware issues)
      - talos.logging.kernel=tcp://[fdae:41e4:649b:9303::1]:8092

      # Forward Talos events (cluster state changes, errors)
      - talos.events.sink=[fdae:41e4:649b:9303::1]:8090
```

If you want to reduce SideroLink traffic, you can disable log forwarding and rely on local log collection instead:

```yaml
# Minimal SideroLink configuration (API only)
machine:
  install:
    extraKernelArgs:
      - siderolink.api=grpc://omni.example.com:8099?jointoken=TOKEN
      # Omit events.sink and logging.kernel to reduce traffic
```

## Applying Network Configuration Changes

Apply SideroLink configuration changes:

```bash
# Apply the machine configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Kernel args changes require a reboot
talosctl reboot --nodes 10.0.0.1

# After reboot, verify the connection
omnictl get machines
omnictl get links
```

## Conclusion

SideroLink network configuration is designed to work out of the box for most environments, but understanding the underlying architecture helps when you need to troubleshoot connectivity issues or optimize for specific network conditions. The key settings to be aware of are the endpoint URL, the WireGuard port, DNS configuration, and firewall rules. For most deployments, the default configuration works well. For challenging network environments with NAT, firewalls, or restricted ports, the strategies in this guide will help you establish reliable connectivity between your Talos nodes and Omni.
