# How to Plan IPv4 Addressing for WAN Links Using /30 or /31

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, WAN Links, /30, /31, Point-to-Point, Network Design

Description: Learn how to allocate and configure IPv4 addresses for WAN point-to-point links using /30 and /31 subnet masks, and understand when to choose each.

## Point-to-Point WAN Link Addressing

WAN point-to-point links connect two routers and only need 2 IP addresses. Two options:

**Traditional /30 (4 addresses, 2 usable):**
```text
Network:   10.254.0.0/30
Router A:  10.254.0.1
Router B:  10.254.0.2
Broadcast: 10.254.0.3
Wasted:    2 addresses (network + broadcast)
```

**Modern /31 (2 addresses, both usable - RFC 3021):**
```text
Network:   10.254.0.0/31
Router A:  10.254.0.0
Router B:  10.254.0.1
(No subnet broadcast address!)
Wasted:    0 addresses
```

For 1000 WAN links:
- /30: 4000 addresses needed
- /31: 2000 addresses needed (50% savings)

## Step 1: Allocate a WAN Address Block

Reserve a dedicated block for WAN point-to-point links:

```text
10.254.0.0/16 - WAN Infrastructure

Using /30 subnets (traditional):
  10.254.0.0/30   = WAN Link 1
  10.254.0.4/30   = WAN Link 2
  10.254.0.8/30   = WAN Link 3
  ...
  Capacity: 16,384 WAN links in /30s

Using /31 subnets (RFC 3021):
  10.254.0.0/31   = WAN Link 1
  10.254.0.2/31   = WAN Link 2
  10.254.0.4/31   = WAN Link 3
  ...
  Capacity: 32,768 WAN links in /31s
```

## Step 2: Configure a /30 WAN Link

```text
! Router A (10.254.0.1):
interface GigabitEthernet0/0
 description WAN_Link_to_RouterB
 ip address 10.254.0.1 255.255.255.252
 no shutdown

! Router B (10.254.0.2):
interface GigabitEthernet0/0
 description WAN_Link_to_RouterA
 ip address 10.254.0.2 255.255.255.252
 no shutdown

! Verify connectivity
RouterA# ping 10.254.0.2
!! (success)
```

## Step 3: Configure a /31 WAN Link (RFC 3021)

```text
! Router A (10.254.0.0):
interface GigabitEthernet0/0
 description WAN_Link_to_RouterB_31
 ip address 10.254.0.0 255.255.255.254    ! /31 mask
 no shutdown

! Router B (10.254.0.1):
interface GigabitEthernet0/0
 description WAN_Link_to_RouterA_31
 ip address 10.254.0.1 255.255.255.254    ! /31 mask
 no shutdown

! Note: /31 support varies by platform and software release
! Verify RFC 3021 /31 support in your vendor's documentation or release notes
```

## Step 4: Allocate WAN Links Systematically

```python
from ipaddress import ip_network

def allocate_wan_links(base_block, prefix_len, num_links):
    """Generate WAN link address pairs."""
    parent = ip_network(base_block)
    subnets = list(parent.subnets(new_prefix=prefix_len))

    print(f"Allocating {num_links} WAN links as /{prefix_len} from {base_block}")
    print(f"Available capacity: {len(subnets)} links\n")

    links = []
    for i in range(min(num_links, len(subnets))):
        subnet = subnets[i]
        hosts = list(subnet.hosts())

        if prefix_len == 31:
            # /31: hosts() returns both usable addresses
            router_a = str(hosts[0])
            router_b = str(hosts[1])
        else:
            # /30: use the two usable host addresses
            router_a = str(hosts[0])
            router_b = str(hosts[1])

        links.append({
            'link_num': i + 1,
            'subnet': str(subnet),
            'router_a': router_a,
            'router_b': router_b,
        })

    for link in links:
        print(f"Link {link['link_num']:4d}: {link['subnet']:20} Router A: {link['router_a']:15} Router B: {link['router_b']}")

    return links

# Allocate /30 WAN links

allocate_wan_links('10.254.0.0/16', 30, 5)

# Allocate /31 WAN links (saves 50% address space)
allocate_wan_links('10.254.0.0/16', 31, 5)
```

## Step 5: Naming Convention for WAN Links

Create a consistent naming convention for easy reference:

```text
Convention: 10.254.[link_group].[offset]

Link groups by type:
  10.254.0.0/17   = MPLS WAN links
  10.254.128.0/18 = Internet transit links
  10.254.192.0/18 = VPN/overlay links

Example:
  10.254.0.0/30  = HQ to NYC MPLS
  10.254.0.4/30  = HQ to Chicago MPLS
  10.254.128.0/30 = HQ to ISP1 internet
  10.254.128.4/30 = HQ to ISP2 internet
```

## Step 6: Verify WAN Link Configuration

```text
# Verify interface is up and IP is correct
show interfaces GigabitEthernet0/0

# Ping the other end of the link
ping <peer-ip>

# Check routing table for the connected route
show ip route <wan-subnet> <wan-mask>

# Verify MTU (WAN links should match)
show interfaces GigabitEthernet0/0 | include MTU
```

## Conclusion

Use /30 subnets (2 usable hosts) for WAN point-to-point links if your equipment doesn't support /31, or /31 (RFC 3021) to save 50% address space on modern equipment. Allocate all WAN link addresses from a dedicated block (10.254.0.0/16) separate from LAN subnets for clarity. The systematic allocation (link 1 = .0/30, link 2 = .4/30) makes address management predictable. Always verify WAN links with ping to the adjacent router IP immediately after configuration.
