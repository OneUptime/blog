# How to Use Ansible Network Resource Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Networking, Automation, Infrastructure as Code

Description: Learn how to use Ansible network resource modules to manage network device configurations with a declarative, platform-agnostic approach.

---

If you have spent any time automating network devices with Ansible, you probably started with the older-style `*_config` and `*_command` modules. They work, but they force you to think in terms of raw CLI commands rather than desired state. Ansible network resource modules flip that on its head. Instead of pushing lines of config, you declare what the configuration should look like and let the module figure out the rest.

In this post, I will walk through what network resource modules are, why they matter, and how to use them in real playbooks.

## What Are Network Resource Modules?

Network resource modules were introduced in Ansible 2.9 as part of the network collections. Each module manages a single "resource" on a network device. A resource is a logical piece of configuration like interfaces, VLANs, L3 interfaces, OSPF, BGP, ACLs, and so on.

The key design principles are:

- **Declarative state management** - You describe the desired state, not the commands to get there.
- **Idempotent by default** - Running the same playbook twice produces no changes on the second run.
- **Consistent across platforms** - The `cisco.ios.ios_interfaces` module and the `arista.eos.eos_interfaces` module accept the same structure.
- **State parameter** - Each module supports states like `merged`, `replaced`, `overridden`, `deleted`, and `gathered`.

## Understanding the State Parameter

The `state` parameter is the most important concept to grasp. Here is what each value does:

- **merged** - Merges the provided config with what exists on the device. This is the default and the safest option.
- **replaced** - Replaces the config for each specified resource instance. If you define GigabitEthernet0/1, only that interface gets replaced. Others are untouched.
- **overridden** - Replaces the entire resource type. If you define two interfaces, all other interfaces get reset to defaults.
- **deleted** - Removes config for the specified resource instances.
- **gathered** - Does not make any changes. Pulls the current config and returns it as structured data.
- **rendered** - Returns the commands that would be sent, without connecting to the device.
- **parsed** - Takes raw config text and returns structured data.

## Gathering Current State

Before making changes, it is helpful to see what is already configured. The `gathered` state pulls the current config and returns structured data.

```yaml
# gather_interfaces.yml - Pull current interface config as structured data
---
- name: Gather interface configuration
  hosts: switches
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Get current interface state
      cisco.ios.ios_interfaces:
        state: gathered
      register: interface_state

    - name: Display the gathered data
      ansible.builtin.debug:
        var: interface_state.gathered
```

Running this gives you a clean data structure you can inspect, store, or use in subsequent tasks. The output looks something like this:

```json
{
  "gathered": [
    {
      "name": "GigabitEthernet0/0",
      "enabled": true,
      "speed": "1000",
      "duplex": "full"
    },
    {
      "name": "GigabitEthernet0/1",
      "enabled": false,
      "description": "Unused port"
    }
  ]
}
```

## Configuring Interfaces with Merged State

The `merged` state is the safest starting point. It adds or updates configuration without removing anything that already exists.

```yaml
# configure_interfaces.yml - Set interface descriptions and enable ports
---
- name: Configure switch interfaces
  hosts: switches
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Merge interface configuration
      cisco.ios.ios_interfaces:
        config:
          - name: GigabitEthernet0/1
            description: "Uplink to Core Switch"
            enabled: true
            speed: "1000"
            duplex: full
          - name: GigabitEthernet0/2
            description: "Server Farm Port"
            enabled: true
        state: merged
      register: result

    - name: Show commands that were sent
      ansible.builtin.debug:
        var: result.commands
```

The module compares your desired config against the running config and only sends the commands needed to close the gap. If GigabitEthernet0/1 already has the right description and speed, no commands are sent for it.

## Using Replaced State for Precise Control

When you want to ensure an interface matches your definition exactly, use `replaced`. This removes any config on the specified interface that is not in your definition.

```yaml
# replace_interface.yml - Ensure interface matches this exact definition
---
- name: Replace interface configuration
  hosts: switches
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Replace GigabitEthernet0/1 config
      cisco.ios.ios_interfaces:
        config:
          - name: GigabitEthernet0/1
            description: "Uplink to Core"
            enabled: true
            mtu: 9000
        state: replaced
```

If GigabitEthernet0/1 previously had `speed 1000` and `duplex full` configured but those are not in your definition, the module removes them. Other interfaces are left alone.

## Overridden State for Full Resource Control

The `overridden` state is the nuclear option. It ensures the entire resource type matches your definition and nothing else.

