# How to Set Up Wake-on-LAN for Remote Power Management on RHEL Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Wake-on-LAN, WoL, Remote Management, Networking, Linux

Description: Configure Wake-on-LAN (WoL) on RHEL servers to remotely power on machines over the network, enabling energy savings and remote administration.

---

Wake-on-LAN (WoL) allows you to power on a server remotely by sending a special "magic packet" over the network. This is useful for servers that do not need to run 24/7, or for remote administration scenarios where physical access is limited.

## Prerequisites

- Network adapter that supports WoL (most modern NICs do)
- WoL enabled in the BIOS/UEFI firmware
- Server connected via Ethernet (WoL does not work over Wi-Fi)

## Enable WoL in BIOS

Access the server's BIOS/UEFI settings and look for:
- "Wake on LAN" or "Wake on PCI/PCIe"
- "Power On By PCI Devices"
- Enable this setting and save

## Check WoL Support in RHEL

```bash
# Check if the NIC supports WoL
sudo ethtool ens192 | grep "Wake-on"
# Output:
#   Supports Wake-on: pumbg
#   Wake-on: d

# The letters mean:
# p - PHY activity
# u - unicast messages
# m - multicast messages
# b - broadcast messages
# g - magic packet (this is what you want)
# d - disabled
```

## Enable WoL on the Network Interface

```bash
# Enable WoL for magic packet
sudo ethtool -s ens192 wol g

# Verify the change
sudo ethtool ens192 | grep "Wake-on"
# Wake-on: g
```

## Make WoL Persistent Across Reboots

Using NetworkManager:

```bash
# Set WoL via nmcli for the active connection
sudo nmcli connection modify ens192 802-3-ethernet.wake-on-lan magic

# Verify the setting
nmcli connection show ens192 | grep wake-on-lan

# Reactivate the connection to apply
sudo nmcli connection up ens192
```

## Record the MAC Address

You will need the server's MAC address to send the magic packet.

```bash
# Get the MAC address of the network interface
ip link show ens192 | grep ether
# Example output: link/ether aa:bb:cc:dd:ee:ff
```

## Send a Wake-on-LAN Magic Packet

From another machine on the same network:

```bash
# Install a WoL utility on the sending machine
sudo dnf install -y wol
# or
sudo dnf install -y nmap-ncat

# Send a magic packet using the wol command
wol aa:bb:cc:dd:ee:ff

# Or using etherwake (another common tool)
sudo etherwake -i ens192 aa:bb:cc:dd:ee:ff

# Or using Python (works on any system with Python)
python3 -c "
import socket
mac = 'aa:bb:cc:dd:ee:ff'
mac_bytes = bytes.fromhex(mac.replace(':', ''))
magic = b'\xff' * 6 + mac_bytes * 16
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
sock.sendto(magic, ('255.255.255.255', 9))
print('Magic packet sent')
"
```

## WoL Across Subnets

Magic packets are broadcast frames and do not cross routers by default. To wake a server on a different subnet:

```bash
# Send a directed broadcast to the target subnet
wol -i 192.168.2.255 aa:bb:cc:dd:ee:ff

# Or configure your router to forward UDP port 9 broadcasts
# to the target subnet
```

## Verify WoL Works

```bash
# Shut down the server
sudo poweroff

# From another machine, send the magic packet
wol aa:bb:cc:dd:ee:ff

# The server should power on within a few seconds
# Verify by pinging it after boot
ping 192.168.1.100
```

Wake-on-LAN is a simple but effective tool for remote power management that reduces energy costs while keeping servers accessible when needed.
