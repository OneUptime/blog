# How to Fix Network Manager vs Netplan Conflicts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, NetworkManager, Troubleshooting

Description: Guide to diagnosing and resolving conflicts between NetworkManager and Netplan on Ubuntu, including deciding which manager to use and configuring them to coexist without interference.

---

Ubuntu uses Netplan as an abstraction layer for network configuration, and Netplan can hand off actual network management to either `systemd-networkd` or `NetworkManager`. The conflict arises when both NetworkManager and systemd-networkd are running and both try to manage the same network interface. The result is unpredictable: interfaces may get double-configured, IP addresses may change unexpectedly, DNS settings may be overwritten, or interfaces may fail to come up entirely.

Understanding which component is responsible for what - and making a deliberate choice - resolves these conflicts.

## Understanding the Stack

On Ubuntu 22.04 and later:

- **Netplan** reads `/etc/netplan/*.yaml` and generates configuration for the chosen renderer
- **renderer: networkd** uses systemd-networkd for configuration
- **renderer: NetworkManager** uses NetworkManager for configuration
- Both can be active simultaneously, but each should manage different interfaces

The typical default:
- Ubuntu Server: Netplan + systemd-networkd (no NetworkManager)
- Ubuntu Desktop: Netplan + NetworkManager

Conflicts occur most often on desktop systems where someone has manually configured Netplan with `renderer: networkd`, or on servers where NetworkManager was installed alongside the server networking stack.

## Diagnosing the Conflict

```bash
# Check which services are running
systemctl is-active systemd-networkd
systemctl is-active NetworkManager

# Check if NetworkManager is managing any interfaces
nmcli device status

# Check if systemd-networkd has active leases or configurations
networkctl status

# View what each service thinks it controls
nmcli connection show
networkctl list

# Check logs for conflicts
sudo journalctl -u NetworkManager -u systemd-networkd --since "1 hour ago" | \
  grep -iE 'conflict|warn|error|failed' | head -30
```

### Signs of a Conflict

```bash
# If you see an interface managed by BOTH services
nmcli device status
# eth0   ethernet  connected  Wired connection 1   <- NetworkManager managing it

networkctl list
# 2 eth0 ether configured   <- systemd-networkd also managing it

# Or if you see interfaces that NetworkManager shows as "unmanaged" when they should be active
nmcli device status
# eth0   ethernet  unmanaged  --    <- NetworkManager has given up on it

# Check for duplicate IP assignments
ip addr show eth0
# may show two addresses from different managers
```

## Solution 1: Choose systemd-networkd (Recommended for Servers)

On servers, the clean approach is to use systemd-networkd exclusively and disable NetworkManager:

```bash
# Stop and disable NetworkManager
sudo systemctl stop NetworkManager
sudo systemctl disable NetworkManager
sudo systemctl mask NetworkManager  # Prevent it from starting even as a dependency

# Ensure systemd-networkd is running
sudo systemctl enable --now systemd-networkd
sudo systemctl enable --now systemd-resolved

# Check your Netplan config uses networkd renderer
cat /etc/netplan/*.yaml | grep renderer
```

If no renderer is specified in Netplan, the default depends on whether NetworkManager is installed:

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  renderer: networkd    # Explicitly use networkd
  ethernets:
    enp3s0:
      dhcp4: true
```

Apply:

```bash
sudo netplan apply
networkctl status
```

## Solution 2: Choose NetworkManager (Recommended for Desktops)

For desktop systems, NetworkManager is more feature-rich (better WiFi management, VPN support, GUI integration):

```bash
# Ensure NetworkManager is running
sudo systemctl enable --now NetworkManager

# Tell Netplan to use NetworkManager as the renderer
sudo nano /etc/netplan/01-network-manager-all.yaml
```

```yaml
network:
  version: 2
  renderer: NetworkManager
```

```bash
# Apply
sudo netplan apply

