# How to Use Ansible mount_facts Module to Get Mount Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filesystems, Facts, Storage Management

Description: Learn how to use Ansible to gather mount point information including filesystem types, usage stats, and mount options on managed hosts.

---

Mount points are where the rubber meets the road for storage management. Knowing what is mounted, where, with what options, and how much space is left is essential for deployment validation, capacity monitoring, and filesystem configuration. Ansible collects mount information as part of its standard fact gathering, and you can also use the dedicated approach to get even more detail.

## Mount Facts in Standard Gathering

Mount information is part of the standard fact gathering process. When `gather_facts: yes` (the default), Ansible populates `ansible_facts['mounts']` with a list of all mounted filesystems.

```yaml
# basic-mount-facts.yml
# Shows all mount points from standard fact gathering
---
- name: Show mount facts
  hosts: all
  gather_facts: yes
  tasks:
    - name: List all mount points
      ansible.builtin.debug:
        msg:
          - "Mount: {{ item.mount }}"
          - "Device: {{ item.device }}"
          - "FS Type: {{ item.fstype }}"
          - "Options: {{ item.options }}"
      loop: "{{ ansible_facts['mounts'] }}"
      loop_control:
        label: "{{ item.mount }}"
```

## Mount Facts Data Structure

Each mount entry in `ansible_facts['mounts']` contains these fields:

```yaml
# inspect-mount-structure.yml
# Shows the full data structure for mount entries
---
- name: Inspect mount data structure
  hosts: all
  gather_facts: yes
  tasks:
    - name: Show detailed mount info for root filesystem
      ansible.builtin.debug:
        var: item
      loop: "{{ ansible_facts['mounts'] }}"
      when: item.mount == "/"
      loop_control:
        label: "{{ item.mount }}"
```

A typical mount entry looks like:

```json
{
  "mount": "/",
  "device": "/dev/sda1",
  "fstype": "ext4",
  "options": "rw,relatime,errors=remount-ro",
  "size_total": 52710469632,
  "size_available": 35284901888,
  "block_size": 4096,
  "block_total": 12868768,
  "block_available": 8614478,
  "block_used": 4254290,
  "inode_total": 3276800,
  "inode_available": 3112459,
  "inode_used": 164341,
  "uuid": "abc12345-6789-0def-ghij-klmnopqrstuv"
}
```

This gives you total size, available space, block and inode counts, and the UUID of the filesystem.

## Calculating Disk Usage

The size fields are in bytes. Here is how to calculate usage percentages and display in human-readable formats.

```yaml
# disk-usage.yml
# Calculates and displays disk usage for all mounts
---
- name: Calculate disk usage
  hosts: all
  gather_facts: yes
  tasks:
    - name: Show usage for real filesystems
      ansible.builtin.debug:
        msg: >
          {{ item.mount }}:
          {{ (item.size_total / 1073741824) | round(1) }}GB total,
          {{ (item.size_available / 1073741824) | round(1) }}GB free,
          {{ ((item.size_total - item.size_available) / item.size_total * 100) | round(1) }}% used
          [{{ item.fstype }}]
      loop: "{{ ansible_facts['mounts'] }}"
      when:
        - item.size_total > 0
        - item.fstype not in ['tmpfs', 'devtmpfs', 'squashfs', 'overlay']
      loop_control:
        label: "{{ item.mount }}"
```

## Checking Inode Usage

Running out of inodes is a common issue that disk space checks miss. Many small files (like mail queues or session files) can exhaust inodes while space looks fine.

```yaml
# check-inodes.yml
# Monitors inode usage alongside disk space
---
- name: Check inode usage
  hosts: all
  gather_facts: yes
  vars:
    inode_warn_pct: 80
  tasks:
    - name: Check inode usage on all real filesystems
      ansible.builtin.debug:
        msg: >
          WARNING: {{ item.mount }} inode usage at
          {{ ((item.inode_total - item.inode_available) / item.inode_total * 100) | round(1) }}%
          ({{ item.inode_total - item.inode_available }}/{{ item.inode_total }} inodes used)
      loop: "{{ ansible_facts['mounts'] }}"
      when:
        - item.inode_total | default(0) > 0
        - ((item.inode_total - item.inode_available) / item.inode_total * 100) > inode_warn_pct
      loop_control:
        label: "{{ item.mount }}"
```

