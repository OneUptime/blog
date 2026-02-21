# How to Use Ansible to Install and Configure Filebeat

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filebeat, ELK Stack, Log Management, DevOps

Description: Automate Filebeat deployment and configuration using Ansible to ship logs from application servers to your centralized logging infrastructure.

---

Filebeat is a lightweight log shipper from Elastic that runs on your application servers and forwards log data to Elasticsearch, Logstash, or Kafka. It is designed to be resource-efficient, which makes it ideal for running alongside your applications without consuming significant CPU or memory. When you have dozens or hundreds of servers generating logs, Ansible is the natural tool for deploying and configuring Filebeat consistently across all of them.

This post covers building an Ansible role that installs Filebeat, configures it to collect logs from multiple sources, and ships them to your ELK stack or Logstash pipeline.

## How Filebeat Works

Filebeat uses "inputs" to read log files and "outputs" to send them somewhere. It tracks its reading position in a registry file, so it picks up where it left off after a restart. Modules provide pre-built configurations for common log formats like Nginx, Apache, MySQL, and system logs.

```mermaid
flowchart LR
    A[/var/log/nginx/access.log] --> B[Filebeat Input]
    C[/var/log/app/app.log] --> B
    D[/var/log/syslog] --> B
    B --> E{Filebeat}
    E -->|Output| F[Logstash :5044]
    E -->|or| G[Elasticsearch :9200]
```

## Project Structure

```
filebeat/
  inventory/
    hosts.yml
  roles/
    filebeat/
      tasks/
        main.yml
        install.yml
        configure.yml
        modules.yml
      templates/
        filebeat.yml.j2
      defaults/
        main.yml
      handlers/
        main.yml
  playbook.yml
```

## Default Variables

```yaml
# roles/filebeat/defaults/main.yml
filebeat_version: "8.11"

# Output configuration (choose one)
filebeat_output_type: "logstash"

# Logstash output settings
filebeat_logstash_hosts:
  - "logstash.example.com:5044"
filebeat_logstash_ssl_enabled: false

# Elasticsearch output settings (alternative)
filebeat_elasticsearch_hosts:
  - "http://elasticsearch.example.com:9200"
filebeat_elasticsearch_username: ""
filebeat_elasticsearch_password: ""

# Kibana settings (for module dashboards)
filebeat_kibana_host: "http://kibana.example.com:5601"

# Log inputs
filebeat_inputs:
  - type: filestream
    id: syslog
    paths:
      - /var/log/syslog
      - /var/log/auth.log
    fields:
      log_type: syslog
    fields_under_root: false
  - type: filestream
    id: application
    paths:
      - /var/log/app/*.log
    fields:
      log_type: application
    fields_under_root: false
    multiline:
      pattern: '^\d{4}-\d{2}-\d{2}'
      negate: true
      match: after

# Modules to enable
filebeat_modules:
  - system
  - nginx

# Processor settings
filebeat_processors:
  - add_host_metadata: ~
  - add_cloud_metadata: ~
  - add_docker_metadata: ~

# Resource limits
filebeat_max_procs: 1
filebeat_queue_mem_events: 4096
```

## Installation Tasks

```yaml
# roles/filebeat/tasks/install.yml
---
- name: Add Elastic GPG key
  ansible.builtin.apt_key:
    url: https://artifacts.elastic.co/GPG-KEY-elasticsearch
    state: present
  become: true

- name: Add Elastic repository
  ansible.builtin.apt_repository:
    repo: "deb https://artifacts.elastic.co/packages/{{ filebeat_version }}/apt stable main"
    state: present
    filename: elastic
  become: true

- name: Install Filebeat
  ansible.builtin.apt:
    name: filebeat
    state: present
    update_cache: yes
  become: true
```

## Configuration Tasks

```yaml
# roles/filebeat/tasks/configure.yml
---
- name: Deploy Filebeat configuration
  ansible.builtin.template:
    src: filebeat.yml.j2
    dest: /etc/filebeat/filebeat.yml
    owner: root
    group: root
    mode: "0600"
  become: true
  notify: Restart filebeat

- name: Test Filebeat configuration
  ansible.builtin.command: filebeat test config
  become: true
  changed_when: false

- name: Test Filebeat output connectivity
  ansible.builtin.command: filebeat test output
  become: true
  changed_when: false
  ignore_errors: yes
  register: output_test

- name: Display output test result
  ansible.builtin.debug:
    msg: "Filebeat output test: {{ 'PASSED' if output_test.rc == 0 else 'FAILED - check connectivity to ' + filebeat_output_type }}"
```

## Module Configuration Tasks

```yaml
# roles/filebeat/tasks/modules.yml
---
- name: Enable Filebeat modules
  ansible.builtin.command: "filebeat modules enable {{ item }}"
  loop: "{{ filebeat_modules }}"
  become: true
  register: module_result
  changed_when: "'Enabled' in module_result.stdout"

- name: Set up Filebeat index templates and dashboards
  ansible.builtin.command: >
    filebeat setup
    --index-management
    -E output.logstash.enabled=false
    -E output.elasticsearch.hosts={{ filebeat_elasticsearch_hosts | to_json }}
    -E setup.kibana.host={{ filebeat_kibana_host }}
  become: true
  changed_when: false
  ignore_errors: yes
  when: filebeat_output_type == "logstash"
  run_once: true
```

