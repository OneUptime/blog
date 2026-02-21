# How to Use Ansible TextFSM Parser for Network Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, TextFSM, Network Automation, Parsing

Description: A hands-on guide to using TextFSM templates with Ansible for parsing semi-structured network device output into clean, usable data.

---

TextFSM is one of those tools that every network automation engineer ends up learning sooner or later. Originally built by Google for their internal network operations, TextFSM takes unstructured CLI output from network devices and transforms it into structured data. When combined with Ansible, it becomes an incredibly powerful way to extract facts from network devices that do not support modern APIs.

This post covers how TextFSM works, how to write your own templates, and how to use them effectively in Ansible playbooks.

## What TextFSM Actually Does

TextFSM is a Python-based template engine that implements a finite state machine for parsing text. You define a template that describes the patterns in the text, and TextFSM walks through the output line by line, matching against your patterns and extracting values.

Think of it as a structured way to write regex parsers. Instead of writing one giant regular expression, you define variables and state transitions that make the parsing logic readable and maintainable.

## Setting Up TextFSM with Ansible

First, install the required packages on your Ansible control node.

```bash
# Install TextFSM library and the NTC Templates collection
pip install textfsm
pip install ntc-templates

# Install the Ansible network utilities collection
ansible-galaxy collection install ansible.utils
ansible-galaxy collection install ansible.netcommon
```

The NTC Templates project (Network to Code) maintains a huge library of pre-built TextFSM templates for Cisco IOS, NX-OS, Arista EOS, Juniper Junos, and many other platforms. Before writing your own template, check if one already exists.

## Anatomy of a TextFSM Template

A TextFSM template has two sections: value definitions and state rules. Let me walk through a simple example that parses the output of `show ip interface brief` on Cisco IOS.

Here is typical output from that command:

```
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     10.1.1.1        YES manual up                    up
GigabitEthernet0/1     unassigned      YES unset  administratively down down
Loopback0              10.255.0.1      YES manual up                    up
```

And here is a TextFSM template to parse it.

```
# cisco_ios_show_ip_interface_brief.textfsm
# Parses 'show ip interface brief' output into structured records
Value INTERFACE (\S+)
Value IP_ADDRESS (\S+)
Value OK (\S+)
Value METHOD (\S+)
Value STATUS (.+?)
Value PROTOCOL (\S+)

Start
  ^${INTERFACE}\s+${IP_ADDRESS}\s+${OK}\s+${METHOD}\s+${STATUS}\s+${PROTOCOL} -> Record
```

Each `Value` line defines a variable name and a regex capture group. The `Start` state contains rules that match against input lines. When a line matches and the rule ends with `-> Record`, TextFSM saves the current values as a row and resets for the next match.

## Using Pre-Built NTC Templates

The fastest way to get started is with NTC templates. They cover hundreds of commands across dozens of platforms.

```yaml
# parse_with_ntc.yml - Use NTC templates for automatic template selection
---
- name: Parse network output with NTC Templates
  hosts: ios_routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Run show ip route
      cisco.ios.ios_command:
        commands:
          - show ip route
      register: route_output

    # The parse_cli_textfsm filter auto-detects the right NTC template
    # based on the platform and command when ntc-templates is installed
    - name: Parse routing table
      ansible.builtin.set_fact:
        routes: "{{ route_output.stdout[0] | parse_cli_textfsm }}"

    - name: Display parsed routes
      ansible.builtin.debug:
        msg: "{{ item.PROTOCOL }} route to {{ item.NETWORK }}/{{ item.MASK }} via {{ item.NEXTHOP_IP }}"
      loop: "{{ routes }}"
      when: item.NEXTHOP_IP | length > 0
```

For this automatic detection to work, set the `ansible_network_os` variable for your hosts.

```ini
# inventory/hosts.ini - Set network_os so NTC can pick the right template
[ios_routers]
router1 ansible_host=10.1.1.1

[ios_routers:vars]
ansible_network_os=cisco_ios
ansible_connection=network_cli
ansible_user=admin
ansible_password=secretpass
```

## Writing Custom TextFSM Templates

Sometimes NTC templates do not cover your specific command or you need to parse custom output. Writing your own template is straightforward once you understand the pattern.

Let me parse the output of `show cdp neighbors detail`, which has multi-line records.

```
# templates/cisco_ios_show_cdp_neighbors_detail.textfsm
# Parse CDP neighbor detail output which spans multiple lines per neighbor
Value DEVICE_ID (\S+)
Value IP_ADDRESS (\d+\.\d+\.\d+\.\d+)
Value PLATFORM (.+?)
Value LOCAL_INTERFACE (\S+)
Value REMOTE_INTERFACE (\S+)
Value SOFTWARE_VERSION (.+?)

# Start state - look for the beginning of each neighbor entry
Start
  ^Device ID: ${DEVICE_ID}
  ^  IP address: ${IP_ADDRESS}
  ^Platform: ${PLATFORM},
  ^Interface: ${LOCAL_INTERFACE},\s+Port ID \(outgoing port\): ${REMOTE_INTERFACE}
  ^Version\s*: -> GetVersion
  ^\s*$$ -> Record

# GetVersion state - capture the version on the next line
GetVersion
  ^${SOFTWARE_VERSION} -> Start
```

The template uses two states. It starts in the `Start` state, collecting values line by line. When it hits the `Version :` line, it transitions to `GetVersion` to capture the version string on the following line. An empty line signals the end of a neighbor record.

