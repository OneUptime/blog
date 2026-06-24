# How to Understand DHCP Option 150 for VoIP Phones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, VoIP, Option 150, TFTP, Cisco, Sysadmin

Description: DHCP option 150 is a Cisco-proprietary option that delivers the TFTP server address to Cisco IP phones, enabling them to download their firmware and configuration automatically during boot.

## What Is DHCP Option 150?

Option 150 is the TFTP Server Address option for DHCPv4. It originated in Cisco VoIP deployments and is documented in RFC 5859. It provides one or more IPv4 addresses of a TFTP/configuration server to Cisco IP phones (and other VoIP equipment). Unlike standard option 66 (which carries a server name as a string), option 150 carries IPv4 addresses directly.

## ISC dhcpd Configuration

```text
# /etc/dhcp/dhcpd.conf

# Define option 150 as one or more TFTP server IP addresses

option tftp-server-address code 150 = array of ip-address;

subnet 10.0.30.0 netmask 255.255.255.0 {
    range 10.0.30.10 10.0.30.250;
    option routers 10.0.30.1;
    option domain-name-servers 10.0.0.53;

    # Cisco CUCM/TFTP server IP
    option tftp-server-address 10.0.0.100;

    # Also set standard option 66 for non-Cisco phones
    option tftp-server-name "10.0.0.100";

    default-lease-time 3600;    # 1-hour leases for phones
}
```

## Serving Option 150 to Specific Devices Only

Use vendor class matching to send option 150 only to Cisco phones:

```text
# /etc/dhcp/dhcpd.conf
option tftp-server-address code 150 = array of ip-address;

class "cisco-phone" {
    match if substring(option vendor-class-identifier, 0, 5) = "Cisco";
    option tftp-server-address 10.0.0.100;
    option tftp-server-name "10.0.0.100";
}

subnet 10.0.30.0 netmask 255.255.255.0 {
    range 10.0.30.10 10.0.30.250;
    option routers 10.0.30.1;
}
```

## dnsmasq Configuration

```text
# /etc/dnsmasq.conf

# Requests received on eth0.30 automatically match the tag eth0.30
# Format: dhcp-option=tag:<tag>,option:<name>,<value>
dhcp-option=tag:eth0.30,option:tftp-server-address,10.0.0.100

# Also set standard option 66 (TFTP server name); quote it to send a string
dhcp-option=tag:eth0.30,option:tftp-server,"10.0.0.100"

# Option 67: boot filename (optional; some clients use it)
# dhcp-option=tag:eth0.30,option:bootfile-name,SEPdefault.cnf
```

## Option 150 vs Option 66

| Option | Number | Format | Standard |
|--------|--------|--------|----------|
| TFTP Server Name | 66 | String (hostname/IP) | RFC 2132 |
| TFTP Server Address | 150 | One or more IPv4 addresses | RFC 5859 |
| Next Server | `siaddr` in header | IP address | BOOTP/DHCP header |

When both options are present, RFC 5859 says clients SHOULD prefer option 150 over option 66; handling of `siaddr` and other fallbacks is device-specific.

## Verifying Option 150 Delivery

```bash
# Capture DHCP traffic and inspect option 150/66 in verbose output
sudo tcpdump -i eth0 -vvv -n -s0 -l 'port 67 or port 68'

# tshark: show option 150
tshark -i eth0 -Y "dhcp.option.type == 150" \
    -T fields -e dhcp.option.tftp_server_address
```

## Key Takeaways

- Option 150 carries one or more TFTP server IPv4 addresses directly (not a string like option 66).
- When both options are present, RFC 5859 says clients should prefer option 150 over option 66.
- Define option 150 in ISC dhcpd as `option tftp-server-address code 150 = array of ip-address;`.
- Deploy both option 150 and option 66 for maximum compatibility across phone vendors.
