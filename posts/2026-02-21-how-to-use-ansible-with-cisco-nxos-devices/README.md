# How to Use Ansible with Cisco NX-OS Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cisco NX-OS, Nexus, Data Center Networking

Description: Automate Cisco Nexus switches running NX-OS with Ansible for data center network configuration, VLAN management, and VPC setup.

---

Cisco Nexus switches running NX-OS are the workhorses of modern data center networks. From top-of-rack access switches to spine-leaf fabrics, NX-OS devices handle the bulk of east-west traffic in enterprise data centers. While NX-OS shares some DNA with IOS, it is a distinct operating system with its own command syntax, features, and automation capabilities.

Ansible's `cisco.nxos` collection provides modules specifically designed for NX-OS. This post covers essential automation patterns for Nexus switches, including VLAN management, VPC configuration, interface setup, and feature management.

## Prerequisites

```bash
# Install the Cisco NX-OS collection
ansible-galaxy collection install cisco.nxos
ansible-galaxy collection install ansible.netcommon
```

```ini
# inventory/nxos-devices.ini
# Cisco Nexus switch inventory
[nxos_spine]
nexus-spine-01 ansible_host=10.0.0.1
nexus-spine-02 ansible_host=10.0.0.2

[nxos_leaf]
nexus-leaf-01 ansible_host=10.0.1.1
nexus-leaf-02 ansible_host=10.0.1.2
nexus-leaf-03 ansible_host=10.0.1.3
nexus-leaf-04 ansible_host=10.0.1.4

[nxos:children]
nxos_spine
nxos_leaf

[nxos:vars]
ansible_network_os=cisco.nxos.nxos
ansible_connection=ansible.netcommon.network_cli
ansible_user=admin
ansible_password={{ vault_nxos_password }}
```

Note that NX-OS does not use the `enable` concept like IOS. Once you are logged in with the correct privileges, you are already in privileged mode. So there is no need for `ansible_become` settings.

## Gathering NX-OS Facts

```yaml
# playbook-nxos-facts.yml
# Collects system and interface information from Nexus switches
- name: Gather NX-OS facts
  hosts: nxos
  gather_facts: no

  tasks:
    - name: Collect device facts
      cisco.nxos.nxos_facts:
        gather_subset:
          - all
      register: nxos_facts

    - name: Display device information
      ansible.builtin.debug:
        msg: |
          Hostname: {{ ansible_net_hostname }}
          Platform: {{ ansible_net_platform }}
          NX-OS Version: {{ ansible_net_version }}
          Serial Number: {{ ansible_net_serialnum }}

    - name: Display interface count
      ansible.builtin.debug:
        msg: "Total interfaces: {{ ansible_net_interfaces | dict2items | length }}"
```

## Enabling NX-OS Features

NX-OS requires features to be explicitly enabled before they can be used. This is different from IOS where most features are available by default.

```yaml
# playbook-nxos-features.yml
# Enables required features on Nexus switches
- name: Enable NX-OS features
  hosts: nxos
  gather_facts: no

  vars:
    required_features:
      - vpc
      - lacp
      - interface-vlan
      - hsrp
      - ospf
      - bgp
      - pim
      - udld
      - lldp
      - nxapi

  tasks:
    - name: Enable required features
      cisco.nxos.nxos_feature:
        feature: "{{ item }}"
        state: enabled
      loop: "{{ required_features }}"
```

## VLAN Configuration

```yaml
# playbook-nxos-vlans.yml
# Configures VLANs on Nexus switches for a data center environment
- name: Configure NX-OS VLANs
  hosts: nxos_leaf
  gather_facts: no

  vars:
    dc_vlans:
      - vlan_id: 100
        name: WEB-SERVERS
      - vlan_id: 200
        name: APP-SERVERS
      - vlan_id: 300
        name: DB-SERVERS
      - vlan_id: 400
        name: MANAGEMENT
      - vlan_id: 500
        name: BACKUP
      - vlan_id: 999
        name: NATIVE-VLAN

  tasks:
    - name: Create VLANs
      cisco.nxos.nxos_vlans:
        config: "{{ dc_vlans }}"
        state: merged

    - name: Configure SVI for management VLAN
      cisco.nxos.nxos_config:
        lines:
          - description Management SVI
          - ip address 10.0.40.{{ groups['nxos_leaf'].index(inventory_hostname) + 1 }}/24
          - no shutdown
        parents: interface Vlan400
```

