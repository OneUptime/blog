# How to Troubleshoot Network Interface Not Coming Up on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Troubleshooting, Netplan, System Administration

Description: Comprehensive guide to diagnosing and fixing network interfaces that fail to come up on Ubuntu, covering Netplan configuration, driver issues, hardware detection, and service dependencies.

---

A network interface that refuses to come up is a frustrating problem that can leave a server unreachable or a new machine unable to connect. The causes range from trivial (wrong interface name in config) to hardware-level (missing firmware). Working through them systematically gets you to the fix faster.

## Step 1: Identify Available Interfaces

Start by seeing what the kernel knows about:

```bash
# List all network interfaces recognized by the kernel
ip link show

# Alternatively
ip a

# Show only down interfaces
ip link show | grep -i 'state DOWN\|state UNKNOWN'

# View physical and virtual interfaces
ls /sys/class/net/

# Check for interfaces the kernel sees but that are not configured
cat /proc/net/dev
```

If an interface you expect does not appear at all, the issue is hardware or driver related. If it appears but is DOWN, the issue is configuration.

## Step 2: Check Hardware Detection

```bash
# List PCI network devices (wired)
lspci | grep -i 'ethernet\|network'

# List USB network devices
lsusb | grep -i 'ethernet\|network\|usb.*net'

# Check if the kernel recognizes the hardware
dmesg | grep -i 'eth\|ens\|enp\|wlan\|net\|network' | head -30

# More specific hardware check
dmesg | grep -i 'driver\|firmware\|probe' | grep -i 'eth\|net' | head -20
```

If `lspci` shows the card but it does not appear in `ip link`, you likely have a missing or broken driver.

## Step 3: Check for Missing Drivers or Firmware

```bash
# Check if the driver module is loaded for your NIC
# First, identify the driver from dmesg
dmesg | grep -i 'driver\|module' | grep -i 'eth\|net' | head -10

# List all loaded network-related modules
lsmod | grep -iE 'e1000|igb|ixgbe|tg3|r8169|bnx2|mlx|virtio_net'

# Check if a specific module is loaded
modinfo e1000e  # For Intel NICs
modinfo r8169   # For Realtek NICs

# Try loading a module manually
sudo modprobe e1000e
dmesg | tail -20  # Check if the module loaded successfully
```

For firmware issues:

```bash
# Check for firmware loading failures
dmesg | grep -i 'firmware\|microcode' | head -20

# Install missing firmware packages
sudo apt-get install linux-firmware

# For specific hardware (e.g., Broadcom wireless)
sudo apt-get install firmware-b43-installer  # Community firmware
```

## Step 4: Check Netplan Configuration

Ubuntu 18.04 and later uses Netplan by default. Misconfigured Netplan is a common cause of interfaces not coming up.

```bash
# View all Netplan configuration files
ls -la /etc/netplan/
cat /etc/netplan/*.yaml

# Common mistake: using the wrong interface name
# Check the actual interface names
ip link show
```

A common Netplan configuration:

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  ethernets:
    enp3s0:              # Must match the actual interface name exactly
      dhcp4: true
      dhcp6: false
      optional: false    # Set to true if the interface is not required for boot
```

Apply and check for errors:

```bash
# Validate the configuration without applying
sudo netplan try

# If dry-run succeeds, apply it
sudo netplan apply

# Check for Netplan errors in the journal
sudo journalctl -u systemd-networkd -n 50
sudo journalctl -u NetworkManager -n 50
```

### Interface Name Mismatch

Ubuntu uses predictable network interface names (enp3s0, ens192, etc.) that encode the PCI slot. After hardware changes (adding a NIC, migrating a VM), the interface name may change.

```bash
# After a hardware change, find the new interface name
ip link show

# Update Netplan to use the new name
sudo nano /etc/netplan/00-installer-config.yaml

# Or use MAC address matching for stable naming
```

Matching by MAC address in Netplan:

```yaml
network:
  version: 2
  ethernets:
    primary-nic:
      match:
        macaddress: 52:54:00:ab:cd:ef  # Replace with actual MAC
      set-name: eth0                    # Rename to a predictable name
      dhcp4: true
```

## Step 5: Check the Interface State

```bash
# Bring the interface up manually
sudo ip link set enp3s0 up

# Check if it came up
ip link show enp3s0

# Check for error messages
dmesg | tail -20

