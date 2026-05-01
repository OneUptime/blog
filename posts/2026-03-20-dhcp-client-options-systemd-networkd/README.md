# How to Configure DHCP Client Options with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, systemd-networkd, Linux, DHCP Client, IPv4, .network, Client Options

Description: Learn how to configure DHCP client behavior in systemd-networkd, including requesting specific options, setting client IDs, controlling route acceptance, and customizing lease behavior.

---

systemd-networkd includes built-in DHCPv4 and DHCPv6 clients. DHCPv4 client behavior is controlled through the `[DHCPv4]` section in `.network` files.

## Basic DHCP Configuration

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
DHCP=yes           # Enable DHCPv4 and DHCPv6 client support
# Or:
# DHCP=ipv4        # IPv4 only
# DHCP=ipv6        # IPv6 only
# DHCP=no          # Disable DHCP
```

## Customizing DHCP Client Behavior

```ini
[Match]
Name=eth0

[Network]
DHCP=yes

[DHCPv4]
# Client identifier: mac or duid (duid is the default)
ClientIdentifier=mac

# Hostname to send to DHCP server
Hostname=myserver

# Request specific DHCP options (option numbers)
RequestOptions=28 42 121    # Broadcast, NTP, Classless Static Route

# Do not accept DNS from DHCP (use static DNS instead)
UseDNS=no

# Do not accept routes from DHCP
UseRoutes=no

# Do not accept NTP servers from DHCP
UseNTP=no

# Do not set hostname from DHCP
UseHostname=no

# Do not accept default gateway from DHCP
UseGateway=no
```

## Combining DHCP with Static Settings

```ini
[Match]
Name=eth0

[Network]
DHCP=yes
Address=10.0.0.100/24   # Always assign this static IP in addition to DHCP
DNS=8.8.8.8             # Use static DNS

[DHCPv4]
UseDNS=no               # Ignore DHCP DNS
```

## DHCP with Static Routes Override

```ini
[Network]
DHCP=yes

[DHCPv4]
UseRoutes=no    # Ignore routes from DHCP

[Route]
Destination=0.0.0.0/0
Gateway=192.168.1.254   # Use this static default route instead
```

## DHCP Client ID (DUID)

```ini
[DHCPv4]
# Use a DUID-based client identifier for DHCPv4
ClientIdentifier=duid

# Or specify DHCP option 60 vendor class identifier
VendorClassIdentifier=MyApp/1.0
```

## DHCP Anonymization

```ini
[DHCPv4]
# Use the DHCP anonymity profile defined by RFC 7844
Anonymize=yes
```

## Rapid Commit (Option 80)

```ini
[DHCPv4]
# Enable DHCPv4 rapid commit (2-way instead of 4-way handshake)
RapidCommit=yes
```

## Debugging DHCP

```bash
# Watch DHCP events
journalctl -u systemd-networkd -f | grep -i dhcp

# Check acquired lease
networkctl status eth0
# Shows: DHCP4 Client...
#        Lease Server Address: 192.168.1.1

# Renew DHCP lease
networkctl renew eth0
```

## Key Takeaways

- The `[DHCPv4]` section in `.network` files controls DHCPv4 client behavior in systemd-networkd.
- Use `UseDNS=no`, `UseRoutes=no`, `UseGateway=no` to selectively ignore DHCP-provided values.
- `Hostname=` sends a specific hostname to the DHCP server.
- Use `networkctl renew eth0` to manually trigger a DHCP lease renewal without restarting networkd.
