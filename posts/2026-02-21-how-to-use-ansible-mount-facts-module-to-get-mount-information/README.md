# How to Use Ansible mount_facts Module to Get Mount Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filesystem, Facts, Storage Management

Description: Learn how to use Ansible to gather mount point information including filesystem types, usage stats, and mount options on managed hosts.

---

Mount points are where the rubber meets the road for storage management. Knowing what is mounted, where, with what options, and how much space is left is essential for deployment validation, capacity monitoring, and filesystem configuration. Ansible collects mount information as part of its standard fact gathering, and ansible-core 2.18 and later also include the dedicated `ansible.builtin.mount_facts` module.

## Mount Facts with mount_facts

The `ansible.builtin.mount_facts` module populates `ansible_facts['mount_points']` with a dictionary keyed by mount point. Each value contains mount information similar to the standard `ansible_facts['mounts']` list. Use `sources: dynamic` when you want currently mounted filesystems rather than static entries from files such as `/etc/fstab`.

```yaml
# basic-mount-facts.yml

# Shows all mount points from the mount_facts module
---
- name: Show mount facts
  hosts: all
  gather_facts: no
  tasks:
    - name: Gather current mount facts
      ansible.builtin.mount_facts:
        sources:
          - dynamic

    - name: List all mount points
      ansible.builtin.debug:
        msg:
          - "Mount: {{ item.mount }}"
          - "Device: {{ item.device }}"
          - "FS Type: {{ item.fstype }}"
          - "Options: {{ item.options }}"
      loop: "{{ ansible_facts['mount_points'].values() | list }}"
      loop_control:
        label: "{{ item.mount }}"
```

## Mount Facts Data Structure

Each mount entry in `ansible_facts['mount_points']` contains these fields:

```yaml
# inspect-mount-structure.yml
# Shows the full data structure for mount entries
---
- name: Inspect mount data structure
  hosts: all
  gather_facts: no
  tasks:
    - name: Gather current mount facts
      ansible.builtin.mount_facts:
        sources:
          - dynamic

    - name: Show detailed mount info for root filesystem
      ansible.builtin.debug:
        var: item
      loop: "{{ ansible_facts['mount_points'].values() | list }}"
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
  "uuid": "abc12345-6789-0def-ghij-klmnopqrstuv",
  "ansible_context": {
    "source": "/proc/mounts",
    "source_data": "/dev/sda1 / ext4 rw,relatime,errors=remount-ro 0 0"
  }
}
```

This gives you total size, available space, block and inode counts, the UUID of the filesystem, and context about where Ansible read the mount entry.

## Calculating Disk Usage

The size fields are in bytes. Here is how to calculate usage percentages and display in human-readable formats.

