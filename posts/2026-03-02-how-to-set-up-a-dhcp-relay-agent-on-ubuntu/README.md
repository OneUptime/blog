# How to Set Up a DHCP Relay Agent on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DHCP, Networking, Relay, Sysadmin

Description: Configure a DHCP relay agent on Ubuntu to forward DHCP requests from clients on remote subnets to a central DHCP server, enabling centralized IP management across VLANs.

---

DHCP uses broadcast packets for its initial discovery phase. Broadcasts don't cross router boundaries, which means each subnet would normally need its own DHCP server. A DHCP relay agent (also called a BOOTP relay) solves this problem by intercepting DHCP broadcasts on one subnet and forwarding them as unicast packets to a central DHCP server on another subnet.

This lets you run a single centralized DHCP server that serves multiple subnets, VLANs, or remote sites.

## How DHCP Relay Works

The process works like this:

1. A client on VLAN 20 (192.168.20.0/24) broadcasts a DHCPDISCOVER packet
2. The relay agent (a router or a server with the relay agent running) receives the broadcast
3. The relay agent adds the `giaddr` (gateway IP address) field to the packet, identifying which subnet the request came from
4. The relay agent forwards the packet as unicast to the DHCP server (on 192.168.1.0/24)
5. The DHCP server sees the `giaddr`, selects the appropriate subnet pool, and replies to the relay agent
6. The relay agent forwards the reply back to the client

The DHCP server must have a subnet configured for each subnet the relay agent serves, and the relay agent's interface IP must match the subnet definition on the server.

## Prerequisites

