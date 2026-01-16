# How to Configure Wake-on-LAN on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Linux, Networking, Wake-on-LAN, Remote Management, Power Management, Server Administration

Description: A complete guide to configuring Wake-on-LAN on Ubuntu, from BIOS settings to sending magic packets and building a WoL web interface.

---

Wake-on-LAN (WoL) lets you power on a computer remotely by sending a special network packet called a "magic packet." This is invaluable for system administrators managing servers, home lab enthusiasts, and anyone who needs remote access to machines that may be powered off.

## What is Wake-on-LAN?

Wake-on-LAN is a networking standard that allows a powered-off computer to be turned on by a network message. The network interface card (NIC) remains powered in a low-power state even when the computer is off, listening for a specific packet pattern. When it receives this "magic packet," it signals the motherboard to power on.

### Common Use Cases

- **Remote server management:** Start servers without physical access to the data center
- **Energy savings:** Power off workstations overnight and wake them before employees arrive
- **Home lab management:** Wake up home servers or media centers on demand
- **Remote desktop access:** Power on your home PC before connecting via VPN
- **Automated maintenance:** Schedule wake times for updates and backups

## Prerequisites: BIOS/UEFI Configuration

Before configuring WoL in Ubuntu, you must enable it in your system's BIOS/UEFI. The exact steps vary by manufacturer, but here is the general process.

### Accessing BIOS/UEFI Settings

Restart your computer and press the appropriate key during boot (commonly F2, F10, F12, Del, or Esc). Look for power management or network-related settings.

### Common BIOS/UEFI Setting Names

Different manufacturers use different terminology for Wake-on-LAN settings:

- Wake on LAN
- Wake on PCI/PCIe
- Power On By PCI/PCIe Device
- PME Event Wake Up
- Resume by LAN
- Boot on LAN
- Remote Wake Up

Enable the appropriate setting and save your BIOS changes. Some systems also require disabling "Deep Sleep" or "ErP Ready" modes, as these cut power to the NIC entirely.

## Checking NIC Wake-on-LAN Support

Once your BIOS is configured, verify that your network interface supports WoL from within Ubuntu. The `ethtool` utility provides this information.

Install ethtool if it is not already present on your system. This tool is essential for querying and configuring network interface settings:

```bash
# Install ethtool for network interface configuration
sudo apt update && sudo apt install -y ethtool
```

Identify your network interface name. Modern Ubuntu systems use predictable network interface names like enp0s3 or ens192 instead of the legacy eth0 format:

```bash
# List all network interfaces with their IP addresses
# Look for your primary Ethernet interface (not lo or wireless)
ip link show
```

Query the Wake-on-LAN capabilities of your interface. The output shows both what the hardware supports and what is currently enabled:

```bash
# Check WoL support and current status for your interface
# Replace 'enp0s3' with your actual interface name
sudo ethtool enp0s3 | grep -i wake
```

The output will show two lines similar to this:

```
Supports Wake-on: pumbg
Wake-on: d
```

### Understanding WoL Flags

The letters in the "Supports Wake-on" field indicate available wake methods:

| Flag | Description |
|------|-------------|
| p | Wake on PHY activity (link status change) |
| u | Wake on unicast messages |
| m | Wake on multicast messages |
| b | Wake on broadcast messages |
| g | Wake on magic packet (this is what you need) |
| a | Wake on ARP |
| s | Enable SecureOn password for magic packet |
| d | Disabled (no wake events) |

The most common and reliable method is `g` (magic packet). If your "Supports Wake-on" field includes `g`, your NIC can use Wake-on-LAN.

## Enabling Wake-on-LAN on Your Network Interface

If the current "Wake-on" value shows `d` (disabled), you need to enable magic packet waking. Use ethtool to enable WoL temporarily:

```bash
# Enable Wake-on-LAN using magic packet mode
# This setting will NOT persist across reboots
sudo ethtool -s enp0s3 wol g
```

