# How to Write an Ansible Playbook to Configure IPv4 Addresses on Cisco IOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cisco IOS, IPv4, Network Automation, Playbook

Description: Learn how to write an Ansible playbook using the cisco.ios collection to configure IPv4 addresses on Cisco IOS router and switch interfaces.

## Step 1: Install Ansible and Cisco IOS Collection

```bash
python3 -m pip install --user ansible

# Install the Cisco IOS collection

ansible-galaxy collection install cisco.ios

# Verify
ansible-galaxy collection list | grep cisco.ios
```

## Step 2: Create Inventory File

```yaml
# inventory/hosts.yml
all:
  children:
    cisco_routers:
      hosts:
        router01:
          ansible_host: 192.168.1.1
        router02:
          ansible_host: 192.168.1.2
      vars:
        ansible_network_os: cisco.ios.ios
        ansible_connection: ansible.netcommon.network_cli
        ansible_user: admin
        ansible_password: "{{ vault_password }}"
        ansible_become: true
        ansible_become_method: enable
        ansible_become_password: "{{ vault_enable_password }}"
```

## Step 3: Write the Interface Configuration Playbook

```yaml
# playbooks/configure_interfaces.yml
---
- name: Configure IPv4 Interfaces on Cisco IOS
  hosts: cisco_routers
  gather_facts: false

  vars:
    default_interfaces:
      - name: GigabitEthernet0/0
        description: "LAN Interface"
        ip_address: "192.168.10.1"
        prefix_length: 24
        state: present

      - name: GigabitEthernet0/1
        description: "WAN to ISP"
        ip_address: "203.0.113.2"
        prefix_length: 30
        state: present

  tasks:
    - name: Configure interface IP addresses
      cisco.ios.ios_l3_interfaces:
        config:
          - name: "{{ item.name }}"
            ipv4:
              - address: "{{ item.ip_address }}/{{ item.prefix_length }}"
        state: merged
      loop: "{{ interfaces | default(default_interfaces) }}"

    - name: Configure interface descriptions
      cisco.ios.ios_interfaces:
        config:
          - name: "{{ item.name }}"
            description: "{{ item.description }}"
            enabled: true
        state: merged
      loop: "{{ interfaces | default(default_interfaces) }}"

    - name: Save running configuration
      cisco.ios.ios_command:
        commands:
          - write memory
      register: save_result

    - name: Verify interface configuration
      cisco.ios.ios_command:
        commands:
          - show ip interface brief
      register: intf_output

    - name: Display interface status
      debug:
        msg: "{{ intf_output.stdout[0] }}"
```

## Step 4: Use Host Variables for Per-Device Configuration

```yaml
# inventory/host_vars/router01.yml
interfaces:
  - name: GigabitEthernet0/0
    description: "LAN_R1"
    ip_address: "192.168.1.1"
    prefix_length: 24
  - name: GigabitEthernet0/1
    description: "WAN_R1"
    ip_address: "10.0.0.1"
    prefix_length: 30
```

```yaml
# inventory/host_vars/router02.yml
interfaces:
  - name: GigabitEthernet0/0
    description: "LAN_R2"
    ip_address: "192.168.2.1"
    prefix_length: 24
  - name: GigabitEthernet0/1
    description: "WAN_R2"
    ip_address: "10.0.0.2"
    prefix_length: 30
```

The playbook uses `{{ interfaces | default(default_interfaces) }}` so Ansible uses `host_vars` when present and falls back to the inline example otherwise.

## Step 5: Run the Playbook

```bash
# Test run (dry run/check mode)
ansible-playbook -i inventory/hosts.yml playbooks/configure_interfaces.yml --check

# Run for real
ansible-playbook -i inventory/hosts.yml playbooks/configure_interfaces.yml

# Run for specific host only
ansible-playbook -i inventory/hosts.yml playbooks/configure_interfaces.yml --limit router01

# Verbose output
ansible-playbook -i inventory/hosts.yml playbooks/configure_interfaces.yml -v
```

## Step 6: Verify Configuration with ios_command

```yaml
# playbooks/verify_interfaces.yml
---
- name: Verify Interface Configuration
  hosts: cisco_routers
  gather_facts: false

  vars:
    default_interfaces:
      - name: GigabitEthernet0/0
        description: "LAN Interface"
        ip_address: "192.168.10.1"
        prefix_length: 24
        state: present

      - name: GigabitEthernet0/1
        description: "WAN to ISP"
        ip_address: "203.0.113.2"
        prefix_length: 30
        state: present

  tasks:
    - name: Get interface brief
      cisco.ios.ios_command:
        commands:
          - show ip interface brief
      register: intf_output

    - name: Check for expected IPs
      assert:
        that:
          - item.ip_address in intf_output.stdout[0]
        fail_msg: "Expected IP {{ item.ip_address }} not found on {{ item.name }}!"
        success_msg: "Interface {{ item.name }} is configured correctly"
      loop: "{{ interfaces | default(default_interfaces) }}"
```

```bash
ansible-playbook -i inventory/hosts.yml playbooks/verify_interfaces.yml
```

## Conclusion

Ansible with `cisco.ios.ios_l3_interfaces` configures IPv4 addresses in a declarative, idempotent way. Define the desired interface state, run the playbook, and Ansible only makes changes where needed. Use `--check` for dry runs, `host_vars` for per-device configuration, and `cisco.ios.ios_command` with `assert` for post-change verification. Save with `write memory` at the end of the playbook to persist configuration across reboots.
