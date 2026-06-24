# How to Use Ansible to Deploy SNMP Configuration Across Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SNMP, IPv4, Network Automation, Monitoring, Multi-Vendor

Description: Use Ansible to deploy SNMPv3 and SNMPv2c configuration across Cisco IOS, Linux hosts, and Juniper devices for centralized IPv4 network monitoring.

## Introduction

SNMP configuration is a repetitive task that benefits greatly from automation. Ansible can push consistent SNMP community strings, trap destinations, and, where needed, SNMPv3 credentials across hundreds of devices in a single playbook run.

## Inventory with Groups

```ini
[cisco_routers]
r1 ansible_host=10.1.1.1
r2 ansible_host=10.1.1.2

[cisco_routers:vars]
ansible_connection=ansible.netcommon.network_cli
ansible_network_os=cisco.ios.ios
ansible_become=true
ansible_become_method=enable

[linux_servers]
srv1 ansible_host=10.1.10.10
srv2 ansible_host=10.1.10.11

[juniper_routers]
jr1 ansible_host=10.1.20.1
```

## Configure SNMP on Cisco IOS

```yaml
# deploy_snmp.yml

---
- name: Configure SNMP on Cisco IOS
  hosts: cisco_routers
  gather_facts: false

  vars:
    snmp_community: MonitorCommunity
    snmp_trap_host: 10.1.50.10
    snmp_location: "DC1-Row3-Rack5"
    snmp_contact: "netops@example.com"

  tasks:
    - name: Configure SNMPv2c read-only community
      cisco.ios.ios_config:
        lines:
          - "snmp-server community {{ snmp_community }} RO"
          - "snmp-server location {{ snmp_location }}"
          - "snmp-server contact {{ snmp_contact }}"
          - "snmp-server host {{ snmp_trap_host }} version 2c {{ snmp_community }}"
          - snmp-server enable traps

    - name: Configure SNMPv3 user
      cisco.ios.ios_config:
        lines:
          - "snmp-server group MONITOR v3 priv"
          - "snmp-server user snmpv3user MONITOR v3 auth sha AuthPass123 priv aes 256 PrivPass456"
```

## Configure SNMP on Linux (net-snmp)

```yaml
- name: Configure SNMP on Linux hosts
  hosts: linux_servers
  become: yes
  gather_facts: true

  vars:
    snmp_community: MonitorCommunity
    snmp_trap_host: 10.1.50.10
    snmp_location: "DC1-Row3-Rack5"
    snmp_contact: "netops@example.com"

  tasks:
    - name: Install SNMP agent
      ansible.builtin.package:
        name: "{{ 'snmpd' if ansible_facts['os_family'] == 'Debian' else 'net-snmp' }}"
        state: present

    - name: Deploy snmpd.conf
      ansible.builtin.template:
        src: templates/snmpd.conf.j2
        dest: /etc/snmp/snmpd.conf
        owner: root
        mode: '0600'
      notify: restart snmpd

  handlers:
    - name: restart snmpd
      ansible.builtin.service:
        name: snmpd
        state: restarted
        enabled: yes
```

```jinja2
{# templates/snmpd.conf.j2 #}
# Managed by Ansible
agentAddress  udp:161
rocommunity {{ snmp_community }} {{ ansible_default_ipv4.network }}/{{ ansible_default_ipv4.prefix }}
syslocation {{ snmp_location | default('Unknown') }}
syscontact {{ snmp_contact | default('netops@example.com') }}
trap2sink {{ snmp_trap_host }} {{ snmp_community }}
```

## Configure SNMP on Juniper Junos OS

Make sure NETCONF is already enabled on the Junos devices before running this play.

```yaml
- name: Configure SNMP on Juniper
  hosts: juniper_routers
  connection: local
  gather_facts: false

  vars:
    host: "{{ ansible_host }}"

  tasks:
    - name: Configure SNMPv2c
      juniper.device.config:
        load: set
        lines:
          - "set snmp community MonitorCommunity authorization read-only"
          - "set snmp community MonitorCommunity clients 10.1.50.0/24"
          - "set snmp trap-group MONITORS version v2"
          - "set snmp trap-group MONITORS targets 10.1.50.10"
          - "set snmp location DC1-Row3"
```

## Run the Playbook

```bash
ansible-galaxy collection install ansible.netcommon cisco.ios juniper.device
python3 -m pip install junos-eznc jxmlease xmltodict looseversion
ansible-playbook -i inventory.ini deploy_snmp.yml
```

## Conclusion

Deploying SNMP with Ansible ensures consistent community strings and trap destinations across all devices, while still letting you add SNMPv3 credentials where needed. Use group variables for SNMP parameters shared across device types, Jinja2 templates for Linux `snmpd.conf`, and the appropriate configuration modules for network OS devices. SNMPv3 with authentication and encryption is recommended for production environments.
