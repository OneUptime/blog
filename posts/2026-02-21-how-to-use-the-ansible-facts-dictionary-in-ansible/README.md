# How to Use the ansible_facts Dictionary in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Facts, System Administration, Automation

Description: A practical guide to using the ansible_facts dictionary for accessing system information about managed hosts in your playbooks.

---

Every time Ansible connects to a managed host, it runs a setup module that collects a huge amount of system information. This information is stored in a dictionary called `ansible_facts`. Knowing how to navigate and use this dictionary is fundamental to writing playbooks that adapt to different environments.

## How Ansible Collects Facts

When a play starts with `gather_facts: yes` (which is the default), Ansible runs the `ansible.builtin.setup` module on each target host. This module probes the system for hardware details, network configuration, OS information, mounted filesystems, and much more. All of this gets stored in `ansible_facts`.

You can see the full facts dictionary for any host by running a quick ad-hoc command.

```bash
# Dump all facts for a single host in JSON format
ansible web-01 -m setup -i inventory/hosts.ini
```

The output is usually several hundred lines of JSON. It covers everything from the kernel version to the MAC addresses of every network interface.

## Accessing Facts: Two Styles

Ansible supports two ways to access facts. The modern way uses the `ansible_facts` dictionary directly. The legacy way uses top-level variable names with the `ansible_` prefix.

```yaml
# Modern style - preferred in Ansible 2.10+
# Access facts through the ansible_facts dictionary
- name: Show OS family using modern syntax
  ansible.builtin.debug:
    msg: "OS family is {{ ansible_facts['os_family'] }}"

# Legacy style - still works but less explicit
# Facts are injected as top-level variables
- name: Show OS family using legacy syntax
  ansible.builtin.debug:
    msg: "OS family is {{ ansible_os_family }}"
```

Both styles work, but the modern `ansible_facts` dictionary is cleaner because it makes it obvious where the data comes from. When you see `ansible_facts['distribution']`, there is no ambiguity about its source.

## Commonly Used Facts

Here is a playbook that demonstrates some of the most useful facts.

```yaml
# show-common-facts.yml
# Displays the most frequently used system facts
---
- name: Display common system facts
  hosts: all
  gather_facts: yes
  tasks:
    - name: Operating system details
      ansible.builtin.debug:
        msg:
          - "Distribution: {{ ansible_facts['distribution'] }}"
          - "Version: {{ ansible_facts['distribution_version'] }}"
          - "Major version: {{ ansible_facts['distribution_major_version'] }}"
          - "OS family: {{ ansible_facts['os_family'] }}"
          - "Kernel: {{ ansible_facts['kernel'] }}"

    - name: Hardware details
      ansible.builtin.debug:
        msg:
          - "Architecture: {{ ansible_facts['architecture'] }}"
          - "Processor count: {{ ansible_facts['processor_count'] }}"
          - "Total memory MB: {{ ansible_facts['memtotal_mb'] }}"

    - name: Network details
      ansible.builtin.debug:
        msg:
          - "Hostname: {{ ansible_facts['hostname'] }}"
          - "FQDN: {{ ansible_facts['fqdn'] }}"
          - "Default IPv4: {{ ansible_facts['default_ipv4']['address'] }}"
          - "Default interface: {{ ansible_facts['default_ipv4']['interface'] }}"
```

## Using Facts in Conditionals

Facts are most powerful when combined with `when` conditions. This lets you write playbooks that handle multiple OS distributions, hardware configurations, or network layouts.

```yaml
# conditional-facts.yml
# Installs packages differently based on OS facts
---
- name: Install web server based on OS
  hosts: webservers
  become: yes
  gather_facts: yes
  tasks:
    - name: Install nginx on Debian/Ubuntu
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: yes
      when: ansible_facts['os_family'] == "Debian"

    - name: Install nginx on RHEL/CentOS
      ansible.builtin.yum:
        name: nginx
        state: present
      when: ansible_facts['os_family'] == "RedHat"

    - name: Install nginx on Alpine
      community.general.apk:
        name: nginx
        state: present
      when: ansible_facts['os_family'] == "Alpine"
```

You can also combine multiple fact-based conditions.

```yaml
    - name: Apply RHEL 8 specific configuration
      ansible.builtin.template:
        src: rhel8-specific.conf.j2
        dest: /etc/myapp/platform.conf
      when:
        - ansible_facts['os_family'] == "RedHat"
        - ansible_facts['distribution_major_version'] == "8"
```

## Navigating Nested Facts

The facts dictionary has several levels of nesting, especially for network interfaces and disk devices. Here is how to work with those.

