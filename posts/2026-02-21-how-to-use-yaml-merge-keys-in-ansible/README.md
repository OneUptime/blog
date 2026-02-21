# How to Use YAML Merge Keys in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Merge Keys, DRY, Configuration

Description: Use YAML merge keys to combine mappings in Ansible for reducing duplication in variable files, inventories, and configuration templates.

---

YAML merge keys (`<<`) let you combine one mapping into another, effectively inheriting key-value pairs from a referenced anchor. This is useful in Ansible when you have multiple similar configurations that share a common base but differ in a few values.

## Basic Merge Key Syntax

```yaml
# Define a base configuration with an anchor
base_config: &defaults
  restart_policy: unless-stopped
  network: app-network
  log_driver: json-file
  memory: 256m

# Merge the base into specific configurations
service_a:
  <<: *defaults
  image: app-a:latest
  port: 8001

service_b:
  <<: *defaults
  image: app-b:latest
  port: 8002
  memory: 512m  # Override the default
```

The result for `service_b` is:

```yaml
service_b:
  restart_policy: unless-stopped
  network: app-network
  log_driver: json-file
  memory: 512m    # Overridden value
  image: app-b:latest
  port: 8002
```

## Merging Multiple Anchors

You can merge from multiple sources:

```yaml
# Define multiple anchor sources
network_config: &network
  network: production-net
  dns: 10.0.0.2

resource_config: &resources
  cpu: "0.5"
  memory: 256m

logging_config: &logging
  log_driver: fluentd
  log_opts:
    fluentd-address: localhost:24224

# Merge all three into a service
service:
  <<: [*network, *resources, *logging]
  image: myapp:latest
  port: 8080
```

When merging multiple anchors, if there are conflicting keys, the first anchor in the list takes precedence.

## Practical Ansible Examples

### Inventory with Shared Settings

```yaml
# inventory/hosts.yml
all:
  vars:
    connection_defaults: &conn_defaults
      ansible_user: deploy
      ansible_python_interpreter: /usr/bin/python3
      ansible_ssh_common_args: '-o StrictHostKeyChecking=no'
  children:
    webservers:
      hosts:
        web1:
          ansible_host: 10.0.1.10
          <<: *conn_defaults
        web2:
          ansible_host: 10.0.1.11
          <<: *conn_defaults
    databases:
      hosts:
        db1:
          ansible_host: 10.0.2.10
          <<: *conn_defaults
          ansible_user: dbadmin
```

### Variable Files with Shared Defaults

```yaml
# group_vars/all.yml
container_defaults: &container_defaults
  restart_policy: unless-stopped
  pull: true
  state: started
  labels:
    managed_by: ansible
    environment: "{{ deploy_env }}"

containers:
  nginx:
    <<: *container_defaults
    image: nginx:1.25
    ports:
      - "80:80"
      - "443:443"

  app:
    <<: *container_defaults
    image: "{{ app_image }}:{{ app_version }}"
    ports:
      - "8080:8080"
    memory: 1g

  redis:
    <<: *container_defaults
    image: redis:7-alpine
    memory: 256m
```

### Docker Compose Templates

```yaml
# templates/docker-compose.yml.j2
x-defaults: &service_defaults
  restart: unless-stopped
  networks:
    - app
  logging:
    driver: json-file
    options:
      max-size: "10m"

services:
  api:
    <<: *service_defaults
    image: {{ registry }}/api:{{ version }}
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: {{ db_url }}

  worker:
    <<: *service_defaults
    image: {{ registry }}/worker:{{ version }}
    environment:
      QUEUE_URL: {{ queue_url }}

  scheduler:
    <<: *service_defaults
    image: {{ registry }}/scheduler:{{ version }}
```

## Precedence Rules

```yaml
# Local keys override merged keys
defaults: &defaults
  a: 1
  b: 2
  c: 3

specific:
  <<: *defaults
  b: 20        # Local value wins: b=20
  d: 4         # New key added

# Result: {a: 1, b: 20, c: 3, d: 4}
```

```yaml
# First anchor wins when merging multiple
first: &first
  shared_key: from_first

second: &second
  shared_key: from_second

merged:
  <<: [*first, *second]
# Result: {shared_key: from_first}
```

## Limitations

Merge keys only work with mappings (dictionaries). They do not work with sequences (lists):

```yaml
# This does NOT work - cannot merge lists
base_packages: &base
  - curl
  - wget

all_packages:
  <<: *base           # ERROR: merge key on a sequence
  - extra_package

# Instead, define lists in variables and use Jinja2
base_packages:
  - curl
  - wget

extra_packages:
  - nginx

all_packages: "{{ base_packages + extra_packages }}"
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

YAML merge keys reduce duplication in configuration files where multiple structures share common key-value pairs. They work well in Ansible inventories, variable files, and Docker Compose templates. Remember that local keys override merged ones, first anchors win in multi-merge scenarios, and merge keys only work with mappings. For anything more complex, use Ansible's own variable merging with `combine()` filters and role defaults.
