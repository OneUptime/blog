# How to Handle Ansible Connection Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Timeouts, Networking

Description: Learn how to configure and troubleshoot Ansible connection timeouts for SSH, WinRM, and persistent connections.

---

Connection timeouts are one of the most common issues in Ansible, especially when managing hosts across multiple networks, cloud regions, or through VPNs. When Ansible cannot establish a connection to a managed host within the configured time, it reports a timeout error and moves on (or fails, depending on your configuration). Understanding the different timeout knobs and when to use them is essential for reliable automation.

## Understanding Ansible Connection Timeouts

Ansible has several timeout settings that apply at different layers of the connection process. The most important ones are the SSH connection timeout, the persistent connection timeout, and the command timeout for network devices.

Here is a visual overview of where each timeout applies:

```mermaid
flowchart LR
    A[Ansible Controller] -->|Connection Timeout| B[SSH/WinRM Handshake]
    B -->|Established| C[Remote Shell]
    C -->|Command Timeout| D[Task Execution]
    B -->|Persistent Connection| E[Connection Pool]
    E -->|Connect Timeout| F[Reuse Connection]
```

## Configuring SSH Connection Timeout

The primary timeout setting for SSH connections is in `ansible.cfg`. This controls how long Ansible waits when trying to establish an SSH session.

```ini
# ansible.cfg - SSH connection timeout configuration
[defaults]
# Time in seconds to wait for a connection to be established
# Default is 10 seconds, which is often too short for cloud instances
timeout = 30

[ssh_connection]
# Additional SSH arguments for fine-grained control
ssh_args = -o ConnectTimeout=30 -o ConnectionAttempts=3
# Pipelining reduces the number of SSH connections needed
pipelining = True
```

You can also set the timeout per host or group in your inventory:

```ini
# inventory/hosts.ini - Per-host timeout settings
[cloud_instances]
web1.example.com ansible_ssh_timeout=60
web2.example.com ansible_ssh_timeout=60

[cloud_instances:vars]
# All hosts in this group get a longer timeout
ansible_connection=ssh
ansible_ssh_common_args='-o ConnectTimeout=60'

[local_servers]
db1.internal ansible_ssh_timeout=10
db2.internal ansible_ssh_timeout=10
```

## Handling Connection Timeouts with Retries

Network hiccups happen. Instead of failing immediately on the first timeout, you can configure retries at the task level.

This playbook demonstrates retry logic for unreliable connections:

```yaml
# retry-on-timeout.yml - Retrying tasks that fail due to connection issues
---
- name: Handle connection timeouts with retries
  hosts: remote_servers
  tasks:
    - name: Gather facts with retry on connection failure
      ansible.builtin.setup:
      register: setup_result
      retries: 3
      delay: 10
      until: setup_result is succeeded

    - name: Install package with connection retry
      ansible.builtin.apt:
        name: nginx
        state: present
      become: true
      register: install_result
      retries: 3
      delay: 15
      until: install_result is succeeded
```

## Waiting for Host Connectivity

A common scenario is running a playbook right after provisioning new instances. The instances might not be ready to accept SSH connections yet. The `wait_for_connection` module handles this.

This playbook waits for newly created instances to become reachable:

```yaml
# wait-for-host.yml - Wait for hosts to become available after provisioning
---
- name: Wait for new instances and configure them
  hosts: new_instances
  gather_facts: false    # Cannot gather facts if host is not up yet
  tasks:
    - name: Wait for SSH to become available
      ansible.builtin.wait_for_connection:
        delay: 10          # Wait 10 seconds before first attempt
        timeout: 300       # Give up after 5 minutes
        sleep: 5           # Check every 5 seconds
        connect_timeout: 10

    - name: Now gather facts
      ansible.builtin.setup:

    - name: Show that we are connected
      ansible.builtin.debug:
        msg: "Successfully connected to {{ inventory_hostname }} running {{ ansible_os_family }}"
```

You can also use `wait_for` to check port availability from the controller side:

```yaml
# wait-for-port.yml - Wait for specific port to be open
---
- name: Wait for SSH port from controller
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Wait for SSH port on target hosts
      ansible.builtin.wait_for:
        host: "{{ item }}"
        port: 22
        delay: 5
        timeout: 300
        state: started
      loop:
        - web1.example.com
        - web2.example.com
        - web3.example.com
```

## Persistent Connection Timeouts

For network devices that use persistent connections (like `network_cli` or `httpapi`), you need to configure additional timeout parameters.

