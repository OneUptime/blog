# How to Use Ansible with SaltStack for Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SaltStack, Migration, Configuration Management

Description: Migrate from SaltStack to Ansible by converting Salt states to Ansible tasks and transitioning minion management to Ansible inventory.

---

SaltStack and Ansible share similar concepts but differ in architecture. Salt uses a master-minion model with agents, while Ansible is agentless. Migrating means converting Salt states to Ansible tasks and replacing the Salt master/minion infrastructure.

## Concept Mapping

| SaltStack | Ansible |
|---|---|
| State | Task |
| State file (.sls) | Playbook/Role |
| Pillar | Variable |
| Grain | Fact |
| Minion | Managed host |
| Salt Master | Control node |
| Targeting | Inventory/Groups |

## Converting Salt States

Salt state:

```yaml
# salt/nginx/init.sls
nginx:
  pkg.installed: []
  service.running:
    - enable: True
    - require:
      - pkg: nginx

/etc/nginx/nginx.conf:
  file.managed:
    - source: salt://nginx/nginx.conf.j2
    - template: jinja
    - watch_in:
      - service: nginx
```

Ansible equivalent:

```yaml
# roles/nginx/tasks/main.yml
---
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present

- name: Configure nginx
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: '0644'
  notify: restart nginx

- name: Ensure nginx is running
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: true
```

## Converting Pillar to Variables

Salt pillar:

```yaml
# pillar/nginx.sls
nginx:
  worker_processes: 4
  worker_connections: 1024
```

Ansible variables:

```yaml
# group_vars/webservers.yml
nginx_worker_processes: 4
nginx_worker_connections: 1024
```

## Building Inventory from Salt

```bash
# Export Salt minion list to Ansible inventory
salt '*' grains.items --out json | python3 -c "
import json, sys, yaml
data = json.load(sys.stdin)
inventory = {'all': {'children': {}}}
for minion, grains in data.items():
    role = grains.get('role', 'unknown')
    if role not in inventory['all']['children']:
        inventory['all']['children'][role] = {'hosts': {}}
    inventory['all']['children'][role]['hosts'][minion] = {
        'ansible_host': grains.get('ipv4', [''])[0]
    }
yaml.dump(inventory, sys.stdout)
"
```

## Removing Salt

```yaml
# playbooks/remove-salt.yml
---
- name: Remove SaltStack from servers
  hosts: all
  become: true
  tasks:
    - name: Stop salt-minion
      ansible.builtin.service:
        name: salt-minion
        state: stopped
        enabled: false
      ignore_errors: true

    - name: Remove Salt packages
      ansible.builtin.apt:
        name:
          - salt-minion
          - salt-common
        state: absent
        purge: true

    - name: Remove Salt directories
      ansible.builtin.file:
        path: "{{ item }}"
        state: absent
      loop:
        - /etc/salt
        - /var/cache/salt
        - /var/log/salt
```

## Key Takeaways

SaltStack to Ansible migration benefits from the conceptual similarity between the tools. States become tasks. Pillars become variables. Grains map to facts. The biggest difference is removing the agent (minion) requirement. Convert states to roles incrementally, build your Ansible inventory from the existing Salt minion list, and remove Salt once everything is migrated.

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

