# How to Configure IPv6 on Fortinet FortiGate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fortinet, FortiGate, Firewall, IPv6 Policy, Networking

Description: Configure IPv6 addressing, firewall policies, and DHCPv6 on Fortinet FortiGate firewalls for enterprise IPv6 deployments.

## Introduction

Fortinet FortiGate firewalls support full IPv6 including static and dynamic addressing, DHCPv6 server and relay, Router Advertisements, BGP/OSPFv3, and IPv6 security policies. IPv6 is configured through either the GUI or CLI.

## Step 1: Enable IPv6 on an Interface (CLI)

```bash
# Via FortiGate CLI

config system interface
    edit "wan1"
        config ipv6
            set ip6-address 2001:db8:0:100::2/64
            set ip6-allowaccess ping
        end
    next
    edit "internal"
        config ipv6
            set ip6-address 2001:db8:1:1::1/64
            set ip6-allowaccess ping https ssh
            set ip6-send-adv enable
            set ip6-manage-flag enable
            set ip6-other-flag enable
            config ip6-prefix-list
                edit 2001:db8:1:1::/64
                    set autonomous-flag disable
                    set onlink-flag enable
                    set preferred-life-time 14400
                    set valid-life-time 86400
                next
            end
        end
    next
end
```

## Step 2: Configure IPv6 on Interface via GUI

1. If the **IPv6** section is hidden, go to **System > Feature Visibility** and enable **IPv6**
2. Navigate to **Network > Interfaces**
3. Click on the interface to edit (e.g., `internal`)
4. Scroll to **IPv6** section
5. Set **IPv6 Address**: `2001:db8:1:1::1/64`
6. Enable **Send Advertisements**
7. Set **M Flag**: On (for stateful DHCPv6)
8. Set **O Flag**: On
9. Under **Prefix List**, add the /64 prefix with:
   - **Autonomous Flag**: Off
   - **On-link Flag**: On
   - Valid/Preferred Lifetimes as desired
10. Click **OK**

## Step 3: Configure Static IPv6 Route

```bash
config router static6
    edit 1
        set dst ::/0
        set gateway 2001:db8:0:100::1
        set device "wan1"
    next
end
```

## Step 4: Configure DHCPv6 Server

```bash
config system dhcp6 server
    edit 1
        set interface "internal"
        set subnet 2001:db8:1:1::/64
        set ip-mode range
        set dns-service specify
        set dns-server1 2001:db8:1:1::53
        set domain "example.com"
        set lease-time 86400
        config ip-range
            edit 1
                set start-ip 2001:db8:1:1::1000
                set end-ip 2001:db8:1:1::1fff
            next
        end
    next
end
```

## Step 5: Configure IPv6 Firewall Policies

On current FortiOS releases, IPv4 and IPv6 firewall policies are configured under `config firewall policy` using the IPv6 address fields:

```bash
# Allow LAN IPv6 traffic to WAN
config firewall policy
    edit 1
        set name "LAN-to-WAN-IPv6"
        set srcintf "internal"
        set dstintf "wan1"
        set srcaddr6 "all"
        set dstaddr6 "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set logtraffic all
    next
end

# Allow established/related inbound (typically handled by stateful inspection)
# FortiGate's stateful firewall automatically handles return traffic
```

## Step 6: Configure IPv6 Firewall Address Objects

```bash
config firewall address6
    edit "Internal-IPv6-Network"
        set ip6 2001:db8:1:1::/64
    next
    edit "DNS-Servers-IPv6"
        set type iprange
        set start-ip 2001:db8:1:1::53
        set end-ip 2001:db8:1:1::53
    next
end
```

## Step 7: Configure OSPFv3 (Optional)

```bash
config router ospf6
    set router-id 1.1.1.1
    config area
        edit 0.0.0.0
        next
    end
    config ospf6-interface
        edit "internal"
            set interface "internal"
            set area-id 0.0.0.0
        next
    end
end
```

## Verification Commands

```bash
# Show IPv6 interface addresses
diagnose ipv6 address list

# Show IPv6 routing table
get router info6 routing-table

# Show DHCPv6 leases
execute dhcp6 lease-list internal

# Show IPv6 firewall policy statistics
diagnose firewall iprope6 show

# Ping test
execute ping6 2606:4700:4700::1111

# Traceroute (interactive)
execute tracert6

# Show IPv6 neighbor cache
diagnose ipv6 neighbor-cache list
```

## Conclusion

FortiGate provides comprehensive IPv6 support with the interface-level IPv6 configuration containing both the address and RA settings. On current FortiOS releases, IPv6 traffic is controlled through the consolidated firewall policy model using the IPv6 source and destination fields. For production deployments, verify addressing, routing, DHCPv6 leases, and policy hits using the `diagnose ipv6`, `execute dhcp6`, and `diagnose firewall iprope6` command families.
