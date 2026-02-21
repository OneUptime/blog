# How to Use Ansible to Manage /etc/resolv.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DNS, resolv.conf, Linux Administration

Description: Learn how to manage /etc/resolv.conf with Ansible including templates, immutable flags, and handling systemd-resolved conflicts.

---

The `/etc/resolv.conf` file is the central DNS configuration for Linux. Every DNS lookup on your system starts by reading this file to find out which nameservers to query, which search domains to append, and what options to use. Managing it with Ansible seems simple, but there is a catch: on modern Linux systems, multiple services compete to control this file. DHCP clients, NetworkManager, and systemd-resolved all want to write to it.

This post covers how to manage `/etc/resolv.conf` effectively with Ansible, including dealing with the various subsystems that try to overwrite your changes.

## The resolv.conf File Format

First, let us look at what a well-configured `/etc/resolv.conf` looks like:

```text
# /etc/resolv.conf - DNS resolver configuration
nameserver 10.0.0.2
nameserver 10.0.0.3
nameserver 8.8.8.8
search example.com internal.example.com
options timeout:2 attempts:3 rotate ndots:2
```

The key directives are:
- `nameserver` - DNS server IP address (up to 3)
- `search` - Domains to append when resolving short hostnames
- `domain` - Single domain (mutually exclusive with search)
- `options` - Various resolver options

## Basic Template Approach

The simplest way to manage `/etc/resolv.conf` with Ansible:

```yaml
# manage resolv.conf with a template
---
- name: Configure resolv.conf
  hosts: all
  become: true
  vars:
    nameservers:
      - 10.0.0.2
      - 10.0.0.3
      - 8.8.8.8
    search_domains:
      - example.com
      - internal.example.com
    resolver_options:
      - "timeout:2"
      - "attempts:3"
      - "rotate"
  tasks:
    - name: Deploy resolv.conf from template
      ansible.builtin.template:
        src: templates/resolv.conf.j2
        dest: /etc/resolv.conf
        owner: root
        group: root
        mode: '0644'
```

The Jinja2 template:

```jinja2
# templates/resolv.conf.j2
# Managed by Ansible - DO NOT EDIT MANUALLY
# Changes will be overwritten on next Ansible run
{% for ns in nameservers %}
nameserver {{ ns }}
{% endfor %}
{% if search_domains | length > 0 %}
search {{ search_domains | join(' ') }}
{% endif %}
{% if resolver_options | length > 0 %}
options {{ resolver_options | join(' ') }}
{% endif %}
```

## Handling systemd-resolved

On Ubuntu 18.04+ and other modern systems, `/etc/resolv.conf` is often a symlink to `/run/systemd/resolve/stub-resolv.conf`. If you overwrite the symlink, systemd-resolved might recreate it.

Here is how to handle this properly:

```yaml
# handle systemd-resolved when managing resolv.conf
---
- name: Manage resolv.conf with systemd-resolved awareness
  hosts: all
  become: true
  vars:
    nameservers:
      - 10.0.0.2
      - 10.0.0.3
    search_domains:
      - example.com
  tasks:
    - name: Check if systemd-resolved is active
      ansible.builtin.command:
        cmd: systemctl is-active systemd-resolved
      register: resolved_status
      failed_when: false
      changed_when: false

    - name: Configure via systemd-resolved (if active)
      block:
        - name: Write systemd-resolved config
          ansible.builtin.copy:
            content: |
              [Resolve]
              DNS={{ nameservers | join(' ') }}
              Domains={{ search_domains | join(' ') }}
              Cache=yes
            dest: /etc/systemd/resolved.conf
            mode: '0644'

        - name: Restart systemd-resolved
          ansible.builtin.systemd:
            name: systemd-resolved
            state: restarted

        - name: Ensure resolv.conf symlink points to stub
          ansible.builtin.file:
            src: /run/systemd/resolve/stub-resolv.conf
            dest: /etc/resolv.conf
            state: link
            force: true
      when: resolved_status.rc == 0

    - name: Configure resolv.conf directly (if no systemd-resolved)
      block:
        - name: Remove symlink if present
          ansible.builtin.file:
            path: /etc/resolv.conf
            state: absent
          when: resolved_status.rc != 0

        - name: Write static resolv.conf
          ansible.builtin.copy:
            content: |
              # Managed by Ansible
              {% for ns in nameservers %}
              nameserver {{ ns }}
              {% endfor %}
              search {{ search_domains | join(' ') }}
              options timeout:2 attempts:3
            dest: /etc/resolv.conf
            mode: '0644'
      when: resolved_status.rc != 0
```

## Preventing resolv.conf from Being Overwritten

DHCP clients and NetworkManager love to overwrite `/etc/resolv.conf`. Here are several strategies to prevent this:

### Strategy 1: Make the file immutable

