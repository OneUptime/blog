# How to Use Ansible Facts to Get Memory Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Memory, Facts, Performance Tuning

Description: How to use Ansible facts to gather RAM and swap information on managed hosts for capacity planning, monitoring, and application tuning.

---

Memory is one of the most critical resources on any server. Too little RAM and your applications start swapping, performance tanks, and processes get killed by the OOM killer. Ansible collects detailed memory statistics during fact gathering, giving you the data you need to size applications correctly, set up monitoring alerts, and make deployment decisions based on available resources.

## Memory Facts Overview

Ansible provides memory information through these fact keys:

- `ansible_facts['memtotal_mb']` - total physical RAM in megabytes
- `ansible_facts['memfree_mb']` - free physical RAM in megabytes
- `ansible_facts['swaptotal_mb']` - total swap space in megabytes
- `ansible_facts['swapfree_mb']` - free swap space in megabytes
- `ansible_facts['memory_mb']` - a dictionary with real, nocache, and swap sub-dictionaries

Let us explore each of these.

```yaml
# memory-facts-overview.yml
# Displays all memory-related facts
---
- name: Show memory facts
  hosts: all
  gather_facts: yes
  tasks:
    - name: Display memory overview
      ansible.builtin.debug:
        msg:
          - "Total RAM: {{ ansible_facts['memtotal_mb'] }} MB"
          - "Free RAM: {{ ansible_facts['memfree_mb'] }} MB"
          - "Total Swap: {{ ansible_facts['swaptotal_mb'] }} MB"
          - "Free Swap: {{ ansible_facts['swapfree_mb'] }} MB"

    - name: Display detailed memory breakdown
      ansible.builtin.debug:
        msg:
          - "Real total: {{ ansible_facts['memory_mb']['real']['total'] }} MB"
          - "Real used: {{ ansible_facts['memory_mb']['real']['used'] }} MB"
          - "Real free: {{ ansible_facts['memory_mb']['real']['free'] }} MB"
          - "Nocache free: {{ ansible_facts['memory_mb']['nocache']['free'] }} MB"
          - "Nocache used: {{ ansible_facts['memory_mb']['nocache']['used'] }} MB"
          - "Swap total: {{ ansible_facts['memory_mb']['swap']['total'] }} MB"
          - "Swap used: {{ ansible_facts['memory_mb']['swap']['used'] }} MB"
          - "Swap free: {{ ansible_facts['memory_mb']['swap']['free'] }} MB"
```

The difference between `real` and `nocache` is important. Linux uses free memory for disk caching, so `real.free` might look low even when plenty of memory is actually available. The `nocache.free` value accounts for memory that can be reclaimed from caches, giving a more accurate picture of available memory.

## Converting Memory to Different Units

Memory facts are in megabytes. Here is how to convert them for different use cases.

```yaml
# memory-conversions.yml
# Shows memory in different units
---
- name: Display memory in various units
  hosts: all
  gather_facts: yes
  tasks:
    - name: Memory in different units
      ansible.builtin.debug:
        msg:
          - "RAM in MB: {{ ansible_facts['memtotal_mb'] }}"
          - "RAM in GB: {{ (ansible_facts['memtotal_mb'] / 1024) | round(2) }}"
          - "RAM in bytes: {{ ansible_facts['memtotal_mb'] * 1048576 }}"
          - "RAM in KB: {{ ansible_facts['memtotal_mb'] * 1024 }}"

    - name: Set memory variables for templates
      ansible.builtin.set_fact:
        total_ram_mb: "{{ ansible_facts['memtotal_mb'] }}"
        total_ram_gb: "{{ (ansible_facts['memtotal_mb'] / 1024) | round(1) }}"
        available_ram_mb: "{{ ansible_facts['memory_mb']['nocache']['free'] }}"
        swap_total_mb: "{{ ansible_facts['swaptotal_mb'] }}"
```

## Sizing Application Memory Based on Facts

This is where memory facts become really useful. You can tune application settings based on the actual RAM available on each host.

```yaml
# tune-jvm.yml
# Configures JVM heap size based on available RAM
---
- name: Configure JVM based on available memory
  hosts: appservers
  gather_facts: yes
  become: yes
  tasks:
    - name: Calculate JVM heap size (50% of total RAM)
      ansible.builtin.set_fact:
        jvm_heap_mb: "{{ (ansible_facts['memtotal_mb'] * 0.5) | int }}"
        jvm_metaspace_mb: "{{ [256, (ansible_facts['memtotal_mb'] * 0.05) | int] | max }}"

    - name: Deploy JVM options file
      ansible.builtin.template:
        src: jvm.options.j2
        dest: /opt/myapp/config/jvm.options
        mode: '0644'
      notify: restart app

  handlers:
    - name: restart app
      ansible.builtin.service:
        name: myapp
        state: restarted
```

