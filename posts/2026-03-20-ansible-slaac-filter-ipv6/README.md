# How to Use the Ansible slaac() Filter for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, SLAAC, Jinja2, Filter, Network Automation

Description: A guide to using Ansible's slaac() Jinja2 filter to calculate SLAAC-derived IPv6 addresses from a prefix and MAC address in playbooks and templates.

The `slaac()` filter in Ansible (provided by the `ansible.utils` collection and dependent on the `netaddr` Python library) calculates the EUI-64-based IPv6 address for a given network prefix and MAC address. This is useful for pre-populating DNS records, firewall rules, or configuration files when a host uses MAC-derived SLAAC addressing.

## How SLAAC Address Generation Works

When deriving a SLAAC address from a MAC address, the `slaac()` filter uses the modified EUI-64 process to convert a 48-bit MAC address into a 64-bit interface ID. The interface ID is then appended to the /64 prefix to form the full 128-bit IPv6 address.

For example:
- Prefix: `2001:db8:1::/64`
- MAC: `52:54:00:ab:cd:ef`
- Modified EUI-64 interface ID: `5054:00ff:feab:cdef`
- SLAAC address: `2001:db8:1::5054:00ff:feab:cdef`

## Using the slaac() Filter

```yaml
# slaac-filter-example.yml

---
- name: Demonstrate the slaac() filter
  hosts: localhost
  gather_facts: false

  vars:
    # The /64 prefix advertised by the router
    ipv6_prefix: "2001:db8:1::/64"
    # The MAC address of the target host
    host_mac: "52:54:00:ab:cd:ef"

  tasks:
    - name: Calculate SLAAC address from prefix and MAC
      ansible.builtin.debug:
        msg: "SLAAC address: {{ ipv6_prefix | ansible.utils.slaac(host_mac) }}"
        # Output: 2001:db8:1::5054:ff:feab:cdef
```

## Pre-Computing SLAAC Addresses for Multiple Hosts

```yaml
# pre-compute-slaac.yml - Compute SLAAC addresses for a group of servers
---
- name: Compute SLAAC addresses for all servers
  hosts: localhost
  gather_facts: false

  vars:
    ipv6_prefix: "2001:db8:100::/64"
    servers:
      - name: web-01
        mac: "52:54:00:11:22:33"
      - name: web-02
        mac: "52:54:00:44:55:66"
      - name: db-01
        mac: "52:54:00:77:88:99"

  tasks:
    - name: Display SLAAC address for each server
      ansible.builtin.debug:
        msg: "{{ item.name }}: {{ ipv6_prefix | ansible.utils.slaac(item.mac) }}"
      loop: "{{ servers }}"
```

## Create DNS AAAA Records from SLAAC Addresses

```yaml
# slaac-dns.yml - Pre-create AAAA records using SLAAC-derived addresses
---
- name: Create AAAA records for servers using SLAAC addresses
  hosts: localhost
  gather_facts: false

  vars:
    ipv6_prefix: "2001:db8:100::/64"
    servers:
      - name: web-01
        mac: "52:54:00:11:22:33"
      - name: api-01
        mac: "52:54:00:44:55:66"

  tasks:
    - name: Create AAAA record for each server
      community.general.nsupdate:
        key_name: "update-key"
        key_secret: "{{ dns_tsig_secret }}"
        server: "ns1.example.com"
        zone: "example.com"
        record: "{{ item.name }}"
        type: AAAA
        # Calculate the SLAAC address inline
        value: "{{ ipv6_prefix | ansible.utils.slaac(item.mac) }}"
        ttl: 300
        state: present
      loop: "{{ servers }}"
```

## Generate Firewall Rules from SLAAC Addresses

```yaml
# slaac-firewall.yml - Add ip6tables rules for SLAAC-computed addresses
---
- name: Allow SSH from known SLAAC addresses
  hosts: router
  become: true

  vars:
    ipv6_prefix: "2001:db8:200::/64"
    admin_hosts:
      - mac: "aa:bb:cc:dd:ee:ff"
      - mac: "11:22:33:44:55:66"

  tasks:
    - name: Allow SSH from admin hosts (SLAAC addresses)
      ansible.builtin.iptables:
        ip_version: ipv6
        chain: INPUT
        protocol: tcp
        destination_port: "22"
        source: "{{ ipv6_prefix | ansible.utils.slaac(item.mac) }}/128"
        jump: ACCEPT
      loop: "{{ admin_hosts }}"
```

## Installing the Required Collection

```bash
# Install the ansible.utils collection for the slaac() filter
ansible-galaxy collection install ansible.utils

# Install the netaddr dependency on the Ansible control node
pip install netaddr
```

The `slaac()` filter is a powerful tool for pre-computing EUI-64-based IPv6 addresses in automation workflows, eliminating the need to manually calculate interface IDs when provisioning DNS, firewall rules, or configuration files for known hosts.
