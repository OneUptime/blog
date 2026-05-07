# How to Use Ansible vyos_config for IPv4 on VyOS Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, VyOS, IPv4, Network Automation, Vyos_config, Open Source Router

Description: Use the Ansible vyos.vyos.vyos_config module to configure IPv4 interfaces, static routing, and NAT on VyOS routers with set/delete command syntax.

## Introduction

VyOS is an open-source network OS based on Debian. The `vyos.vyos.vyos_config` module manages VyOS configuration using the native `set`/`delete` syntax via SSH.

## Inventory

```ini
[vyos_routers]
vyos1 ansible_host=192.168.1.40

[vyos_routers:vars]
ansible_user=vyos
ansible_password=VyOSpass
ansible_network_os=vyos.vyos.vyos
ansible_connection=ansible.netcommon.network_cli
```

## Configure IPv4 Interface

```yaml
# configure_vyos_ipv4.yml

---
- name: Configure IPv4 on VyOS
  hosts: vyos_routers
  gather_facts: false

  tasks:
    - name: Configure LAN interface
      vyos.vyos.vyos_config:
        lines:
          - set interfaces ethernet eth1 address '10.1.0.1/24'
          - set interfaces ethernet eth1 description 'LAN'

    - name: Configure WAN interface
      vyos.vyos.vyos_config:
        lines:
          - set interfaces ethernet eth0 address '203.0.113.2/30'
          - set interfaces ethernet eth0 description 'WAN'

    - name: Set default gateway
      vyos.vyos.vyos_config:
        lines:
          - set protocols static route 0.0.0.0/0 next-hop '203.0.113.1'
```

## Configure NAT Masquerade

```yaml
    - name: Configure outbound NAT masquerade
      vyos.vyos.vyos_config:
        lines:
          - set nat source rule 100 outbound-interface name 'eth0'
          - set nat source rule 100 source address '10.1.0.0/24'
          - set nat source rule 100 translation address 'masquerade'
```

## Configure Firewall

```yaml
    - name: Configure IPv4 firewall chain
      vyos.vyos.vyos_config:
        lines:
          - set firewall ipv4 name WAN-IN default-action 'drop'
          - set firewall ipv4 name WAN-IN rule 10 action 'accept'
          - set firewall ipv4 name WAN-IN rule 10 state established
          - set firewall ipv4 name WAN-IN rule 10 state related
          - set firewall ipv4 name WAN-IN rule 20 action 'drop'
          - set firewall ipv4 name WAN-IN rule 20 state invalid

    - name: Hook firewall into forwarded WAN traffic
      vyos.vyos.vyos_config:
        lines:
          - set firewall ipv4 forward filter rule 100 action 'jump'
          - set firewall ipv4 forward filter rule 100 inbound-interface name 'eth0'
          - set firewall ipv4 forward filter rule 100 jump-target 'WAN-IN'
```

## Configure OSPF

```yaml
    - name: Configure OSPF
      vyos.vyos.vyos_config:
        lines:
          - set protocols ospf parameters router-id '10.0.0.1'
          - set protocols ospf area 0 network '10.1.0.0/24'
          - set protocols ospf area 0 network '10.0.0.0/30'
```

## Delete Configuration

```yaml
    - name: Remove a route
      vyos.vyos.vyos_config:
        lines:
          - delete protocols static route 192.168.99.0/24
```

## Save and Run

```yaml
    - name: Save VyOS config
      vyos.vyos.vyos_config:
        save: true   # Saves to /config/config.boot
```

```bash
ansible-galaxy collection install vyos.vyos
ansible-playbook -i inventory.ini configure_vyos_ipv4.yml --check --diff
ansible-playbook -i inventory.ini configure_vyos_ipv4.yml
```

## Conclusion

`vyos.vyos.vyos_config` uses VyOS `set` and `delete` commands directly, making playbooks readable even for those unfamiliar with Ansible. The module commits configuration changes, and `save: true` persists the running configuration to the boot config file. The module also supports check mode, so `--check --diff` can be used to preview changes.
