# How to Use Ansible Facts to Get Network Interface Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Networking, Facts, Infrastructure Automation

Description: Learn how to use Ansible facts to discover network interfaces, IP addresses, MAC addresses, and routing information on managed hosts.

---

Network configuration is one of the trickiest parts of infrastructure automation. Different hosts have different interface names, IP addresses, VLANs, and bonding setups. Ansible facts collect all this network information automatically, so your playbooks can adapt to whatever network topology they encounter.

## Network Facts Overview

Ansible gathers a comprehensive set of network facts. The key ones are:

- `ansible_facts['interfaces']` - list of all interface names
- `ansible_facts['default_ipv4']` - default IPv4 route information
- `ansible_facts['default_ipv6']` - default IPv6 route information
- `ansible_facts['all_ipv4_addresses']` - list of all IPv4 addresses
- `ansible_facts['all_ipv6_addresses']` - list of all IPv6 addresses
- `ansible_facts['dns']` - DNS configuration

Each interface also gets its own fact entry accessible through `ansible_facts['<interface_name>']`.

```yaml
# show-network-facts.yml
# Displays all major network-related facts
---
- name: Display network facts
  hosts: all
  gather_facts: yes
  tasks:
    - name: Show network interfaces
      ansible.builtin.debug:
        msg:
          - "Interfaces: {{ ansible_facts['interfaces'] }}"
          - "All IPv4 addresses: {{ ansible_facts['all_ipv4_addresses'] }}"
          - "Default IPv4 address: {{ ansible_facts['default_ipv4']['address'] }}"
          - "Default IPv4 gateway: {{ ansible_facts['default_ipv4']['gateway'] }}"
          - "Default interface: {{ ansible_facts['default_ipv4']['interface'] }}"
          - "DNS nameservers: {{ ansible_facts['dns']['nameservers'] }}"
```

## Getting Detailed Interface Information

Each network interface has its own sub-dictionary with extensive information.

```yaml
# interface-details.yml
# Shows detailed information for each network interface
---
- name: Show interface details
  hosts: all
  gather_facts: yes
  tasks:
    - name: Display details for each interface
      ansible.builtin.debug:
        msg:
          - "Interface: {{ item }}"
          - "  IPv4: {{ ansible_facts[item]['ipv4']['address'] | default('none') }}"
          - "  Netmask: {{ ansible_facts[item]['ipv4']['netmask'] | default('none') }}"
          - "  MAC: {{ ansible_facts[item]['macaddress'] | default('none') }}"
          - "  MTU: {{ ansible_facts[item]['mtu'] | default('none') }}"
          - "  Active: {{ ansible_facts[item]['active'] | default('unknown') }}"
          - "  Type: {{ ansible_facts[item]['type'] | default('unknown') }}"
      loop: "{{ ansible_facts['interfaces'] }}"
      when: item != 'lo'
```

Note that some interfaces (like loopback) may not have all attributes. The `default()` filter prevents errors when a field is missing.

## Finding the Primary IP Address

The default IPv4 address is the one associated with the default route. This is usually what you want for service configuration.

```yaml
# primary-ip.yml
# Gets the primary IP address and related network details
---
- name: Get primary network information
  hosts: all
  gather_facts: yes
  tasks:
    - name: Show primary network details
      ansible.builtin.debug:
        msg:
          - "Primary IP: {{ ansible_facts['default_ipv4']['address'] }}"
          - "Primary interface: {{ ansible_facts['default_ipv4']['interface'] }}"
          - "Gateway: {{ ansible_facts['default_ipv4']['gateway'] }}"
          - "Network: {{ ansible_facts['default_ipv4']['network'] }}"
          - "Netmask: {{ ansible_facts['default_ipv4']['netmask'] }}"
          - "MAC address: {{ ansible_facts['default_ipv4']['macaddress'] }}"
          - "Broadcast: {{ ansible_facts['default_ipv4']['broadcast'] | default('N/A') }}"
```

## Listing All IP Addresses

