# How to Use Ansible to Configure Photon OS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Photon OS, VMware, Container, Linux

Description: Configure VMware Photon OS with Ansible using tdnf package management for container-optimized VMware infrastructure workloads.

---

Photon OS is VMware's minimalist Linux distribution designed for running containers and cloud-native workloads on VMware infrastructure. It uses `tdnf` (Tiny Dandified Yum) as its package manager and is optimized for vSphere, VMware Cloud, and Kubernetes environments. This guide covers Ansible automation for Photon OS.

## Photon OS Specifics

Key characteristics:

- Uses `tdnf` (compatible with dnf/yum syntax)
- Minimal package footprint
- Optimized for VMware vSphere
- Includes Docker and supports common container runtimes
- systemd-based
- Designed for container workloads
- Available as minimal, full/developer, OSTree, and real-time variants

## Inventory

```ini
[photon]
photon-k8s01 ansible_host=10.0.17.10

[photon:vars]
ansible_user=root
ansible_python_interpreter=/usr/bin/python3
```

## Configuration Playbook

```yaml
---
- name: Configure Photon OS
  hosts: photon
  become: true

  tasks:
    - name: Verify Photon OS
      ansible.builtin.assert:
        that:
          - ansible_distribution == "VMware Photon OS" or ansible_os_family == "VMware Photon OS"

    - name: Update all packages
      ansible.builtin.command: tdnf update -y
      register: tdnf_update
      changed_when: "'Nothing to do' not in tdnf_update.stdout"

    - name: Install essential packages
      ansible.builtin.command: "tdnf install -y {{ item }}"
      loop:
        - vim
        - htop
        - git
        - curl
        - jq
        - tar
        - chrony
        - iptables
        - sudo
        - python3-pip
        - open-vm-tools
      register: pkg_result
      changed_when: "'Nothing to do' not in pkg_result.stdout"

    - name: Set timezone
      community.general.timezone:
        name: UTC

    - name: Set hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Enable open-vm-tools for vSphere integration
      ansible.builtin.systemd:
        name: vmtoolsd
        enabled: true
        state: started

    - name: Configure Docker daemon
      ansible.builtin.copy:
        content: |
          {
            "storage-driver": "overlay2",
            "log-driver": "json-file",
            "log-opts": {
              "max-size": "50m",
              "max-file": "3"
            }
          }
        dest: /etc/docker/daemon.json
        mode: '0644'
      notify: restart docker

    - name: Enable Docker
      ansible.builtin.systemd:
        name: docker
        enabled: true
        state: started

    - name: Enable chrony NTP
      ansible.builtin.systemd:
        name: chronyd
        enabled: true
        state: started

    - name: Harden SSH
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Sysctl tuning
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }

  handlers:
    - name: restart docker
      ansible.builtin.systemd:
        name: docker
        state: restarted

    - name: restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted
```

## Summary

Photon OS management with Ansible uses `tdnf` commands since there is no dedicated Ansible module. The distribution is purpose-built for VMware environments with pre-installed open-vm-tools and Docker. It is minimal by design, which means fewer packages to manage but also fewer tools available out of the box. This playbook covers the essentials: package installation, Docker configuration, vSphere integration, and security hardening.

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
      ansible.builtin.command: "tdnf install -y {{ item }}"
      loop:
        - curl
        - wget
        - git
        - vim
        - htop
        - jq
      register: pkg_result
      changed_when: "'Nothing to do' not in pkg_result.stdout"

    - name: Configure system timezone
      community.general.timezone:
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

    - name: Check firewall rules
      ansible.builtin.command: "iptables -C INPUT -p tcp -m tcp --dport {{ item }} -j ACCEPT"
      register: firewall_check
      failed_when: false
      changed_when: false
      loop:
        - "22"
        - "80"
        - "443"

    - name: Configure firewall rules
      ansible.builtin.command: "iptables -A INPUT -p tcp -m tcp --dport {{ item.item }} -j ACCEPT"
      loop: "{{ firewall_check.results }}"
      when: item.rc != 0

    - name: Persist firewall rules
      ansible.builtin.command: iptables-save
      register: iptables_save
      changed_when: false

    - name: Save persistent firewall rules
      ansible.builtin.copy:
        dest: /etc/systemd/scripts/ip4save
        content: "{{ iptables_save.stdout }}\n"
        mode: '0644'

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
    - name: Create scripts directory
      ansible.builtin.file:
        path: /opt/scripts
        state: directory
        mode: '0755'

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
        user: root
```
