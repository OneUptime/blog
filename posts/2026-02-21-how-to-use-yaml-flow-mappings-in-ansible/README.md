# How to Use YAML Flow Mappings in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Flow Style, Syntax, DevOps

Description: Understand YAML flow mappings and sequences in Ansible for compact inline syntax when writing short variable definitions and simple data structures.

---

YAML has two representation styles: block style (the multi-line format you use most often) and flow style (a compact, inline format similar to JSON). Flow mappings use curly braces `{}` and flow sequences use square brackets `[]`. In Ansible, flow style is occasionally useful for keeping simple structures compact.

## Block vs Flow Style

```yaml
# Block style mapping (standard Ansible)
user:
  name: deploy
  uid: 1000
  groups:
    - docker
    - sudo

# Flow style mapping (compact)
user: {name: deploy, uid: 1000, groups: [docker, sudo]}
```

Both are equivalent YAML. The block style is more readable for complex structures, while flow style works well for simple key-value pairs.

## When Flow Style Makes Sense

### Simple Variable Definitions

```yaml
# Flow style for simple key-value variables
vars:
  db_config: {host: localhost, port: 5432, name: mydb}
  cache_config: {host: localhost, port: 6379}
  app_ports: [8080, 8081, 8082]
```

### Short Lists in Tags and When Conditions

```yaml
# Flow sequence for short tag lists
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
  tags: [nginx, webserver, install]
```

### Simple Loop Items

```yaml
# Flow mappings in loop items
- name: Create users
  ansible.builtin.user:
    name: "{{ item.name }}"
    uid: "{{ item.uid }}"
    groups: "{{ item.groups }}"
  loop:
    - {name: alice, uid: 1001, groups: "sudo,docker"}
    - {name: bob, uid: 1002, groups: "docker"}
    - {name: charlie, uid: 1003, groups: "docker"}
```

### Dictionary Arguments

```yaml
# Flow mapping for simple dict parameters
- name: Set sysctl values
  ansible.posix.sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
  loop:
    - {key: net.ipv4.ip_forward, value: "1"}
    - {key: vm.swappiness, value: "10"}
    - {key: fs.file-max, value: "65536"}
```

## When to Avoid Flow Style

Flow style becomes hard to read when structures are nested or have many keys:

```yaml
# Bad: too complex for flow style
bad_example: {name: myapp, config: {database: {host: db.example.com, port: 5432, name: mydb, user: admin, password: secret}, cache: {host: redis.example.com, port: 6379}}}

# Good: use block style for complex structures
good_example:
  name: myapp
  config:
    database:
      host: db.example.com
      port: 5432
      name: mydb
      user: admin
      password: "{{ vault_db_password }}"
    cache:
      host: redis.example.com
      port: 6379
```

## Mixing Styles

You can mix block and flow styles in the same document:

```yaml
# Mixed styles - block for structure, flow for simple values
services:
  - name: web
    ports: [80, 443]
    env: {LOG_LEVEL: info, WORKERS: "4"}
    volumes:
      - /data/web:/app/data
      - /etc/ssl:/etc/ssl:ro

  - name: api
    ports: [8080]
    env: {LOG_LEVEL: debug, WORKERS: "2"}
    volumes:
      - /data/api:/app/data
```

## Flow Style in Jinja2 Filters

Flow style appears naturally when constructing data structures in Jinja2:

```yaml
# Constructing dictionaries with Jinja2 uses flow-like syntax
- name: Set dynamic configuration
  ansible.builtin.set_fact:
    app_config: >-
      {{ {'name': app_name, 'port': app_port, 'env': deploy_env}
         | combine(extra_config | default({})) }}
```

## Style Guidelines

1. Use flow style for structures with 3 or fewer simple key-value pairs
2. Use flow sequences for lists with 5 or fewer simple items
3. Never use flow style for structures containing Jinja2 expressions with braces (the braces conflict)
4. Switch to block style the moment readability suffers

```yaml
# Avoid: flow style with Jinja2 - confusing braces
bad: {name: "{{ app_name }}", port: "{{ app_port }}"}

# Better: block style with Jinja2
good:
  name: "{{ app_name }}"
  port: "{{ app_port }}"
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

Flow mappings and sequences are a YAML convenience feature. They make simple data structures compact and scannable. In Ansible, use them for short lists of tags, simple loop items, and compact variable definitions. Switch to block style for anything complex, anything with Jinja2 expressions, or anything with more than a few keys. The goal is readability, and flow style only helps readability when the data is genuinely simple.