# Try assigning an IP manually
sudo ip addr add 192.168.1.100/24 dev enp3s0
sudo ip route add default via 192.168.1.1
```

If the interface comes up after manual `ip link set up` but not after boot, the issue is in the startup configuration.

## Step 6: Check DHCP Client

If the interface comes up but does not get an IP address:

```bash
# Check if a DHCP client is running for the interface
ps aux | grep dhclient

# With systemd-networkd
networkctl status enp3s0

# Try getting an IP manually
sudo dhclient enp3s0 -v

# Or with dhcpcd
sudo dhcpcd enp3s0 -d
```

Check the DHCP server is reachable:

```bash
# Send a DHCP discovery packet and watch responses
sudo nmap --script broadcast-dhcp-discover -e enp3s0

# Check if the broadcast is reaching the network
sudo tcpdump -i enp3s0 -n port 67 or port 68
```

## Step 7: Check for IP Conflicts

Duplicate IP addresses cause intermittent connectivity or prevent the interface from working:

```bash
# Check for ARP conflicts
sudo arping -I enp3s0 -c 3 192.168.1.100

# If another host responds to your IP, you have a conflict
# Change your IP or investigate the conflicting host
```

## Step 8: systemd-networkd vs NetworkManager Conflicts

Ubuntu can run two network managers simultaneously, and they can conflict:

```bash
# Check which network manager is active
systemctl is-active systemd-networkd
systemctl is-active NetworkManager

# If both are active and managing the same interface, conflicts occur
# Check NetworkManager's managed state
nmcli general status
nmcli device status

# Check if NetworkManager is managing the interface
cat /etc/NetworkManager/NetworkManager.conf | grep -A 5 'main'
```

If you want Netplan+systemd-networkd to manage everything (server setup), disable NetworkManager:

```bash
sudo systemctl stop NetworkManager
sudo systemctl disable NetworkManager
sudo systemctl enable --now systemd-networkd
sudo netplan apply
```

## Step 9: Checking VLANs and Bonding

For VLAN or bonding configurations:

```bash
# Check if bonding/VLAN modules are loaded
lsmod | grep -E 'bonding|8021q|vlan'

# Load them if needed
sudo modprobe bonding
sudo modprobe 8021q

# View bond status
cat /proc/net/bonding/bond0 2>/dev/null

# Check VLAN configuration
cat /proc/net/vlan/config 2>/dev/null
ip link show type vlan
```

## Step 10: Hardware and Cable Issues

If software configuration looks correct:

```bash
# Check if the physical link is up (carrier)
cat /sys/class/net/enp3s0/carrier
# 1 = link detected, 0 = no link

# Check link speed and duplex negotiation
sudo ethtool enp3s0

# Look for duplex mismatch (one side is auto, other is fixed)
# Both sides should show the same speed and duplex
sudo ethtool enp3s0 | grep -E 'Speed|Duplex|Link'

# Check for hardware errors
ip -s link show enp3s0
# High error counts suggest cable, switch port, or NIC issues
```

## Practical Recovery for an Unreachable Server

If a server becomes unreachable due to a bad network configuration:

```bash
# Access via console (IPMI, iDRAC, server management card, or physical console)

# Check what is configured
cat /etc/netplan/*.yaml

# Test with a temporary manual configuration (does not persist)
sudo ip addr flush dev enp3s0
sudo ip addr add 192.168.1.100/24 dev enp3s0
sudo ip link set enp3s0 up
sudo ip route add default via 192.168.1.1
ping -c 3 8.8.8.8

# Once connectivity is restored, fix the Netplan config
sudo nano /etc/netplan/00-installer-config.yaml
sudo netplan try
sudo netplan apply
```

## Collecting Diagnostic Information

When escalating a network interface issue, collect:

```bash
# Full diagnostic dump
{
  echo "=== ip link show ==="
  ip link show
  echo "=== ip addr show ==="
  ip addr show
  echo "=== ip route show ==="
  ip route show
  echo "=== dmesg network ==="
  dmesg | grep -iE 'eth|ens|enp|net|driver|firmware' | tail -50
  echo "=== netplan config ==="
  cat /etc/netplan/*.yaml 2>/dev/null
  echo "=== journal systemd-networkd ==="
  journalctl -u systemd-networkd --no-pager -n 30
  echo "=== lspci network ==="
  lspci | grep -i network
} > /tmp/network-diag.txt 2>&1

cat /tmp/network-diag.txt
```

This output covers the most common causes. Provide it when seeking help on forums or from vendors.

Network interface problems at boot are almost always either a misconfigured interface name, a missing driver, or a service ordering issue (Netplan applied before the interface is physically ready). Working through these steps systematically identifies which layer the problem is at.
