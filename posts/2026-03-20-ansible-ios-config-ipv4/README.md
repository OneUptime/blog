# How to Use Ansible ios_config to Push IPv4 Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cisco, IOS, IPv4, Network Automation, Ios_config

Description: Use the Ansible cisco.ios.ios_config module to push IPv4 interface and routing configurations to Cisco IOS devices, with idempotent configuration management and backup.

## Introduction

The `cisco.ios.ios_config` module pushes arbitrary IOS configuration blocks to Cisco devices. When you use full-form commands that match the running configuration, it is idempotent and only applies changes if the current configuration differs from the desired state.

## Inventory File

```ini
# inventory.ini

[cisco_routers]
router1 ansible_host=192.168.1.1
router2 ansible_host=192.168.1.2

[cisco_routers:vars]
ansible_user=admin
ansible_password=AdminPass123
ansible_network_os=cisco.ios.ios
ansible_connection=ansible.netcommon.network_cli
ansible_become=yes
ansible_become_method=enable
ansible_become_password=EnablePass
```

## Configure IPv4 Interface

```yaml
# configure_interface.yml
---
- name: Configure IPv4 interfaces on Cisco routers
  hosts: cisco_routers
  gather_facts: false

  tasks:
    - name: Configure GigabitEthernet0/1 with IPv4
      cisco.ios.ios_config:
        lines:
          - description LAN Interface
          - ip address 10.1.0.1 255.255.255.0
          - no shutdown
        parents: interface GigabitEthernet0/1

    - name: Configure WAN interface
      cisco.ios.ios_config:
        lines:
          - description WAN Uplink
          - ip address 203.0.113.2 255.255.255.252
          - no shutdown
        parents: interface GigabitEthernet0/0

    - name: Configure default route
      cisco.ios.ios_config:
        lines:
          - ip route 0.0.0.0 0.0.0.0 203.0.113.1
```

## Configure NAT

```yaml
    - name: Configure NAT overload
      cisco.ios.ios_config:
        lines:
          - ip nat inside source list NAT-INSIDE interface GigabitEthernet0/0 overload

    - name: Configure NAT ACL
      cisco.ios.ios_config:
        lines:
          - permit 10.1.0.0 0.0.255.255
        parents: ip access-list standard NAT-INSIDE

    - name: Mark interfaces for NAT
      cisco.ios.ios_config:
        lines:
          - ip nat inside
        parents: interface GigabitEthernet0/1

    - name: Mark WAN for NAT outside
      cisco.ios.ios_config:
        lines:
          - ip nat outside
        parents: interface GigabitEthernet0/0
```

## Backup Running Config

```yaml
    - name: Backup running config
      cisco.ios.ios_config:
        backup: yes
        backup_options:
          dir_path: ./backups
          filename: "{{ inventory_hostname }}-{{ now(fmt='%Y-%m-%d') }}"
```

## Save Running Config

```yaml
    - name: Save configuration to startup
      cisco.ios.ios_config:
        save_when: modified   # Only save if the running-config changed since the last save to startup-config
```

## Run the Playbook

```bash
ansible-playbook -i inventory.ini configure_interface.yml

# Check mode (dry run - no changes applied)
ansible-playbook -i inventory.ini configure_interface.yml --check --diff
```

## Conclusion

`cisco.ios.ios_config` provides IPv4 configuration management for Cisco IOS. Use full-form commands and `parents` to keep configuration matching idempotent, `backup: yes` to capture the current running-config, and `save_when: modified` to persist changes to NVRAM only when the running-config has changed since the last save to startup-config. Always test with `--check --diff` before applying to production.
