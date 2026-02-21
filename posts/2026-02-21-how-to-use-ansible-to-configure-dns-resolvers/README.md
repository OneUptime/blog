# How to Use Ansible to Configure DNS Resolvers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DNS, Networking, Linux

Description: Learn how to configure DNS resolvers on Linux servers using Ansible with systemd-resolved, NetworkManager, and resolv.conf.

---

DNS configuration is one of those things that seems simple until it breaks. When your servers cannot resolve hostnames, everything stops working: package installations fail, API calls time out, and service discovery breaks. Configuring DNS resolvers correctly and consistently across your fleet is essential, and Ansible makes it straightforward.

The complexity comes from the fact that modern Linux has multiple DNS management layers: systemd-resolved, NetworkManager, resolvconf, and the traditional `/etc/resolv.conf`. This post covers how to configure DNS resolvers using Ansible, handling the different subsystems you will encounter.

## Understanding the DNS Stack

Before diving into Ansible tasks, it helps to understand how DNS resolution works on modern Linux systems:

```mermaid
graph TD
    A[Application] --> B[/etc/resolv.conf]
    B --> C{What manages resolv.conf?}
    C -->|systemd-resolved| D[127.0.0.53 stub resolver]
    C -->|NetworkManager| E[NetworkManager managed]
    C -->|Static| F[Direct DNS servers]
    D --> G[Upstream DNS Servers]
    E --> G
    F --> G
```

On Ubuntu 18.04+, `/etc/resolv.conf` is typically a symlink to a stub resolver managed by systemd-resolved. On RHEL systems, NetworkManager often manages it. On minimal or container-based systems, it might be a plain static file.

## Configuring systemd-resolved (Ubuntu)

On systems with systemd-resolved, configure DNS through its configuration files:

```yaml
# configure DNS via systemd-resolved
---
- name: Configure DNS resolvers (systemd-resolved)
  hosts: ubuntu_servers
  become: true
  vars:
    dns_servers:
      - 8.8.8.8
      - 8.8.4.4
    fallback_dns:
      - 1.1.1.1
      - 1.0.0.1
    dns_search:
      - example.com
      - internal.example.com
  tasks:
    - name: Configure systemd-resolved
      ansible.builtin.template:
        src: templates/resolved.conf.j2
        dest: /etc/systemd/resolved.conf
        owner: root
        group: root
        mode: '0644'
      notify: Restart systemd-resolved

    - name: Ensure resolved is running
      ansible.builtin.systemd:
        name: systemd-resolved
        state: started
        enabled: true

  handlers:
    - name: Restart systemd-resolved
      ansible.builtin.systemd:
        name: systemd-resolved
        state: restarted
```

The template:

```jinja2
# templates/resolved.conf.j2 - managed by Ansible
[Resolve]
DNS={{ dns_servers | join(' ') }}
FallbackDNS={{ fallback_dns | join(' ') }}
Domains={{ dns_search | join(' ') }}
DNSSEC=allow-downgrade
DNSOverTLS=opportunistic
Cache=yes
```

## Configuring NetworkManager DNS

On RHEL-based systems, NetworkManager manages DNS. You can configure it through nmcli:

```yaml
# configure DNS through NetworkManager
---
- name: Configure DNS resolvers (NetworkManager)
  hosts: rhel_servers
  become: true
  vars:
    dns_servers:
      - 8.8.8.8
      - 8.8.4.4
    dns_search:
      - example.com
  tasks:
    - name: Get active connection name
      ansible.builtin.shell:
        cmd: "nmcli -t -f NAME connection show --active | head -1"
      register: active_connection
      changed_when: false

    - name: Set DNS servers via nmcli
      ansible.builtin.command:
        cmd: "nmcli connection modify '{{ active_connection.stdout }}' ipv4.dns '{{ dns_servers | join(' ') }}'"
      register: dns_set
      changed_when: dns_set.rc == 0

    - name: Set DNS search domains
      ansible.builtin.command:
        cmd: "nmcli connection modify '{{ active_connection.stdout }}' ipv4.dns-search '{{ dns_search | join(' ') }}'"
      register: search_set
      changed_when: search_set.rc == 0

    - name: Prevent DHCP from overriding DNS
      ansible.builtin.command:
        cmd: "nmcli connection modify '{{ active_connection.stdout }}' ipv4.ignore-auto-dns yes"
      register: ignore_auto
      changed_when: ignore_auto.rc == 0

    - name: Restart connection to apply DNS
      ansible.builtin.command:
        cmd: "nmcli connection up '{{ active_connection.stdout }}'"
      when: dns_set.changed or search_set.changed
```