## Interface Configuration

```yaml
# playbook-nxos-interfaces.yml
# Configures server-facing and uplink interfaces on Nexus leaf switches
- name: Configure NX-OS interfaces
  hosts: nxos_leaf
  gather_facts: no

  tasks:
    - name: Configure server-facing access ports
      cisco.nxos.nxos_interfaces:
        config:
          - name: Ethernet1/1
            description: "Web Server 01 - NIC1"
            mode: layer2
            enabled: true
          - name: Ethernet1/2
            description: "Web Server 02 - NIC1"
            mode: layer2
            enabled: true
          - name: Ethernet1/3
            description: "App Server 01 - NIC1"
            mode: layer2
            enabled: true
        state: merged

    - name: Assign VLANs to access ports
      cisco.nxos.nxos_l2_interfaces:
        config:
          - name: Ethernet1/1
            mode: access
            access:
              vlan: 100
          - name: Ethernet1/2
            mode: access
            access:
              vlan: 100
          - name: Ethernet1/3
            mode: access
            access:
              vlan: 200
        state: merged

    - name: Configure uplink trunk ports
      cisco.nxos.nxos_l2_interfaces:
        config:
          - name: Ethernet1/49
            mode: trunk
            trunk:
              allowed_vlans: "100,200,300,400,500"
              native_vlan: 999
          - name: Ethernet1/50
            mode: trunk
            trunk:
              allowed_vlans: "100,200,300,400,500"
              native_vlan: 999
        state: merged
```

## VPC (Virtual Port Channel) Configuration

VPC is one of the most important features on Nexus switches. It allows two Nexus switches to act as a single logical switch from the perspective of downstream devices.

```yaml
# playbook-nxos-vpc.yml
# Configures Virtual Port Channel (VPC) between a pair of Nexus switches
- name: Configure VPC domain
  hosts: nxos_leaf
  gather_facts: no

  tasks:
    - name: Enable VPC feature
      cisco.nxos.nxos_feature:
        feature: vpc
        state: enabled

    - name: Enable LACP feature
      cisco.nxos.nxos_feature:
        feature: lacp
        state: enabled

    - name: Configure VPC domain on primary switch
      cisco.nxos.nxos_config:
        lines:
          - role priority 1
          - system-priority 2000
          - peer-keepalive destination 10.0.99.2 source 10.0.99.1 vrf management
          - delay restore 120
          - auto-recovery
          - ip arp synchronize
        parents: vpc domain 1
      when: inventory_hostname == "nexus-leaf-01"

    - name: Configure VPC domain on secondary switch
      cisco.nxos.nxos_config:
        lines:
          - role priority 2
          - system-priority 2000
          - peer-keepalive destination 10.0.99.1 source 10.0.99.2 vrf management
          - delay restore 120
          - auto-recovery
          - ip arp synchronize
        parents: vpc domain 1
      when: inventory_hostname == "nexus-leaf-02"

    - name: Configure VPC peer link port-channel
      cisco.nxos.nxos_config:
        lines:
          - switchport
          - switchport mode trunk
          - vpc peer-link
          - spanning-tree port type network
        parents: interface port-channel1

    - name: Add physical interfaces to peer-link
      cisco.nxos.nxos_config:
        lines:
          - switchport
          - switchport mode trunk
          - channel-group 1 mode active
        parents: "interface {{ item }}"
      loop:
        - Ethernet1/47
        - Ethernet1/48

    - name: Configure VPC member port-channel for servers
      cisco.nxos.nxos_config:
        lines:
          - switchport
          - switchport mode trunk
          - switchport trunk allowed vlan 100,200,300
          - vpc 10
        parents: interface port-channel10

    - name: Add server-facing interface to VPC port-channel
      cisco.nxos.nxos_config:
        lines:
          - switchport
          - switchport mode trunk
          - channel-group 10 mode active
        parents: interface Ethernet1/10
```

## Routing Configuration

