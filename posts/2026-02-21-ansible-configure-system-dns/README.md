# How to Use Ansible to Configure System DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DNS, Networking, Linux, System Configuration

Description: Automate DNS resolver configuration across your Linux servers using Ansible to manage resolv.conf, systemd-resolved, and DNS client settings consistently.

---

DNS configuration seems simple until you realize that modern Linux has at least three different ways to handle it, and they often fight each other. You have `/etc/resolv.conf`, `systemd-resolved`, NetworkManager, and whatever your DHCP client wants to do. Getting DNS right across a fleet of servers means picking one approach and enforcing it consistently. That is where Ansible comes in.

## The DNS Configuration Mess

On a typical Ubuntu server, DNS resolution involves a chain of components:

1. Applications call `getaddrinfo()` which reads `/etc/nsswitch.conf`
2. nsswitch.conf points to `files` (for /etc/hosts) and then `resolve` or `dns`
3. If using systemd-resolved, queries go to the stub resolver at 127.0.0.53
4. systemd-resolved forwards to the actual DNS servers
5. If not using systemd-resolved, glibc reads `/etc/resolv.conf` directly

The problem is that DHCP clients, cloud-init, and NetworkManager all want to manage `/etc/resolv.conf`, creating conflicts. Ansible lets you take control and enforce your desired configuration.

## Direct resolv.conf Management

The simplest approach: write `/etc/resolv.conf` directly and prevent anything else from touching it.

This playbook deploys a static resolv.conf and locks it:

```yaml
# configure-dns-static.yml - Static DNS configuration
---
- name: Configure Static DNS
  hosts: all
  become: true
  vars:
    dns_nameservers:
      - 10.0.0.2
      - 10.0.0.3
      - 8.8.8.8
    dns_search_domains:
      - example.com
      - internal.example.com
    dns_options:
      - timeout:2
      - attempts:3
      - rotate

  tasks:
    - name: Stop systemd-resolved if running
      ansible.builtin.systemd:
        name: systemd-resolved
        state: stopped
        enabled: false
      failed_when: false

    - name: Remove symlink if resolv.conf is a symlink
      ansible.builtin.file:
        path: /etc/resolv.conf
        state: absent
      when: ansible_facts['resolv_conf'] is defined or true

    - name: Deploy static resolv.conf
      ansible.builtin.copy:
        dest: /etc/resolv.conf
        owner: root
        group: root
        mode: '0644'
        content: |
          # DNS configuration - managed by Ansible
          # Do not edit manually
          {% for ns in dns_nameservers %}
          nameserver {{ ns }}
          {% endfor %}
          {% if dns_search_domains | length > 0 %}
          search {{ dns_search_domains | join(' ') }}
          {% endif %}
          {% if dns_options | length > 0 %}
          options {{ dns_options | join(' ') }}
          {% endif %}

    - name: Make resolv.conf immutable to prevent overwriting
      ansible.builtin.command:
        cmd: chattr +i /etc/resolv.conf
      changed_when: true

    - name: Prevent DHCP from overwriting resolv.conf
      ansible.builtin.copy:
        dest: /etc/dhcp/dhclient-enter-hooks.d/nodnsupdate
        mode: '0755'
        content: |
          #!/bin/sh
          # Prevent DHCP from updating DNS settings
          make_resolv_conf() {
            :
          }
      when: ansible_os_family == "Debian"
```

## Configuring systemd-resolved

If you prefer to work with systemd-resolved (which is the default on modern Ubuntu), here is how to configure it properly.

This playbook configures systemd-resolved with your DNS servers:

