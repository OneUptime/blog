# How to Use Ansible cli_parse Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, cli_parse, Network Automation, Parsing

Description: Master the Ansible cli_parse module to run commands and parse output in a single task using multiple parsing engines like TextFSM, TTP, and pyATS.

---

The `cli_parse` module from the `ansible.utils` collection is Ansible's unified approach to parsing CLI output from network devices. Before this module existed, you had to run a command in one task and parse the output in a separate task using Jinja2 filters. The `cli_parse` module combines both steps into a single task, and it supports multiple parsing engines so you can pick the right tool for each situation.

In this post, I will show you how to set it up, use different parsing engines, and build real playbooks around it.

## Installing the Required Collections

The `cli_parse` module lives in the `ansible.utils` collection, and the parsing engine plugins are in `ansible.netcommon`.

```bash
# Install the collections that provide cli_parse and its parser plugins
ansible-galaxy collection install ansible.utils
ansible-galaxy collection install ansible.netcommon

# Install Python parsing libraries depending on which engines you want
pip install textfsm
pip install ntc-templates
pip install ttp
pip install pyats
pip install xmltodict
```

## Basic Usage

At its simplest, `cli_parse` runs a command on a device and parses the output through a specified engine. Here is the basic structure.

```yaml
# basic_cli_parse.yml - Run a command and parse output in one task
---
- name: Basic cli_parse example
  hosts: ios_routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Get and parse show version
      ansible.utils.cli_parse:
        command: show version
        parser:
          name: ansible.netcommon.ntc_templates
      register: version_info

    - name: Display parsed data
      ansible.builtin.debug:
        var: version_info.parsed
```

The module runs `show version` on the device, passes the output to the NTC Templates parser, and stores the structured result in `version_info.parsed`. That is it. One task instead of two.

## Supported Parsing Engines

The `cli_parse` module supports several parsing backends. Each one has different strengths.

### NTC Templates

NTC Templates is the easiest to use because it ships with pre-built templates for hundreds of commands across many platforms. The module automatically selects the right template based on `ansible_network_os` and the command being run.

```yaml
# ntc_parser.yml - NTC Templates auto-selects the right parser template
---
- name: Parse with NTC Templates
  hosts: ios_switches
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Parse show ip route
      ansible.utils.cli_parse:
        command: show ip route
        parser:
          name: ansible.netcommon.ntc_templates
      register: routes

    - name: List all static routes
      ansible.builtin.debug:
        msg: "Static route: {{ item.NETWORK }}/{{ item.MASK }} via {{ item.NEXTHOP_IP }}"
      loop: "{{ routes.parsed }}"
      when: item.PROTOCOL == 'S'
```

### TextFSM with Custom Templates

When NTC does not have a template for your command, you can write your own TextFSM template and point `cli_parse` at it.

```yaml
# textfsm_custom.yml - Use a custom TextFSM template for parsing
---
- name: Parse with custom TextFSM template
  hosts: ios_switches
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Parse show power inline
      ansible.utils.cli_parse:
        command: show power inline
        parser:
          name: ansible.netcommon.textfsm
          template_path: templates/cisco_ios_show_power_inline.textfsm
      register: poe_data

    - name: Find ports consuming over 15 watts
      ansible.builtin.debug:
        msg: "Port {{ item.INTERFACE }} consuming {{ item.POWER }}W"
      loop: "{{ poe_data.parsed }}"
      when: item.POWER | float > 15.0
```

### TTP (Template Text Parser)

TTP is an alternative to TextFSM that uses a more intuitive template syntax. Instead of regex-heavy definitions, TTP templates look like the output you are parsing with placeholders where the values go.

```yaml
# ttp_parser.yml - Use TTP for more readable parser templates
---
- name: Parse with TTP
  hosts: ios_routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Parse show ip ospf neighbor
      ansible.utils.cli_parse:
        command: show ip ospf neighbor
        parser:
          name: ansible.netcommon.ttp
          template_path: templates/show_ip_ospf_neighbor.ttp
      register: ospf_neighbors

    - name: Show OSPF neighbors
      ansible.builtin.debug:
        var: ospf_neighbors.parsed
```

And the TTP template file looks like the actual command output with variables marked by double curly braces.

```
# templates/show_ip_ospf_neighbor.ttp
# TTP templates resemble the actual output format, making them easy to write
{{ NEIGHBOR_ID }}  {{ PRIORITY }}  {{ STATE }}/{{ ROLE }}  {{ DEAD_TIME }}  {{ ADDRESS }}  {{ INTERFACE }}
```

### pyATS/Genie Parser

Cisco's pyATS framework includes Genie parsers that handle complex, multi-line outputs extremely well. They produce deeply nested structured data.

```yaml
# pyats_parser.yml - Use Cisco pyATS/Genie for detailed structured output
---
- name: Parse with pyATS
  hosts: ios_routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Parse show interfaces with pyATS
      ansible.utils.cli_parse:
        command: show interfaces
        parser:
          name: ansible.netcommon.pyats
      register: interfaces

    # pyATS returns deeply nested data organized by interface name
    - name: Check interface error counters
      ansible.builtin.debug:
        msg: "{{ item.key }}: {{ item.value.counters.in_errors | default(0) }} input errors"
      loop: "{{ interfaces.parsed | dict2items }}"
      when: item.value.counters is defined
```

