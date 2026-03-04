# How to Write Ansible Playbooks for RHEL Patch Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Patch Management, Updates, Security, Linux

Description: Write Ansible playbooks to automate RHEL patching, including security-only updates, staged rollouts, and post-patch validation.

---

Managing patches across multiple RHEL servers manually is error-prone and time-consuming. Ansible playbooks let you automate the entire patching lifecycle: checking for updates, applying them in stages, and rebooting when necessary.

## Basic Patching Playbook

Create a playbook that applies all available updates:

```yaml
# patch_rhel.yml - Apply all available updates
---
- name: Patch RHEL servers
  hosts: all
  become: true
  serial: "25%"  # Patch 25% of hosts at a time (rolling update)

  tasks:
    - name: Check for available updates
      dnf:
        list: updates
      register: available_updates

    - name: Display number of available updates
      debug:
        msg: "{{ available_updates.results | length }} updates available"

    - name: Apply all available updates
      dnf:
        name: "*"
        state: latest
        security: false
      register: patch_result

    - name: Check if reboot is required
      stat:
        path: /var/run/reboot-required
      register: reboot_file

    - name: Reboot if kernel was updated
      reboot:
        reboot_timeout: 300
        msg: "Rebooting for kernel update"
      when: patch_result.changed
```

## Security-Only Patching

Apply only security errata:

```yaml
# security_patch.yml - Apply security updates only
---
- name: Apply security patches
  hosts: all
  become: true

  tasks:
    - name: Apply security updates only
      dnf:
        name: "*"
        state: latest
        security: true
        bugfix: false
      register: security_result

    - name: Log patching results
      copy:
        content: |
          Patched: {{ ansible_date_time.iso8601 }}
          Changed: {{ security_result.changed }}
          Host: {{ inventory_hostname }}
        dest: /var/log/ansible-patch.log
```

## Post-Patch Validation

Add validation tasks to confirm services are healthy after patching:

```yaml
    # Add these tasks after patching
    - name: Verify critical services are running
      service_facts:

    - name: Check that httpd is running
      assert:
        that:
          - "'httpd.service' in ansible_facts.services"
          - "ansible_facts.services['httpd.service'].state == 'running'"
        fail_msg: "httpd is not running after patching"

    - name: Verify system is accessible on port 443
      wait_for:
        port: 443
        timeout: 30
```

Run the patching playbook with a staged rollout:

```bash
# Dry run first
ansible-playbook patch_rhel.yml -i inventory.ini --check

# Apply patches
ansible-playbook patch_rhel.yml -i inventory.ini
```
