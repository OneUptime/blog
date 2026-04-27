# How to Troubleshoot OSPF Subnet Mask Mismatches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Troubleshooting, IPv4, Subnet Mask, Networking, FRR, Cisco

Description: Learn how to diagnose and fix OSPF neighbor adjacency failures caused by subnet mask mismatches on point-to-point and broadcast links.

---

OSPF requires that two routers on the same broadcast or NBMA link agree on the subnet mask before forming an adjacency. When the masks do not match, the receiving router silently discards the Hello packet (per RFC 2328 §10.5) and the neighbor never appears, staying in `Down` state.

## How Subnet Mask Mismatches Break OSPF

OSPF Hello packets include the interface's network mask. When two routers have different masks on the same link, they consider themselves on different networks and refuse to form an adjacency.

```text
Router A: 192.168.1.1/24  → Hello contains mask 255.255.255.0
Router B: 192.168.1.2/30  → Hello contains mask 255.255.255.252
                          ↑ Mismatch! Adjacency fails.
```

## Symptoms

- OSPF neighbor never forms; the remote router does not appear in `show ip ospf neighbor`.
- FRR log message: `Packet 192.168.1.2 [Hello:RECV]: NetworkMask mismatch on eth0 (configured prefix length is 24, but hello packet indicates 30).`
- `show ip ospf neighbor` shows no neighbor for the expected link.

## Diagnosing the Mismatch

### FRR

```bash
# Show current OSPF neighbors and their state

vtysh -c "show ip ospf neighbor"

# If no neighbor appears for a known link, check interface OSPF settings
vtysh -c "show ip ospf interface eth0"
# Look for: "Network Address 192.168.1.0/24" - compare with the remote router

# Enable OSPF debugging to see Hello packet details
vtysh << 'EOF'
debug ospf packet hello recv detail
EOF

# View debug output in syslog or the FRR log
tail -f /var/log/frr/frr.log | grep -i "NetworkMask mismatch"
```

### Cisco IOS

```text
debug ip ospf adj
show ip ospf interface GigabitEthernet0/0
! Look for: Internet Address 192.168.1.1/24, Area 0
```

## Common Causes

1. **Typo in prefix length**: One router has `/24`, the other has `/25`.
2. **Secondary addresses**: OSPF is sending hellos from a secondary IP with a different mask.
3. **Loopback assigned as stub**: OSPF treats loopbacks as /32 by default.
4. **VLAN misconfiguration**: The VLAN config on a switch assigns a different network to each router's port.

## Fixing the Mismatch

```bash
# FRR: Correct the interface IP and mask
vtysh << 'EOF'
conf t
interface eth0
  no ip address 192.168.1.2/30
  ip address 192.168.1.2/24
EOF

# Verify the fix
vtysh -c "show interface eth0"
vtysh -c "show ip ospf interface eth0"

# Check neighbor adjacency
vtysh -c "show ip ospf neighbor"
# State should progress to: Init → 2-Way → ExStart → Exchange → Loading → Full
```

## Special Case: OSPF on Unnumbered Interfaces

Point-to-point links can use `ip ospf network point-to-point` to skip the mask check:

```text
interface eth1
  ip ospf network point-to-point
! OSPF will not check subnet masks on this interface
```

## Key Takeaways

- Both routers on an OSPF link must have identical subnet masks for adjacency to form.
- Use `show ip ospf interface` to compare the mask OSPF is advertising vs. what it should be.
- `debug ospf packet hello recv detail` (FRR) or `debug ip ospf adj` (Cisco) reveals mask mismatch errors in real time.
- Use `ip ospf network point-to-point` on transit links to bypass mask checking.
