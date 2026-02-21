# How to Use Ansible Facts to Get OS Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Facts, Operating System, System Administration

Description: How to use Ansible facts to detect operating system details like distribution, version, kernel, and architecture on managed hosts.

---

Ansible collects detailed operating system information during fact gathering. This data is essential for writing playbooks that work across different Linux distributions, handle version-specific quirks, and adapt configurations to the target platform. Instead of hardcoding OS-specific logic, you let the facts drive the decisions.

## OS Facts Overview

When Ansible gathers facts, it populates several OS-related keys in the `ansible_facts` dictionary. Here is a quick reference of the most useful ones.

```yaml
# os-facts-overview.yml
# Displays all major OS-related facts
---
- name: Show OS facts
  hosts: all
  gather_facts: yes
  tasks:
    - name: Display OS information
      ansible.builtin.debug:
        msg:
          - "distribution: {{ ansible_facts['distribution'] }}"
          - "distribution_version: {{ ansible_facts['distribution_version'] }}"
          - "distribution_major_version: {{ ansible_facts['distribution_major_version'] }}"
          - "distribution_release: {{ ansible_facts['distribution_release'] }}"
          - "distribution_file_variety: {{ ansible_facts['distribution_file_variety'] }}"
          - "os_family: {{ ansible_facts['os_family'] }}"
          - "system: {{ ansible_facts['system'] }}"
          - "kernel: {{ ansible_facts['kernel'] }}"
          - "kernel_version: {{ ansible_facts['kernel_version'] }}"
          - "architecture: {{ ansible_facts['architecture'] }}"
          - "machine: {{ ansible_facts['machine'] }}"
          - "python_version: {{ ansible_facts['python_version'] }}"
          - "pkg_mgr: {{ ansible_facts['pkg_mgr'] }}"
          - "service_mgr: {{ ansible_facts['service_mgr'] }}"
```

Running this on different hosts produces different output. On an Ubuntu 22.04 server you would see `distribution: Ubuntu`, `distribution_version: 22.04`, `os_family: Debian`. On a Rocky Linux 9 server you would see `distribution: Rocky`, `distribution_version: 9.3`, `os_family: RedHat`.

## Common OS Fact Values

Here is what the key facts look like across popular distributions.

| Distribution | distribution | os_family | pkg_mgr | service_mgr |
|---|---|---|---|---|
| Ubuntu 22.04 | Ubuntu | Debian | apt | systemd |
| Debian 12 | Debian | Debian | apt | systemd |
| RHEL 9 | RedHat | RedHat | dnf | systemd |
| Rocky Linux 9 | Rocky | RedHat | dnf | systemd |
| AlmaLinux 9 | AlmaLinux | RedHat | dnf | systemd |
| CentOS Stream 9 | CentOS | RedHat | dnf | systemd |
| Amazon Linux 2023 | Amazon | RedHat | dnf | systemd |
| SUSE 15 | SLES | Suse | zypper | systemd |
| Fedora 39 | Fedora | RedHat | dnf | systemd |
| Arch Linux | Archlinux | Archlinux | pacman | systemd |

## Writing Cross-Platform Playbooks

The most common use of OS facts is writing playbooks that handle multiple distributions.

```yaml
# cross-platform-install.yml
# Installs packages using the correct package manager based on OS facts
---
- name: Install development tools on any Linux distro
  hosts: all
  become: yes
  gather_facts: yes
  tasks:
    - name: Install on Debian/Ubuntu
      ansible.builtin.apt:
        name:
          - build-essential
          - git
          - curl
          - vim
        state: present
        update_cache: yes
      when: ansible_facts['os_family'] == "Debian"

    - name: Install on RHEL/CentOS/Rocky
      ansible.builtin.dnf:
        name:
          - "@Development Tools"
          - git
          - curl
          - vim
        state: present
      when:
        - ansible_facts['os_family'] == "RedHat"
        - ansible_facts['distribution_major_version'] | int >= 8

    - name: Install on older RHEL/CentOS (yum)
      ansible.builtin.yum:
        name:
          - "@Development Tools"
          - git
          - curl
          - vim
        state: present
      when:
        - ansible_facts['os_family'] == "RedHat"
        - ansible_facts['distribution_major_version'] | int < 8

    - name: Install on SUSE
      community.general.zypper:
        name:
          - git
          - curl
          - vim
        state: present
      when: ansible_facts['os_family'] == "Suse"
```

