# How to Use Ansible to Manage OpenBSD Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, OpenBSD, BSD, Security, Server Configuration

Description: Manage OpenBSD servers with Ansible using pkg_add, rcctl service management, and OpenBSD's security-focused configuration.

---

OpenBSD is the security-focused BSD distribution known for its audit-first approach and clean code. It powers many firewalls, VPN gateways, and security appliances. Managing OpenBSD with Ansible requires understanding its unique tools: `pkg_add` for packages, `rcctl` for services, `pf` for firewalling, and `doas` instead of sudo.

## Prerequisites

OpenBSD needs Python installed. Bootstrap it:

```yaml
---
- name: Bootstrap OpenBSD
  hosts: openbsd
  gather_facts: false
  become: true
  become_method: doas
  tasks:
    - name: Install Python 3
      ansible.builtin.raw: pkg_add python3
      changed_when: true
```

## Inventory

```ini
[openbsd]
obsd-fw01 ansible_host=10.0.12.10

[openbsd:vars]
ansible_user=admin
ansible_python_interpreter=/usr/local/bin/python3
ansible_become_method=doas
```

OpenBSD uses `doas` instead of `sudo` by default.

## Configuration Playbook

```yaml
---
- name: Configure OpenBSD server
  hosts: openbsd
  become: true
  become_method: doas

  tasks:
    - name: Verify OpenBSD
      ansible.builtin.assert:
        that:
          - ansible_system == "OpenBSD"

    - name: Install packages
      community.general.openbsd_pkg:
        name:
          - vim--no_x11
          - htop
          - tmux
          - jq
          - git
          - curl
          - wget
          - rsync
          - bash
          - python3
          - py3-pip
        state: present

    - name: Set hostname
      ansible.builtin.copy:
        content: "{{ inventory_hostname }}\n"
        dest: /etc/myname
        mode: '0644'

    - name: Set timezone
      ansible.builtin.file:
        src: /usr/share/zoneinfo/UTC
        dest: /etc/localtime
        state: link
        force: true

    - name: Configure doas
      ansible.builtin.copy:
        content: |
          permit persist keepenv :wheel
          permit nopass admin as root
        dest: /etc/doas.conf
        mode: '0600'

    - name: Enable and configure ntpd
      ansible.builtin.copy:
        content: |
          servers pool.ntp.org
          sensor *
          constraints from "https://www.google.com"
        dest: /etc/ntpd.conf
        mode: '0644'
      notify: restart ntpd

    - name: Enable services with rcctl
      ansible.builtin.command: "rcctl enable {{ item }}"
      loop:
        - sshd
        - ntpd
        - pf
      changed_when: true

    - name: Configure pf firewall
      ansible.builtin.copy:
        content: |
          set skip on lo
          block return
          pass out
          pass in on egress proto tcp to port { 22, 80, 443 }
          pass in on egress proto icmp
        dest: /etc/pf.conf
        mode: '0600'
      notify: reload pf

    - name: Harden SSH
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^#?MaxAuthTries', line: 'MaxAuthTries 3' }
      notify: restart sshd

    - name: Configure sysctl security settings
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
      loop:
        - { key: 'kern.nosuidcoredump', value: '1' }
        - { key: 'net.inet.tcp.synuseithresh', value: '1' }

  handlers:
    - name: restart ntpd
      ansible.builtin.command: rcctl restart ntpd

    - name: reload pf
      ansible.builtin.command: pfctl -f /etc/pf.conf

    - name: restart sshd
      ansible.builtin.command: rcctl restart sshd
```

## Summary

OpenBSD management with Ansible uses `community.general.openbsd_pkg` for packages, `rcctl` for services, `doas` instead of sudo, and `pf` for firewalling. OpenBSD's security-first design means many hardening steps are already done by default. This playbook adds your custom configuration on top of OpenBSD's secure base. The key settings: use `ansible_become_method=doas` and `ansible_python_interpreter=/usr/local/bin/python3`.

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

