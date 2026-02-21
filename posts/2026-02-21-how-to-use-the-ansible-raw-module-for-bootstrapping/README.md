# How to Use the Ansible raw Module for Bootstrapping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Raw Module, Bootstrapping, Python

Description: Learn how to use the Ansible raw module to bootstrap remote hosts that lack Python, configure network devices, and handle minimal environments.

---

Most Ansible modules require Python on the target host. But what happens when you need to manage a host that does not have Python installed yet? Or a network device that will never have Python? That is where the `raw` module comes in. It sends commands over SSH without any module wrapper, making it the tool you reach for when nothing else works.

## Why the raw Module Exists

Ansible modules are Python scripts that get copied to the remote host and executed there. This means the target needs Python. The `raw` module bypasses this entirely. It just sends your command string over the SSH connection and captures the output. No Python required on the remote end.

Common use cases:

- Installing Python on a fresh host so other modules can work
- Managing network devices (switches, routers) that run proprietary operating systems
- Working with minimal Docker containers or embedded systems
- Emergency fixes on broken systems where Python is damaged

## Basic Bootstrap: Installing Python

The classic bootstrapping scenario is installing Python on a brand new server.

```yaml
# bootstrap_python.yml - Install Python on a fresh host
---
- name: Bootstrap Python on new hosts
  hosts: new_servers
  gather_facts: false  # Can't gather facts without Python!

  tasks:
    - name: Check if Python is available
      ansible.builtin.raw: python3 --version
      register: python_check
      changed_when: false
      failed_when: false

    - name: Install Python on Debian/Ubuntu
      ansible.builtin.raw: |
        apt-get update -qq && apt-get install -y -qq python3 python3-apt
      when: python_check.rc != 0

    - name: Install Python on RHEL/CentOS
      ansible.builtin.raw: |
        yum install -y python3
      when: python_check.rc != 0

    - name: Verify Python installation
      ansible.builtin.raw: python3 --version
      register: python_verify
      changed_when: false

    - name: Show Python version
      ansible.builtin.debug:
        msg: "Python version: {{ python_verify.stdout | trim }}"
```

Notice `gather_facts: false`. This is required because fact gathering runs a Python script on the remote host, which would fail if Python is not installed yet.

## Complete Server Bootstrap Playbook

In production, bootstrapping involves more than just Python. Here is a complete bootstrap sequence.

```yaml
# full_bootstrap.yml - Complete server bootstrap
---
- name: Phase 1 - Raw bootstrap (no Python required)
  hosts: new_servers
  gather_facts: false

  tasks:
    - name: Update package cache and install Python
      ansible.builtin.raw: |
        if command -v apt-get >/dev/null 2>&1; then
          apt-get update -qq
          apt-get install -y -qq python3 python3-apt sudo
        elif command -v yum >/dev/null 2>&1; then
          yum install -y python3 sudo
        elif command -v apk >/dev/null 2>&1; then
          apk add --no-cache python3 sudo
        fi
      register: install_result
      changed_when: install_result.rc == 0

    - name: Create ansible temp directory
      ansible.builtin.raw: "mkdir -p /root/.ansible/tmp && chmod 700 /root/.ansible/tmp"
      changed_when: false

    - name: Verify Python is working
      ansible.builtin.raw: python3 -c "import json; print(json.dumps({'status': 'ok'}))"
      register: python_test
      changed_when: false
      failed_when: "'ok' not in python_test.stdout"

- name: Phase 2 - Standard Ansible (Python available)
  hosts: new_servers
  gather_facts: true  # Now we can gather facts

  tasks:
    - name: Display gathered facts
      ansible.builtin.debug:
        msg: "OS: {{ ansible_distribution }} {{ ansible_distribution_version }}"

    - name: Install additional packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - vim
          - htop
        state: present

    - name: Create admin user
      ansible.builtin.user:
        name: admin
        groups: sudo
        shell: /bin/bash
        create_home: yes
```

The two-play structure is key. The first play uses only `raw` with `gather_facts: false`. Once Python is installed, the second play can use all regular Ansible modules.

## Bootstrapping Docker Containers

Minimal Docker containers often lack Python. Bootstrap them before running regular playbooks against them.

```yaml
# bootstrap_docker.yml - Bootstrap minimal Docker containers
---
- name: Bootstrap Docker containers for Ansible management
  hosts: containers
  gather_facts: false
  connection: docker  # or community.docker.docker

  tasks:
    - name: Install Python in Alpine container
      ansible.builtin.raw: apk add --no-cache python3
      when: "'alpine' in inventory_hostname"

    - name: Install Python in Debian slim container
      ansible.builtin.raw: |
        apt-get update -qq
        apt-get install -y -qq python3
        rm -rf /var/lib/apt/lists/*
      when: "'debian' in inventory_hostname"

    - name: Install Python in CentOS minimal container
      ansible.builtin.raw: dnf install -y python3
      when: "'centos' in inventory_hostname"
```

## Managing Network Devices

Network devices like Cisco IOS, Junos, or Arista EOS do not run Python. The `raw` module lets you send CLI commands directly.

