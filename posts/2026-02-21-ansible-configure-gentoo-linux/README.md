# How to Use Ansible to Configure Gentoo Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Gentoo, Linux, Portage, Source-Based

Description: Manage Gentoo Linux servers with Ansible using portage package management, USE flags, and compile-from-source package workflows.

---

Gentoo Linux is a source-based distribution where packages are compiled from source code using the Portage package manager. This gives you maximum control over package features through USE flags and compiler optimizations. Managing Gentoo with Ansible requires understanding Portage, `emerge`, and the compilation workflow.

## Gentoo Specifics

Key differences that affect Ansible automation:

- Packages compile from source (installation takes longer)
- USE flags control which features are compiled in
- `emerge` is the package manager command
- `eselect` manages system-wide alternatives
- OpenRC is the default init system (systemd is optional)

## Inventory

```ini
[gentoo]
gentoo-build01 ansible_host=10.0.15.10

[gentoo:vars]
ansible_user=admin
ansible_python_interpreter=/usr/bin/python3
```

## Configuration Playbook

```yaml
---
- name: Configure Gentoo Linux
  hosts: gentoo
  become: true

  vars:
    timezone: "UTC"
    make_opts: "-j{{ ansible_processor_cores }}"

  tasks:
    - name: Verify Gentoo
      ansible.builtin.assert:
        that:
          - ansible_distribution == "Gentoo"

    - name: Sync Portage tree
      ansible.builtin.command: emerge --sync
      changed_when: true
      register: sync_result

    - name: Update world set
      ansible.builtin.command: emerge --update --deep --newuse @world
      changed_when: true
      register: update_result
      async: 3600
      poll: 30

    - name: Install essential packages
      community.general.portage:
        package: "{{ item }}"
        state: present
      loop:
        - app-editors/vim
        - sys-process/htop
        - app-misc/tmux
        - app-misc/jq
        - dev-vcs/git
        - net-misc/curl
        - net-misc/chrony
        - net-firewall/nftables

    - name: Configure make.conf
      ansible.builtin.lineinfile:
        path: /etc/portage/make.conf
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^MAKEOPTS=', line: 'MAKEOPTS="{{ make_opts }}"' }
        - { regexp: '^ACCEPT_LICENSE=', line: 'ACCEPT_LICENSE="*"' }

    - name: Configure USE flags
      ansible.builtin.copy:
        content: |
          # Global USE flags
          USE="ssl threads nls -X -gtk -kde"
        dest: /etc/portage/make.conf.d/use-flags.conf
        mode: '0644'

    - name: Set timezone
      ansible.builtin.copy:
        content: "{{ timezone }}\n"
        dest: /etc/timezone
        mode: '0644'

    - name: Update timezone
      ansible.builtin.command: emerge --config sys-libs/timezone-data
      changed_when: true

    - name: Configure OpenRC services
      ansible.builtin.service:
        name: "{{ item }}"
        enabled: true
        state: started
      loop:
        - sshd
        - chronyd
        - nftables

    - name: Harden SSH
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

## Summary

Gentoo automation with Ansible uses the `community.general.portage` module for package management. The main challenge is compilation time, since packages are built from source. Use `async` and `poll` for long-running emerge operations. Configure USE flags through `/etc/portage/make.conf` to control which features are compiled in. Gentoo's flexibility makes it ideal for optimized appliances and custom builds, and Ansible ensures that configuration is reproducible.

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

