# How to Use Ansible to Configure LLDP/CDP on Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, LLDP, CDP, Network Discovery

Description: Automate LLDP and CDP configuration on network devices with Ansible for consistent neighbor discovery and network topology documentation.

---

LLDP (Link Layer Discovery Protocol) and CDP (Cisco Discovery Protocol) are neighbor discovery protocols that let network devices advertise their identity to directly connected peers. They are essential for building network topology maps, troubleshooting connectivity, and verifying cable connections. But discovery protocols also carry security implications since they broadcast device information to anyone on the wire.

Ansible lets you manage LLDP and CDP configuration consistently, enabling them where you need topology data and disabling them on ports that face untrusted networks.

## Understanding LLDP vs CDP

**CDP** is Cisco proprietary and runs on Cisco devices by default. It shares detailed information including device model, IOS version, IP addresses, and VLAN info.

**LLDP** is an IEEE standard (802.1AB) supported across vendors. It provides interoperability between Cisco, Arista, Juniper, and other platforms.

In a mixed-vendor environment, LLDP is the way to go. In a Cisco-only shop, CDP works fine, but running both gives you the most complete picture.

## Configuration Variables

```yaml
# group_vars/all_network/discovery.yml - Discovery protocol settings
---
discovery_config:
  # Global CDP settings
  cdp:
    enabled: true
    timer: 60
    holdtime: 180

  # Global LLDP settings
  lldp:
    enabled: true
    holdtime: 120
    timer: 30
    reinit: 2

  # Ports where discovery should be DISABLED (security)
  disable_on_ports:
    - type: access_user
      reason: "User-facing ports should not leak device info"
    - type: external
      reason: "WAN-facing ports should not advertise to ISP"

  # LLDP TLVs to advertise
  lldp_tlvs:
    - management-address
    - port-description
    - system-capabilities
    - system-description
    - system-name
```

## Configuring CDP with Ansible

Use the `ios_config` module for CDP global and interface-level settings.

```yaml
# configure_cdp.yml - Configure CDP globally and per-interface
---
- name: Configure CDP
  hosts: ios_devices
  gather_facts: false
  connection: network_cli

  tasks:
    # Enable CDP globally
    - name: Enable CDP globally
      cisco.ios.ios_config:
        lines:
          - cdp run
          - "cdp timer {{ discovery_config.cdp.timer }}"
          - "cdp holdtime {{ discovery_config.cdp.holdtime }}"
      when: discovery_config.cdp.enabled

    # Disable CDP globally if not wanted
    - name: Disable CDP globally
      cisco.ios.ios_config:
        lines:
          - no cdp run
      when: not discovery_config.cdp.enabled

    # Disable CDP on user-facing access ports
    - name: Disable CDP on user ports
      cisco.ios.ios_config:
        lines:
          - no cdp enable
        parents: "interface {{ item }}"
      loop: "{{ user_facing_ports | default([]) }}"

    # Disable CDP on WAN interfaces
    - name: Disable CDP on WAN ports
      cisco.ios.ios_config:
        lines:
          - no cdp enable
        parents: "interface {{ item }}"
      loop: "{{ wan_interfaces | default([]) }}"
```

## Configuring LLDP with Ansible

The `ios_lldp_global` and `ios_lldp_interfaces` resource modules provide declarative LLDP management.

```yaml
# configure_lldp.yml - Configure LLDP globally and per-interface
---
- name: Configure LLDP
  hosts: ios_devices
  gather_facts: false
  connection: network_cli

  tasks:
    # Configure LLDP global settings
    - name: Configure LLDP global parameters
      cisco.ios.ios_lldp_global:
        config:
          holdtime: "{{ discovery_config.lldp.holdtime }}"
          timer: "{{ discovery_config.lldp.timer }}"
          reinit: "{{ discovery_config.lldp.reinit }}"
          enabled: true
          tlv_select:
            management_address: true
            port_description: true
            system_capabilities: true
            system_description: true
            system_name: true
        state: merged
      when: discovery_config.lldp.enabled

    # Disable LLDP on specific interfaces
    - name: Disable LLDP on user-facing ports
      cisco.ios.ios_lldp_interfaces:
        config:
          - name: "{{ item }}"
            receive: false
            transmit: false
        state: merged
      loop: "{{ user_facing_ports | default([]) }}"

    # Enable LLDP on infrastructure ports
    - name: Enable LLDP on uplink ports
      cisco.ios.ios_lldp_interfaces:
        config:
          - name: "{{ item }}"
            receive: true
            transmit: true
        state: merged
      loop: "{{ uplink_ports | default([]) }}"
```

## Per-Switch Port Classification

Define which ports are infrastructure (LLDP/CDP on) and which are user-facing (LLDP/CDP off) in host variables.

```yaml
# host_vars/access-sw01.yml - Port classification for discovery protocols
---
# Infrastructure ports - keep LLDP/CDP enabled
uplink_ports:
  - GigabitEthernet0/23
  - GigabitEthernet0/24

# Server ports - keep LLDP enabled for inventory
server_ports:
  - GigabitEthernet0/1
  - GigabitEthernet0/2
  - GigabitEthernet0/3
  - GigabitEthernet0/4

# User-facing ports - disable LLDP/CDP for security
user_facing_ports:
  - GigabitEthernet0/5
  - GigabitEthernet0/6
  - GigabitEthernet0/7
  - GigabitEthernet0/8
  - GigabitEthernet0/9
  - GigabitEthernet0/10

# WAN-facing ports - always disable
wan_interfaces: []
```

