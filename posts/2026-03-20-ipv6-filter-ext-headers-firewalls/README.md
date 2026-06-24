# How to Filter IPv6 Extension Headers in Firewalls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Firewall, Extension Headers, Security, Ip6tables

Description: Learn how to correctly filter IPv6 extension headers in firewalls, balancing security requirements with operational necessity by following RFC 7045 and RFC 4890 guidelines.

## Introduction

Firewall configuration for IPv6 extension headers requires careful balance: blocking too aggressively breaks legitimate traffic (fragmentation, IPsec, MLD), while allowing everything creates potential security exposure from deprecated or domain-specific headers like Routing Header Types 0, 1, and 3. This guide provides practical firewall rules that follow RFC 7045, RFC 4890, and RFC 9288 guidelines.

## Essential Policies for IPv6 Extension Headers

```text
DEFAULT PERMIT (RFC 7045 / RFC 9288):
  NH=44  (Fragment):           Permit legitimate fragmented traffic
  NH=50  (ESP):                Permit for IPsec VPNs
  NH=51  (AH):                 Permit for IPsec authentication
  NH=60  (Destination Options): Permit standard IPv6 features that rely on it
  NH=135 (Mobility Header):    Permit for Mobile IPv6

POLICY-DEPENDENT:
  NH=0  (HbH):      Forward normally only if the platform can handle it safely;
                    otherwise rate-limit or drop per RFC 9288
  NH=58 (ICMPv6):   Permit essential control and error traffic per RFC 4890
  NH=43 (Routing Header): Permit Type 2 and Type 4 where they are actually used

SHOULD BLOCK AT TRANSIT BOUNDARIES:
  NH=43, RT Type 0: Deprecated security risk
  NH=43, RT Type 1: Deprecated
  NH=43, RT Type 3: RPL-specific; RFC 9288 recommends dropping it at transit routers

POLICY CHOICE:
  Unrecognized extension headers: RFC 7045 requires firewalls to be configurable
  to allow them, but the default policy MAY still drop them
```

## ip6tables Extension Header Filtering

```bash
#!/bin/bash
# IPv6 extension header firewall rules

# Example only: these commands flush the built-in chains; adapt them to your
# existing ruleset before running in production.

sudo ip6tables -F FORWARD
sudo ip6tables -F INPUT
sudo ip6tables -F OUTPUT

# === Allow essential ICMPv6 control and error traffic (RFC 4890) ===
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 133 -j ACCEPT  # RS
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 134 -j ACCEPT  # RA
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 135 -j ACCEPT  # NS
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 136 -j ACCEPT  # NA
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 1   -j ACCEPT  # Destination Unreachable
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 2   -j ACCEPT  # Packet Too Big
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 3   -j ACCEPT  # Time Exceeded
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 4   -j ACCEPT  # Parameter Problem
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 130 -j ACCEPT  # MLD Query
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 131 -j ACCEPT  # MLD Report
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 132 -j ACCEPT  # MLD Done
sudo ip6tables -A INPUT  -p ipv6-icmp --icmpv6-type 143 -j ACCEPT  # MLDv2 Report

# === Fragment Header (NH=44) - ALLOW for legitimate fragmentation ===
sudo ip6tables -A FORWARD -m ipv6header --header frag --soft -j ACCEPT
sudo ip6tables -A INPUT   -m ipv6header --header frag --soft -j ACCEPT

# === IPsec Headers - ALLOW ===
sudo ip6tables -A FORWARD -m ipv6header --header auth --soft -j ACCEPT
sudo ip6tables -A FORWARD -m ipv6header --header esp  --soft -j ACCEPT
sudo ip6tables -A INPUT   -m ipv6header --header auth --soft -j ACCEPT
sudo ip6tables -A INPUT   -m ipv6header --header esp  --soft -j ACCEPT

# === Hop-by-Hop Options (NH=0) - allow on local-link traffic when needed ===
# Note: -m ipv6header matches extension headers
sudo ip6tables -A INPUT   -m ipv6header --header hop --soft -j ACCEPT

# === Routing Header types 0/1/3 - BLOCK ===
# RH0 and RH1 are deprecated; RH3 is typically filtered at transit boundaries
sudo ip6tables -A FORWARD -m rt --rt-type 0 -j LOG --log-prefix "IPv6-RT-DROP: "
sudo ip6tables -A FORWARD -m rt --rt-type 0 -j DROP
sudo ip6tables -A FORWARD -m rt --rt-type 1 -j DROP
sudo ip6tables -A FORWARD -m rt --rt-type 3 -j DROP
sudo ip6tables -A INPUT   -m rt --rt-type 0 -j DROP
sudo ip6tables -A INPUT   -m rt --rt-type 1 -j DROP

# === Log Destination Options and non-blocked Routing Headers ===
sudo ip6tables -A FORWARD -m ipv6header --header dst --soft -j LOG --log-prefix "IPv6-DSTOPT: "
sudo ip6tables -A FORWARD -m ipv6header --header route --soft -j LOG --log-prefix "IPv6-ROUTE: "

echo "Extension header rules applied"
```

