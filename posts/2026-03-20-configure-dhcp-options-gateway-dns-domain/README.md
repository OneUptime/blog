# How to Configure DHCP Options (Gateway, DNS, Domain Name)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Networking, DHCP Options, DNS, Gateway, Sysadmin

Description: DHCP options are additional configuration parameters delivered to clients alongside the IP address, including default gateway (option 3), DNS servers (option 6), and domain name (option 15)...

## Common DHCP Options

| Option | Number | Description |
|--------|--------|-------------|
| Subnet Mask | 1 | Client subnet mask |
| Router (Gateway) | 3 | Default gateway |
| DNS Servers | 6 | Name server IPs |
| Domain Name | 15 | Client DNS suffix |
| NTP Servers | 42 | Time synchronization |
| TFTP Server | 66 | Boot file server |
| Boot Filename | 67 | PXE boot filename |
| WINS Server | 44 | Windows name resolution |
| Vendor Class | 60 | Vendor identification |

## ISC dhcpd Configuration

```text
# /etc/dhcp/dhcpd.conf

# Global options (apply to all scopes unless overridden)

option domain-name "corp.example.com";
option domain-name-servers 10.0.0.53, 10.0.0.54;
option ntp-servers 10.0.0.123;
default-lease-time 86400;

# Scope-specific options (override global)
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;

    # Common: default gateway for routed networks
    option routers 192.168.1.1;

    # DNS - overrides global for this subnet
    option domain-name-servers 192.168.1.53;
    option domain-name "branch.corp.example.com";

    # Subnet mask (usually inferred from subnet declaration)
    option subnet-mask 255.255.255.0;
}
```

## dnsmasq Configuration

```text
# /etc/dnsmasq.conf

# Global defaults
domain=corp.example.com
dhcp-option=option:ntp-server,10.0.0.123

# Define ranges and set tags for each scope
dhcp-range=set:branch10,10.0.10.100,10.0.10.200,255.255.255.0
dhcp-range=set:branch20,10.0.20.100,10.0.20.200,255.255.255.0

# Per-range options (match the tags set above)
dhcp-option=tag:branch10,option:router,10.0.10.1
dhcp-option=tag:branch10,option:dns-server,10.0.0.53
dhcp-option=tag:branch10,option:domain-name,office.example.com

dhcp-option=tag:branch20,option:router,10.0.20.1
dhcp-option=tag:branch20,option:dns-server,10.0.0.53
```

## Windows Server PowerShell

```powershell
# Set scope-level options (per scope)
Set-DhcpServerv4OptionValue `
    -ScopeId 192.168.1.0 `
    -Router 192.168.1.1 `
    -DnsServer 10.0.0.53, 10.0.0.54 `
    -DnsDomain "corp.example.com"

# Set server-level options (apply to all scopes)
Set-DhcpServerv4OptionValue `
    -OptionId 42 `         # NTP servers
    -Value 10.0.0.123

# View options for a scope
Get-DhcpServerv4OptionValue -ScopeId 192.168.1.0
```

## Verifying Options on a Client

```bash
# Linux: renew once with verbose logging (ISC dhclient)
dhclient -1 -v eth0
# Or check the lease file (often /var/lib/dhcp/dhclient.leases)
cat /var/lib/dhcp/dhclient.leases

# Windows
ipconfig /all | findstr /i /c:"Default Gateway" /c:"DNS Servers" /c:"Connection-specific DNS Suffix"

# macOS
ipconfig getpacket en0
```

## Custom Options (Option 43/Vendor Specific)

```text
# Deliver custom data to devices that request it
option space MY_VENDOR;
option MY_VENDOR.config-server code 1 = ip-address;

class "MY-DEVICE" {
    match if option vendor-class-identifier = "MY-DEVICE";
    vendor-option-space MY_VENDOR;
    option MY_VENDOR.config-server 10.0.0.200;
}
```

## Key Takeaways

- For normal internet access, clients need a subnet mask plus option 3 (router) and option 6 (DNS).
- Scope-level options override global options in ISC dhcpd.
- Use option 15 (domain name) to set the client DNS suffix for short-name resolution within the corporate domain.
- Test delivered options from a client by renewing with `dhclient -1 -v`, checking the lease data, or using `ipconfig getpacket en0` on macOS.
