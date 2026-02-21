# How to Use Ansible with Datadog for Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Datadog, Monitoring, APM

Description: Deploy and configure Datadog agents across your infrastructure with Ansible for metrics collection, log management, and APM.

---

Datadog provides cloud-based monitoring with metrics, logs, and APM. The Datadog Ansible collection makes it easy to deploy and configure agents across your infrastructure.

## Datadog Setup

```mermaid
graph LR
    A[Ansible] --> B[Install DD Agent]
    B --> C[Configure Integrations]
    C --> D[Enable Log Collection]
    D --> E[Datadog Cloud]
```

## Installing the Datadog Agent

```yaml
# roles/datadog_agent/tasks/main.yml
---
- name: Install Datadog collection
  ansible.builtin.command:
    cmd: ansible-galaxy collection install datadog.dd
  delegate_to: localhost
  run_once: true

- name: Deploy Datadog agent
  ansible.builtin.include_role:
    name: datadog.dd.agent
  vars:
    datadog_api_key: "{{ vault_datadog_api_key }}"
    datadog_site: datadoghq.com
    datadog_agent_major_version: 7
    datadog_config:
      tags:
        - "env:{{ environment_name }}"
        - "role:{{ server_role }}"
        - "team:{{ team_name }}"
      logs_enabled: true
      apm_config:
        enabled: true
      process_config:
        enabled: true
    datadog_checks:
      nginx:
        instances:
          - nginx_status_url: http://localhost/nginx_status
      postgres:
        instances:
          - host: localhost
            port: 5432
            username: datadog
            password: "{{ vault_dd_postgres_password }}"
```

## Configuring Integrations

```yaml
# tasks/datadog-integrations.yml
---
- name: Configure Nginx integration
  ansible.builtin.template:
    src: datadog/nginx.yaml.j2
    dest: /etc/datadog-agent/conf.d/nginx.d/conf.yaml
    mode: '0644'
  notify: restart datadog-agent
  when: "'webservers' in group_names"

- name: Configure PostgreSQL integration
  ansible.builtin.template:
    src: datadog/postgres.yaml.j2
    dest: /etc/datadog-agent/conf.d/postgres.d/conf.yaml
    mode: '0640'
  notify: restart datadog-agent
  when: "'databases' in group_names"

- name: Configure custom application metrics
  ansible.builtin.template:
    src: datadog/custom_app.yaml.j2
    dest: /etc/datadog-agent/conf.d/openmetrics.d/conf.yaml
    mode: '0644'
  notify: restart datadog-agent
```

## Log Collection

```yaml
# tasks/datadog-logs.yml
---
- name: Configure application log collection
  ansible.builtin.copy:
    content: |
      logs:
        - type: file
          path: /var/log/{{ app_name }}/*.log
          service: {{ app_name }}
          source: {{ app_name }}
          tags:
            - env:{{ environment_name }}
        - type: file
          path: /var/log/nginx/access.log
          service: nginx
          source: nginx
    dest: /etc/datadog-agent/conf.d/{{ app_name }}.d/conf.yaml
    mode: '0644'
  notify: restart datadog-agent
```

## Monitors via API

```yaml
# tasks/datadog-monitors.yml
---
- name: Create Datadog monitors
  ansible.builtin.uri:
    url: "https://api.datadoghq.com/api/v1/monitor"
    method: POST
    headers:
      DD-API-KEY: "{{ vault_datadog_api_key }}"
      DD-APPLICATION-KEY: "{{ vault_datadog_app_key }}"
    body_format: json
    body:
      name: "{{ item.name }}"
      type: "{{ item.type }}"
      query: "{{ item.query }}"
      message: "{{ item.message }}"
      tags: ["managed:ansible"]
  loop:
    - name: "High CPU on {{ environment_name }}"
      type: metric alert
      query: "avg(last_5m):avg:system.cpu.user{env:{{ environment_name }}} > 80"
      message: "CPU usage above 80% @slack-alerts"
    - name: "Disk space low"
      type: metric alert
      query: "avg(last_5m):avg:system.disk.in_use{env:{{ environment_name }}} > 0.85"
      message: "Disk usage above 85% @slack-alerts"
```

## Key Takeaways

The Datadog Ansible collection provides a straightforward way to deploy agents and configure integrations. Use Ansible variables to manage API keys securely. Configure integrations based on server roles using group membership. Set up monitors through the API for infrastructure-wide alerting. This approach ensures consistent Datadog configuration across all your servers.

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

