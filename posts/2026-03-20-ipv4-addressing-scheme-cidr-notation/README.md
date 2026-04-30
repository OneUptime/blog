# How to Plan an IPv4 Addressing Scheme Using CIDR Notation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, CIDR, Subnetting, Network Design, IPAM, Addressing

Description: Design a scalable IPv4 addressing scheme using CIDR notation, covering allocation of private address space, subnet sizing, and hierarchical planning.

A well-planned IPv4 addressing scheme prevents future headaches, simplifies routing, and enables clean delegation. CIDR (Classless Inter-Domain Routing) gives you flexible subnet sizing to match your actual needs.

## CIDR Notation Refresher

```text
10.100.1.0/24 means:
- Network: 10.100.1.0
- Mask: /24 = 255.255.255.0
- Usable hosts: 254 (256 - network - broadcast)
- Range: 10.100.1.1 – 10.100.1.254

Quick reference:
/30 = 2 hosts     (point-to-point links)
/29 = 6 hosts
/28 = 14 hosts
/27 = 30 hosts
/26 = 62 hosts
/25 = 126 hosts
/24 = 254 hosts   (standard LAN)
/23 = 510 hosts
/22 = 1022 hosts
/16 = 65,534 hosts (large site)
```

## Step 1: Choose Your Private IP Range

RFC 1918 private ranges:

```text
10.0.0.0/8       - 16,777,216 addresses (large enterprises)
172.16.0.0/12    - 1,048,576 addresses (medium enterprises)
192.168.0.0/16   - 65,536 addresses (small offices/labs)
```

For most enterprises, `10.0.0.0/8` provides enough space for hierarchy.

## Step 2: Design a Hierarchical Structure

```text
10.0.0.0/8         ← Enterprise summary
├── 10.1.0.0/16    ← Site: New York
│   ├── 10.1.1.0/24   ← VLAN 1: Servers
│   ├── 10.1.2.0/24   ← VLAN 2: Workstations
│   └── 10.1.3.0/24   ← VLAN 3: Management
├── 10.2.0.0/16    ← Site: London
│   ├── 10.2.1.0/24   ← VLAN 1: Servers
│   └── 10.2.2.0/24   ← VLAN 2: Workstations
└── 10.100.0.0/16  ← Data Center
    ├── 10.100.1.0/24  ← Web Tier
    ├── 10.100.2.0/24  ← App Tier
    └── 10.100.3.0/24  ← DB Tier
```

## Step 3: Sizing Subnets

```bash
# Calculate subnet sizes using ipcalc or manual calculation

# Install ipcalc

sudo apt install ipcalc -y

# Show details for a subnet
ipcalc 10.100.1.0/24
# Address:   10.100.1.0
# Netmask:   255.255.255.0 = 24
# Network:   10.100.1.0/24
# HostMin:   10.100.1.1
# HostMax:   10.100.1.254
# Hosts/Net: 254

# Find the right subnet size for 30 hosts
# /27 provides 32 total addresses and 30 usable hosts
ipcalc 10.100.1.0/27
# Network:   10.100.1.0/27
# HostMin:   10.100.1.1
# HostMax:   10.100.1.30
# Hosts/Net: 30
```

## Step 4: Reserve Ranges

Always reserve space for growth:

```text
10.0.0.0/8 allocation plan:
10.0.0.0/10                   : Office sites (50 sites × /16 each, with headroom)
10.96.0.0/12                  : Data centers (11 × /16 each, with headroom)
10.200.0.0/16                 : Cloud VPCs
10.250.0.0/16                 : VPN ranges
10.255.0.0/16                 : Management / OOB
```

## Step 5: Document Your Scheme

```bash
# Sample documentation structure
cat > ip-plan.md << 'EOF'
# Corporate IPv4 Addressing Plan

## Summary Block: 10.0.0.0/8

### Sites (10.0.0.0/10 = 10.0.0.0 - 10.63.255.255)
- 10.1.0.0/16: New York office
- 10.2.0.0/16: London office

### Per-Site VLAN assignments:
- .1.0/24: Server VLAN
- .2.0/24: Workstation VLAN
- .3.0/24: Management VLAN

### Data Centers (10.96.0.0/12 = 10.96.0.0 - 10.111.255.255)
- 10.100.0.0/16: NYC-DC1
- 10.101.0.0/16: NYC-DC2
EOF
```

A hierarchical addressing plan that reserves contiguous blocks for each function makes it possible to write simple summary routes and dramatically simplifies firewall rules and routing policies.
