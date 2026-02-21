# How to Use Ansible with Arista EOS Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Arista EOS, Network Automation, Data Center

Description: Automate Arista EOS switches with Ansible for spine-leaf data center fabrics, VLAN management, BGP EVPN, and configuration management.

---

Arista EOS (Extensible Operating System) is a Linux-based network operating system that powers Arista's line of high-performance data center switches. Arista switches are popular in modern cloud-scale data centers, and EOS is known for its programmability, rich API support, and familiar CLI syntax (it shares a lot of DNA with Cisco IOS). One of EOS's standout features is eAPI, a RESTful API that lets you manage the switch through HTTP, which makes it particularly well-suited for automation.

Ansible's `arista.eos` collection provides dedicated modules for EOS device management. This post covers the essential automation patterns for managing Arista switches in a data center environment.

## Prerequisites

```bash
# Install the Arista EOS collection
ansible-galaxy collection install arista.eos
ansible-galaxy collection install ansible.netcommon
```

EOS supports multiple connection methods. The most common are:

- **network_cli**: SSH-based CLI, similar to other network platforms
- **httpapi**: REST API via eAPI, which is EOS's native API
- **netconf**: NETCONF protocol (supported on newer EOS versions)

```ini
# inventory/eos-devices.ini
# Arista EOS switch inventory for a spine-leaf data center
[eos_spine]
spine-01 ansible_host=10.0.0.1
spine-02 ansible_host=10.0.0.2

[eos_leaf]
leaf-01 ansible_host=10.0.1.1
leaf-02 ansible_host=10.0.1.2
leaf-03 ansible_host=10.0.1.3
leaf-04 ansible_host=10.0.1.4

[eos:children]
eos_spine
eos_leaf

[eos:vars]
ansible_network_os=arista.eos.eos
ansible_connection=ansible.netcommon.network_cli
ansible_user=admin
ansible_password={{ vault_eos_password }}
ansible_become=yes
ansible_become_method=enable
```

For eAPI connection instead of SSH:

```ini
# Alternative: eAPI connection
[eos_api:vars]
ansible_network_os=arista.eos.eos
ansible_connection=ansible.netcommon.httpapi
ansible_httpapi_use_ssl=true
ansible_httpapi_validate_certs=false
ansible_user=admin
ansible_password={{ vault_eos_password }}
```

## Enabling eAPI on EOS

If you want to use the httpapi connection, eAPI needs to be enabled on the switches:

```yaml
# playbook-enable-eapi.yml
# Enables eAPI (REST API) on Arista EOS switches
- name: Enable eAPI
  hosts: eos
  gather_facts: no

  tasks:
    - name: Enable eAPI with HTTPS
      arista.eos.eos_config:
        lines:
          - no shutdown
          - protocol https
        parents: management api http-commands

    - name: Verify eAPI is running
      arista.eos.eos_command:
        commands:
          - show management api http-commands
      register: eapi_status

    - name: Display eAPI status
      ansible.builtin.debug:
        msg: "{{ eapi_status.stdout_lines[0] }}"
```

## Gathering EOS Facts

```yaml
# playbook-eos-facts.yml
# Gathers system and interface facts from Arista EOS switches
- name: Gather EOS facts
  hosts: eos
  gather_facts: no

  tasks:
    - name: Collect all facts
      arista.eos.eos_facts:
        gather_subset:
          - all
      register: eos_facts

    - name: Display device summary
      ansible.builtin.debug:
        msg: |
          Hostname: {{ ansible_net_hostname }}
          Model: {{ ansible_net_model }}
          EOS Version: {{ ansible_net_version }}
          Serial: {{ ansible_net_serialnum }}
          Free Memory: {{ ansible_net_memfree_mb }} MB
```

## VLAN Configuration

```yaml
# playbook-eos-vlans.yml
# Configures VLANs for a data center environment
- name: Configure EOS VLANs
  hosts: eos_leaf
  gather_facts: no

  vars:
    dc_vlans:
      - vlan_id: 10
        name: WEB-TIER
      - vlan_id: 20
        name: APP-TIER
      - vlan_id: 30
        name: DB-TIER
      - vlan_id: 40
        name: MANAGEMENT
      - vlan_id: 100
        name: STORAGE
      - vlan_id: 4094
        name: MLAG-PEER

  tasks:
    - name: Create VLANs
      arista.eos.eos_vlans:
        config: "{{ dc_vlans }}"
        state: merged

    - name: Configure VLAN SVIs
      arista.eos.eos_config:
        lines:
          - ip address virtual 10.0.10.1/24
        parents: interface Vlan10

    - name: Configure SVI for app tier
      arista.eos.eos_config:
        lines:
          - ip address virtual 10.0.20.1/24
        parents: interface Vlan20

    - name: Configure SVI for DB tier
      arista.eos.eos_config:
        lines:
          - ip address virtual 10.0.30.1/24
        parents: interface Vlan30
```