Hosts often have multiple IPs across different interfaces. Here is how to get a complete picture.

```yaml
# all-ips.yml
# Collects all IP addresses across all interfaces
---
- name: List all IP addresses
  hosts: all
  gather_facts: yes
  tasks:
    - name: All IPv4 addresses
      ansible.builtin.debug:
        msg: "IPv4 addresses: {{ ansible_facts['all_ipv4_addresses'] }}"

    - name: All IPv6 addresses
      ansible.builtin.debug:
        msg: "IPv6 addresses: {{ ansible_facts['all_ipv6_addresses'] }}"

    - name: Build detailed IP list with interface names
      ansible.builtin.set_fact:
        ip_list: >-
          {{
            ansible_facts['interfaces']
            | map('extract', ansible_facts)
            | selectattr('ipv4', 'defined')
            | map(attribute='ipv4')
            | map(attribute='address')
            | list
          }}

    - name: Show detailed IP list
      ansible.builtin.debug:
        var: ip_list
```

## Using Network Facts in Templates

A common use case is generating configuration files that reference the host's network setup.

```yaml
# configure-app-networking.yml
# Generates application config using network facts
---
- name: Configure application networking
  hosts: appservers
  gather_facts: yes
  become: yes
  tasks:
    - name: Generate application network config
      ansible.builtin.template:
        src: app-network.conf.j2
        dest: /etc/myapp/network.conf
        mode: '0644'
```

```jinja2
{# templates/app-network.conf.j2 #}
{# Application network configuration from Ansible facts #}

# Bind address - use the primary interface
bind_address = {{ ansible_facts['default_ipv4']['address'] }}
bind_port = 8080

# Advertise address for cluster communication
advertise_address = {{ ansible_facts['default_ipv4']['address'] }}

# DNS servers from system configuration
{% for ns in ansible_facts['dns']['nameservers'] %}
dns_server_{{ loop.index }} = {{ ns }}
{% endfor %}

# Network interfaces available on this host
{% for iface in ansible_facts['interfaces'] if iface != 'lo' %}
# {{ iface }}: {{ ansible_facts[iface].get('ipv4', {}).get('address', 'no ipv4') | default('no ipv4') }}
{% endfor %}
```

## Filtering by Interface Type

You can identify specific interface types to handle bond, bridge, VLAN, and physical interfaces differently.

```yaml
# filter-interfaces.yml
# Categorizes interfaces by type using facts
---
- name: Categorize network interfaces
  hosts: all
  gather_facts: yes
  tasks:
    - name: Find physical interfaces
      ansible.builtin.set_fact:
        physical_interfaces: >-
          {{
            ansible_facts['interfaces']
            | select('match', '^(eth|ens|enp|eno)')
            | list
          }}

    - name: Find bond interfaces
      ansible.builtin.set_fact:
        bond_interfaces: >-
          {{
            ansible_facts['interfaces']
            | select('match', '^bond')
            | list
          }}

    - name: Find bridge interfaces
      ansible.builtin.set_fact:
        bridge_interfaces: >-
          {{
            ansible_facts['interfaces']
            | select('match', '^(br|virbr|docker)')
            | list
          }}

    - name: Find VLAN interfaces
      ansible.builtin.set_fact:
        vlan_interfaces: >-
          {{
            ansible_facts['interfaces']
            | select('match', '.*\\.\\d+$')
            | list
          }}

    - name: Display interface categories
      ansible.builtin.debug:
        msg:
          - "Physical: {{ physical_interfaces }}"
          - "Bonds: {{ bond_interfaces }}"
          - "Bridges: {{ bridge_interfaces }}"
          - "VLANs: {{ vlan_interfaces }}"
```

## Building Firewall Rules from Network Facts

Network facts can drive firewall configuration. Here is an example that builds iptables rules based on discovered interfaces.

