# How to Use the human_readable Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, Formatting, Storage, DevOps

Description: Learn how to use the human_readable filter in Ansible to convert byte values into readable formats like KB, MB, and GB for reports and alerts.

---

Raw byte values are hard to read. When your monitoring system reports that a disk has 107374182400 bytes free, your brain does not instantly register that as 100 GB. The `human_readable` filter in Ansible converts raw byte values into formats that humans can actually understand at a glance. It is essential for generating readable reports, alerts, and configuration summaries.

## Basic Usage

The filter converts a number (assumed to be in bytes) into a human-friendly string:

```yaml
# Convert byte values to human-readable format
- name: Show disk space in readable format
  ansible.builtin.debug:
    msg: "{{ 107374182400 | human_readable }}"
```

Output: `100.0 GB`

By default, it uses binary units (powers of 1024), which is what most system tools report.

## Using with Ansible Facts

The most common use case is formatting values from gathered facts:

```yaml
# Display system memory and disk info in a readable format
- name: Show system resources
  ansible.builtin.debug:
    msg: |
      Host: {{ inventory_hostname }}
      Total RAM: {{ ansible_memtotal_mb * 1024 * 1024 | human_readable }}
      Free RAM: {{ ansible_memfree_mb * 1024 * 1024 | human_readable }}
      Swap Total: {{ ansible_swaptotal_mb * 1024 * 1024 | human_readable }}

- name: Show disk info
  ansible.builtin.debug:
    msg: >
      {{ item.mount }}: {{ item.size_available | human_readable }} free
      of {{ item.size_total | human_readable }}
  loop: "{{ ansible_mounts }}"
  loop_control:
    label: "{{ item.mount }}"
  when: item.size_total > 0
```

## Specifying the Unit

You can tell the filter what unit the input is already in, and what unit you want the output in:

```yaml
# Convert from megabytes to human readable
- name: Convert from different input units
  ansible.builtin.debug:
    msg: |
      From bytes: {{ 1073741824 | human_readable }}
      From KB: {{ 1048576 | human_readable(unit='K') }}
      From MB: {{ 1024 | human_readable(unit='M') }}
      From GB: {{ 1 | human_readable(unit='G') }}
```

All four examples above output approximately `1.0 GB` since they all represent the same amount of data.

Wait, let me clarify the parameter usage. The `unit` parameter specifies the unit of the input value, not the output:

```yaml
# The unit parameter says what the INPUT is measured in
- name: Input is in megabytes
  ansible.builtin.debug:
    msg: "{{ ansible_memtotal_mb | human_readable(unit='M') }}"
```

If your host has 16384 MB of RAM, this outputs `16.0 GB`.

## Binary vs Decimal Units

The filter supports both binary (isbits=false, default) and decimal (isbits=true) modes:

```yaml
# Compare binary (1024-based) vs decimal display
- name: Binary vs decimal
  ansible.builtin.debug:
    msg: |
      Binary (default): {{ 1000000000 | human_readable }}
      With isbits: {{ 1000000000 | human_readable(isbits=true) }}
```

The `isbits=true` parameter treats the input as bits instead of bytes, which is useful for network bandwidth values.

## Practical Example: System Health Report

Generate a readable system health report:

```yaml
# Generate a comprehensive health report with human-readable values
- name: Gather system facts
  ansible.builtin.setup:
    gather_subset:
      - hardware
      - mounts

- name: Generate health report
  ansible.builtin.template:
    src: templates/health_report.j2
    dest: "/tmp/health_report_{{ inventory_hostname }}.txt"
```

The template:

```jinja2
{# templates/health_report.j2 - System health report with human-readable values #}
System Health Report
====================
Host: {{ inventory_hostname }}
Date: {{ ansible_date_time.iso8601 }}

Memory
------
Total:     {{ (ansible_memtotal_mb * 1048576) | human_readable }}
Free:      {{ (ansible_memfree_mb * 1048576) | human_readable }}
Used:      {{ ((ansible_memtotal_mb - ansible_memfree_mb) * 1048576) | human_readable }}
Usage:     {{ ((ansible_memtotal_mb - ansible_memfree_mb) / ansible_memtotal_mb * 100) | round(1) }}%

Swap
----
Total:     {{ (ansible_swaptotal_mb * 1048576) | human_readable }}
Free:      {{ (ansible_swapfree_mb * 1048576) | human_readable }}

Disk Partitions
---------------
{% for mount in ansible_mounts | sort(attribute='mount') %}
{% if mount.size_total > 0 %}
{{ mount.mount }}:
  Filesystem: {{ mount.fstype }}
  Total:      {{ mount.size_total | human_readable }}
  Available:  {{ mount.size_available | human_readable }}
  Used:       {{ (mount.size_total - mount.size_available) | human_readable }}
  Usage:      {{ ((mount.size_total - mount.size_available) / mount.size_total * 100) | round(1) }}%
{% endif %}
{% endfor %}
```

