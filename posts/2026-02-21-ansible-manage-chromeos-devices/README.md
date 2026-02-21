# How to Use Ansible to Manage ChromeOS Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ChromeOS, Linux, Crostini, Device Management

Description: Manage ChromeOS devices with Ansible through the Linux development environment (Crostini) for developer workstation automation.

---

ChromeOS is Google's operating system for Chromebooks and Chromeboxes. While ChromeOS itself is managed through Google Admin Console for enterprise fleets, the built-in Linux development environment (Crostini) runs a Debian container that can be managed with Ansible. This guide covers what is and is not possible with Ansible on ChromeOS.

## Understanding ChromeOS Limitations

ChromeOS has strict security boundaries:

- The core ChromeOS system is not manageable via SSH/Ansible
- Enterprise ChromeOS management uses Google Admin Console and APIs
- The Linux development environment (Crostini) runs a Debian VM/container
- Crostini gives you a standard Debian environment for development tools
- SSH access is only available within Crostini

## Enabling Crostini

Crostini must be enabled manually through ChromeOS Settings > Linux Development Environment. Once enabled, it provides a terminal with a Debian installation.

## Managing the Crostini Linux Environment

Once Crostini is running, you can SSH into it from a remote Ansible controller:

```ini
# inventory/hosts
[chromeos_linux]
chromebook-dev01 ansible_host=192.168.1.50

[chromeos_linux:vars]
ansible_user=username
ansible_python_interpreter=/usr/bin/python3
ansible_port=22
```

First, enable SSH inside Crostini:

```bash
# Run inside the Crostini terminal
sudo apt update && sudo apt install -y openssh-server
sudo systemctl enable ssh
sudo systemctl start ssh
```

## Developer Workstation Playbook

```yaml
---
- name: Configure ChromeOS Linux Development Environment
  hosts: chromeos_linux
  become: true

  vars:
    dev_user: "{{ ansible_user }}"

  tasks:
    - name: Verify Debian-based environment
      ansible.builtin.assert:
        that:
          - ansible_os_family == "Debian"

    - name: Update apt cache and upgrade
      ansible.builtin.apt:
        update_cache: true
        upgrade: safe

    - name: Install development tools
      ansible.builtin.apt:
        name:
          - build-essential
          - git
          - curl
          - wget
          - vim
          - htop
          - tmux
          - jq
          - unzip
          - python3-pip
          - python3-venv
          - nodejs
          - npm
          - docker.io
          - docker-compose
          - code
        state: present

    - name: Install Python development packages
      ansible.builtin.pip:
        name:
          - virtualenv
          - pipx
          - black
          - flake8
          - mypy
        executable: pip3

    - name: Configure Git
      become: false
      community.general.git_config:
        name: "{{ item.name }}"
        value: "{{ item.value }}"
        scope: global
      loop:
        - { name: 'user.name', value: 'Developer Name' }
        - { name: 'user.email', value: 'dev@example.com' }
        - { name: 'init.defaultBranch', value: 'main' }
        - { name: 'pull.rebase', value: 'true' }

    - name: Configure shell environment
      become: false
      ansible.builtin.blockinfile:
        path: "/home/{{ dev_user }}/.bashrc"
        marker: "# {mark} ANSIBLE MANAGED"
        block: |
          # Development aliases
          alias ll='ls -la'
          alias gs='git status'
          alias gd='git diff'
          alias gp='git pull'

          # Python
          export PATH="$HOME/.local/bin:$PATH"

          # Node
          export PATH="$HOME/.npm-global/bin:$PATH"

    - name: Create project directories
      become: false
      ansible.builtin.file:
        path: "/home/{{ dev_user }}/{{ item }}"
        state: directory
        mode: '0755'
      loop:
        - Projects
        - .ssh
        - .config

    - name: Add user to docker group
      ansible.builtin.user:
        name: "{{ dev_user }}"
        groups: docker
        append: true
```

## Using Google Admin Console for Fleet Management

For enterprise ChromeOS fleet management, use the Google Admin Console REST API instead of SSH-based Ansible. You can wrap the API calls in a custom Ansible module or use the `uri` module:

```yaml
    - name: Get ChromeOS device list from Google Admin
      ansible.builtin.uri:
        url: "https://www.googleapis.com/admin/directory/v1/customer/my_customer/devices/chromeos"
        method: GET
        headers:
          Authorization: "Bearer {{ google_admin_token }}"
        return_content: true
      register: chrome_devices

    - name: Display managed devices
      ansible.builtin.debug:
        msg: "Device: {{ item.serialNumber }} - {{ item.status }}"
      loop: "{{ (chrome_devices.content | from_json).chromeosdevices }}"
```

## Summary

Ansible's role with ChromeOS is limited to two scenarios: managing the Crostini Linux environment for developer workstations, and calling Google Admin APIs for fleet management. The Crostini environment is standard Debian, so all Debian Ansible modules work. For enterprise ChromeOS management (policies, enrollment, updates), the Google Admin Console is the primary tool, though you can automate API calls through Ansible's `uri` module. This playbook focuses on setting up the Linux development environment for consistent developer workstations.

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

