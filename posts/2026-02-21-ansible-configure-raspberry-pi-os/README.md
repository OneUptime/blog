# How to Use Ansible to Configure Raspberry Pi OS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Raspberry Pi, IoT, Linux, ARM

Description: Automate Raspberry Pi OS configuration with Ansible for headless setup, GPIO access, camera configuration, and fleet management.

---

Raspberry Pi OS (formerly Raspbian) is the official Linux distribution for Raspberry Pi hardware. Managing a fleet of Pis with Ansible is common for IoT deployments, digital signage, home automation, and edge computing. This guide covers Ansible automation specific to Raspberry Pi OS, including headless setup, hardware configuration, and ARM-specific considerations.

## Prerequisites

Enable SSH on the Pi before first boot by placing an empty file named `ssh` in the boot partition. For Wi-Fi, create `wpa_supplicant.conf` in the boot partition.

## Inventory

```ini
[raspberrypi]
pi-sensor01 ansible_host=192.168.1.101
pi-sensor02 ansible_host=192.168.1.102
pi-display01 ansible_host=192.168.1.103

[raspberrypi:vars]
ansible_user=pi
ansible_python_interpreter=/usr/bin/python3
```

## Configuration Playbook

```yaml
---
- name: Configure Raspberry Pi OS
  hosts: raspberrypi
  become: true

  vars:
    timezone: "UTC"
    wifi_country: "US"
    gpu_memory: 128
    enable_camera: true
    enable_i2c: true
    enable_spi: true

  tasks:
    - name: Verify Raspberry Pi OS
      ansible.builtin.assert:
        that:
          - ansible_distribution == "Debian"
          - ansible_architecture in ["aarch64", "armv7l", "armv6l"]

    - name: Update apt cache and upgrade
      ansible.builtin.apt:
        update_cache: true
        upgrade: safe

    - name: Install essential packages
      ansible.builtin.apt:
        name:
          - vim
          - htop
          - tmux
          - git
          - curl
          - jq
          - python3-pip
          - python3-gpiozero
          - python3-smbus
          - i2c-tools
          - libraspberrypi-bin
          - raspi-config
          - fail2ban
          - ufw
        state: present

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Set hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Configure GPU memory split
      ansible.builtin.lineinfile:
        path: /boot/firmware/config.txt
        regexp: '^gpu_mem='
        line: "gpu_mem={{ gpu_memory }}"
      notify: reboot required

    - name: Enable camera interface
      ansible.builtin.lineinfile:
        path: /boot/firmware/config.txt
        regexp: '^#?start_x='
        line: "start_x=1"
      when: enable_camera
      notify: reboot required

    - name: Enable I2C interface
      ansible.builtin.lineinfile:
        path: /boot/firmware/config.txt
        regexp: '^#?dtparam=i2c_arm='
        line: "dtparam=i2c_arm=on"
      when: enable_i2c
      notify: reboot required

    - name: Enable SPI interface
      ansible.builtin.lineinfile:
        path: /boot/firmware/config.txt
        regexp: '^#?dtparam=spi='
        line: "dtparam=spi=on"
      when: enable_spi
      notify: reboot required

    - name: Load I2C kernel module
      community.general.modprobe:
        name: i2c-dev
        state: present
      when: enable_i2c

    - name: Ensure I2C loads on boot
      ansible.builtin.lineinfile:
        path: /etc/modules
        line: i2c-dev
      when: enable_i2c

    - name: Configure Wi-Fi country
      ansible.builtin.command: "raspi-config nonint do_wifi_country {{ wifi_country }}"
      changed_when: true

    - name: Change default pi user password
      ansible.builtin.user:
        name: pi
        password: "{{ vault_pi_password | password_hash('sha512') }}"

    - name: Harden SSH
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure UFW firewall
      block:
        - community.general.ufw:
            direction: incoming
            policy: deny
        - community.general.ufw:
            rule: allow
            port: '22'
            proto: tcp
        - community.general.ufw:
            state: enabled

  handlers:
    - name: reboot required
      ansible.builtin.reboot:
        msg: "Rebooting for hardware config changes"
        reboot_timeout: 300

    - name: restart sshd
      ansible.builtin.service:
        name: ssh
        state: restarted
```

## Summary

Raspberry Pi OS is Debian-based, so standard Debian Ansible modules work. The Pi-specific parts are hardware configuration through `/boot/firmware/config.txt` (GPU memory, camera, I2C, SPI), `raspi-config` for non-interactive setup, and GPIO/sensor packages. For fleet management, combine this playbook with dynamic inventory to manage dozens or hundreds of Pis.

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

