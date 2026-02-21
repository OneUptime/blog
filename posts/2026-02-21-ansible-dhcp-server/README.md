# How to Use Ansible to Set Up a DHCP Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DHCP, Networking, Linux, Infrastructure

Description: Automate ISC DHCP server deployment with subnet configuration, static leases, and failover using Ansible playbooks for reliable network management.

---

Every network needs DHCP. Without it, you would be manually assigning IP addresses to every device that connects, which is not practical beyond a handful of machines. The ISC DHCP server is the standard implementation on Linux, and while the configuration syntax is straightforward, keeping it consistent across multiple subnets and maintaining static reservations for servers and printers can become a maintenance burden. Ansible brings order to this by letting you define your DHCP configuration as structured data.

This guide covers setting up an ISC DHCP server with Ansible, including subnet definitions, static leases, options, and failover for high availability.

## Role Defaults

```yaml
# roles/dhcp/defaults/main.yml - DHCP server configuration
dhcp_interfaces:
  - eth0

dhcp_global_options:
  domain_name: example.internal
  domain_name_servers:
    - 10.0.1.10
    - 10.0.1.11
  ntp_servers:
    - 10.0.1.10
  default_lease_time: 3600
  max_lease_time: 7200

# Subnet definitions
dhcp_subnets:
  - network: 10.0.1.0
    netmask: 255.255.255.0
    range_start: 10.0.1.100
    range_end: 10.0.1.200
    gateway: 10.0.1.1
    dns_servers:
      - 10.0.1.10
      - 10.0.1.11
    domain: example.internal

  - network: 10.0.2.0
    netmask: 255.255.255.0
    range_start: 10.0.2.100
    range_end: 10.0.2.200
    gateway: 10.0.2.1
    dns_servers:
      - 10.0.1.10
    domain: dev.example.internal

# Static lease reservations (for servers, printers, etc)
dhcp_reservations:
  - hostname: web-server
    mac: "00:11:22:33:44:55"
    ip: 10.0.1.30
  - hostname: db-server
    mac: "00:11:22:33:44:66"
    ip: 10.0.1.40
  - hostname: printer-floor2
    mac: "00:11:22:33:44:77"
    ip: 10.0.1.250

# Failover configuration (optional)
dhcp_failover_enabled: false
dhcp_failover_role: primary
dhcp_failover_peer_address: 10.0.1.12
dhcp_failover_local_address: 10.0.1.11
```

## Main Tasks

```yaml
# roles/dhcp/tasks/main.yml - Install and configure ISC DHCP server
---
- name: Install ISC DHCP server
  apt:
    name: isc-dhcp-server
    state: present
    update_cache: yes

- name: Configure DHCP server interfaces
  template:
    src: isc-dhcp-server.j2
    dest: /etc/default/isc-dhcp-server
    owner: root
    group: root
    mode: '0644'
  notify: restart dhcpd

- name: Deploy DHCP server configuration
  template:
    src: dhcpd.conf.j2
    dest: /etc/dhcp/dhcpd.conf
    owner: root
    group: root
    mode: '0644'
    validate: "dhcpd -t -cf %s"
  notify: restart dhcpd

- name: Ensure DHCP server is started and enabled
  systemd:
    name: isc-dhcp-server
    state: started
    enabled: yes

- name: Allow DHCP through firewall
  ufw:
    rule: allow
    port: "67"
    proto: udp
```

## Interface Configuration Template

```
# roles/dhcp/templates/isc-dhcp-server.j2 - Listen interfaces
INTERFACESv4="{{ dhcp_interfaces | join(' ') }}"
INTERFACESv6=""
```

## DHCP Configuration Template

```
# roles/dhcp/templates/dhcpd.conf.j2 - Main DHCP configuration
# Global options
option domain-name "{{ dhcp_global_options.domain_name }}";
option domain-name-servers {{ dhcp_global_options.domain_name_servers | join(', ') }};
{% if dhcp_global_options.ntp_servers is defined %}
option ntp-servers {{ dhcp_global_options.ntp_servers | join(', ') }};
{% endif %}

default-lease-time {{ dhcp_global_options.default_lease_time }};
max-lease-time {{ dhcp_global_options.max_lease_time }};

# Use authoritative mode to NAK requests for unknown subnets
authoritative;

# Logging
log-facility local7;

{% if dhcp_failover_enabled %}
# Failover configuration for high availability
failover peer "dhcp-failover" {
{% if dhcp_failover_role == 'primary' %}
    primary;
    mclt 3600;
    split 128;
{% else %}
    secondary;
{% endif %}
    address {{ dhcp_failover_local_address }};
    port 647;
    peer address {{ dhcp_failover_peer_address }};
    peer port 647;
    max-response-delay 60;
    max-unacked-updates 10;
    load balance max seconds 3;
}
{% endif %}

# Subnet definitions
{% for subnet in dhcp_subnets %}
subnet {{ subnet.network }} netmask {{ subnet.netmask }} {
    range {{ subnet.range_start }} {{ subnet.range_end }};
    option routers {{ subnet.gateway }};
    option domain-name-servers {{ subnet.dns_servers | join(', ') }};
    option domain-name "{{ subnet.domain }}";
{% if dhcp_failover_enabled %}
    pool {
        failover peer "dhcp-failover";
        range {{ subnet.range_start }} {{ subnet.range_end }};
    }
{% endif %}
}

{% endfor %}

# Static lease reservations
{% for host in dhcp_reservations %}
host {{ host.hostname }} {
    hardware ethernet {{ host.mac }};
    fixed-address {{ host.ip }};
}

{% endfor %}
```

## Handlers

```yaml
# roles/dhcp/handlers/main.yml - Service handlers
---
- name: restart dhcpd
  systemd:
    name: isc-dhcp-server
    state: restarted
```

## Main Playbook

```yaml
# playbook.yml - Deploy DHCP server
---
- hosts: dhcp_servers
  become: yes
  roles:
    - dhcp
```

## Running and Testing

```bash
# Deploy the DHCP server
ansible-playbook -i inventory/hosts.ini playbook.yml

# Check lease database on the server
cat /var/lib/dhcp/dhcpd.leases

# Check DHCP server status
systemctl status isc-dhcp-server

# Test from a client (run on a machine in the subnet)
sudo dhclient -v eth0
```

## Monitoring Leases

Add a task to set up lease monitoring:

```yaml
# Task to deploy a lease monitoring script
- name: Deploy DHCP lease monitoring script
  copy:
    content: |
      #!/bin/bash
      # Count active DHCP leases by subnet
      echo "=== DHCP Lease Summary ==="
      echo "Active leases: $(grep -c 'binding state active' /var/lib/dhcp/dhcpd.leases)"
      echo "Free leases: $(grep -c 'binding state free' /var/lib/dhcp/dhcpd.leases)"
      echo ""
      echo "=== Recent Leases ==="
      grep -A 5 'binding state active' /var/lib/dhcp/dhcpd.leases | tail -30
    dest: /usr/local/bin/dhcp-lease-report.sh
    mode: '0755'
```

## Summary

Managing DHCP with Ansible means your network's IP allocation is defined in version-controlled YAML files rather than scattered across config files on servers. Adding new subnets, modifying address ranges, or creating static reservations is a matter of updating variables and running the playbook. The built-in configuration validation catches syntax errors before they reach the server, and the failover support ensures your DHCP service stays available even if one server goes down.