## Interface Configuration

```yaml
# playbook-eos-interfaces.yml
# Configures server-facing and uplink interfaces on Arista leaf switches
- name: Configure EOS interfaces
  hosts: eos_leaf
  gather_facts: no

  tasks:
    - name: Configure server-facing interfaces
      arista.eos.eos_interfaces:
        config:
          - name: Ethernet1
            description: "Server-01 NIC1"
            enabled: true
          - name: Ethernet2
            description: "Server-02 NIC1"
            enabled: true
          - name: Ethernet3
            description: "Server-03 NIC1"
            enabled: true
        state: merged

    - name: Configure access port VLAN assignments
      arista.eos.eos_l2_interfaces:
        config:
          - name: Ethernet1
            mode: access
            access:
              vlan: 10
          - name: Ethernet2
            mode: access
            access:
              vlan: 20
          - name: Ethernet3
            mode: access
            access:
              vlan: 30
        state: merged

    - name: Configure uplink interfaces to spine
      arista.eos.eos_interfaces:
        config:
          - name: Ethernet49
            description: "Uplink to spine-01"
            enabled: true
            mtu: 9214
          - name: Ethernet50
            description: "Uplink to spine-02"
            enabled: true
            mtu: 9214
        state: merged

    - name: Configure uplink IP addresses
      arista.eos.eos_l3_interfaces:
        config:
          - name: Ethernet49
            ipv4:
              - address: 10.0.100.1/31
          - name: Ethernet50
            ipv4:
              - address: 10.0.100.3/31
        state: merged
```

## MLAG Configuration

MLAG (Multi-Chassis Link Aggregation) is Arista's equivalent to Cisco VPC. It allows two switches to present as a single logical switch to downstream devices.

```yaml
# playbook-eos-mlag.yml
# Configures MLAG between a pair of Arista leaf switches
- name: Configure EOS MLAG
  hosts: eos_leaf
  gather_facts: no

  tasks:
    - name: Configure MLAG VLAN
      arista.eos.eos_config:
        lines:
          - name MLAG-PEER
        parents: vlan 4094

    - name: Configure MLAG peer link trunk
      arista.eos.eos_config:
        lines:
          - switchport mode trunk
          - switchport trunk group MLAG-PEER
        parents: interface Port-Channel1

    - name: Add physical interfaces to peer link
      arista.eos.eos_config:
        lines:
          - channel-group 1 mode active
        parents: "interface {{ item }}"
      loop:
        - Ethernet47
        - Ethernet48

    - name: Configure MLAG peer VLAN interface
      arista.eos.eos_config:
        lines:
          - mtu 9214
          - no autostate
          - ip address 169.254.0.1/30
        parents: interface Vlan4094
      when: inventory_hostname == "leaf-01"

    - name: Configure MLAG peer VLAN interface on secondary
      arista.eos.eos_config:
        lines:
          - mtu 9214
          - no autostate
          - ip address 169.254.0.2/30
        parents: interface Vlan4094
      when: inventory_hostname == "leaf-02"

    - name: Configure MLAG domain on primary
      arista.eos.eos_config:
        lines:
          - domain-id LEAF-PAIR-01
          - local-interface Vlan4094
          - peer-address 169.254.0.2
          - peer-link Port-Channel1
        parents: mlag configuration
      when: inventory_hostname == "leaf-01"

    - name: Configure MLAG domain on secondary
      arista.eos.eos_config:
        lines:
          - domain-id LEAF-PAIR-01
          - local-interface Vlan4094
          - peer-address 169.254.0.1
          - peer-link Port-Channel1
        parents: mlag configuration
      when: inventory_hostname == "leaf-02"
```

## BGP EVPN Configuration

Modern Arista data centers often use BGP EVPN for overlay networking. Here is a basic EVPN configuration:

