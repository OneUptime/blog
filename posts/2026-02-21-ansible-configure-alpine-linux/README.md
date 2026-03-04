# How to Use Ansible to Configure Alpine Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Alpine Linux, Containers, Linux, Minimal

Description: Configure Alpine Linux servers and containers with Ansible using apk package management, OpenRC init system, and musl-based tooling.

---

Alpine Linux is a security-oriented, lightweight Linux distribution based on musl libc and BusyBox. It is best known as the base image for Docker containers, but it also works well for lightweight VMs, edge devices, and embedded systems. Configuring Alpine with Ansible requires understanding its unique characteristics: the apk package manager, the OpenRC init system (not systemd), and the musl C library.

## Alpine Linux Specifics

Key differences that affect Ansible automation:

- Uses `apk` instead of apt/dnf/zypper
- Uses OpenRC instead of systemd
- Based on musl libc instead of glibc
- BusyBox provides core utilities
- Very small base footprint (around 5 MB for containers)
- Python is not installed by default

## Bootstrap

Alpine does not have Python pre-installed. Use the raw module to install it:

```yaml
---
# bootstrap_alpine.yml
- name: Bootstrap Alpine Linux
  hosts: alpine
  gather_facts: false
  become: true

  tasks:
    - name: Install Python 3
      ansible.builtin.raw: apk add --no-cache python3
      changed_when: true
```

## Inventory

```ini
[alpine]
alpine-edge01 ansible_host=10.0.9.10

[alpine:vars]
ansible_user=admin
ansible_python_interpreter=/usr/bin/python3
```

## Configuration Playbook

```yaml
---
# configure_alpine.yml
- name: Configure Alpine Linux
  hosts: alpine
  become: true

  vars:
    timezone: "UTC"

  tasks:
    - name: Verify Alpine Linux
      ansible.builtin.assert:
        that:
          - ansible_distribution == "Alpine"
        fail_msg: "Expected Alpine Linux"

    - name: Update apk cache and upgrade packages
      community.general.apk:
        update_cache: true
        upgrade: true

    - name: Install essential packages
      community.general.apk:
        name:
          - vim
          - htop
          - tmux
          - jq
          - unzip
          - git
          - curl
          - wget
          - bind-tools
          - net-tools
          - tcpdump
          - sysstat
          - chrony
          - fail2ban
          - iptables
          - rsyslog
          - bash
          - bash-completion
          - python3
          - py3-pip
          - sudo
          - openssh
          - openssl
          - ca-certificates
        state: present

    - name: Set timezone
      ansible.builtin.copy:
        content: "{{ timezone }}\n"
        dest: /etc/timezone
        mode: '0644'

    - name: Install timezone data
      community.general.apk:
        name: tzdata
        state: present

    - name: Create timezone symlink
      ansible.builtin.file:
        src: "/usr/share/zoneinfo/{{ timezone }}"
        dest: /etc/localtime
        state: link
        force: true

    - name: Set hostname
      ansible.builtin.copy:
        content: "{{ inventory_hostname }}\n"
        dest: /etc/hostname
        mode: '0644'
```

## OpenRC Service Management

Alpine uses OpenRC instead of systemd. Ansible handles this with the `service` module:

```yaml
    - name: Configure chrony NTP
      ansible.builtin.copy:
        content: |
          server 0.pool.ntp.org iburst
          server 1.pool.ntp.org iburst
          driftfile /var/lib/chrony/chrony.drift
          makestep 1.0 3
          rtcsync
        dest: /etc/chrony/chrony.conf
        mode: '0644'

    - name: Enable and start services (OpenRC)
      ansible.builtin.service:
        name: "{{ item }}"
        enabled: true
        state: started
      loop:
        - sshd
        - chronyd
        - networking

    - name: Add services to default runlevel
      ansible.builtin.command: "rc-update add {{ item }} default"
      loop:
        - sshd
        - chronyd
        - networking
        - crond
      changed_when: true
      failed_when: false
```

## Firewall with iptables

Alpine uses iptables rather than nftables or firewalld:

```yaml
    - name: Configure iptables rules
      ansible.builtin.copy:
        content: |
          *filter
          :INPUT DROP [0:0]
          :FORWARD DROP [0:0]
          :OUTPUT ACCEPT [0:0]
          -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
          -A INPUT -i lo -j ACCEPT
          -A INPUT -p tcp --dport 22 -j ACCEPT
          -A INPUT -p tcp --dport 80 -j ACCEPT
          -A INPUT -p tcp --dport 443 -j ACCEPT
          -A INPUT -p icmp -j ACCEPT
          COMMIT
        dest: /etc/iptables/rules-save
        mode: '0600'
      notify: load iptables

    - name: Enable iptables service
      ansible.builtin.service:
        name: iptables
        enabled: true
        state: started
```

## Network Configuration

Alpine uses `/etc/network/interfaces`:

```yaml
    - name: Configure network interfaces
      ansible.builtin.copy:
        content: |
          auto lo
          iface lo inet loopback

          auto eth0
          iface eth0 inet dhcp
        dest: /etc/network/interfaces
        mode: '0644'

    - name: Configure DNS
      ansible.builtin.copy:
        content: |
          nameserver 1.1.1.1
          nameserver 8.8.8.8
        dest: /etc/resolv.conf
        mode: '0644'
```

## SSH Hardening

```yaml
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

    - name: Sysctl security settings
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.ipv4.conf.all.rp_filter', value: '1' }
        - { key: 'net.ipv4.conf.all.accept_redirects', value: '0' }
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'fs.file-max', value: '2097152' }
```

## Handlers

Alpine uses service (OpenRC) instead of systemd:

```yaml
  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted

    - name: load iptables
      ansible.builtin.command: iptables-restore < /etc/iptables/rules-save
```

## Summary

Alpine Linux automation with Ansible uses the `community.general.apk` module for packages, OpenRC for services (via `ansible.builtin.service`), and iptables for firewalling. The biggest gotcha is the lack of systemd, which means `ansible.builtin.systemd` will not work. Always use `ansible.builtin.service` instead. Alpine's small footprint makes it ideal for containers and edge devices. Bootstrap Python first, then the standard Ansible patterns work well.

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

