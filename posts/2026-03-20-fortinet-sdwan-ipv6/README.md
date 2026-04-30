# How to Configure Fortinet SD-WAN with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fortinet, SD-WAN, FortiGate, Fortios, WAN, Routing

Description: Configure IPv6 in Fortinet SD-WAN on FortiGate including IPv6 SD-WAN rules, interface configuration, health monitoring for IPv6 paths, and BGP IPv6 with SD-WAN.

---

Fortinet SD-WAN is built into FortiOS on FortiGate firewalls. IPv6 support in FortiOS SD-WAN includes IPv6 SD-WAN rules for traffic steering, IPv6 performance SLA monitoring, and dual-stack SD-WAN member interfaces.

## FortiGate SD-WAN IPv6 Interface Setup

```bash
# FortiOS CLI - Configure SD-WAN with IPv6 support

# Configure WAN interfaces for SD-WAN

config system interface
    edit "wan1"
        set mode static
        set ip 203.0.113.1 255.255.255.0
        set role wan
        config ipv6
            set ip6-mode static
            set ip6-address 2001:db8:1:1::1/64
        end
    next
    edit "wan2"
        set mode static
        set ip 198.51.100.1 255.255.255.0
        set role wan
        config ipv6
            set ip6-mode static
            set ip6-address 2001:db8:1:2::1/64
        end
    next
end

# Add to SD-WAN zone
config system sdwan
    set status enable
    config members
        edit 1
            set interface "wan1"
            set gateway 203.0.113.254
            set gateway6 2001:db8:1:1::254
        next
        edit 2
            set interface "wan2"
            set gateway 198.51.100.254
            set gateway6 2001:db8:1:2::254
        next
    end
end

# Add an IPv6 default route to the SD-WAN zone
config router static6
    edit 1
        set sdwan-zone "virtual-wan-link"
    next
end
```

## SD-WAN Performance SLA for IPv6

```bash
# Configure Performance SLA to monitor IPv6 paths
config system sdwan
    config health-check
        edit "IPv6-Internet-Health"
            set addr-mode ipv6
            # Cloudflare DNS IPv6
            set server "2606:4700:4700::1111"
            set protocol ping
            # 1000 ms
            set interval 1000
            set failtime 3
            set recoverytime 5
            # Monitor both WAN members
            set members 1 2
            set threshold-warning-packetloss 1
            set threshold-alert-packetloss 5
            set threshold-warning-latency 100
            set threshold-alert-latency 200
            set threshold-warning-jitter 20
            set threshold-alert-jitter 50
        next
        edit "IPv6-VoIP-Health"
            set addr-mode ipv6
            set server "2001:db8:30:5060::10"
            set protocol tcp-echo
            set port 5060
            set interval 500
            set members 1 2
        next
    end
end
```

## SD-WAN Rules for IPv6 Traffic

```bash
# FortiOS SD-WAN rules for IPv6 steering
config system sdwan
    config service
        edit 1
            set name "IPv6-VoIP-MPLS"
            set mode manual
            set addr-mode ipv6
            set src6 "all"
            set dst6 "VoIP-Servers-IPv6"
            set dscp-forward enable
            set dscp-forward-tag 46
            # Prefer WAN1 (MPLS)
            set priority-members 1
        next
        edit 2
            set name "IPv6-Video-Balanced"
            set mode manual
            set addr-mode ipv6
            set src6 "all"
            set dst6 "Video-CDN-IPv6"
            set load-balance enable
            set hash-mode round-robin
            set priority-members 1 2
        next
        edit 3
            set name "IPv6-Default-Route"
            set mode priority
            set addr-mode ipv6
            set src6 "all"
            set dst6 "all"
            set default enable
            set health-check "IPv6-Internet-Health"
            set link-cost-factor latency
        next
    end
end
```

## IPv6 Firewall Policies with SD-WAN

```bash
# Allow IPv6 through SD-WAN
config firewall policy
    edit 100
        set name "IPv6-LAN-to-WAN-SDWAN"
        set srcintf "lan"
        set dstintf "virtual-wan-link"
        set srcaddr6 "LAN-IPv6-Subnet"
        set dstaddr6 "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set nat enable
        set ippool enable
        set poolname6 "IPv6-WAN-Pool"
    next
end

# Create IPv6 address objects
config firewall address6
    edit "LAN-IPv6-Subnet"
        set type ipprefix
        set ip6 2001:db8:10:100::/64
    next
    edit "VoIP-Servers-IPv6"
        set type ipprefix
        set ip6 2001:db8:20:200::/64
    next
    edit "Video-CDN-IPv6"
        set type ipprefix
        set ip6 2001:db8:30:300::/64
    next
end

# Create IPv6 IP pool for NAT66
config firewall ippool6
    edit "IPv6-WAN-Pool"
        set startip 2001:db8:100:1::10
        set endip 2001:db8:100:1::1f
    next
end
```

## BGP IPv6 with Fortinet SD-WAN

```bash
# Configure BGP for IPv6 route exchange
config router bgp
    set as 65000
    set router-id 10.0.0.1

    config neighbor
        edit "2001:db8:1:ff::1"
            set remote-as 65001
            set activate6 enable
            set capability-graceful-restart6 enable
        next
    end

    config network6
        edit 1
            set prefix6 2001:db8:1000::/48
        next
    end

    config redistribute6
        edit "connected"
            set status enable
        next
        edit "static"
            set status enable
        next
    end
end
```

## Verify and Monitor

```bash
# Check SD-WAN status including IPv6
diagnose sys sdwan member list
diagnose sys sdwan service list | grep -i ipv6

# Check health check status
diagnose sys sdwan health-check

# Check IPv6 routes
get router info6 routing-table
# or
diagnose ipv6 route list

# Test IPv6 path from SD-WAN
execute ping6-options source 2001:db8:1:1::1
execute ping6 2001:4860:4860::8888

# Monitor SD-WAN IPv6 traffic via Dashboard
# Dashboard > SD-WAN > Traffic
# Filter: IPv6
```

Fortinet SD-WAN IPv6 support requires configuring interface IPv6 settings under `config ipv6`, adding an IPv6 static route that points to the SD-WAN zone, setting `set addr-mode ipv6` in health checks and SD-WAN service rules where IPv6 traffic is matched, configuring `gateway6` in SD-WAN member interfaces, and creating Performance SLA monitors that probe IPv6 destinations to measure path quality for intelligent IPv6 traffic steering decisions.
