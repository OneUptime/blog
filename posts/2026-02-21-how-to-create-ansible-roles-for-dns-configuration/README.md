# How to Create Ansible Roles for DNS Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DNS, BIND, Networking, Roles

Description: Build an Ansible role for DNS server and client configuration including BIND setup, zone management, and resolver configuration.

---

DNS is one of those services that works silently in the background until it breaks, and then everything breaks. Whether you are managing internal DNS servers for service discovery or just making sure all your servers point at the right resolvers, an Ansible role brings consistency and reliability to DNS configuration. This post covers building a role that handles both DNS client configuration (resolvers) and DNS server setup using BIND9.

## Role Structure

```
roles/dns/
  defaults/main.yml
  handlers/main.yml
  tasks/
    main.yml
    client.yml
    server_install.yml
    server_configure.yml
    zones.yml
  templates/
    resolv.conf.j2
    named.conf.options.j2
    named.conf.local.j2
    zone_forward.j2
    zone_reverse.j2
  meta/main.yml
```

## Default Variables

```yaml
# roles/dns/defaults/main.yml
# Mode: client, server, or both
dns_mode: client

# Client configuration (resolv.conf)
dns_nameservers:
  - 8.8.8.8
  - 8.8.4.4
dns_search_domains: []
dns_domain: ""
dns_options: []
# Example: ["timeout:2", "attempts:3", "rotate"]

# Use systemd-resolved instead of raw resolv.conf
dns_use_systemd_resolved: false

# Server configuration (BIND9)
dns_bind_package: bind9
dns_bind_service: named
dns_bind_user: bind
dns_bind_config_dir: /etc/bind

# BIND options
dns_bind_listen_on:
  - "127.0.0.1"
  - "{{ ansible_default_ipv4.address }}"
dns_bind_listen_on_v6:
  - "::1"
dns_bind_allow_query:
  - "localhost"
  - "10.0.0.0/8"
dns_bind_allow_recursion:
  - "localhost"
  - "10.0.0.0/8"
dns_bind_forwarders:
  - "8.8.8.8"
  - "8.8.4.4"
dns_bind_forward_mode: "only"
dns_bind_dnssec_validation: "auto"
dns_bind_recursion: true

# Zone definitions
dns_zones: []
# Example:
#   - name: example.internal
#     type: master
#     file: db.example.internal
#     ttl: 3600
#     soa:
#       ns: ns1.example.internal
#       email: admin.example.internal
#       serial: 2024010101
#       refresh: 3600
#       retry: 900
#       expire: 604800
#       minimum: 86400
#     records:
#       - { name: "@", type: NS, value: "ns1.example.internal." }
#       - { name: "ns1", type: A, value: "10.0.0.10" }
#       - { name: "web1", type: A, value: "10.0.1.10" }
#       - { name: "web2", type: A, value: "10.0.1.11" }
#       - { name: "db1", type: A, value: "10.0.2.10" }

# Reverse zones
dns_reverse_zones: []
# Example:
#   - name: 0.10.in-addr.arpa
#     type: master
#     file: db.10.0
#     subnet: "10.0"
#     records:
#       - { ip_last_octet: "10.1", name: "web1.example.internal." }
#       - { ip_last_octet: "11.1", name: "web2.example.internal." }

# Logging
dns_bind_logging: true
dns_bind_log_dir: /var/log/named
dns_bind_query_log: false
```

## Client Configuration Tasks

```yaml
# roles/dns/tasks/client.yml
# Configure DNS resolution on client machines
- name: Configure resolv.conf directly
  ansible.builtin.template:
    src: resolv.conf.j2
    dest: /etc/resolv.conf
    owner: root
    group: root
    mode: '0644'
  when: not dns_use_systemd_resolved

- name: Configure systemd-resolved
  ansible.builtin.ini_file:
    path: /etc/systemd/resolved.conf
    section: Resolve
    option: "{{ item.option }}"
    value: "{{ item.value }}"
  loop:
    - { option: "DNS", value: "{{ dns_nameservers | join(' ') }}" }
    - { option: "Domains", value: "{{ dns_search_domains | join(' ') }}" }
    - { option: "DNSOverTLS", value: "no" }
  notify: restart systemd-resolved
  when: dns_use_systemd_resolved
```