## Using the package Module for Simplicity

For packages with the same name across distributions, the `package` module auto-detects the package manager.

```yaml
# generic-package.yml
# The package module uses pkg_mgr fact to pick the right backend
---
- name: Install common packages using generic module
  hosts: all
  become: yes
  gather_facts: yes
  tasks:
    - name: Install packages (works on any distro)
      ansible.builtin.package:
        name:
          - git
          - curl
          - wget
        state: present

    - name: Show which package manager was used
      ansible.builtin.debug:
        msg: "Used package manager: {{ ansible_facts['pkg_mgr'] }}"
```

## Version-Specific Configuration

Different OS versions sometimes need different configuration file paths or syntax.

```yaml
# version-specific-config.yml
# Handles configuration differences between OS versions
---
- name: Configure SSH based on OS version
  hosts: all
  become: yes
  gather_facts: yes
  tasks:
    - name: Set SSH config path based on distribution
      ansible.builtin.set_fact:
        sshd_config_path: >-
          {{
            '/etc/ssh/sshd_config.d/99-hardening.conf'
            if (ansible_facts['distribution'] == 'Ubuntu' and
                ansible_facts['distribution_major_version'] | int >= 22)
            else '/etc/ssh/sshd_config'
          }}

    - name: Deploy SSH hardening config
      ansible.builtin.template:
        src: "sshd-hardening-{{ ansible_facts['os_family'] | lower }}.conf.j2"
        dest: "{{ sshd_config_path }}"
        mode: '0600'
      notify: restart sshd

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

## Grouping Hosts by OS Facts

Ansible has a `group_by` module that creates dynamic groups based on facts. This is powerful for applying role-based logic after initial fact gathering.

```yaml
# group-by-os.yml
# Creates dynamic groups based on OS facts for targeted configuration
---
- name: Create dynamic groups based on OS
  hosts: all
  gather_facts: yes
  tasks:
    - name: Group by OS family
      ansible.builtin.group_by:
        key: "os_{{ ansible_facts['os_family'] | lower }}"

    - name: Group by specific distribution and version
      ansible.builtin.group_by:
        key: "distro_{{ ansible_facts['distribution'] | lower }}_{{ ansible_facts['distribution_major_version'] }}"

- name: Configure Debian-family hosts
  hosts: os_debian
  become: yes
  tasks:
    - name: Configure apt unattended upgrades
      ansible.builtin.apt:
        name: unattended-upgrades
        state: present

- name: Configure RedHat-family hosts
  hosts: os_redhat
  become: yes
  tasks:
    - name: Configure dnf automatic updates
      ansible.builtin.dnf:
        name: dnf-automatic
        state: present
```

## Architecture-Specific Tasks

Some tasks depend on the CPU architecture, especially when downloading pre-built binaries.

```yaml
# arch-specific-download.yml
# Downloads the correct binary based on CPU architecture
---
- name: Install Go based on architecture
  hosts: all
  become: yes
  gather_facts: yes
  vars:
    go_version: "1.22.0"
    arch_map:
      x86_64: "amd64"
      aarch64: "arm64"
      armv7l: "armv6l"
  tasks:
    - name: Determine download architecture
      ansible.builtin.set_fact:
        go_arch: "{{ arch_map[ansible_facts['architecture']] | default('amd64') }}"

    - name: Download Go binary
      ansible.builtin.get_url:
        url: "https://go.dev/dl/go{{ go_version }}.linux-{{ go_arch }}.tar.gz"
        dest: "/tmp/go{{ go_version }}.tar.gz"
        mode: '0644'

    - name: Extract Go to /usr/local
      ansible.builtin.unarchive:
        src: "/tmp/go{{ go_version }}.tar.gz"
        dest: /usr/local
        remote_src: yes
