# How to Enable IPv6 Forwarding with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, Sysctl, Linux, Networking, Automation

Description: A guide to enabling and persisting IPv6 packet forwarding on Linux hosts using Ansible's sysctl module.

IPv6 forwarding must be enabled on any Linux host that acts as a router, Kubernetes node, or VPN gateway. Ansible's `ansible.posix.sysctl` module configures kernel parameters idempotently and persistently across large fleets.

## Playbook: Enable IPv6 Forwarding

```yaml
# enable-ipv6-forwarding.yml

---
- name: Enable IPv6 forwarding on all infrastructure nodes
  hosts: infrastructure
  become: true

  tasks:
    - name: Enable IPv6 forwarding on all interfaces
      ansible.posix.sysctl:
        name: net.ipv6.conf.all.forwarding
        value: "1"
        state: present
        # Write to a sysctl.d file for persistence across reboots
        sysctl_file: /etc/sysctl.d/99-ipv6-forwarding.conf
        reload: true

    - name: Enable IPv6 forwarding for new interfaces (default)
      ansible.posix.sysctl:
        name: net.ipv6.conf.default.forwarding
        value: "1"
        state: present
        sysctl_file: /etc/sysctl.d/99-ipv6-forwarding.conf
        reload: false

    - name: Disable Router Advertisement acceptance on all interfaces
      # When forwarding is enabled, accepting RAs can cause routing issues
      ansible.posix.sysctl:
        name: net.ipv6.conf.all.accept_ra
        value: "0"
        state: present
        sysctl_file: /etc/sysctl.d/99-ipv6-forwarding.conf
        reload: false

    - name: Apply all sysctl settings now
      ansible.builtin.command:
        cmd: sysctl --system
      changed_when: false
```

## Verify the Setting After Configuration

```yaml
# verify-ipv6-forwarding.yml
---
- name: Verify IPv6 forwarding is enabled
  hosts: infrastructure
  become: true

  tasks:
    - name: Read current IPv6 forwarding value
      ansible.builtin.command:
        cmd: sysctl -n net.ipv6.conf.all.forwarding
      register: forwarding_value
      changed_when: false

    - name: Assert IPv6 forwarding is enabled
      ansible.builtin.assert:
        that:
          - forwarding_value.stdout | int == 1
        fail_msg: "IPv6 forwarding is NOT enabled on {{ inventory_hostname }}"
        success_msg: "IPv6 forwarding is enabled on {{ inventory_hostname }}"

    - name: Read current accept_ra value
      ansible.builtin.command:
        cmd: sysctl -n net.ipv6.conf.all.accept_ra
      register: accept_ra_value
      changed_when: false

    - name: Assert accept_ra is disabled
      ansible.builtin.assert:
        that:
          - accept_ra_value.stdout | int == 0
        fail_msg: "accept_ra is still enabled on {{ inventory_hostname }}"
```

## Role-Based Structure for Reuse

```yaml
# roles/ipv6_forwarding/tasks/main.yml
---
- name: Configure IPv6 forwarding sysctl settings
  ansible.posix.sysctl:
    name: "{{ item.name }}"
    value: "{{ item.value }}"
    state: present
    sysctl_set: true
    sysctl_file: /etc/sysctl.d/99-ipv6-forwarding.conf
    reload: false
  loop:
    - { name: net.ipv6.conf.all.forwarding, value: "1" }
    - { name: net.ipv6.conf.default.forwarding, value: "1" }
    - { name: net.ipv6.conf.all.accept_ra, value: "0" }
    - { name: net.ipv6.conf.default.accept_ra, value: "0" }
```

## Conditionally Apply Only to Kubernetes Nodes

```yaml
# site.yml - Only enable forwarding on Kubernetes and VPN nodes
---
- name: Enable IPv6 forwarding on Kubernetes nodes
  hosts: k8s_nodes:vpn_gateways
  become: true
  roles:
    - ipv6_forwarding
```

## Run the Playbook

```bash
# Check mode: show what would change
ansible-playbook enable-ipv6-forwarding.yml -i inventory.ini --check --diff

# Apply the configuration
ansible-playbook enable-ipv6-forwarding.yml -i inventory.ini

# Verify
ansible-playbook verify-ipv6-forwarding.yml -i inventory.ini
```

Using Ansible's `sysctl` module to manage IPv6 forwarding ensures the setting is applied consistently, persisted across reboots, and can be audited via Ansible's idempotent run reports.