## Using the community.general.nmcli Module

The nmcli module provides a cleaner approach for NetworkManager:

```yaml
# configure DNS with the nmcli Ansible module
---
- name: Configure DNS with nmcli module
  hosts: rhel_servers
  become: true
  tasks:
    - name: Set DNS configuration
      community.general.nmcli:
        conn_name: "{{ ansible_default_ipv4.alias }}"
        type: ethernet
        dns4:
          - 8.8.8.8
          - 8.8.4.4
        dns4_search:
          - example.com
          - internal.example.com
        dns4_ignore_auto: true
        state: present
      notify: Restart network connection

  handlers:
    - name: Restart network connection
      ansible.builtin.command:
        cmd: "nmcli connection up {{ ansible_default_ipv4.alias }}"
```

## Direct resolv.conf Configuration

For systems without systemd-resolved or NetworkManager, edit `/etc/resolv.conf` directly:

```yaml
# configure DNS by writing resolv.conf directly
---
- name: Configure DNS (static resolv.conf)
  hosts: minimal_servers
  become: true
  vars:
    dns_servers:
      - 8.8.8.8
      - 8.8.4.4
      - 1.1.1.1
    dns_search:
      - example.com
    dns_options:
      - timeout:2
      - attempts:3
      - rotate
  tasks:
    - name: Check if resolv.conf is a symlink
      ansible.builtin.stat:
        path: /etc/resolv.conf
      register: resolv_stat

    - name: Remove symlink if present (take control from systemd-resolved)
      ansible.builtin.file:
        path: /etc/resolv.conf
        state: absent
      when: resolv_stat.stat.islnk | default(false)

    - name: Write resolv.conf
      ansible.builtin.template:
        src: templates/resolv.conf.j2
        dest: /etc/resolv.conf
        owner: root
        group: root
        mode: '0644'

    - name: Make resolv.conf immutable (prevent overwriting)
      ansible.builtin.command:
        cmd: chattr +i /etc/resolv.conf
      changed_when: true
```

The template:

```jinja2
# templates/resolv.conf.j2 - managed by Ansible
# DNS configuration - DO NOT EDIT MANUALLY
{% for server in dns_servers %}
nameserver {{ server }}
{% endfor %}
{% if dns_search | length > 0 %}
search {{ dns_search | join(' ') }}
{% endif %}
{% if dns_options | length > 0 %}
options {{ dns_options | join(' ') }}
{% endif %}
```

## Using Netplan for DNS Configuration

On Ubuntu with Netplan, DNS is configured alongside network interfaces:

```yaml
# configure DNS through Netplan
---
- name: Configure DNS via Netplan
  hosts: ubuntu_servers
  become: true
  vars:
    dns_servers:
      - 10.0.0.2
      - 10.0.0.3
    dns_search:
      - example.com
      - corp.example.com
  tasks:
    - name: Deploy Netplan config with DNS
      ansible.builtin.copy:
        content: |
          network:
            version: 2
            ethernets:
              {{ ansible_default_ipv4.interface }}:
                dhcp4: true
                dhcp4-overrides:
                  use-dns: false
                nameservers:
                  addresses: {{ dns_servers | to_json }}
                  search: {{ dns_search | to_json }}
        dest: /etc/netplan/01-dns-config.yaml
        mode: '0600'
      notify: Apply netplan

  handlers:
    - name: Apply netplan
      ansible.builtin.command:
        cmd: netplan apply
```

This uses DHCP for the IP address but overrides the DNS servers with your own.

## Cross-Distribution DNS Configuration

Handle multiple distributions in one playbook:

