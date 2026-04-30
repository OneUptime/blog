# How to Make GRE Tunnel Configuration Persistent Across Reboots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GRE, Tunnel, Persistent, Linux, systemd-networkd, NetworkManager, IPv4, Reboot

Description: Learn how to make GRE tunnel configurations persistent across reboots on Linux using systemd-networkd, NetworkManager, or /etc/network/interfaces depending on your distribution.

---

GRE tunnels created with `ip tunnel add` are lost on reboot. Persistence requires configuration in a network manager or startup scripts.

## Method 1: systemd-networkd (Recommended)

```ini
# /etc/systemd/network/gre1.netdev

[NetDev]
Name=gre1
Kind=gre

[Tunnel]
# This host's outer IP
Local=10.0.0.1
# Remote peer's outer IP
Remote=10.0.0.2
TTL=255
```

```ini
# /etc/systemd/network/gre1.network
[Match]
Name=gre1

[Network]
Address=172.16.1.1/30
[Route]
Destination=192.168.2.0/24
Gateway=172.16.1.2
```

```bash
# Enable and start
systemctl enable --now systemd-networkd
networkctl reload

# Verify
networkctl status gre1
ip addr show gre1
```

## Method 2: NetworkManager (nmcli)

```bash
# Create persistent GRE tunnel
nmcli connection add type ip-tunnel \
  ifname gre1 \
  con-name gre-site-b \
  ip-tunnel.mode gre \
  ip-tunnel.local 10.0.0.1 \
  ip-tunnel.remote 10.0.0.2

nmcli connection modify gre-site-b \
  ipv4.method manual \
  ipv4.addresses "172.16.1.1/30" \
  ipv4.routes "192.168.2.0/24 172.16.1.2" \
  connection.autoconnect yes    # Auto-connect on boot

nmcli connection up gre-site-b
```

## Method 3: /etc/network/interfaces (Debian)

```bash
# /etc/network/interfaces
auto gre1
iface gre1 inet static
  address 172.16.1.1
  netmask 255.255.255.252
  pre-up ip tunnel add gre1 mode gre local 10.0.0.1 remote 10.0.0.2 ttl 255
  post-up ip route add 192.168.2.0/24 via 172.16.1.2
  post-down ip tunnel del gre1
```

## Method 4: /etc/rc.local or Systemd Service

```bash
# /usr/local/bin/setup-gre.sh
#!/bin/bash
ip tunnel add gre1 mode gre local 10.0.0.1 remote 10.0.0.2 ttl 255
ip addr add 172.16.1.1/30 dev gre1
ip link set gre1 up
ip route add 192.168.2.0/24 via 172.16.1.2
```

```ini
# /etc/systemd/system/gre-tunnel.service
[Unit]
Description=GRE Tunnel to Site B
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-gre.sh
ExecStop=ip link del gre1
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now gre-tunnel.service
```

## Verifying Persistence

```bash
# Reboot and check
reboot

# After reboot:
ip link show gre1         # Should show UP
ip addr show gre1         # Should have 172.16.1.1/30
ip route show dev gre1    # Should show remote subnet route
ping 172.16.1.2           # Should succeed if the remote GRE peer is up and allows ICMP
```

## Key Takeaways

- systemd-networkd `.netdev` + `.network` files are the cleanest approach for persistent GRE tunnels on modern Linux.
- NetworkManager (`nmcli`) is the preferred method on RHEL/CentOS; set `connection.autoconnect yes`.
- On Debian with `/etc/network/interfaces`, use `pre-up` to run `ip tunnel add` before the interface is configured.
- A systemd service unit is a reliable fallback for any distribution when no native GRE support exists in the network manager.
