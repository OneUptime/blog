# How to Use Ansible to Handle Cross-Distribution Service Names

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Linux, Cross-Platform, Services, Systemd

Description: Map service names across Linux distributions in Ansible so your service management tasks work consistently on any OS.

---

Just like package names, service names differ across Linux distributions. The SSH daemon is `ssh` on Debian but `sshd` on RHEL. Apache is `apache2` on Debian but `httpd` on RHEL. If your playbooks manage multiple distributions, you need a strategy for handling these differences.

## The Problem

```yaml
# Works on RHEL, fails on Debian
- name: Restart SSH
  ansible.builtin.systemd:
    name: sshd
    state: restarted
```

On Debian/Ubuntu, the service is named `ssh`, not `sshd`. This means the task fails on half your fleet.

## Solution: Service Name Variables

The approach mirrors how we handle package names: load distribution-specific variable files.

Create `vars/services_debian.yml`:

```yaml
# vars/services_debian.yml
svc_ssh: ssh
svc_web: apache2
svc_firewall: ufw
svc_ntp: chrony
svc_cron: cron
svc_syslog: rsyslog
svc_networking: networking
svc_dns_resolver: systemd-resolved
```

Create `vars/services_redhat.yml`:

```yaml
# vars/services_redhat.yml
svc_ssh: sshd
svc_web: httpd
svc_firewall: firewalld
svc_ntp: chronyd
svc_cron: crond
svc_syslog: rsyslog
svc_networking: NetworkManager
svc_dns_resolver: systemd-resolved
```

Create `vars/services_suse.yml`:

```yaml
# vars/services_suse.yml
svc_ssh: sshd
svc_web: apache2
svc_firewall: firewalld
svc_ntp: chronyd
svc_cron: cron
svc_syslog: rsyslog
svc_networking: wicked
svc_dns_resolver: ""
```

Use them in your playbook:

```yaml
---
- name: Configure services across distributions
  hosts: all
  become: true

  pre_tasks:
    - name: Load OS-specific service names
      ansible.builtin.include_vars: "services_{{ ansible_os_family | lower }}.yml"

  tasks:
    - name: Restart SSH service
      ansible.builtin.service:
        name: "{{ svc_ssh }}"
        state: restarted

    - name: Enable and start NTP
      ansible.builtin.service:
        name: "{{ svc_ntp }}"
        enabled: true
        state: started

    - name: Enable web server
      ansible.builtin.service:
        name: "{{ svc_web }}"
        enabled: true
        state: started
```

## Combined Package and Service Mapping

In practice, you often need both package names and service names together. Combine them:

```yaml
# vars/os_debian.yml
packages:
  web_server: apache2
  ssh_server: openssh-server
  ntp: chrony
  firewall: ufw

services:
  web_server: apache2
  ssh: ssh
  ntp: chrony
  firewall: ufw
  cron: cron

config_paths:
  ssh_config: /etc/ssh/sshd_config
  web_config: /etc/apache2/apache2.conf
  ntp_config: /etc/chrony/chrony.conf
```

```yaml
# vars/os_redhat.yml
packages:
  web_server: httpd
  ssh_server: openssh-server
  ntp: chrony
  firewall: firewalld

services:
  web_server: httpd
  ssh: sshd
  ntp: chronyd
  firewall: firewalld
  cron: crond

config_paths:
  ssh_config: /etc/ssh/sshd_config
  web_config: /etc/httpd/conf/httpd.conf
  ntp_config: /etc/chrony.conf
```

Load and use the combined mapping:

```yaml
---
- name: Cross-distribution server configuration
  hosts: all
  become: true

  pre_tasks:
    - name: Load OS-specific variables
      ansible.builtin.include_vars: "os_{{ ansible_os_family | lower }}.yml"

  tasks:
    - name: Install web server
      ansible.builtin.package:
        name: "{{ packages.web_server }}"
        state: present

    - name: Enable web server service
      ansible.builtin.service:
        name: "{{ services.web_server }}"
        enabled: true
        state: started

    - name: Configure SSH
      ansible.builtin.lineinfile:
        path: "{{ config_paths.ssh_config }}"
        regexp: '^#?PermitRootLogin'
        line: 'PermitRootLogin no'
      notify: restart ssh

  handlers:
    - name: restart ssh
      ansible.builtin.service:
        name: "{{ services.ssh }}"
        state: restarted
```

## Common Service Name Differences

| Service | Debian/Ubuntu | RHEL/CentOS/Rocky | SUSE | Alpine |
|---------|--------------|-------------------|------|--------|
| SSH | ssh | sshd | sshd | sshd |
| Apache | apache2 | httpd | apache2 | apache2 |
| NTP | chrony | chronyd | chronyd | chronyd |
| Cron | cron | crond | cron | crond |
| Firewall | ufw | firewalld | firewalld | iptables |
| Network | networking | NetworkManager | wicked | networking |
| Syslog | rsyslog | rsyslog | rsyslog | rsyslog |

## Using the service Module

The `ansible.builtin.service` module works with both systemd and non-systemd init systems. It is more portable than `ansible.builtin.systemd`:

```yaml
# This works on systemd AND OpenRC (Alpine)
- name: Start a service portably
  ansible.builtin.service:
    name: "{{ svc_ssh }}"
    enabled: true
    state: started

# This ONLY works on systemd
- name: Start a service (systemd only)
  ansible.builtin.systemd:
    name: "{{ svc_ssh }}"
    enabled: true
    state: started
```

Use `ansible.builtin.service` when you need to support non-systemd systems like Alpine Linux.

## Role Pattern

For roles, put the mapping in the role's `vars/` directory:

```yaml
# roles/common/tasks/main.yml
- name: Load OS variables
  ansible.builtin.include_vars: "{{ item }}"
  with_first_found:
    - "{{ ansible_distribution }}_{{ ansible_distribution_major_version }}.yml"
    - "{{ ansible_distribution }}.yml"
    - "{{ ansible_os_family }}.yml"
    - "default.yml"

- name: Manage NTP service
  ansible.builtin.service:
    name: "{{ ntp_service_name }}"
    enabled: true
    state: started
```

The `with_first_found` pattern tries the most specific match first (e.g., `Ubuntu_24.yml`), then falls back to less specific files (`Ubuntu.yml`, `Debian.yml`, `default.yml`).

## Summary

Cross-distribution service name handling follows the same pattern as package names: variable files loaded per OS family. Combine packages, services, and config paths into unified variable files for each distribution. Use `ansible.builtin.service` instead of `ansible.builtin.systemd` for maximum portability. The `with_first_found` pattern gives you granular control, from distribution-version-specific overrides down to family-level defaults.

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