```yaml
# network_devices.yml - Send commands to network devices
---
- name: Configure network devices
  hosts: switches
  gather_facts: false

  tasks:
    - name: Show running config on switch
      ansible.builtin.raw: show running-config
      register: running_config
      changed_when: false

    - name: Show interface status
      ansible.builtin.raw: show ip interface brief
      register: interfaces
      changed_when: false

    - name: Display interface info
      ansible.builtin.debug:
        msg: "{{ interfaces.stdout_lines }}"

    - name: Configure VLAN
      ansible.builtin.raw: |
        configure terminal
        vlan 100
        name Production
        exit
        exit
        write memory
      register: vlan_config
      changed_when: "'VLAN 100' not in running_config.stdout"
```

For serious network automation, you should use the dedicated network modules (`ios_config`, `nxos_config`, etc.). But `raw` is useful for quick tasks or when dedicated modules are not available for your platform.

## Error Handling with raw

The `raw` module has limited error detection compared to regular modules. You need to be more explicit about what constitutes failure.

```yaml
# raw_error_handling.yml - Handling errors with raw module
---
- name: Error handling with raw module
  hosts: new_servers
  gather_facts: false

  tasks:
    - name: Try to install Python with error checking
      ansible.builtin.raw: |
        apt-get update && apt-get install -y python3
        echo "EXIT_CODE=$?"
      register: install_result
      failed_when: "'EXIT_CODE=0' not in install_result.stdout"

    - name: Check if a service is running
      ansible.builtin.raw: "systemctl is-active sshd"
      register: sshd_status
      changed_when: false
      failed_when: false

    - name: Report service status
      ansible.builtin.debug:
        msg: "SSH daemon is {{ 'running' if sshd_status.rc == 0 else 'not running' }}"

    - name: Run command with timeout
      ansible.builtin.raw: "timeout 30 apt-get update"
      register: update_result
      failed_when: update_result.rc == 124  # timeout returns 124
```

## Using raw with become

You can use privilege escalation with `raw`, but it works differently than with other modules.

```yaml
# raw_with_become.yml - Using become with raw module
---
- name: Raw module with privilege escalation
  hosts: new_servers
  gather_facts: false

  tasks:
    - name: Install Python as root via sudo
      ansible.builtin.raw: "sudo apt-get update && sudo apt-get install -y python3"
      become: false  # Handle sudo in the command itself
      # OR
    - name: Install Python with Ansible become
      ansible.builtin.raw: "apt-get update && apt-get install -y python3"
      become: yes
      become_method: sudo
```

## Conditional Bootstrap Based on OS Detection

Without Python and fact gathering, you need to detect the OS using raw commands.

```yaml
# detect_and_bootstrap.yml - Detect OS and bootstrap accordingly
---
- name: Detect OS and bootstrap Python
  hosts: new_servers
  gather_facts: false

  tasks:
    - name: Detect OS family
      ansible.builtin.raw: |
        if [ -f /etc/debian_version ]; then
          echo "DEBIAN"
        elif [ -f /etc/redhat-release ]; then
          echo "REDHAT"
        elif [ -f /etc/alpine-release ]; then
          echo "ALPINE"
        elif [ -f /etc/SuSE-release ] || [ -f /etc/SUSE-brand ]; then
          echo "SUSE"
        else
          echo "UNKNOWN"
        fi
      register: os_family
      changed_when: false

    - name: Set OS family fact
      ansible.builtin.set_fact:
        detected_os: "{{ os_family.stdout | trim }}"

    - name: Bootstrap Debian-based systems
      ansible.builtin.raw: "apt-get update -qq && apt-get install -y -qq python3 python3-apt"
      when: detected_os == "DEBIAN"

    - name: Bootstrap RedHat-based systems
      ansible.builtin.raw: "yum install -y python3"
      when: detected_os == "REDHAT"

    - name: Bootstrap Alpine systems
      ansible.builtin.raw: "apk add --no-cache python3"
      when: detected_os == "ALPINE"

    - name: Bootstrap SUSE systems
      ansible.builtin.raw: "zypper install -y python3"
      when: detected_os == "SUSE"

    - name: Fail for unknown OS
      ansible.builtin.fail:
        msg: "Unknown OS family: {{ detected_os }}"
      when: detected_os == "UNKNOWN"
```

## raw Module Limitations

There are important limitations to understand:

```yaml
# limitations.yml - Things raw module cannot do
---
- name: Understanding raw module limitations
  hosts: new_servers
  gather_facts: false

  tasks:
    # raw does NOT support these parameters:
    # - creates (no idempotency check)
    # - removes (no conditional check)
    # - chdir (no working directory)

    # Workaround for creates-like behavior
    - name: Check before acting (manual idempotency)
      ansible.builtin.raw: "test -f /usr/bin/python3 && echo EXISTS || echo MISSING"
      register: python_exists
      changed_when: false

    - name: Only install if missing
      ansible.builtin.raw: "apt-get update -qq && apt-get install -y -qq python3"
      when: "'MISSING' in python_exists.stdout"

    # Workaround for chdir
    - name: Change directory within the command
      ansible.builtin.raw: "cd /opt/myapp && ls -la"
      changed_when: false
```

## Summary

The `raw` module is a specialized tool for situations where Python is not available on the target host. Its primary use case is bootstrapping new servers by installing Python, after which you switch to regular Ansible modules. Use the two-play pattern: first play with `raw` and `gather_facts: false`, second play with standard modules and fact gathering enabled. The `raw` module also works for managing network devices and other systems that will never have Python. Just remember that it lacks the idempotency features (`creates`, `removes`) of the `command` module, so you need to build your own checks.
