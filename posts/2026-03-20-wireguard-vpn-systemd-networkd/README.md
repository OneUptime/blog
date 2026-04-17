# How to Configure WireGuard VPN with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, WireGuard, VPN, systemd-networkd, Networking, Server

Description: Learn how to configure WireGuard VPN tunnels using systemd-networkd .netdev and .network unit files for a lightweight, distribution-agnostic VPN setup.

## Introduction

systemd-networkd provides native WireGuard support through `.netdev` unit files, making it a clean alternative to `wg-quick` for server environments. This approach works on any systemd-based Linux distribution and integrates naturally with systemd's lifecycle management.

## Prerequisites

- systemd 237 or later (check: `systemctl --version`)
- WireGuard kernel module available
- Key pairs generated

## Installing WireGuard Tools

```bash
# Debian/Ubuntu

apt install wireguard-tools

# RHEL/CentOS
yum install wireguard-tools
```

## Generating Key Pairs

```bash
wg genkey | tee /etc/wireguard/wg0.key
chmod 640 /etc/wireguard/wg0.key
chown root:systemd-network /etc/wireguard/wg0.key
cat /etc/wireguard/wg0.key | wg pubkey > /etc/wireguard/wg0.pub
```

## Creating the .netdev File (Server)

```bash
sudo nano /etc/systemd/network/50-wg0.netdev
```

```ini
[NetDev]
Name=wg0
Kind=wireguard
Description=WireGuard VPN Server

[WireGuard]
ListenPort=51820
PrivateKeyFile=/etc/wireguard/wg0.key

[WireGuardPeer]
PublicKey=<client-public-key>
AllowedIPs=10.100.0.2/32
PersistentKeepalive=25
```

## Creating the .network File (Server)

```bash
sudo nano /etc/systemd/network/50-wg0.network
```

```ini
[Match]
Name=wg0

[Network]
Address=10.100.0.1/24
```

## Client .netdev Configuration

```ini
# /etc/systemd/network/50-wg0.netdev
[NetDev]
Name=wg0
Kind=wireguard

[WireGuard]
PrivateKeyFile=/etc/wireguard/wg0.key

[WireGuardPeer]
PublicKey=<server-public-key>
Endpoint=server.example.com:51820
AllowedIPs=0.0.0.0/0
PersistentKeepalive=25
```

## Client .network Configuration

```ini
# /etc/systemd/network/50-wg0.network
[Match]
Name=wg0

[Network]
Address=10.100.0.2/24

[Route]
Gateway=10.100.0.1
Destination=0.0.0.0/0
```

## Applying Configuration

Set permissions and restart:

```bash
chmod 640 /etc/systemd/network/50-wg0.netdev
chown root:systemd-network /etc/systemd/network/50-wg0.netdev
sudo systemctl restart systemd-networkd
```

## Verifying the Interface

```bash
sudo wg show wg0
ip link show wg0
networkctl status wg0
```

## Multiple Peers

Add multiple `[WireGuardPeer]` sections in the `.netdev` file:

```ini
[WireGuardPeer]
PublicKey=<peer1-public-key>
AllowedIPs=10.100.0.2/32

[WireGuardPeer]
PublicKey=<peer2-public-key>
AllowedIPs=10.100.0.3/32
```

## Conclusion

Configuring WireGuard with systemd-networkd provides a lightweight, consistent approach that fits naturally into a systemd-managed environment. The `.netdev` and `.network` file approach is declarative, survives reboots, and doesn't require `wg-quick` or other wrapper scripts.
