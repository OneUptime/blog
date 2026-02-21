# How to Use Ansible Facts to Get Disk Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Disk Management, Facts, System Administration

Description: How to use Ansible facts to discover disk devices, partitions, mount points, and storage capacity on managed hosts for capacity planning and monitoring.

---

Managing disk space and storage is a fundamental part of system administration. Ansible gathers detailed disk information during fact collection, covering everything from physical devices and partitions to mounted filesystems and their usage. This data is invaluable for capacity planning, alerting on low disk space, and making deployment decisions based on available storage.

## Disk Facts Overview

Ansible provides disk information through several fact keys:

- `ansible_facts['devices']` - physical block devices and their partitions
- `ansible_facts['mounts']` - mounted filesystems with usage statistics
- `ansible_facts['lvm']` - LVM volume groups, logical volumes, and physical volumes

Let us start by examining what each of these contains.

```yaml
# disk-facts-overview.yml
# Shows the main disk-related fact categories
---
- name: Display disk facts overview
  hosts: all
  gather_facts: yes
  tasks:
    - name: List all block devices
      ansible.builtin.debug:
        msg: "Block devices: {{ ansible_facts['devices'].keys() | list }}"

    - name: List all mount points
      ansible.builtin.debug:
        msg: "Mount points: {{ ansible_facts['mounts'] | map(attribute='mount') | list }}"

    - name: Show LVM info if available
      ansible.builtin.debug:
        var: ansible_facts['lvm']
      when: ansible_facts['lvm'] is defined
```

## Working with Block Devices

The `devices` dictionary contains information about each block device, including vendor, model, size, and partitions.

```yaml
# block-devices.yml
# Displays detailed information about each block device
---
- name: Show block device details
  hosts: all
  gather_facts: yes
  tasks:
    - name: Display each block device
      ansible.builtin.debug:
        msg:
          - "Device: /dev/{{ item.key }}"
          - "  Model: {{ item.value.model }}"
          - "  Vendor: {{ item.value.vendor }}"
          - "  Size: {{ item.value.size }}"
          - "  Removable: {{ item.value.removable }}"
          - "  Rotational: {{ item.value.rotational }}"
          - "  Partitions: {{ item.value.partitions.keys() | list }}"
      loop: "{{ ansible_facts['devices'] | dict2items }}"
      when: item.key is match('^(sd|nvme|vd|xvd)')
      loop_control:
        label: "{{ item.key }}"
```

The `rotational` field is useful for distinguishing SSDs (rotational: "0") from HDDs (rotational: "1").

## Getting Partition Information

Each device in the `devices` dictionary has a `partitions` sub-dictionary with partition-level details.

```yaml
# partition-info.yml
# Shows partition details for all block devices
---
- name: Show partition information
  hosts: all
  gather_facts: yes
  tasks:
    - name: Build list of all partitions
      ansible.builtin.set_fact:
        all_partitions: >-
          {{
            ansible_facts['devices']
            | dict2items
            | selectattr('value.partitions', 'mapping')
            | map(attribute='value.partitions')
            | map('dict2items')
            | flatten
            | list
          }}

    - name: Display partition details
      ansible.builtin.debug:
        msg:
          - "Partition: /dev/{{ item.key }}"
          - "  Size: {{ item.value.size }}"
          - "  Start: {{ item.value.start | default('N/A') }}"
          - "  Sectors: {{ item.value.sectors | default('N/A') }}"
          - "  UUID: {{ item.value.uuid | default('N/A') }}"
      loop: "{{ all_partitions }}"
      loop_control:
        label: "{{ item.key }}"
```

## Working with Mount Points

The `mounts` list contains detailed information about every mounted filesystem, including space usage.