```yaml
# playbook-nxos-routing.yml
# Configures OSPF routing on Nexus switches
- name: Configure NX-OS OSPF
  hosts: nxos
  gather_facts: no

  tasks:
    - name: Enable OSPF feature
      cisco.nxos.nxos_feature:
        feature: ospf
        state: enabled

    - name: Configure OSPF process
      cisco.nxos.nxos_config:
        lines:
          - router-id {{ router_id }}
          - log-adjacency-changes detail
        parents: router ospf UNDERLAY

    - name: Configure OSPF on interfaces
      cisco.nxos.nxos_config:
        lines:
          - ip router ospf UNDERLAY area 0.0.0.0
          - ip ospf network point-to-point
        parents: "interface {{ item }}"
      loop:
        - Loopback0
        - Ethernet1/49
        - Ethernet1/50
```

## NX-API Configuration

NX-OS supports a REST API called NX-API. You can use the `httpapi` connection plugin for API-based management:

```yaml
# group_vars/nxos_api.yml
# NX-OS API connection settings
ansible_connection: ansible.netcommon.httpapi
ansible_network_os: cisco.nxos.nxos
ansible_httpapi_use_ssl: true
ansible_httpapi_validate_certs: false
ansible_user: admin
ansible_password: "{{ vault_nxos_password }}"
```

```yaml
# playbook-nxos-api.yml
# Uses NX-API to configure devices (requires httpapi connection)
- name: Configure via NX-API
  hosts: nxos_api
  gather_facts: no

  tasks:
    - name: Get system info via API
      cisco.nxos.nxos_facts:
        gather_subset:
          - min
      register: api_facts

    - name: Configure VLANs via API
      cisco.nxos.nxos_vlans:
        config:
          - vlan_id: 600
            name: NEW-SERVICE-VLAN
        state: merged
```

## Operational Verification

```yaml
# playbook-nxos-verify.yml
# Runs operational show commands for verification and reporting
- name: Verify NX-OS operational state
  hosts: nxos
  gather_facts: no

  tasks:
    - name: Check VPC status
      cisco.nxos.nxos_command:
        commands:
          - show vpc brief
      register: vpc_status

    - name: Display VPC status
      ansible.builtin.debug:
        msg: "{{ vpc_status.stdout_lines[0] }}"

    - name: Check port-channel summary
      cisco.nxos.nxos_command:
        commands:
          - show port-channel summary
      register: po_summary

    - name: Check for interface errors
      cisco.nxos.nxos_command:
        commands:
          - show interface counters errors
      register: if_errors

    - name: Check spanning-tree
      cisco.nxos.nxos_command:
        commands:
          - show spanning-tree summary
      register: stp_summary

    - name: Generate health report
      ansible.builtin.debug:
        msg: |
          === {{ inventory_hostname }} Health Report ===
          VPC Status: {{ 'OK' if 'peer-link' in vpc_status.stdout[0] else 'CHECK REQUIRED' }}
          Port Channels: {{ po_summary.stdout_lines[0] | length }} lines
```

## Configuration Backup

```yaml
# playbook-nxos-backup.yml
# Backs up NX-OS running and startup configurations
- name: Backup NX-OS configurations
  hosts: nxos
  gather_facts: no

  tasks:
    - name: Backup running config
      cisco.nxos.nxos_config:
        backup: yes
        backup_options:
          dir_path: "./backups/nxos/"
          filename: "{{ inventory_hostname }}-{{ lookup('pipe', 'date +%Y%m%d') }}.cfg"

    - name: Copy running config to startup
      cisco.nxos.nxos_config:
        save_when: modified
```

## Tips for NX-OS Automation

**Enable features first.** NX-OS will reject commands for features that are not enabled. Always include feature enablement as the first step in your playbooks.

**NX-OS does not use enable mode.** Unlike IOS, there is no `enable` password concept. If you are authenticated, you have the privileges assigned to your user role.

**Use checkpoint/rollback for safety.** NX-OS supports configuration checkpoints. Before major changes, create a checkpoint so you can roll back if something goes wrong:

```yaml
    - name: Create checkpoint before changes
      cisco.nxos.nxos_command:
        commands:
          - checkpoint ansible-backup
```

**Be aware of VDC.** On Nexus 7000 series, Virtual Device Contexts (VDCs) partition the switch into multiple virtual switches. Make sure you are targeting the correct VDC.

**Test VPC changes carefully.** VPC misconfiguration can cause network outages. Always test VPC playbooks in a lab or on non-production VPC pairs first.

NX-OS automation with Ansible is essential for managing modern data center networks efficiently. The combination of resource modules for structured configuration and `nxos_config` for freeform commands gives you complete control over your Nexus infrastructure.