```yaml
# configure-systemd-resolved.yml - DNS via systemd-resolved
---
- name: Configure systemd-resolved
  hosts: all
  become: true
  vars:
    dns_servers: "10.0.0.2 10.0.0.3"
    dns_fallback: "8.8.8.8 1.1.1.1"
    dns_domains: "example.com internal.example.com"
    dns_dnssec: "allow-downgrade"
    dns_cache: "yes"

  tasks:
    - name: Deploy systemd-resolved configuration
      ansible.builtin.copy:
        dest: /etc/systemd/resolved.conf
        owner: root
        group: root
        mode: '0644'
        content: |
          # systemd-resolved configuration - managed by Ansible
          [Resolve]
          DNS={{ dns_servers }}
          FallbackDNS={{ dns_fallback }}
          Domains={{ dns_domains }}
          DNSSEC={{ dns_dnssec }}
          Cache={{ dns_cache }}
          DNSStubListener=yes
          # ReadEtcHosts=yes
      notify: Restart systemd-resolved

    - name: Ensure resolv.conf is symlinked to systemd-resolved stub
      ansible.builtin.file:
        src: /run/systemd/resolve/stub-resolv.conf
        dest: /etc/resolv.conf
        state: link
        force: true

    - name: Enable and start systemd-resolved
      ansible.builtin.systemd:
        name: systemd-resolved
        enabled: true
        state: started

    - name: Verify DNS resolution works
      ansible.builtin.command:
        cmd: resolvectl status
      register: resolve_status
      changed_when: false

    - name: Display DNS status
      ansible.builtin.debug:
        msg: "{{ resolve_status.stdout_lines }}"

  handlers:
    - name: Restart systemd-resolved
      ansible.builtin.systemd:
        name: systemd-resolved
        state: restarted
```

## Per-Interface DNS Configuration

In environments with multiple networks (management, data, storage), you might want different DNS servers for different interfaces.

This playbook configures per-interface DNS using systemd-resolved:

```yaml
# configure-per-interface-dns.yml - Interface-specific DNS
---
- name: Configure Per-Interface DNS
  hosts: all
  become: true
  vars:
    interface_dns:
      - interface: eth0
        dns_servers: "10.0.0.2 10.0.0.3"
        dns_domains: "~example.com"
      - interface: eth1
        dns_servers: "10.1.0.2"
        dns_domains: "~storage.internal"

  tasks:
    - name: Create network override directory for each interface
      ansible.builtin.file:
        path: "/etc/systemd/network/{{ item.interface }}.network.d"
        state: directory
        mode: '0755'
      loop: "{{ interface_dns }}"
      loop_control:
        label: "{{ item.interface }}"

    - name: Configure DNS per interface via networkd
      ansible.builtin.copy:
        dest: "/etc/systemd/network/{{ item.interface }}.network.d/dns.conf"
        mode: '0644'
        content: |
          [Network]
          DNS={{ item.dns_servers }}
          Domains={{ item.dns_domains }}
      loop: "{{ interface_dns }}"
      loop_control:
        label: "{{ item.interface }}"
      notify: Restart networkd

    - name: Set per-interface DNS via resolvectl
      ansible.builtin.command:
        cmd: "resolvectl dns {{ item.interface }} {{ item.dns_servers }}"
      loop: "{{ interface_dns }}"
      loop_control:
        label: "{{ item.interface }}"
      changed_when: true
      failed_when: false

    - name: Set per-interface search domains
      ansible.builtin.command:
        cmd: "resolvectl domain {{ item.interface }} {{ item.dns_domains }}"
      loop: "{{ interface_dns }}"
      loop_control:
        label: "{{ item.interface }}"
      changed_when: true
      failed_when: false

  handlers:
    - name: Restart networkd
      ansible.builtin.systemd:
        name: systemd-networkd
        state: restarted
```

## Configuring /etc/nsswitch.conf

The nsswitch.conf file controls the order of name resolution sources.

This playbook configures nsswitch.conf for proper DNS resolution order:

```yaml
# configure-nsswitch.yml - Name resolution order
---
- name: Configure Name Resolution Order
  hosts: all
  become: true
  tasks:
    - name: Configure nsswitch.conf
      ansible.builtin.lineinfile:
        path: /etc/nsswitch.conf
        regexp: '^hosts:'
        line: "hosts:          files dns myhostname"
        backup: true

    - name: Ensure myhostname is available via NSS
      ansible.builtin.package:
        name: libnss-myhostname
        state: present
      when: ansible_os_family == "Debian"
```

## DNS Testing and Validation

After configuring DNS, verify it works.

This playbook tests DNS resolution against expected results:

