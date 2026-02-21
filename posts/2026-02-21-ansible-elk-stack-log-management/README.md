# How to Use Ansible with ELK Stack for Log Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ELK Stack, Elasticsearch, Logging

Description: Deploy and configure the complete ELK Stack with Ansible for centralized log collection, processing, and visualization.

---

The ELK Stack (Elasticsearch, Logstash, Kibana) is a popular solution for centralized logging. Setting up ELK involves deploying three components, configuring log shipping from all servers, and creating index patterns and visualizations. Ansible automates the entire setup.

## ELK Architecture

```mermaid
graph LR
    A[App Servers] --> B[Filebeat]
    B --> C[Logstash]
    C --> D[Elasticsearch]
    D --> E[Kibana]
```

## Deploying Elasticsearch

```yaml
# roles/elasticsearch/tasks/main.yml
---
- name: Add Elasticsearch GPG key
  ansible.builtin.apt_key:
    url: https://artifacts.elastic.co/GPG-KEY-elasticsearch
    state: present

- name: Add Elasticsearch repository
  ansible.builtin.apt_repository:
    repo: "deb https://artifacts.elastic.co/packages/8.x/apt stable main"
    state: present

- name: Install Elasticsearch
  ansible.builtin.apt:
    name: elasticsearch
    state: present

- name: Configure Elasticsearch
  ansible.builtin.template:
    src: elasticsearch.yml.j2
    dest: /etc/elasticsearch/elasticsearch.yml
    mode: '0660'
  notify: restart elasticsearch

- name: Configure JVM heap
  ansible.builtin.template:
    src: jvm.options.j2
    dest: /etc/elasticsearch/jvm.options.d/heap.options
    mode: '0644'
  notify: restart elasticsearch

- name: Ensure Elasticsearch is running
  ansible.builtin.service:
    name: elasticsearch
    state: started
    enabled: true
```

## Deploying Filebeat on All Servers

```yaml
# roles/filebeat/tasks/main.yml
---
- name: Install Filebeat
  ansible.builtin.apt:
    name: filebeat
    state: present

- name: Configure Filebeat
  ansible.builtin.template:
    src: filebeat.yml.j2
    dest: /etc/filebeat/filebeat.yml
    mode: '0600'
  notify: restart filebeat

- name: Enable Filebeat modules
  ansible.builtin.command:
    cmd: "filebeat modules enable {{ item }}"
  loop: "{{ filebeat_modules }}"
  changed_when: true

- name: Ensure Filebeat is running
  ansible.builtin.service:
    name: filebeat
    state: started
    enabled: true
```

## Filebeat Configuration

```yaml
# roles/filebeat/templates/filebeat.yml.j2
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/syslog
      - /var/log/auth.log
{% for path in app_log_paths | default([]) %}
      - {{ path }}
{% endfor %}
    fields:
      environment: {{ environment_name }}
      hostname: {{ inventory_hostname }}

output.logstash:
  hosts: ["{{ logstash_host }}:5044"]

logging.level: warning
```

## Deploying Logstash

```yaml
# roles/logstash/tasks/main.yml
---
- name: Install Logstash
  ansible.builtin.apt:
    name: logstash
    state: present

- name: Deploy Logstash pipeline
  ansible.builtin.template:
    src: pipeline.conf.j2
    dest: /etc/logstash/conf.d/main.conf
    mode: '0644'
  notify: restart logstash
```

## Deploying Kibana

```yaml
# roles/kibana/tasks/main.yml
---
- name: Install Kibana
  ansible.builtin.apt:
    name: kibana
    state: present

- name: Configure Kibana
  ansible.builtin.template:
    src: kibana.yml.j2
    dest: /etc/kibana/kibana.yml
    mode: '0660'
  notify: restart kibana

- name: Ensure Kibana is running
  ansible.builtin.service:
    name: kibana
    state: started
    enabled: true
```

## Complete Deployment Playbook

```yaml
# playbooks/deploy-elk.yml
---
- name: Deploy Elasticsearch cluster
  hosts: elasticsearch
  become: true
  roles:
    - elasticsearch

- name: Deploy Logstash
  hosts: logstash
  become: true
  roles:
    - logstash

- name: Deploy Kibana
  hosts: kibana
  become: true
  roles:
    - kibana

- name: Deploy Filebeat on all servers
  hosts: all
  become: true
  roles:
    - filebeat
```

## Key Takeaways

Ansible makes ELK Stack deployment repeatable. Deploy Elasticsearch nodes as a cluster, configure Logstash pipelines for log processing, set up Kibana for visualization, and install Filebeat on every server for log shipping. Use templates to generate environment-specific configurations. The entire stack can be deployed with a single playbook run.

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

