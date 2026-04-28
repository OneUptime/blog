# How to Understand the A Flag in Prefix Information Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Prefix Information, A Flag, SLAAC, RFC 4861

Description: Understand the A (Autonomous) flag in the NDP Prefix Information option, how it controls SLAAC address formation, and how it interacts with DHCPv6 deployment.

## Introduction

The A (Autonomous Address Configuration) flag is a single bit in the Prefix Information option within Router Advertisements. When A=1, hosts may use the advertised prefix to autonomously form an IPv6 address using SLAAC. When A=0, the prefix is still advertised as on-link (if L=1) but hosts should NOT form a SLAAC address from it. This flag is critical for controlling SLAAC behavior, especially in deployments that use DHCPv6 for address assignment.

## Prefix Information Option Format

```text
NDP Prefix Information Option:

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type = 3  |    Length = 4 |  Prefix Length|L|A| Reserved1 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Valid Lifetime                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Preferred Lifetime                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           Reserved2                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                            Prefix                             +
|                        (128 bits)                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

L flag (On-Link):
  1 = The prefix identifies an on-link subnet
  0 = No on-link determination (must be done via other means)

A flag (Autonomous):
  1 = Hosts may form SLAAC addresses from this prefix
  0 = Hosts must NOT form SLAAC addresses from this prefix
```

## A Flag Use Cases

```text
A=1, L=1 (typical SLAAC configuration):
  Hosts form SLAAC addresses using the prefix
  Prefix is on-link (direct routes to prefix)
  No DHCPv6 needed for address assignment
  Use when: Pure SLAAC deployment

A=0, L=1 (DHCPv6 deployment with on-link prefix):
  Hosts do NOT form SLAAC addresses
  Prefix is still on-link (routing works)
  Hosts use DHCPv6 (if M=1 in RA) for addresses
  Use when: Enterprise DHCPv6 with no SLAAC fallback

A=1, L=0 (unusual):
  Hosts form SLAAC addresses
  No on-link statement (RA makes no claim about on/off-link)
  Rarely used; can cause asymmetric routing issues

A=0, L=0:
  No SLAAC, no on-link
  Essentially an informational prefix only
```

## Configuring A Flag in radvd

```bash
# SLAAC enabled (A=1) - default behavior

sudo tee /etc/radvd.conf << 'EOF'
interface eth0 {
    AdvSendAdvert on;
    AdvManagedFlag off;

    prefix 2001:db8::/64 {
        AdvOnLink on;       # L = 1
        AdvAutonomous on;   # A = 1: hosts may use SLAAC
        AdvValidLifetime 2592000;
        AdvPreferredLifetime 604800;
    };
};
EOF

# DHCPv6 only - disable SLAAC (A=0)
sudo tee /etc/radvd.conf << 'EOF'
interface eth0 {
    AdvSendAdvert on;
    AdvManagedFlag on;       # M = 1: use DHCPv6

    prefix 2001:db8::/64 {
        AdvOnLink on;        # L = 1: prefix is on-link
        AdvAutonomous off;   # A = 0: NO SLAAC addresses
        AdvValidLifetime 2592000;
        AdvPreferredLifetime 604800;
    };
};
EOF

sudo systemctl restart radvd
```

## Checking A Flag in Packet Captures

```bash
# Capture RA and look for Prefix Information option flags
sudo tcpdump -i eth0 -vv "icmp6 and ip6[40] == 134"

# In verbose output, look for:
# prefix info option (3), length 32 (4): 2001:db8::/64, Flags [onlink,auto]
#   ↑ "auto" = A=1 (Autonomous)
#   ↑ "onlink" = L=1 (On-Link)

# With A=0, L=1:
# prefix info option (3), length 32 (4): 2001:db8::/64, Flags [onlink]
#   ↑ No "auto" = A=0

# Verify hosts are NOT forming SLAAC addresses when A=0
ip -6 addr show eth0
# With A=0, should see only link-local and DHCPv6-assigned addresses
# No 2001:db8::-based addresses formed by SLAAC
```

## Preventing Dual Addresses (SLAAC + DHCPv6)

```bash
# Common problem: both A=1 SLAAC and M=1 DHCPv6 give hosts two addresses
# Solution 1: Set A=0 in radvd when using DHCPv6

# Solution 2: Check for duplicate addresses on a host
ip -6 addr show eth0
# If you see both SLAAC and DHCPv6 addresses on the same prefix: A=1 with M=1

# On Linux: accept_ra_pinfo controls if SLAAC is used regardless of A flag
cat /proc/sys/net/ipv6/conf/eth0/accept_ra_pinfo
# 0 = ignore prefix info (never SLAAC)
# 1 = respect A flag in prefix info (default)

# Disable SLAAC on a specific interface (ignore A flag)
sudo sysctl -w net.ipv6.conf.eth0.accept_ra_pinfo=0
```

## Conclusion

The A flag in Prefix Information options is the per-prefix control for SLAAC address formation. A=1 enables SLAAC, A=0 disables it. When deploying stateful DHCPv6, always set A=0 in prefix info and M=1 in the RA flags to ensure hosts use DHCPv6 exclusively for address assignment. Leaving A=1 while using M=1 results in hosts having both SLAAC and DHCPv6 addresses on the same prefix, which may cause unexpected routing and firewall policy issues.
