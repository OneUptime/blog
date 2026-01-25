# How to Configure Ansible for Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Network Automation, Cisco, Networking, DevOps, Infrastructure

Description: Automate network device configuration with Ansible using specialized network modules for Cisco, Juniper, Arista, and other vendors.

---

Network automation with Ansible extends infrastructure-as-code principles to routers, switches, and firewalls. Instead of manually configuring each device through CLI sessions, you define configurations in playbooks and apply them consistently across your network. Ansible supports major vendors including Cisco, Juniper, Arista, and many others.

This guide covers configuring Ansible for network automation and managing common network tasks.

## Network Automation Fundamentals

Network devices differ from servers in important ways:

- Most lack Python (required for standard Ansible modules)
- Connections use SSH with vendor-specific CLIs or APIs
- Configuration changes often require commit/save steps
- Rollback capabilities vary by platform

Ansible handles these differences through network-specific connection plugins and modules.

## Installing Network Collections

Install vendor-specific collections for your network devices.

```bash
# Cisco IOS/IOS-XE
ansible-galaxy collection install cisco.ios

# Cisco NX-OS (Nexus)
ansible-galaxy collection install cisco.nxos

# Juniper Junos
ansible-galaxy collection install junipernetworks.junos

# Arista EOS
ansible-galaxy collection install arista.eos

# Generic network modules
ansible-galaxy collection install ansible.netcommon

# Install network automation dependencies
pip install paramiko netaddr jmespath
```

## Inventory Configuration for Network Devices

Configure inventory with network-specific connection settings.

```yaml
# inventory/network.yml
---
all:
  children:
    routers:
      hosts:
        router1:
          ansible_host: 192.168.1.1
        router2:
          ansible_host: 192.168.1.2
      vars:
        ansible_network_os: cisco.ios.ios
        ansible_connection: ansible.netcommon.network_cli
        ansible_user: admin
        ansible_password: "{{ vault_network_password }}"
        ansible_become: yes
        ansible_become_method: enable
        ansible_become_password: "{{ vault_enable_password }}"

    switches:
      hosts:
        switch1:
          ansible_host: 192.168.1.10
        switch2:
          ansible_host: 192.168.1.11
      vars:
        ansible_network_os: cisco.nxos.nxos
        ansible_connection: ansible.netcommon.network_cli

    firewalls:
      hosts:
        fw1:
          ansible_host: 192.168.1.254
      vars:
        ansible_network_os: cisco.asa.asa
        ansible_connection: ansible.netcommon.network_cli

    juniper_devices:
      hosts:
        juniper1:
          ansible_host: 192.168.1.20
      vars:
        ansible_network_os: junipernetworks.junos.junos
        ansible_connection: ansible.netcommon.netconf
        ansible_netconf_ssh_config: true
```

## Ansible Configuration for Network

Configure ansible.cfg for network automation.

```ini
# ansible.cfg
[defaults]
inventory = ./inventory
host_key_checking = False
timeout = 60

# Increase connection timeout for slower devices
[persistent_connection]
connect_timeout = 60
command_timeout = 60

[network]
# Diff mode for showing config changes
diff_mode = true
```

## Basic Configuration Tasks

Manage common network configurations.

```yaml
# playbooks/network-base.yml
---
- name: Configure base network settings
  hosts: routers
  gather_facts: no

  tasks:
    - name: Gather device facts
      cisco.ios.ios_facts:
        gather_subset:
          - min
          - hardware
      register: device_facts

    - name: Display device information
      debug:
        msg: |
          Hostname: {{ device_facts.ansible_facts.ansible_net_hostname }}
          Model: {{ device_facts.ansible_facts.ansible_net_model }}
          Version: {{ device_facts.ansible_facts.ansible_net_version }}

    - name: Configure hostname
      cisco.ios.ios_hostname:
        config:
          hostname: "{{ inventory_hostname }}"
        state: merged

    - name: Configure banner
      cisco.ios.ios_banner:
        banner: login
        text: |
          ******************************************
          * Authorized access only                 *
          * All sessions are logged and monitored  *
          ******************************************
        state: present

    - name: Configure NTP servers
      cisco.ios.ios_ntp_global:
        config:
          servers:
            - server: 10.0.0.1
              prefer: true
            - server: 10.0.0.2
        state: merged

    - name: Configure DNS servers
      cisco.ios.ios_system:
        domain_name: example.com
        domain_search:
          - example.com
          - internal.example.com
        name_servers:
          - 10.0.0.10
          - 10.0.0.11
        state: present

    - name: Save configuration
      cisco.ios.ios_config:
        save_when: modified
```