```ini
# ansible.cfg - Persistent connection settings for network devices
[persistent_connection]
# How long to wait when establishing a new persistent connection
connect_timeout = 60

# How long to wait for a command response on an established connection
command_timeout = 60

# How long an idle connection stays in the pool before being closed
connect_retry_timeout = 30
```

Here is a playbook that configures a network switch with appropriate timeouts:

```yaml
# network-timeout.yml - Network device configuration with timeout handling
---
- name: Configure network switches
  hosts: switches
  gather_facts: false
  vars:
    ansible_connection: network_cli
    ansible_network_os: ios
    ansible_command_timeout: 120    # Some show commands take a while
    ansible_connect_timeout: 60
  tasks:
    - name: Get running config
      cisco.ios.ios_command:
        commands:
          - show running-config
      register: running_config

    - name: Apply configuration changes
      cisco.ios.ios_config:
        lines:
          - interface GigabitEthernet0/1
          - description Managed by Ansible
          - no shutdown
```

## WinRM Connection Timeouts

Windows hosts managed through WinRM have their own timeout considerations.

```ini
# ansible.cfg - WinRM timeout settings
[defaults]
timeout = 60

# You can also set these as inventory variables
```

```yaml
# inventory/windows.yml - Windows host inventory with timeout settings
---
windows_servers:
  hosts:
    win1.example.com:
    win2.example.com:
  vars:
    ansible_connection: winrm
    ansible_winrm_transport: kerberos
    ansible_winrm_operation_timeout_sec: 60
    ansible_winrm_read_timeout_sec: 120
    ansible_port: 5986
    ansible_winrm_server_cert_validation: ignore
```

## Diagnosing Connection Timeout Issues

When you hit connection timeouts, the first step is figuring out where the timeout is occurring. Ansible's verbose output helps.

Run your playbook with increased verbosity to see connection details:

```bash
# Run with verbose output to see SSH connection details
ansible-playbook deploy.yml -vvvv

# Test connectivity to a specific host
ansible web1.example.com -m ping -vvv

# Check SSH connection manually
ssh -o ConnectTimeout=10 -o ConnectionAttempts=1 -v user@web1.example.com
```

Common causes and their fixes:

```yaml
# diagnose-connectivity.yml - Playbook to diagnose connection issues
---
- name: Diagnose connection problems
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Check DNS resolution
      ansible.builtin.command: dig +short {{ target_host }}
      register: dns_result
      changed_when: false

    - name: Check port reachability
      ansible.builtin.wait_for:
        host: "{{ target_host }}"
        port: 22
        timeout: 10
        state: started
      register: port_check
      ignore_errors: true

    - name: Report DNS status
      ansible.builtin.debug:
        msg: "DNS resolves {{ target_host }} to: {{ dns_result.stdout }}"

    - name: Report port status
      ansible.builtin.debug:
        msg: "Port 22 on {{ target_host }}: {{ 'OPEN' if port_check is succeeded else 'CLOSED or FILTERED' }}"
```

## Connection Timeout Strategy for Mixed Environments

In a real infrastructure, you probably have hosts with different network characteristics. Local servers respond fast, cloud instances are slower, and VPN-connected sites might be unreliable.

This inventory layout applies different timeouts to different groups:

```yaml
# inventory/all.yml - Different timeouts for different network zones
---
all:
  children:
    datacenter:
      vars:
        ansible_ssh_timeout: 10
        ansible_ssh_common_args: '-o ConnectTimeout=10'
      hosts:
        dc-web1.internal:
        dc-db1.internal:

    cloud_aws:
      vars:
        ansible_ssh_timeout: 30
        ansible_ssh_common_args: '-o ConnectTimeout=30 -o ConnectionAttempts=3'
      hosts:
        ec2-web1.compute.amazonaws.com:
        ec2-web2.compute.amazonaws.com:

    vpn_remote:
      vars:
        ansible_ssh_timeout: 60
        ansible_ssh_common_args: '-o ConnectTimeout=60 -o ServerAliveInterval=15 -o ServerAliveCountMax=3'
      hosts:
        remote-office-fw.example.com:
```

## Summary

Connection timeouts in Ansible span multiple layers: SSH handshake, persistent connection pools, WinRM operations, and more. The right timeout values depend on your network topology and the reliability of your connections. Start with sensible defaults in `ansible.cfg`, override per group or host when needed, and always use `wait_for_connection` when targeting newly provisioned hosts. When debugging, use verbose mode (`-vvvv`) to see exactly where the connection is stalling. Combining proper timeouts with retry logic gives you resilient playbooks that can handle the messy reality of real-world networks.