```yaml
# validate-dns.yml - Test DNS configuration
---
- name: Validate DNS Configuration
  hosts: all
  become: true
  vars:
    dns_test_entries:
      - name: google.com
        expected_result: success
      - name: internal.example.com
        expected_result: success
      - name: nonexistent.invalid
        expected_result: failure

  tasks:
    - name: Check resolv.conf contents
      ansible.builtin.command: cat /etc/resolv.conf
      register: resolv_conf
      changed_when: false

    - name: Display current DNS configuration
      ansible.builtin.debug:
        msg: "{{ resolv_conf.stdout_lines }}"

    - name: Test DNS resolution for each entry
      ansible.builtin.command:
        cmd: "getent hosts {{ item.name }}"
      register: dns_test
      changed_when: false
      failed_when: false
      loop: "{{ dns_test_entries }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Verify expected DNS results
      ansible.builtin.debug:
        msg: >
          {{ item.item.name }}:
          Expected={{ item.item.expected_result }}
          Actual={{ 'success' if item.rc == 0 else 'failure' }}
          {{ 'OK' if (item.rc == 0 and item.item.expected_result == 'success') or (item.rc != 0 and item.item.expected_result == 'failure') else 'MISMATCH' }}
      loop: "{{ dns_test.results }}"
      loop_control:
        label: "{{ item.item.name }}"

    - name: Test DNS response time
      ansible.builtin.shell: |
        # Measure DNS query time in milliseconds
        START=$(date +%s%N)
        getent hosts google.com > /dev/null 2>&1
        END=$(date +%s%N)
        echo $(( (END - START) / 1000000 ))
      register: dns_latency
      changed_when: false

    - name: Report DNS latency
      ansible.builtin.debug:
        msg: "DNS resolution time on {{ inventory_hostname }}: {{ dns_latency.stdout }}ms"

    - name: Alert on high DNS latency
      ansible.builtin.debug:
        msg: "WARNING: DNS latency is {{ dns_latency.stdout }}ms on {{ inventory_hostname }}"
      when: dns_latency.stdout | int > 100
```

## DNS Resolution Flow

```mermaid
graph TD
    A[Application] --> B[getaddrinfo]
    B --> C[/etc/nsswitch.conf]
    C --> D{Resolution Source}
    D -->|files| E[/etc/hosts]
    D -->|dns| F{systemd-resolved?}
    F -->|Yes| G[127.0.0.53 Stub]
    F -->|No| H[/etc/resolv.conf]
    G --> I[Cache Check]
    I -->|Hit| J[Return Cached]
    I -->|Miss| K[Forward to DNS Servers]
    H --> K
    K --> L[Primary DNS]
    K --> M[Secondary DNS]
    K --> N[Fallback DNS]
```

## Cloud Provider DNS Considerations

Cloud providers have their own DNS services that interact with your configuration.

This playbook handles DNS on AWS EC2 instances:

```yaml
# configure-dns-aws.yml - DNS for AWS EC2
---
- name: Configure DNS for AWS
  hosts: all
  become: true
  tasks:
    - name: Configure cloud-init to preserve DNS settings
      ansible.builtin.copy:
        dest: /etc/cloud/cloud.cfg.d/99-custom-dns.cfg
        mode: '0644'
        content: |
          # Prevent cloud-init from managing DNS
          manage_resolv_conf: false
      when: ansible_system_vendor | default('') == 'Amazon EC2'

    - name: Preserve custom DNS alongside VPC DNS
      ansible.builtin.copy:
        dest: /etc/resolv.conf
        mode: '0644'
        content: |
          # Custom DNS with AWS VPC resolver as fallback
          nameserver 10.0.0.2
          nameserver 10.0.0.3
          nameserver 169.254.169.253
          search example.com internal.example.com
          options timeout:2 attempts:3
      when: ansible_system_vendor | default('') == 'Amazon EC2'
```

## Common DNS Problems

**resolv.conf keeps getting overwritten**: Either lock it with `chattr +i`, configure your DHCP client to skip DNS updates, or use systemd-resolved which manages its own state.

**Slow DNS resolution**: Check if you have unreachable nameservers in your config. The resolver tries each one in order, and waiting for a timeout on a dead server adds seconds to every query. Use the `timeout` and `attempts` options to minimize this.

**Split DNS not working**: If you need internal domains to resolve differently from external ones, use systemd-resolved with per-interface domain configuration. The `~` prefix on a domain makes it a routing domain, directing queries for that domain to specific DNS servers.

**Kubernetes DNS interaction**: If your servers run Kubernetes, be aware that pods use their own DNS (CoreDNS/kube-dns). Host-level DNS changes do not affect pods unless you modify the pod's DNS policy.

Getting DNS right is foundational. Every service on every server depends on it. Use Ansible to establish a consistent DNS configuration, and you eliminate an entire class of hard-to-debug connectivity issues.