Verify the change took effect by checking the WoL status again:

```bash
# Confirm WoL is now enabled (should show 'Wake-on: g')
sudo ethtool enp0s3 | grep "Wake-on:"
```

However, this setting is lost when the system reboots. The following sections cover multiple methods to make WoL persistent.

## Making Wake-on-LAN Persistent Across Reboots

There are several approaches to ensure WoL remains enabled after every boot. Choose the method that best fits your system configuration.

### Method 1: Using systemd Service

Create a systemd service that runs at boot and sets the WoL flag. This method works on all Ubuntu systems regardless of network configuration tool:

```bash
# Create a systemd service file for persistent WoL configuration
sudo nano /etc/systemd/system/wol.service
```

Add the following service configuration. This unit runs after the network interface is available and sets the WoL flag:

```ini
# /etc/systemd/system/wol.service
# Systemd service to enable Wake-on-LAN at boot
# Ensures the NIC accepts magic packets for remote wake

[Unit]
Description=Enable Wake-on-LAN
After=network.target

[Service]
Type=oneshot
# Set WoL to magic packet mode on the specified interface
# Change 'enp0s3' to match your network interface name
ExecStart=/usr/sbin/ethtool -s enp0s3 wol g
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Enable and start the service so WoL is configured on every boot:

```bash
# Reload systemd to recognize the new service file
sudo systemctl daemon-reload

# Enable the service to start at boot
sudo systemctl enable wol.service

# Start the service immediately
sudo systemctl start wol.service

# Verify the service is running correctly
sudo systemctl status wol.service
```

### Method 2: Using /etc/rc.local

For systems that still support rc.local, you can add the ethtool command there. First, ensure rc.local exists and is executable:

```bash
# Create rc.local if it doesn't exist
# This script runs at the end of each multiuser runlevel
sudo nano /etc/rc.local
```

Add the following content to the rc.local file:

```bash
#!/bin/bash
# /etc/rc.local
# This script is executed at the end of each multiuser runlevel
# Configure Wake-on-LAN for remote power management

# Enable magic packet wake on the primary network interface
# Adjust the interface name to match your system
/usr/sbin/ethtool -s enp0s3 wol g

exit 0
```

Make the script executable and enable the rc-local service:

```bash
# Make rc.local executable
sudo chmod +x /etc/rc.local

# Enable and start the rc-local service
sudo systemctl enable rc-local
sudo systemctl start rc-local
```

### Method 3: Using Network Manager

If your system uses Network Manager for network configuration, you can enable WoL through nmcli. This method integrates with the existing network management stack:

```bash
# List all Network Manager connections
nmcli connection show

# Enable WoL for a specific connection
# Replace 'Wired connection 1' with your connection name
sudo nmcli connection modify "Wired connection 1" 802-3-ethernet.wake-on-lan magic

# Reactivate the connection to apply changes
sudo nmcli connection up "Wired connection 1"
```

You can also set additional WoL options if your NIC supports them:

```bash
# Enable multiple wake triggers (magic packet and broadcast)
sudo nmcli connection modify "Wired connection 1" 802-3-ethernet.wake-on-lan "magic,broadcast"

# View current WoL settings for a connection
nmcli connection show "Wired connection 1" | grep wake-on-lan
```

## Netplan Configuration for Wake-on-LAN

Modern Ubuntu versions (17.10 and later) use Netplan for network configuration. You can configure WoL directly in your Netplan YAML file for seamless integration.

First, locate your Netplan configuration file. It is typically found in the /etc/netplan directory:

```bash
# List Netplan configuration files
ls -la /etc/netplan/
```

Edit your Netplan configuration to include WoL settings. The wakeonlan directive enables magic packet waking for the specified interface:

```yaml
# /etc/netplan/01-netcfg.yaml
# Network configuration with Wake-on-LAN enabled
# This file configures static IP and WoL for server management

