# How to Use Ansible to Deploy Django Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python, Django, Deployment, Web

Description: Deploy Django applications with Ansible including database migrations, static file collection, and multi-server setups.

---

Django is the most comprehensive Python web framework in production environments. This guide walks through the complete process with practical Ansible playbooks and working code examples.

## Prerequisites

Your Ansible control node needs SSH access to target servers. Set up your inventory:

```ini
# inventory/hosts

[app_servers]
app01 ansible_host=10.0.1.10
app02 ansible_host=10.0.1.11

[app_servers:vars]
ansible_user=deploy
ansible_python_interpreter=/usr/bin/python3
```

## System Preparation

On Debian or Ubuntu servers, install the required system packages:

```yaml
---
- name: How to Use Ansible to Deploy Django Applications
  hosts: app_servers
  become: true

  vars:
    app_name: myapp
    django_project: myapp
    app_dir: /opt/{{ app_name }}
    app_user: www-data
    app_port: 8000
    app_workers: 3
    static_dir: "{{ app_dir }}/staticfiles"

  tasks:
    - name: Install system dependencies
      ansible.builtin.package:
        name:
          - python3
          - python3-pip
          - python3-venv
          - python3-dev
          - git
          - gcc
          - libpq-dev
          - libssl-dev
        state: present

    - name: Create application user
      ansible.builtin.user:
        name: "{{ app_user }}"
        system: true
        shell: /usr/sbin/nologin
        create_home: false

    - name: Create application directories
      ansible.builtin.file:
        path: "{{ item }}"
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: '0755'
      loop:
        - "{{ app_dir }}"
        - "{{ app_dir }}/logs"
        - "{{ app_dir }}/data"
        - "{{ static_dir }}"
```

## Application Deployment

```yaml
    - name: Deploy application code
      ansible.builtin.git:
        repo: "https://github.com/myorg/{{ app_name }}.git"
        dest: "{{ app_dir }}/src"
        version: "{{ app_version | default('main') }}"
      become_user: "{{ app_user }}"
      notify: restart application

    - name: Create virtual environment
      ansible.builtin.pip:
        virtualenv: "{{ app_dir }}/venv"
        virtualenv_command: python3 -m venv
        name: pip
        state: latest

    - name: Install application dependencies
      ansible.builtin.pip:
        virtualenv: "{{ app_dir }}/venv"
        requirements: "{{ app_dir }}/src/requirements.txt"
      notify: restart application

    - name: Install Gunicorn
      ansible.builtin.pip:
        virtualenv: "{{ app_dir }}/venv"
        name: gunicorn
        state: present
      notify: restart application

    - name: Deploy environment configuration
      ansible.builtin.template:
        src: dotenv.j2
        dest: "{{ app_dir }}/.env"
        owner: "{{ app_user }}"
        mode: '0600'
      notify: restart application

    - name: Run database migrations
      ansible.builtin.command: "{{ app_dir }}/venv/bin/python manage.py migrate --noinput"
      args:
        chdir: "{{ app_dir }}/src"
      become_user: "{{ app_user }}"
      register: migrate_result
      changed_when: "'No migrations to apply' not in migrate_result.stdout"

    - name: Collect static files
      ansible.builtin.command: "{{ app_dir }}/venv/bin/python manage.py collectstatic --noinput"
      args:
        chdir: "{{ app_dir }}/src"
      become_user: "{{ app_user }}"
      register: collectstatic_result
      changed_when: "'0 static files copied' not in collectstatic_result.stdout"
```

## Service Configuration

```yaml
    - name: Create systemd service file
      ansible.builtin.copy:
        content: |
          [Unit]
          Description={{ app_name }} Application
          After=network.target

          [Service]
          Type=simple
          User={{ app_user }}
          Group={{ app_user }}
          WorkingDirectory={{ app_dir }}/src
          EnvironmentFile={{ app_dir }}/.env
          ExecStart={{ app_dir }}/venv/bin/gunicorn --workers {{ app_workers }} --bind 127.0.0.1:{{ app_port }} {{ django_project }}.wsgi:application
          Restart=always
          RestartSec=5

          [Install]
          WantedBy=multi-user.target
        dest: "/etc/systemd/system/{{ app_name }}.service"
        mode: '0644'
      notify:
        - reload systemd
        - restart application

    - name: Enable and start application
      ansible.builtin.systemd:
        name: "{{ app_name }}"
        daemon_reload: true
        enabled: true
        state: started
```

## Nginx Reverse Proxy

```yaml
    - name: Install nginx
      ansible.builtin.package:
        name: nginx
        state: present

    - name: Configure nginx reverse proxy
      ansible.builtin.copy:
        content: |
          server {
              listen 80;
              server_name {{ inventory_hostname }};

              location /static/ {
                  alias {{ static_dir }}/;
              }

              location / {
                  proxy_pass http://127.0.0.1:{{ app_port }};
                  proxy_set_header Host $host;
                  proxy_set_header X-Real-IP $remote_addr;
                  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                  proxy_set_header X-Forwarded-Proto $scheme;
              }
          }
        dest: /etc/nginx/sites-available/{{ app_name }}
        mode: '0644'
      notify: reload nginx

    - name: Enable nginx site
      ansible.builtin.file:
        src: /etc/nginx/sites-available/{{ app_name }}
        dest: /etc/nginx/sites-enabled/{{ app_name }}
        state: link
      notify: reload nginx
```

## Health Check and Verification

```yaml
    - name: Apply service changes before verification
      ansible.builtin.meta: flush_handlers

    - name: Wait for application to be healthy
      ansible.builtin.uri:
        url: "http://localhost:{{ app_port }}/health"
        status_code: 200
      retries: 10
      delay: 3
      register: health
      until: health.status == 200

    - name: Display application status
      ansible.builtin.debug:
        msg: "Application is healthy at http://{{ inventory_hostname }}:{{ app_port }}"
```

## Handlers

```yaml
  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: true

    - name: restart application
      ansible.builtin.systemd:
        name: "{{ app_name }}"
        state: restarted

    - name: reload nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
```

## Running the Deployment

```bash
# Check mode first
ansible-playbook -i inventory/hosts deploy.yml --check --diff

# Deploy
ansible-playbook -i inventory/hosts deploy.yml -e app_version=v2.5.0

# Deploy to specific hosts
ansible-playbook -i inventory/hosts deploy.yml --limit app01
```

## Summary

This playbook provides a complete deployment pipeline: system preparation, code deployment, virtual environment management, database migrations, static file collection, service configuration, and reverse proxy setup. Each task is idempotent and can be run repeatedly. Extend it with additional steps like cache warming, TLS certificate management, or load balancer integration based on your specific application requirements.

## Common Use Cases

Here are several practical scenarios where these Ansible patterns prove essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating these patterns
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
        name: "{{ 'ssh' if ansible_os_family == 'Debian' else 'sshd' }}"
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
# Robust error handling with these patterns
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
        user: ansible
```