### XML Parser

For devices that return XML output (like Juniper over NETCONF), the XML parser converts it to a Python dictionary.

```yaml
# xml_parser.yml - Parse XML output from NETCONF-capable devices
---
- name: Parse XML output
  hosts: juniper_routers
  gather_facts: false
  connection: netconf

  tasks:
    - name: Parse Junos interface XML
      ansible.utils.cli_parse:
        text: "{{ lookup('file', 'sample_output/junos_interfaces.xml') }}"
        parser:
          name: ansible.netcommon.xml
      register: junos_data
```

## Parsing Pre-Captured Output

You do not always need to run the command live. The `text` parameter lets you parse output that was previously captured or stored in a file. This is great for testing your parsing logic without connecting to a device.

```yaml
# parse_offline.yml - Parse previously captured output without device connection
---
- name: Parse saved command output
  hosts: localhost
  gather_facts: false
  connection: local

  tasks:
    # Parse output stored in a variable
    - name: Parse stored output with NTC templates
      ansible.utils.cli_parse:
        text: |
          Interface              IP-Address      OK? Method Status                Protocol
          GigabitEthernet0/0     10.1.1.1        YES manual up                    up
          GigabitEthernet0/1     unassigned      YES unset  down                  down
          Loopback0              10.255.0.1      YES manual up                    up
        parser:
          name: ansible.netcommon.textfsm
          template_path: templates/cisco_ios_show_ip_interface_brief.textfsm
        set_fact: parsed_interfaces

    - name: Show results
      ansible.builtin.debug:
        var: parsed_interfaces
```

## Using set_fact for Direct Variable Assignment

Notice the `set_fact` parameter in the previous example. Instead of registering the full result and accessing `.parsed`, you can have `cli_parse` set a fact directly.

```yaml
# set_fact_example.yml - Parse and set fact in one step
---
- name: Direct fact assignment
  hosts: ios_routers
  gather_facts: false
  connection: network_cli

  tasks:
    # The parsed result goes straight into the 'device_routes' variable
    - name: Parse routes directly into a fact
      ansible.utils.cli_parse:
        command: show ip route
        parser:
          name: ansible.netcommon.ntc_templates
        set_fact: device_routes

    - name: Use the fact directly
      ansible.builtin.debug:
        msg: "Found {{ device_routes | length }} routes"
```

## Error Handling

When parsing fails, you want to catch it gracefully rather than letting the playbook crash.

```yaml
# error_handling.yml - Handle parsing failures gracefully
---
- name: Robust parsing with error handling
  hosts: network_devices
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Attempt to parse output
      ansible.utils.cli_parse:
        command: show ip bgp summary
        parser:
          name: ansible.netcommon.ntc_templates
      register: bgp_result
      ignore_errors: true

    # Fall back to regex parsing if the structured parser fails
    - name: Handle parse failure
      block:
        - name: Run command manually
          cisco.ios.ios_command:
            commands:
              - show ip bgp summary
          register: raw_bgp

        - name: Extract neighbor count with regex
          ansible.builtin.set_fact:
            bgp_neighbor_count: "{{ raw_bgp.stdout[0] | regex_findall('\\d+\\.\\d+\\.\\d+\\.\\d+') | length }}"
      when: bgp_result is failed

    - name: Report results
      ansible.builtin.debug:
        msg: >
          BGP data: {{ bgp_result.parsed | default('Parse failed, found ' +
          bgp_neighbor_count | default('0') + ' neighbors via regex') }}
```

## Building a Multi-Command Audit Playbook

Here is a practical example that combines multiple `cli_parse` calls to audit a network device.

```yaml
# device_audit.yml - Comprehensive device audit using cli_parse
---
- name: Network device audit
  hosts: ios_devices
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Parse device version
      ansible.utils.cli_parse:
        command: show version
        parser:
          name: ansible.netcommon.ntc_templates
        set_fact: version_info

    - name: Parse interface status
      ansible.utils.cli_parse:
        command: show interfaces status
        parser:
          name: ansible.netcommon.ntc_templates
        set_fact: interface_status

    - name: Parse VLAN info
      ansible.utils.cli_parse:
        command: show vlan brief
        parser:
          name: ansible.netcommon.ntc_templates
        set_fact: vlan_info

    # Compile an audit report from all parsed data
    - name: Generate audit report
      ansible.builtin.template:
        src: templates/audit_report.j2
        dest: "reports/{{ inventory_hostname }}_audit.txt"
      delegate_to: localhost
      vars:
        hostname: "{{ version_info[0].HOSTNAME }}"
        ios_ver: "{{ version_info[0].VERSION }}"
        total_ports: "{{ interface_status | length }}"
        up_ports: "{{ interface_status | selectattr('STATUS', 'equalto', 'connected') | list | length }}"
        total_vlans: "{{ vlan_info | length }}"
```

The `cli_parse` module is the right starting point for anyone doing network parsing with Ansible today. It wraps all the major parsing engines behind a consistent interface, reduces your task count, and keeps playbooks clean. Pick the parsing engine that fits your situation, use NTC templates when they cover your commands, and write custom templates when they do not.
