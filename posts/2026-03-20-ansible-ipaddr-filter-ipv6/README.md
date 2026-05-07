# How to Use the Ansible ipaddr Filter for IPv6 Address Manipulation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, IPAddr, Jinja2, Filter, Network Automation

Description: A practical guide to using Ansible's ipaddr() Jinja2 filter to validate, parse, and manipulate IPv6 addresses and subnets in playbooks.

The `ipaddr()` filter family (from `ansible.utils`) provides a powerful set of operations for working with IP addresses in Ansible. It can validate, convert, extract, and calculate IPv6 address properties directly within Jinja2 expressions, while related filters such as `ipv6()`, `ipwrap()`, and `ipv6form()` help with IPv6-specific filtering and formatting.

## Installing the Collection

```bash
ansible-galaxy collection install ansible.utils
pip install netaddr
```

## Basic IPv6 Validation

```yaml
# ipaddr-basics.yml

---
- name: Demonstrate ipaddr() filter basics for IPv6
  hosts: localhost
  gather_facts: false

  vars:
    valid_ipv6: "2001:db8::1"
    invalid_string: "not-an-ip"
    ipv6_cidr: "2001:db8::/32"

  tasks:
    - name: Validate an IPv6 address
      ansible.builtin.debug:
        # Returns the address if valid, False if not
        msg: "Validation result: {{ valid_ipv6 | ansible.utils.ipaddr }}"

    - name: Check if a string is an IPv6 address specifically
      ansible.builtin.debug:
        # Returns the address if it's IPv6, False otherwise
        msg: "IPv6 filter result: {{ valid_ipv6 | ansible.utils.ipv6 }}"

    - name: Filter a list to only IPv6 addresses
      ansible.builtin.debug:
        msg: "{{ ['10.0.0.1', '2001:db8::1', 'not-ip', '::1'] | ansible.utils.ipv6 }}"
        # Output: ['2001:db8::1', '::1']
```

## Extracting Address Components

```yaml
# ipaddr-extract.yml - Extract prefix, host, and network info
---
- name: Extract IPv6 prefix, host, and network info
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Get the network address from a CIDR
      ansible.builtin.debug:
        # Returns: 2001:db8::
        msg: "{{ '2001:db8::100/64' | ansible.utils.ipaddr('network') }}"

    - name: Get the prefix length
      ansible.builtin.debug:
        # Returns: 64
        msg: "{{ '2001:db8::100/64' | ansible.utils.ipaddr('prefix') }}"

    - name: Get the host address (without mask)
      ansible.builtin.debug:
        # Returns: 2001:db8::100
        msg: "{{ '2001:db8::100/64' | ansible.utils.ipaddr('address') }}"

    - name: Get the first usable address in a subnet
      ansible.builtin.debug:
        # Returns: 2001:db8::1/64
        msg: "{{ '2001:db8::/64' | ansible.utils.ipaddr('1') }}"

    - name: Get the last usable address
      ansible.builtin.debug:
        msg: "{{ '2001:db8::/64' | ansible.utils.ipaddr('-1') }}"
```

## Subnet Calculations

```yaml
# ipaddr-subnets.yml - Calculate subnets and check membership
---
- name: Calculate IPv6 subnets and format addresses
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Check if an address is within a subnet
      ansible.builtin.debug:
        # Returns the address if it's in the subnet, False otherwise
        msg: "{{ '2001:db8::50' | ansible.utils.ipaddr('2001:db8::/64') }}"

    - name: Expand a compressed IPv6 address
      ansible.builtin.debug:
        # Returns the expanded form: 2001:0db8:0000:0000:0000:0000:0000:0001
        msg: "{{ '2001:db8::1' | ansible.utils.ipv6form('expand') }}"

    - name: Compress an IPv6 address
      ansible.builtin.debug:
        msg: "{{ '2001:0db8:0000:0000:0000:0000:0000:0001' | ansible.utils.ipv6form('compress') }}"
```

## Real-World Use: Building Configuration from IPv6 Variables

```yaml
# ipaddr-real-world.yml - Build nginx config with IPv6 listen directives
---
- name: Build nginx listen configuration for dual-stack
  hosts: web_servers
  vars:
    listen_addresses:
      - "0.0.0.0"
      - "::"

  tasks:
    - name: Generate nginx listen lines
      ansible.builtin.set_fact:
        nginx_listen_lines: >-
          {{
            listen_addresses
            | map('ansible.utils.ipwrap')
            | map('regex_replace', '^(.+)$', 'listen \1:80;')
            | list
          }}
      # Result: ['listen 0.0.0.0:80;', 'listen [::]:80;']

    - name: Show generated listen lines
      ansible.builtin.debug:
        var: nginx_listen_lines
```

## Using ipwrap for IPv6 in URLs

```yaml
- name: Wrap IPv6 addresses for URL usage
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Wrap IPv6 addresses in brackets for URL use
      ansible.builtin.debug:
        # Returns: [2001:db8::1]
        msg: "{{ '2001:db8::1' | ansible.utils.ipwrap }}"

    - name: Build a URL for an IPv6 endpoint
      ansible.builtin.debug:
        msg: "http://{{ '2001:db8::1' | ansible.utils.ipwrap }}:8080/api"
        # Result: http://[2001:db8::1]:8080/api
```

The `ipaddr()` filter family transforms IPv6 address handling from error-prone string manipulation into expressive, readable Jinja2 expressions that work reliably across all Ansible playbooks and templates.