## nftables Equivalent

```text
# /etc/nftables.conf
table inet filter6 {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow established/related
        ct state established,related accept

        # Essential ICMPv6 (RFC 4890 Section 4.4)
        icmpv6 type {
            destination-unreachable, packet-too-big,
            time-exceeded, parameter-problem,
            nd-router-solicit, nd-router-advert,
            nd-neighbor-solicit, nd-neighbor-advert,
            mld-listener-query, mld-listener-report,
            mld-listener-reduction, mld2-listener-report
        } accept

        # Fragment Header - allow
        frag more-fragments 0-1 accept

        # IPsec - allow
        meta l4proto { esp, ah } accept

        # Drop deprecated routing headers
        rt type { 0, 1 } drop

        # Log but allow other routing headers (MIPv6 type 2, SRH type 4)
        rt type { 2, 4 } log prefix "IPv6-ROUTE: " accept

        # Allow Hop-by-Hop when this node needs it (for example, local-link MLD)
        hbh hdrlength 0-255 accept

        # Allow TCP/UDP/ICMPv6
        meta l4proto { tcp, udp, icmpv6 } accept

        # Log everything else
        log prefix "IPv6-DROP: " drop
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
        # Similar rules for forwarded traffic
        ct state established,related accept
        frag more-fragments 0-1 accept
        meta l4proto { esp, ah } accept
        rt type { 0, 1, 3 } drop
        rt type { 2, 4 } log prefix "IPv6-ROUTE: " accept
        dst hdrlength 0-255 log prefix "IPv6-DSTOPT: " accept
        hbh hdrlength 0-255 accept
        meta l4proto { tcp, udp, icmpv6 } accept
        log prefix "IPv6-FWD-DROP: " drop
    }
}
```

## Specific Extension Header Security Rules

```bash
# Additional security for Hop-by-Hop (prevent slow-path exhaustion attacks)
# RFC 9288 recommends rate-limiting or dropping HbH traffic if the platform
# cannot process it safely on the fast path.
sudo ip6tables -A INPUT -m ipv6header --header hop --soft \
    -m limit --limit 100/sec --limit-burst 200 \
    -j ACCEPT
sudo ip6tables -A INPUT -m ipv6header --header hop --soft \
    -j DROP  # Drop excess Hop-by-Hop packets
```

## Conclusion

Correct IPv6 extension header filtering requires permitting Fragment Headers (44), IPsec headers (50/51), and Destination Options (60) unless policy says otherwise, while handling Hop-by-Hop (0) according to platform capability and multicast needs. Routing Header Types 0 and 1 should be blocked, and Type 3 is commonly blocked at transit boundaries; Type 2 and Type 4 may be legitimate. RFC 7045 requires firewalls to be configurable to allow unrecognized extension headers, but it does not require blindly forwarding them by default. Overly aggressive filtering that blocks all extension headers breaks fragmentation, IPsec VPNs, and multicast - causing hard-to-diagnose connectivity failures.
