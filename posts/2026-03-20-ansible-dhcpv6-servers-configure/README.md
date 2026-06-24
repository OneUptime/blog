# How to Configure DHCPv6 Servers with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DHCPv6, IPv6, Linux, Network Services, Automation

Description: A guide to deploying and configuring ISC DHCPv6 servers on Linux using Ansible playbooks and templates.

DHCPv6 provides stateful IPv6 address assignment and DNS configuration to clients, complementing SLAAC for networks that require centralized address tracking. This guide uses Ansible to deploy and configure ISC DHCP for DHCPv6 on Debian- and Red Hat-family Linux hosts.

## Playbook Structure

```text
dhcpv6_role/
├── tasks/
│   └── main.yml
├── templates/
│   └── dhcpd6.conf.j2
├── handlers/
│   └── main.yml
└── defaults/
    └── main.yml
```

## Default Variables

```yaml
# defaults/main.yml

---
dhcpv6_interface: "eth0"
dhcpv6_subnet: "2001:db8:1::/64"
dhcpv6_range_start: "2001:db8:1::100"
dhcpv6_range_end: "2001:db8:1::200"
dhcpv6_dns_servers:
  - "2001:4860:4860::8888"
  - "2001:4860:4860::8844"
dhcpv6_domain_search: "example.com"
dhcpv6_preferred_lifetime: 3600
dhcpv6_valid_lifetime: 7200
```

## Main Tasks

```yaml
# tasks/main.yml
---
- name: Install ISC DHCP server
  ansible.builtin.package:
    name: "{{ 'isc-dhcp-server' if ansible_os_family == 'Debian' else 'dhcp-server' }}"
    state: present

- name: Configure DHCPv6 listening interface on Debian
  ansible.builtin.lineinfile:
    path: /etc/default/isc-dhcp-server
    regexp: '^INTERFACESv6='
    line: "INTERFACESv6=\"{{ dhcpv6_interface }}\""
  when: ansible_os_family == 'Debian'
  notify: Restart DHCPv6

- name: Configure DHCPv6 listening interface on Red Hat
  ansible.builtin.lineinfile:
    path: /etc/sysconfig/dhcpd6
    regexp: '^DHCPDARGS='
    line: "DHCPDARGS=\"{{ dhcpv6_interface }}\""
    create: true
  when: ansible_os_family == 'RedHat'
  notify: Restart DHCPv6

- name: Write DHCPv6 configuration file
  ansible.builtin.template:
    src: dhcpd6.conf.j2
    dest: /etc/dhcp/dhcpd6.conf
    owner: root
    group: root
    mode: "0644"
    validate: "dhcpd -6 -t -cf %s"  # Validate config before writing
  notify: Restart DHCPv6

- name: Enable and start DHCPv6 service
  ansible.builtin.systemd_service:
    name: "{{ 'isc-dhcp-server' if ansible_os_family == 'Debian' else 'dhcpd6' }}"
    state: started
    enabled: true
```

## DHCPv6 Configuration Template

```text
# templates/dhcpd6.conf.j2 - ISC DHCPv6 server configuration
# Managed by Ansible - do not edit manually

default-lease-time {{ dhcpv6_valid_lifetime }};
preferred-lifetime {{ dhcpv6_preferred_lifetime }};
max-lease-time {{ dhcpv6_valid_lifetime }};

# DNS options sent to clients
option dhcp6.name-servers {{ dhcpv6_dns_servers | join(', ') }};
option dhcp6.domain-search "{{ dhcpv6_domain_search }}";

# Subnet declaration for the DHCPv6 scope
subnet6 {{ dhcpv6_subnet }} {
    # Address range for dynamic allocation
    range6 {{ dhcpv6_range_start }} {{ dhcpv6_range_end }};
}

{% for host in dhcpv6_static_hosts | default([]) %}
# Static assignment for {{ host.name }}
host {{ host.name }} {
    host-identifier option dhcp6.client-id {{ host.duid }};
    fixed-address6 {{ host.ipv6_address }};
}
{% endfor %}
```

## Handler

```yaml
# handlers/main.yml
---
- name: Restart DHCPv6
  ansible.builtin.systemd_service:
    name: "{{ 'isc-dhcp-server' if ansible_os_family == 'Debian' else 'dhcpd6' }}"
    state: restarted
```

## Site Playbook

```yaml
# site.yml
---
- name: Deploy DHCPv6 servers
  hosts: dhcp_servers
  become: true
  vars:
    dhcpv6_subnet: "2001:db8:100::/64"
    dhcpv6_range_start: "2001:db8:100::100"
    dhcpv6_range_end: "2001:db8:100::900"
    dhcpv6_static_hosts:
      - name: "print-server"
        duid: "00:03:00:01:aa:bb:cc:dd:ee:ff"
        ipv6_address: "2001:db8:100::10"
  roles:
    - dhcpv6_role
```

## Run and Verify

```bash
ansible-playbook site.yml -i inventory.ini

# Verify the DHCPv6 service is active
ansible dhcp_servers -m ansible.builtin.shell -a "systemctl is-active isc-dhcp-server || systemctl is-active dhcpd6" --become

# Check DHCPv6 leases
ansible dhcp_servers -m ansible.builtin.shell -a "cat /var/lib/dhcp/dhcpd6.leases 2>/dev/null || cat /var/lib/dhcpd/dhcpd6.leases" --become
```

Ansible ensures DHCPv6 server configuration is consistent, validated before deployment, and easily updated across multiple DHCP servers with a single playbook run.
