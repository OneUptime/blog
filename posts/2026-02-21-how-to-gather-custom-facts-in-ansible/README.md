# How to Gather Custom Facts in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Custom Facts, Automation, DevOps

Description: Learn how to create and gather custom facts in Ansible to extend the built-in fact system with your own application and infrastructure metadata.

---

Ansible's built-in facts cover a lot of ground, but they cannot know about your specific applications, deployment metadata, or business-specific attributes. Custom facts fill that gap. They let you define your own facts that Ansible collects alongside the standard system facts, making your playbooks smarter about the specific environment they are managing.

## Why Custom Facts?

Imagine you deploy a Java application to 50 servers. Some run version 2.3, others run 2.4. You need playbooks that behave differently based on the deployed version. Built-in facts do not know about your Java app's version. But a custom fact can report it, and then your playbooks can use conditionals based on that fact just like they would with `ansible_facts['os_family']`.

## Local Facts (fact.d)

The simplest way to add custom facts is through local facts files. Ansible looks for files in `/etc/ansible/facts.d/` on each managed host. These files can be INI format, JSON format, or executable scripts that output JSON.

Here is an example of deploying a static custom fact file.

```yaml
# deploy-custom-fact.yml
# Deploys a custom fact file to each managed host
---
- name: Deploy custom application facts
  hosts: all
  become: yes
  tasks:
    - name: Create facts directory
      ansible.builtin.file:
        path: /etc/ansible/facts.d
        state: directory
        owner: root
        group: root
        mode: '0755'

    - name: Deploy application fact file
      ansible.builtin.copy:
        dest: /etc/ansible/facts.d/application.fact
        content: |
          [general]
          app_name=mywebapp
          app_version=2.4.1
          deploy_date=2026-02-21

          [database]
          db_type=postgresql
          db_version=15
        owner: root
        group: root
        mode: '0644'

    - name: Re-read facts after deploying new fact file
      ansible.builtin.setup:
        filter: ansible_local

    - name: Display custom facts
      ansible.builtin.debug:
        msg:
          - "App: {{ ansible_local.application.general.app_name }}"
          - "Version: {{ ansible_local.application.general.app_version }}"
          - "DB Type: {{ ansible_local.application.database.db_type }}"
```

Notice that local custom facts are accessed through `ansible_local`, not directly through `ansible_facts`. The structure is `ansible_local.<filename_without_extension>.<section>.<key>`.

## JSON Format Custom Facts

If you prefer JSON over INI, that works too. JSON facts do not need section headers and support nested structures.

```yaml
# deploy-json-fact.yml
# Deploys a JSON-format custom fact
---
- name: Deploy JSON custom fact
  hosts: all
  become: yes
  tasks:
    - name: Ensure facts directory exists
      ansible.builtin.file:
        path: /etc/ansible/facts.d
        state: directory
        mode: '0755'

    - name: Deploy JSON fact file
      ansible.builtin.copy:
        dest: /etc/ansible/facts.d/services.fact
        content: |
          {
            "web": {
              "name": "nginx",
              "port": 8080,
              "ssl_enabled": true,
              "backends": ["app-01", "app-02", "app-03"]
            },
            "cache": {
              "name": "redis",
              "port": 6379,
              "max_memory_mb": 512
            }
          }
        mode: '0644'

    - name: Re-gather local facts
      ansible.builtin.setup:
        filter: ansible_local

    - name: Show service facts
      ansible.builtin.debug:
        msg:
          - "Web port: {{ ansible_local.services.web.port }}"
          - "Cache memory: {{ ansible_local.services.cache.max_memory_mb }}MB"
          - "Backends: {{ ansible_local.services.web.backends | join(', ') }}"
```

## Executable Fact Scripts

The most powerful option is executable scripts. Any file in `facts.d` that has the execute permission will be run, and its stdout is parsed as JSON. This lets you gather dynamic information.

Here is a script that reports the currently running application version by checking what is actually deployed.

```yaml
# deploy-dynamic-fact.yml
# Deploys an executable fact script that detects runtime info
---
- name: Deploy dynamic fact script
  hosts: appservers
  become: yes
  tasks:
    - name: Ensure facts directory exists
      ansible.builtin.file:
        path: /etc/ansible/facts.d
        state: directory
        mode: '0755'

    - name: Deploy executable fact script
      ansible.builtin.copy:
        dest: /etc/ansible/facts.d/runtime.fact
        mode: '0755'
        content: |
          #!/bin/bash
          # This script gathers runtime application information
          # and outputs it as JSON for Ansible to consume

          # Get Java version if available
          if command -v java &>/dev/null; then
            JAVA_VER=$(java -version 2>&1 | head -1 | awk -F '"' '{print $2}')
          else
            JAVA_VER="not_installed"
          fi

          # Check if our app is running
          if systemctl is-active --quiet mywebapp; then
            APP_STATUS="running"
            APP_PID=$(systemctl show mywebapp --property=MainPID --value)
            APP_UPTIME=$(ps -o etimes= -p "$APP_PID" 2>/dev/null | tr -d ' ')
          else
            APP_STATUS="stopped"
            APP_PID=0
            APP_UPTIME=0
          fi

          # Read version from deployed artifact
          if [ -f /opt/mywebapp/version.txt ]; then
            APP_VERSION=$(cat /opt/mywebapp/version.txt)
          else
            APP_VERSION="unknown"
          fi

          # Output JSON
          cat <<EOF
          {
            "java_version": "$JAVA_VER",
            "app_status": "$APP_STATUS",
            "app_pid": $APP_PID,
            "app_uptime_seconds": ${APP_UPTIME:-0},
            "app_version": "$APP_VERSION"
          }
          EOF

    - name: Gather local facts
      ansible.builtin.setup:
        filter: ansible_local

    - name: Display runtime facts
      ansible.builtin.debug:
        var: ansible_local.runtime
```