network:
  version: 2
  renderer: networkd  # Use systemd-networkd as the backend
  ethernets:
    enp0s3:           # Your network interface name
      dhcp4: no       # Disable DHCP for static configuration
      addresses:
        - 192.168.1.100/24  # Static IP address with subnet mask
      gateway4: 192.168.1.1  # Default gateway
      nameservers:
        addresses:
          - 8.8.8.8          # Primary DNS server
          - 8.8.4.4          # Secondary DNS server
      # Enable Wake-on-LAN magic packet support
      # The NIC will wake the system when it receives a magic packet
      wakeonlan: true
```

Apply the Netplan configuration. The --debug flag provides verbose output for troubleshooting:

```bash
# Test the configuration syntax without applying
sudo netplan generate

# Apply the new network configuration
sudo netplan apply

# If issues arise, use debug mode for detailed output
sudo netplan --debug apply
```

For systems using DHCP instead of static IP configuration, the Netplan file is simpler:

```yaml
# /etc/netplan/01-netcfg.yaml
# DHCP configuration with Wake-on-LAN enabled

network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s3:
      dhcp4: yes        # Obtain IP address via DHCP
      wakeonlan: true   # Enable Wake-on-LAN magic packet support
```

## Sending Magic Packets

With WoL configured on the target machine, you can wake it from another computer. There are several tools available for sending magic packets.

### Finding the MAC Address

Before sending a magic packet, you need the target machine's MAC address. Run this command on the target system before shutting it down:

```bash
# Display MAC addresses for all network interfaces
# Note the MAC address (link/ether) for your primary interface
ip link show enp0s3
```

The MAC address appears in the format `aa:bb:cc:dd:ee:ff`. Record this address for use with wake commands.

### Using wakeonlan

The wakeonlan package is a simple command-line tool for sending magic packets. Install it on the machine you will use to wake your target:

```bash
# Install the wakeonlan utility
sudo apt install -y wakeonlan
```

Send a magic packet to wake a machine. The command broadcasts the packet to all devices on the local network:

```bash
# Send a magic packet to wake a machine by MAC address
# Replace with your target machine's actual MAC address
wakeonlan aa:bb:cc:dd:ee:ff
```

You can also specify a broadcast address for more targeted delivery:

```bash
# Send magic packet to a specific subnet's broadcast address
# Useful when the sending machine is on a different subnet
wakeonlan -i 192.168.1.255 aa:bb:cc:dd:ee:ff
```

### Using etherwake

The etherwake tool sends magic packets at the Ethernet layer and requires root privileges. It is useful when you need to specify the sending interface:

```bash
# Install etherwake
sudo apt install -y etherwake
```

Send a magic packet using etherwake. This tool allows you to specify which local interface sends the packet:

```bash
# Send magic packet via a specific network interface
# -i specifies the interface to send from
sudo etherwake -i enp0s3 aa:bb:cc:dd:ee:ff
```

### Using Python Script

For programmatic control or integration into automation workflows, you can send magic packets with Python:

```python
#!/usr/bin/env python3
"""
wake_on_lan.py - Send Wake-on-LAN magic packets

This script constructs and sends the magic packet required
to wake a machine that has WoL enabled. The magic packet
consists of 6 bytes of 0xFF followed by the target MAC
address repeated 16 times.

Usage: python3 wake_on_lan.py AA:BB:CC:DD:EE:FF
"""

import socket
import sys


def create_magic_packet(mac_address: str) -> bytes:
    """
    Create a Wake-on-LAN magic packet for the given MAC address.

    The magic packet format is:
    - 6 bytes of 0xFF (synchronization stream)
    - Target MAC address repeated 16 times (96 bytes)
    - Total: 102 bytes

    Args:
        mac_address: MAC address in format AA:BB:CC:DD:EE:FF

    Returns:
        bytes: The magic packet ready to send
    """
    # Remove separators and convert MAC to bytes
    mac_clean = mac_address.replace(":", "").replace("-", "")

    if len(mac_clean) != 12:
        raise ValueError(f"Invalid MAC address: {mac_address}")

    # Convert hex string to bytes
    mac_bytes = bytes.fromhex(mac_clean)

    # Build magic packet: 6 * 0xFF + 16 * MAC address
    magic_packet = b'\xff' * 6 + mac_bytes * 16

    return magic_packet


