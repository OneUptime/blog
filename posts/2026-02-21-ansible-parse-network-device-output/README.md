# How to Parse Network Device Output with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Networking, Parsing, Network Automation

Description: Learn practical techniques for parsing unstructured network device output into structured data using Ansible filters and modules.

---

Network devices are chatty. You run `show interfaces` on a Cisco router and get back a wall of text that is meant for human eyes. But automation needs structured data, not paragraphs of output. Parsing that output into something usable is one of the core challenges of network automation.

Ansible gives you several ways to handle this. In this post, I will cover the main parsing approaches, from simple regex filters to full-blown parsing engines, and show you when each one makes sense.

## The Problem with Unstructured Output

When you run a command on a network device through Ansible, you get back raw text. Here is a typical example.

```yaml
# show_version.yml - Run show version and capture raw output
---
- name: Get device version info
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Run show version
      cisco.ios.ios_command:
        commands:
          - show version
      register: version_output

    - name: See what we got
      ansible.builtin.debug:
        var: version_output.stdout[0]
```

The output of `show version` is a big string with the hostname, software version, uptime, serial number, and a bunch of other stuff all mashed together. If you want just the software version, you need to extract it from that blob.

## Method 1 - Regex Filters

For simple, one-off parsing tasks, the `regex_search` filter works well. It is built into Ansible and does not require any external dependencies.

```yaml
# parse_with_regex.yml - Extract specific values using regex filters
---
- name: Parse show version with regex
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Run show version
      cisco.ios.ios_command:
        commands:
          - show version
      register: version_output

    # Extract the IOS version string using a regex pattern
    - name: Parse software version
      ansible.builtin.set_fact:
        ios_version: "{{ version_output.stdout[0] | regex_search('Version ([\\S]+),', '\\1') | first }}"

    # Extract the uptime string
    - name: Parse uptime
      ansible.builtin.set_fact:
        device_uptime: "{{ version_output.stdout[0] | regex_search('uptime is (.+)', '\\1') | first }}"

    - name: Display parsed values
      ansible.builtin.debug:
        msg: "Device is running IOS {{ ios_version }}, uptime: {{ device_uptime }}"
```

This works but it gets messy fast. Regex patterns are fragile and hard to maintain. If the output format changes slightly between IOS versions, your regex breaks.

## Method 2 - The parse_cli Filter

Ansible ships with a `parse_cli` filter that uses spec files to define how output should be parsed. You write a YAML spec that describes the expected format, and the filter extracts matching values.

First, create a parser spec file.

```yaml
# templates/show_ip_interface_brief.yml - Parser spec for show ip interface brief
---
vars:
  interfaces:
    - name: "{{ item.name }}"
      ip_address: "{{ item.ip }}"
      status: "{{ item.status }}"
      protocol: "{{ item.proto }}"

keys:
  interfaces:
    type: list
    value: "{{ interfaces }}"
    items: "{{ item }}"
    regexp: "^(\\S+)\\s+(\\S+)\\s+\\w+\\s+\\w+\\s+(\\S+)\\s+(\\S+)"
    group:
      name: "\\1"
      ip: "\\2"
      status: "\\5"
      proto: "\\6"
```

Then use it in a playbook.

```yaml
# parse_with_cli_spec.yml - Use parse_cli filter with a spec file
---
- name: Parse interface brief output
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Run show ip interface brief
      cisco.ios.ios_command:
        commands:
          - show ip interface brief
      register: interface_output

    - name: Parse with spec file
      ansible.builtin.set_fact:
        parsed_interfaces: "{{ interface_output.stdout[0] | parse_cli('templates/show_ip_interface_brief.yml') }}"

    - name: Show parsed data
      ansible.builtin.debug:
        var: parsed_interfaces
```

## Method 3 - The parse_cli_textfsm Filter

TextFSM is a Python library originally developed by Google for parsing semi-structured text. It uses template files that define a state machine for extracting data. This is probably the most popular parsing approach in the network automation community because of the NTC Templates project, which provides pre-built templates for hundreds of network commands.

```yaml
# parse_with_textfsm.yml - Use TextFSM templates for parsing
---
- name: Parse with TextFSM
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Run show interfaces
      cisco.ios.ios_command:
        commands:
          - show interfaces
      register: interfaces_output

    # parse_cli_textfsm uses NTC templates by default if installed
    - name: Parse output with TextFSM
      ansible.builtin.set_fact:
        parsed_interfaces: "{{ interfaces_output.stdout[0] | parse_cli_textfsm('cisco_ios_show_interfaces.textfsm') }}"

    - name: Display parsed interface data
      ansible.builtin.debug:
        msg: "Interface {{ item.INTERFACE }} - Status: {{ item.LINK_STATUS }}, BW: {{ item.BANDWIDTH }}"
      loop: "{{ parsed_interfaces }}"
```

To use this, install the dependencies on your control node.

```bash
# Install TextFSM and NTC templates on the Ansible control node
pip install textfsm
pip install ntc-templates
```

## Method 4 - The cli_parse Module