```yaml
# override_vlans.yml - Only these VLANs should exist on the switch
---
- name: Override all VLAN configuration
  hosts: switches
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Override VLANs - removes any VLANs not listed here
      cisco.ios.ios_vlans:
        config:
          - vlan_id: 10
            name: MANAGEMENT
            state: active
          - vlan_id: 20
            name: SERVERS
            state: active
          - vlan_id: 30
            name: USERS
            state: active
        state: overridden
```

Be careful with this. If you have VLAN 99 on the switch and it is not in your list, it gets deleted.

## Working with L3 Interfaces

L3 interface modules handle IP address assignment. The pattern is the same across platforms.

```yaml
# configure_l3_interfaces.yml - Assign IP addresses to routed interfaces
---
- name: Configure L3 interfaces
  hosts: routers
  gather_facts: false
  connection: network_cli

  tasks:
    - name: Set IP addresses on interfaces
      cisco.ios.ios_l3_interfaces:
        config:
          - name: GigabitEthernet0/0
            ipv4:
              - address: 10.1.1.1/24
            ipv6:
              - address: 2001:db8:1::1/64
          - name: Loopback0
            ipv4:
              - address: 10.255.0.1/32
        state: merged
```

## Cross-Platform Playbooks

One of the biggest wins with resource modules is writing playbooks that target multiple platforms. You can use the same variable structure and swap the module based on the platform.

```yaml
# cross_platform_vlans.yml - Configure VLANs across Cisco IOS and Arista EOS
---
- name: Configure VLANs on all switches
  hosts: all_switches
  gather_facts: false
  connection: network_cli

  vars:
    desired_vlans:
      - vlan_id: 10
        name: MANAGEMENT
        state: active
      - vlan_id: 20
        name: SERVERS
        state: active

  tasks:
    - name: Configure VLANs on Cisco IOS
      cisco.ios.ios_vlans:
        config: "{{ desired_vlans }}"
        state: merged
      when: ansible_network_os == 'cisco.ios.ios'

    - name: Configure VLANs on Arista EOS
      arista.eos.eos_vlans:
        config: "{{ desired_vlans }}"
        state: merged
      when: ansible_network_os == 'arista.eos.eos'
```

## The Parsed and Rendered States

Two often-overlooked states are `parsed` and `rendered`. They let you work offline, which is great for testing.

```yaml
# parse_and_render.yml - Work with configs without connecting to a device
---
- name: Offline config processing
  hosts: localhost
  gather_facts: false

  tasks:
    # Parse raw config text into structured data
    - name: Parse raw interface config
      cisco.ios.ios_interfaces:
        running_config: |
          interface GigabitEthernet0/1
           description Uplink to Core
           speed 1000
           duplex full
           no shutdown
        state: parsed
      register: parsed_result

    # Render structured data into commands
    - name: Render commands from structured data
      cisco.ios.ios_interfaces:
        config:
          - name: GigabitEthernet0/1
            description: "Uplink to Core"
            speed: "1000"
            duplex: full
            enabled: true
        state: rendered
      register: rendered_result

    - name: Show rendered commands
      ansible.builtin.debug:
        var: rendered_result.rendered
```

## Available Resource Module Collections

Here are the major network collections that include resource modules:

| Collection | Platform |
|---|---|
| cisco.ios | Cisco IOS/IOS-XE |
| cisco.nxos | Cisco NX-OS |
| cisco.iosxr | Cisco IOS-XR |
| arista.eos | Arista EOS |
| junipernetworks.junos | Juniper Junos |
| vyos.vyos | VyOS |

Install them with `ansible-galaxy collection install cisco.ios` or whatever platform you need.

## Tips from the Field

After using resource modules across dozens of network automation projects, here are the patterns that work well:

1. **Start with gathered** - Always pull the current state first and review it before pushing changes.
2. **Use merged for day-to-day work** - It is the safest state and handles most use cases.
3. **Reserve overridden for known environments** - Only use it when you are confident your definition is complete.
4. **Store gathered output** - Save gathered data to files so you have a record of what changed over time.
5. **Test with rendered** - Generate commands without connecting to a device, review them, then run for real.

Network resource modules represent a significant step forward in how we automate network infrastructure with Ansible. They bring the same declarative, idempotent approach that server automation has enjoyed for years. Once you start thinking in terms of desired state rather than CLI commands, you will find your playbooks become simpler, more portable, and far easier to maintain.