```jinja2
{# templates/jvm.options.j2 #}
{# JVM options auto-tuned by Ansible based on host memory #}
# Total system RAM: {{ ansible_facts['memtotal_mb'] }} MB
# Heap allocated: {{ jvm_heap_mb }} MB (50% of system RAM)

-Xms{{ jvm_heap_mb }}m
-Xmx{{ jvm_heap_mb }}m
-XX:MaxMetaspaceSize={{ jvm_metaspace_mb }}m
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
```

## Configuring Database Buffers

PostgreSQL and MySQL performance depends heavily on memory allocation. Let facts drive the configuration.

```yaml
# tune-postgresql.yml
# Tunes PostgreSQL memory settings based on system RAM
---
- name: Tune PostgreSQL based on available RAM
  hosts: dbservers
  gather_facts: yes
  become: yes
  vars:
    # PostgreSQL memory tuning ratios
    shared_buffers_ratio: 0.25
    effective_cache_size_ratio: 0.75
    work_mem_base_mb: 4
    maintenance_work_mem_ratio: 0.05
  tasks:
    - name: Calculate PostgreSQL memory settings
      ansible.builtin.set_fact:
        pg_shared_buffers_mb: "{{ (ansible_facts['memtotal_mb'] * shared_buffers_ratio) | int }}"
        pg_effective_cache_size_mb: "{{ (ansible_facts['memtotal_mb'] * effective_cache_size_ratio) | int }}"
        pg_work_mem_mb: "{{ [work_mem_base_mb, (ansible_facts['memtotal_mb'] / 200) | int] | max }}"
        pg_maintenance_work_mem_mb: "{{ (ansible_facts['memtotal_mb'] * maintenance_work_mem_ratio) | int }}"

    - name: Display calculated settings
      ansible.builtin.debug:
        msg:
          - "System RAM: {{ ansible_facts['memtotal_mb'] }} MB"
          - "shared_buffers: {{ pg_shared_buffers_mb }} MB"
          - "effective_cache_size: {{ pg_effective_cache_size_mb }} MB"
          - "work_mem: {{ pg_work_mem_mb }} MB"
          - "maintenance_work_mem: {{ pg_maintenance_work_mem_mb }} MB"

    - name: Deploy PostgreSQL memory config
      ansible.builtin.template:
        src: postgresql-memory.conf.j2
        dest: /etc/postgresql/15/main/conf.d/memory.conf
        mode: '0644'
      notify: reload postgresql

  handlers:
    - name: reload postgresql
      ansible.builtin.service:
        name: postgresql
        state: reloaded
```

```jinja2
{# templates/postgresql-memory.conf.j2 #}
{# PostgreSQL memory settings - auto-tuned by Ansible #}
# System RAM: {{ ansible_facts['memtotal_mb'] }} MB

shared_buffers = {{ pg_shared_buffers_mb }}MB
effective_cache_size = {{ pg_effective_cache_size_mb }}MB
work_mem = {{ pg_work_mem_mb }}MB
maintenance_work_mem = {{ pg_maintenance_work_mem_mb }}MB
```

## Pre-Deployment Memory Checks

Before deploying a resource-hungry application, verify that the host has enough RAM.

```yaml
# check-memory.yml
# Validates memory requirements before deployment
---
- name: Validate memory requirements
  hosts: appservers
  gather_facts: yes
  vars:
    min_ram_mb: 4096
    min_available_mb: 2048
  tasks:
    - name: Check total RAM
      ansible.builtin.assert:
        that:
          - ansible_facts['memtotal_mb'] >= min_ram_mb
        fail_msg: >
          Host {{ inventory_hostname }} has only {{ ansible_facts['memtotal_mb'] }} MB RAM.
          Minimum required: {{ min_ram_mb }} MB.
        success_msg: "RAM check passed: {{ ansible_facts['memtotal_mb'] }} MB total"

    - name: Check available RAM
      ansible.builtin.assert:
        that:
          - ansible_facts['memory_mb']['nocache']['free'] >= min_available_mb
        fail_msg: >
          Host {{ inventory_hostname }} has only {{ ansible_facts['memory_mb']['nocache']['free'] }} MB available.
          Minimum required: {{ min_available_mb }} MB.
        success_msg: "Available RAM check passed: {{ ansible_facts['memory_mb']['nocache']['free'] }} MB free"
```