def send_magic_packet(mac_address: str, broadcast_ip: str = "255.255.255.255", port: int = 9):
    """
    Send a Wake-on-LAN magic packet to wake a remote machine.

    Args:
        mac_address: Target machine's MAC address
        broadcast_ip: Broadcast address to send to (default: 255.255.255.255)
        port: UDP port to use (default: 9, the standard WoL port)
    """
    # Create the magic packet
    packet = create_magic_packet(mac_address)

    # Create a UDP socket with broadcast capability
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        # Enable broadcast mode on the socket
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

        # Send the magic packet
        sock.sendto(packet, (broadcast_ip, port))

    print(f"Magic packet sent to {mac_address} via {broadcast_ip}:{port}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 wake_on_lan.py <MAC_ADDRESS> [BROADCAST_IP]")
        print("Example: python3 wake_on_lan.py AA:BB:CC:DD:EE:FF 192.168.1.255")
        sys.exit(1)

    mac = sys.argv[1]
    broadcast = sys.argv[2] if len(sys.argv) > 2 else "255.255.255.255"

    send_magic_packet(mac, broadcast)
```

Save this script and use it to wake machines:

```bash
# Make the script executable
chmod +x wake_on_lan.py

# Wake a machine using the script
./wake_on_lan.py aa:bb:cc:dd:ee:ff

# Wake a machine on a specific subnet
./wake_on_lan.py aa:bb:cc:dd:ee:ff 192.168.1.255
```

## Wake-on-LAN Across Subnets and VLANs

By default, magic packets are broadcast packets that do not cross router boundaries. Waking machines on different subnets requires additional configuration.

### Option 1: Directed Broadcast

Configure your router to forward directed broadcasts to specific subnets. This approach sends the magic packet to the subnet's broadcast address:

```bash
# Send magic packet to a specific subnet's broadcast address
# The router must be configured to forward directed broadcasts
wakeonlan -i 192.168.2.255 aa:bb:cc:dd:ee:ff
```

On Cisco routers, enable directed broadcast forwarding on the target interface:

```
# Cisco IOS configuration (router CLI)
interface GigabitEthernet0/1
  ip directed-broadcast
```

### Option 2: Subnet-Directed Broadcast with UDP

Some routers can forward UDP packets to a broadcast address. Configure a static route or use a helper address:

```bash
# Send magic packet as unicast to router, which broadcasts it
# Requires router configuration for UDP forwarding on port 9
wakeonlan -i 192.168.2.1 -p 9 aa:bb:cc:dd:ee:ff
```

### Option 3: WoL Relay/Proxy

Deploy a small WoL relay service on each subnet that listens for wake requests and broadcasts them locally. Here is a simple Python relay:

```python
#!/usr/bin/env python3
"""
wol_relay.py - Wake-on-LAN relay server

This service listens for WoL requests on a TCP port and
broadcasts magic packets on the local network. Deploy one
instance per subnet to enable cross-subnet WoL.

Usage: python3 wol_relay.py [--port 9999]
"""

import socket
import argparse


def create_magic_packet(mac_address: str) -> bytes:
    """Create a magic packet for the specified MAC address."""
    mac_clean = mac_address.replace(":", "").replace("-", "")
    mac_bytes = bytes.fromhex(mac_clean)
    return b'\xff' * 6 + mac_bytes * 16


def broadcast_magic_packet(mac_address: str, interface_ip: str = ""):
    """
    Broadcast a magic packet on the local network.

    Args:
        mac_address: Target MAC address
        interface_ip: Local IP to bind to (optional)
    """
    packet = create_magic_packet(mac_address)

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        if interface_ip:
            sock.bind((interface_ip, 0))
        sock.sendto(packet, ("255.255.255.255", 9))

    print(f"Broadcasted magic packet for {mac_address}")


