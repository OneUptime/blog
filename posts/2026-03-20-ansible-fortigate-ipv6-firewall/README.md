# How to Configure FortiGate IPv6 Firewall Addresses with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, FortiGate, IPv6, Firewall, Network Security, Fortios

Description: A guide to creating and managing FortiGate IPv6 firewall address objects and policies using the Ansible fortios collection.

FortiGate firewalls support IPv6 through dedicated address objects and firewall policies. The `fortinet.fortios` Ansible collection provides modules to manage these objects programmatically, enabling consistent IPv6 security policy automation.

## Prerequisites

```bash
# Requires Ansible 2.15 or newer
# Install the FortiOS Ansible collection

ansible-galaxy collection install fortinet.fortios
```

## Step 1: Inventory Configuration

```ini
# inventory.ini
[fortigates]
fg-01 ansible_host=192.168.1.99

[fortigates:vars]
ansible_connection=ansible.netcommon.httpapi
ansible_network_os=fortinet.fortios.fortios
ansible_httpapi_use_ssl=yes
ansible_httpapi_validate_certs=no
ansible_httpapi_port=443
ansible_user=admin
ansible_password={{ vault_fortigate_password }}
vdom=root
```

## Step 2: Create IPv6 Address Objects

Address objects are building blocks for firewall policies. Create them before referencing them in policies:

```yaml
# create-ipv6-addresses.yml - Create FortiGate IPv6 address objects
---
- name: Configure FortiGate IPv6 address objects
  hosts: fortigates
  gather_facts: false

  vars:
    vdom: "root"
    ipv6_address_objects:
      - name: "MGMT-IPv6-Range"
        ip6: "2001:db8:100::/48"
        comment: "Management IPv6 prefix"
      - name: "WEB-SERVER-IPv6"
        ip6: "2001:db8:200::10/128"
        comment: "Production web server IPv6 address"
      - name: "DNS-SERVERS-IPv6"
        ip6: "2001:db8:53::53/128"
        comment: "Example DNS server IPv6 address"

  tasks:
    - name: Create IPv6 firewall address objects
      fortinet.fortios.fortios_firewall_address6:
        vdom: "{{ vdom }}"
        state: present
        firewall_address6:
          name: "{{ item.name }}"
          # IPv6 subnet type
          type: ipprefix
          # The IPv6 address/prefix
          ip6: "{{ item.ip6 }}"
          comment: "{{ item.comment }}"
      loop: "{{ ipv6_address_objects }}"
```

## Step 3: Create IPv6 Address Groups

```yaml
# create-ipv6-groups.yml - Create FortiGate IPv6 address group
---
- name: Configure FortiGate IPv6 address group
  hosts: fortigates
  gather_facts: false

  tasks:
    - name: Create IPv6 address group for web servers
      fortinet.fortios.fortios_firewall_addrgrp6:
        vdom: "{{ vdom }}"
        state: present
        firewall_addrgrp6:
          name: "WEB-SERVERS-IPv6-GROUP"
          comment: "Group of all web server IPv6 addresses"
          member:
            - name: "WEB-SERVER-IPv6"
```

## Step 4: Create IPv6 Firewall Policies

```yaml
# create-ipv6-policies.yml - Create FortiGate IPv6 firewall policies
---
- name: Configure FortiGate IPv6 firewall policies
  hosts: fortigates
  gather_facts: false

  tasks:
    - name: Allow HTTP/HTTPS to web servers from internet (IPv6)
      fortinet.fortios.fortios_firewall_policy6:
        vdom: "{{ vdom }}"
        state: present
        firewall_policy6:
          name: "Allow-Web-IPv6-Inbound"
          # Source interface (internet-facing)
          srcintf:
            - name: "wan1"
          # Destination interface (DMZ)
          dstintf:
            - name: "dmz"
          # Allow from all IPv6 internet addresses
          srcaddr:
            - name: "all"
          # Target web servers
          dstaddr:
            - name: "WEB-SERVERS-IPv6-GROUP"
          action: accept
          schedule: "always"
          service:
            - name: "HTTP"
            - name: "HTTPS"
          # Log all allowed connections
          logtraffic: all
          comments: "Allow IPv6 web traffic to DMZ"

    - name: Allow SSH from management IPv6 range
      fortinet.fortios.fortios_firewall_policy6:
        vdom: "{{ vdom }}"
        state: present
        firewall_policy6:
          name: "Allow-SSH-Mgmt-IPv6"
          srcintf:
            - name: "mgmt"
          dstintf:
            - name: "internal"
          srcaddr:
            - name: "MGMT-IPv6-Range"
          dstaddr:
            - name: "all"
          action: accept
          schedule: "always"
          service:
            - name: "SSH"
          logtraffic: utm
```

## Step 5: Verify Configuration

```yaml
# verify-ipv6-fortigate.yml - Read back FortiGate IPv6 objects
---
- name: Verify FortiGate IPv6 objects
  hosts: fortigates
  gather_facts: false

  tasks:
    - name: Read back IPv6 address object
      fortinet.fortios.fortios_configuration_fact:
        vdom: "{{ vdom }}"
        selector: "firewall_address6"
        params:
          name: "WEB-SERVER-IPv6"
      register: addr_result

    - name: Display address object
      ansible.builtin.debug:
        var: addr_result.results
```

## Run the Playbook

```bash
# Deploy IPv6 address objects and policies
ansible-playbook create-ipv6-addresses.yml -i inventory.ini
ansible-playbook create-ipv6-groups.yml -i inventory.ini
ansible-playbook create-ipv6-policies.yml -i inventory.ini

# Verify
ansible-playbook verify-ipv6-fortigate.yml -i inventory.ini
```

Automating FortiGate IPv6 policy management with Ansible reduces configuration errors, enables policy-as-code workflows, and ensures IPv6 firewall rules are consistently applied across all FortiGate devices in your environment.