## Interface Configuration

Configure network interfaces with desired state.

```yaml
# playbooks/network-interfaces.yml
---
- name: Configure network interfaces
  hosts: switches
  gather_facts: no

  vars:
    interfaces:
      - name: Ethernet1/1
        description: "Uplink to Router"
        enabled: true
        mode: trunk
        trunk_vlans: "10,20,30"

      - name: Ethernet1/2
        description: "Server Port - Web Server"
        enabled: true
        mode: access
        access_vlan: 10

      - name: Ethernet1/3
        description: "Server Port - Database"
        enabled: true
        mode: access
        access_vlan: 20

  tasks:
    - name: Configure interface descriptions
      cisco.nxos.nxos_interfaces:
        config:
          - name: "{{ item.name }}"
            description: "{{ item.description }}"
            enabled: "{{ item.enabled }}"
        state: merged
      loop: "{{ interfaces }}"

    - name: Configure trunk ports
      cisco.nxos.nxos_l2_interfaces:
        config:
          - name: "{{ item.name }}"
            mode: trunk
            trunk:
              allowed_vlans: "{{ item.trunk_vlans }}"
        state: merged
      loop: "{{ interfaces }}"
      when: item.mode == 'trunk'

    - name: Configure access ports
      cisco.nxos.nxos_l2_interfaces:
        config:
          - name: "{{ item.name }}"
            mode: access
            access:
              vlan: "{{ item.access_vlan }}"
        state: merged
      loop: "{{ interfaces }}"
      when: item.mode == 'access'
```

## VLAN Configuration

Manage VLANs across switches.

```yaml
# playbooks/network-vlans.yml
---
- name: Configure VLANs
  hosts: switches
  gather_facts: no

  vars:
    vlans:
      - vlan_id: 10
        name: Web_Servers
        state: active

      - vlan_id: 20
        name: Database_Servers
        state: active

      - vlan_id: 30
        name: Management
        state: active

      - vlan_id: 100
        name: Native_VLAN
        state: active

  tasks:
    - name: Create VLANs
      cisco.nxos.nxos_vlans:
        config:
          - vlan_id: "{{ item.vlan_id }}"
            name: "{{ item.name }}"
            state: "{{ item.state }}"
        state: merged
      loop: "{{ vlans }}"

    - name: Verify VLAN configuration
      cisco.nxos.nxos_command:
        commands:
          - show vlan brief
      register: vlan_output

    - name: Display VLAN configuration
      debug:
        var: vlan_output.stdout_lines
```

## Routing Configuration

Configure routing protocols.

```yaml
# playbooks/network-routing.yml
---
- name: Configure routing
  hosts: routers
  gather_facts: no

  vars:
    ospf_process_id: 1
    ospf_router_id: "{{ ansible_host }}"
    ospf_networks:
      - prefix: 10.0.0.0/24
        area: 0
      - prefix: 192.168.1.0/24
        area: 0

  tasks:
    - name: Configure OSPF process
      cisco.ios.ios_ospfv2:
        config:
          processes:
            - process_id: "{{ ospf_process_id }}"
              router_id: "{{ ospf_router_id }}"
              areas:
                - area_id: "0"
                  ranges:
                    - address: 10.0.0.0
                      netmask: 0.0.0.255
        state: merged

    - name: Configure static routes
      cisco.ios.ios_static_routes:
        config:
          - address_families:
              - afi: ipv4
                routes:
                  - dest: 0.0.0.0/0
                    next_hops:
                      - forward_router_address: 192.168.1.1
                        name: default_gateway
        state: merged

    - name: Verify routing table
      cisco.ios.ios_command:
        commands:
          - show ip route
      register: route_table

    - name: Display routing table
      debug:
        var: route_table.stdout_lines
```

## ACL Configuration

Manage access control lists.