For this setup:
- DHCP server: 192.168.1.10 (already configured)
- Relay agent: Ubuntu server with two network interfaces
  - eth0: 192.168.1.50 (connected to the DHCP server's network)
  - eth1: 192.168.20.1 (connected to the remote client subnet)
- Client subnet: 192.168.20.0/24

The relay agent machine must have IP forwarding enabled to route traffic between subnets.

## Enabling IP Forwarding on the Relay Agent

```bash
# Enable IP forwarding immediately
sudo sysctl -w net.ipv4.ip_forward=1

# Make it permanent across reboots
sudo nano /etc/sysctl.conf
```

Uncomment or add:

```
net.ipv4.ip_forward=1
```

```bash
# Apply the sysctl change
sudo sysctl -p
```

## Method 1: Using isc-dhcp-relay

The ISC DHCP relay agent is the classic approach, available in Ubuntu repositories:

```bash
sudo apt update
sudo apt install -y isc-dhcp-relay
```

During installation, you'll be prompted to configure:
1. The DHCP servers to forward to
2. Which interfaces to listen on
3. Additional options

If you need to reconfigure:

```bash
sudo dpkg-reconfigure isc-dhcp-relay
```

### Manual Configuration

Edit the default configuration file:

```bash
sudo nano /etc/default/isc-dhcp-relay
```

```bash
# The IP address of the DHCP server to forward requests to
SERVERS="192.168.1.10"

# Interfaces on which the relay should listen for DHCP requests
# List the interfaces facing client subnets
INTERFACES="eth1"

# Additional options for dhcrelay
# -a: append agent information (option 82) - useful for tracking which circuit the request came from
# -U: replace the giaddr with the relay agent's interface address instead of the default behavior
OPTIONS="-a"
```

Start and enable the relay service:

```bash
sudo systemctl start isc-dhcp-relay
sudo systemctl enable isc-dhcp-relay
sudo systemctl status isc-dhcp-relay
```

### Configuring the DHCP Server for the Relay

On the DHCP server, add a subnet declaration for the remote subnet. The key requirement is that the subnet matches what the relay agent will report via `giaddr`:

```bash
# On the DHCP server (192.168.1.10)
sudo nano /etc/dhcp/dhcpd.conf
```

```
# Local subnet (where the DHCP server lives)
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
    option domain-name-servers 192.168.1.10;
}

# Remote subnet served via the relay agent
# The relay agent's interface on this subnet is 192.168.20.1
subnet 192.168.20.0 netmask 255.255.255.0 {
    range 192.168.20.100 192.168.20.200;
    option routers 192.168.20.1;
    option domain-name-servers 192.168.1.10;
    option domain-name "vlan20.example.com";
}
```

Restart the DHCP server:

```bash
sudo systemctl restart isc-dhcp-server
```

## Method 2: Using Kea DHCP Relay (dhcp-relay)

If you're using ISC Kea as your DHCP server, Kea also provides a relay agent:

```bash
sudo apt install -y kea-dhcp-ddns-server
# The relay agent is part of isc-kea packages
sudo apt install -y isc-kea-dhcp4-server
```

The relay agent functionality is handled by the `kea-dhcp4` DHCP server when acting in relay mode. But for the relay agent itself, the standard `isc-dhcp-relay` works fine even with a Kea DHCP server - the relay protocol (BOOTP/DHCP relay) is standardized.

## Method 3: Using dhcrelay Directly

For more control over the relay agent, run `dhcrelay` directly rather than through the systemd service:

```bash
# Run dhcrelay manually to test
sudo dhcrelay \
    -d \              # Don't daemonize, print debug to stdout
    -a \              # Append relay agent information (option 82)
    -i eth1 \         # Interface to listen on (client side)
    192.168.1.10      # DHCP server IP

# Once confirmed working, create a systemd service
sudo nano /etc/systemd/system/dhcrelay.service
```

```ini
[Unit]
Description=DHCP Relay Agent
After=network.target
Documentation=man:dhcrelay(8)

[Service]
Type=simple
ExecStart=/usr/sbin/dhcrelay \
    -a \
    -i eth1 \
    192.168.1.10
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start dhcrelay
sudo systemctl enable dhcrelay
```

## Multi-Server and Multi-Subnet Relay

For more complex topologies, the relay agent can forward to multiple DHCP servers or listen on multiple interfaces:

```bash
sudo nano /etc/default/isc-dhcp-relay
```

```bash
# Forward to two DHCP servers (for redundancy)
SERVERS="192.168.1.10 192.168.1.11"

# Listen on multiple client-facing interfaces (multiple VLANs)
INTERFACES="eth1 eth2 eth3"

OPTIONS="-a"
```

Each interface's subnet must be configured on the DHCP server.

## Configuring DHCP Option 82 (Relay Agent Information)

Option 82 adds information about the circuit (which port/VLAN the client connected from) to the DHCP packet. This is useful for tracking where DHCP requests originate and for assigning addresses based on the circuit:

```bash
# Enable option 82 appending
# The -a flag adds the relay agent information option
# The default agent-id uses the interface name

# For custom option 82 values:
sudo dhcrelay \
    -a \
    -c 10 \         # Maximum hop count
    -i eth1 \
    192.168.1.10
```

On the DHCP server, you can use option 82 to assign different pools based on which relay circuit the request came from.

## Testing the Relay

From a client on the VLAN 20 subnet:

```bash
# Release and renew DHCP on the client
sudo dhclient -r eth0
sudo dhclient eth0

# Verify the assigned IP is from the correct range
ip addr show eth0
```

On the relay agent, watch for relay activity:

```bash
# Check relay agent logs
sudo journalctl -u isc-dhcp-relay -f

# Use tcpdump to watch relay traffic
# On eth1 (client side): should see DHCP broadcasts
sudo tcpdump -n -i eth1 port 67 or port 68

# On eth0 (server side): should see unicast DHCP packets to 192.168.1.10
sudo tcpdump -n -i eth0 port 67 host 192.168.1.10
```

## Firewall Configuration

The relay agent forwards DHCP packets. Ensure the firewall allows this traffic:

```bash
# On the relay agent - allow DHCP traffic on client interface
sudo ufw allow in on eth1 port 67 proto udp

# Allow outbound DHCP relay packets to the server
sudo ufw allow out port 67 proto udp

# On the DHCP server - allow packets from the relay agent
sudo ufw allow from 192.168.1.50 to any port 67 proto udp
```

## Troubleshooting

If clients aren't getting addresses:

```bash
# Check if the relay agent is receiving requests
sudo tcpdump -n -i eth1 port 67

# Check if the relay is forwarding to the server
sudo tcpdump -n -i eth0 'udp port 67 and dst 192.168.1.10'

# Check the DHCP server logs for incoming relayed requests
sudo tail -f /var/log/syslog | grep dhcpd

# Verify IP forwarding is enabled
sysctl net.ipv4.ip_forward
```

A common issue is the DHCP server not having a subnet declaration matching the relay agent's `giaddr`. The server silently drops requests for unknown subnets, so if you see the relay forwarding packets but no response, check that the subnet configuration on the server matches the relay agent's interface IP.

DHCP relay agents are a fundamental part of network infrastructure in any environment with multiple VLANs or subnets. Getting this right eliminates the need to run separate DHCP servers per VLAN and centralizes lease management.