The `cli_parse` module from the `ansible.utils` collection is the newer, unified approach. It supports multiple parsing engines and provides a consistent interface.

```yaml
# parse_with_cli_parse.yml - Use the cli_parse module with multiple engines
---
- name: Parse with cli_parse module
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    # Using TextFSM as the parsing engine
    - name: Parse show ip route with TextFSM
      ansible.utils.cli_parse:
        command: show ip route
        parser:
          name: ansible.netcommon.textfsm
          template_path: templates/cisco_ios_show_ip_route.textfsm
      register: route_data

    # Using NTC templates (auto-selects the right template)
    - name: Parse show ip route with NTC templates
      ansible.utils.cli_parse:
        command: show ip route
        parser:
          name: ansible.netcommon.ntc_templates
      register: route_data_ntc

    - name: Display routes
      ansible.builtin.debug:
        msg: "Route to {{ item.NETWORK }}/{{ item.MASK }} via {{ item.NEXTHOP }}"
      loop: "{{ route_data_ntc.parsed }}"
```

## Method 5 - Using xmltodict for Structured Output

Some devices support structured output formats natively. Juniper devices return XML, and modern Cisco NX-OS supports JSON. When available, these are far better than parsing CLI text.

```yaml
# parse_structured_output.yml - Work with devices that return XML or JSON
---
- name: Parse structured output from Junos
  hosts: juniper_routers
  gather_facts: false
  connection: netconf

  tasks:
    # Junos returns XML which Ansible converts to dict automatically
    - name: Get interface info via NETCONF
      junipernetworks.junos.junos_command:
        commands:
          - show interfaces
        display: xml
      register: junos_interfaces

    - name: Access structured data directly
      ansible.builtin.debug:
        msg: "Interface {{ item['name'] }}"
      loop: "{{ junos_interfaces.output[0]['interface-information']['physical-interface'] }}"

- name: Parse JSON output from NX-OS
  hosts: nexus_switches
  gather_facts: false
  connection: network_cli

  tasks:
    # NX-OS supports piping to JSON
    - name: Get VLANs as JSON
      cisco.nxos.nxos_command:
        commands:
          - show vlan brief | json
      register: vlan_output

    - name: Work with the JSON data directly
      ansible.builtin.debug:
        msg: "VLAN {{ item.vlanshowbr-vlanid }} - {{ item.vlanshowbr-vlanname }}"
      loop: "{{ vlan_output.stdout[0]['TABLE_vlanbriefxbrief']['ROW_vlanbriefxbrief'] }}"
```

## Comparing the Approaches

Here is a quick comparison to help you decide which method to use.

| Method | Complexity | Maintainability | Best For |
|---|---|---|---|
| regex_search | Low | Low | One-off extractions |
| parse_cli | Medium | Medium | Custom spec-based parsing |
| parse_cli_textfsm | Medium | High | Standard show commands |
| cli_parse module | Medium | High | New projects, multi-engine |
| Structured output | Low | High | Devices that support XML/JSON |

## Building a Practical Facts-Gathering Playbook

Let me put this together in a real scenario. Say you want to build a network inventory by parsing output from multiple commands.

```yaml
# gather_network_facts.yml - Build an inventory from parsed device output
---
- name: Gather network device inventory
  hosts: network_devices
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Gather device facts
      ansible.utils.cli_parse:
        command: show version
        parser:
          name: ansible.netcommon.ntc_templates
      register: version_facts

    - name: Gather interface facts
      ansible.utils.cli_parse:
        command: show ip interface brief
        parser:
          name: ansible.netcommon.ntc_templates
      register: interface_facts

    # Build a clean inventory dictionary from parsed data
    - name: Compile device inventory
      ansible.builtin.set_fact:
        device_inventory:
          hostname: "{{ version_facts.parsed[0].HOSTNAME }}"
          software: "{{ version_facts.parsed[0].VERSION }}"
          serial: "{{ version_facts.parsed[0].SERIAL | default('N/A') }}"
          interfaces: "{{ interface_facts.parsed | map(attribute='INTF') | list }}"
          active_interfaces: "{{ interface_facts.parsed | selectattr('STATUS', 'equalto', 'up') | list }}"

    # Write the inventory to a JSON file for later use
    - name: Save inventory to file
      ansible.builtin.copy:
        content: "{{ device_inventory | to_nice_json }}"
        dest: "inventory/{{ inventory_hostname }}.json"
      delegate_to: localhost
```

## Tips for Reliable Parsing

1. **Prefer structured output when available.** If the device can return JSON or XML, always use that over parsing CLI text.
2. **Use NTC Templates before writing your own.** The community has already built templates for most common commands.
3. **Test your parsers against multiple device versions.** Output formats can vary between software versions.
4. **Cache parsed data.** If you need the same parsed output in multiple tasks, parse it once and store it as a fact.
5. **Validate parsed data.** Always check that the parsed output contains what you expect before acting on it.

Parsing network device output is not glamorous work, but getting it right is the foundation of every network automation project. Start with the simplest approach that works for your use case, and reach for the more powerful tools when you need them.