```yaml
# nested-facts.yml
# Shows how to navigate deeply nested fact structures
---
- name: Explore nested facts
  hosts: all
  gather_facts: yes
  tasks:
    - name: Show all IPv4 addresses across interfaces
      ansible.builtin.debug:
        msg: "{{ item.key }}: {{ item.value.ipv4.address | default('no ipv4') }}"
      loop: "{{ ansible_facts['interfaces'] | map('regex_replace', '^(.*)$', 'ansible_facts[\"\\1\"]') | list }}"
      when: false  # Placeholder - see better approach below

    # A cleaner approach using the ansible_facts interfaces list
    - name: List all network interfaces
      ansible.builtin.debug:
        msg: "Interface: {{ item }}"
      loop: "{{ ansible_facts['interfaces'] }}"

    - name: Show default gateway
      ansible.builtin.debug:
        msg: "Gateway: {{ ansible_facts['default_ipv4']['gateway'] }}"

    - name: Show all mount points
      ansible.builtin.debug:
        msg: "{{ item.mount }} - {{ item.fstype }} - {{ item.size_total | human_readable }}"
      loop: "{{ ansible_facts['mounts'] }}"
      loop_control:
        label: "{{ item.mount }}"
```

## Filtering Facts with the setup Module

You do not always need every fact. The setup module accepts a `filter` parameter to collect only specific facts, which speeds up execution.

```yaml
# filtered-facts.yml
# Gathers only network-related facts to save time
---
- name: Gather only network facts
  hosts: all
  gather_facts: no
  tasks:
    - name: Collect only network facts
      ansible.builtin.setup:
        filter: "ansible_default_ipv4"

    - name: Use the filtered fact
      ansible.builtin.debug:
        msg: "IP address is {{ ansible_facts['default_ipv4']['address'] }}"
```

You can also use wildcards in the filter.

```yaml
    - name: Gather all memory-related facts
      ansible.builtin.setup:
        filter: "ansible_mem*"
```

## Facts in Templates

Templates are where facts really shine. Here is a template that generates a system information page.

```yaml
# generate-sysinfo.yml
# Creates a system info page using facts
---
- name: Generate system info page
  hosts: all
  gather_facts: yes
  tasks:
    - name: Create system info HTML
      ansible.builtin.template:
        src: sysinfo.html.j2
        dest: /var/www/html/sysinfo.html
        mode: '0644'
```

```jinja2
{# templates/sysinfo.html.j2 #}
{# System info page generated from ansible_facts #}
<html>
<body>
<h1>System Information for {{ ansible_facts['hostname'] }}</h1>
<table>
  <tr><td>OS</td><td>{{ ansible_facts['distribution'] }} {{ ansible_facts['distribution_version'] }}</td></tr>
  <tr><td>Kernel</td><td>{{ ansible_facts['kernel'] }}</td></tr>
  <tr><td>Architecture</td><td>{{ ansible_facts['architecture'] }}</td></tr>
  <tr><td>CPUs</td><td>{{ ansible_facts['processor_vcpus'] }}</td></tr>
  <tr><td>Memory</td><td>{{ ansible_facts['memtotal_mb'] }} MB</td></tr>
  <tr><td>IP Address</td><td>{{ ansible_facts['default_ipv4']['address'] }}</td></tr>
  <tr><td>Python</td><td>{{ ansible_facts['python_version'] }}</td></tr>
</table>

<h2>Disk Usage</h2>
<table>
{% for mount in ansible_facts['mounts'] %}
  <tr>
    <td>{{ mount.mount }}</td>
    <td>{{ mount.device }}</td>
    <td>{{ ((mount.size_total - mount.size_available) / mount.size_total * 100) | round(1) }}% used</td>
  </tr>
{% endfor %}
</table>
</body>
</html>
```

## Storing Facts as Variables with set_fact

You can extract facts into simpler variable names using `set_fact` for readability.

```yaml
# simplify-facts.yml
# Extracts commonly used facts into shorter variable names
---
- name: Simplify fact references
  hosts: all
  gather_facts: yes
  tasks:
    - name: Create simpler variable names
      ansible.builtin.set_fact:
        server_ip: "{{ ansible_facts['default_ipv4']['address'] }}"
        server_os: "{{ ansible_facts['distribution'] }}"
        total_ram_gb: "{{ (ansible_facts['memtotal_mb'] / 1024) | round(1) }}"

    - name: Use simplified variables
      ansible.builtin.debug:
        msg: "Server {{ server_ip }} runs {{ server_os }} with {{ total_ram_gb }}GB RAM"
```

## Summary

The `ansible_facts` dictionary is the backbone of adaptive Ansible playbooks. It provides a consistent interface to query everything from the operating system version to the last digit of a MAC address. Use the modern `ansible_facts['key']` syntax for clarity, apply filters when you only need specific facts, and combine facts with conditionals to write playbooks that work across diverse environments. Once you get comfortable navigating the facts dictionary, you will find yourself writing more flexible and resilient automation code.