def run_relay_server(port: int = 9999):
    """
    Run the WoL relay server.

    Listens for TCP connections and expects MAC addresses
    as plain text, one per line.
    """
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", port))
    server.listen(5)

    print(f"WoL relay listening on port {port}")

    while True:
        client, addr = server.accept()
        print(f"Connection from {addr}")

        try:
            data = client.recv(1024).decode().strip()
            if data:
                broadcast_magic_packet(data)
                client.send(b"OK\n")
        except Exception as e:
            print(f"Error: {e}")
            client.send(f"ERROR: {e}\n".encode())
        finally:
            client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WoL relay server")
    parser.add_argument("--port", type=int, default=9999, help="Listen port")
    args = parser.parse_args()

    run_relay_server(args.port)
```

Deploy this relay as a systemd service on each subnet:

```ini
# /etc/systemd/system/wol-relay.service
# WoL relay service for cross-subnet wake capability

[Unit]
Description=Wake-on-LAN Relay Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/wol-relay/wol_relay.py --port 9999
Restart=always
User=nobody
Group=nogroup

[Install]
WantedBy=multi-user.target
```

## Wake-on-LAN Over the Internet

Waking machines over the internet requires exposing the WoL functionality through your router. There are several approaches with varying security implications.

### Method 1: Port Forwarding Magic Packets

Configure your router to forward UDP port 9 (or another port) to the subnet broadcast address. This is router-specific but generally involves:

1. Access your router's admin interface
2. Navigate to port forwarding settings
3. Create a rule forwarding external UDP port 9 to internal 192.168.1.255:9

Then send magic packets from anywhere:

```bash
# Send magic packet to your public IP address
# Router forwards it to the internal broadcast address
wakeonlan -i YOUR_PUBLIC_IP -p 9 aa:bb:cc:dd:ee:ff
```

### Method 2: VPN-Based WoL

A more secure approach is to connect via VPN first, then send the magic packet as if you were on the local network:

```bash
# First, establish VPN connection
sudo openvpn --config /path/to/client.ovpn

# Once connected, send magic packet to local subnet
wakeonlan aa:bb:cc:dd:ee:ff
```

### Method 3: SSH Tunnel Through Always-On Device

If you have an always-on device (Raspberry Pi, NAS, etc.) on the network, SSH into it and send the magic packet from there:

```bash
# SSH into the always-on device and send magic packet
ssh user@raspberry-pi.local "wakeonlan aa:bb:cc:dd:ee:ff"
```

This can be combined into a single command:

```bash
# One-liner to wake a machine via SSH jump host
ssh -t user@always-on-device "sudo wakeonlan aa:bb:cc:dd:ee:ff"
```

## Creating a WoL Server and Web Interface

For convenient remote wake capability, you can build a simple web interface. Here is a Flask-based WoL server:

```python
#!/usr/bin/env python3
"""
wol_server.py - Wake-on-LAN Web Interface

A simple Flask web application that provides a web interface
for sending Wake-on-LAN magic packets. Includes a REST API
and a basic HTML interface.

Features:
- Web UI to select and wake registered machines
- REST API for automation and scripting
- Configuration file for machine inventory
- Basic authentication support

Usage: python3 wol_server.py
"""

from flask import Flask, render_template_string, request, jsonify
import socket
import json
import os

app = Flask(__name__)

# Machine inventory - in production, load from a config file
MACHINES = {
    "workstation": {
        "name": "Development Workstation",
        "mac": "aa:bb:cc:dd:ee:ff",
        "description": "Main development machine"
    },
    "server": {
        "name": "Home Server",
        "mac": "11:22:33:44:55:66",
        "description": "File and media server"
    },
    "gaming": {
        "name": "Gaming PC",
        "mac": "de:ad:be:ef:ca:fe",
        "description": "Gaming and streaming PC"
    }
}

