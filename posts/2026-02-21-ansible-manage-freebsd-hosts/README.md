# How to Use Ansible to Manage FreeBSD Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, FreeBSD, BSD, Server Configuration, Automation

Description: Manage FreeBSD servers with Ansible using pkg package management, rc.conf service configuration, and BSD-specific modules.

---

FreeBSD is a robust Unix operating system popular for networking appliances, storage servers, and embedded systems. Managing FreeBSD with Ansible requires understanding its unique characteristics: the `pkg` package manager, `rc.conf` for service management, `pf` for firewalling, and the ports system.

## Prerequisites

FreeBSD needs Python installed before Ansible can manage it. Install Python via the bootstrap method:

```yaml
---
- name: Bootstrap FreeBSD for Ansible
  hosts: freebsd
  gather_facts: false
  become: true
  tasks:
    - name: Install Python 3
      ansible.builtin.raw: pkg install -y python3
      changed_when: true
```

## Inventory

```ini
[freebsd]
bsd-web01 ansible_host=10.0.11.10

[freebsd:vars]
ansible_user=admin
ansible_python_interpreter=/usr/local/bin/python3
ansible_become_method=su
```

Note: `ansible_python_interpreter` must point to `/usr/local/bin/python3` on FreeBSD (not `/usr/bin/`).

## Configuration Playbook

```yaml
---
- name: Configure FreeBSD server
  hosts: freebsd
  become: true

  vars:
    timezone: "UTC"

  tasks:
    - name: Verify FreeBSD
      ansible.builtin.assert:
        that:
          - ansible_system == "FreeBSD"
        fail_msg: "Expected FreeBSD"

    - name: Update pkg repository
      community.general.pkgng:
        name: pkg
        state: present

    - name: Upgrade all packages
      ansible.builtin.command: pkg upgrade -y
      changed_when: true

    - name: Install essential packages
      community.general.pkgng:
        name:
          - vim
          - htop
          - tmux
          - jq
          - git
          - curl
          - wget
          - rsync
          - sudo
          - bash
          - python3
          - py39-pip
          - chrony
        state: present

    - name: Set timezone
      ansible.builtin.file:
        src: "/usr/share/zoneinfo/{{ timezone }}"
        dest: /etc/localtime
        state: link
        force: true

    - name: Set hostname
      ansible.builtin.lineinfile:
        path: /etc/rc.conf
        regexp: '^hostname='
        line: 'hostname="{{ inventory_hostname }}"'

    - name: Enable SSH
      ansible.builtin.lineinfile:
        path: /etc/rc.conf
        regexp: '^sshd_enable='
        line: 'sshd_enable="YES"'

    - name: Enable NTP
      ansible.builtin.lineinfile:
        path: /etc/rc.conf
        regexp: '^chronyd_enable='
        line: 'chronyd_enable="YES"'

    - name: Start chronyd
      ansible.builtin.service:
        name: chronyd
        state: started

    - name: Configure pf firewall
      ansible.builtin.copy:
        content: |
          # pf.conf - Packet Filter firewall rules
          set skip on lo0

          block in all
          pass out all

          pass in on egress proto tcp to port 22
          pass in on egress proto tcp to port { 80, 443 }
          pass in on egress proto icmp
        dest: /etc/pf.conf
        mode: '0600'
      notify: reload pf

    - name: Enable pf firewall
      ansible.builtin.lineinfile:
        path: /etc/rc.conf
        regexp: '^pf_enable='
        line: 'pf_enable="YES"'

    - name: Harden SSH
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure sysctl
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'kern.ipc.somaxconn', value: '65535' }
        - { key: 'net.inet.tcp.msl', value: '5000' }
        - { key: 'security.bsd.see_other_uids', value: '0' }

  handlers:
    - name: reload pf
      ansible.builtin.command: pfctl -f /etc/pf.conf

    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

## Summary

FreeBSD management with Ansible uses `community.general.pkgng` for packages, `rc.conf` for service enablement, `pf` for firewalling, and `/usr/local/bin/python3` as the Python path. The key differences from Linux: no systemd (FreeBSD uses its own rc system), different sysctl names, and the ports/pkg system for software. This playbook provides a solid base for FreeBSD server automation.

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