## Python Executable Facts

You are not limited to bash scripts. Python scripts work great for more complex fact gathering.

```python
#!/usr/bin/env python3
# /etc/ansible/facts.d/disk_health.fact
# Reports disk health status using smartctl
import json
import subprocess
import os

def get_disk_health():
    """Gather disk health information from smartctl."""
    disks = {}

    # Find all block devices
    try:
        result = subprocess.run(
            ['lsblk', '-d', '-n', '-o', 'NAME,TYPE'],
            capture_output=True, text=True
        )
        for line in result.stdout.strip().split('\n'):
            parts = line.split()
            if len(parts) >= 2 and parts[1] == 'disk':
                disk_name = parts[0]
                device = f'/dev/{disk_name}'

                # Run smartctl if available
                smart = subprocess.run(
                    ['smartctl', '-H', device],
                    capture_output=True, text=True
                )

                if 'PASSED' in smart.stdout:
                    health = 'healthy'
                elif 'FAILED' in smart.stdout:
                    health = 'failing'
                else:
                    health = 'unknown'

                disks[disk_name] = {
                    'device': device,
                    'health': health
                }
    except FileNotFoundError:
        disks['error'] = 'smartctl or lsblk not found'

    return disks

if __name__ == '__main__':
    print(json.dumps(get_disk_health()))
```

## Gathering Custom Facts with the setup Module

After deploying fact files, you need to re-read facts. You can target just local facts to keep it fast.

```yaml
# re-read-facts.yml
# Demonstrates selective fact re-reading
---
- name: Work with custom facts
  hosts: all
  gather_facts: yes
  tasks:
    - name: Do some work that changes the system
      ansible.builtin.yum:
        name: httpd
        state: present
      when: ansible_facts['os_family'] == "RedHat"

    - name: Refresh only local facts (faster than full gather)
      ansible.builtin.setup:
        filter: ansible_local

    - name: Use custom facts in conditionals
      ansible.builtin.debug:
        msg: "Running app version {{ ansible_local.application.general.app_version }}"
      when: ansible_local.application is defined
```

## Templating Custom Facts

A powerful pattern is generating fact files from templates. This lets you bake deployment metadata into facts during the deployment process itself.

```yaml
# deploy-with-facts.yml
# Deploys app and records deployment metadata as a custom fact
---
- name: Deploy application with metadata facts
  hosts: appservers
  become: yes
  vars:
    app_version: "2.4.1"
    deploy_env: "production"
  tasks:
    - name: Deploy the application
      ansible.builtin.unarchive:
        src: "releases/myapp-{{ app_version }}.tar.gz"
        dest: /opt/myapp/
        owner: myapp
        group: myapp

    - name: Record deployment metadata as custom fact
      ansible.builtin.template:
        src: deploy-metadata.fact.j2
        dest: /etc/ansible/facts.d/deploy_metadata.fact
        mode: '0644'

    - name: Refresh local facts
      ansible.builtin.setup:
        filter: ansible_local
```

```jinja2
{# templates/deploy-metadata.fact.j2 #}
{# Records deployment information as a local Ansible fact #}
{
  "version": "{{ app_version }}",
  "environment": "{{ deploy_env }}",
  "deployed_at": "{{ ansible_date_time.iso8601 }}",
  "deployed_by": "{{ lookup('env', 'USER') }}",
  "ansible_version": "{{ ansible_version.full }}",
  "git_commit": "{{ lookup('pipe', 'git rev-parse --short HEAD') }}"
}
```

On the next playbook run, all this metadata is available as `ansible_local.deploy_metadata.version`, `ansible_local.deploy_metadata.deployed_at`, and so on. This is incredibly useful for auditing and for making deployment decisions based on what is currently deployed.

## Summary

Custom facts extend Ansible's fact system with your own data. Use INI or JSON files for static metadata, executable scripts for dynamic information, and templates to record deployment context. They are accessed through `ansible_local.<filename>.<key>` and integrate seamlessly with conditionals, templates, and all other Ansible features. Once you start using custom facts, you will wonder how you managed complex deployments without them.
