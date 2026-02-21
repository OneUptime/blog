# How to Use Ansible loop with unique Filter for Deduplication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, Data Processing, Automation

Description: Learn how to use the Ansible unique filter to remove duplicate items from lists before looping, preventing redundant task execution.

---

When you merge data from multiple sources in Ansible, you often end up with duplicates. Maybe two group_vars files both specify the same package, or combining firewall rules from different roles produces repeated entries. Running a loop with duplicates means executing the same task multiple times for no reason. The `unique` filter strips duplicates from a list before the loop processes it.

This post covers how to use `unique` with loops, including simple lists, lists of dictionaries, and more advanced deduplication scenarios.

## Basic Deduplication

The simplest use of `unique` is removing duplicate strings from a flat list.

```yaml
# basic-unique.yml
# Removes duplicate package names before installation
- name: Install packages without duplicates
  hosts: all
  become: true
  vars:
    web_packages:
      - nginx
      - curl
      - git
    monitoring_packages:
      - curl
      - htop
      - git
    security_packages:
      - fail2ban
      - curl
      - ufw
  tasks:
    - name: Combine all package lists
      ansible.builtin.set_fact:
        all_packages: "{{ web_packages + monitoring_packages + security_packages }}"

    - name: Show all packages (with duplicates)
      ansible.builtin.debug:
        msg: "Before dedup: {{ all_packages }}"
      # ["nginx", "curl", "git", "curl", "htop", "git", "fail2ban", "curl", "ufw"]

    - name: Install unique packages only
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop: "{{ all_packages | unique | list }}"
      # Installs: nginx, curl, git, htop, fail2ban, ufw (no duplicates)
```

Without `unique`, the loop would attempt to install `curl` three times and `git` twice. Those extra iterations would return "ok" (no change), but they still cost time due to the module invocation overhead.

## Deduplicating Merged Variable Lists

In a real Ansible project, you often combine lists from different variable sources.

```yaml
# merge-and-dedup.yml
# Merges firewall rules from multiple sources and removes duplicates
- name: Apply deduplicated firewall rules
  hosts: all
  become: true
  vars:
    global_ports:
      - 22
      - 9100
    group_ports:
      - 80
      - 443
      - 22
    host_ports:
      - 8080
      - 80
  tasks:
    - name: Apply unique firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item | string }}"
        proto: tcp
      loop: "{{ (global_ports + group_ports + host_ports) | unique | list }}"
```

The combined list `[22, 9100, 80, 443, 22, 8080, 80]` becomes `[22, 9100, 80, 443, 8080]` after `unique`.

## Deduplicating Lists of Dictionaries

For lists of dictionaries, `unique` compares the entire dictionary. Two dictionaries must be identical for one to be removed.

```yaml
# unique-dicts.yml
# Removes duplicate user entries from merged lists
- name: Create users without duplicates
  hosts: all
  become: true
  vars:
    team_a_users:
      - { name: "alice", uid: 1001, shell: "/bin/bash" }
      - { name: "bob", uid: 1002, shell: "/bin/bash" }
    team_b_users:
      - { name: "bob", uid: 1002, shell: "/bin/bash" }
      - { name: "charlie", uid: 1003, shell: "/bin/zsh" }
  tasks:
    - name: Create unique users
      ansible.builtin.user:
        name: "{{ item.name }}"
        uid: "{{ item.uid }}"
        shell: "{{ item.shell }}"
      loop: "{{ (team_a_users + team_b_users) | unique | list }}"
```

Important caveat: if the bob entry in team_b_users had a slightly different value (say, a different shell), `unique` would NOT remove it because the dictionaries are not identical. For attribute-based deduplication, you need a different approach.

## Attribute-Based Deduplication

When you want to deduplicate based on a specific attribute rather than the whole dictionary, combine `map`, `unique`, and a lookup.

```yaml
# attribute-dedup.yml
# Deduplicates based on a single attribute (name), keeping first occurrence
- name: Deduplicate by name attribute
  hosts: localhost
  gather_facts: false
  vars:
    servers:
      - { name: "web-01", ip: "10.0.1.10", source: "inventory" }
      - { name: "web-01", ip: "10.0.1.10", source: "discovery" }
      - { name: "db-01", ip: "10.0.2.10", source: "inventory" }
      - { name: "web-02", ip: "10.0.1.11", source: "discovery" }
      - { name: "db-01", ip: "10.0.2.10", source: "inventory" }
  tasks:
    - name: Get unique server names
      ansible.builtin.set_fact:
        unique_names: "{{ servers | map(attribute='name') | unique | list }}"

    - name: Build deduplicated list (keep first occurrence)
      ansible.builtin.set_fact:
        unique_servers: "{{ unique_servers | default([]) + [servers | selectattr('name', 'equalto', name) | first] }}"
      loop: "{{ unique_names }}"
      loop_control:
        loop_var: name

    - name: Show deduplicated servers
      ansible.builtin.debug:
        msg: "{{ item.name }}: {{ item.ip }} (from {{ item.source }})"
      loop: "{{ unique_servers }}"
```

This approach first extracts unique names, then picks the first matching entry for each name.

