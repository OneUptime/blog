# How to Use the Ansible hostname Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, hostname, Linux, System Configuration

Description: Learn how to set and manage Linux hostnames with the Ansible hostname module across different distributions and init systems.

---

Setting the hostname is one of the first things you do when provisioning a server. It affects logging, monitoring, SSH prompts, and service discovery. Getting it right matters because a wrong hostname can cause confusion in logs, break certificate validation, and create issues with tools that depend on hostname resolution.

The Ansible `hostname` module handles hostname configuration across different Linux distributions, dealing with the differences between systemd-based systems, older SysV init systems, and cloud environments. This post covers how to use it effectively.

## Basic Hostname Configuration

Setting a hostname is a one-liner with the `hostname` module:

```yaml
# set the hostname on a server
---
- name: Set server hostname
  hosts: all
  become: true
  tasks:
    - name: Set hostname
      ansible.builtin.hostname:
        name: web-prod-01
```

This sets both the transient hostname (what `hostname` returns) and the static hostname (what persists across reboots on systemd systems).

## Using Inventory Hostname

The most common pattern is setting the hostname to match the inventory name:

```yaml
# set hostname from inventory
---
- name: Configure hostnames from inventory
  hosts: all
  become: true
  tasks:
    - name: Set hostname to match inventory
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"
```

If your inventory looks like this:

```ini
# inventory file with descriptive hostnames
[webservers]
web-prod-01 ansible_host=10.0.1.10
web-prod-02 ansible_host=10.0.1.11

[dbservers]
db-prod-01 ansible_host=10.0.2.10
db-prod-02 ansible_host=10.0.2.11
```

Each server gets its inventory name as the hostname. Using `inventory_hostname_short` gives you just the short name (before any dots):

```yaml
# set short hostname for FQDN inventory entries
- name: Set short hostname
  ansible.builtin.hostname:
    name: "{{ inventory_hostname_short }}"
```

## Setting FQDN with /etc/hosts

The `hostname` module sets the hostname, but you also need to configure `/etc/hosts` for FQDN resolution. This is a two-step process:

```yaml
# configure hostname and /etc/hosts together
---
- name: Full hostname configuration
  hosts: all
  become: true
  vars:
    domain: example.com
  tasks:
    - name: Set hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Configure /etc/hosts with FQDN
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}.{{ domain }} {{ inventory_hostname }}"
        state: present

    - name: Ensure localhost entry exists
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.0\.1'
        line: "127.0.0.1 localhost"
        state: present

    - name: Verify hostname resolution
      ansible.builtin.command:
        cmd: hostname -f
      register: fqdn_check
      changed_when: false

    - name: Show configured FQDN
      ansible.builtin.debug:
        msg: "FQDN is now: {{ fqdn_check.stdout }}"
```

## The use Parameter for Different Strategies

The `hostname` module supports different backend strategies via the `use` parameter:

```yaml
# specify the hostname strategy explicitly
---
- name: Hostname strategy examples
  hosts: all
  become: true
  tasks:
    # Auto-detect strategy (default)
    - name: Set hostname with auto-detection
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"
        use: systemd
```

Available strategies include:

- `systemd` - Uses `hostnamectl` (most modern Linux systems)
- `debian` - For older Debian systems without systemd
- `redhat` - For older RHEL/CentOS without systemd
- `alpine` - For Alpine Linux
- `freebsd` - For FreeBSD
- `generic` - Falls back to basic `hostname` command

Most of the time, the auto-detection works fine and you do not need to specify `use`.

## Dynamic Hostname Generation

Generate hostnames based on server characteristics:

```yaml
# generate hostnames dynamically based on role and index
---
- name: Dynamic hostname assignment
  hosts: all
  become: true
  vars:
    environment_prefix: prod
    region: use1
  tasks:
    - name: Build hostname from role and index
      ansible.builtin.set_fact:
        computed_hostname: "{{ group_names | first }}-{{ environment_prefix }}-{{ region }}-{{ play_hosts.index(inventory_hostname) + 1 | string | zfill(2) }}"

    - name: Set computed hostname
      ansible.builtin.hostname:
        name: "{{ computed_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^{{ ansible_default_ipv4.address }}'
        line: "{{ ansible_default_ipv4.address }} {{ computed_hostname }}.example.com {{ computed_hostname }}"
        state: present

    - name: Show hostname
      ansible.builtin.debug:
        msg: "Hostname set to: {{ computed_hostname }}"
```

## Cloud-Specific Hostname Handling

Cloud instances often have auto-assigned hostnames that change on reboot. Here is how to handle that:

```yaml
# handle hostname in cloud environments
---
- name: Cloud hostname configuration
  hosts: all
  become: true
  vars:
    server_hostname: "{{ inventory_hostname }}"
    domain: internal.example.com
  tasks:
    - name: Set hostname
      ansible.builtin.hostname:
        name: "{{ server_hostname }}"

    - name: Prevent cloud-init from resetting hostname (Ubuntu/AWS)
      ansible.builtin.copy:
        content: |
          # Prevent cloud-init from overwriting our hostname
          preserve_hostname: true
        dest: /etc/cloud/cloud.cfg.d/99_hostname.cfg
        mode: '0644'
      when: ansible_virtualization_type in ['xen', 'kvm', 'amazon']

    - name: Update /etc/hosts for cloud instance
      ansible.builtin.template:
        src: templates/hosts.j2
        dest: /etc/hosts
        owner: root
        group: root
        mode: '0644'
```