```yaml
# apply_discovery_policy.yml - Apply discovery protocol policy per port type
---
- name: Apply discovery protocol policy
  hosts: ios_switches
  gather_facts: false
  connection: network_cli

  tasks:
    # Infrastructure ports: both protocols enabled
    - name: Enable CDP and LLDP on uplinks
      cisco.ios.ios_config:
        lines:
          - cdp enable
          - lldp transmit
          - lldp receive
        parents: "interface {{ item }}"
      loop: "{{ uplink_ports | default([]) }}"

    # Server ports: LLDP only (for multi-vendor server NICs)
    - name: Enable LLDP on server ports, disable CDP
      cisco.ios.ios_config:
        lines:
          - no cdp enable
          - lldp transmit
          - lldp receive
        parents: "interface {{ item }}"
      loop: "{{ server_ports | default([]) }}"

    # User ports: both protocols disabled
    - name: Disable both protocols on user ports
      cisco.ios.ios_config:
        lines:
          - no cdp enable
          - no lldp transmit
          - no lldp receive
        parents: "interface {{ item }}"
      loop: "{{ user_facing_ports | default([]) }}"
```

## Gathering Neighbor Data for Topology Mapping

Use LLDP and CDP neighbor information to build a network topology map.

```yaml
# gather_neighbors.yml - Collect neighbor data for topology documentation
---
- name: Gather neighbor information
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    # Gather CDP neighbors
    - name: Get CDP neighbors
      cisco.ios.ios_command:
        commands:
          - show cdp neighbors detail
      register: cdp_neighbors
      ignore_errors: true

    # Gather LLDP neighbors
    - name: Get LLDP neighbors
      cisco.ios.ios_command:
        commands:
          - show lldp neighbors detail
      register: lldp_neighbors
      ignore_errors: true

    # Parse CDP data using cli_parse
    - name: Parse CDP neighbors
      ansible.utils.cli_parse:
        text: "{{ cdp_neighbors.stdout[0] | default('') }}"
        parser:
          name: ansible.netcommon.ntc_templates
          command: show cdp neighbors detail
          os: cisco_ios
      register: parsed_cdp
      ignore_errors: true

    # Parse LLDP data
    - name: Parse LLDP neighbors
      ansible.utils.cli_parse:
        text: "{{ lldp_neighbors.stdout[0] | default('') }}"
        parser:
          name: ansible.netcommon.ntc_templates
          command: show lldp neighbors detail
          os: cisco_ios
      register: parsed_lldp
      ignore_errors: true

    # Combine and store neighbor data
    - name: Build topology data
      ansible.builtin.set_fact:
        device_topology:
          hostname: "{{ inventory_hostname }}"
          cdp_neighbors: "{{ parsed_cdp.parsed | default([]) }}"
          lldp_neighbors: "{{ parsed_lldp.parsed | default([]) }}"

    - name: Save topology data
      ansible.builtin.copy:
        content: "{{ device_topology | to_nice_json }}"
        dest: "topology/{{ inventory_hostname }}.json"
      delegate_to: localhost

# Generate a consolidated topology report
- name: Generate topology report
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Build topology summary
      ansible.builtin.template:
        src: templates/topology_report.j2
        dest: "topology/network_topology.txt"
```

## Verification Playbook

```yaml
# verify_discovery.yml - Validate LLDP/CDP configuration and neighbor counts
---
- name: Verify discovery protocols
  hosts: all_network
  gather_facts: false
  connection: network_cli

  tasks:
    # Check CDP status
    - name: Get CDP status
      cisco.ios.ios_command:
        commands:
          - show cdp
      register: cdp_status
      ignore_errors: true

    - name: Display CDP status
      ansible.builtin.debug:
        msg: "CDP: {{ 'enabled' if 'enabled' in (cdp_status.stdout[0] | default('') | lower) else 'disabled' }}"

    # Check LLDP status
    - name: Get LLDP status
      cisco.ios.ios_command:
        commands:
          - show lldp
      register: lldp_status
      ignore_errors: true

    - name: Display LLDP status
      ansible.builtin.debug:
        msg: "LLDP: {{ 'enabled' if 'active' in (lldp_status.stdout[0] | default('') | lower) else 'disabled' }}"

    # Count neighbors
    - name: Count CDP neighbors
      cisco.ios.ios_command:
        commands:
          - show cdp neighbors | count
      register: cdp_count
      ignore_errors: true

    - name: Count LLDP neighbors
      cisco.ios.ios_command:
        commands:
          - show lldp neighbors | count
      register: lldp_count
      ignore_errors: true

    - name: Report neighbor counts
      ansible.builtin.debug:
        msg: >
          {{ inventory_hostname }}:
          CDP neighbors: {{ cdp_count.stdout[0] | default('N/A') }},
          LLDP neighbors: {{ lldp_count.stdout[0] | default('N/A') }}

    # Verify no discovery protocols on user ports
    - name: Check user ports for discovery leaks
      cisco.ios.ios_command:
        commands:
          - "show lldp interface {{ item }}"
      register: user_port_lldp
      loop: "{{ user_facing_ports | default([]) }}"
      ignore_errors: true

    - name: Flag ports with LLDP enabled that should not have it
      ansible.builtin.debug:
        msg: "SECURITY: LLDP is active on user port {{ item.item }}"
      loop: "{{ user_port_lldp.results | default([]) }}"
      when:
        - item is succeeded
        - "'Tx' in item.stdout[0] | default('')"
```

Discovery protocol management with Ansible gives you the best of both worlds. You get full topology visibility where you need it (infrastructure and server ports) while maintaining security on untrusted ports (user-facing and external). Automate the configuration, gather neighbor data for topology maps, and audit your settings regularly to make sure nothing has drifted.