## Filtering Mounts by Filesystem Type

You often want to work with only certain types of filesystems, ignoring virtual ones like tmpfs.

```yaml
# filter-mounts.yml
# Filters mounts to show only physical filesystems
---
- name: Show only physical filesystems
  hosts: all
  gather_facts: yes
  vars:
    physical_fstypes:
      - ext4
      - xfs
      - btrfs
      - zfs
      - ext3
  tasks:
    - name: Get physical mounts
      ansible.builtin.set_fact:
        physical_mounts: >-
          {{
            ansible_facts['mounts']
            | selectattr('fstype', 'in', physical_fstypes)
            | list
          }}

    - name: Display physical mounts
      ansible.builtin.debug:
        msg:
          - "{{ item.mount }} ({{ item.device }})"
          - "  Type: {{ item.fstype }}"
          - "  Size: {{ (item.size_total / 1073741824) | round(2) }} GB"
          - "  Used: {{ ((item.size_total - item.size_available) / item.size_total * 100) | round(1) }}%"
      loop: "{{ physical_mounts }}"
      loop_control:
        label: "{{ item.mount }}"

    - name: Get NFS/CIFS network mounts
      ansible.builtin.set_fact:
        network_mounts: >-
          {{
            ansible_facts['mounts']
            | selectattr('fstype', 'in', ['nfs', 'nfs4', 'cifs', 'glusterfs'])
            | list
          }}

    - name: Display network mounts
      ansible.builtin.debug:
        msg: "Network mount: {{ item.device }} on {{ item.mount }} ({{ item.fstype }})"
      loop: "{{ network_mounts }}"
      loop_control:
        label: "{{ item.mount }}"
      when: network_mounts | length > 0
```

## Checking Mount Options

Mount options affect security and performance. Here is how to audit them.

```yaml
# audit-mount-options.yml
# Audits mount options for security compliance
---
- name: Audit mount options
  hosts: all
  gather_facts: yes
  tasks:
    - name: Check for mounts without noexec on /tmp
      ansible.builtin.debug:
        msg: "SECURITY: /tmp is mounted without noexec option"
      when:
        - ansible_facts['mounts'] | selectattr('mount', 'equalto', '/tmp') | list | length > 0
        - "'noexec' not in (ansible_facts['mounts'] | selectattr('mount', 'equalto', '/tmp') | first).options"

    - name: Check for mounts without nosuid on /tmp
      ansible.builtin.debug:
        msg: "SECURITY: /tmp is mounted without nosuid option"
      when:
        - ansible_facts['mounts'] | selectattr('mount', 'equalto', '/tmp') | list | length > 0
        - "'nosuid' not in (ansible_facts['mounts'] | selectattr('mount', 'equalto', '/tmp') | first).options"

    - name: Check that /home has nodev
      ansible.builtin.debug:
        msg: "SECURITY: /home is mounted without nodev option"
      when:
        - ansible_facts['mounts'] | selectattr('mount', 'equalto', '/home') | list | length > 0
        - "'nodev' not in (ansible_facts['mounts'] | selectattr('mount', 'equalto', '/home') | first).options"

    - name: List all mounts with read-write access
      ansible.builtin.debug:
        msg: "Read-write mount: {{ item.mount }} ({{ item.device }})"
      loop: "{{ ansible_facts['mounts'] }}"
      when:
        - "'rw' in item.options.split(',')"
        - item.fstype not in ['tmpfs', 'devtmpfs']
      loop_control:
        label: "{{ item.mount }}"
```

## Pre-Deployment Mount Validation

Verify that expected mount points exist with sufficient space before deploying.

