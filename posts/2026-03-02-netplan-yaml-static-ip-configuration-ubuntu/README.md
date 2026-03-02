# How to Write Netplan YAML for Static IP Configuration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, Static IP, Configuration

Description: A complete guide to writing Netplan YAML configuration for static IP addresses on Ubuntu, covering syntax, DNS, routes, and common mistakes to avoid.

---

Netplan replaced the older `/etc/network/interfaces` system starting with Ubuntu 17.10, and it is now the standard network configuration tool on modern Ubuntu systems. It uses YAML files to define network configuration, which are then handed off to either systemd-networkd or NetworkManager as the backend renderer.

Static IP configuration is one of the most common tasks for server administrators. Getting the YAML syntax right the first time avoids frustrating networking outages.

## Understanding Netplan's File Structure

Netplan configuration files live in `/etc/netplan/`. The files are processed in lexicographic order, meaning `01-config.yaml` is processed before `99-config.yaml`. Ubuntu typically ships with a default file:

```bash
# See what Netplan files exist
ls -la /etc/netplan/

# Common defaults:
# 00-installer-config.yaml  (created by the Ubuntu installer)
# 01-netcfg.yaml            (cloud-init generated)
# 50-cloud-init.yaml        (another cloud-init name)
```

To avoid conflicts with cloud-init generated files, it is often better to create a new file with a higher number or edit the existing one:

```bash
# Check for cloud-init managed network config
cat /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg 2>/dev/null || \
  echo "Cloud-init may still manage networking"

# Disable cloud-init networking to avoid conflicts
echo "network: {config: disabled}" | \
  sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg
```

## Basic Static IP Configuration

First, identify your network interface name:

```bash
# List network interfaces
ip link show

# Common naming patterns:
# eth0, eth1      - older naming
# ens3, ens33     - VMware/KVM VMs
# enp3s0          - physical NIC with PCI slot info
# eno1            - embedded/onboard NIC
```

Here is a minimal static IP configuration:

```yaml
# /etc/netplan/01-static-ip.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

Key points about the YAML:
- Indentation uses spaces, never tabs - YAML is strict about this
- `addresses` takes a list in CIDR notation (the `/24` prefix is required)
- `routes` with `to: default` is the modern way to set the default gateway (older configs used `gateway4` which is deprecated)
- `nameservers.addresses` sets DNS servers

## Applying the Configuration

```bash
# Test the configuration syntax without applying
sudo netplan generate

# Apply with a try period (reverts after 120s if you don't confirm)
sudo netplan try

# If everything looks good, press Enter to confirm
# Or wait 120 seconds for automatic rollback if something went wrong

# Apply immediately without the safety net
sudo netplan apply
```

The `netplan try` command is invaluable when working over SSH - if your configuration breaks connectivity, it rolls back automatically so you do not get locked out.

## Configuration with Multiple DNS Servers and Search Domains

For servers that need to resolve internal hostnames:

```yaml
# /etc/netplan/01-static-ip.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
          metric: 100    # route metric, lower = preferred
      nameservers:
        search:
          - internal.example.com
          - example.com
        addresses:
          - 192.168.1.1   # internal DNS server first
          - 8.8.8.8       # fallback to public DNS
```

With `search` domains configured, short hostnames like `webserver` will be tried as `webserver.internal.example.com` automatically.

## IPv6 Static Address

Many modern setups need both IPv4 and IPv6:

```yaml
# /etc/netplan/01-static-ip.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      dhcp6: false
      addresses:
        - 192.168.1.100/24          # IPv4 address
        - 2001:db8::100/64          # IPv6 address
      routes:
        - to: default               # IPv4 default route
          via: 192.168.1.1
        - to: "::/0"                # IPv6 default route
          via: "2001:db8::1"
      nameservers:
        addresses:
          - 8.8.8.8
          - 2001:4860:4860::8888    # Google's IPv6 DNS
```

## Multiple IP Addresses on One Interface

A single interface can have multiple IP addresses - useful for hosting multiple services:

```yaml
# /etc/netplan/01-static-ip.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24    # primary address
        - 192.168.1.101/24    # secondary address
        - 192.168.1.102/24    # tertiary address
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

## YAML Indentation Rules

The most common cause of Netplan configuration failures is incorrect indentation. Rules to remember:

```yaml
# CORRECT - consistent 2-space indentation
network:
  version: 2
  ethernets:
    enp3s0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24

# WRONG - mixed indentation or tabs
network:
	version: 2        # tab character - will fail
  ethernets:
      enp3s0:       # 6 spaces instead of 4 - wrong level
```

Validate YAML syntax before applying:

```bash
# Install yamllint for syntax checking
sudo apt install -y yamllint

# Check your file
yamllint /etc/netplan/01-static-ip.yaml

# Also use netplan's built-in check
sudo netplan generate 2>&1
```

## Verifying the Configuration Applied Correctly

After running `netplan apply`:

```bash
# Check the IP address was assigned
ip addr show enp3s0

# Verify the default route
ip route show

# Test DNS resolution
resolvectl status
resolvectl query google.com

# Test connectivity
ping -c 3 8.8.8.8         # ping by IP to test routing
ping -c 3 google.com       # ping by name to test DNS
```

## Troubleshooting Common Issues

**IP address not showing up:**
```bash
# Check networkd service status
sudo systemctl status systemd-networkd

# Check networkd logs for errors
sudo journalctl -u systemd-networkd --since "5 minutes ago"
```

**DNS not working:**
```bash
# Check resolved service
sudo systemctl status systemd-resolved

# Check what nameservers are configured
cat /etc/resolv.conf
resolvectl status
```

**Permission errors on Netplan files:**
```bash
# Netplan files must be owned by root and not world-readable
sudo chmod 600 /etc/netplan/01-static-ip.yaml
sudo chown root:root /etc/netplan/01-static-ip.yaml

# Then regenerate
sudo netplan generate
```

## Using NetworkManager as the Renderer

If you are on a desktop Ubuntu or want to use NetworkManager instead of networkd:

```yaml
# /etc/netplan/01-static-ip.yaml
network:
  version: 2
  renderer: NetworkManager    # capital N and M
  ethernets:
    enp3s0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

With NetworkManager as the renderer, the configuration translates to NetworkManager connection profiles. The `nm-cli` or the GUI network settings can then manage these connections.

## Complete Production-Ready Example

Here is a complete configuration for a production server with all the relevant options:

```yaml
# /etc/netplan/01-static-ip.yaml
# Static IP configuration for production server
# Modified: 2026-03-02
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      dhcp6: false
      # Primary and management IPs
      addresses:
        - 10.0.1.50/24
      # Default route with explicit metric
      routes:
        - to: default
          via: 10.0.1.1
          metric: 100
          on-link: true    # don't check if gateway is directly reachable
      # DNS with internal resolver first
      nameservers:
        search:
          - prod.example.com
          - example.com
        addresses:
          - 10.0.1.1
          - 1.1.1.1
      # Disable IPv6 autoconfiguration if not needed
      ipv6-address-generation: none
```

Netplan's YAML approach makes network configuration auditable and version-controllable, which is a significant improvement over the old interfaces file format. Store your Netplan configs in a git repository and treat them like any other infrastructure-as-code.
