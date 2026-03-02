# How to Understand Netplan YAML Configuration Syntax on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Netplan, Networking, YAML, Configuration

Description: A detailed explanation of Netplan YAML configuration syntax on Ubuntu, covering structure, device types, address configuration, routes, and common patterns.

---

Netplan is Ubuntu's network configuration abstraction layer. You write YAML configuration files, and Netplan generates the configuration for whatever network backend you're using - either `systemd-networkd` or NetworkManager. Understanding the YAML syntax is the key to configuring any networking scenario in Ubuntu.

## Configuration File Location

Netplan reads all `.yaml` files in `/etc/netplan/` in lexicographic order. Files with lower numbers are read first, and later files can override settings from earlier ones:

```bash
ls /etc/netplan/
# Typical output:
# 00-installer-config.yaml
# 01-netcfg.yaml
```

You can have multiple files; settings merge together. Conflicts are resolved by the last-read file winning.

## Top-Level Structure

Every Netplan file has the same top-level structure:

```yaml
network:
  version: 2
  renderer: networkd  # or 'NetworkManager'
  ethernets: { ... }
  wifis: { ... }
  bonds: { ... }
  bridges: { ... }
  vlans: { ... }
  tunnels: { ... }
```

- **version** - always `2`. There is no other supported version.
- **renderer** - `networkd` for server/headless setups, `NetworkManager` for desktop with GUI.
- The remaining keys are device type sections.

## Device Type Sections

Each device type section is a map where keys are interface names:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:     # This is the interface name
      dhcp4: true
    eth1:
      dhcp4: false
      addresses: [10.0.0.1/24]
```

### Supported Device Types

| Key | Purpose |
|-----|---------|
| `ethernets` | Physical ethernet interfaces |
| `wifis` | Wireless interfaces |
| `bonds` | Bonded (LAG) interfaces |
| `bridges` | Network bridges |
| `vlans` | VLAN subinterfaces |
| `tunnels` | VPN and tunnel interfaces |
| `dummies` | Dummy interfaces for loopback-like uses |

## Interface Matching

Instead of using the interface name directly, you can match interfaces by properties. This is useful when interface names are unpredictable:

```yaml
ethernets:
  mainnic:           # Arbitrary name for this config block
    match:
      # Match by driver
      driver: virtio_net
      # Match by MAC address
      macaddress: "52:54:00:ab:cd:01"
    # Set a predictable name via this config
    set-name: eth0
```

Matching criteria:
- `name` - glob pattern matching interface name (e.g., `en*`)
- `macaddress` - exact MAC address match
- `driver` - kernel driver name

You can combine match criteria, and all must match.

## Address Configuration

### Static Addresses

```yaml
ethernets:
  eth0:
    # Disable DHCP
    dhcp4: false
    dhcp6: false
    # List of IP/prefix pairs
    addresses:
      - 192.168.1.100/24    # IPv4
      - "10.0.0.1/8"        # Quotes needed for some values
      - "2001:db8::1/64"    # IPv6
```

Multiple addresses on the same interface are supported and common.

### DHCP Configuration

```yaml
ethernets:
  eth0:
    # Enable DHCPv4
    dhcp4: true
    # Enable DHCPv6
    dhcp6: false
    # DHCP-specific options
    dhcp4-overrides:
      # Don't use DHCP-provided DNS
      use-dns: false
      # Don't use DHCP-provided routes
      use-routes: false
      # Set hostname sent to DHCP server
      hostname: myhost
      # Request a specific IP (if server supports it)
      # request-hostname: myhost
```

## Routes Configuration

### Default Gateway

```yaml
ethernets:
  eth0:
    addresses: [192.168.1.100/24]
    routes:
      - to: default     # "default" is shorthand for 0.0.0.0/0
        via: 192.168.1.1
```

### Multiple Routes

```yaml
routes:
  - to: default
    via: 192.168.1.1
    metric: 100      # Route metric/priority (lower = preferred)
  - to: 10.0.0.0/8
    via: 192.168.1.254
    metric: 200
  - to: 172.16.0.0/12
    via: 192.168.1.253
    on-link: true    # Gateway is directly on this link (no ARP needed)
