# How to Assign Static IPv4 Addresses on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, IPv4, Networking, Network Configuration, Static IP, Sysadmin

Description: Assigning a static IPv4 address on Linux can be done temporarily with the ip command or permanently through network configuration files using Netplan, NetworkManager, or systemd-networkd.

## Temporary Assignment with ip Command

The `ip` command sets an address immediately but the change is lost on reboot:

```bash
# Assign a static IP to eth0

sudo ip addr add 192.168.1.100/24 dev eth0

# Set the default gateway
sudo ip route add default via 192.168.1.1 dev eth0

# Verify the assignment
ip addr show eth0
ip route show

# Remove the default route and address
sudo ip route del default via 192.168.1.1 dev eth0
sudo ip addr del 192.168.1.100/24 dev eth0
```

## Permanent with Netplan (Ubuntu 18.04+)

Edit `/etc/netplan/01-netcfg.yaml`:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
```

Apply the configuration:

```bash
sudo netplan apply
```

## Permanent with NetworkManager (nmcli)

NetworkManager is used on Fedora, RHEL, CentOS, and desktop Ubuntu:

```bash
# Create a new static connection
nmcli connection add \
  type ethernet \
  ifname eth0 \
  con-name static-eth0 \
  ip4 192.168.1.100/24 \
  gw4 192.168.1.1

# Set DNS servers
nmcli connection modify static-eth0 \
  ipv4.dns "8.8.8.8,1.1.1.1"

# Bring up the connection
nmcli connection up static-eth0

# Verify
nmcli device show eth0
```

## Permanent with systemd-networkd

Create `/etc/systemd/network/10-eth0.network`:

```ini
[Match]
Name=eth0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
DNS=1.1.1.1
```

Enable and start the services:

```bash
sudo systemctl enable --now systemd-networkd
sudo systemctl enable --now systemd-resolved
```

## Legacy Method: /etc/network/interfaces (Debian, with resolvconf for DNS)

```text
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8
```

```bash
sudo systemctl restart networking
```

## Verifying the Configuration

```bash
# Confirm address is assigned
ip addr show eth0

# Confirm routing
ip route show

# Test connectivity
ping -c 3 192.168.1.1   # Gateway
ping -c 3 8.8.8.8       # Internet
```

## Key Takeaways

- Use `ip addr add` for temporary changes; use config files for persistence.
- Ubuntu 18.04+ uses Netplan; Fedora/RHEL use NetworkManager (nmcli).
- Set a default gateway if the host needs to reach other networks, and configure DNS servers if name resolution is required.
- Verify with `ip addr show` and `ip route show` after applying changes.
