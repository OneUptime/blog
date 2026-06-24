# How to Use Ansible Network Resource Modules for Idempotent Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Network Automation, Resource Modules, Idempotent, Cisco IOS, BGP, VLAN

Description: Learn how to use Ansible network resource modules to manage network device configuration idempotently, including interfaces, VLANs, BGP, and ACLs on Cisco IOS and other platforms.

---

Ansible network resource modules provide a structured, idempotent way to manage network configuration using common `state` parameters such as `merged`, `replaced`, `overridden`, `deleted`, and `gathered`.

Resource Module States

| State | Behavior |
|-------|----------|
| `merged` | Add/update only specified config |
| `replaced` | Replace the specified resource config subsection |
| `overridden` | Replace all existing config for the resource |
| `deleted` | Remove specified config and restore defaults where applicable |
| `gathered` | Read config into structured data returned by the module |

## Managing Interfaces (cisco.ios.ios_interfaces)

```yaml
- name: Configure interfaces
  cisco.ios.ios_interfaces:
    config:
      - name: GigabitEthernet0/1
        description: "Uplink to core"
        enabled: true
        speed: "1000"
        duplex: full
      - name: GigabitEthernet0/2
        description: "Server VLAN"
        enabled: true
    state: merged
```

## Managing VLANs (cisco.ios.ios_vlans)

```yaml
- name: Ensure VLANs exist
  cisco.ios.ios_vlans:
    config:
      - vlan_id: 10
        name: Management
        state: active
      - vlan_id: 20
        name: Servers
        state: active
      - vlan_id: 100
        name: Guest
        state: active
    state: merged
```

## Managing BGP (cisco.ios.ios_bgp_global)

```yaml
- name: Configure BGP
  cisco.ios.ios_bgp_global:
    config:
      as_number: "65001"
      router_id:
        address: 10.0.0.1
      neighbors:
        - neighbor_address: 10.0.0.2
          remote_as: "65100"
          description: "Upstream ISP"
          activate: true
    state: merged
```

## Gathering Existing Configuration

```yaml
- name: Gather current interface config
  cisco.ios.ios_interfaces:
    state: gathered
  register: current_interfaces

- name: Show gathered config
  debug:
    var: current_interfaces.gathered
```

## Deleting Configuration

```yaml
- name: Remove VLAN 100
  cisco.ios.ios_vlans:
    config:
      - vlan_id: 100
    state: deleted
```

## Complete Playbook Example

```yaml
---
- name: Configure network device
  hosts: cisco_switches
  gather_facts: false
  collections:
    - cisco.ios

  tasks:
    - name: Configure VLANs
      ios_vlans:
        config:
          - vlan_id: 10
            name: Management
          - vlan_id: 20
            name: Production
        state: merged

    - name: Configure L3 interfaces
      ios_l3_interfaces:
        config:
          - name: Vlan10
            ipv4:
              - address: 10.10.0.1/24
        state: merged
```

## Key Takeaways

- Network resource modules are idempotent: re-running a playbook with `merged` only changes what differs.
- Use `gathered` state to pull existing config into structured data you can register and inspect before making changes.
- `replaced` updates only the specified resource subsection, while `overridden` replaces the full resource definition and `merged` only touches specified items.
- Install collections with `ansible-galaxy collection install cisco.ios` before using Cisco IOS modules.