## Monitoring Swap Usage

Swap usage is a strong indicator of memory pressure. Here is how to check it.

```yaml
# check-swap.yml
# Monitors swap usage and alerts on excessive swapping
---
- name: Check swap usage
  hosts: all
  gather_facts: yes
  tasks:
    - name: Calculate swap usage percentage
      ansible.builtin.set_fact:
        swap_used_pct: >-
          {{
            ((ansible_facts['swaptotal_mb'] - ansible_facts['swapfree_mb']) / ansible_facts['swaptotal_mb'] * 100) | round(1)
            if ansible_facts['swaptotal_mb'] > 0
            else 0
          }}

    - name: Report swap status
      ansible.builtin.debug:
        msg:
          - "Swap total: {{ ansible_facts['swaptotal_mb'] }} MB"
          - "Swap used: {{ ansible_facts['swaptotal_mb'] - ansible_facts['swapfree_mb'] }} MB"
          - "Swap usage: {{ swap_used_pct }}%"

    - name: Warn on high swap usage
      ansible.builtin.debug:
        msg: "WARNING: {{ inventory_hostname }} is using {{ swap_used_pct }}% of swap!"
      when: swap_used_pct | float > 50

    - name: Flag hosts with no swap configured
      ansible.builtin.debug:
        msg: "NOTE: {{ inventory_hostname }} has no swap configured"
      when: ansible_facts['swaptotal_mb'] == 0
```

## Memory-Based Host Grouping

Use the `group_by` module to dynamically categorize hosts by their memory tier.

```yaml
# group-by-memory.yml
# Groups hosts by memory size for tiered configuration
---
- name: Group hosts by memory tier
  hosts: all
  gather_facts: yes
  tasks:
    - name: Categorize by memory tier
      ansible.builtin.group_by:
        key: "memory_{{ 'small' if ansible_facts['memtotal_mb'] < 4096 else 'medium' if ansible_facts['memtotal_mb'] < 16384 else 'large' }}"

- name: Configure small memory hosts
  hosts: memory_small
  tasks:
    - name: Apply lightweight configuration
      ansible.builtin.debug:
        msg: "Small host {{ inventory_hostname }}: {{ ansible_facts['memtotal_mb'] }} MB - using lightweight config"

- name: Configure large memory hosts
  hosts: memory_large
  tasks:
    - name: Apply high-performance configuration
      ansible.builtin.debug:
        msg: "Large host {{ inventory_hostname }}: {{ ansible_facts['memtotal_mb'] }} MB - using high-performance config"
```

## Generating Memory Reports

```yaml
# memory-report.yml
# Generates a memory usage report across all hosts
---
- name: Generate memory report
  hosts: all
  gather_facts: yes
  tasks:
    - name: Create memory summary
      ansible.builtin.set_fact:
        memory_summary:
          hostname: "{{ inventory_hostname }}"
          total_mb: "{{ ansible_facts['memtotal_mb'] }}"
          used_mb: "{{ ansible_facts['memory_mb']['real']['used'] }}"
          available_mb: "{{ ansible_facts['memory_mb']['nocache']['free'] }}"
          usage_pct: "{{ ((ansible_facts['memory_mb']['real']['used'] / ansible_facts['memtotal_mb']) * 100) | round(1) }}"
          swap_total_mb: "{{ ansible_facts['swaptotal_mb'] }}"
          swap_used_mb: "{{ ansible_facts['swaptotal_mb'] - ansible_facts['swapfree_mb'] }}"

    - name: Display memory summary
      ansible.builtin.debug:
        msg: >
          {{ memory_summary.hostname }}:
          {{ memory_summary.total_mb }}MB total,
          {{ memory_summary.available_mb }}MB available,
          {{ memory_summary.usage_pct }}% used,
          swap {{ memory_summary.swap_used_mb }}/{{ memory_summary.swap_total_mb }}MB
```

## Summary

Ansible memory facts provide the data you need to make informed decisions about application tuning, capacity planning, and resource monitoring. Use `memtotal_mb` for total RAM, `memory_mb.nocache.free` for actual available memory, and `swaptotal_mb/swapfree_mb` for swap monitoring. By basing your application configuration on the actual memory available on each host, you get optimal performance without manual tuning, and your playbooks automatically adapt when hosts are upgraded or migrated to different hardware.