```yaml
# playbooks/network-acls.yml
---
- name: Configure Access Control Lists
  hosts: routers
  gather_facts: no

  tasks:
    - name: Configure extended ACL
      cisco.ios.ios_acls:
        config:
          - afi: ipv4
            acls:
              - name: ALLOW_WEB
                aces:
                  - sequence: 10
                    grant: permit
                    protocol: tcp
                    source:
                      any: true
                    destination:
                      host: 10.0.10.100
                    destination_port:
                      eq: www

                  - sequence: 20
                    grant: permit
                    protocol: tcp
                    source:
                      any: true
                    destination:
                      host: 10.0.10.100
                    destination_port:
                      eq: 443

                  - sequence: 30
                    grant: deny
                    protocol: ip
                    source:
                      any: true
                    destination:
                      any: true
                    log: true
        state: merged

    - name: Apply ACL to interface
      cisco.ios.ios_acl_interfaces:
        config:
          - name: GigabitEthernet0/1
            access_groups:
              - afi: ipv4
                acls:
                  - name: ALLOW_WEB
                    direction: in
        state: merged
```

## Configuration Backup and Restore

Backup and restore device configurations.

```yaml
# playbooks/network-backup.yml
---
- name: Backup network configurations
  hosts: all
  gather_facts: no

  vars:
    backup_dir: ./backups/{{ ansible_date_time.date }}

  tasks:
    - name: Create backup directory
      file:
        path: "{{ backup_dir }}"
        state: directory
      delegate_to: localhost
      run_once: true

    - name: Backup Cisco IOS configuration
      cisco.ios.ios_config:
        backup: yes
        backup_options:
          dir_path: "{{ backup_dir }}"
          filename: "{{ inventory_hostname }}.cfg"
      when: ansible_network_os == 'cisco.ios.ios'

    - name: Backup Cisco NX-OS configuration
      cisco.nxos.nxos_config:
        backup: yes
        backup_options:
          dir_path: "{{ backup_dir }}"
          filename: "{{ inventory_hostname }}.cfg"
      when: ansible_network_os == 'cisco.nxos.nxos'

    - name: Backup Juniper configuration
      junipernetworks.junos.junos_config:
        backup: yes
        backup_options:
          dir_path: "{{ backup_dir }}"
          filename: "{{ inventory_hostname }}.cfg"
      when: ansible_network_os == 'junipernetworks.junos.junos'
```

```yaml
# playbooks/network-restore.yml
---
- name: Restore network configuration
  hosts: routers
  gather_facts: no

  vars:
    config_file: ./backups/router1.cfg

  tasks:
    - name: Restore configuration
      cisco.ios.ios_config:
        src: "{{ config_file }}"
        replace: config
      when: restore_config | default(false) | bool

    - name: Save restored configuration
      cisco.ios.ios_config:
        save_when: always
      when: restore_config | default(false) | bool
```

## Configuration Compliance

Validate configurations meet standards.

```yaml
# playbooks/network-compliance.yml
---
- name: Check network compliance
  hosts: all
  gather_facts: no

  vars:
    required_banner: "Authorized access only"
    required_ntp_servers:
      - 10.0.0.1
      - 10.0.0.2

  tasks:
    - name: Get running configuration
      cisco.ios.ios_command:
        commands:
          - show running-config
      register: running_config

    - name: Check for login banner
      assert:
        that:
          - "'banner login' in running_config.stdout[0]"
        fail_msg: "Login banner not configured"
        success_msg: "Login banner is configured"

    - name: Check NTP configuration
      assert:
        that:
          - "'ntp server 10.0.0.1' in running_config.stdout[0]"
          - "'ntp server 10.0.0.2' in running_config.stdout[0]"
        fail_msg: "Required NTP servers not configured"
        success_msg: "NTP servers are properly configured"

    - name: Check SSH is enabled
      assert:
        that:
          - "'transport input ssh' in running_config.stdout[0] or 'ip ssh version 2' in running_config.stdout[0]"
        fail_msg: "SSH not properly configured"
        success_msg: "SSH is enabled"
```

---

Network automation with Ansible brings the same consistency and repeatability to network infrastructure that you expect from server management. Start with basic tasks like backup and compliance checking, then progress to full configuration management. The vendor-specific collections handle the complexity of different platforms while Ansible provides a unified automation experience.
