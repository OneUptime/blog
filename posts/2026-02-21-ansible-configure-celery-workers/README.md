# How to Use Ansible to Configure Celery Workers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python, Celery, Task Queue, Worker

Description: Deploy and manage Celery distributed task workers with Ansible including broker configuration, worker pools, and monitoring setup.

---

Celery is one of the most popular distributed task queues for Python applications. This guide provides practical Ansible playbooks for this common automation task.

## Overview

Managing Python environments across multiple servers manually is tedious and error-prone. Ansible automates the process, ensuring every server has the exact same setup. Whether you are deploying to development, staging, or production, the configuration is identical and reproducible.

## Prerequisites

Ensure your target hosts have SSH access and a base Python installation:

```ini
# inventory/hosts

[app_servers]
app01 ansible_host=10.0.1.10
app02 ansible_host=10.0.1.11

[app_servers:vars]
ansible_user=deploy
ansible_python_interpreter=/usr/bin/python3
```

## Installation Playbook

```yaml
---
- name: How to Use Ansible to Configure Celery Workers
  hosts: app_servers
  become: true

  vars:
    app_name: myapp
    app_dir: /opt/{{ app_name }}
    app_user: www-data
    celery_app: myapp.celery_app
    celery_service_name: "{{ app_name }}-celery"
    celery_broker_url: redis://localhost:6379/0
    celery_result_backend: redis://localhost:6379/1
    celery_worker_concurrency: 4
    celery_loglevel: INFO

  tasks:
    - name: Install system dependencies
      ansible.builtin.package:
        name:
          - python3
          - python3-pip
          - python3-venv
          - python3-dev
          - build-essential
          - libssl-dev
          - libffi-dev
        state: present

    - name: Create application directory
      ansible.builtin.file:
        path: "{{ app_dir }}"
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: '0755'

    - name: Create virtual environment
      ansible.builtin.pip:
        virtualenv: "{{ app_dir }}/venv"
        virtualenv_command: python3 -m venv
        name: pip
        state: latest
      become_user: "{{ app_user }}"

    - name: Check for requirements file
      ansible.builtin.stat:
        path: "{{ app_dir }}/requirements.txt"
      register: requirements_file

    - name: Install Celery with Redis transport support
      ansible.builtin.pip:
        virtualenv: "{{ app_dir }}/venv"
        name: "celery[redis]"
        state: present
      become_user: "{{ app_user }}"

    - name: Install application dependencies
      ansible.builtin.pip:
        virtualenv: "{{ app_dir }}/venv"
        requirements: "{{ app_dir }}/requirements.txt"
      become_user: "{{ app_user }}"
      when: requirements_file.stat.exists
```

## Configuration Tasks

```yaml
    - name: Deploy Celery environment configuration
      ansible.builtin.template:
        src: celery.env.j2
        dest: "/etc/{{ celery_service_name }}.env"
        owner: root
        group: "{{ app_user }}"
        mode: '0600'
      notify: restart celery worker

    - name: Create Celery systemd service
      ansible.builtin.template:
        src: celery.service.j2
        dest: "/etc/systemd/system/{{ celery_service_name }}.service"
        mode: '0644'
      notify:
        - reload systemd
        - restart celery worker

    - name: Enable and start Celery worker
      ansible.builtin.systemd:
        name: "{{ celery_service_name }}"
        enabled: true
        state: started
```

## Systemd Service Template

```ini
# templates/celery.env.j2
CELERY_BROKER_URL={{ celery_broker_url }}
CELERY_RESULT_BACKEND={{ celery_result_backend }}
```

```ini
# templates/celery.service.j2
[Unit]
Description={{ app_name }} Celery Worker
After=network.target

[Service]
Type=simple
User={{ app_user }}
Group={{ app_user }}
WorkingDirectory={{ app_dir }}
EnvironmentFile=/etc/{{ celery_service_name }}.env
ExecStart={{ app_dir }}/venv/bin/celery -A {{ celery_app }} worker --loglevel={{ celery_loglevel }} --concurrency={{ celery_worker_concurrency }}
Restart=always
RestartSec=5
Environment=PYTHONPATH={{ app_dir }}

[Install]
WantedBy=multi-user.target
```

## Health Check

```yaml
    - name: Wait for Celery worker to respond
      ansible.builtin.command: >
        {{ app_dir }}/venv/bin/celery -A {{ celery_app }} status --timeout=5
      environment:
        CELERY_BROKER_URL: "{{ celery_broker_url }}"
        CELERY_RESULT_BACKEND: "{{ celery_result_backend }}"
      changed_when: false
      retries: 10
      delay: 3
      register: celery_status
      until: celery_status.rc == 0
```

## Handlers

```yaml
  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: true

    - name: restart celery worker
      ansible.builtin.systemd:
        name: "{{ celery_service_name }}"
        state: restarted
```

## Running the Playbook

```bash
# Dry run first
ansible-playbook -i inventory/hosts playbook.yml --check --diff

# Apply changes
ansible-playbook -i inventory/hosts playbook.yml

# Target specific hosts
ansible-playbook -i inventory/hosts playbook.yml --limit app01
```

## Summary

This playbook automates the complete setup process, from installing system dependencies through configuring the application service. Every step is idempotent, meaning you can run it repeatedly without side effects. Extend it with additional tasks for your specific needs like database migrations, static file collection, or load balancer registration.

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
