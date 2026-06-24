# DHCPv6 Options Reference and Configuration Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Networking, Options, ISC DHCP, Kea, Configuration

Description: A comprehensive reference for DHCPv6 options including DNS servers, domain search, NTP, SNTP, SIP, and custom vendor options - with configuration examples for ISC DHCP and Kea.

---

DHCPv6 options carry configuration data from server to client beyond just the IP address. Unlike DHCPv4 which uses an 8-bit option code space (0-255), DHCPv6 uses a 16-bit option code space (0-65535), allowing a much richer set of options. This guide covers the most commonly used options and how to configure them.

---

## Common DHCPv6 Options

| Option Code | Name | Description |
|-------------|------|-------------|
| 1 | CLIENTID | Client DUID |
| 2 | SERVERID | Server DUID |
| 3 | IA_NA | Identity Association for Non-temporary Addresses |
| 4 | IA_TA | Obsolete identity association for temporary addresses |
| 5 | IAADDR | IPv6 address within an IA |
| 6 | ORO | Options Request Option - list of requested options |
| 7 | PREFERENCE | Server preference value (0–255) |
| 11 | AUTH | Authentication |
| 14 | RAPID_COMMIT | Enable rapid two-message exchange |
| 21 | sip-server-domain-name | SIP server domain names |
| 22 | sip-server-address | SIP server addresses |
| 23 | dns-servers (DNS_SERVERS) | IPv6 DNS recursive name servers |
| 24 | domain-search (DOMAIN_LIST) | DNS domain search list |
| 25 | IA_PD | Identity Association for Prefix Delegation |
| 26 | IAPREFIX | Prefix within an IA_PD |
| 31 | sntp-servers | Legacy SNTP server addresses (deprecated by RFC 5908) |
| 32 | INFORMATION_REFRESH_TIME | How often to refresh stateless DHCPv6 info |
| 56 | NTP_SERVER | NTP server option (carries NTP server suboptions) |

---

## Configuring Options in ISC DHCP (dhcpd)

### Global and Subnet Options

```text
# /etc/dhcp/dhcpd6.conf

# Global defaults
default-lease-time 86400;
max-lease-time 172800;

# DNS name servers (option 23)
option dhcp6.name-servers 2001:db8::53, 2001:4860:4860::8888;

# DNS domain search list (option 24)
option dhcp6.domain-search "corp.example.com", "internal.example.com";

# SNTP servers (option 31; legacy, RFC 5908 prefers option 56)
option dhcp6.sntp-servers 2001:db8::123;

# Information refresh time (option 32) - for stateless clients
option dhcp6.info-refresh-time 21600;

subnet6 2001:db8::/32 {
    range6 2001:db8::100 2001:db8::500;

    # Override DNS at subnet level
    option dhcp6.name-servers 2001:db8:1::53;

    # Rapid commit (option 14)
    option dhcp6.rapid-commit;
}
```

### Custom Options

```text
# Define a custom DHCPv6 option
option dhcp6.http-proxy code 26600 = string;
option dhcp6.http-proxy "proxy.example.com:8080";
```

---

## Configuring Options in Kea DHCPv6

### Option Data in Subnet

```json
{
  "Dhcp6": {
    "option-def": [
      {
        "name": "http-proxy",
        "code": 26600,
        "type": "string",
        "space": "dhcp6"
      }
    ],
    "subnet6": [
      {
        "subnet": "2001:db8::/32",
        "pools": [
          { "pool": "2001:db8::100-2001:db8::500" }
        ],
        "option-data": [
          {
            "name": "dns-servers",
            "data": "2001:db8::53, 2001:4860:4860::8888"
          },
          {
            "name": "domain-search",
            "data": "corp.example.com, internal.example.com"
          },
          {
            "name": "sntp-servers",
            "data": "2001:db8::123"
          },
          {
            "name": "information-refresh-time",
            "data": "21600"
          },
          {
            "name": "http-proxy",
            "data": "proxy.example.com:8080"
          }
        ]
      }
    ]
  }
}
```

### Global Options in Kea

```json
{
  "Dhcp6": {
    "option-data": [
      {
        "name": "dns-servers",
        "data": "2001:db8::1, 2001:db8::2"
      },
      {
        "name": "domain-search",
        "data": "example.com"
      }
    ]
  }
}
```

---

## Options Request Option (ORO)

Clients send an ORO (option 6) listing the options they want. Configure the client to request specific options:

### dhclient Client ORO

```text
# /etc/dhcp/dhclient6.conf
interface "eth0" {
    request dhcp6.name-servers,
            dhcp6.domain-search,
            dhcp6.sntp-servers,
            dhcp6.info-refresh-time;
}
```

### systemd-networkd ORO

```ini
# /etc/systemd/network/10-eth0.network
[Network]
DHCP=ipv6

[DHCPv6]
RequestOptions=23 24 31 32
```

---

## Vendor-Specific Options (Option 17)

Option 17 carries vendor-specific information using an enterprise number:

```text
# ISC DHCP - Send vendor option
# Enterprise number 2495, sub-option 1 = "host"
option dhcp6.vendor-opts 00:00:09:bf:00:01:00:04:68:6f:73:74;
```

---

## Information-Only Mode (Stateless DHCPv6)

For clients using SLAAC for addresses but needing DNS/NTP from DHCPv6:

```text
# Server config for stateless mode
subnet6 2001:db8::/32 {
    # No range6 - address-free, options only
    option dhcp6.name-servers 2001:db8::53;
    option dhcp6.domain-search "example.com";
    option dhcp6.info-refresh-time 21600;
}
```

---

## Verifying Options on Clients

```bash
# Linux - check received options in resolv.conf
cat /etc/resolv.conf

# systemd-networkd lease details
networkctl status eth0

# dhclient lease file
cat /var/lib/dhcp/dhclient6.leases

# Capture options in a DHCPv6 reply
sudo tcpdump -i eth0 -vv udp port 546 or udp port 547 | grep -A5 "Reply"
```

---

## Best Practices

1. **Always deliver DNS servers** - option 23 is the most critical option
2. **Include domain-search** for seamless short hostname resolution
3. **Set information-refresh-time** for stateless clients (option 32)
4. **Use ORO on clients** to request only needed options, reducing message size
5. **Document custom option codes** to avoid conflicts with future standard options

---

## Conclusion

DHCPv6 options deliver critical network configuration beyond addresses. DNS servers, domain search, NTP, and SIP options are all commonly deployed. Use ISC DHCP or Kea to configure them at global or per-subnet scope, and verify delivery by inspecting client lease files and resolv.conf.

---

*Monitor DNS and network health across your IPv6 infrastructure with [OneUptime](https://oneuptime.com).*
