# How to Configure DHCP Scopes and Address Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Networking, IP Addressing, Scope, Address Pool, Sysadmin

Description: DHCP scopes define the range of IP addresses available for dynamic assignment within a subnet, along with options like gateway, DNS, and lease time that clients receive along with their address.

## What Is a DHCP Scope?

A DHCP scope is a pool of IP addresses that the DHCP server can assign to clients on a specific subnet. Each scope is tied to one subnet and includes:
- Address range (start IP to end IP)
- Subnet mask
- Lease duration
- DHCP options (gateway, DNS, domain, etc.)
- Exclusions (IPs to skip)
- Reservations (MAC-to-IP mappings)

## ISC dhcpd: Multi-Scope Configuration

```text
# /etc/dhcp/dhcpd.conf

# Global defaults

default-lease-time 86400;
max-lease-time 604800;

# Scope 1: Office LAN
subnet 10.0.10.0 netmask 255.255.255.0 {
    range 10.0.10.50 10.0.10.200;
    option routers 10.0.10.1;
    option domain-name-servers 10.0.0.53, 8.8.8.8;
    option domain-name "office.example.com";
    default-lease-time 86400;
}

# Scope 2: VoIP VLAN - shorter lease, specific options
subnet 10.0.30.0 netmask 255.255.255.0 {
    range 10.0.30.10 10.0.30.250;
    option routers 10.0.30.1;
    option domain-name-servers 10.0.0.53;
    # VoIP phones TFTP server
    option tftp-server-name "10.0.0.100";
    default-lease-time 3600;    # 1 hour - phones re-register frequently
}

# Scope 3: Guest WiFi - isolated pool
subnet 10.0.99.0 netmask 255.255.255.0 {
    range 10.0.99.10 10.0.99.250;
    option routers 10.0.99.1;
    option domain-name-servers 8.8.8.8, 1.1.1.1;
    default-lease-time 1800;    # 30 min for guests
}
```

## dnsmasq: Multiple Scopes by Interface

```text
# /etc/dnsmasq.conf

# Office LAN on eth0.10
interface=eth0.10
dhcp-range=set:office,10.0.10.50,10.0.10.200,255.255.255.0,24h

# VoIP VLAN on eth0.30
interface=eth0.30
dhcp-range=set:voip,10.0.30.10,10.0.30.250,255.255.255.0,1h

# Guest WiFi on eth0.99
interface=eth0.99
dhcp-range=set:guest,10.0.99.10,10.0.99.250,255.255.255.0,30m

# Options per network
dhcp-option=tag:office,option:router,10.0.10.1
dhcp-option=tag:voip,option:router,10.0.30.1
dhcp-option=tag:guest,option:router,10.0.99.1
```

## Address Pool Sizing

When sizing a DHCP pool, consider:
- **Concurrent clients**: How many devices are active at once?
- **Lease duration**: Shorter leases reclaim abandoned addresses faster; longer leases create fewer renewals.
- **Growth headroom**: A common starting point is to leave 20% of addresses outside the pool for static assignments.

```python
def pool_sizing(total_hosts: int, utilization: float = 0.8) -> dict:
    """Estimate pool size for a given subnet."""
    pool_size = int(total_hosts * utilization)
    static_reserve = total_hosts - pool_size
    return {"pool": pool_size, "static_reserve": static_reserve}

for prefix in [24, 23, 22]:
    import ipaddress
    net = ipaddress.IPv4Network(f"10.0.0.0/{prefix}")
    usable = net.num_addresses - 2
    sizing = pool_sizing(usable)
    print(f"/{prefix}: {usable} usable -> pool={sizing['pool']} static_reserve={sizing['static_reserve']}")
```

## Key Takeaways

- Create one scope per subnet with appropriate range, options, and lease time.
- VoIP and guest networks often benefit from shorter leases; office LANs often use longer ones.
- A 20% static reserve is a common starting point, but size pools to fit your actual environment.
- Verify dynamic address ranges do not overlap and that each scope matches the intended subnet.
