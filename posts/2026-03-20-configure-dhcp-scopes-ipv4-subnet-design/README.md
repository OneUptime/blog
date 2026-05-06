# How to Configure DHCP Scopes with Proper IPv4 Subnet Design

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, IPv4, Subnet Design, Scope, Network Planning, ISC DHCP, Windows DHCP

Description: Learn how to design IPv4 subnets for DHCP scopes, calculate pool sizes, configure exclusion ranges, and set options for proper network operation.

---

A well-designed DHCP scope starts with proper subnet planning: choosing the right prefix length, reserving IPs for static hosts, and setting appropriate lease times.

## Subnet Sizing Reference

| Prefix | Usable IPs | Typical Use |
|--------|-----------|-------------|
| /24 | 254 | Standard office floor, VLAN |
| /23 | 510 | Large VLAN, warehouse WiFi |
| /22 | 1022 | Campus WiFi |
| /25 | 126 | Small department |
| /26 | 62 | Small server segment |
| /28 | 14 | Management VLAN |

## IP Allocation Strategy

```text
Subnet: 192.168.10.0/24

Reserved for network/broadcast: .0, .255
Reserved for gateway:            .1
Reserved for switches/APs:       .2 - .20  (static)
Reserved for servers:            .21 - .49 (static)
DHCP pool:                       .50 - .200 (151 addresses)
Reserved/spare:                  .201 - .254
```

## ISC DHCP (Legacy): Configuring a Scope

```bash
# /etc/dhcp/dhcpd.conf
# ISC DHCP is end-of-life; ISC recommends Kea for new deployments.

subnet 192.168.10.0 netmask 255.255.255.0 {
  range 192.168.10.50 192.168.10.200;

  # Common client options
  option routers 192.168.10.1;
  option domain-name-servers 10.0.0.1, 10.0.0.2;
  option domain-name "example.com";

  # Lease times
  default-lease-time 86400;    # 24 hours
  max-lease-time 604800;       # 7 days

  # Subnet mask (inferred from subnet declaration, explicit here for clarity)
  option subnet-mask 255.255.255.0;
  option broadcast-address 192.168.10.255;

  # NTP server (option 42)
  option ntp-servers 10.0.0.10;
}
```

## Windows DHCP Server: Scope Configuration

```powershell
# Create scope inactive so exclusions can be added before leases are issued
Add-DhcpServerv4Scope `
  -Name "Office Floor 2" `
  -StartRange 192.168.10.1 `
  -EndRange 192.168.10.254 `
  -SubnetMask 255.255.255.0 `
  -Description "Floor 2 workstations" `
  -State InActive

# Set scope options
Set-DhcpServerv4OptionValue `
  -ScopeId 192.168.10.0 `
  -Router 192.168.10.1 `
  -DnsServer 10.0.0.1,10.0.0.2 `
  -DnsDomain "example.com"

# Add exclusion for static range
Add-DhcpServerv4ExclusionRange `
  -ScopeId 192.168.10.0 `
  -StartRange 192.168.10.1 `
  -EndRange 192.168.10.49

# Add exclusion for spare range
Add-DhcpServerv4ExclusionRange `
  -ScopeId 192.168.10.0 `
  -StartRange 192.168.10.201 `
  -EndRange 192.168.10.254

# Activate the scope
Set-DhcpServerv4Scope `
  -ScopeId 192.168.10.0 `
  -State Active
```

## DHCP Reservations for Static Hosts

```bash
# ISC DHCP: reserve IP by MAC
host printer-floor2 {
  hardware ethernet aa:bb:cc:dd:ee:ff;
  fixed-address 192.168.10.25;
}
```

## Choosing Lease Times

| Scenario | Recommended Lease |
|----------|------------------|
| Stable corporate devices | 24 hours - 7 days |
| Laptop/mobile users | 8 hours |
| Guest/hotspot WiFi | 1 hour |
| Servers | Static IP or very long lease |

## Key Takeaways

- Reserve the bottom of each subnet (e.g., .1-.49) for static infrastructure; assign DHCP pool to .50-.200.
- For most client subnets, set option 3 (router) and option 6 (DNS); omitting them usually prevents off-subnet routing or name resolution.
- Use short lease times (1-8 hours) for guest and WiFi networks to recycle addresses quickly.
- Document IP allocations in a spreadsheet or IPAM tool to prevent range overlap between scopes.
