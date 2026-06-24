# How to Use Ansible junos_config for IPv4 on Juniper Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Juniper, Junos, IPv4, Network Automation, Junos_config

Description: Use the Ansible junipernetworks.junos.junos_config module to push IPv4 interface and routing configurations to Juniper JunOS devices using Junos set commands and Jinja2 templates.

## Introduction

The `junipernetworks.junos.junos_config` module configures Juniper Junos devices via NETCONF. It accepts Junos set commands and source configuration files such as XML, with rollback and commit-confirmed support for safer deployments. Before using it, ensure NETCONF is enabled on the device and `ncclient` is installed on the control node.

## Inventory

```ini
[juniper_routers]
jrouter1 ansible_host=192.168.1.10

[juniper_routers:vars]
ansible_user=admin
ansible_password=AdminPass
ansible_network_os=junipernetworks.junos.junos
ansible_connection=ansible.netcommon.netconf
```

## Configure IPv4 Interface with Set Commands

```yaml
# configure_junos_ipv4.yml

---
- name: Configure IPv4 on Juniper routers
  hosts: juniper_routers
  gather_facts: false

  tasks:
    - name: Set IPv4 address on ge-0/0/1
      junipernetworks.junos.junos_config:
        lines:
          - set interfaces ge-0/0/1 description "LAN Interface"
          - set interfaces ge-0/0/1 unit 0 family inet address 10.1.0.1/24
          - set interfaces ge-0/0/0 description "WAN Uplink"
          - set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.2/30
        comment: "Configure IPv4 interfaces"
```

## Configure Static Route

```yaml
    - name: Configure default route
      junipernetworks.junos.junos_config:
        lines:
          - set routing-options static route 0.0.0.0/0 next-hop 203.0.113.1
        comment: "Set default gateway"
```

## Configure with XML Template

```yaml
    - name: Apply Junos XML configuration
      junipernetworks.junos.junos_config:
        src: templates/junos_interfaces.xml
        src_format: xml
        update: merge
        comment: "Apply interface template"
```

```xml
<!-- templates/junos_interfaces.xml -->
<configuration>
  <interfaces>
    <interface>
      <name>ge-0/0/1</name>
      <unit>
        <name>0</name>
        <family>
          <inet>
            <address>
              <name>10.1.0.1/24</name>
            </address>
          </inet>
        </family>
      </unit>
    </interface>
  </interfaces>
</configuration>
```

## Rollback on Failure

```yaml
    - name: Configure with commit confirmed
      junipernetworks.junos.junos_config:
        lines:
          - set routing-options static route 10.2.0.0/16 next-hop 10.1.0.254
        confirm: 5          # Auto-rollback after 5 minutes unless confirmed

    - name: Confirm the commit after validation
      junipernetworks.junos.junos_config:
        confirm_commit: true
```

## Backup Running Config

```yaml
    - name: Save current config backup
      junipernetworks.junos.junos_config:
        backup: yes
        backup_options:
          dir_path: ./backups/
          filename: "{{ inventory_hostname }}-{{ lookup('pipe', 'date +%Y%m%d') }}"
```

## Run the Playbook

```bash
# Install collection and NETCONF dependency
ansible-galaxy collection install junipernetworks.junos
python3 -m pip install ncclient

# Run with check mode
ansible-playbook -i inventory.ini configure_junos_ipv4.yml --check --diff

# Apply
ansible-playbook -i inventory.ini configure_junos_ipv4.yml
```

## Conclusion

`junipernetworks.junos.junos_config` uses NETCONF for reliable Junos configuration management. The `junipernetworks.junos` collection is currently deprecated and scheduled for removal in Ansible 14, so plan accordingly for long-term automation. Use set commands for simple changes, XML configuration files for complex configurations, the `confirm` parameter for automatic rollback on commit timeout, and `backup: yes` to preserve pre-change state. Always test with `--check --diff` before production deployment.
