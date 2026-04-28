# How to Prevent NDP Spoofing Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP Spoofing, IPv6 Security, Neighbor Advertisement, Cache Poisoning, First Hop Security

Description: Prevent NDP spoofing attacks including Neighbor Advertisement spoofing and neighbor cache poisoning using switch-level and host-level defenses.

## Introduction

NDP spoofing is the IPv6 equivalent of ARP poisoning. An attacker sends forged Neighbor Advertisement (NA) messages claiming ownership of another host's IPv6 address, poisoning the neighbor cache of other hosts on the link. Victims then send traffic to the attacker instead of the legitimate host. Prevention requires a combination of switch-level ND Inspection, source guard, and host-level hardening.

## NDP Spoofing Attack Mechanics

```text
NDP Cache Poisoning Attack:

Legitimate State:
  Host A neighbor cache:
    2001:db8::200 → MAC aa:bb:cc:dd:ee:ff  (Host B)
    fe80::1       → MAC 00:11:22:33:44:55  (Router)

Attack: Attacker sends forged unsolicited NA:
  ICMPv6 NA message:
    IPv6 src:    fe80::attacker
    IPv6 dst:    ff02::1 (all nodes multicast)
    Target:      2001:db8::200  ← Claims to own Host B's address
    TLLA option: 11:22:33:44:55:66  ← Attacker's MAC
    Override=1, Solicited=0

After attack, Host A's neighbor cache:
  2001:db8::200 → MAC 11:22:33:44:55:66  ← Attacker's MAC!
  fe80::1       → MAC 00:11:22:33:44:55

Result: Host A sends traffic for Host B to attacker
```

## Switch-Level Defense: ND Inspection

ND Inspection on the switch validates NA messages against the binding table.

```text
! Cisco: Enable ND Inspection (IPv6 Snooping) with guard mode
ipv6 snooping policy ND_PROTECT
 security-level guard     ← Drops invalid NDP, not just inspects
 tracking enable

vlan configuration 10
 ipv6 snooping attach-policy ND_PROTECT

! When attacker sends forged NA:
! Switch checks: is 2001:db8::200 bound to this port/MAC?
! Binding: 2001:db8::200 is on Gi1/0/5, MAC aa:bb:cc:dd:ee:ff
! NA arrives on Gi1/0/1 with different MAC → SPOOF DETECTED → DROP

! Mark trusted ports (uplinks)
interface GigabitEthernet1/0/24
 ipv6 snooping trust

! Show binding table
show ipv6 neighbor binding

! Show dropped spoofed NAs
show ipv6 snooping counters interface GigabitEthernet1/0/1
```

## Host-Level Defense: Secure Static Entries

For critical hosts, add permanent static neighbor cache entries.

```bash
# Add static (permanent) neighbor entry for the router

# Static entries cannot be overridden by spoofed NAs
sudo ip -6 neigh add 2001:db8::1 lladdr 00:11:22:33:44:55 \
    dev eth0 nud permanent

# Add permanent entry for another critical host
sudo ip -6 neigh add 2001:db8::200 lladdr aa:bb:cc:dd:ee:ff \
    dev eth0 nud permanent

# Verify entries are permanent
ip -6 neigh show | grep PERMANENT
# 2001:db8::1 dev eth0 lladdr 00:11:22:33:44:55 PERMANENT
# 2001:db8::200 dev eth0 lladdr aa:bb:cc:dd:ee:ff PERMANENT

# Permanent entries are never evicted by unsolicited NAs
# Attacker cannot override them
# Limitation: must be manually maintained
```

## Reducing NA Override Acceptance

Linux allows tuning of neighbor discovery parameters to reduce spoofing window.

```bash
# Reduce REACHABLE time (shorter window for stale entries)
# Default: 30000ms (30 seconds) - tunable per interface
sudo sysctl -w net.ipv6.neigh.eth0.base_reachable_time_ms=10000

# Reduce DELAY_FIRST_PROBE_TIME (trigger NUD probing sooner)
# Default: 5 seconds
sudo sysctl -w net.ipv6.neigh.eth0.delay_first_probe_time=2

# Reduce retrans_time (faster NUD probing)
# Default: 1000ms
sudo sysctl -w net.ipv6.neigh.eth0.retrans_time_ms=500

# Effect: After receiving a suspicious NA that changes a REACHABLE entry,
# NUD probing starts sooner to verify reachability.
# Shorter timers = smaller window for successful cache poisoning

# Persist in /etc/sysctl.d/60-ipv6-ndp-security.conf
cat >> /etc/sysctl.d/60-ipv6-ndp-security.conf << 'EOF'
net.ipv6.neigh.eth0.base_reachable_time_ms = 10000
net.ipv6.neigh.eth0.delay_first_probe_time = 2
net.ipv6.neigh.eth0.retrans_time_ms = 500
EOF
```

## Blocking Unsolicited NAs with ip6tables

Restrict which sources can send Neighbor Advertisements.

```bash
# Allow NA only from known trusted sources
# (MAC-based filtering - poor man's ND Inspection)

# Allow NA from legitimate router MAC
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement \
    -m mac --mac-source 00:11:22:33:44:55 -j ACCEPT

# Allow NA from known hosts by source address
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement \
    -s 2001:db8::/64 -j ACCEPT

# Rate limit remaining NAs to detect flooding
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement \
    -m limit --limit 50/sec --limit-burst 100 -j ACCEPT

# Drop excess NAs
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement \
    -j DROP

# Note: This is a partial mitigation; switch-level ND Inspection
# is more effective as it validates against the binding table.
```

## Monitoring for NDP Spoofing

```bash
# Monitor neighbor cache changes (potential spoofing)
# Watch for rapid MAC address changes on the same IPv6 address

# Script: detect MAC changes in neighbor cache
watch -n 5 'ip -6 neigh show | sort'
# If you see the MAC address change for an IP between refreshes:
# → Possible NDP spoofing in progress

# Capture suspicious NAs
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 136"
# ICMPv6 Type 136 = Neighbor Advertisement

# Alert on NA Override=1 from unexpected source
# (Override bit in NA means "update your neighbor cache")
# Check bit 5 of byte 44 in ICMPv6 header for Override flag
```

## NDP Spoofing in Virtualized Environments

```nginx
Virtualization Considerations:

Hypervisor-level protection:
  - VMware vSphere: Enable "Forged Transmits" = Reject on vSwitch
    → Blocks VMs from sending NAs with non-assigned MACs
  - Hyper-V: Ensure "MAC address spoofing" is disabled (default) on VM network adapters
  - KVM/Linux Bridge: Use ebtables for L2 filtering

Container environments (Docker/Kubernetes):
  - Each container gets a veth pair
  - NDP between containers goes through the bridge
  - Deploy ND Inspection on the bridge or upstream switch
  - Use NetworkPolicy to restrict inter-pod IPv6 traffic

AWS/Azure/GCP:
  - Cloud platforms enforce anti-spoofing at the hypervisor level
  - Source address validation is built into the platform
  - NDP spoofing attacks are blocked by the virtualization layer
```

## Conclusion

NDP spoofing (neighbor cache poisoning) is prevented through layered defenses. At the switch level, ND Inspection validates NA messages against the binding table and drops spoofed NAs. At the host level, static permanent neighbor entries for critical hosts cannot be overridden. ip6tables can rate limit and restrict NA sources as an additional layer. For virtualized environments, hypervisor anti-spoofing features provide an additional enforcement point. The strongest protection combines ND Inspection on the switch with IPv6 Source Guard for data-plane validation.