```yaml
# mount-info.yml
# Shows mount point details with space calculations
---
- name: Display mount information
  hosts: all
  gather_facts: yes
  tasks:
    - name: Show each mount point with usage
      ansible.builtin.debug:
        msg:
          - "Mount: {{ item.mount }}"
          - "  Device: {{ item.device }}"
          - "  FS Type: {{ item.fstype }}"
          - "  Total: {{ (item.size_total / 1073741824) | round(2) }} GB"
          - "  Available: {{ (item.size_available / 1073741824) | round(2) }} GB"
          - "  Used: {{ ((item.size_total - item.size_available) / 1073741824) | round(2) }} GB"
          - "  Usage: {{ ((item.size_total - item.size_available) / item.size_total * 100) | round(1) }}%"
          - "  Options: {{ item.options }}"
      loop: "{{ ansible_facts['mounts'] }}"
      when: item.size_total > 0
      loop_control:
        label: "{{ item.mount }}"
```

## Checking Disk Space Before Deployment

One of the most practical uses of disk facts is validating that there is enough space before deploying an application.

```yaml
# check-disk-space.yml
# Validates available disk space before deploying an application
---
- name: Pre-deployment disk space check
  hosts: appservers
  gather_facts: yes
  vars:
    required_space_gb: 10
    deploy_mount: "/"
  tasks:
    - name: Find the target mount point
      ansible.builtin.set_fact:
        target_mount: >-
          {{
            ansible_facts['mounts']
            | selectattr('mount', 'equalto', deploy_mount)
            | first
          }}

    - name: Calculate available space in GB
      ansible.builtin.set_fact:
        available_gb: "{{ (target_mount.size_available / 1073741824) | round(2) }}"

    - name: Fail if insufficient disk space
      ansible.builtin.fail:
        msg: >
          Insufficient disk space on {{ deploy_mount }}.
          Available: {{ available_gb }} GB.
          Required: {{ required_space_gb }} GB.
      when: available_gb | float < required_space_gb | float

    - name: Disk space check passed
      ansible.builtin.debug:
        msg: "Disk space OK: {{ available_gb }} GB available on {{ deploy_mount }}"
```

## Generating Disk Usage Reports

Here is a playbook that generates a disk usage report across all hosts.

```yaml
# disk-report.yml
# Generates a disk usage report for all managed hosts
---
- name: Generate disk usage report
  hosts: all
  gather_facts: yes
  tasks:
    - name: Generate per-host disk report
      ansible.builtin.template:
        src: disk-report.txt.j2
        dest: "/tmp/disk-report-{{ inventory_hostname }}.txt"
      delegate_to: localhost
```

```jinja2
{# templates/disk-report.txt.j2 #}
{# Disk usage report generated by Ansible #}
Disk Usage Report: {{ ansible_facts['hostname'] }}
Date: {{ ansible_date_time.iso8601 }}
================================================

Block Devices:
{% for dev, info in ansible_facts['devices'].items() if dev is match('^(sd|nvme|vd|xvd)') %}
  /dev/{{ dev }} - {{ info.model | default('Unknown') }} - {{ info.size }}
{% for part, pinfo in info.partitions.items() %}
    /dev/{{ part }} - {{ pinfo.size }}
{% endfor %}
{% endfor %}

Mounted Filesystems:
{% for mount in ansible_facts['mounts'] | sort(attribute='mount') if mount.size_total > 0 %}
  {{ "%-20s" | format(mount.mount) }} {{ "%-10s" | format(mount.device) }} {{ "%-6s" | format(mount.fstype) }} {{ "%8.2f GB total" | format(mount.size_total / 1073741824) }} {{ "%6.1f%% used" | format((mount.size_total - mount.size_available) / mount.size_total * 100) }}
{% endfor %}

{% set critical_mounts = ansible_facts['mounts'] | selectattr('size_total', 'gt', 0) | list %}
Warnings:
{% for mount in critical_mounts %}
{% set usage_pct = (mount.size_total - mount.size_available) / mount.size_total * 100 %}
{% if usage_pct > 80 %}
  WARNING: {{ mount.mount }} is at {{ usage_pct | round(1) }}% capacity!
{% endif %}
{% endfor %}
```

## Alerting on High Disk Usage

You can use disk facts to trigger alerts when filesystems are nearly full.