```yaml
# make resolv.conf immutable so nothing can overwrite it
---
- name: Lock resolv.conf
  hosts: all
  become: true
  tasks:
    - name: Remove immutable flag first (in case it is already set)
      ansible.builtin.command:
        cmd: chattr -i /etc/resolv.conf
      failed_when: false
      changed_when: false

    - name: Write resolv.conf
      ansible.builtin.copy:
        content: |
          # Managed by Ansible - file is immutable
          nameserver 10.0.0.2
          nameserver 10.0.0.3
          nameserver 8.8.8.8
          search example.com
          options timeout:2 attempts:3
        dest: /etc/resolv.conf
        mode: '0644'

    - name: Set immutable flag to prevent overwriting
      ansible.builtin.command:
        cmd: chattr +i /etc/resolv.conf
      changed_when: true
```

### Strategy 2: Configure DHCP client to not touch DNS

```yaml
# prevent DHCP client from overwriting resolv.conf
---
- name: Prevent DHCP DNS overwrite
  hosts: all
  become: true
  tasks:
    # For dhclient
    - name: Configure dhclient to preserve DNS
      ansible.builtin.copy:
        content: |
          # Prevent dhclient from overwriting resolv.conf
          supersede domain-name-servers 10.0.0.2, 10.0.0.3;
          supersede domain-search "example.com";
        dest: /etc/dhcp/dhclient.conf
        mode: '0644'
      when: ansible_os_family == "Debian"

    # For NetworkManager
    - name: Prevent NetworkManager from managing DNS
      ansible.builtin.copy:
        content: |
          [main]
          dns=none
        dest: /etc/NetworkManager/conf.d/no-dns.conf
        mode: '0644'
      when: ansible_os_family == "RedHat"
      notify: Restart NetworkManager

  handlers:
    - name: Restart NetworkManager
      ansible.builtin.systemd:
        name: NetworkManager
        state: restarted
```

## Using resolvconf Utility

On some Debian systems, the `resolvconf` package manages `/etc/resolv.conf`. You can work with it:

```yaml
# manage DNS through the resolvconf utility
---
- name: Configure DNS via resolvconf
  hosts: debian_servers
  become: true
  tasks:
    - name: Install resolvconf
      ansible.builtin.apt:
        name: resolvconf
        state: present

    - name: Configure base DNS settings
      ansible.builtin.copy:
        content: |
          # Base DNS configuration
          nameserver 10.0.0.2
          nameserver 10.0.0.3
          search example.com
        dest: /etc/resolvconf/resolv.conf.d/base
        mode: '0644'
      notify: Update resolvconf

    - name: Configure head (prepended to resolv.conf)
      ansible.builtin.copy:
        content: |
          # Head of resolv.conf - Managed by Ansible
          options timeout:2 attempts:3
        dest: /etc/resolvconf/resolv.conf.d/head
        mode: '0644'
      notify: Update resolvconf

  handlers:
    - name: Update resolvconf
      ansible.builtin.command:
        cmd: resolvconf -u
```

## Per-Host DNS Configuration from Inventory

Define DNS settings per host or group in your inventory:

```yaml
# inventory group_vars for DNS settings
# group_vars/all.yaml
dns_nameservers:
  - 8.8.8.8
  - 8.8.4.4
dns_search:
  - example.com
dns_options:
  - "timeout:2"
  - "attempts:3"
```

```yaml
# group_vars/datacenter_east.yaml - override for east DC
dns_nameservers:
  - 10.1.0.2
  - 10.1.0.3
  - 8.8.8.8
dns_search:
  - east.example.com
  - example.com
```

```yaml
# group_vars/datacenter_west.yaml - override for west DC
dns_nameservers:
  - 10.2.0.2
  - 10.2.0.3
  - 8.8.8.8
dns_search:
  - west.example.com
  - example.com
```

The playbook uses these variables:

```yaml
# apply per-group DNS configuration
---
- name: Configure DNS from inventory variables
  hosts: all
  become: true
  tasks:
    - name: Deploy resolv.conf
      ansible.builtin.template:
        src: templates/resolv.conf.j2
        dest: /etc/resolv.conf
        mode: '0644'
```

## Validating resolv.conf

Always verify your DNS configuration works after applying changes:

