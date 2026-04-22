# How to Configure SoftEther VPN with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SoftEther, IPv6, VPN, Multi-Protocol, Network, Japan

Description: A guide to configuring SoftEther VPN for IPv6 connectivity, including IPv6 listener setup, tunnel configuration, and dual-stack client connectivity.

SoftEther VPN is a high-performance, multi-protocol VPN software developed at the University of Tsukuba. It supports L2TP/IPsec, SSTP, OpenVPN protocol, and its own proprietary protocol. IPv6 support is strongest in SoftEther's Layer 2 VPN modes; some compatibility protocols and SecureNAT remain IPv4-oriented. This guide covers the key IPv6 configuration aspects.

## Installing SoftEther VPN Server

```bash
# Download SoftEther VPN Server (Linux x64)

wget https://www.softether-download.com/files/softether/\
v4.43-9799-beta-2023.08.31-tree/Linux/SoftEther_VPN_Server/\
64bit_-_Intel_x64_or_AMD64/softether-vpnserver-v4.43-9799-beta-2023.08.31-linux-x64-64bit.tar.gz

tar xzf softether-vpnserver*.tar.gz
cd vpnserver
make

sudo cp -r ../vpnserver /usr/local/
sudo /usr/local/vpnserver/vpnserver start
```

## Configuring IPv6 Listeners

SoftEther can listen on IPv6 addresses:

```bash
# Connect to the management interface
/usr/local/vpnserver/vpncmd localhost /SERVER

# In vpncmd, add an IPv6 listener:
# ListenerCreate 443
# If IPv6 listeners are enabled, the TCP listener also accepts IPv6 connections

# Verify listener
ListenerList
```

## SoftEther with IPv6 via vpncmd Commands

```sql
# Connect to server
> ServerPasswordSet

# Create virtual hub
> HubCreate VPN /PASSWORD:hub-password

# Select hub
> Hub VPN

# Enable SecureNAT (for IPv4 NAT and DHCP; it does not assign IPv6 addresses)
> SecureNatEnable

# Configure SecureNAT for IPv4
# SecureNAT provides DHCP for IPv4; IPv6 uses SLAAC within the VHub
```

## Virtual Hub IPv6 Configuration

SoftEther's Virtual Hub acts as a virtual Layer 2 switch. IPv6 works transparently:

```bash
# In vpncmd, connected to a hub:

# Set the SecureNAT virtual host's IPv4 address
SecureNatHostSet /IP:192.168.30.1 /MASK:255.255.255.0

# IPv6 traffic flows through the L2 VHub transparently
# A real IPv6 router on the network provides RAs

# SoftEther's built-in Virtual Layer 3 Switch routing table is IPv4-only;
# use an external IPv6 router or OS routing/radvd on the bridged segment.
```

## Client Configuration (L2TP/IPsec over IPv6)

SoftEther accepts L2TP/IPsec connections from clients using IPv6 transport:

```bash
# Check IPsec/L2TP UDP listeners on IPv6
ss -6 -ulnp | grep vpnserver

# Client connects to server using IPv6 address
# In Windows VPN settings:
# Server: 2001:db8::10
# Protocol: L2TP/IPsec with PSK

# In Linux (using xl2tpd):
# Endpoint: 2001:db8::10
```

## SoftEther OpenVPN Compatibility Mode with IPv6

SoftEther can emulate an OpenVPN server. Configure IPv6 in the emulated OpenVPN:

```bash
# In vpncmd:
OpenVpnMakeConfig openvpn-config.zip

# The generated client config can be modified to use IPv6 endpoints
# Edit client.ovpn:
# remote 2001:db8::10 1194 udp6
```

## Configuration File (vpn_server.config)

```text
# In vpn_server.config (advanced, direct file editing)
# Listener entries store TCP ports. IPv6 listener mirroring is controlled
# by the DisableIPv6Listener setting.

bool DisableIPv6Listener false

declare ListenerList
{
  declare Listener0
  {
    bool DisableDos false
    bool Enabled true
    uint Port 443
  }
}
```

## Monitoring IPv6 Connections

```bash
# In vpncmd, check connected sessions
SessionList

# Check who's connected (shows IPv6 source addresses)
SessionGet VPN_session1

# Server log shows IPv6 client connections
tail -f /usr/local/vpnserver/server_log/vpn_*.log | grep "IPv6\|2001\|fd00"
```

## SoftEther IPv6 Limitations and Notes

- SecureNAT handles IPv4 NAT and DHCP; IPv6 relies on SLAAC or DHCPv6 from an actual router/server
- IPv6 works best when there is a real IPv6 router on the virtual hub
- The proprietary SoftEther protocol supports IPv6 transport natively
- SoftEther's built-in Virtual Layer 3 Switch routing table is IPv4-only
- For full IPv6 support in VPN tunnels, configure the virtual hub with an IPv6 router or use SoftEther alongside radvd

SoftEther's Layer 2 virtual hub architecture means IPv6 traffic flows transparently through the VPN, making it compatible with any IPv6 routing mechanism deployed on the virtual network.
