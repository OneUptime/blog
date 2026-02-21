# How to Use Ansible Playbook with Custom Facts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Custom Facts, DevOps, Automation

Description: Learn how to create and use custom Ansible facts to expose application-specific metadata from managed hosts and use it in your playbooks.

---

Ansible gathers a huge amount of information about each managed host through its fact-gathering system. You get CPU count, memory, disk layout, network interfaces, and much more out of the box. But sometimes you need information that Ansible does not know about: the application version deployed on a server, whether a specific service is licensed, which database cluster a host belongs to, or what maintenance window the server is assigned to. Custom facts let you define this kind of host-specific metadata and use it in your playbooks just like any built-in fact.

## How Custom Facts Work

Ansible supports two kinds of custom facts: static and dynamic.

**Static facts** are JSON or INI files placed in the `/etc/ansible/facts.d/` directory on the managed host. Ansible reads them during fact gathering and makes their contents available under `ansible_local`.

**Dynamic facts** are executable scripts in the same directory. Ansible runs them and parses their JSON output as facts. This lets you generate facts on the fly based on the current state of the host.

## Creating Static Custom Facts

The simplest custom fact is a plain INI file:

```ini
# /etc/ansible/facts.d/application.fact
# Static fact file describing the deployed application
[general]
app_name = mywebapp
app_version = 2.4.1
environment = production

[database]
cluster = db-east-01
role = primary
```

Or you can use JSON format:

```json
{
    "app_name": "mywebapp",
    "app_version": "2.4.1",
    "environment": "production",
    "database": {
        "cluster": "db-east-01",
        "role": "primary"
    }
}
```

Save this as `/etc/ansible/facts.d/application.fact` on the managed host. After fact gathering, these values become available as:

```yaml
# Accessing static custom facts in a playbook
- name: Show application version
  debug:
    msg: "App {{ ansible_local.application.general.app_name }} version {{ ansible_local.application.general.app_version }}"
```

## Deploying Static Facts with Ansible

You probably do not want to manually create fact files on every host. Let Ansible do it:

```yaml
---
# deploy-custom-facts.yml
# Deploy static custom facts to all managed hosts

- hosts: all
  become: yes
  tasks:
    # Make sure the facts directory exists
    - name: Create custom facts directory
      file:
        path: /etc/ansible/facts.d
        state: directory
        owner: root
        group: root
        mode: '0755'

    # Deploy the fact file using a template
    - name: Deploy application facts
      template:
        src: templates/application.fact.j2
        dest: /etc/ansible/facts.d/application.fact
        owner: root
        group: root
        mode: '0644'
      register: facts_deployed

    # Reload facts if the file changed so subsequent tasks see updated values
    - name: Reload custom facts
      setup:
        filter: ansible_local
      when: facts_deployed.changed
```

The template:

```ini
# templates/application.fact.j2
# Custom facts for {{ inventory_hostname }}
[general]
app_name = {{ app_name }}
app_version = {{ app_version | default('unknown') }}
environment = {{ env_name }}
deploy_date = {{ ansible_date_time.iso8601 }}

[network]
vlan = {{ vlan_id | default('default') }}
datacenter = {{ datacenter }}
```

## Creating Dynamic Custom Facts

Dynamic facts are executable scripts that output JSON to stdout. They are useful when the fact value needs to be computed at runtime.

Here is a script that reports the current disk usage of the application directory:

```bash
#!/bin/bash
# /etc/ansible/facts.d/disk_usage.fact
# Dynamic fact: reports disk usage for key directories
# Must be executable: chmod +x /etc/ansible/facts.d/disk_usage.fact

APP_DIR="/opt/myapp"
LOG_DIR="/var/log/myapp"

# Get disk usage in MB
app_usage=$(du -sm "$APP_DIR" 2>/dev/null | awk '{print $1}')
log_usage=$(du -sm "$LOG_DIR" 2>/dev/null | awk '{print $1}')

# Get available disk space on the root partition
root_avail=$(df -m / | tail -1 | awk '{print $4}')

# Output must be valid JSON
cat <<EOF
{
    "app_directory_mb": ${app_usage:-0},
    "log_directory_mb": ${log_usage:-0},
    "root_available_mb": ${root_avail:-0}
}
EOF
```

Here is a Python-based dynamic fact that checks running services:

