# How to Use Ansible to Set Up a DNS Server (BIND)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DNS, BIND, Networking, Linux

Description: Deploy and configure a BIND9 DNS server with zones, records, and security using Ansible for consistent and repeatable DNS infrastructure.

---

DNS is the backbone of virtually every networked application. Whether you are running an internal network with private domains or hosting public-facing zones, having your own DNS server gives you full control over resolution, caching, and record management. BIND (Berkeley Internet Name Domain) is the most widely deployed DNS server software, and automating its setup with Ansible eliminates the tedious and error-prone process of manually editing zone files and configuration.

This guide walks through deploying a BIND9 DNS server with Ansible, complete with forward and reverse zones, security hardening, and automated zone management.

## Prerequisites

You need Ansible 2.12+ and a target Ubuntu 22.04 server. If you are running a public-facing DNS server, ensure that port 53 (TCP and UDP) is open in your firewall.

## Role Defaults

```yaml
# roles/bind/defaults/main.yml - BIND DNS server configuration
bind_listen_address: any
bind_listen_port: 53
bind_allow_recursion:
  - 10.0.0.0/8
  - 172.16.0.0/12
  - 192.168.0.0/16
  - localhost

# Enable DNSSEC validation
bind_dnssec_validation: auto

# Forwarders for recursive queries
bind_forwarders:
  - 8.8.8.8
  - 8.8.4.4

# DNS zones to manage
bind_zones:
  - name: example.internal
    type: master
    file: db.example.internal
    records:
      - { name: "@", type: "A", value: "10.0.1.10" }
      - { name: "@", type: "MX", value: "10 mail.example.internal." }
      - { name: "ns1", type: "A", value: "10.0.1.10" }
      - { name: "ns2", type: "A", value: "10.0.1.11" }
      - { name: "mail", type: "A", value: "10.0.1.20" }
      - { name: "www", type: "CNAME", value: "web.example.internal." }
      - { name: "web", type: "A", value: "10.0.1.30" }
      - { name: "db", type: "A", value: "10.0.1.40" }
      - { name: "app", type: "A", value: "10.0.1.50" }

  - name: 1.0.10.in-addr.arpa
    type: master
    file: db.10.0.1
    records:
      - { name: "10", type: "PTR", value: "ns1.example.internal." }
      - { name: "11", type: "PTR", value: "ns2.example.internal." }
      - { name: "20", type: "PTR", value: "mail.example.internal." }
      - { name: "30", type: "PTR", value: "web.example.internal." }
      - { name: "40", type: "PTR", value: "db.example.internal." }
```

## Main Tasks

```yaml
# roles/bind/tasks/main.yml - Install and configure BIND9
---
- name: Install BIND9 and utilities
  apt:
    name:
      - bind9
      - bind9utils
      - bind9-doc
      - dnsutils
    state: present
    update_cache: yes

- name: Configure BIND options
  template:
    src: named.conf.options.j2
    dest: /etc/bind/named.conf.options
    owner: root
    group: bind
    mode: '0644'
    validate: "named-checkconf %s"
  notify: restart bind

- name: Configure BIND local zones
  template:
    src: named.conf.local.j2
    dest: /etc/bind/named.conf.local
    owner: root
    group: bind
    mode: '0644'
  notify: restart bind

- name: Deploy zone files
  template:
    src: zone.db.j2
    dest: "/etc/bind/zones/{{ item.file }}"
    owner: root
    group: bind
    mode: '0644'
  loop: "{{ bind_zones }}"
  loop_control:
    label: "{{ item.name }}"
  notify: reload bind

- name: Create zones directory
  file:
    path: /etc/bind/zones
    state: directory
    owner: root
    group: bind
    mode: '0755'

- name: Validate zone files
  command: "named-checkzone {{ item.name }} /etc/bind/zones/{{ item.file }}"
  loop: "{{ bind_zones }}"
  loop_control:
    label: "{{ item.name }}"
  changed_when: false

- name: Ensure BIND is started and enabled
  systemd:
    name: bind9
    state: started
    enabled: yes

- name: Configure firewall for DNS
  ufw:
    rule: allow
    port: "53"
    proto: "{{ item }}"
  loop:
    - tcp
    - udp
```

