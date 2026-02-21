# How to Use Ansible with Cisco IOS Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cisco IOS, Network Automation, Networking

Description: Automate Cisco IOS routers and switches with Ansible using the cisco.ios collection for configuration management and operational tasks.

---

Cisco IOS is the most widely deployed network operating system in the world. From branch office routers to campus switches, IOS devices form the backbone of countless enterprise networks. Managing these devices with Ansible means you can push configuration changes, gather operational data, enforce compliance, and back up configurations across your entire Cisco infrastructure in minutes rather than hours.

The `cisco.ios` collection provides purpose-built modules for IOS devices. This post covers the essential modules and patterns you need to automate your IOS fleet effectively.

## Prerequisites

Install the required collection and configure your inventory:

```bash
# Install the Cisco IOS collection
ansible-galaxy collection install cisco.ios
```

```ini
# inventory/ios-devices.ini
# Cisco IOS device inventory
[ios_routers]
rtr-core-01 ansible_host=10.0.0.1
rtr-core-02 ansible_host=10.0.0.2
rtr-branch-01 ansible_host=10.0.10.1

[ios_switches]
sw-access-01 ansible_host=10.0.1.1
sw-access-02 ansible_host=10.0.1.2
sw-dist-01 ansible_host=10.0.1.10

[ios:children]
ios_routers
ios_switches

[ios:vars]
ansible_network_os=cisco.ios.ios
ansible_connection=ansible.netcommon.network_cli
ansible_user=admin
ansible_password={{ vault_ios_password }}
ansible_become=yes
ansible_become_method=enable
ansible_become_password={{ vault_enable_password }}
```

The `ansible_become` settings are essential for IOS. Most configuration commands require enable (privileged EXEC) mode, and Ansible handles the `enable` command automatically when these variables are set.

## Gathering Device Facts

The `cisco.ios.ios_facts` module collects structured data from IOS devices:

```yaml
# playbook-ios-facts.yml
# Collects hardware, software, and interface information from IOS devices
- name: Gather Cisco IOS facts
  hosts: ios
  gather_facts: no

  tasks:
    - name: Collect all available facts
      cisco.ios.ios_facts:
        gather_subset:
          - all
      register: facts

    - name: Display device summary
      ansible.builtin.debug:
        msg: |
          Device: {{ ansible_net_hostname }}
          Model: {{ ansible_net_model }}
          IOS Version: {{ ansible_net_version }}
          Serial Number: {{ ansible_net_serialnum }}
          Image: {{ ansible_net_image }}

    - name: List all interfaces
      ansible.builtin.debug:
        msg: "{{ ansible_net_interfaces | dict2items | map(attribute='key') | list }}"
```

## Pushing Configuration with ios_config

The `cisco.ios.ios_config` module is the workhorse for IOS configuration management. It sends configuration commands to the device and handles the `configure terminal` and `end` commands automatically.

```yaml
# playbook-ios-config.yml
# Applies standard security and management configuration to IOS devices
- name: Configure IOS devices
  hosts: ios
  gather_facts: no

  tasks:
    - name: Configure banner
      cisco.ios.ios_config:
        lines:
          - banner motd ^C Authorized access only. All activity is monitored. ^C

    - name: Configure console and VTY settings
      cisco.ios.ios_config:
        lines:
          - exec-timeout 15 0
          - logging synchronous
          - login local
        parents: line console 0

    - name: Configure VTY lines for SSH only
      cisco.ios.ios_config:
        lines:
          - exec-timeout 15 0
          - transport input ssh
          - login local
          - logging synchronous
        parents: line vty 0 15

    - name: Configure standard ACL for management access
      cisco.ios.ios_config:
        lines:
          - permit 10.0.0.0 0.0.0.255
          - permit 10.0.100.0 0.0.0.255
          - deny any log
        parents: ip access-list standard MGMT-ACCESS

    - name: Apply ACL to VTY lines
      cisco.ios.ios_config:
        lines:
          - access-class MGMT-ACCESS in
        parents: line vty 0 15

    - name: Save configuration
      cisco.ios.ios_config:
        save_when: modified
```

The `parents` parameter handles hierarchical configuration. When you specify `parents: line vty 0 15`, Ansible enters that configuration context before sending the lines.