## Filebeat Configuration Template

```yaml
# roles/filebeat/templates/filebeat.yml.j2
# Filebeat configuration - managed by Ansible
# Do not edit this file manually

# Input configuration
filebeat.inputs:
{% for input in filebeat_inputs %}
  - type: {{ input.type }}
    id: {{ input.id }}
    enabled: true
    paths:
{% for path in input.paths %}
      - {{ path }}
{% endfor %}
{% if input.fields is defined %}
    fields:
{% for key, value in input.fields.items() %}
      {{ key }}: {{ value }}
{% endfor %}
{% endif %}
{% if input.fields_under_root is defined %}
    fields_under_root: {{ input.fields_under_root | lower }}
{% endif %}
{% if input.multiline is defined %}
    parsers:
      - multiline:
          type: pattern
          pattern: '{{ input.multiline.pattern }}'
          negate: {{ input.multiline.negate | lower }}
          match: {{ input.multiline.match }}
{% endif %}
{% if input.exclude_lines is defined %}
    exclude_lines:
{% for line in input.exclude_lines %}
      - '{{ line }}'
{% endfor %}
{% endif %}
{% if input.include_lines is defined %}
    include_lines:
{% for line in input.include_lines %}
      - '{{ line }}'
{% endfor %}
{% endif %}

{% endfor %}

# Module configuration
filebeat.config.modules:
  path: ${path.config}/modules.d/*.yml
  reload.enabled: true
  reload.period: 10s

# Processors
processors:
{% for processor in filebeat_processors %}
  - {{ processor | to_nice_yaml | indent(4) | trim }}
{% endfor %}

# Queue settings
queue.mem:
  events: {{ filebeat_queue_mem_events }}
  flush.min_events: 512
  flush.timeout: 1s

# Output configuration
{% if filebeat_output_type == "logstash" %}
output.logstash:
  hosts:
{% for host in filebeat_logstash_hosts %}
    - "{{ host }}"
{% endfor %}
{% if filebeat_logstash_ssl_enabled %}
  ssl.enabled: true
{% endif %}
  loadbalance: true
  bulk_max_size: 2048
{% elif filebeat_output_type == "elasticsearch" %}
output.elasticsearch:
  hosts:
{% for host in filebeat_elasticsearch_hosts %}
    - "{{ host }}"
{% endfor %}
{% if filebeat_elasticsearch_username %}
  username: "{{ filebeat_elasticsearch_username }}"
  password: "{{ filebeat_elasticsearch_password }}"
{% endif %}
{% endif %}

# Kibana configuration (for dashboards)
setup.kibana:
  host: "{{ filebeat_kibana_host }}"

# Logging
logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644

# Performance tuning
max_procs: {{ filebeat_max_procs }}
```

## Main Tasks

```yaml
# roles/filebeat/tasks/main.yml
---
- name: Install Filebeat
  ansible.builtin.include_tasks: install.yml

- name: Configure Filebeat
  ansible.builtin.include_tasks: configure.yml

- name: Configure Filebeat modules
  ansible.builtin.include_tasks: modules.yml

- name: Enable and start Filebeat
  ansible.builtin.systemd:
    name: filebeat
    state: started
    enabled: true
  become: true
```

## Handlers

```yaml
# roles/filebeat/handlers/main.yml
---
- name: Restart filebeat
  ansible.builtin.systemd:
    name: filebeat
    state: restarted
  become: true
```

## The Playbook

```yaml
# playbook.yml
---
- name: Install and configure Filebeat
  hosts: app_servers
  become: true
  vars:
    filebeat_logstash_hosts:
      - "logstash.internal:5044"
    filebeat_inputs:
      - type: filestream
        id: nginx-access
        paths:
          - /var/log/nginx/access.log
        fields:
          log_type: nginx_access
        fields_under_root: false
      - type: filestream
        id: nginx-error
        paths:
          - /var/log/nginx/error.log
        fields:
          log_type: nginx_error
        fields_under_root: false
      - type: filestream
        id: app-logs
        paths:
          - /opt/myapp/logs/*.log
        fields:
          log_type: application
        fields_under_root: false
        multiline:
          pattern: '^\[?20\d{2}'
          negate: true
          match: after
    filebeat_modules:
      - system
      - nginx
  roles:
    - filebeat
```

## Running the Deployment

```bash
# Deploy Filebeat to all application servers
ansible-playbook -i inventory/hosts.yml playbook.yml

# Check Filebeat status
ansible all -i inventory/hosts.yml -m command -a "systemctl status filebeat"

# Verify logs are being shipped
ansible all -i inventory/hosts.yml -m command -a "filebeat test output"
```

## Troubleshooting

If logs are not showing up in Elasticsearch, check the Filebeat registry and logs:

```bash
# Check Filebeat logs
journalctl -u filebeat -f

# Check the registry to see what files are being tracked
cat /var/lib/filebeat/registry/filebeat/log.json | python3 -m json.tool

# Test connectivity to Logstash
filebeat test output
```

## Summary

Filebeat is the lightest way to ship logs from your servers to a centralized logging system. The Ansible role in this post handles installation, input configuration for multiple log sources, multiline log handling, and module management. By defining your log inputs as Ansible variables, you can customize which logs each server ships based on its role in your infrastructure, while keeping the core configuration consistent everywhere.
