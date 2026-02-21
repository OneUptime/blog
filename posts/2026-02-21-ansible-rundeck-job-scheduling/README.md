# How to Use Ansible with Rundeck for Job Scheduling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Rundeck, Job Scheduling, Automation

Description: Integrate Ansible with Rundeck for scheduled job execution, approval workflows, and centralized operations management.

---

Rundeck is an operations automation platform that provides job scheduling, access control, and workflow management. It can execute Ansible playbooks as job steps, adding scheduling and approval workflows on top of Ansible's automation capabilities.

## Integration Architecture

```mermaid
graph LR
    A[Rundeck UI] --> B[Job Definition]
    B --> C[Ansible Executor]
    C --> D[Target Hosts]
```

## Installing Rundeck with Ansible

```yaml
# roles/rundeck/tasks/main.yml
---
- name: Add Rundeck repository
  ansible.builtin.apt_repository:
    repo: "deb https://packages.rundeck.com/pagerduty/rundeck/any/ any main"
    state: present

- name: Install Rundeck
  ansible.builtin.apt:
    name: rundeck
    state: present
    update_cache: true

- name: Configure Rundeck
  ansible.builtin.template:
    src: rundeck-config.properties.j2
    dest: /etc/rundeck/rundeck-config.properties
    mode: '0640'
  notify: restart rundeck

- name: Install Ansible plugin for Rundeck
  ansible.builtin.get_url:
    url: "https://github.com/Batix/rundeck-ansible-plugin/releases/download/{{ plugin_version }}/ansible-plugin-{{ plugin_version }}.jar"
    dest: /var/lib/rundeck/libext/ansible-plugin.jar
    mode: '0644'
  notify: restart rundeck

- name: Ensure Rundeck is running
  ansible.builtin.service:
    name: rundeckd
    state: started
    enabled: true
```

## Creating Rundeck Jobs for Ansible

```yaml
# tasks/rundeck-jobs.yml
---
- name: Create Rundeck job for deployment
  ansible.builtin.uri:
    url: "http://{{ rundeck_host }}:4440/api/44/project/{{ project_name }}/jobs/import"
    method: POST
    headers:
      X-Rundeck-Auth-Token: "{{ rundeck_api_token }}"
      Content-Type: application/yaml
    body: |
      - name: Deploy Application
        description: Deploy application using Ansible
        sequence:
          commands:
            - exec: ansible-playbook /opt/ansible/playbooks/deploy.yml -e app_version=${option.version}
        options:
          - name: version
            description: Application version to deploy
            required: true
        schedule:
          time:
            hour: '02'
            minute: '00'
          month: '*'
          dayofmonth: '*'
    status_code: 200
```

## Key Takeaways

Rundeck adds scheduling, approval workflows, and a web interface on top of Ansible. Install the Ansible plugin to run playbooks directly from Rundeck jobs. This gives operations teams a centralized platform for managing automated tasks with role-based access control.

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