## Interface Configuration

The `cisco.ios.ios_interfaces` module provides a resource-based approach to interface management:

```yaml
# playbook-ios-interfaces.yml
# Configures interfaces on IOS switches using the resource module
- name: Configure IOS interfaces
  hosts: ios_switches
  gather_facts: no

  tasks:
    - name: Configure access port interfaces
      cisco.ios.ios_interfaces:
        config:
          - name: GigabitEthernet0/1
            description: "Server Farm - Web Server 01"
            enabled: true
            speed: "1000"
            duplex: full

          - name: GigabitEthernet0/2
            description: "Server Farm - Web Server 02"
            enabled: true
            speed: "1000"
            duplex: full

          - name: GigabitEthernet0/24
            description: "Uplink to Distribution"
            enabled: true
        state: merged
```

## VLAN Configuration

```yaml
# playbook-ios-vlans.yml
# Manages VLANs on Cisco IOS switches
- name: Configure VLANs
  hosts: ios_switches
  gather_facts: no

  vars:
    vlans:
      - vlan_id: 10
        name: SERVERS
      - vlan_id: 20
        name: WORKSTATIONS
      - vlan_id: 30
        name: VOICE
      - vlan_id: 40
        name: MANAGEMENT
      - vlan_id: 99
        name: NATIVE

  tasks:
    - name: Create VLANs
      cisco.ios.ios_vlans:
        config: "{{ vlans }}"
        state: merged

    - name: Configure access ports with VLAN assignments
      cisco.ios.ios_l2_interfaces:
        config:
          - name: GigabitEthernet0/1
            mode: access
            access:
              vlan: 10

          - name: GigabitEthernet0/2
            mode: access
            access:
              vlan: 10

          - name: GigabitEthernet0/10
            mode: access
            access:
              vlan: 20

          - name: GigabitEthernet0/24
            mode: trunk
            trunk:
              allowed_vlans: "10,20,30,40"
              native_vlan: 99
        state: merged
```

## Running Show Commands

For operational data that does not have a dedicated module, use `ios_command`:

```yaml
# playbook-ios-show.yml
# Runs show commands and captures output for reporting
- name: Gather operational data
  hosts: ios
  gather_facts: no

  tasks:
    - name: Run multiple show commands
      cisco.ios.ios_command:
        commands:
          - show version
          - show ip interface brief
          - show ip route summary
          - show cdp neighbors
          - show spanning-tree summary
      register: show_output

    - name: Display interface status
      ansible.builtin.debug:
        msg: "{{ show_output.stdout[1] }}"

    - name: Check for interface errors
      cisco.ios.ios_command:
        commands:
          - show interfaces | include errors|GigabitEthernet|FastEthernet
      register: error_check

    - name: Display error information
      ansible.builtin.debug:
        msg: "{{ error_check.stdout_lines[0] }}"
```

## ACL Management

```yaml
# playbook-ios-acls.yml
# Manages access control lists on IOS devices
- name: Configure ACLs
  hosts: ios_routers
  gather_facts: no

  tasks:
    - name: Configure extended ACL for server access
      cisco.ios.ios_acls:
        config:
          - afi: ipv4
            acls:
              - name: SERVER-ACCESS
                acl_type: extended
                aces:
                  - sequence: 10
                    grant: permit
                    protocol: tcp
                    source:
                      address: 10.0.20.0
                      wildcard_bits: 0.0.0.255
                    destination:
                      address: 10.0.10.0
                      wildcard_bits: 0.0.0.255
                    destination_port:
                      eq: 443

                  - sequence: 20
                    grant: permit
                    protocol: tcp
                    source:
                      address: 10.0.20.0
                      wildcard_bits: 0.0.0.255
                    destination:
                      address: 10.0.10.0
                      wildcard_bits: 0.0.0.255
                    destination_port:
                      eq: 80

                  - sequence: 100
                    grant: deny
                    protocol: ip
                    source:
                      any: true
                    destination:
                      any: true
                    log: true
        state: merged
```

## SNMP Configuration

