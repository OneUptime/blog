# How to Create a GRE Tunnel Using systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, GRE, Tunnel, systemd-networkd, Networking, Persistence, Configuration

Description: Create a persistent GRE tunnel using systemd-networkd .netdev and .network configuration files for automatic tunnel setup at boot.

## Introduction

systemd-networkd can create and manage GRE tunnels through `.netdev` files that define the tunnel device and `.network` files that configure the tunnel's IP address and routes. This provides persistent tunnel configuration that survives reboots without startup scripts.

## Step 1: Create the GRE Tunnel .netdev File

```ini
# /etc/systemd/network/10-gre0.netdev

# On Host A (local=10.0.0.1, remote=10.0.0.2)

[NetDev]
Name=gre0
Kind=gre

[Tunnel]
# Create the tunnel without requiring Tunnel= from another .network file
Independent=yes
# Local underlay IP (this host's IP)
Local=10.0.0.1
# Remote underlay IP (the other end of the tunnel)
Remote=10.0.0.2
# TTL for tunnel packets
TTL=255
```

## Step 2: Create the .network File for the Tunnel

```ini
# /etc/systemd/network/10-gre0.network
[Match]
Name=gre0

[Network]
# Tunnel overlay/endpoint IP
Address=172.16.0.1/30

[Route]
# Route to the remote network via the tunnel far end
Destination=192.168.2.0/24
Gateway=172.16.0.2
```

## Configuration on Host B

```ini
# /etc/systemd/network/10-gre0.netdev (Host B)
[NetDev]
Name=gre0
Kind=gre

[Tunnel]
Independent=yes
Local=10.0.0.2
Remote=10.0.0.1
TTL=255
```

```ini
# /etc/systemd/network/10-gre0.network (Host B)
[Match]
Name=gre0

[Network]
Address=172.16.0.2/30

[Route]
Destination=192.168.1.0/24
Gateway=172.16.0.1
```

## Apply the Configuration

```bash
# Restart systemd-networkd
systemctl restart systemd-networkd

# Verify tunnel is up
ip link show gre0
ip addr show gre0

# Test connectivity
ping -c 3 172.16.0.2

# Check the route was added
ip route show | grep 192.168.2.0
```

## Enable IP Forwarding

Add to sysctl configuration for routing through the tunnel:

```bash
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.d/99-forwarding.conf
sysctl -p /etc/sysctl.d/99-forwarding.conf
```

## Check networkd Logs

```bash
# View systemd-networkd logs for tunnel setup
journalctl -u systemd-networkd | grep gre

# Check networkctl status
networkctl status gre0
```

## Load ip_gre Module at Boot (If Needed)

```bash
# If your system does not auto-load GRE support, ensure the ip_gre module loads at boot
echo "ip_gre" > /etc/modules-load.d/ip_gre.conf
```

## Conclusion

systemd-networkd manages GRE tunnels through `.netdev` files (defining tunnel type and underlay endpoints) and `.network` files (assigning overlay IPs and routes). This provides clean, persistent tunnel configuration. If automatic module loading is unavailable on your system, load `ip_gre` at boot by adding it to `/etc/modules-load.d/`. Use `networkctl status gre0` to verify the tunnel state after applying configuration.
