# How to Use Ansible cli_command Module for Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Network Automation, CLI, Multi-Vendor

Description: Master the Ansible cli_command module for executing show commands and operational tasks on network devices across multiple vendor platforms.

---

The `cli_command` module from the `ansible.netcommon` collection is one of the most versatile tools in the Ansible network automation toolkit. It sends a single command to a network device through the CLI and returns the output. Unlike vendor-specific modules that only work with one platform, `cli_command` works with any device that uses the `network_cli` connection plugin, which means Cisco IOS, NX-OS, IOS-XR, Arista EOS, Juniper JunOS (in CLI mode), VyOS, and many more.

This module is your go-to tool for gathering operational data, running show commands, verifying configurations, and performing health checks across your network infrastructure.

## Basic Usage

The simplest use of `cli_command` is sending a single show command and capturing the output:

```yaml
# playbook-basic-cli.yml
# Sends a show command to a network device and captures the output
- name: Basic cli_command usage
  hosts: ios_routers
  gather_facts: no

  tasks:
    - name: Get device version information
      ansible.netcommon.cli_command:
        command: show version
      register: version_output

    - name: Display the output
      ansible.builtin.debug:
        msg: "{{ version_output.stdout }}"

    - name: Display output as lines
      ansible.builtin.debug:
        msg: "{{ version_output.stdout_lines }}"
```

The module returns two key values:
- `stdout`: The raw output as a single string
- `stdout_lines`: The output split into a list of lines

## Running Multiple Commands

While `cli_command` sends one command at a time, you can loop over a list of commands:

```yaml
# playbook-multi-commands.yml
# Runs multiple show commands on a network device
- name: Run multiple show commands
  hosts: ios_routers
  gather_facts: no

  vars:
    health_check_commands:
      - show version
      - show ip interface brief
      - show ip route summary
      - show processes cpu | include utilization
      - show memory statistics
      - show cdp neighbors

  tasks:
    - name: Execute each health check command
      ansible.netcommon.cli_command:
        command: "{{ item }}"
      register: health_results
      loop: "{{ health_check_commands }}"

    - name: Display all results
      ansible.builtin.debug:
        msg: |
          Command: {{ item.item }}
          Output: {{ item.stdout_lines | join('\n') }}
      loop: "{{ health_results.results }}"
      loop_control:
        label: "{{ item.item }}"
```

## Handling Interactive Prompts

Some network commands ask for confirmation before executing. The `prompt` and `answer` parameters handle this:

```yaml
# playbook-prompts.yml
# Handles interactive prompts from network device commands
- name: Handle command prompts
  hosts: ios_routers
  gather_facts: no

  tasks:
    - name: Clear interface counters
      ansible.netcommon.cli_command:
        command: clear counters GigabitEthernet0/0
        prompt:
          - "Clear \"show interface\" counters on this interface"
        answer:
          - "y"

    - name: Reload device with confirmation
      ansible.netcommon.cli_command:
        command: reload in 30
        prompt:
          - "System configuration has been modified"
          - "Proceed with reload"
        answer:
          - "no"
          - "y"
        check_all: true
      when: schedule_reload | default(false)
```

The `check_all: true` parameter ensures that all prompts are matched in order. Without it, any single prompt match triggers the response.

## Cross-Platform Operational Data Collection

Here is a practical pattern for collecting the same type of data from different vendor platforms:

```yaml
# playbook-cross-platform.yml
# Collects interface data from multiple vendor platforms
- name: Cross-platform data collection
  hosts: all_network
  gather_facts: no

  vars:
    interface_commands:
      cisco.ios.ios: "show ip interface brief"
      cisco.nxos.nxos: "show ip interface brief vrf all"
      arista.eos.eos: "show ip interface brief"
      junipernetworks.junos.junos: "show interfaces terse"
      vyos.vyos.vyos: "show interfaces"

    route_commands:
      cisco.ios.ios: "show ip route summary"
      cisco.nxos.nxos: "show ip route summary"
      arista.eos.eos: "show ip route summary"
      junipernetworks.junos.junos: "show route summary"
      vyos.vyos.vyos: "show ip route"

  tasks:
    - name: Get interface summary
      ansible.netcommon.cli_command:
        command: "{{ interface_commands[ansible_network_os] }}"
      register: interfaces

    - name: Get routing summary
      ansible.netcommon.cli_command:
        command: "{{ route_commands[ansible_network_os] }}"
      register: routes

    - name: Build device report
      ansible.builtin.set_fact:
        device_report:
          hostname: "{{ inventory_hostname }}"
          platform: "{{ ansible_network_os }}"
          interfaces: "{{ interfaces.stdout_lines }}"
          route_summary: "{{ routes.stdout_lines }}"

    - name: Save report to file
      ansible.builtin.copy:
        content: |
          Device Report: {{ inventory_hostname }}
          Platform: {{ ansible_network_os }}
          Collected: {{ lookup('pipe', 'date +%Y-%m-%d_%H:%M:%S') }}

          === Interfaces ===
          {{ interfaces.stdout }}

          === Routing Summary ===
          {{ routes.stdout }}
        dest: "./reports/{{ inventory_hostname }}-report.txt"
      delegate_to: localhost
```

