# How to Use Ansible httpapi Connection Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Httpapi, REST API, Network Automation

Description: Learn how to use the Ansible httpapi connection plugin to automate network devices through their REST APIs for faster, structured management.

---

The httpapi connection plugin is Ansible's way of talking to network devices through their HTTP(S)-based APIs instead of CLI over SSH. Platforms like Arista EOS (eAPI), Cisco NX-OS (NX-API), Cisco FTD, and F5 BIG-IP expose API interfaces that can return structured data. Using httpapi instead of network_cli can give you cleaner data, better performance, and access to API-only features.

This post explains how the httpapi plugin works, how to configure it for different platforms, and when to choose it over other connection types.

## How httpapi Differs from network_cli

With `network_cli`, Ansible opens an SSH session and types commands into the CLI, just like a human would. Command responses often come back as raw text that needs parsing unless the module or platform requests structured output.

With `httpapi`, Ansible sends HTTP/HTTPS requests to the platform API endpoint. Responses can come back as structured JSON when the platform and module support it.

```mermaid
sequenceDiagram
    participant A as Ansible
    participant D as Device (httpapi)

    A->>D: HTTPS POST /command-api
    Note right of A: {"jsonrpc": "2.0", "method": "runCmds"}
    D->>A: JSON Response
    Note left of D: {"result": [{"modelName": "..."}]}
```

The key benefits:

- **Structured responses** - JSON output where the platform and module support it
- **Performance** - HTTPS can be faster than SSH for bulk operations
- **API-only features** - Some configuration options are only available through the API
- **Parallel requests** - HTTP connections can be more efficient at scale

## Configuring httpapi for Arista EOS

Arista EOS exposes its API through eAPI. Here is how to set it up.

First, make sure eAPI is enabled on the switch.

```text
! Enable eAPI on the Arista switch
management api http-commands
   no shutdown
   protocol https
```

Then configure your Ansible inventory.

```yaml
# inventory/eos_switches.yml - Arista EOS with httpapi

---
all:
  children:
    eos_switches:
      hosts:
        spine1:
          ansible_host: 10.1.1.1
        spine2:
          ansible_host: 10.1.1.2
        leaf1:
          ansible_host: 10.1.2.1
        leaf2:
          ansible_host: 10.1.2.2
      vars:
        ansible_connection: ansible.netcommon.httpapi
        ansible_network_os: arista.eos.eos
        ansible_user: admin
        ansible_password: "{{ vault_eos_password }}"
        # HTTPS settings
        ansible_httpapi_use_ssl: true
        ansible_httpapi_validate_certs: false
        ansible_httpapi_port: 443
        # Enable mode
        ansible_become: true
        ansible_become_method: enable
```

## Configuring httpapi for Cisco NX-OS

Cisco NX-OS supports NX-API, which works similarly.

Enable NX-API on the Nexus switch.

```text
! Enable NX-API on the Nexus switch
feature nxapi
nxapi https port 443
```

```yaml
# inventory/nxos_switches.yml - Cisco NX-OS with httpapi
---
all:
  children:
    nxos_switches:
      hosts:
        nexus1:
          ansible_host: 10.2.1.1
        nexus2:
          ansible_host: 10.2.1.2
      vars:
        ansible_connection: ansible.netcommon.httpapi
        ansible_network_os: cisco.nxos.nxos
        ansible_user: admin
        ansible_password: "{{ vault_nxos_password }}"
        ansible_httpapi_use_ssl: true
        ansible_httpapi_validate_certs: false
        ansible_httpapi_port: 443
```

## Working with EOS via httpapi

Once httpapi is configured, use modules that support the eAPI transport. Command and configuration modules support eAPI; some resource modules are documented for `network_cli`, so check the module notes before switching a playbook.

```yaml
# eos_httpapi_playbook.yml - Manage Arista EOS through eAPI
---
- name: Configure EOS via httpapi
  hosts: eos_switches
  gather_facts: false

  tasks:
    # Configure VLANs with eos_config over eAPI
    - name: Configure VLANs
      arista.eos.eos_config:
        lines:
          - name PRODUCTION
          - state active
        parents: vlan 100
      register: vlan_result

    - name: Show VLAN changes
      ansible.builtin.debug:
        var: vlan_result.commands
      when: vlan_result.changed

    - name: Configure additional VLANs
      arista.eos.eos_config:
        lines:
          - "name {{ item.name }}"
          - state active
        parents: "vlan {{ item.vlan_id }}"
      loop:
        - vlan_id: 200
          name: DEVELOPMENT
        - vlan_id: 300
          name: MANAGEMENT

    # Run show commands with JSON output
    - name: Get version info
      arista.eos.eos_command:
        commands:
          - command: show version
            output: json
      register: version

    - name: Display model info
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: {{ version.stdout[0].modelName }} running EOS {{ version.stdout[0].version }}"

    # Configure interfaces with eos_config
    - name: Configure interfaces
      arista.eos.eos_config:
        lines:
          - description Server Port 1
          - mtu 9214
          - no shutdown
        parents: interface Ethernet1

    - name: Configure second interface
      arista.eos.eos_config:
        lines:
          - description Server Port 2
          - mtu 9214
          - no shutdown
        parents: interface Ethernet2
```

## Working with NX-OS via httpapi

The same general approach works for NX-OS. Many NX-OS modules support both CLI and NX-API, but returned data formats can differ, so check the module and platform notes.