```yaml
# configure DNS across different Linux distributions
---
- name: Configure DNS (any distribution)
  hosts: all
  become: true
  vars:
    dns_servers:
      - 10.0.0.2
      - 10.0.0.3
    dns_search:
      - example.com
  tasks:
    - name: Configure DNS via systemd-resolved
      ansible.builtin.copy:
        content: |
          [Resolve]
          DNS={{ dns_servers | join(' ') }}
          Domains={{ dns_search | join(' ') }}
        dest: /etc/systemd/resolved.conf
        mode: '0644'
      notify: Restart resolved
      when:
        - ansible_service_mgr == 'systemd'
        - "'systemd-resolved' in ansible_facts.services | default({})"

    - name: Configure DNS via nmcli
      ansible.builtin.command:
        cmd: "nmcli connection modify '{{ ansible_default_ipv4.alias }}' ipv4.dns '{{ dns_servers | join(' ') }}' ipv4.dns-search '{{ dns_search | join(' ') }}'"
      when:
        - ansible_os_family == 'RedHat'
      notify: Restart nm connection

    - name: Configure DNS via resolv.conf (fallback)
      ansible.builtin.template:
        src: templates/resolv.conf.j2
        dest: /etc/resolv.conf
        mode: '0644'
      when:
        - ansible_os_family not in ['RedHat', 'Debian']

  handlers:
    - name: Restart resolved
      ansible.builtin.systemd:
        name: systemd-resolved
        state: restarted

    - name: Restart nm connection
      ansible.builtin.command:
        cmd: "nmcli connection up '{{ ansible_default_ipv4.alias }}'"
```

## Internal DNS with Fallback

A common setup uses internal DNS for corporate domains and public DNS as fallback:

```yaml
# configure split DNS with internal and external resolvers
---
- name: Split DNS configuration
  hosts: all
  become: true
  vars:
    internal_dns:
      - 10.0.0.2
      - 10.0.0.3
    external_dns:
      - 8.8.8.8
      - 8.8.4.4
    internal_domains:
      - corp.example.com
      - internal.example.com
      - example.com
  tasks:
    - name: Configure split DNS with systemd-resolved
      ansible.builtin.copy:
        content: |
          [Resolve]
          DNS={{ internal_dns | join(' ') }}
          FallbackDNS={{ external_dns | join(' ') }}
          Domains={{ internal_domains | join(' ') }}
          Cache=yes
        dest: /etc/systemd/resolved.conf
        mode: '0644'
      notify: Restart systemd-resolved

  handlers:
    - name: Restart systemd-resolved
      ansible.builtin.systemd:
        name: systemd-resolved
        state: restarted
```

## Verifying DNS Configuration

After applying DNS settings, verify they work:

```yaml
# verify DNS configuration is working correctly
---
- name: Verify DNS configuration
  hosts: all
  tasks:
    - name: Check resolv.conf contents
      ansible.builtin.command:
        cmd: cat /etc/resolv.conf
      register: resolv_contents
      changed_when: false

    - name: Test DNS resolution for external domain
      ansible.builtin.command:
        cmd: "dig +short google.com"
      register: external_dns_test
      changed_when: false
      failed_when: external_dns_test.stdout | length == 0

    - name: Test DNS resolution for internal domain
      ansible.builtin.command:
        cmd: "dig +short internal-app.corp.example.com"
      register: internal_dns_test
      changed_when: false
      failed_when: false

    - name: Test reverse DNS
      ansible.builtin.command:
        cmd: "dig +short -x {{ ansible_default_ipv4.address }}"
      register: reverse_dns_test
      changed_when: false
      failed_when: false

    - name: DNS verification report
      ansible.builtin.debug:
        msg:
          - "resolv.conf: {{ resolv_contents.stdout_lines }}"
          - "External DNS: {{ 'OK' if external_dns_test.stdout | length > 0 else 'FAIL' }}"
          - "Internal DNS: {{ 'OK' if internal_dns_test.stdout | length > 0 else 'N/A' }}"
          - "Reverse DNS: {{ reverse_dns_test.stdout | default('not configured') }}"
```

## Summary

DNS resolver configuration in Ansible depends on which subsystem manages DNS on your target systems. Use systemd-resolved configuration for modern Ubuntu, nmcli for RHEL-based distributions, and direct `/etc/resolv.conf` editing for minimal or containerized systems. Always verify DNS resolution after making changes with `dig` or `nslookup`. For enterprise environments, configure split DNS with internal servers for corporate domains and public DNS as fallback. And consider making `/etc/resolv.conf` immutable with `chattr +i` on systems where DHCP clients might overwrite your static configuration.