# HTML template for the web interface
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wake-on-LAN Control Panel</title>
    <style>
        /* Clean, modern styling for the WoL interface */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
        .machine-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .machine-name {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
        }
        .machine-mac {
            color: #666;
            font-family: monospace;
            margin: 5px 0;
        }
        .machine-desc {
            color: #888;
            font-size: 0.9em;
        }
        .wake-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
            margin-top: 10px;
        }
        .wake-btn:hover {
            background: #0056b3;
        }
        .wake-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            display: none;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            display: block;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            display: block;
        }
    </style>
</head>
<body>
    <h1>Wake-on-LAN Control Panel</h1>

    {% for machine_id, machine in machines.items() %}
    <div class="machine-card">
        <div class="machine-name">{{ machine.name }}</div>
        <div class="machine-mac">MAC: {{ machine.mac }}</div>
        <div class="machine-desc">{{ machine.description }}</div>
        <button class="wake-btn" onclick="wakeMachine('{{ machine_id }}', this)">
            Wake Up
        </button>
        <div id="status-{{ machine_id }}" class="status"></div>
    </div>
    {% endfor %}

    <script>
        // Send wake request to the server API
        async function wakeMachine(machineId, button) {
            const statusEl = document.getElementById('status-' + machineId);
            button.disabled = true;
            button.textContent = 'Sending...';

            try {
                const response = await fetch('/api/wake/' + machineId, {
                    method: 'POST'
                });
                const data = await response.json();

                if (data.success) {
                    statusEl.className = 'status success';
                    statusEl.textContent = 'Magic packet sent successfully!';
                } else {
                    statusEl.className = 'status error';
                    statusEl.textContent = 'Error: ' + data.error;
                }
            } catch (error) {
                statusEl.className = 'status error';
                statusEl.textContent = 'Network error: ' + error.message;
            }

            button.disabled = false;
            button.textContent = 'Wake Up';

            // Hide status after 5 seconds
            setTimeout(() => {
                statusEl.className = 'status';
            }, 5000);
        }
    </script>