# Verify NetworkManager is managing the interfaces
nmcli device status
```

You may also need to stop systemd-networkd from interfering:

```bash
# If networkd is also running and picking up interfaces
sudo systemctl stop systemd-networkd
sudo systemctl disable systemd-networkd
```

## Solution 3: Coexistence - Different Managers for Different Interfaces

In some setups, you want NetworkManager for WiFi and systemd-networkd for wired interfaces (common on laptops used in server roles):

Configure NetworkManager to ignore specific interfaces:

```bash
# Tell NetworkManager to not manage wired interfaces
sudo nano /etc/NetworkManager/NetworkManager.conf
```

```ini
[main]
plugins=ifupdown,keyfile

[ifupdown]
managed=false

[keyfile]
# Comma-separated list of interfaces NetworkManager should ignore
unmanaged-devices=interface-name:eth0;interface-name:enp3s0
```

Or use Netplan's per-interface assignment:

```yaml
# /etc/netplan/01-config.yaml
network:
  version: 2
  renderer: networkd    # Default renderer for unlisted interfaces

  ethernets:
    enp3s0:             # Managed by networkd
      dhcp4: true
      renderer: networkd

  wifis:
    wlp2s0:             # Managed by NetworkManager
      renderer: NetworkManager
      access-points:
        "MyWiFi":
          password: "wifipassword"
```

## Fixing DNS Conflicts Between Managers

One of the most common symptoms is DNS being overwritten by one manager when the other configures it:

```bash
# Check what is writing to resolv.conf
sudo lsof /etc/resolv.conf

# Check resolv.conf for multiple conflicting entries
cat /etc/resolv.conf

# Check which manager controls DNS
resolvectl status

# NetworkManager DNS configuration
cat /etc/NetworkManager/NetworkManager.conf | grep dns
# Options: default, dnsmasq, systemd-resolved, none
```

Force NetworkManager to use systemd-resolved for DNS:

```bash
sudo nano /etc/NetworkManager/NetworkManager.conf
```

Add:

```ini
[main]
dns=systemd-resolved
```

```bash
sudo systemctl restart NetworkManager
```

## Fixing Duplicate or Missing Route Issues

When both managers run simultaneously, routes can conflict:

```bash
# View all routes and which routing protocol set them
ip route show
# default via 192.168.1.1 dev eth0 proto dhcp  <- added by DHCP
# default via 192.168.1.1 dev eth0 proto static <- duplicate added by other manager

# Remove a conflicting route
sudo ip route del default via 192.168.1.1 dev eth0 proto static

# After choosing one manager, apply cleanly
sudo netplan apply
```

## Dealing with "Connection Not Found" After Switching

When switching from NetworkManager to networkd, existing NetworkManager connections need to be cleaned up:

```bash
# List all NetworkManager connections
nmcli connection show

# Delete old NetworkManager connection profiles
nmcli connection delete "Wired connection 1"
nmcli connection delete "eth0"

# NetworkManager stores its connections in /etc/NetworkManager/system-connections/
ls /etc/NetworkManager/system-connections/
sudo rm /etc/NetworkManager/system-connections/*.nmconnection
```

## Cloud Instance Networking

On cloud instances (AWS, GCP, Azure), `cloud-init` configures networking and may conflict with both NetworkManager and Netplan:

```bash
# Check cloud-init network configuration
cat /etc/cloud/cloud.cfg | grep network
cat /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg 2>/dev/null

# Prevent cloud-init from overwriting network config
sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg <<EOF
network: {config: disabled}
EOF
```

## Verification After Fixing

```bash
# Confirm only one manager is active
systemctl is-active systemd-networkd
systemctl is-active NetworkManager

# Confirm interfaces are in a clean state
ip addr show
ip route show

# Confirm DNS is working
resolvectl status
dig +short google.com

# Check no conflicts in journals
sudo journalctl -u NetworkManager -u systemd-networkd --since "5 minutes ago" | \
  grep -iE 'error|fail|conflict'

# If you made Netplan changes, validate before applying
sudo netplan try  # Reverts automatically after 120 seconds if not confirmed
# Then press Enter to accept
```

The key principle: **one interface, one manager**. Netplan is designed to unify configuration but it can delegate to either backend. Making an explicit choice - networkd for servers, NetworkManager for desktops - and eliminating the unused manager prevents the vast majority of these conflicts.
