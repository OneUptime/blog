# How to Configure OSPF on a Firewall (pfSense, Palo Alto, Fortinet)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Firewall, pfSense, Palo Alto, Fortinet, IPv4, Routing, Configuration

Description: Learn how to configure OSPF on firewall platforms including pfSense with FRR, Palo Alto Networks, and Fortinet FortiGate to integrate them into an OSPF routing domain.

---

Firewalls often need to participate in OSPF to dynamically learn and advertise routes without maintaining static routing tables. This guide covers OSPF configuration on three common firewall platforms.

## pfSense with FRR

### Enable FRR and Configure OSPF

```text
Services → FRR Global/Zebra:
  Enable FRR: ✓
  Default Router ID: 10.0.0.1

Services → FRR OSPF:
  Enable: ✓
  Router ID: 10.0.0.1
  Area: 0.0.0.0 (backbone)
```

### Add OSPF Networks via the Web UI

```text
FRR OSPF → Networks:
  Network: 10.0.0.0/30, Area: 0.0.0.0    ← WAN transit link
  Network: 192.168.1.0/24, Area: 0.0.0.1  ← LAN
```

### Or Use Raw FRR Config (SSH)

```bash
vtysh << 'EOF'
conf t
router ospf
  ospf router-id 10.0.0.1
  network 10.0.0.0/30 area 0
  network 192.168.1.0/24 area 1
  passive-interface LAN    ! Don't send hellos on the LAN interface
EOF
```

## Palo Alto Networks (PAN-OS)

### Enable OSPF on a Virtual Router

```text
Network → Virtual Routers → [Your VR] → OSPF:
  Enable: ✓
  Router ID: 10.0.0.2

Add an Area:
  Area ID: 0.0.0.0
  Type: Normal

Add an Interface to the Area:
  Interface: ethernet1/1
  Metric: 10
  Priority: 1
  Hello Interval: 10s
  Dead Counts: 4
```

### CLI Configuration (PAN-OS)

```bash
# Commit the following candidate configuration via CLI

set network virtual-router vr1 protocol ospf enable yes
set network virtual-router vr1 protocol ospf router-id 10.0.0.2
set network virtual-router vr1 protocol ospf area 0.0.0.0 type normal
set network virtual-router vr1 protocol ospf area 0.0.0.0 interface ethernet1/1 enable yes
set network virtual-router vr1 protocol ospf area 0.0.0.0 interface ethernet1/1 metric 10

commit
```

### Firewall Policy for OSPF Traffic (PAN-OS)

```text
Policy → Security:
Add Rule:
  Name: Allow-OSPF
  Source Zone: Trust
  Destination Zone: Trust
  Application: ospf
  Action: Allow
```

## Fortinet FortiGate

### Enable OSPF via CLI

```text
# FortiOS CLI
config router ospf
    set router-id 10.0.0.3
    set auto-cost-ref-bandwidth 1000

    config area
        edit 0.0.0.0
        next
    end

    config ospf-interface
        edit "WAN-OSPF"
            set interface "wan1"
            set hello-interval 10
            set dead-interval 40
        next
    end

    config network
        edit 1
            set prefix 10.0.0.0 255.255.255.252
            set area 0.0.0.0
        next
    end
end
```

### Verify on FortiGate

```text
get router info ospf neighbor
get router info ospf interface
get router info routing-table ospf
```

## Key Takeaways

- pfSense requires the FRR package for OSPF; configure via the web UI or `vtysh`.
- Palo Alto requires an explicit security policy to allow OSPF (application `ospf`) between zones.
- FortiGate uses `config router ospf` with `network` statements similar to Cisco IOS.
- Always add `passive-interface` for stub networks to prevent OSPF hellos on end-user segments.