```yaml
# disk-alerts.yml
# Checks all mounts and alerts on high usage
---
- name: Check disk usage and alert
  hosts: all
  gather_facts: yes
  vars:
    warn_threshold: 80
    critical_threshold: 90
  tasks:
    - name: Check each mount point
      ansible.builtin.set_fact:
        disk_warnings: >-
          {{
            ansible_facts['mounts']
            | selectattr('size_total', 'gt', 0)
            | list
            | map('combine', {'usage_pct': 0})
            | list
          }}

    - name: Calculate usage percentages
      ansible.builtin.set_fact:
        high_usage_mounts: >-
          {{
            ansible_facts['mounts']
            | selectattr('size_total', 'gt', 0)
            | rejectattr('fstype', 'in', ['tmpfs', 'devtmpfs', 'squashfs'])
            | list
            | json_query('[?(`size_total` - `size_available`) / `size_total` * `100` > `' + warn_threshold | string + '`]')
          }}

    - name: Report mounts over warning threshold
      ansible.builtin.debug:
        msg: >
          WARNING: {{ item.mount }} on {{ inventory_hostname }} is at
          {{ ((item.size_total - item.size_available) / item.size_total * 100) | round(1) }}%
          ({{ ((item.size_total - item.size_available) / 1073741824) | round(1) }}GB /
          {{ (item.size_total / 1073741824) | round(1) }}GB)
      loop: "{{ ansible_facts['mounts'] }}"
      when:
        - item.size_total > 0
        - item.fstype not in ['tmpfs', 'devtmpfs', 'squashfs']
        - ((item.size_total - item.size_available) / item.size_total * 100) > warn_threshold
      loop_control:
        label: "{{ item.mount }}"
```

## LVM Information

On systems using LVM, Ansible collects volume group and logical volume details.

```yaml
# lvm-facts.yml
# Shows LVM volume group and logical volume information
---
- name: Display LVM information
  hosts: all
  gather_facts: yes
  tasks:
    - name: Show volume groups
      ansible.builtin.debug:
        msg:
          - "VG: {{ item.key }}"
          - "  Size: {{ item.value.size_g }} GB"
          - "  Free: {{ item.value.free_g }} GB"
          - "  Num LVs: {{ item.value.num_lvs }}"
          - "  Num PVs: {{ item.value.num_pvs }}"
      loop: "{{ ansible_facts['lvm']['vgs'] | default({}) | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
      when: ansible_facts['lvm'] is defined

    - name: Show logical volumes
      ansible.builtin.debug:
        msg:
          - "LV: {{ item.key }}"
          - "  Size: {{ item.value.size_g }} GB"
          - "  VG: {{ item.value.vg }}"
      loop: "{{ ansible_facts['lvm']['lvs'] | default({}) | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
      when: ansible_facts['lvm'] is defined
```

## Detecting SSD vs HDD

The rotational flag in device facts helps you optimize configuration based on storage type.

```yaml
# detect-storage-type.yml
# Configures database differently based on SSD vs HDD
---
- name: Optimize config based on storage type
  hosts: dbservers
  gather_facts: yes
  tasks:
    - name: Determine if primary disk is SSD
      ansible.builtin.set_fact:
        primary_disk_is_ssd: >-
          {{
            ansible_facts['devices'][ansible_facts['mounts']
            | selectattr('mount', 'equalto', '/')
            | map(attribute='device')
            | first
            | regex_replace('/dev/', '')
            | regex_replace('[0-9]+$', '')
            | default('sda')]['rotational'] | default('1') == '0'
          }}
      ignore_errors: yes

    - name: Show storage type
      ansible.builtin.debug:
        msg: "Primary storage is {{ 'SSD' if primary_disk_is_ssd | default(false) else 'HDD' }}"
```

## Summary

Ansible disk facts provide a thorough view of storage on managed hosts. Use `ansible_facts['devices']` for physical disk details, `ansible_facts['mounts']` for filesystem usage, and `ansible_facts['lvm']` for volume management information. These facts enable pre-deployment space checks, automated disk usage reporting, capacity planning, and storage-type-specific configuration. By basing your storage decisions on facts rather than assumptions, your playbooks handle diverse storage configurations gracefully.
