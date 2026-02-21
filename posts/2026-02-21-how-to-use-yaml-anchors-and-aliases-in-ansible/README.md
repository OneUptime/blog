# How to Use YAML Anchors and Aliases in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Anchors, DRY, Configuration

Description: Reduce YAML duplication in Ansible with anchors and aliases for reusable configuration blocks, variable sets, and shared task parameters.

---

YAML anchors (`&`) and aliases (`*`) let you define a value once and reference it multiple times. This is YAML's built-in mechanism for avoiding duplication. While Ansible has its own variable system that handles most reuse needs, anchors are useful within a single YAML file where you have repeated structures.

## Basic Syntax

An anchor is defined with `&name` and referenced with `*name`:

```yaml
# Define an anchor with &
defaults: &default_settings
  timeout: 30
  retries: 3
  delay: 5

# Reference it with *
service_a:
  name: service-a
  <<: *default_settings

service_b:
  name: service-b
  <<: *default_settings
  timeout: 60  # Override one value
```

## Anchors in Ansible Inventories

```yaml
# inventory/hosts.yml
# Use anchors for repeated connection settings
all:
  vars:
    common_ssh: &ssh_settings
      ansible_user: deploy
      ansible_ssh_common_args: '-o StrictHostKeyChecking=no'
      ansible_python_interpreter: /usr/bin/python3
  children:
    webservers:
      hosts:
        web1:
          ansible_host: 10.0.1.10
          <<: *ssh_settings
        web2:
          ansible_host: 10.0.1.11
          <<: *ssh_settings
    databases:
      hosts:
        db1:
          ansible_host: 10.0.2.10
          <<: *ssh_settings
          ansible_user: dbadmin  # Override for this host
```

## Anchors in Variable Files

```yaml
# group_vars/all.yml
# Define reusable configuration blocks
resource_profiles:
  small: &profile_small
    cpu_limit: "0.5"
    memory_limit: "256m"
    replicas: 1
  medium: &profile_medium
    cpu_limit: "1.0"
    memory_limit: "512m"
    replicas: 2
  large: &profile_large
    cpu_limit: "2.0"
    memory_limit: "1g"
    replicas: 3

services:
  api:
    image: myapp/api
    <<: *profile_medium
  worker:
    image: myapp/worker
    <<: *profile_small
  frontend:
    image: myapp/frontend
    <<: *profile_large
```

## Anchors in Docker Compose Templates

```yaml
# templates/docker-compose.yml.j2
# Use YAML anchors for shared service configuration
x-common-settings: &common
  restart: unless-stopped
  logging:
    driver: json-file
    options:
      max-size: "10m"
      max-file: "3"

x-app-settings: &app_defaults
  <<: *common
  networks:
    - app-network
  env_file:
    - .env

services:
  api:
    <<: *app_defaults
    image: {{ registry }}/api:{{ version }}
    ports:
      - "8080:8080"

  worker:
    <<: *app_defaults
    image: {{ registry }}/worker:{{ version }}

  scheduler:
    <<: *app_defaults
    image: {{ registry }}/scheduler:{{ version }}
```

## Anchors for Repeated Task Parameters

```yaml
# Use anchors within a playbook for repeated parameters
- name: Deploy services
  hosts: appservers
  vars:
    deploy_params: &deploy_defaults
      state: started
      restart_policy: unless-stopped
      networks:
        - name: app-network
      labels:
        managed_by: ansible
  tasks:
    - name: Deploy API service
      community.docker.docker_container:
        name: api
        image: "{{ api_image }}"
        <<: *deploy_defaults
        ports:
          - "8080:8080"

    - name: Deploy worker service
      community.docker.docker_container:
        name: worker
        image: "{{ worker_image }}"
        <<: *deploy_defaults
```

## Limitations

Anchors only work within the same YAML file. You cannot reference an anchor defined in a different file. For cross-file reuse, use Ansible's variable system, roles, or includes instead.

```yaml
# This will NOT work - anchors are file-scoped
# file1.yml
defaults: &my_defaults
  key: value

# file2.yml - cannot reference &my_defaults from file1.yml
```

Also, anchors are resolved by the YAML parser before Ansible sees the data. This means you cannot use Jinja2 expressions in anchor names or alias references.

## Merge Key Behavior

The `<<` merge key combines the anchor's values with the current mapping. Keys defined in the current mapping take precedence:

```yaml
defaults: &defaults
  a: 1
  b: 2
  c: 3

override:
  <<: *defaults
  b: 20      # This overrides b from defaults
  d: 4       # This adds a new key
# Result: {a: 1, b: 20, c: 3, d: 4}
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

YAML anchors and aliases reduce duplication within a single file. They work best for repeated configuration blocks in inventories, variable files, and Docker Compose templates. For cross-file reuse, stick with Ansible's variable system and role defaults. Use anchors when you find yourself copying the same YAML structure multiple times in one file, and the merge key (`<<`) when you need to share common settings with per-instance overrides.