```yaml
# nxos_httpapi_playbook.yml - Manage NX-OS through NX-API
---
- name: Configure NX-OS via httpapi
  hosts: nxos_switches
  gather_facts: false

  tasks:
    # Configure VLANs on NX-OS
    - name: Configure VLANs
      cisco.nxos.nxos_vlans:
        config:
          - vlan_id: 100
            name: PRODUCTION
            enabled: true
          - vlan_id: 200
            name: DEVELOPMENT
            enabled: true
        state: merged

    # NX-API returns JSON natively for show commands
    - name: Get interface information
      cisco.nxos.nxos_command:
        commands:
          - command: show interface brief
            output: json
      register: nxos_interfaces

    - name: Display interface data
      ansible.builtin.debug:
        var: nxos_interfaces.stdout[0]

    # Configure features
    - name: Enable required features
      cisco.nxos.nxos_feature:
        feature: "{{ item }}"
        state: enabled
      loop:
        - ospf
        - bgp
        - interface-vlan
        - lacp
        - vpc

    # Configure L3 interfaces
    - name: Configure L3 interfaces
      cisco.nxos.nxos_l3_interfaces:
        config:
          - name: Vlan100
            ipv4:
              - address: 10.100.0.1/24
          - name: Vlan200
            ipv4:
              - address: 10.200.0.1/24
        state: merged
```

## httpapi-Specific Variables

The httpapi plugin supports several connection tuning variables.

```yaml
# group_vars/httpapi_devices.yml - httpapi connection tuning
---
# Basic authentication
ansible_connection: ansible.netcommon.httpapi
ansible_user: admin
ansible_password: "{{ vault_password }}"

# SSL/TLS settings
ansible_httpapi_use_ssl: true
ansible_httpapi_validate_certs: true
ansible_httpapi_ca_path: /etc/ssl/certs/ca-certificates.crt

# Port configuration (defaults to 80 for HTTP, 443 for HTTPS)
ansible_httpapi_port: 443

# Connection timeouts
ansible_connect_timeout: 30
ansible_command_timeout: 60

# Custom User-Agent if needed
# ansible_httpapi_http_agent: "ansible-httpapi"

# Use proxy settings
# ansible_httpapi_use_proxy: true
```

## Token-Based Authentication

Some httpapi implementations support a session key for token-style authentication.

```yaml
# token_auth.yml - Use token-based authentication with httpapi
---
- name: Configure device with token authentication
  hosts: api_devices
  gather_facts: false
  connection: ansible.netcommon.httpapi

  vars:
    ansible_httpapi_use_ssl: true
    ansible_httpapi_validate_certs: false
    ansible_httpapi_session_key:
      Authorization: "Bearer {{ vault_api_token }}"

  tasks:
    # For platform plugins that support session keys,
    # ansible_httpapi_session_key is used instead of the password.

    - name: Run commands using token auth
      arista.eos.eos_command:
        commands:
          - show running-config
      register: config
```

## Performance Comparison

Here is a practical comparison of httpapi vs network_cli for common operations.

```yaml
# benchmark.yml - Compare httpapi vs network_cli performance
---
- name: Benchmark httpapi performance
  hosts: eos_httpapi_group
  gather_facts: false
  connection: ansible.netcommon.httpapi

  tasks:
    - name: Start timer
      ansible.builtin.set_fact:
        start_time: "{{ lookup('pipe', 'date +%s%N') }}"

    - name: Gather device facts via httpapi
      arista.eos.eos_facts:
        gather_subset:
          - min
        gather_network_resources:
          - interfaces
          - vlans
      register: httpapi_facts

    - name: Calculate httpapi duration
      ansible.builtin.debug:
        msg: "httpapi gather_facts took {{ ((lookup('pipe', 'date +%s%N') | int - start_time | int) / 1000000) | round(0) }}ms"

- name: Benchmark network_cli performance
  hosts: eos_cli_group
  gather_facts: false
  connection: ansible.netcommon.network_cli

  tasks:
    - name: Start timer
      ansible.builtin.set_fact:
        start_time: "{{ lookup('pipe', 'date +%s%N') }}"

    - name: Gather device facts via CLI
      arista.eos.eos_facts:
        gather_subset:
          - min
        gather_network_resources:
          - interfaces
          - vlans
      register: cli_facts

    - name: Calculate CLI duration
      ansible.builtin.debug:
        msg: "network_cli gather_facts took {{ ((lookup('pipe', 'date +%s%N') | int - start_time | int) / 1000000) | round(0) }}ms"
```

## Troubleshooting httpapi Connections

When httpapi connections fail, here are common debugging steps.

```yaml
# debug_httpapi.yml - Troubleshoot httpapi connection issues
---
- name: Debug httpapi connection
  hosts: problem_device
  gather_facts: false
  connection: ansible.netcommon.httpapi

  vars:
    # Enable verbose HTTP logging
    ansible_httpapi_use_ssl: true
    ansible_httpapi_validate_certs: false

  tasks:
    # Test basic connectivity
    - name: Simple command to test connection
      arista.eos.eos_command:
        commands:
          - show hostname
      register: hostname_test
      ignore_errors: true

    - name: Display connection test result
      ansible.builtin.debug:
        msg: "{{ 'Connection successful' if hostname_test is succeeded else 'Connection FAILED: ' + (hostname_test.msg | default('unknown')) }}"
```

Run with verbose output to see the HTTP requests.

```bash
# Run with extra verbosity to see HTTP request/response details
ansible-playbook debug_httpapi.yml -vvvv
```

## When to Use httpapi

Use httpapi when:

- The device has a well-supported REST API
- You want structured JSON responses without parsing
- You need better performance for bulk operations
- The API exposes features not available via CLI

Use network_cli when:

- The device does not have a REST API
- You need to run arbitrary CLI commands that are not covered by modules
- The httpapi plugin for your platform is immature or buggy
- You are troubleshooting and need raw CLI interaction

The httpapi connection plugin represents the modern approach to network automation. Structured data, better performance, and cleaner integration. If your devices support it, there is little reason not to use it.
