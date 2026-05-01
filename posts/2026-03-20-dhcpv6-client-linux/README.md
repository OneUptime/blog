# How to Configure a DHCPv6 Client on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Linux, Networking, systemd-networkd, dhclient, Wide-dhcpv6

Description: Learn how to configure a DHCPv6 client on Linux using dhclient, wide-dhcpv6, and systemd-networkd to obtain IPv6 addresses and configuration from a DHCPv6 server.

---

DHCPv6 (Dynamic Host Configuration Protocol for IPv6) allows Linux clients to automatically obtain IPv6 addresses and network configuration from a DHCPv6 server. Unlike IPv4 DHCP, DHCPv6 works alongside SLAAC (Stateless Address Autoconfiguration) and can operate in stateful or stateless mode.

---

## Prerequisites

- Linux host with IPv6-enabled network interface
- Access to a DHCPv6 server on the network
- Root or sudo privileges

---

## Using dhclient (ISC DHCP Client)

The `dhclient` tool is still available on many Linux distributions.

### Install dhclient

```bash
# Debian/Ubuntu

sudo apt-get install isc-dhcp-client

# RHEL/CentOS/Fedora
sudo dnf install dhcp-client
```

### Request an IPv6 Address

```bash
# Request IPv6 address on eth0
sudo dhclient -6 eth0

# Request with verbose output
sudo dhclient -6 -v eth0

# Release the DHCPv6 lease
sudo dhclient -6 -r eth0
```

### dhclient Configuration File

```text
# /etc/dhcp/dhclient.conf
interface "eth0" {
    also request dhcp6.sntp-servers;
    require dhcp6.name-servers;
}
```

---

## Using wide-dhcpv6-client

The `wide-dhcpv6` client is a legacy option available on some Linux distributions with fine-grained control.

### Install wide-dhcpv6-client

```bash
sudo apt-get install wide-dhcpv6-client
```

### Configuration File

```text
# /etc/wide-dhcpv6/dhcp6c.conf
interface eth0 {
    send ia-na 0;
    request domain-name-servers;
    request domain-name;
    script "/etc/wide-dhcpv6/dhcp6c-script";
};

id-assoc na 0 {
};
```

### Start the Client

```bash
# Start dhcp6c on eth0
sudo dhcp6c eth0

# Check the client PID file
cat /var/run/dhcp6c.pid

# Run in foreground with debug output
sudo dhcp6c -f -D eth0
```

---

## Using systemd-networkd

Modern Linux systems can use `systemd-networkd` as a built-in DHCPv6 client.

### Network Configuration File

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=ipv6

[DHCPv6]
UseAddress=yes
UseDNS=yes
UseDomains=yes
UseNTP=yes
```

### Apply Configuration

```bash
sudo systemctl enable systemd-networkd
sudo systemctl restart systemd-networkd

# Check acquired address
networkctl status eth0
```

---

## Using NetworkManager (Desktop Systems)

On desktop Linux, NetworkManager can manage IPv6 autoconfiguration and DHCPv6 automatically.

```bash
# Check current IPv6 method
nmcli connection show "<connection_name>" | grep ipv6.method

# Set to auto (uses Router Advertisements and DHCPv6 when advertised)
nmcli connection modify "<connection_name>" ipv6.method auto

# Set to dhcp (DHCPv6 only; no default gateway is learned)
nmcli connection modify "<connection_name>" ipv6.method dhcp

# Apply changes
nmcli connection up "<connection_name>"
```

---

## Verifying DHCPv6 Lease

```bash
# Check assigned IPv6 addresses
ip -6 addr show eth0

# Check IPv6 routing table
ip -6 route show

# Check DNS configuration
cat /etc/resolv.conf

# View dhcp6c client state
cat /var/lib/dhcpv6/dhcp6c_duid

# View dhclient lease files
ls /var/lib/dhcp/
```

---

## Troubleshooting

```bash
# Capture DHCPv6 traffic (uses UDP ports 546 and 547)
sudo tcpdump -i eth0 -n udp port 546 or udp port 547

# Check system logs for DHCPv6 events
journalctl -u systemd-networkd | grep -i dhcp
journalctl -t dhcp6c

# Verify IPv6 is enabled on interface
sysctl net.ipv6.conf.eth0.disable_ipv6
```

---

## Best Practices

1. **Use systemd-networkd** on server systems for simplicity and integration
2. **Enable SLAAC and DHCPv6 together** when the network advertises both; `DHCP=yes` in `systemd-networkd` enables DHCPv4 and DHCPv6, not SLAAC by itself
3. **Request DNS and NTP options** in your DHCPv6 client configuration
4. **Monitor lease renewals** to detect connectivity issues early
5. **Use consistent DUID** to get stable address assignments from the server

---

## Conclusion

Linux offers multiple DHCPv6 client options including dhclient, `dhcp6c` from wide-dhcpv6, and systemd-networkd. For modern systems, systemd-networkd provides seamless integration, while wide-dhcpv6 remains a legacy option on some distributions. Always verify your acquired address, route, and DNS settings after enabling the client.

---

*Monitor your IPv6 network connectivity with [OneUptime](https://oneuptime.com) - comprehensive uptime monitoring with full IPv6 support.*