</body>
</html>
"""


def create_magic_packet(mac_address: str) -> bytes:
    """
    Create a Wake-on-LAN magic packet.

    Args:
        mac_address: Target MAC address (formats: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF)

    Returns:
        bytes: 102-byte magic packet
    """
    mac_clean = mac_address.replace(":", "").replace("-", "")
    if len(mac_clean) != 12:
        raise ValueError(f"Invalid MAC address format: {mac_address}")

    mac_bytes = bytes.fromhex(mac_clean)
    return b'\xff' * 6 + mac_bytes * 16


def send_magic_packet(mac_address: str, broadcast: str = "255.255.255.255", port: int = 9) -> bool:
    """
    Send a magic packet to wake a machine.

    Args:
        mac_address: Target MAC address
        broadcast: Broadcast address to send to
        port: UDP port (default 9)

    Returns:
        bool: True if packet was sent successfully
    """
    try:
        packet = create_magic_packet(mac_address)

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            sock.sendto(packet, (broadcast, port))

        return True
    except Exception as e:
        print(f"Error sending magic packet: {e}")
        return False


@app.route("/")
def index():
    """Render the main web interface."""
    return render_template_string(HTML_TEMPLATE, machines=MACHINES)


@app.route("/api/wake/<machine_id>", methods=["POST"])
def api_wake(machine_id: str):
    """
    API endpoint to wake a specific machine.

    Args:
        machine_id: The ID of the machine to wake

    Returns:
        JSON response with success status
    """
    if machine_id not in MACHINES:
        return jsonify({"success": False, "error": "Machine not found"}), 404

    machine = MACHINES[machine_id]
    success = send_magic_packet(machine["mac"])

    if success:
        return jsonify({
            "success": True,
            "message": f"Magic packet sent to {machine['name']}",
            "mac": machine["mac"]
        })
    else:
        return jsonify({
            "success": False,
            "error": "Failed to send magic packet"
        }), 500


@app.route("/api/machines", methods=["GET"])
def api_list_machines():
    """List all registered machines."""
    return jsonify(MACHINES)


@app.route("/api/wake", methods=["POST"])
def api_wake_custom():
    """
    Wake a machine by MAC address (not in inventory).

    Expects JSON body with 'mac' field.
    """
    data = request.get_json()
    if not data or "mac" not in data:
        return jsonify({"success": False, "error": "MAC address required"}), 400

    success = send_magic_packet(data["mac"])

    if success:
        return jsonify({"success": True, "message": "Magic packet sent"})
    else:
        return jsonify({"success": False, "error": "Failed to send packet"}), 500


if __name__ == "__main__":
    # Run the server on all interfaces, port 5000
    # In production, use a proper WSGI server like gunicorn
    print("Starting WoL Web Server...")
    print("Access the interface at http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
```

Deploy this as a systemd service for persistent operation:

```ini
# /etc/systemd/system/wol-web.service
# Web-based Wake-on-LAN control panel service

[Unit]
Description=Wake-on-LAN Web Interface
After=network.target

[Service]
Type=simple
# Run as a non-privileged user for security
User=www-data
Group=www-data
WorkingDirectory=/opt/wol-server
# Use gunicorn for production deployment
ExecStart=/usr/bin/gunicorn --bind 0.0.0.0:5000 --workers 2 wol_server:app
Restart=always
RestartSec=5

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

Install dependencies and start the service:

```bash
# Create directory and install dependencies
sudo mkdir -p /opt/wol-server
sudo cp wol_server.py /opt/wol-server/

# Install Python dependencies
sudo apt install -y python3-flask python3-gunicorn

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable wol-web.service
sudo systemctl start wol-web.service
```

## Security Considerations

Wake-on-LAN has security implications that should be addressed, especially when exposed to untrusted networks.

### Security Risks

1. **No authentication by default:** Anyone who can send packets to your network can wake your machines
2. **MAC address spoofing:** MAC addresses are easily discovered and cannot be kept secret
3. **Denial of service:** Repeated wake commands could prevent machines from staying off
4. **Internet exposure:** Forwarding WoL ports exposes your network to attacks

### Security Best Practices

Implement these measures to secure your WoL setup:

```bash
# 1. Use SecureOn password if your NIC supports it
# Check if your NIC supports the 's' flag
sudo ethtool enp0s3 | grep "Supports Wake-on"

# Enable SecureOn with a password (if supported)
sudo ethtool -s enp0s3 wol gs sopass 00:11:22:33:44:55
```

Use firewall rules to restrict WoL traffic. Only allow magic packets from trusted sources:

```bash
# Allow WoL packets only from specific trusted IPs
# This iptables rule restricts UDP port 9 to the management network
sudo iptables -A INPUT -p udp --dport 9 -s 192.168.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 9 -j DROP

# Save iptables rules to persist across reboots
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

For the web interface, implement authentication:

```python
# Add basic authentication to the Flask WoL server
from functools import wraps
from flask import request, Response


def check_auth(username, password):
    """Verify username and password against allowed credentials."""
    # In production, use hashed passwords and a proper user database
    return username == 'admin' and password == 'secure_password_here'


def authenticate():
    """Send a 401 response requesting authentication."""
    return Response(
        'Authentication required',
        401,
        {'WWW-Authenticate': 'Basic realm="WoL Control Panel"'}
    )


def requires_auth(f):
    """Decorator to require authentication for a route."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated


# Apply to routes
@app.route("/")
@requires_auth
def index():
    return render_template_string(HTML_TEMPLATE, machines=MACHINES)