## Deduplicating with sort

You can combine `sort` with `unique` to get a predictable, duplicate-free list.

```yaml
# sort-and-unique.yml
# Sorts and deduplicates a combined port list
- name: Apply sorted unique firewall rules
  hosts: all
  become: true
  vars:
    all_ports:
      - 443
      - 80
      - 22
      - 8080
      - 80
      - 22
      - 443
      - 9100
  tasks:
    - name: Apply firewall rules in sorted order
      ansible.builtin.debug:
        msg: "Allow port {{ item }}"
      loop: "{{ all_ports | unique | sort | list }}"
      # Processes: 22, 80, 443, 8080, 9100
```

## Deduplication in Multi-Role Playbooks

When multiple roles contribute to the same list, duplicates are almost guaranteed. Here is a pattern that handles it cleanly.

```yaml
# roles/base/defaults/main.yml
base_packages:
  - curl
  - wget
  - vim
  - git

# roles/web/defaults/main.yml
web_packages:
  - nginx
  - curl
  - certbot

# roles/monitoring/defaults/main.yml
monitoring_packages:
  - prometheus-node-exporter
  - curl
  - htop
```

```yaml
# site.yml
# Combines packages from all roles and installs unique set
- name: Set up servers
  hosts: webservers
  become: true
  tasks:
    - name: Combine package lists from all roles
      ansible.builtin.set_fact:
        combined_packages: >-
          {{
            (base_packages | default([]))
            + (web_packages | default([]))
            + (monitoring_packages | default([]))
          }}

    - name: Install all unique packages
      ansible.builtin.apt:
        name: "{{ combined_packages | unique | list }}"
        state: present
        update_cache: true
```

## Counting Duplicates Before Removal

Sometimes it is useful to know how many duplicates existed before you removed them.

```yaml
# count-dupes.yml
# Reports duplicate counts before deduplication
- name: Report and remove duplicates
  hosts: localhost
  gather_facts: false
  vars:
    raw_list:
      - nginx
      - curl
      - git
      - curl
      - nginx
      - curl
      - htop
  tasks:
    - name: Report duplicate statistics
      ansible.builtin.debug:
        msg: >
          Total items: {{ raw_list | length }},
          Unique items: {{ raw_list | unique | list | length }},
          Duplicates removed: {{ raw_list | length - (raw_list | unique | list | length) }}

    - name: Process unique items
      ansible.builtin.debug:
        msg: "Processing: {{ item }}"
      loop: "{{ raw_list | unique | list }}"
```

## Deduplication with Case Insensitivity

The `unique` filter is case-sensitive by default. If you need case-insensitive deduplication, normalize the case first.

```yaml
# case-insensitive.yml
# Deduplicates strings regardless of case
- name: Case-insensitive deduplication
  hosts: localhost
  gather_facts: false
  vars:
    tags:
      - Production
      - production
      - PRODUCTION
      - staging
      - Staging
      - development
  tasks:
    - name: Show unique tags (case-insensitive)
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ tags | map('lower') | unique | list }}"
      # Output: production, staging, development
```

## Real-World Example: DNS Record Management

Here is a practical example where deduplication matters: managing DNS records from multiple sources.

```yaml
# dns-records.yml
# Consolidates DNS records from multiple sources and removes duplicates
- name: Manage DNS records
  hosts: localhost
  gather_facts: false
  vars:
    primary_records:
      - { name: "api.example.com", type: "A", value: "10.0.1.10" }
      - { name: "app.example.com", type: "A", value: "10.0.1.11" }
      - { name: "db.example.com", type: "A", value: "10.0.2.10" }
    secondary_records:
      - { name: "api.example.com", type: "A", value: "10.0.1.10" }
      - { name: "cache.example.com", type: "A", value: "10.0.3.10" }
  tasks:
    - name: Get unique DNS record names
      ansible.builtin.set_fact:
        all_records: "{{ (primary_records + secondary_records) | unique | list }}"

    - name: Apply DNS records
      ansible.builtin.debug:
        msg: "{{ item.name }} {{ item.type }} {{ item.value }}"
      loop: "{{ all_records }}"
```

## Performance Consideration

Deduplication runs on the control node before tasks are sent to managed hosts. For very large lists (thousands of items), the `unique` filter is efficient since it uses hash-based comparison. There is no significant performance penalty for running `unique` on lists with hundreds or even thousands of items.

```yaml
# Large list deduplication is fast
- name: Handle large lists
  ansible.builtin.set_fact:
    unique_items: "{{ large_combined_list | unique | list }}"
  # This runs locally and is fast even for 10,000+ items
```

## Summary

The `unique` filter is a simple but essential tool for preventing duplicate task execution in Ansible loops. Apply it after merging lists from multiple sources (group_vars, role defaults, host_vars) to avoid redundant operations. For flat lists of strings or numbers, `unique` works directly. For lists of dictionaries, it compares the entire dictionary, so you need attribute-based deduplication if items differ in non-key fields. Always append `| list` after `unique` since Ansible's `loop` requires a list, not a generator. Combine it with `sort` for predictable ordering and with `map('lower')` for case-insensitive deduplication.