## Disk Space Alerts

Use human_readable in alert messages:

```yaml
# Alert on low disk space with readable messages
- name: Check disk space
  ansible.builtin.set_fact:
    low_disk_mounts: >-
      {{ ansible_mounts
         | selectattr('size_total', 'gt', 0)
         | list
         | json_query('[?to_number(size_available) / to_number(size_total) < `0.1`]') }}

- name: Alert on low disk space
  ansible.builtin.debug:
    msg: >
      WARNING: {{ item.mount }} on {{ inventory_hostname }} has only
      {{ item.size_available | human_readable }} free
      out of {{ item.size_total | human_readable }}
      ({{ (item.size_available / item.size_total * 100) | round(1) }}% free)
  loop: "{{ low_disk_mounts }}"
  loop_control:
    label: "{{ item.mount }}"
  when: low_disk_mounts | length > 0
```

## Container Resource Reports

When working with container platforms:

```yaml
# Report container resource usage in readable format
- name: Get Docker container stats
  ansible.builtin.shell: docker stats --no-stream --format '{{ '{{' }}.Name{{ '}}' }},{{ '{{' }}.MemUsage{{ '}}' }}'
  register: docker_stats
  changed_when: false

- name: Report memory limits
  ansible.builtin.debug:
    msg: |
      Container resource allocation:
      {% for container in containers %}
      {{ container.name }}: Memory limit {{ container.memory_limit | human_readable }}
      {% endfor %}
  vars:
    containers:
      - name: web
        memory_limit: 536870912
      - name: api
        memory_limit: 1073741824
      - name: worker
        memory_limit: 2147483648
```

## Using in Conditional Logic

While you typically use human_readable for display purposes, you can also use it in messages within conditional tasks:

```yaml
# Fail with a helpful message if insufficient resources
- name: Check minimum memory requirement
  ansible.builtin.fail:
    msg: >
      Insufficient memory on {{ inventory_hostname }}.
      Required: {{ min_memory_bytes | human_readable }}.
      Available: {{ (ansible_memtotal_mb * 1048576) | human_readable }}.
  when: (ansible_memtotal_mb * 1048576) < min_memory_bytes
  vars:
    min_memory_bytes: 8589934592  # 8 GB

- name: Check minimum disk space
  ansible.builtin.fail:
    msg: >
      Insufficient disk space on {{ item.mount }}.
      Required: {{ min_disk_bytes | human_readable }}.
      Available: {{ item.size_available | human_readable }}.
  loop: "{{ ansible_mounts }}"
  loop_control:
    label: "{{ item.mount }}"
  when:
    - item.mount == '/var'
    - item.size_available < min_disk_bytes
  vars:
    min_disk_bytes: 53687091200  # 50 GB
```

## Network Bandwidth

For network-related values measured in bits:

```yaml
# Display network interface speeds in human-readable format
- name: Show network interface info
  ansible.builtin.debug:
    msg: >
      {{ item.key }}: Speed {{ (item.value.speed | default(0) * 1000000) | human_readable(isbits=true) }}ps
  loop: "{{ ansible_interfaces_dict | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  when: item.value.speed is defined and item.value.speed > 0
  vars:
    ansible_interfaces_dict:
      eth0:
        speed: 10000
      eth1:
        speed: 1000
```

## Combining with Other Filters

```yaml
# Generate a sorted summary of disk usage
- name: Disk usage summary
  ansible.builtin.debug:
    msg: |
      {% for mount in ansible_mounts | sort(attribute='size_available') %}
      {% if mount.size_total > 0 %}
      {{ "%-20s" | format(mount.mount) }} {{ mount.size_available | human_readable }} free / {{ mount.size_total | human_readable }} total
      {% endif %}
      {% endfor %}
```

## Summary

The `human_readable` filter is a simple but essential tool for making byte values comprehensible. Use it in health reports, alert messages, resource checks, and anywhere else you display storage or memory values to humans. Remember that the `unit` parameter specifies the input unit (not the output), and use `isbits=true` for network bandwidth values. Pair it with `human_to_bytes` (the inverse filter) for round-trip conversions between human-readable strings and raw byte values.
