# How to Use Ansible to Configure VLANs on Network Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, VLANs, Networking, Switch Configuration

Description: Learn how to automate VLAN creation, modification, and assignment across network switches using Ansible resource modules and playbooks.

---

VLANs are the bread and butter of network segmentation. Every enterprise network uses them, and managing VLANs across dozens or hundreds of switches by hand is one of those tasks that screams for automation. Ansible makes VLAN management straightforward with its network resource modules, letting you define your VLAN scheme once and push it consistently to every switch in your infrastructure.

This post walks through VLAN automation with Ansible, covering everything from basic VLAN creation to trunk configuration and multi-platform deployments.

## Inventory Setup

Before writing playbooks, set up your inventory with the correct connection parameters.

```yaml
# inventory/switches.yml - Switch inventory with connection details
---
all:
  children:
    ios_switches:
      hosts:
        access-sw01:
          ansible_host: 10.1.1.10
        access-sw02:
          ansible_host: 10.1.1.11
        dist-sw01:
          ansible_host: 10.1.1.20
      vars:
        ansible_connection: ansible.netcommon.network_cli
        ansible_network_os: cisco.ios.ios
        ansible_user: admin
        ansible_password: "{{ vault_ios_password }}"
        ansible_become: true
        ansible_become_method: enable
        ansible_become_password: "{{ vault_enable_password }}"
```

## Creating VLANs with Resource Modules

The `ios_vlans` resource module is the cleanest way to manage VLANs on Cisco IOS switches. It is declarative, idempotent, and handles the CLI commands for you.

```yaml
# create_vlans.yml - Define and create VLANs across all switches
---
- name: Configure VLANs on all switches
  hosts: ios_switches
  gather_facts: false

  vars:
    # Define the VLAN scheme in one place
    standard_vlans:
      - vlan_id: 10
        name: MANAGEMENT
        state: active
      - vlan_id: 20
        name: SERVERS
        state: active
      - vlan_id: 30
        name: WORKSTATIONS
        state: active
      - vlan_id: 40
        name: VOIP
        state: active
      - vlan_id: 50
        name: PRINTERS
        state: active
      - vlan_id: 99
        name: NATIVE_VLAN
        state: active
      - vlan_id: 999
        name: BLACKHOLE
        state: suspend

  tasks:
    - name: Create standard VLANs
      cisco.ios.ios_vlans:
        config: "{{ standard_vlans }}"
        state: merged
      register: vlan_result

    - name: Show what changed
      ansible.builtin.debug:
        var: vlan_result.commands
      when: vlan_result.changed
```

The `merged` state adds or updates the VLANs you define without touching any others. If VLAN 10 already exists with the name "MANAGEMENT", no changes are made for that VLAN. If it exists but with a different name, the name gets updated.

## Gathering Current VLAN State

Before making changes, it is often useful to check what VLANs already exist on a switch.

```yaml
# gather_vlans.yml - Pull current VLAN configuration from switches
---
- name: Gather current VLAN configuration
  hosts: ios_switches
  gather_facts: false

  tasks:
    - name: Get current VLANs
      cisco.ios.ios_vlans:
        state: gathered
      register: current_vlans

    - name: Display VLAN list
      ansible.builtin.debug:
        msg: "VLAN {{ item.vlan_id }}: {{ item.name | default('unnamed') }} ({{ item.state }})"
      loop: "{{ current_vlans.gathered }}"
```

## Assigning VLANs to Access Ports

Creating VLANs is only half the job. You also need to assign them to switch ports. The `ios_l2_interfaces` module handles access and trunk port configuration.

```yaml
# assign_access_ports.yml - Configure access ports with VLAN assignments
---
- name: Configure access ports
  hosts: access-sw01
  gather_facts: false

  tasks:
    # Configure a range of ports as access ports in the workstation VLAN
    - name: Set access ports for workstations
      cisco.ios.ios_l2_interfaces:
        config:
          - name: GigabitEthernet0/1
            mode: access
            access:
              vlan: 30
          - name: GigabitEthernet0/2
            mode: access
            access:
              vlan: 30
          - name: GigabitEthernet0/3
            mode: access
            access:
              vlan: 30
          - name: GigabitEthernet0/4
            mode: access
            access:
              vlan: 30
        state: merged

    # Configure VoIP ports with both data and voice VLANs
    - name: Set ports with voice VLAN
      cisco.ios.ios_l2_interfaces:
        config:
          - name: GigabitEthernet0/5
            mode: access
            access:
              vlan: 30
            voice:
              vlan: 40
          - name: GigabitEthernet0/6
            mode: access
            access:
              vlan: 30
            voice:
              vlan: 40
        state: merged
```

## Configuring Trunk Ports

Uplinks between switches need trunk ports that carry multiple VLANs. Here is how to configure trunks with specific allowed VLANs.

```yaml
# configure_trunks.yml - Set up trunk ports between switches
---
- name: Configure trunk ports
  hosts: ios_switches
  gather_facts: false

  tasks:
    # Configure uplink trunk with specific allowed VLANs
    - name: Configure trunk to distribution switch
      cisco.ios.ios_l2_interfaces:
        config:
          - name: GigabitEthernet0/24
            mode: trunk
            trunk:
              allowed_vlans: "10,20,30,40,50,99"
              native_vlan: 99
              encapsulation: dot1q
        state: merged

    # Configure inter-switch link trunks
    - name: Configure stacking trunk
      cisco.ios.ios_l2_interfaces:
        config:
          - name: GigabitEthernet0/23
            mode: trunk
            trunk:
              allowed_vlans: "10,20,30,40,50,99"
              native_vlan: 99
              encapsulation: dot1q
        state: merged
```

