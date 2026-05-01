# How to Configure the DHCPv6 DNS Search List Option

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, DNS, Networking, ISC DHCP, Kea, Domain Search

Description: Learn how to configure the DHCPv6 DNS search list option (option 24) so clients automatically resolve short hostnames using your organization's domain suffixes.

---

The DHCPv6 DNS search list option (option 24, `domain-search`) distributes a list of domain suffixes to clients. When a client resolves a short hostname like `webserver`, the OS appends each search domain in order until a match is found - for example, `webserver.corp.example.com`.

---

## Why the DNS Search List Matters

Without a search list, users must type fully qualified domain names (FQDNs). With a properly configured search list:

- `ping webserver` resolves to `webserver.corp.example.com`
- `curl http://api` resolves to `api.internal.example.com`
- Short hostnames work across your entire fleet automatically

---

## Configuring DNS Search List on ISC DHCP Server (dhcpd)

### Basic Configuration

```text
# /etc/dhcp/dhcpd6.conf

option dhcp6.domain-search "corp.example.com", "internal.example.com";

subnet6 2001:db8::/32 {
    range6 2001:db8::100 2001:db8::200;
    option dhcp6.name-servers 2001:db8::1, 2001:db8::2;
    option dhcp6.domain-search "corp.example.com", "internal.example.com";
}
```

### Per-Class Override

```text
# /etc/dhcp/dhcpd6.conf
class "servers" {
    match if substring(option dhcp6.client-id, 0, 6) = "server";
}

subnet6 2001:db8::/32 {
    range6 2001:db8::100 2001:db8::200;

    option dhcp6.domain-search "corp.example.com";

    pool6 {
        allow members of "servers";
        range6 2001:db8::50 2001:db8::99;
        option dhcp6.domain-search "servers.corp.example.com", "corp.example.com";
    }
}
```

---

## Configuring DNS Search List on Kea DHCPv6

### kea-dhcp6.conf

```json
{
  "Dhcp6": {
    "interfaces-config": {
      "interfaces": [ "eth0" ]
    },
    "lease-database": {
      "type": "memfile",
      "persist": true,
      "name": "/var/lib/kea/dhcp6.leases"
    },
    "subnet6": [
      {
        "id": 1,
        "subnet": "2001:db8::/32",
        "pools": [
          { "pool": "2001:db8::100-2001:db8::200" }
        ],
        "option-data": [
          {
            "name": "dns-servers",
            "data": "2001:db8::1, 2001:db8::2"
          },
          {
            "name": "domain-search",
            "data": "corp.example.com, internal.example.com"
          }
        ]
      }
    ]
  }
}
```

### Verify Kea Configuration

```bash
sudo kea-dhcp6 -t /etc/kea/kea-dhcp6.conf
sudo systemctl restart kea-dhcp6
```

---

## Configuring DNS Search List on Windows DHCP Server

```powershell
# Set domain search list for DHCPv6 scope
Set-DhcpServerv6OptionValue -Prefix 2001:db8:: `
    -DomainSearchList "corp.example.com", "internal.example.com"

# Verify the option
Get-DhcpServerv6OptionValue -Prefix 2001:db8:: -OptionId 24
```

---

## Verifying the Search List on Clients

### Linux Client Verification

```bash
# Check /etc/resolv.conf after DHCP lease
cat /etc/resolv.conf

# Expected output:
# nameserver 2001:db8::1
# search corp.example.com internal.example.com

# Test short name resolution
host webserver
# webserver.corp.example.com has address 10.0.0.5
```

### Windows Client Verification

```powershell
# Check DNS suffix search list
Get-DnsClientGlobalSetting

# Or via ipconfig
ipconfig /all | Select-String "DNS Suffix"

# Test short name resolution
Resolve-DnsName webserver
```

---

## Capturing Option 24 in Packet Traces

```bash
# Capture DHCPv6 traffic and decode options
sudo tcpdump -i eth0 -v udp port 546 or udp port 547

# Use Wireshark filter
# dhcpv6.option.type == 24
```

---

## Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Search list not applied | Client request list omits option 24 | Include `domain-search` in the client request list (ISC `dhclient`: `also request domain-search;`) |
| Wrong domains returned | Wrong pool configuration | Check subnet-specific option overrides |
| Resolution fails | DNS servers unreachable | Verify `dns-servers` option is also correct |
| Search list ignored on Windows | DHCP client service issue | Restart DHCP service, renew with `ipconfig /renew6` |

---

## Best Practices

1. **Keep the list short** - 3–5 domains maximum; long lists slow down DNS resolution
2. **Order by frequency of use** - most commonly resolved domains first
3. **Include the FQDN domain** of your organization as the primary entry
4. **Test after deployment** with `nslookup` or `host` on a sample short hostname
5. **Document the option** in your IPAM system for change management

---

## Conclusion

The DHCPv6 DNS search list option (option 24) simplifies hostname resolution across your IPv6 network. Configure it on your DHCPv6 server - whether ISC DHCP, Kea, or Windows Server - and verify it arrives correctly on Linux and Windows clients.

---

*Track DNS and network health across your IPv6 infrastructure with [OneUptime](https://oneuptime.com).*
