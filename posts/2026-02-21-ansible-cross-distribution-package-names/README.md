# How to Use Ansible to Handle Cross-Distribution Package Names

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Linux, Cross-Platform, Package Management, Variables

Description: Map package names across Linux distributions in Ansible so your playbooks work on Debian, RHEL, SUSE, and Arch without modification.

---

One of the biggest headaches in cross-distribution Ansible playbooks is package naming. The same software has different package names across distributions: `httpd` on RHEL vs `apache2` on Debian, `vim-enhanced` on RHEL vs `vim` on Debian, `bind-utils` on RHEL vs `dnsutils` on Debian. This guide shows you how to handle these differences cleanly.

## The Problem

Consider this simple task:

```yaml
# This only works on RHEL-family
- name: Install web server
  ansible.builtin.package:
    name: httpd
    state: present
```

This fails on Debian because the package is called `apache2`. The naive fix is to add conditionals everywhere, but that gets messy fast.

## Solution 1: Variable Maps

The cleanest approach is a variable mapping file per distribution family:

Create `vars/packages_debian.yml`:

```yaml
# vars/packages_debian.yml
pkg_web_server: apache2
pkg_web_service: apache2
pkg_firewall: ufw
pkg_ntp: chrony
pkg_dns_utils: dnsutils
pkg_net_tools: net-tools
pkg_editor: vim
pkg_python3: python3
pkg_pip: python3-pip
pkg_selinux_utils: ""
pkg_dev_tools:
  - build-essential
  - gcc
  - make
```

Create `vars/packages_redhat.yml`:

```yaml
# vars/packages_redhat.yml
pkg_web_server: httpd
pkg_web_service: httpd
pkg_firewall: firewalld
pkg_ntp: chrony
pkg_dns_utils: bind-utils
pkg_net_tools: net-tools
pkg_editor: vim-enhanced
pkg_python3: python3
pkg_pip: python3-pip
pkg_selinux_utils: policycoreutils-python-utils
pkg_dev_tools:
  - gcc
  - gcc-c++
  - make
  - "@Development Tools"
```

Create `vars/packages_suse.yml`:

```yaml
# vars/packages_suse.yml
pkg_web_server: apache2
pkg_web_service: apache2
pkg_firewall: firewalld
pkg_ntp: chrony
pkg_dns_utils: bind-utils
pkg_net_tools: net-tools
pkg_editor: vim
pkg_python3: python3
pkg_pip: python3-pip
pkg_selinux_utils: ""
pkg_dev_tools:
  - gcc
  - gcc-c++
  - make
  - patterns-devel-base-devel_basis
```

Load the right file based on the OS:

```yaml
---
# site.yml - Cross-distribution playbook
- name: Configure any Linux server
  hosts: all
  become: true

  pre_tasks:
    - name: Load distribution-specific package names
      ansible.builtin.include_vars: "packages_{{ ansible_os_family | lower }}.yml"

  tasks:
    - name: Install web server
      ansible.builtin.package:
        name: "{{ pkg_web_server }}"
        state: present

    - name: Install DNS utilities
      ansible.builtin.package:
        name: "{{ pkg_dns_utils }}"
        state: present

    - name: Install development tools
      ansible.builtin.package:
        name: "{{ pkg_dev_tools }}"
        state: present
```

## Solution 2: Dictionary-Based Mapping

For simpler cases, use an inline dictionary:

```yaml
---
- name: Install packages across distributions
  hosts: all
  become: true

  vars:
    package_map:
      web_server:
        Debian: apache2
        RedHat: httpd
        Suse: apache2
        Archlinux: apache
      dns_tools:
        Debian: dnsutils
        RedHat: bind-utils
        Suse: bind-utils
        Archlinux: bind
      firewall:
        Debian: ufw
        RedHat: firewalld
        Suse: firewalld
        Archlinux: nftables

  tasks:
    - name: Install web server
      ansible.builtin.package:
        name: "{{ package_map.web_server[ansible_os_family] }}"
        state: present

    - name: Install DNS tools
      ansible.builtin.package:
        name: "{{ package_map.dns_tools[ansible_os_family] }}"
        state: present
```

## Solution 3: Role Defaults with Overrides

In roles, set defaults per distribution in the `vars/` directory:

```
roles/webserver/
  defaults/
    main.yml
  vars/
    Debian.yml
    RedHat.yml
    Suse.yml
  tasks/
    main.yml
```

```yaml
# roles/webserver/tasks/main.yml
- name: Load OS-specific variables
  ansible.builtin.include_vars: "{{ ansible_os_family }}.yml"

- name: Install web server packages
  ansible.builtin.package:
    name: "{{ webserver_packages }}"
    state: present
```

```yaml
# roles/webserver/vars/Debian.yml
webserver_packages:
  - apache2
  - apache2-utils
  - libapache2-mod-security2
```

```yaml
# roles/webserver/vars/RedHat.yml
webserver_packages:
  - httpd
  - httpd-tools
  - mod_security
```

## Common Package Name Mapping Reference

Here is a reference table of commonly used packages across distributions:

| Purpose | Debian/Ubuntu | RHEL/CentOS/Rocky | SUSE/openSUSE | Arch |
|---------|--------------|-------------------|---------------|------|
| Apache | apache2 | httpd | apache2 | apache |
| Nginx | nginx | nginx | nginx | nginx |
| SSH Server | openssh-server | openssh-server | openssh | openssh |
| DNS Lookup | dnsutils | bind-utils | bind-utils | bind |
| Editor | vim | vim-enhanced | vim | vim |
| NTP | chrony | chrony | chrony | chrony |
| Python 3 | python3 | python3 | python3 | python |
| pip | python3-pip | python3-pip | python3-pip | python-pip |
| Build Tools | build-essential | gcc make | gcc make | base-devel |
| SELinux | selinux-utils | policycoreutils-python-utils | N/A | N/A |
| Firewall | ufw | firewalld | firewalld | nftables |

## Using the package Module

The `ansible.builtin.package` module is distribution-agnostic. It detects the OS and calls the right package manager:

```yaml
# This works on any distribution (if the package name matches)
- name: Install packages that have the same name everywhere
  ansible.builtin.package:
    name:
      - git
      - curl
      - wget
      - tmux
      - jq
    state: present
```

Many packages share the same name across distributions. Only map the ones that differ.

## Summary

Handling cross-distribution package names in Ansible comes down to variable-based mapping. Use distribution-family variable files for large playbooks, inline dictionaries for simple cases, or role `vars/` directories for reusable roles. The `ansible_os_family` fact is your key differentiator. Combine this with `ansible.builtin.package` for distribution-agnostic package installation, and you get playbooks that work across Debian, RHEL, SUSE, and Arch without duplication.

## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```