```python
#!/usr/bin/env python3
# /etc/ansible/facts.d/services.fact
# Dynamic fact: checks the status of critical application services

import subprocess
import json

services = ['nginx', 'postgresql', 'redis-server', 'myapp']
result = {}

for svc in services:
    try:
        output = subprocess.run(
            ['systemctl', 'is-active', svc],
            capture_output=True, text=True
        )
        result[svc] = output.stdout.strip()
    except Exception:
        result[svc] = 'unknown'

print(json.dumps(result))
```

Deploy the dynamic fact script and make it executable:

```yaml
# Deploy a dynamic fact script
- name: Deploy disk usage fact script
  copy:
    src: files/disk_usage.fact
    dest: /etc/ansible/facts.d/disk_usage.fact
    owner: root
    group: root
    mode: '0755'
```

## Using Custom Facts in Playbooks

Once facts are deployed and gathered, use them like any other variable:

```yaml
---
# maintenance.yml
# Use custom facts to make decisions about maintenance tasks

- hosts: all
  become: yes
  tasks:
    # Conditionally clean logs based on dynamic disk usage facts
    - name: Clean old log files when disk usage is high
      find:
        paths: /var/log/myapp
        age: 7d
        recurse: yes
      register: old_logs
      when: ansible_local.disk_usage.log_directory_mb | int > 500

    - name: Remove old log files
      file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_logs.files }}"
      when:
        - old_logs is defined
        - old_logs.files is defined

    # Use static facts for deployment decisions
    - name: Update application if version is outdated
      include_tasks: tasks/update-app.yml
      when: ansible_local.application.general.app_version is version('2.5.0', '<')

    # Group actions based on custom facts
    - name: Run primary database tasks
      include_tasks: tasks/db-primary.yml
      when: ansible_local.application.database.role == 'primary'

    - name: Run replica database tasks
      include_tasks: tasks/db-replica.yml
      when: ansible_local.application.database.role == 'replica'
```

## Using Custom Facts for Inventory Grouping

You can use custom facts to dynamically group hosts with `group_by`:

```yaml
---
# group-by-facts.yml
# Dynamically group hosts based on their custom facts

- hosts: all
  tasks:
    # Create dynamic groups based on the environment custom fact
    - name: Group hosts by environment
      group_by:
        key: "env_{{ ansible_local.application.general.environment }}"

    # Create dynamic groups based on database role
    - name: Group hosts by database role
      group_by:
        key: "db_{{ ansible_local.application.database.role }}"
      when: ansible_local.application.database is defined

# Now target only production hosts
- hosts: env_production
  tasks:
    - name: Production-specific configuration
      debug:
        msg: "Running production tasks on {{ inventory_hostname }}"

# Target only primary database hosts
- hosts: db_primary
  tasks:
    - name: Primary database tasks
      debug:
        msg: "Running primary DB tasks on {{ inventory_hostname }}"
```

## Refreshing Facts Mid-Playbook

If a task changes something that a custom fact reports on, you can refresh facts:

```yaml
- name: Deploy new application version
  unarchive:
    src: "myapp-{{ new_version }}.tar.gz"
    dest: /opt/myapp
    remote_src: yes

# Update the static fact with the new version
- name: Update application version fact
  lineinfile:
    path: /etc/ansible/facts.d/application.fact
    regexp: '^app_version'
    line: "app_version = {{ new_version }}"

# Re-gather local facts so subsequent tasks see the updated version
- name: Refresh local facts
  setup:
    filter: ansible_local
```

## Debugging Custom Facts

To see what custom facts are available on a host:

```bash
# Display all custom (local) facts from a specific host
ansible webserver1 -m setup -a 'filter=ansible_local'

# Display a specific custom fact file's contents
ansible webserver1 -m setup -a 'filter=ansible_local' | python3 -m json.tool
```

## Wrapping Up

Custom facts bridge the gap between what Ansible knows about your infrastructure automatically and what your specific organization needs. Static facts are perfect for metadata that changes infrequently, like environment labels, maintenance windows, or team ownership. Dynamic facts handle anything that needs to be computed fresh each time, like disk usage, running service status, or application health checks. By deploying fact files through Ansible itself and using them in conditionals, you build playbooks that adapt to each host's actual state rather than relying on rigid inventory grouping alone.
