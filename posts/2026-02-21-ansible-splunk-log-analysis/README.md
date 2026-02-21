# How to Use Ansible with Splunk for Log Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Splunk, Log Analysis, Monitoring

Description: Deploy Splunk Universal Forwarders and configure log ingestion across your infrastructure with Ansible for centralized log analysis.

---

Splunk is an enterprise log analysis platform. Ansible can deploy Splunk Universal Forwarders to every server, configure which logs to collect, and manage Splunk server settings.

## Architecture

```mermaid
graph LR
    A[Servers] --> B[Universal Forwarder]
    B --> C[Splunk Indexer]
    C --> D[Splunk Search Head]
```

## Deploying Universal Forwarder

```yaml
# roles/splunk_forwarder/tasks/main.yml
---
- name: Download Splunk Universal Forwarder
  ansible.builtin.get_url:
    url: "{{ splunk_uf_url }}"
    dest: /tmp/splunkforwarder.deb
    mode: '0644'

- name: Install Splunk Universal Forwarder
  ansible.builtin.apt:
    deb: /tmp/splunkforwarder.deb
    state: present

- name: Accept license and set admin password
  ansible.builtin.command:
    cmd: /opt/splunkforwarder/bin/splunk start --accept-license --answer-yes --no-prompt --seed-passwd {{ splunk_admin_password }}
    creates: /opt/splunkforwarder/var/run/splunk/splunkd.pid
  no_log: true

- name: Configure forward server
  ansible.builtin.command:
    cmd: "/opt/splunkforwarder/bin/splunk add forward-server {{ splunk_indexer }}:9997 -auth admin:{{ splunk_admin_password }}"
  no_log: true
  changed_when: true

- name: Configure monitored logs
  ansible.builtin.template:
    src: inputs.conf.j2
    dest: /opt/splunkforwarder/etc/system/local/inputs.conf
    mode: '0644'
  notify: restart splunk forwarder
```

## Inputs Configuration

```ini
# roles/splunk_forwarder/templates/inputs.conf.j2
[monitor:///var/log/syslog]
index = os
sourcetype = syslog
host = {{ inventory_hostname }}

[monitor:///var/log/auth.log]
index = security
sourcetype = linux_secure

{% for log in app_logs | default([]) %}
[monitor://{{ log.path }}]
index = {{ log.index | default('main') }}
sourcetype = {{ log.sourcetype }}
host = {{ inventory_hostname }}
{% endfor %}
```

## Deploying Across All Servers

```yaml
# playbooks/deploy-splunk.yml
---
- name: Deploy Splunk forwarders
  hosts: all
  become: true
  roles:
    - splunk_forwarder
  vars:
    app_logs:
      - path: /var/log/{{ app_name }}/*.log
        sourcetype: "{{ app_name }}"
        index: application
      - path: /var/log/nginx/access.log
        sourcetype: nginx_access
        index: web
```

## Key Takeaways

Ansible automates Splunk forwarder deployment across your entire infrastructure. Use templates for inputs.conf to customize log collection per server role. Deploy to all servers with a single playbook run and use Ansible variables to manage the Splunk indexer endpoint and log paths centrally.

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

