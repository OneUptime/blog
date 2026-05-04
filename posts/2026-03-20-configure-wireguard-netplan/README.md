# How to Configure a WireGuard VPN with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Netplan, Ubuntu, WireGuard, VPN, Networking

Description: Configure a WireGuard VPN tunnel on Ubuntu and Debian using Netplan YAML configuration, including key management and peer settings.

## Introduction

Netplan supports WireGuard under the `tunnels` key with `mode: wireguard`. Keys are referenced from files or entered inline. This provides declarative WireGuard management integrated with the rest of Netplan's network configuration.

## Generate WireGuard Keys

```bash
# Generate private and public keys

wg genkey | tee /etc/netplan/wg0-private.key | wg pubkey > /etc/netplan/wg0-public.key

# Restrict permissions
chmod 600 /etc/netplan/wg0-private.key

# View keys
cat /etc/netplan/wg0-private.key
cat /etc/netplan/wg0-public.key
```

## Basic WireGuard Configuration

```yaml
# /etc/netplan/99-wg0.yaml
network:
  version: 2
  tunnels:
    wg0:
      mode: wireguard
      addresses:
        - 10.0.0.1/24
      key: /etc/netplan/wg0-private.key
      port: 51820
      peers:
        - keys:
            public: <PEER_PUBLIC_KEY>
          allowed-ips:
            - 10.0.0.2/32
          endpoint: 203.0.113.2:51820
          keepalive: 25
```

```bash
netplan apply
wg show wg0
```

## Inline Private Key (Less Secure)

```yaml
tunnels:
  wg0:
    mode: wireguard
    addresses:
      - 10.0.0.1/24
    key: "YOUR_PRIVATE_KEY_HERE"
    port: 51820
    peers:
      - keys:
          public: "<PEER_PUBLIC_KEY>"
        allowed-ips:
          - 0.0.0.0/0
        endpoint: 203.0.113.2:51820
```

Referencing the private key by file path is preferred over an inline key for security.

## Full Tunnel (Route All Traffic Through VPN)

```yaml
tunnels:
  wg0:
    mode: wireguard
    addresses:
      - 10.0.0.1/24
    key: /etc/netplan/wg0-private.key
    port: 51820
    peers:
      - keys:
          public: "<PEER_PUBLIC_KEY>"
        allowed-ips:
          - 0.0.0.0/0
        endpoint: 203.0.113.2:51820
        keepalive: 25
```

## Remote Peer Configuration

On the remote host:

```yaml
network:
  version: 2
  tunnels:
    wg0:
      mode: wireguard
      addresses:
        - 10.0.0.2/24
      key: /etc/netplan/wg0-private.key
      port: 51820
      peers:
        - keys:
            public: "<SERVER_PUBLIC_KEY>"
          allowed-ips:
            - 10.0.0.1/32
          endpoint: 203.0.113.1:51820
          keepalive: 25
```

## Verify WireGuard

```bash
# Apply
netplan apply

# Show WireGuard status
wg show wg0

# Show interface
ip addr show wg0

# Test peer connectivity
ping -c 3 10.0.0.2
```

## Conclusion

WireGuard in Netplan uses the `tunnels` key with `mode: wireguard`. Store private keys in files referenced by the tunnel's `key` property. Define peers with their public keys (under `keys.public`), allowed IPs, and endpoints. Apply with `netplan apply` and verify with `wg show wg0`.