```yaml
# playbook-ios-snmp.yml
# Configures SNMP monitoring on IOS devices
- name: Configure SNMP
  hosts: ios
  gather_facts: no

  tasks:
    - name: Configure SNMP settings
      cisco.ios.ios_config:
        lines:
          - snmp-server community {{ vault_snmp_ro_community }} RO MGMT-ACCESS
          - snmp-server location "{{ snmp_location | default('Data Center') }}"
          - snmp-server contact "netops@corp.local"
          - snmp-server host 10.0.100.50 version 2c {{ vault_snmp_ro_community }}
          - snmp-server enable traps snmp linkdown linkup coldstart
          - snmp-server enable traps config
          - snmp-server enable traps envmon
```

## Backup and Restore

```yaml
# playbook-ios-backup-restore.yml
# Backs up and optionally restores IOS device configurations
- name: Backup IOS configurations
  hosts: ios
  gather_facts: no

  tasks:
    - name: Backup running configuration
      cisco.ios.ios_config:
        backup: yes
        backup_options:
          dir_path: "./backups/ios/"
          filename: "{{ inventory_hostname }}-{{ lookup('pipe', 'date +%Y%m%d') }}.cfg"

    - name: Get current running config
      cisco.ios.ios_command:
        commands:
          - show running-config
      register: running_config

    - name: Save running config to local file
      ansible.builtin.copy:
        content: "{{ running_config.stdout[0] }}"
        dest: "./configs/{{ inventory_hostname }}-running.cfg"
      delegate_to: localhost
```

To restore a configuration:

```yaml
# playbook-ios-restore.yml
# Restores a saved configuration to an IOS device
- name: Restore IOS configuration
  hosts: ios_routers
  gather_facts: no

  tasks:
    - name: Load configuration from backup
      cisco.ios.ios_config:
        src: "./backups/ios/{{ inventory_hostname }}-backup.cfg"
        replace: line
        save_when: modified
```

## Compliance Checking

You can use Ansible to verify that devices comply with your standards:

```yaml
# playbook-ios-compliance.yml
# Checks IOS devices for compliance with security standards
- name: Check IOS compliance
  hosts: ios
  gather_facts: no

  tasks:
    - name: Gather current configuration
      cisco.ios.ios_command:
        commands:
          - show running-config
      register: running_config

    - name: Check SSH version 2 is enabled
      ansible.builtin.assert:
        that:
          - "'ip ssh version 2' in running_config.stdout[0]"
        fail_msg: "SSH version 2 is NOT enabled on {{ inventory_hostname }}"
        success_msg: "SSH version 2 is enabled"

    - name: Check password encryption is enabled
      ansible.builtin.assert:
        that:
          - "'service password-encryption' in running_config.stdout[0]"
        fail_msg: "Password encryption is NOT enabled on {{ inventory_hostname }}"
        success_msg: "Password encryption is enabled"

    - name: Check NTP is configured
      ansible.builtin.assert:
        that:
          - "'ntp server' in running_config.stdout[0]"
        fail_msg: "NTP is NOT configured on {{ inventory_hostname }}"
        success_msg: "NTP is configured"

    - name: Check telnet is disabled on VTY lines
      ansible.builtin.assert:
        that:
          - "'transport input ssh' in running_config.stdout[0]"
        fail_msg: "Telnet may still be enabled on {{ inventory_hostname }}"
        success_msg: "Transport input is SSH-only"
```

## Tips for IOS Automation

**Always use `save_when: modified`.** This saves the running config to startup config only when changes were actually made. Without this, your changes survive a reboot only until the next power cycle.

**Handle the enable password.** IOS requires an enable password to enter privileged mode. Set `ansible_become_method: enable` and provide the enable password.

**Watch for prompts.** Some IOS commands trigger confirmation prompts (like `crypto key generate rsa`). The `ios_command` module has a `prompt` parameter to handle these.

**Use resource modules when possible.** Resource modules like `ios_interfaces`, `ios_vlans`, and `ios_acls` provide a structured, declarative approach. Use `ios_config` for settings that do not have a dedicated resource module.

**Test with `--check --diff`.** The diff output shows exactly what lines would be added or removed from the configuration. This is extremely valuable for reviewing changes before applying them.

Cisco IOS automation with Ansible lets you manage your network infrastructure with the same rigor and repeatability that you apply to servers. Once you build a library of playbooks for your common operations, network changes become faster, safer, and fully auditable.