The hosts template:

```jinja2
# templates/hosts.j2 - managed by Ansible
127.0.0.1 localhost
127.0.1.1 {{ server_hostname }}.{{ domain }} {{ server_hostname }}

# Cloud metadata
169.254.169.254 metadata.internal

# Internal service discovery
{% for host in groups['all'] %}
{{ hostvars[host].ansible_default_ipv4.address }} {{ host }}.{{ domain }} {{ host }}
{% endfor %}
```

## Hostname Validation

Before setting a hostname, validate it:

```yaml
# validate hostname before setting it
---
- name: Validated hostname configuration
  hosts: all
  become: true
  vars:
    desired_hostname: "{{ inventory_hostname }}"
  tasks:
    - name: Validate hostname format
      ansible.builtin.assert:
        that:
          - desired_hostname | length > 0
          - desired_hostname | length <= 63
          - desired_hostname is match('^[a-z0-9][a-z0-9-]*[a-z0-9]$')
        fail_msg: "Invalid hostname: {{ desired_hostname }}. Must be 1-63 chars, lowercase alphanumeric and hyphens."
        success_msg: "Hostname {{ desired_hostname }} is valid"

    - name: Set validated hostname
      ansible.builtin.hostname:
        name: "{{ desired_hostname }}"
```

## Hostname with Machine ID

On systemd systems, you might also want to set the machine ID for proper journal logging:

```yaml
# configure hostname with machine-id for journal logging
---
- name: Full system identity configuration
  hosts: all
  become: true
  tasks:
    - name: Set hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Set static hostname in hostnamectl
      ansible.builtin.command:
        cmd: "hostnamectl set-hostname {{ inventory_hostname }}"
      changed_when: true

    - name: Set pretty hostname
      ansible.builtin.command:
        cmd: "hostnamectl set-hostname --pretty '{{ inventory_hostname | replace('-', ' ') | title }}'"
      changed_when: true

    - name: Verify hostnamectl output
      ansible.builtin.command:
        cmd: hostnamectl
      register: hostnamectl_output
      changed_when: false

    - name: Show system identity
      ansible.builtin.debug:
        var: hostnamectl_output.stdout_lines
```

## Batch Hostname Configuration

When provisioning many servers at once, a structured approach helps:

```yaml
# batch hostname configuration for multiple server roles
---
- name: Batch hostname setup
  hosts: all
  become: true
  vars:
    hostname_map:
      10.0.1.10: web-prod-01
      10.0.1.11: web-prod-02
      10.0.1.12: web-prod-03
      10.0.2.10: db-prod-01
      10.0.2.11: db-prod-02
      10.0.3.10: monitor-prod-01
  tasks:
    - name: Set hostname from IP mapping
      ansible.builtin.hostname:
        name: "{{ hostname_map[ansible_default_ipv4.address] | default(inventory_hostname) }}"

    - name: Configure /etc/hosts with all hosts
      ansible.builtin.blockinfile:
        path: /etc/hosts
        block: |
          {% for ip, name in hostname_map.items() %}
          {{ ip }} {{ name }}.example.com {{ name }}
          {% endfor %}
        marker: "# {mark} ANSIBLE MANAGED HOST ENTRIES"
```

## Handling Hostname Changes

When changing an existing hostname, some services might need to be notified:

```yaml
# handle hostname change with service notifications
---
- name: Change hostname with service awareness
  hosts: all
  become: true
  tasks:
    - name: Record old hostname
      ansible.builtin.command:
        cmd: hostname
      register: old_hostname
      changed_when: false

    - name: Set new hostname
      ansible.builtin.hostname:
        name: "{{ new_hostname }}"
      register: hostname_change

    - name: Update rsyslog after hostname change
      ansible.builtin.systemd:
        name: rsyslog
        state: restarted
      when: hostname_change.changed

    - name: Update monitoring agent hostname
      ansible.builtin.lineinfile:
        path: /etc/datadog-agent/datadog.yaml
        regexp: '^hostname:'
        line: "hostname: {{ new_hostname }}"
      when: hostname_change.changed
      notify: Restart datadog-agent

    - name: Report change
      ansible.builtin.debug:
        msg: "Hostname changed from {{ old_hostname.stdout }} to {{ new_hostname }}"
      when: hostname_change.changed

  handlers:
    - name: Restart datadog-agent
      ansible.builtin.systemd:
        name: datadog-agent
        state: restarted
```

## Summary

The Ansible `hostname` module handles hostname configuration across Linux distributions, abstracting away the differences between systemd, older init systems, and cloud environments. Always pair it with `/etc/hosts` configuration for proper FQDN resolution. In cloud environments, disable cloud-init hostname management to prevent your settings from being overwritten. Validate hostnames before applying them, and notify dependent services like syslog and monitoring agents when the hostname changes. Use `inventory_hostname` as the hostname source for consistency between your Ansible inventory and the actual server names.