```yaml
# validate resolv.conf after deployment
---
- name: Validate DNS configuration
  hosts: all
  become: true
  tasks:
    - name: Deploy resolv.conf
      ansible.builtin.template:
        src: templates/resolv.conf.j2
        dest: /etc/resolv.conf
        mode: '0644'
      register: dns_deployed

    - name: Verify resolv.conf syntax
      ansible.builtin.command:
        cmd: cat /etc/resolv.conf
      register: resolv_contents
      changed_when: false

    - name: Verify nameserver count (max 3 supported)
      ansible.builtin.shell:
        cmd: "grep -c '^nameserver' /etc/resolv.conf"
      register: ns_count
      changed_when: false
      failed_when: ns_count.stdout | int > 3 or ns_count.stdout | int == 0

    - name: Test DNS resolution
      ansible.builtin.command:
        cmd: "getent hosts {{ item }}"
      loop:
        - google.com
        - "{{ inventory_hostname }}"
      register: dns_tests
      changed_when: false
      failed_when: false

    - name: Report DNS test results
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ 'OK' if item.rc == 0 else 'FAILED' }}"
      loop: "{{ dns_tests.results }}"

    - name: Test search domain resolution
      ansible.builtin.command:
        cmd: "getent hosts short-hostname"
      register: search_test
      changed_when: false
      failed_when: false
```

## Backup and Rollback Pattern

Protect against bad DNS configuration:

```yaml
# backup resolv.conf before changes and rollback on failure
---
- name: Safe DNS configuration with rollback
  hosts: all
  become: true
  tasks:
    - name: Backup current resolv.conf
      ansible.builtin.copy:
        src: /etc/resolv.conf
        dest: /etc/resolv.conf.backup
        remote_src: true
        mode: '0644'

    - name: Deploy new resolv.conf
      ansible.builtin.template:
        src: templates/resolv.conf.j2
        dest: /etc/resolv.conf
        mode: '0644'

    - name: Test DNS resolution with new config
      ansible.builtin.command:
        cmd: "dig +short +time=3 google.com"
      register: dns_test
      failed_when: false
      changed_when: false

    - name: Rollback if DNS is broken
      ansible.builtin.copy:
        src: /etc/resolv.conf.backup
        dest: /etc/resolv.conf
        remote_src: true
        mode: '0644'
      when: dns_test.rc != 0 or dns_test.stdout | length == 0

    - name: Report rollback
      ansible.builtin.fail:
        msg: "DNS configuration failed, rolled back to previous config"
      when: dns_test.rc != 0 or dns_test.stdout | length == 0

    - name: Clean up backup
      ansible.builtin.file:
        path: /etc/resolv.conf.backup
        state: absent
      when: dns_test.rc == 0 and dns_test.stdout | length > 0
```

## Resolver Options Explained

Here is a reference for useful resolver options you can put in your template:

```yaml
# resolv.conf options reference
---
- name: Configure resolv.conf with tuned options
  hosts: all
  become: true
  tasks:
    - name: Deploy tuned resolv.conf
      ansible.builtin.copy:
        content: |
          # DNS Servers
          nameserver 10.0.0.2
          nameserver 10.0.0.3
          nameserver 8.8.8.8

          # Search domains (appended to short hostnames)
          search example.com corp.example.com

          # Options:
          # timeout:2 - wait 2 seconds per query attempt (default 5)
          # attempts:3 - try 3 times before giving up (default 2)
          # rotate - distribute queries across nameservers (round-robin)
          # ndots:2 - names with 2+ dots are tried as absolute first
          # edns0 - enable EDNS0 extensions for larger responses
          # single-request - send A and AAAA queries sequentially
          options timeout:2 attempts:3 rotate ndots:2 edns0
        dest: /etc/resolv.conf
        mode: '0644'
```

The `single-request` option deserves special mention. Some firewalls have trouble with simultaneous A and AAAA queries. If you see intermittent DNS timeouts, adding `single-request` or `single-request-reopen` often fixes it.

## Docker and Container Considerations

Containers get their own `/etc/resolv.conf` from the Docker daemon. To manage DNS in Dockerized environments:

```yaml
# configure DNS for Docker daemon
---
- name: Configure Docker DNS
  hosts: docker_hosts
  become: true
  tasks:
    - name: Configure Docker daemon DNS
      ansible.builtin.copy:
        content: |
          {
            "dns": ["10.0.0.2", "10.0.0.3", "8.8.8.8"],
            "dns-search": ["example.com"],
            "dns-opts": ["timeout:2", "attempts:3"]
          }
        dest: /etc/docker/daemon.json
        mode: '0644'
      notify: Restart Docker

  handlers:
    - name: Restart Docker
      ansible.builtin.systemd:
        name: docker
        state: restarted
```

## Summary

Managing `/etc/resolv.conf` with Ansible requires understanding which subsystem controls DNS on your target systems. On systemd-resolved systems, configure through `/etc/systemd/resolved.conf` rather than editing `resolv.conf` directly. On NetworkManager systems, use nmcli or disable NetworkManager DNS management. For static configurations, use templates with the `chattr +i` immutable flag to prevent overwriting. Always validate DNS resolution after changes and implement a rollback pattern for safety. Limit nameservers to 3 (the Linux resolver ignores additional entries), and tune resolver options like `timeout`, `attempts`, and `rotate` for your environment.