```

Additional security recommendations:

- Use HTTPS for the web interface (nginx reverse proxy with Let's Encrypt)
- Implement rate limiting to prevent abuse
- Log all wake requests for auditing
- Consider using a VPN instead of exposing WoL directly to the internet
- Regularly review which machines have WoL enabled

## Troubleshooting

When Wake-on-LAN does not work as expected, use these diagnostic steps to identify the issue.

### Common Issues and Solutions

**Issue: WoL setting resets after reboot**

Verify your persistence method is working correctly:

```bash
# Check if systemd service is enabled and running
sudo systemctl status wol.service

# Verify the WoL setting after reboot
sudo ethtool enp0s3 | grep "Wake-on"

# Check for errors in the service logs
sudo journalctl -u wol.service
```

**Issue: Magic packet not reaching the target**

Use tcpdump to verify packets are arriving at the target network:

```bash
# Listen for magic packets on the target machine (before shutting down)
# Magic packets are broadcast UDP on port 9
sudo tcpdump -i enp0s3 'udp port 9' -X

# On the sending machine, capture outgoing WoL packets
sudo tcpdump -i enp0s3 'ether proto 0x0842 or udp port 9' -X
```

**Issue: NIC does not support WoL**

Check if your NIC hardware supports Wake-on-LAN:

```bash
# Detailed NIC information
sudo lshw -class network

# Check driver and capabilities
sudo ethtool -i enp0s3
sudo ethtool enp0s3
```

If the NIC shows `Supports Wake-on: d` (only disabled), the hardware may not support WoL, or you need updated drivers.

**Issue: Machine wakes but shuts down immediately**

This can be caused by ACPI settings. Check your BIOS for:

- Wake event settings (ensure "Resume by LAN" does not auto-shutdown)
- Power state after AC power loss settings
- S4/S5 wake settings

**Issue: WoL works from local network but not across subnets**

Verify broadcast forwarding is configured:

```bash
# Test by sending to the specific subnet broadcast address
wakeonlan -i 192.168.2.255 aa:bb:cc:dd:ee:ff

# Check router configuration for directed broadcast support
# This varies by router manufacturer

# Alternative: Use a WoL relay on the target subnet
```

**Issue: WoL works from shutdown but not from suspend/hibernate**

Different power states require different WoL configurations:

```bash
# Check current WoL triggers
cat /proc/acpi/wakeup

# Enable/disable specific wake sources
# (device names vary by system)
echo "EHC1" | sudo tee /proc/acpi/wakeup  # Toggle USB wake
echo "PCIE" | sudo tee /proc/acpi/wakeup  # Toggle PCIe wake
```

### Diagnostic Commands Summary

Here is a quick reference for WoL troubleshooting commands:

```bash
# Check WoL support and current status
sudo ethtool enp0s3 | grep -i wake

# View network interface details
ip link show enp0s3
ip addr show enp0s3

# Check systemd service status
sudo systemctl status wol.service
sudo journalctl -u wol.service -n 50

# Monitor for incoming magic packets
sudo tcpdump -i enp0s3 'udp port 9 or ether proto 0x0842' -c 10

# Test sending a magic packet locally
wakeonlan -i 127.0.0.1 aa:bb:cc:dd:ee:ff

# Check Netplan configuration
cat /etc/netplan/*.yaml
sudo netplan generate  # Validate syntax

# View kernel messages related to network
dmesg | grep -i eth
dmesg | grep -i wake
```

---

Wake-on-LAN is a powerful capability for remote system management, but it requires proper configuration at multiple levels: BIOS/UEFI, operating system, and network infrastructure. By following this guide, you can reliably wake your Ubuntu machines remotely while maintaining appropriate security measures.

Once your WoL infrastructure is in place, consider integrating it with [OneUptime](https://oneuptime.com) for comprehensive monitoring. OneUptime can monitor the availability of your servers, alert you when machines go offline unexpectedly, and even trigger automated remediation workflows that include WoL commands to restart unresponsive systems. With OneUptime's open-source observability platform, you gain visibility into your entire infrastructure, ensuring that your remote wake capabilities are working when you need them most.