## Parsing Output with Filters

Raw CLI output is text, which is hard to work with programmatically. You can parse it using various techniques:

### Using split and regex

```yaml
# playbook-parse-output.yml
# Parses CLI output to extract specific information
- name: Parse CLI output
  hosts: ios_routers
  gather_facts: no

  tasks:
    - name: Get interface brief
      ansible.netcommon.cli_command:
        command: show ip interface brief
      register: intf_output

    - name: Find interfaces that are down
      ansible.builtin.set_fact:
        down_interfaces: "{{ intf_output.stdout_lines | select('search', 'down') | list }}"

    - name: Alert on down interfaces
      ansible.builtin.debug:
        msg: "WARNING: {{ item }}"
      loop: "{{ down_interfaces }}"
      when: down_interfaces | length > 0
```

### Using TextFSM Templates

For structured parsing, use the `ansible.utils.cli_parse` module with TextFSM:

```yaml
# playbook-textfsm-parse.yml
# Parses CLI output into structured data using TextFSM
- name: Parse with TextFSM
  hosts: ios_routers
  gather_facts: no

  tasks:
    - name: Get BGP neighbors and parse
      ansible.netcommon.cli_command:
        command: show ip bgp summary
      register: bgp_output

    - name: Parse BGP output
      ansible.builtin.set_fact:
        bgp_neighbors: "{{ bgp_output.stdout | regex_findall('(\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+\\d+\\s+(\\d+)\\s+(\\d+)') }}"

    - name: Display parsed neighbors
      ansible.builtin.debug:
        msg: "Neighbor: {{ item[0] }}, AS: {{ item[1] }}, Prefixes: {{ item[2] }}"
      loop: "{{ bgp_neighbors }}"
```

## Building a Network Health Check Playbook

Here is a comprehensive health check playbook that uses `cli_command` to verify network device health:

```yaml
# playbook-health-check.yml
# Comprehensive health check for Cisco IOS devices
- name: Network device health check
  hosts: ios_routers
  gather_facts: no

  vars:
    cpu_threshold: 80
    memory_threshold: 80

  tasks:
    - name: Check CPU utilization
      ansible.netcommon.cli_command:
        command: show processes cpu | include utilization
      register: cpu_output

    - name: Check memory usage
      ansible.netcommon.cli_command:
        command: show memory statistics | include Processor
      register: memory_output

    - name: Check for critical log messages
      ansible.netcommon.cli_command:
        command: "show logging | include %SYS|%LINK|%LINEPROTO|%OSPF"
      register: log_output

    - name: Check interface errors
      ansible.netcommon.cli_command:
        command: show interfaces | include errors|CRC|drops
      register: error_output

    - name: Check BGP neighbor status
      ansible.netcommon.cli_command:
        command: show ip bgp summary
      register: bgp_output

    - name: Check OSPF neighbor status
      ansible.netcommon.cli_command:
        command: show ip ospf neighbor
      register: ospf_output

    - name: Check NTP synchronization
      ansible.netcommon.cli_command:
        command: show ntp status
      register: ntp_output

    - name: Compile health report
      ansible.builtin.set_fact:
        health_report:
          device: "{{ inventory_hostname }}"
          timestamp: "{{ lookup('pipe', 'date +%Y-%m-%d_%H:%M:%S') }}"
          cpu: "{{ cpu_output.stdout }}"
          memory: "{{ memory_output.stdout }}"
          ntp_synced: "{{ 'synchronized' in ntp_output.stdout | lower }}"
          bgp_neighbors: "{{ bgp_output.stdout_lines | length - 1 }}"
          recent_logs: "{{ log_output.stdout_lines | length }}"

    - name: Display health summary
      ansible.builtin.debug:
        msg: |
          === Health Report: {{ inventory_hostname }} ===
          CPU: {{ health_report.cpu | trim }}
          Memory: {{ health_report.memory | trim }}
          NTP Synchronized: {{ health_report.ntp_synced }}
          Recent Alert Logs: {{ health_report.recent_logs }}

    - name: Save health report
      ansible.builtin.copy:
        content: "{{ health_report | to_nice_json }}"
        dest: "./reports/{{ inventory_hostname }}-health.json"
      delegate_to: localhost
```