```yaml
# validate-mounts.yml
# Validates mount points before deployment
---
- name: Validate deployment mount requirements
  hosts: appservers
  gather_facts: yes
  vars:
    mount_requirements:
      - mount: "/"
        min_free_gb: 5
      - mount: "/var"
        min_free_gb: 10
      - mount: "/opt"
        min_free_gb: 20
      - mount: "/var/log"
        min_free_gb: 5
  tasks:
    - name: Check each required mount
      ansible.builtin.assert:
        that:
          - matching_mounts | length > 0
          - (matching_mounts[0].size_available / 1073741824) >= item.min_free_gb
        fail_msg: >
          Mount {{ item.mount }} check failed:
          {{ 'not mounted' if matching_mounts | length == 0
             else 'only ' + ((matching_mounts[0].size_available / 1073741824) | round(1) | string) + 'GB free, need ' + (item.min_free_gb | string) + 'GB' }}
        success_msg: >
          Mount {{ item.mount }}: {{ (matching_mounts[0].size_available / 1073741824) | round(1) }}GB free (need {{ item.min_free_gb }}GB)
      vars:
        matching_mounts: "{{ ansible_facts['mounts'] | selectattr('mount', 'equalto', item.mount) | list }}"
      loop: "{{ mount_requirements }}"
      loop_control:
        label: "{{ item.mount }}"
```

## Generating Mount Reports

Create a comprehensive filesystem report for documentation or monitoring.

```yaml
# mount-report.yml
# Generates a detailed mount point report
---
- name: Generate mount report
  hosts: all
  gather_facts: yes
  tasks:
    - name: Create mount report
      ansible.builtin.template:
        src: mount-report.txt.j2
        dest: "/tmp/mount-report-{{ inventory_hostname }}.txt"
      delegate_to: localhost
```

```jinja2
{# templates/mount-report.txt.j2 #}
{# Filesystem mount report generated by Ansible #}
Filesystem Report: {{ ansible_facts['hostname'] }}
Date: {{ ansible_date_time.iso8601 }}
================================================================

{% for mount in ansible_facts['mounts'] | sort(attribute='mount') %}
{% if mount.size_total > 0 and mount.fstype not in ['tmpfs', 'devtmpfs', 'squashfs'] %}
{% set usage_pct = ((mount.size_total - mount.size_available) / mount.size_total * 100) | round(1) %}
{{ mount.mount }}
  Device:    {{ mount.device }}
  Type:      {{ mount.fstype }}
  Total:     {{ (mount.size_total / 1073741824) | round(2) }} GB
  Used:      {{ ((mount.size_total - mount.size_available) / 1073741824) | round(2) }} GB
  Available: {{ (mount.size_available / 1073741824) | round(2) }} GB
  Usage:     {{ usage_pct }}% {{ '*** WARNING ***' if usage_pct > 85 else '' }}
  Inodes:    {{ mount.inode_used | default(0) }}/{{ mount.inode_total | default(0) }}
  Options:   {{ mount.options }}
  UUID:      {{ mount.uuid | default('N/A') }}

{% endif %}
{% endfor %}
```

## Comparing Mounts Across Environments

Verify that staging and production have matching mount configurations.

```yaml
# compare-mounts.yml
# Compares mount configurations between hosts
---
- name: Gather mount facts from all hosts
  hosts: all
  gather_facts: yes
  tasks: []

- name: Compare mount points
  hosts: localhost
  gather_facts: no
  tasks:
    - name: Check that all production servers have /data mount
      ansible.builtin.debug:
        msg: >
          {{ item }}:
          {{ '/data mount exists'
             if hostvars[item]['ansible_facts']['mounts'] | selectattr('mount', 'equalto', '/data') | list | length > 0
             else '/data mount MISSING' }}
      loop: "{{ groups['production'] | default([]) }}"
```

## Summary

Mount facts give you complete visibility into filesystem state across your infrastructure. The data is gathered automatically as part of standard fact collection and includes mount points, device paths, filesystem types, size and inode statistics, and mount options. Use this information for pre-deployment space validation, security auditing of mount options, capacity monitoring, and ensuring consistent filesystem layouts across environments. The combination of mount facts with assertions and conditionals gives your playbooks the ability to verify storage requirements before making any changes.