```jinja2
# roles/dns/templates/resolv.conf.j2
# DNS resolver configuration - managed by Ansible
# Do not edit manually
{% if dns_domain %}
domain {{ dns_domain }}
{% endif %}
{% if dns_search_domains | length > 0 %}
search {{ dns_search_domains | join(' ') }}
{% endif %}
{% for ns in dns_nameservers %}
nameserver {{ ns }}
{% endfor %}
{% for opt in dns_options %}
options {{ opt }}
{% endfor %}
```

## Server Installation Tasks

```yaml
# roles/dns/tasks/server_install.yml
# Install and set up BIND9 DNS server
- name: Install BIND9 packages
  ansible.builtin.apt:
    name:
      - "{{ dns_bind_package }}"
      - bind9-utils
      - bind9-dnsutils
    state: present
    update_cache: yes

- name: Create BIND log directory
  ansible.builtin.file:
    path: "{{ dns_bind_log_dir }}"
    state: directory
    owner: "{{ dns_bind_user }}"
    group: "{{ dns_bind_user }}"
    mode: '0755'
  when: dns_bind_logging

- name: Ensure BIND is started and enabled
  ansible.builtin.systemd:
    name: "{{ dns_bind_service }}"
    state: started
    enabled: yes
```

## Server Configuration Tasks

```yaml
# roles/dns/tasks/server_configure.yml
# Deploy BIND9 configuration files
- name: Deploy BIND options configuration
  ansible.builtin.template:
    src: named.conf.options.j2
    dest: "{{ dns_bind_config_dir }}/named.conf.options"
    owner: root
    group: "{{ dns_bind_user }}"
    mode: '0644'
  notify: restart bind

- name: Deploy BIND local zone configuration
  ansible.builtin.template:
    src: named.conf.local.j2
    dest: "{{ dns_bind_config_dir }}/named.conf.local"
    owner: root
    group: "{{ dns_bind_user }}"
    mode: '0644'
  notify: restart bind

- name: Validate BIND configuration
  ansible.builtin.command:
    cmd: named-checkconf
  changed_when: false
```

## BIND Configuration Templates

```jinja2
# roles/dns/templates/named.conf.options.j2
// BIND options - managed by Ansible
options {
    directory "/var/cache/bind";

    // Listen addresses
    listen-on { {{ dns_bind_listen_on | join('; ') }}; };
    listen-on-v6 { {{ dns_bind_listen_on_v6 | join('; ') }}; };

    // Access control
    allow-query { {{ dns_bind_allow_query | join('; ') }}; };
{% if dns_bind_recursion %}
    recursion yes;
    allow-recursion { {{ dns_bind_allow_recursion | join('; ') }}; };
{% else %}
    recursion no;
{% endif %}

    // Forwarders
{% if dns_bind_forwarders | length > 0 %}
    forwarders {
{% for forwarder in dns_bind_forwarders %}
        {{ forwarder }};
{% endfor %}
    };
    forward {{ dns_bind_forward_mode }};
{% endif %}

    // Security
    dnssec-validation {{ dns_bind_dnssec_validation }};
    auth-nxdomain no;
    version "not available";

    // Performance
    max-cache-size 256M;
    max-ncache-ttl 300;
};

{% if dns_bind_logging %}
logging {
    channel default_log {
        file "{{ dns_bind_log_dir }}/default.log" versions 5 size 10M;
        severity info;
        print-time yes;
        print-category yes;
        print-severity yes;
    };

{% if dns_bind_query_log %}
    channel query_log {
        file "{{ dns_bind_log_dir }}/queries.log" versions 5 size 50M;
        severity info;
        print-time yes;
    };

    category queries { query_log; };
{% endif %}

    category default { default_log; };
};
{% endif %}
```

```jinja2
# roles/dns/templates/named.conf.local.j2
// Local zone definitions - managed by Ansible

{% for zone in dns_zones %}
zone "{{ zone.name }}" {
    type {{ zone.type }};
    file "{{ dns_bind_config_dir }}/zones/{{ zone.file }}";
{% if zone.type == "slave" and zone.masters is defined %}
    masters { {{ zone.masters | join('; ') }}; };
{% endif %}
};

{% endfor %}

{% for zone in dns_reverse_zones %}
zone "{{ zone.name }}" {
    type {{ zone.type }};
    file "{{ dns_bind_config_dir }}/zones/{{ zone.file }}";
{% if zone.type == "slave" and zone.masters is defined %}
    masters { {{ zone.masters | join('; ') }}; };
{% endif %}
};

{% endfor %}
```

## Zone File Tasks and Templates

