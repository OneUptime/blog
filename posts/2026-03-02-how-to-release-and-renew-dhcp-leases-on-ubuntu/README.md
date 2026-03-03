# How to Release and Renew DHCP Leases on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DHCP, Networking, ip command, dhclient

Description: How to release and renew DHCP leases on Ubuntu using dhclient, networkctl, and Netplan for both server and desktop environments.

---

Releasing and renewing a DHCP lease forces your system to return its current IP address to the DHCP server and request a new one. You might need to do this after changing network configurations, troubleshooting IP conflicts, or when moving a machine to a different network segment.

The right command depends on whether your system uses `dhclient`, `systemd-networkd`, or NetworkManager.

## Checking Your DHCP Client

Different Ubuntu configurations use different DHCP clients:

```bash
# Check if dhclient is managing any interfaces
ps aux | grep dhclient

# Check if systemd-networkd is managing DHCP
networkctl status | grep "DHCP"

# Check if NetworkManager is present
systemctl status NetworkManager

# See current DHCP leases in networkd
ls /run/systemd/netif/leases/
```

Most Ubuntu server installs (18.04+) with Netplan use `systemd-networkd` for DHCP. Desktop installs typically use NetworkManager. Some minimal installs or VMs may still use `dhclient` directly.

## Releasing and Renewing with systemd-networkd (Netplan)

If your system uses Netplan with the `networkd` renderer, use `networkctl`:

```bash
# Check which interfaces have DHCP configured
networkctl status
# Look for interfaces with SETUP: configured and DHCP4/6 showing

# Force a DHCP renew on a specific interface
sudo networkctl renew eth0

# Renew all DHCP-configured interfaces
sudo networkctl renew
```

`networkctl renew` sends a DHCPv4 DHCPREQUEST and DHCPv6 RENEW to try to extend the current lease. If the server denies the renewal, it starts a new DORA exchange (Discover, Offer, Request, Acknowledge).

To release the lease and bring the interface down temporarily:

```bash
# Reconfigure the interface (releases and renews)
sudo networkctl reconfigure eth0

# Or force a clean restart by bringing the interface down and up
sudo networkctl down eth0
sudo networkctl up eth0
```

Check the current DHCP lease:

```bash
# View DHCP lease information for interface with index 2 (usually eth0)
cat /run/systemd/netif/leases/2
```

The lease file shows the address, server, lease time, and DNS information.

## Releasing and Renewing with dhclient

If `dhclient` is being used directly:

```bash
# Release the current DHCP lease (sends DHCPRELEASE to server)
sudo dhclient -r eth0

# Obtain a new lease (sends DHCPDISCOVER)
sudo dhclient eth0

# Release and renew in a single command
sudo dhclient -r eth0 && sudo dhclient eth0

# For IPv6
sudo dhclient -6 -r eth0
sudo dhclient -6 eth0
```

The `-r` flag sends a DHCPRELEASE message to the server, which informs it the address is being returned. Without `-r`, you just request a new address, and the server may have to wait for the old lease to expire.

View the dhclient lease cache:

```bash
cat /var/lib/dhcp/dhclient.leases
```

## Releasing and Renewing with NetworkManager

For desktop Ubuntu or servers using NetworkManager:

```bash
# List all connections
nmcli connection show

# Renew DHCP for a specific connection
nmcli device reapply eth0

# Or using the connection name
nmcli connection up "Wired connection 1"

# Restart the entire connection (releases and renews)
nmcli device disconnect eth0
nmcli device connect eth0
```

You can also use the GUI: click the network indicator, then toggle the connection off and on.

For more granular control:

```bash
# Release DHCP (equivalent to dhclient -r)
nmcli connection down "Wired connection 1"

# Re-acquire (equivalent to dhclient)
nmcli connection up "Wired connection 1"
```

## Viewing Current DHCP Lease Information

### With systemd-networkd

```bash
# List all DHCP leases
ls /run/systemd/netif/leases/

# Read a specific lease (replace 2 with your interface index)
sudo cat /run/systemd/netif/leases/2
```

Lease file contents:

```text
ADDRESS=192.168.1.105
NETMASK=255.255.255.0
ROUTER=192.168.1.1
SERVER_ADDRESS=192.168.1.1
NEXT_SERVER=192.168.1.1
EXPIRY=1740998400
T1=1740955200
T2=1740976800
DNS=8.8.8.8 8.8.4.4
DOMAINNAME=example.com
```

### With dhclient

```bash
# View all lease history (useful for debugging)
cat /var/lib/dhcp/dhclient.leases
```

### With ip command

```bash
# Show current address and its scope (dynamic = DHCP assigned)
ip addr show eth0

# The "dynamic" keyword in the output indicates a DHCP-assigned address
# Example:
# inet 192.168.1.105/24 brd 192.168.1.255 scope global dynamic eth0
#    valid_lft 82354sec preferred_lft 82354sec
```

## DHCP Renewal Timing

Understanding DHCP lease timing helps predict when renewals happen automatically:

- **T1 (50% of lease time)** - client first tries to renew directly with the server that issued the lease
- **T2 (87.5% of lease time)** - client broadcasts a renewal to any available server
- **Expiry** - if not renewed by expiry, the client must start a new DORA exchange and will get a new (possibly different) IP

To check remaining lease time:

```bash
# With systemd-networkd, check the EXPIRY field
sudo cat /run/systemd/netif/leases/2 | grep EXPIRY

# Convert epoch to human-readable
date -d @$(sudo cat /run/systemd/netif/leases/2 | grep EXPIRY | cut -d= -f2)
```

## Scripting DHCP Renewal

For automation or deployment scripts:

```bash
#!/bin/bash
# Renew DHCP lease and verify connectivity

INTERFACE="eth0"

echo "Renewing DHCP lease on $INTERFACE..."

if systemctl is-active --quiet systemd-networkd; then
    sudo networkctl renew "$INTERFACE"
elif systemctl is-active --quiet NetworkManager; then
    sudo nmcli device reapply "$INTERFACE"
else
    # Fall back to dhclient
    sudo dhclient -r "$INTERFACE"
    sudo dhclient "$INTERFACE"
fi

# Wait for address assignment
sleep 3

# Verify the new IP
NEW_IP=$(ip -4 addr show "$INTERFACE" | grep -oP '(?<=inet )\d+\.\d+\.\d+\.\d+')
echo "New IP address: $NEW_IP"

# Test connectivity
if ping -c 2 -W 3 8.8.8.8 > /dev/null 2>&1; then
    echo "Network connectivity confirmed"
else
    echo "WARNING: No connectivity after DHCP renewal"
    exit 1
fi
```

## Troubleshooting DHCP Issues

### No DHCP Response

```bash
# Check if the DHCP Discover is being sent
sudo tcpdump -i eth0 -n port 67 or port 68

# Manually trigger a DHCP discover (verbose output)
sudo dhclient -v eth0
```

### IP Conflict After Renewal

If the renewed address conflicts with another host:

```bash
# Check for IP conflicts using arping
sudo arping -I eth0 -c 4 192.168.1.105

# If conflict detected, force a new address by releasing and requesting
sudo networkctl reconfigure eth0
```

### DHCP Lease Not Refreshing

Check for errors in the network service logs:

```bash
# systemd-networkd logs
sudo journalctl -u systemd-networkd --since "10 minutes ago" | grep -i dhcp

# Look for lease renewal attempts
sudo journalctl -u systemd-networkd | grep "DHCP4"
```

DHCP management is usually automatic and transparent, but knowing how to manually intervene when things go wrong saves significant troubleshooting time.