```yaml
# disk-usage.yml
# Calculates and displays disk usage for all mounts
---
- name: Calculate disk usage
  hosts: all
  gather_facts: no
  tasks:
    - name: Gather current mount facts
      ansible.builtin.mount_facts:
        sources:
          - dynamic

    - name: Show usage for real filesystems
      ansible.builtin.debug:
        msg: >
          {{ item.mount }}:
          {{ (item.size_total / 1073741824) | round(1) }}GB total,
          {{ (item.size_available / 1073741824) | round(1) }}GB free,
          {{ ((item.size_total - item.size_available) / item.size_total * 100) | round(1) }}% used
          [{{ item.fstype }}]
      loop: "{{ ansible_facts['mount_points'].values() | list }}"
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
  gather_facts: no
  vars:
    inode_warn_pct: 80
  tasks:
    - name: Gather current mount facts
      ansible.builtin.mount_facts:
        sources:
          - dynamic

    - name: Check inode usage on all real filesystems
      ansible.builtin.debug:
        msg: >
          WARNING: {{ item.mount }} inode usage at
          {{ ((item.inode_total - item.inode_available) / item.inode_total * 100) | round(1) }}%
          ({{ item.inode_total - item.inode_available }}/{{ item.inode_total }} inodes used)
      loop: "{{ ansible_facts['mount_points'].values() | list }}"
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
  gather_facts: no
  vars:
    physical_fstypes:
      - ext4
      - xfs
      - btrfs
      - zfs
      - ext3
  tasks:
    - name: Gather current mount facts
      ansible.builtin.mount_facts:
        sources:
          - dynamic

    - name: Get physical mounts
      ansible.builtin.set_fact:
        physical_mounts: >-
          {{
            ansible_facts['mount_points'].values() | list
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
            ansible_facts['mount_points'].values() | list
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
  gather_facts: no
  tasks:
    - name: Gather current mount facts
      ansible.builtin.mount_facts:
        sources:
          - dynamic

    - name: Store mount list
      ansible.builtin.set_fact:
        mount_list: "{{ ansible_facts['mount_points'].values() | list }}"

    - name: Check for mounts without noexec on /tmp
      ansible.builtin.debug:
        msg: "SECURITY: /tmp is mounted without noexec option"
      when:
        - tmp_mounts | length > 0
        - "'noexec' not in tmp_mounts[0].options.split(',')"
      vars:
        tmp_mounts: "{{ mount_list | selectattr('mount', 'equalto', '/tmp') | list }}"

    - name: Check for mounts without nosuid on /tmp
      ansible.builtin.debug:
        msg: "SECURITY: /tmp is mounted without nosuid option"
      when:
        - tmp_mounts | length > 0
        - "'nosuid' not in tmp_mounts[0].options.split(',')"
      vars:
        tmp_mounts: "{{ mount_list | selectattr('mount', 'equalto', '/tmp') | list }}"

    - name: Check that /home has nodev
      ansible.builtin.debug:
        msg: "SECURITY: /home is mounted without nodev option"
      when:
        - home_mounts | length > 0
        - "'nodev' not in home_mounts[0].options.split(',')"
      vars:
        home_mounts: "{{ mount_list | selectattr('mount', 'equalto', '/home') | list }}"

    - name: List all mounts with read-write access
      ansible.builtin.debug:
        msg: "Read-write mount: {{ item.mount }} ({{ item.device }})"
      loop: "{{ mount_list }}"
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
  gather_facts: no
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
    - name: Gather current mount facts
      ansible.builtin.mount_facts:
        sources:
          - dynamic

    - name: Check each required mount
      ansible.builtin.assert:
        that:
          - matching_mounts | length > 0
          - matching_mounts | length == 0 or (matching_mounts[0].size_available / 1073741824) >= item.min_free_gb
        fail_msg: >
          Mount {{ item.mount }} check failed:
          {{ 'not mounted' if matching_mounts | length == 0
             else 'only ' + ((matching_mounts[0].size_available / 1073741824) | round(1) | string) + 'GB free, need ' + (item.min_free_gb | string) + 'GB' }}
        success_msg: >
          Mount {{ item.mount }}: {{ (matching_mounts[0].size_available / 1073741824) | round(1) }}GB free (need {{ item.min_free_gb }}GB)
      vars:
        matching_mounts: "{{ ansible_facts['mount_points'].values() | list | selectattr('mount', 'equalto', item.mount) | list }}"
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
    - name: Gather current mount facts
      ansible.builtin.mount_facts:
        sources:
          - dynamic

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

{% for mount in ansible_facts['mount_points'].values() | list | sort(attribute='mount') %}
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
  gather_facts: no
  tasks:
    - name: Gather current mount facts
      ansible.builtin.mount_facts:
        sources:
          - dynamic

- name: Compare mount points
  hosts: localhost
  gather_facts: no
  tasks:
    - name: Check that all production servers have /data mount
      ansible.builtin.debug:
        msg: >
          {{ item }}:
          {{ '/data mount exists'
             if hostvars[item]['ansible_facts']['mount_points'].values() | list | selectattr('mount', 'equalto', '/data') | list | length > 0
             else '/data mount MISSING' }}
      loop: "{{ groups['production'] | default([]) }}"
```

## Summary

Mount facts give you complete visibility into filesystem state across your infrastructure. The data includes mount points, device paths, filesystem types, size and inode statistics, and mount options. Use this information for pre-deployment space validation, security auditing of mount options, capacity monitoring, and ensuring consistent filesystem layouts across environments. The combination of mount facts with assertions and conditionals gives your playbooks the ability to verify storage requirements before making any changes.