```yaml
# playbook-eos-bgp-evpn.yml
# Configures BGP EVPN for VXLAN overlay on a leaf switch
- name: Configure BGP EVPN
  hosts: eos_leaf
  gather_facts: no

  vars:
    bgp_asn: 65001
    spine_peers:
      - 10.0.0.1
      - 10.0.0.2

  tasks:
    - name: Configure VXLAN tunnel interface
      arista.eos.eos_config:
        lines:
          - vxlan source-interface Loopback1
          - vxlan udp-port 4789
          - vxlan vlan 10 vni 10010
          - vxlan vlan 20 vni 10020
          - vxlan vlan 30 vni 10030
        parents: interface Vxlan1

    - name: Configure BGP process
      arista.eos.eos_config:
        lines:
          - router-id {{ router_id }}
          - maximum-paths 4 ecmp 4
          - no bgp default ipv4-unicast
        parents: router bgp {{ bgp_asn }}

    - name: Configure BGP spine neighbors
      arista.eos.eos_config:
        lines:
          - remote-as 65000
          - update-source Loopback0
          - send-community extended
          - maximum-routes 12000
        parents:
          - router bgp {{ bgp_asn }}
          - neighbor {{ item }}
      loop: "{{ spine_peers }}"

    - name: Configure EVPN address family
      arista.eos.eos_config:
        lines:
          - neighbor {{ item }} activate
        parents:
          - router bgp {{ bgp_asn }}
          - address-family evpn
      loop: "{{ spine_peers }}"

    - name: Configure VLAN-aware bundle
      arista.eos.eos_config:
        lines:
          - rd auto
          - route-target both 10:10010
          - redistribute learned
          - vlan 10,20,30
        parents:
          - router bgp {{ bgp_asn }}
          - vlan-aware-bundle TENANT-A
```

## Configuration Backup and Restore

```yaml
# playbook-eos-backup.yml
# Backs up EOS running and startup configurations
- name: Backup EOS configurations
  hosts: eos
  gather_facts: no

  tasks:
    - name: Backup running configuration
      arista.eos.eos_config:
        backup: yes
        backup_options:
          dir_path: "./backups/eos/"
          filename: "{{ inventory_hostname }}-{{ lookup('pipe', 'date +%Y%m%d') }}.cfg"

    - name: Save running config to startup
      arista.eos.eos_config:
        save_when: modified
```

## Operational Verification

```yaml
# playbook-eos-verify.yml
# Runs verification commands on EOS switches
- name: Verify EOS operational state
  hosts: eos
  gather_facts: no

  tasks:
    - name: Check MLAG status
      arista.eos.eos_command:
        commands:
          - show mlag
      register: mlag_status

    - name: Check BGP summary
      arista.eos.eos_command:
        commands:
          - show bgp evpn summary
      register: bgp_status

    - name: Check VXLAN status
      arista.eos.eos_command:
        commands:
          - show vxlan vtep
          - show vxlan address-table
      register: vxlan_status

    - name: Display health summary
      ansible.builtin.debug:
        msg: |
          === {{ inventory_hostname }} Health ===
          MLAG: {{ 'Active' if 'active' in mlag_status.stdout[0].lower() else 'Check Required' }}
          BGP: {{ bgp_status.stdout_lines[0] | length }} lines
          VXLAN VTEPs: {{ vxlan_status.stdout_lines[0] | length }} lines
```

## Using EOS with JSON Output

One of EOS's great features is that most show commands support JSON output, which makes parsing much easier:

```yaml
# playbook-eos-json.yml
# Uses EOS JSON output for structured data gathering
- name: Gather structured data from EOS
  hosts: eos
  gather_facts: no

  tasks:
    - name: Get VLAN info as JSON
      arista.eos.eos_command:
        commands:
          - command: show vlan
            output: json
      register: vlan_json

    - name: Display VLANs
      ansible.builtin.debug:
        msg: "VLAN {{ item.key }}: {{ item.value.name }}"
      loop: "{{ vlan_json.stdout[0].vlans | dict2items }}"
      loop_control:
        label: "VLAN {{ item.key }}"
```

## Tips for EOS Automation

**Use eAPI when possible.** The httpapi connection with eAPI is faster and more reliable than SSH-based CLI for large-scale operations. It also supports JSON natively, eliminating the need for text parsing.

**EOS configuration sessions are powerful.** EOS supports named configuration sessions similar to IOS-XR commits. You can create a session, stage changes, review them, and then commit or abort.

**Leverage EOS's Linux underpinnings.** EOS runs on a Linux kernel, so you can access the bash shell from the CLI with the `bash` command. This is useful for troubleshooting and running custom scripts.

**MLAG state matters for changes.** When making changes to MLAG-connected switches, be aware of the MLAG state. Making changes to MLAG configuration on one switch while the other is actively forwarding can cause disruptions.

**Test BGP EVPN changes in a lab.** EVPN configurations are complex, and a mistake can cause VXLAN tunnels to go down. Always test in a lab environment before deploying to production.

Arista EOS and Ansible are a natural fit for modern data center automation. The combination of EOS's programmability, eAPI's structured data, and Ansible's declarative playbook model makes it possible to manage even the largest spine-leaf fabrics efficiently and reliably.