```yaml
# roles/dns/tasks/zones.yml
# Deploy DNS zone files
- name: Create zones directory
  ansible.builtin.file:
    path: "{{ dns_bind_config_dir }}/zones"
    state: directory
    owner: root
    group: "{{ dns_bind_user }}"
    mode: '0755'

- name: Deploy forward zone files
  ansible.builtin.template:
    src: zone_forward.j2
    dest: "{{ dns_bind_config_dir }}/zones/{{ item.file }}"
    owner: root
    group: "{{ dns_bind_user }}"
    mode: '0644'
  loop: "{{ dns_zones }}"
  when: item.type == "master"
  notify: reload bind

- name: Deploy reverse zone files
  ansible.builtin.template:
    src: zone_reverse.j2
    dest: "{{ dns_bind_config_dir }}/zones/{{ item.file }}"
    owner: root
    group: "{{ dns_bind_user }}"
    mode: '0644'
  loop: "{{ dns_reverse_zones }}"
  when: item.type == "master"
  notify: reload bind

- name: Validate zone files
  ansible.builtin.command:
    cmd: "named-checkzone {{ item.name }} {{ dns_bind_config_dir }}/zones/{{ item.file }}"
  loop: "{{ dns_zones + dns_reverse_zones }}"
  when: item.type == "master"
  changed_when: false
```

```jinja2
# roles/dns/templates/zone_forward.j2
; Zone file for {{ item.name }} - managed by Ansible
$TTL {{ item.ttl | default(3600) }}
@   IN  SOA {{ item.soa.ns }}. {{ item.soa.email }}. (
            {{ item.soa.serial }}     ; Serial
            {{ item.soa.refresh }}    ; Refresh
            {{ item.soa.retry }}      ; Retry
            {{ item.soa.expire }}     ; Expire
            {{ item.soa.minimum }} )  ; Minimum TTL

{% for record in item.records %}
{{ "%-20s" | format(record.name) }} IN  {{ record.type }}  {{ record.value }}
{% endfor %}
```

## Main Tasks and Handlers

```yaml
# roles/dns/tasks/main.yml
- name: Include client configuration
  ansible.builtin.include_tasks: client.yml
  when: dns_mode in ['client', 'both']

- name: Include server installation
  ansible.builtin.include_tasks: server_install.yml
  when: dns_mode in ['server', 'both']

- name: Include server configuration
  ansible.builtin.include_tasks: server_configure.yml
  when: dns_mode in ['server', 'both']

- name: Include zone management
  ansible.builtin.include_tasks: zones.yml
  when: dns_mode in ['server', 'both']
```

```yaml
# roles/dns/handlers/main.yml
- name: restart bind
  ansible.builtin.systemd:
    name: "{{ dns_bind_service }}"
    state: restarted

- name: reload bind
  ansible.builtin.command:
    cmd: rndc reload
  changed_when: true

- name: restart systemd-resolved
  ansible.builtin.systemd:
    name: systemd-resolved
    state: restarted
```

## Complete Usage Example

```yaml
# setup-dns.yml
# Configure DNS servers
- hosts: dns_servers
  become: yes
  roles:
    - role: dns
      vars:
        dns_mode: both
        dns_nameservers:
          - "127.0.0.1"
          - "8.8.8.8"
        dns_search_domains:
          - example.internal
        dns_bind_allow_query:
          - "localhost"
          - "10.0.0.0/8"
        dns_zones:
          - name: example.internal
            type: master
            file: db.example.internal
            ttl: 3600
            soa:
              ns: ns1.example.internal
              email: admin.example.internal
              serial: 2024010101
              refresh: 3600
              retry: 900
              expire: 604800
              minimum: 86400
            records:
              - { name: "@", type: NS, value: "ns1.example.internal." }
              - { name: "ns1", type: A, value: "10.0.0.10" }
              - { name: "web1", type: A, value: "10.0.1.10" }
              - { name: "web2", type: A, value: "10.0.1.11" }
              - { name: "db1", type: A, value: "10.0.2.10" }
              - { name: "lb", type: A, value: "10.0.0.50" }
              - { name: "grafana", type: CNAME, value: "monitoring.example.internal." }

# Configure all other servers as DNS clients
- hosts: all:!dns_servers
  become: yes
  roles:
    - role: dns
      vars:
        dns_mode: client
        dns_nameservers:
          - "10.0.0.10"
          - "8.8.8.8"
        dns_search_domains:
          - example.internal
```

This role handles both sides of DNS management. Your DNS servers get fully managed zone files with validation, and all your client machines get consistent resolver configuration. When you add a new server to your infrastructure, just add a record to the zone definition and re-run the playbook.