```

## Kernel Version Checks

Kernel facts help when you need to verify that a minimum kernel version is present before applying certain configurations.

```yaml
# kernel-checks.yml
# Validates kernel version before applying kernel-dependent config
---
- name: Check kernel requirements
  hosts: all
  gather_facts: yes
  tasks:
    - name: Show kernel info
      ansible.builtin.debug:
        msg:
          - "Kernel: {{ ansible_facts['kernel'] }}"
          - "Kernel version: {{ ansible_facts['kernel_version'] }}"

    - name: Fail if kernel is too old for eBPF features
      ansible.builtin.fail:
        msg: "Kernel {{ ansible_facts['kernel'] }} is too old. Need 5.10+"
      when: ansible_facts['kernel'] is version('5.10', '<')

    - name: Enable BPF-based security monitoring
      ansible.builtin.copy:
        src: bpf-security.conf
        dest: /etc/security/bpf-security.conf
      when: ansible_facts['kernel'] is version('5.10', '>=')
```

## OS Facts in Templates

Templates can reference OS facts to generate platform-appropriate configuration files.

```jinja2
{# templates/system-report.txt.j2 #}
{# Generates a system report that includes OS information #}
System Report for {{ ansible_facts['hostname'] }}
Generated: {{ ansible_date_time.iso8601 }}

Operating System:
  Distribution: {{ ansible_facts['distribution'] }} {{ ansible_facts['distribution_version'] }}
  OS Family: {{ ansible_facts['os_family'] }}
  Kernel: {{ ansible_facts['kernel'] }}
  Architecture: {{ ansible_facts['architecture'] }}

Package Management:
  Package Manager: {{ ansible_facts['pkg_mgr'] }}
  Service Manager: {{ ansible_facts['service_mgr'] }}

Python:
  Version: {{ ansible_facts['python_version'] }}
  Executable: {{ ansible_facts['python']['executable'] }}

{% if ansible_facts['os_family'] == 'Debian' %}
APT Sources: Check /etc/apt/sources.list
{% elif ansible_facts['os_family'] == 'RedHat' %}
YUM/DNF Repos: Check /etc/yum.repos.d/
{% endif %}
```

## Asserting OS Requirements

Use the `assert` module to enforce OS requirements at the start of a playbook.

```yaml
# assert-os-requirements.yml
# Validates that hosts meet OS requirements before proceeding
---
- name: Validate OS requirements
  hosts: all
  gather_facts: yes
  tasks:
    - name: Check supported operating systems
      ansible.builtin.assert:
        that:
          - ansible_facts['os_family'] in ['Debian', 'RedHat']
          - ansible_facts['distribution_major_version'] | int >= 8 or ansible_facts['os_family'] == 'Debian'
          - ansible_facts['architecture'] in ['x86_64', 'aarch64']
        fail_msg: >
          Unsupported platform: {{ ansible_facts['distribution'] }}
          {{ ansible_facts['distribution_version'] }}
          ({{ ansible_facts['architecture'] }})
        success_msg: >
          Platform OK: {{ ansible_facts['distribution'] }}
          {{ ansible_facts['distribution_version'] }}
```

## Summary

Ansible OS facts are the foundation for writing portable, adaptive playbooks. Use `os_family` for broad platform targeting, `distribution` and `distribution_version` for specific distro handling, `architecture` for binary downloads, and `kernel` for feature-dependent tasks. By letting facts drive your logic instead of hardcoding hostnames or group memberships, your playbooks become resilient to infrastructure changes and work correctly across mixed-OS environments.
