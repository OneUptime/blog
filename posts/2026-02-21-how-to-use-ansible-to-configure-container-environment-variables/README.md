# How to Use Ansible to Configure Container Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Environment Variables, Configuration, Containers

Description: Manage Docker container environment variables with Ansible using multiple strategies including env files, Vault secrets, and dynamic configuration.

---

Environment variables are the standard way to configure containerized applications. They separate configuration from code, following the twelve-factor app methodology. Ansible provides several approaches to managing container environment variables, from simple key-value pairs to vault-encrypted secrets and dynamically generated configurations.

## Basic Environment Variables

The simplest approach is passing environment variables directly:

```yaml
# roles/container_env/tasks/basic.yml
# Deploy container with basic environment variables
- name: Deploy application with environment variables
  community.docker.docker_container:
    name: "{{ app_name }}"
    image: "{{ app_image }}:{{ app_version }}"
    state: started
    env:
      APP_NAME: "{{ app_name }}"
      APP_PORT: "{{ app_port | string }}"
      DATABASE_URL: "postgresql://{{ db_user }}:{{ db_password }}@{{ db_host }}:5432/{{ db_name }}"
      REDIS_URL: "redis://{{ redis_host }}:6379/0"
      LOG_LEVEL: "{{ log_level }}"
      TZ: "{{ timezone }}"
```

## Using Environment Files

For containers with many variables, use an env file:

```yaml
# roles/container_env/tasks/env_file.yml
# Deploy container with environment file
- name: Generate environment file from template
  ansible.builtin.template:
    src: app.env.j2
    dest: "{{ app_dir }}/.env"
    mode: '0600'
    owner: "{{ deploy_user }}"

- name: Deploy container with env file
  community.docker.docker_container:
    name: "{{ app_name }}"
    image: "{{ app_image }}:{{ app_version }}"
    state: started
    env_file: "{{ app_dir }}/.env"
```

```bash
# roles/container_env/templates/app.env.j2
# Environment variables for {{ app_name }}
APP_NAME={{ app_name }}
APP_PORT={{ app_port }}
DATABASE_URL=postgresql://{{ db_user }}:{{ db_password }}@{{ db_host }}:5432/{{ db_name }}
REDIS_URL=redis://{{ redis_host }}:6379/0
LOG_LEVEL={{ log_level }}
{% for key, value in extra_env_vars.items() %}
{{ key }}={{ value }}
{% endfor %}
```

## Vault-Encrypted Secrets

```yaml
# roles/container_env/tasks/secrets.yml
# Deploy container with vault-encrypted environment variables
- name: Build environment with secrets from Vault
  ansible.builtin.set_fact:
    container_env:
      APP_NAME: "{{ app_name }}"
      DATABASE_URL: "postgresql://{{ db_user }}:{{ vault_db_password }}@{{ db_host }}:5432/{{ db_name }}"
      API_SECRET_KEY: "{{ vault_api_secret }}"
      SMTP_PASSWORD: "{{ vault_smtp_password }}"
      AWS_ACCESS_KEY_ID: "{{ vault_aws_access_key }}"
      AWS_SECRET_ACCESS_KEY: "{{ vault_aws_secret_key }}"

- name: Deploy container with encrypted secrets
  community.docker.docker_container:
    name: "{{ app_name }}"
    image: "{{ app_image }}"
    state: started
    env: "{{ container_env }}"
```

## Dynamic Environment Variables

Generate variables based on the deployment environment and host:

```yaml
# roles/container_env/tasks/dynamic.yml
# Generate environment variables dynamically
- name: Build dynamic environment configuration
  ansible.builtin.set_fact:
    dynamic_env:
      HOSTNAME: "{{ inventory_hostname }}"
      NODE_ID: "{{ groups['app_servers'].index(inventory_hostname) }}"
      CLUSTER_NODES: "{{ groups['app_servers'] | join(',') }}"
      INSTANCE_IP: "{{ ansible_default_ipv4.address }}"
      DEPLOY_TIMESTAMP: "{{ ansible_date_time.iso8601 }}"
      DEPLOY_VERSION: "{{ app_version }}"

- name: Merge base and dynamic environment
  ansible.builtin.set_fact:
    full_env: "{{ base_env | combine(dynamic_env) }}"

- name: Deploy with full environment
  community.docker.docker_container:
    name: "{{ app_name }}"
    image: "{{ app_image }}"
    state: started
    env: "{{ full_env }}"
```

## Per-Environment Variables with Inventory

```yaml
# inventories/production/group_vars/all.yml
base_env:
  LOG_LEVEL: "warn"
  ENVIRONMENT: "production"
  ENABLE_DEBUG: "false"
  MAX_CONNECTIONS: "100"
  CACHE_TTL: "3600"

# inventories/staging/group_vars/all.yml
base_env:
  LOG_LEVEL: "debug"
  ENVIRONMENT: "staging"
  ENABLE_DEBUG: "true"
  MAX_CONNECTIONS: "20"
  CACHE_TTL: "60"
```

## Validating Environment Variables

```yaml
# roles/container_env/tasks/validate.yml
# Validate required environment variables before deployment
- name: Check required variables are defined
  ansible.builtin.assert:
    that:
      - item.value is defined
      - item.value | string | length > 0
    fail_msg: "Required environment variable {{ item.key }} is not set"
  loop: "{{ required_env_vars | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  vars:
    required_env_vars:
      DATABASE_URL: "{{ container_env.DATABASE_URL | default('') }}"
      API_SECRET_KEY: "{{ container_env.API_SECRET_KEY | default('') }}"
```


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


## Conclusion

Managing container environment variables with Ansible gives you flexibility, security, and consistency. Use direct env dictionaries for simple cases, env files for containers with many variables, Ansible Vault for secrets, and dynamic fact-based generation for host-specific settings. The key is keeping sensitive values encrypted and validating all required variables before deployment.
