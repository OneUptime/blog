# How to Plan IPv4 Subnetting for Network Segmentation and Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Network Segmentation, Security, VLAN, Firewall, Zero Trust

Description: Plan IPv4 subnetting for security-driven network segmentation, creating isolated zones for servers, users, DMZ, and management with inter-zone firewall policies.

## Introduction

Network segmentation limits the blast radius of security incidents. Placing workstations, servers, DMZ, and management on separate IPv4 subnets - enforced by firewall rules - prevents lateral movement when any single segment is compromised.

## Security Zone Model

```text
Zone          Trust Level  Subnet           VLAN
────────────────────────────────────────────────────
Internet      Untrusted    -                -
DMZ           Low          10.x.40.0/24     40
User LAN      Medium       10.x.8.0/22      10
Server LAN    High         10.x.20.0/23     20
Database      Very High    10.x.25.0/24     25
Management    Admin only   10.x.99.0/27     99
```

## Inter-Zone Firewall Policy Matrix

```text
FROM \ TO      Internet  DMZ   UserLAN  ServerLAN  Database  Mgmt
──────────────────────────────────────────────────────────────────
Internet       -         ALLOW* DENY     DENY       DENY      DENY
DMZ            ALLOW*    -      DENY     ALLOW*     DENY      DENY
UserLAN        ALLOW     ALLOW  -        ALLOW*     DENY      DENY
ServerLAN      ALLOW     ALLOW  ALLOW*   -          ALLOW*    DENY
Database       DENY      DENY   DENY     ALLOW*     -         DENY
Management     ALLOW     ALLOW  DENY     ALLOW      ALLOW     -

* = specific ports only (not all traffic)
```

## Firewall Rule Examples (pfSense/pf syntax)

```text
# Allow HTTP/HTTPS from DMZ to internet

pass out on $ext_if proto tcp from $dmz_net to any port {80, 443}

# Allow application servers to reach database on port 5432
pass in on $db_if proto tcp from $server_net to $db_net port 5432

# Block all user-to-database direct access
block in on $db_if from $user_net to $db_net

# Allow management subnet to SSH everywhere
pass in on $mgmt_if proto tcp from $mgmt_net to any port 22
```

## Python Segmentation Planner

```python
import ipaddress

ZONES = {
    "DMZ":        ("10.1.40.0/24",  50),
    "UserLAN":    ("10.1.8.0/22",   400),
    "ServerLAN":  ("10.1.20.0/23",  100),
    "Database":   ("10.1.25.0/24",  20),
    "Management": ("10.1.99.0/27",  10),
}

print(f"{'Zone':<12} {'Subnet':<20} {'Devices':>8} {'Usable':>8} {'Util%':>6}")
for zone, (cidr, devices) in ZONES.items():
    net = ipaddress.IPv4Network(cidr)
    usable = net.num_addresses - 2
    print(f"{zone:<12} {cidr:<20} {devices:>8} {usable:>8} "
          f"{devices/usable:>5.0%}")
```

## Micro-Segmentation with ACLs

```cisco
! Restrict routed user VLAN traffic to approved destinations
ip access-list extended USER-VLAN-ACL
 permit ip 10.1.8.0 0.0.3.255 10.1.20.0 0.0.1.255   ! to servers
 permit udp 10.1.8.0 0.0.3.255 host 8.8.8.8 eq 53   ! DNS
 permit tcp 10.1.8.0 0.0.3.255 host 8.8.8.8 eq 53   ! DNS over TCP
 permit tcp 10.1.8.0 0.0.3.255 any eq 80            ! HTTP
 permit tcp 10.1.8.0 0.0.3.255 any eq 443           ! HTTPS
 deny   ip any any log

interface Vlan10
 ip access-group USER-VLAN-ACL in
```

## Zero Trust Overlays

```text
In a Zero Trust model, subnet membership alone does not grant access.
Additional controls:
  - 802.1X authentication before VLAN assignment
  - Certificate-based device authentication
  - Per-flow policy from identity providers (e.g., Okta + Zscaler)
  - Microsegmentation in virtualized or cloud environments (VMware NSX, AWS Security Groups)
```

## Conclusion

Security-driven IPv4 segmentation assigns each trust zone its own subnet, enforces inter-zone firewall policies, and uses ACLs to restrict lateral movement across routed paths. Combine subnet-based segmentation with identity-aware controls for a defense-in-depth architecture.