## Using cli_command for Configuration Verification

After applying configuration changes, verify they took effect:

```yaml
# playbook-verify-config.yml
# Verifies configuration changes were applied correctly
- name: Verify configuration changes
  hosts: ios_routers
  gather_facts: no

  vars:
    expected_ntp_server: "10.0.0.50"
    expected_syslog_host: "10.0.100.50"

  tasks:
    - name: Check NTP configuration
      ansible.netcommon.cli_command:
        command: show running-config | include ntp server
      register: ntp_config

    - name: Verify NTP server is configured
      ansible.builtin.assert:
        that:
          - "expected_ntp_server in ntp_config.stdout"
        fail_msg: "NTP server {{ expected_ntp_server }} is NOT configured"
        success_msg: "NTP server {{ expected_ntp_server }} is configured"

    - name: Check syslog configuration
      ansible.netcommon.cli_command:
        command: show running-config | include logging host
      register: syslog_config

    - name: Verify syslog host is configured
      ansible.builtin.assert:
        that:
          - "expected_syslog_host in syslog_config.stdout"
        fail_msg: "Syslog host {{ expected_syslog_host }} is NOT configured"
        success_msg: "Syslog host {{ expected_syslog_host }} is configured"
```

## Conditional Command Execution

You can vary commands based on device type or other conditions:

```yaml
# playbook-conditional-commands.yml
# Runs different commands based on device role or type
- name: Role-based command execution
  hosts: all_network
  gather_facts: no

  tasks:
    - name: Check routing protocol status on routers
      ansible.netcommon.cli_command:
        command: show ip ospf neighbor
      register: routing_status
      when: "'routers' in group_names"

    - name: Check spanning-tree on switches
      ansible.netcommon.cli_command:
        command: show spanning-tree summary
      register: stp_status
      when: "'switches' in group_names"

    - name: Check VPN tunnels on firewalls
      ansible.netcommon.cli_command:
        command: show crypto ipsec sa summary
      register: vpn_status
      when: "'firewalls' in group_names"
```

## Error Handling

The `cli_command` module will fail if the command returns an error. Use `failed_when` and `ignore_errors` to handle this:

```yaml
    - name: Run command that might not exist on all platforms
      ansible.netcommon.cli_command:
        command: show ip bgp summary
      register: bgp_result
      failed_when: false

    - name: Process BGP data if available
      ansible.builtin.debug:
        msg: "BGP data: {{ bgp_result.stdout }}"
      when: bgp_result.rc == 0 | default(bgp_result.failed == false)
```

## Tips for cli_command

**Always use `register`.** Without capturing the output, the command runs but the data goes nowhere. Always register the result for use in subsequent tasks.

**Prefer structured modules when available.** If a vendor collection has a dedicated module for what you need (like `cisco.ios.ios_facts`), use that instead of parsing CLI output. Structured modules provide better idempotency and cleaner data.

**Be mindful of command output size.** Some show commands can produce megabytes of output. This all gets transferred back to the control node and stored in memory. Use command filters (like `| include` on IOS) to limit output.

**The command must be an operational command.** Do not use `cli_command` to send configuration commands. Use `cli_config` or vendor-specific config modules instead. `cli_command` runs in exec mode, not configuration mode.

**Test your commands manually first.** Before putting a command in a playbook, SSH into the device and run it manually. This catches syntax errors and ensures the command produces the output you expect.

The `cli_command` module is simple but powerful. It is the Swiss Army knife for network operational data gathering, and when combined with Ansible's templating and filtering capabilities, it becomes a foundation for comprehensive network monitoring and verification automation.