```

Route properties:
- `to` - destination prefix or `default`
- `via` - gateway IP address
- `metric` - route metric (lower is preferred)
- `on-link` - gateway is directly reachable without additional routing
- `type` - route type: `unicast` (default), `blackhole`, `unreachable`, `prohibit`
- `table` - routing table number for policy routing

## DNS Configuration

```yaml
ethernets:
  eth0:
    addresses: [192.168.1.100/24]
    nameservers:
      # List of DNS server IPs
      addresses:
        - 9.9.9.9
        - 149.112.112.112
      # Search domains
      search:
        - example.com
        - corp.example.com
```

## Interface Parameters

Common parameters available for most interface types:

```yaml
ethernets:
  eth0:
    # MTU (Maximum Transmission Unit)
    mtu: 9000
    # MAC address override
    macaddress: "aa:bb:cc:dd:ee:ff"
    # Optional description
    # optional: true  # Don't fail boot if this interface is not present
    # Wake-on-LAN
    wakeonlan: true
    # Receive offloading optimization
    receive-checksum-offload: true
    transmit-checksum-offload: true
```

## VLAN Configuration

```yaml
vlans:
  eth0.100:           # Common naming convention: parent.vlanid
    id: 100           # VLAN ID
    link: eth0        # Parent interface
    addresses: [192.168.100.1/24]
    nameservers:
      addresses: [192.168.100.53]
  eth0.200:
    id: 200
    link: eth0
    dhcp4: true
```

## Bridge Configuration

```yaml
ethernets:
  eth1:
    dhcp4: false      # Slave interface - no IP directly
  eth2:
    dhcp4: false

bridges:
  br0:
    interfaces: [eth1, eth2]    # Interfaces to bridge
    dhcp4: true
    parameters:
      # Bridge STP parameters
      stp: true
      forward-delay: 4
      hello-time: 2
      max-age: 12
      priority: 32768
```

## Bond Configuration

```yaml
ethernets:
  eth0:
    dhcp4: false
  eth1:
    dhcp4: false

bonds:
  bond0:
    interfaces: [eth0, eth1]
    addresses: [192.168.1.100/24]
    parameters:
      mode: active-backup
      primary: eth0
      mii-monitor-interval: 100
      up-delay: 200
      down-delay: 200
```

## Tunnel Configuration

For WireGuard:

```yaml
tunnels:
  wg0:
    mode: wireguard
    addresses: [10.0.1.2/24]
    private-key: /etc/wireguard/wg0.key
    peers:
      - keys:
          public: "peer-public-key-base64=="
        allowed-ips: [10.0.1.1/32, 192.168.0.0/24]
        endpoint: "vpn.example.com:51820"
        keepalive: 25
```

## Authentication (802.1X)

For enterprise networks with port authentication:

```yaml
ethernets:
  eth0:
    dhcp4: true
    auth:
      key-management: eap
      method: peap
      identity: username@example.com
      password: "your-password"
      ca-certificate: /etc/ssl/certs/ca-cert.pem
```

## Working with Multiple Files

Netplan merges all files in `/etc/netplan/`. Use this to separate concerns:

```yaml
# /etc/netplan/00-base.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
```

```yaml
# /etc/netplan/50-routes.yaml
network:
  version: 2
  ethernets:
    eth0:
      routes:
        - to: 10.0.0.0/8
          via: 192.168.1.254
```

The route from `50-routes.yaml` is applied to `eth0` alongside the DHCP from `00-base.yaml`.

## Applying and Testing Configuration

```bash
# Validate YAML syntax and generate backend configs without applying
sudo netplan generate

# Apply configuration
sudo netplan apply

# Test configuration temporarily (reverts after 120 seconds unless confirmed)
sudo netplan try

# Confirm the try
# (press Enter in the netplan try prompt, or run:)
sudo netplan apply
```

`netplan try` is invaluable for remote configuration changes - if your change breaks connectivity, it automatically reverts after the timeout.

## Common Mistakes

**YAML indentation.** YAML is indent-sensitive. Use spaces, not tabs. Inconsistent indentation causes subtle errors that are hard to spot.

**Missing quotes.** MAC addresses and some IP values may need quoting in YAML to prevent the YAML parser from misinterpreting them.

**renderer mismatch.** If your system boots with `networkd` but you specify `renderer: NetworkManager`, the configuration may not apply correctly.

**Empty sections.** Do not include empty device type sections. Remove `wifis: {}` if you have no wireless configuration.

```bash
# Always validate before applying
sudo netplan generate && sudo netplan try
```

Understanding Netplan's YAML structure makes network configuration on Ubuntu predictable and reproducible. Once you know the pattern, adapting it for bonding, VLANs, bridges, or VPNs is mostly a matter of adding the right section with the right parameters.