## BIND Options Template

```
# roles/bind/templates/named.conf.options.j2 - BIND9 options configuration
options {
    directory "/var/cache/bind";

    // Listen on specified addresses
    listen-on port {{ bind_listen_port }} { {{ bind_listen_address }}; };
    listen-on-v6 { any; };

    // Allow recursive queries only from trusted networks
    allow-recursion {
{% for network in bind_allow_recursion %}
        {{ network }};
{% endfor %}
    };

    // Forward unresolved queries to upstream DNS
    forwarders {
{% for forwarder in bind_forwarders %}
        {{ forwarder }};
{% endfor %}
    };

    // DNSSEC configuration
    dnssec-validation {{ bind_dnssec_validation }};

    // Security: hide version string
    version "not disclosed";

    // Security: restrict zone transfers
    allow-transfer { none; };

    // Performance tuning
    max-cache-size 256M;
    max-cache-ttl 86400;
    max-ncache-ttl 3600;
};

// Logging configuration
logging {
    channel default_log {
        file "/var/log/named/default.log" versions 3 size 5m;
        severity info;
        print-time yes;
        print-severity yes;
        print-category yes;
    };

    category default { default_log; };
    category queries { default_log; };
};
```

## Local Zones Configuration Template

```
# roles/bind/templates/named.conf.local.j2 - Zone declarations
{% for zone in bind_zones %}
zone "{{ zone.name }}" {
    type {{ zone.type }};
    file "/etc/bind/zones/{{ zone.file }}";
{% if zone.type == 'slave' %}
    masters { {{ zone.masters | join('; ') }}; };
{% endif %}
};

{% endfor %}
```

## Zone File Template

```
; roles/bind/templates/zone.db.j2 - Zone file for {{ item.name }}
$TTL    86400
@       IN      SOA     ns1.{{ bind_zones[0].name }}. admin.{{ bind_zones[0].name }}. (
                        {{ ansible_date_time.epoch }}  ; Serial (epoch timestamp)
                        3600        ; Refresh
                        1800        ; Retry
                        604800      ; Expire
                        86400 )     ; Minimum TTL

; Name servers
        IN      NS      ns1.{{ bind_zones[0].name }}.
        IN      NS      ns2.{{ bind_zones[0].name }}.

; Resource records
{% for record in item.records %}
{{ record.name }}    IN    {{ record.type }}    {{ record.value }}
{% endfor %}
```

## Handlers

```yaml
# roles/bind/handlers/main.yml - BIND service handlers
---
- name: restart bind
  systemd:
    name: bind9
    state: restarted

- name: reload bind
  command: rndc reload
```

## Main Playbook

```yaml
# playbook.yml - Deploy BIND DNS server
---
- hosts: dns
  become: yes
  roles:
    - bind
```

## Running the Playbook

```bash
# Deploy the DNS server
ansible-playbook -i inventory/hosts.ini playbook.yml

# Verify DNS resolution is working
dig @10.0.1.10 web.example.internal
dig @10.0.1.10 -x 10.0.1.30
```

## Adding a Secondary DNS Server

For redundancy, add a slave zone configuration:

```yaml
# Additional inventory for secondary DNS
bind_zones:
  - name: example.internal
    type: slave
    file: db.example.internal
    masters:
      - 10.0.1.10
```

## Testing

```bash
# Query forward lookup
dig @localhost web.example.internal +short
# Expected: 10.0.1.30

# Query reverse lookup
dig @localhost -x 10.0.1.30 +short
# Expected: web.example.internal.

# Check zone transfer restriction
dig @localhost example.internal AXFR
# Expected: Transfer failed (this is correct behavior)
```

## Summary

With Ansible managing your BIND DNS infrastructure, adding zones and records becomes a matter of updating YAML variables rather than manually editing zone files and remembering to increment serial numbers. The template automatically generates serial numbers from the epoch timestamp, zone validation runs before any reload, and the same playbook works for both primary and secondary DNS servers. This approach scales well whether you are managing a single internal zone or dozens of production domains.
