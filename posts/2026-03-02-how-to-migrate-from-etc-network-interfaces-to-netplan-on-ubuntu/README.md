# How to Migrate from /etc/network/interfaces to Netplan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Netplan, Networking, Migration, Configuration

Description: A practical guide to migrating network configuration from the legacy /etc/network/interfaces format to Netplan on Ubuntu 18.04 and later.

---

Ubuntu switched from `/etc/network/interfaces` to Netplan starting with Ubuntu 17.10. If you have older servers that were upgraded rather than freshly installed, or if you set up networking manually using the legacy format, you will eventually need to migrate. This guide covers the translation from common `interfaces` configurations to their Netplan equivalents.

## Why Migrate

Staying on `/etc/network/interfaces` works - Ubuntu still supports it through `ifupdown` - but it is unsupported and will be removed in future releases. Netplan also integrates better with `systemd-networkd` and `cloud-init`, which makes managing Ubuntu servers at scale more consistent.

## Check Your Current Setup

Before touching anything:

```bash
# Check what is currently managing networking
systemctl status networking
systemctl status systemd-networkd
systemctl status NetworkManager

# View the current interfaces file
cat /etc/network/interfaces
ls /etc/network/interfaces.d/
```

Also check if Netplan is already installed and has configuration files:

```bash
ls /etc/netplan/
netplan --version
```

## Backup First

```bash
# Back up all network configuration
sudo cp /etc/network/interfaces /etc/network/interfaces.backup
sudo cp -r /etc/network/interfaces.d/ /etc/network/interfaces.d.backup/
sudo cp -r /etc/netplan/ /etc/netplan.backup/ 2>/dev/null || true
```

## Migration Examples

### Simple DHCP Interface

Old `interfaces` format:

```bash
# /etc/network/interfaces
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet dhcp
```

Netplan equivalent:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    lo:
      addresses: [127.0.0.1/8]
    eth0:
      dhcp4: true
```

Note: The loopback interface does not need explicit configuration in Netplan - it is handled automatically. You can omit the `lo` section entirely.

### Static IP Configuration

Old format:

```bash
# /etc/network/interfaces
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 9.9.9.9 149.112.112.112
    dns-search example.com
```

Netplan equivalent:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24    # Note: CIDR notation, not separate netmask
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [9.9.9.9, 149.112.112.112]
        search: [example.com]
```

Key differences:
- Netplan uses CIDR notation (`192.168.1.100/24`) not `address` + `netmask`
- The gateway is specified as a route with `to: default`
- DNS is under `nameservers`

### Multiple IP Addresses

Old format:

```bash
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1

auto eth0:1
iface eth0:1 inet static
    address 192.168.1.101
    netmask 255.255.255.0
```

Netplan equivalent (no virtual interfaces needed):

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
        - 192.168.1.101/24    # Multiple addresses on same interface
      routes:
        - to: default
          via: 192.168.1.1
```

### Static Route

Old format:

```bash
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    up ip route add 10.0.0.0/8 via 192.168.1.254 dev eth0
    down ip route del 10.0.0.0/8 via 192.168.1.254 dev eth0
```

Netplan equivalent:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
        - to: 10.0.0.0/8
          via: 192.168.1.254
```

### VLAN Interface

Old format:

```bash
auto eth0.100
iface eth0.100 inet static
    address 192.168.100.1
    netmask 255.255.255.0
    vlan-raw-device eth0
```

Netplan equivalent:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  vlans:
    eth0.100:
      id: 100
      link: eth0
      addresses: [192.168.100.1/24]
```

### Bridge Configuration

Old format:

```bash
auto br0
iface br0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    bridge_ports eth0
    bridge_stp on
    bridge_fd 0
```

Netplan equivalent:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  bridges:
    br0:
      interfaces: [eth0]
      dhcp4: false
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      parameters:
        stp: true
        forward-delay: 0
```

### Bonding/Link Aggregation

Old format:

```bash
auto bond0
iface bond0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    bond-slaves eth0 eth1
    bond-mode active-backup
    bond-miimon 100
    bond-primary eth0
```

Netplan equivalent:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false
  bonds:
    bond0:
      interfaces: [eth0, eth1]
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      parameters:
        mode: active-backup
        primary: eth0
        mii-monitor-interval: 100
```

## Performing the Migration

### Step 1: Write the Netplan Configuration

Create the Netplan file based on your translation:

```bash
sudo nano /etc/netplan/01-network.yaml
```

### Step 2: Validate

```bash
# Check YAML syntax and generate backend configs
sudo netplan generate
```

Fix any errors before proceeding.

### Step 3: Install Required Packages

If migrating from `ifupdown` to `networkd`:

```bash
# Install systemd-networkd if not present
sudo apt install systemd-networkd

# Enable it
sudo systemctl enable systemd-networkd
```

### Step 4: Disable the Old Networking Service

```bash
# Disable ifupdown networking service
sudo systemctl disable networking
sudo systemctl stop networking
```

### Step 5: Apply Netplan Configuration

If working remotely, use `netplan try` which auto-reverts after 120 seconds if connectivity is lost:

```bash
sudo netplan try
# Press Enter to confirm if connectivity is maintained
```

If at the console:

```bash
sudo netplan apply
```

### Step 6: Verify

```bash
# Check interface status
ip addr show
ip route show

# Test connectivity
ping -c 3 192.168.1.1
ping -c 3 google.com

# Check DNS
resolvectl status
```

## Handling Pre/Post Scripts

The `interfaces` file supports `pre-up`, `up`, `post-up`, `pre-down`, `down`, and `post-down` hooks. Netplan does not have direct equivalents. Replace them with:

- **Systemd services** with `After=network.target`
- **Networkd dispatcher scripts** in `/etc/networkd-dispatcher/`

For example, replace `up` hook with a networkd dispatcher script:

```bash
# Create a routable-up script that runs when eth0 becomes routable
sudo mkdir -p /etc/networkd-dispatcher/routable.d/
sudo tee /etc/networkd-dispatcher/routable.d/custom-routes.sh <<'EOF'
#!/bin/bash
# Run when an interface becomes routable
[ "$IFACE" = "eth0" ] || exit 0
ip route add 10.0.0.0/8 via 192.168.1.254 dev eth0
EOF
sudo chmod +x /etc/networkd-dispatcher/routable.d/custom-routes.sh
```

Install networkd-dispatcher if needed:

```bash
sudo apt install networkd-dispatcher
```

## Rolling Back

If migration fails:

```bash
# Re-enable the old networking
sudo systemctl enable networking
sudo systemctl start networking

# Disable Netplan's backend
sudo systemctl stop systemd-networkd
```

The backup of `/etc/network/interfaces` you made at the start can restore the original configuration.

Migrating network configuration is one of those tasks where careful planning and a clear rollback procedure make the difference between a routine maintenance window and a recovery incident. Test in a non-production environment first when possible.