## Using Variables for Scalable VLAN Management

Hard-coding VLAN assignments in playbooks gets unwieldy fast. A better approach is to define port assignments in host variables and use loops.

```yaml
# host_vars/access-sw01.yml - Per-switch port VLAN assignments
---
access_ports:
  - name: GigabitEthernet0/1
    vlan: 30
    description: "Desk 101"
  - name: GigabitEthernet0/2
    vlan: 30
    description: "Desk 102"
  - name: GigabitEthernet0/3
    vlan: 20
    description: "Server Rack A"
  - name: GigabitEthernet0/4
    vlan: 20
    description: "Server Rack B"

voice_ports:
  - name: GigabitEthernet0/5
    data_vlan: 30
    voice_vlan: 40
    description: "Phone Desk 101"

trunk_ports:
  - name: GigabitEthernet0/23
    allowed_vlans: "10,20,30,40,50,99"
    native_vlan: 99
    description: "Uplink to dist-sw01"

unused_ports:
  - GigabitEthernet0/20
  - GigabitEthernet0/21
  - GigabitEthernet0/22
```

Then use a playbook that reads these variables.

```yaml
# configure_all_ports.yml - Apply port configs from host variables
---
- name: Configure all switch ports from variables
  hosts: ios_switches
  gather_facts: false

  tasks:
    # Configure access ports from host_vars
    - name: Set access port VLANs
      cisco.ios.ios_l2_interfaces:
        config:
          - name: "{{ item.name }}"
            mode: access
            access:
              vlan: "{{ item.vlan }}"
        state: merged
      loop: "{{ access_ports | default([]) }}"

    # Configure voice ports
    - name: Set voice port VLANs
      cisco.ios.ios_l2_interfaces:
        config:
          - name: "{{ item.name }}"
            mode: access
            access:
              vlan: "{{ item.data_vlan }}"
            voice:
              vlan: "{{ item.voice_vlan }}"
        state: merged
      loop: "{{ voice_ports | default([]) }}"

    # Configure trunk ports
    - name: Set trunk port VLANs
      cisco.ios.ios_l2_interfaces:
        config:
          - name: "{{ item.name }}"
            mode: trunk
            trunk:
              allowed_vlans: "{{ item.allowed_vlans }}"
              native_vlan: "{{ item.native_vlan }}"
        state: merged
      loop: "{{ trunk_ports | default([]) }}"

    # Shut down unused ports and put them in the blackhole VLAN
    - name: Secure unused ports
      cisco.ios.ios_l2_interfaces:
        config:
          - name: "{{ item }}"
            mode: access
            access:
              vlan: 999
        state: merged
      loop: "{{ unused_ports | default([]) }}"

    - name: Disable unused ports
      cisco.ios.ios_interfaces:
        config:
          - name: "{{ item }}"
            enabled: false
        state: merged
      loop: "{{ unused_ports | default([]) }}"
```

## Enforcing VLAN Consistency with Overridden State

If you want to make sure switches have exactly the VLANs you define and no extras, use the `overridden` state. This removes any VLANs not in your definition.

```yaml
# enforce_vlans.yml - Ensure only defined VLANs exist on switches
---
- name: Enforce VLAN standard
  hosts: ios_switches
  gather_facts: false

  vars:
    authorized_vlans:
      - vlan_id: 1
        name: default
        state: active
      - vlan_id: 10
        name: MANAGEMENT
        state: active
      - vlan_id: 20
        name: SERVERS
        state: active
      - vlan_id: 30
        name: WORKSTATIONS
        state: active
      - vlan_id: 40
        name: VOIP
        state: active
      - vlan_id: 99
        name: NATIVE_VLAN
        state: active
      - vlan_id: 999
        name: BLACKHOLE
        state: suspend

  tasks:
    # WARNING: This removes any VLAN not in the list above
    - name: Override VLAN configuration
      cisco.ios.ios_vlans:
        config: "{{ authorized_vlans }}"
        state: overridden
      register: override_result

    - name: Report changes
      ansible.builtin.debug:
        msg: "Commands applied: {{ override_result.commands }}"
      when: override_result.changed
```

## Multi-Platform VLAN Deployment

If your environment has switches from different vendors, you can share the same VLAN definitions and use platform-specific modules.

```yaml
# multi_vendor_vlans.yml - Deploy VLANs across Cisco and Arista switches
---
- name: Deploy VLANs to all switches
  hosts: all_switches
  gather_facts: false

  vars:
    company_vlans:
      - vlan_id: 10
        name: MANAGEMENT
        state: active
      - vlan_id: 20
        name: SERVERS
        state: active
      - vlan_id: 30
        name: USERS
        state: active

  tasks:
    - name: Configure VLANs on Cisco IOS
      cisco.ios.ios_vlans:
        config: "{{ company_vlans }}"
        state: merged
      when: ansible_network_os == 'cisco.ios.ios'

    - name: Configure VLANs on Arista EOS
      arista.eos.eos_vlans:
        config: "{{ company_vlans }}"
        state: merged
      when: ansible_network_os == 'arista.eos.eos'

    - name: Configure VLANs on Cisco NX-OS
      cisco.nxos.nxos_vlans:
        config: "{{ company_vlans }}"
        state: merged
      when: ansible_network_os == 'cisco.nxos.nxos'
```

Automating VLANs with Ansible removes the tedium and the inconsistency that comes with manual configuration. Define your VLAN scheme once in variables, push it to every switch with a single playbook run, and know that every switch in your network matches. That kind of consistency is hard to achieve manually, especially as your network grows.