Use this custom template in a playbook.

```yaml
# parse_cdp_custom.yml - Use a custom TextFSM template for CDP neighbors
---
- name: Parse CDP neighbors with custom template
  hosts: ios_switches
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Get CDP neighbor details
      cisco.ios.ios_command:
        commands:
          - show cdp neighbors detail
      register: cdp_output

    # Point to our custom template file
    - name: Parse CDP output
      ansible.builtin.set_fact:
        cdp_neighbors: "{{ cdp_output.stdout[0] | parse_cli_textfsm('templates/cisco_ios_show_cdp_neighbors_detail.textfsm') }}"

    - name: Build neighbor report
      ansible.builtin.debug:
        msg: >
          Local port {{ item.LOCAL_INTERFACE }} connects to
          {{ item.DEVICE_ID }} port {{ item.REMOTE_INTERFACE }}
          ({{ item.PLATFORM }}, IP: {{ item.IP_ADDRESS }})
      loop: "{{ cdp_neighbors }}"
```

## Using cli_parse with TextFSM

The `cli_parse` module from `ansible.utils` provides a cleaner interface that combines running the command and parsing in a single task.

```yaml
# cli_parse_textfsm.yml - Single task to run command and parse output
---
- name: Streamlined parsing with cli_parse
  hosts: ios_routers
  gather_facts: false
  connection: network_cli

  tasks:
    # cli_parse runs the command and parses in one step
    - name: Get and parse interface status
      ansible.utils.cli_parse:
        command: show interfaces status
        parser:
          name: ansible.netcommon.textfsm
          template_path: templates/cisco_ios_show_interfaces_status.textfsm
      register: interface_status

    - name: Find interfaces in err-disabled state
      ansible.builtin.set_fact:
        error_ports: "{{ interface_status.parsed | selectattr('STATUS', 'equalto', 'err-disabled') | list }}"

    - name: Alert on err-disabled ports
      ansible.builtin.debug:
        msg: "WARNING: Port {{ item.PORT }} is in err-disabled state"
      loop: "{{ error_ports }}"
```

## Advanced Template Techniques

### Required Values

Mark a value as `Required` so records without that value are discarded.

```
# Only record entries that have both an interface name and IP address
Value Required INTERFACE (\S+)
Value Required IP_ADDRESS (\d+\.\d+\.\d+\.\d+)
Value STATUS (\S+)
```

### List Values

Capture multiple values into a list for fields that repeat within a record.

```
# Capture all secondary IP addresses as a list
Value INTERFACE (\S+)
Value PRIMARY_IP (\d+\.\d+\.\d+\.\d+)
Value List SECONDARY_IPS (\d+\.\d+\.\d+\.\d+)

Start
  ^${INTERFACE}\s+is
  ^  Internet address is ${PRIMARY_IP}
  ^  Secondary address ${SECONDARY_IPS}
  ^\s*$$ -> Record
```

### Filldown Values

Use `Filldown` to carry a value forward across multiple records. This is useful when a header applies to multiple rows.

```
# The VRF name appears once, followed by multiple routes
Value Filldown VRF (\S+)
Value Required NETWORK (\d+\.\d+\.\d+\.\d+)
Value MASK (\d+)
Value NEXTHOP (\d+\.\d+\.\d+\.\d+)

Start
  ^VRF:\s+${VRF}
  ^\s+${NETWORK}/${MASK}\s+via\s+${NEXTHOP} -> Record
```

## Practical Example: Network Inventory Report

Here is a complete playbook that gathers and parses data from multiple commands to build a device inventory.

```yaml
# inventory_report.yml - Parse multiple commands to build inventory data
---
- name: Build network device inventory
  hosts: ios_devices
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Parse version info
      ansible.utils.cli_parse:
        command: show version
        parser:
          name: ansible.netcommon.ntc_templates
      register: version_data

    - name: Parse interface data
      ansible.utils.cli_parse:
        command: show ip interface brief
        parser:
          name: ansible.netcommon.ntc_templates
      register: interface_data

    - name: Parse CDP neighbors
      ansible.utils.cli_parse:
        command: show cdp neighbors
        parser:
          name: ansible.netcommon.ntc_templates
      register: cdp_data

    # Combine all parsed data into a single inventory record
    - name: Build inventory record
      ansible.builtin.set_fact:
        device_record:
          hostname: "{{ version_data.parsed[0].HOSTNAME }}"
          model: "{{ version_data.parsed[0].HARDWARE | default(['Unknown']) | first }}"
          ios_version: "{{ version_data.parsed[0].VERSION }}"
          serial: "{{ version_data.parsed[0].SERIAL | default(['N/A']) | first }}"
          uptime: "{{ version_data.parsed[0].UPTIME }}"
          interface_count: "{{ interface_data.parsed | length }}"
          active_interfaces: "{{ interface_data.parsed | selectattr('STATUS', 'equalto', 'up') | list | length }}"
          neighbor_count: "{{ cdp_data.parsed | length }}"

    - name: Write inventory to file
      ansible.builtin.copy:
        content: "{{ device_record | to_nice_json }}"
        dest: "/tmp/inventory/{{ inventory_hostname }}.json"
      delegate_to: localhost
```

TextFSM paired with Ansible solves a real pain point in network automation. Not every device has a REST API or supports NETCONF. For those legacy devices where CLI is the only option, TextFSM templates give you a reliable, maintainable way to turn text into data. Start with NTC templates, and only write custom templates when you need to parse something the community has not covered yet.