```yaml
# firewall-from-facts.yml
# Generates firewall rules based on network interface facts
---
- name: Configure firewall based on network facts
  hosts: all
  become: yes
  gather_facts: yes
  tasks:
    - name: Allow traffic on all active interfaces
      ansible.builtin.iptables:
        chain: INPUT
        in_interface: "{{ item }}"
        jump: ACCEPT
        comment: "Allow all traffic on {{ item }}"
      loop: "{{ ansible_facts['interfaces'] | select('match', '^(lo|docker|br-)') | list }}"

    - name: Allow established connections on external interfaces
      ansible.builtin.iptables:
        chain: INPUT
        in_interface: "{{ ansible_facts['default_ipv4']['interface'] }}"
        ctstate:
          - ESTABLISHED
          - RELATED
        jump: ACCEPT
        comment: "Allow established connections"
```

## Generating /etc/hosts from Network Facts

In environments without DNS, you can generate `/etc/hosts` entries from network facts gathered across all hosts.

```yaml
# generate-hosts-file.yml
# Builds /etc/hosts from network facts of all inventory hosts
---
- name: Gather facts from all hosts
  hosts: all
  gather_facts: yes
  tasks: []

- name: Generate /etc/hosts on all hosts
  hosts: all
  become: yes
  tasks:
    - name: Build /etc/hosts from facts
      ansible.builtin.template:
        src: hosts.j2
        dest: /etc/hosts
        owner: root
        group: root
        mode: '0644'
```

```jinja2
{# templates/hosts.j2 #}
{# /etc/hosts generated by Ansible from network facts #}
127.0.0.1   localhost
::1         localhost ip6-localhost ip6-loopback

# Ansible managed hosts
{% for host in groups['all'] %}
{{ hostvars[host]['ansible_facts']['default_ipv4']['address'] }}   {{ host }} {{ hostvars[host]['ansible_facts']['hostname'] }}
{% endfor %}
```

## Handling Multiple IP Addresses on One Interface

Some interfaces have secondary IP addresses. These are stored in the `ipv4_secondaries` list.

```yaml
# secondary-ips.yml
# Shows primary and secondary IPs for each interface
---
- name: Show all IPs including secondaries
  hosts: all
  gather_facts: yes
  tasks:
    - name: Display IPs for each interface
      ansible.builtin.debug:
        msg:
          - "Interface: {{ item }}"
          - "  Primary: {{ ansible_facts[item]['ipv4']['address'] | default('none') }}"
          - "  Secondaries: {{ ansible_facts[item]['ipv4_secondaries'] | default([]) | map(attribute='address') | list }}"
      loop: "{{ ansible_facts['interfaces'] }}"
      when:
        - item != 'lo'
        - ansible_facts[item]['ipv4'] is defined
```

## Selecting a Specific Interface for a Service

Sometimes you need to bind a service to a specific interface, not the default one. You can filter interfaces by subnet or name pattern.

```yaml
# bind-to-specific-interface.yml
# Finds the interface on the management network and binds to it
---
- name: Configure service on management network
  hosts: appservers
  gather_facts: yes
  vars:
    mgmt_network: "10.0.100."
  tasks:
    - name: Find management interface
      ansible.builtin.set_fact:
        mgmt_ip: "{{ item }}"
      loop: "{{ ansible_facts['all_ipv4_addresses'] }}"
      when: item is match(mgmt_network ~ '.*')

    - name: Configure service to bind to management IP
      ansible.builtin.template:
        src: service.conf.j2
        dest: /etc/myservice/config.conf
      vars:
        bind_address: "{{ mgmt_ip | default(ansible_facts['default_ipv4']['address']) }}"
```

## Summary

Ansible network facts give you complete visibility into the network configuration of every managed host. Use `default_ipv4` for primary address binding, `interfaces` for discovering all NICs, `all_ipv4_addresses` for multi-homed hosts, and per-interface facts for detailed configuration. Combine these with templates to generate configuration files, with conditionals to handle different network topologies, and with `hostvars` to build cross-host network configurations like `/etc/hosts` or load balancer backends. The network facts adapt to whatever the host actually has, so your playbooks stay correct even as interfaces change.
