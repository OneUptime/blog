# How to Use Ansible to Execute Python Scripts on Remote Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python, Automation, Remote Execution

Description: Learn how to run Python scripts on remote hosts using Ansible with the script, shell, command, and copy modules.

---

Python is everywhere in the DevOps world, and if you are using Ansible, Python is already installed on your managed nodes (Ansible itself requires it). This makes running Python scripts on remote hosts a natural fit. Whether you are deploying data processing scripts, running health checks, or executing migration tools, Ansible gives you several ways to get Python code running on remote machines.

This post covers the main approaches: transferring and executing scripts with the `script` module, running already-deployed scripts with `command`, using inline Python with `shell`, and deploying scripts with `copy` before executing them.

## Method 1: The script Module

The `script` module is the most convenient option when you have a Python script locally and want to run it on remote hosts. It transfers the script and executes it in a single step.

Suppose you have a local script that checks disk health:

```python
#!/usr/bin/env python3
# scripts/check_disk_health.py - checks disk usage on remote hosts
import shutil
import socket
import json

hostname = socket.gethostname()
partitions = ['/', '/var', '/tmp', '/home']
results = []

for partition in partitions:
    try:
        usage = shutil.disk_usage(partition)
        percent_used = (usage.used / usage.total) * 100
        results.append({
            'partition': partition,
            'total_gb': round(usage.total / (1024**3), 2),
            'used_gb': round(usage.used / (1024**3), 2),
            'percent_used': round(percent_used, 2),
            'status': 'WARNING' if percent_used > 80 else 'OK'
        })
    except FileNotFoundError:
        pass

output = {'hostname': hostname, 'disk_health': results}
print(json.dumps(output, indent=2))
```

Here is how to run it across your fleet:

```yaml
# execute a local Python script on all remote hosts
---
- name: Check disk health across fleet
  hosts: all
  tasks:
    - name: Run disk health check script
      ansible.builtin.script:
        cmd: scripts/check_disk_health.py
        executable: /usr/bin/python3
      register: disk_health
      changed_when: false

    - name: Parse and display results
      ansible.builtin.debug:
        msg: "{{ disk_health.stdout | from_json }}"

    - name: Alert on high disk usage
      ansible.builtin.debug:
        msg: "WARNING: High disk usage detected on {{ inventory_hostname }}"
      when: "'WARNING' in disk_health.stdout"
```

The `executable` parameter tells Ansible which interpreter to use. Without it, the script would be executed as a shell script.

## Method 2: Deploy Then Execute with copy and command

When you need more control over where the script lives and how it is managed, deploy it first with `copy` and then execute it:

```yaml
# deploy a Python script and then execute it
---
- name: Deploy and run migration script
  hosts: db_servers
  vars:
    script_dir: /opt/scripts
    db_name: production
  tasks:
    - name: Create scripts directory
      ansible.builtin.file:
        path: "{{ script_dir }}"
        state: directory
        owner: root
        group: root
        mode: '0755'

    - name: Deploy migration script
      ansible.builtin.copy:
        src: scripts/db_migrate.py
        dest: "{{ script_dir }}/db_migrate.py"
        owner: root
        group: root
        mode: '0755'

    - name: Deploy requirements file
      ansible.builtin.copy:
        src: scripts/requirements.txt
        dest: "{{ script_dir }}/requirements.txt"

    - name: Install Python dependencies
      ansible.builtin.pip:
        requirements: "{{ script_dir }}/requirements.txt"
        virtualenv: "{{ script_dir }}/venv"
        virtualenv_python: python3

    - name: Run migration script in virtualenv
      ansible.builtin.command:
        cmd: "{{ script_dir }}/venv/bin/python {{ script_dir }}/db_migrate.py --db {{ db_name }}"
      register: migration_result

    - name: Show migration output
      ansible.builtin.debug:
        var: migration_result.stdout_lines
```

This approach is better for scripts that have dependencies, since you can set up a virtual environment and install requirements before running the script.

## Method 3: Inline Python with the shell Module

For small one-off Python tasks, you can embed Python code directly in your playbook using the `shell` module:

```yaml
# run inline Python code on remote hosts
---
- name: Quick Python checks
  hosts: all
  tasks:
    - name: Get Python version and installed packages
      ansible.builtin.shell:
        cmd: |
          python3 -c "
          import sys
          import platform
          import json

          info = {
              'python_version': sys.version,
              'platform': platform.platform(),
              'architecture': platform.machine(),
              'python_path': sys.executable
          }
          print(json.dumps(info, indent=2))
          "
      register: python_info
      changed_when: false

    - name: Display Python info
      ansible.builtin.debug:
        msg: "{{ python_info.stdout | from_json }}"
```

Keep inline Python short. If it grows beyond 10-15 lines, put it in a separate file.

## Method 4: Using the template Module for Dynamic Scripts

When your Python script needs to use Ansible variables, the `template` module lets you render a Jinja2 template into a Python script before deploying it:

```python
#!/usr/bin/env python3
# templates/configure_app.py.j2 - dynamically generated config script
import json
import os

CONFIG = {
    "app_name": "{{ app_name }}",
    "environment": "{{ env }}",
    "database_host": "{{ db_host }}",
    "database_port": {{ db_port }},
    "redis_host": "{{ redis_host }}",
    "log_level": "{{ log_level | default('INFO') }}",
    "workers": {{ worker_count | default(4) }}
}

config_path = "/etc/{{ app_name }}/config.json"
os.makedirs(os.path.dirname(config_path), exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(CONFIG, f, indent=2)

print(f"Configuration written to {config_path}")
print(json.dumps(CONFIG, indent=2))
```

The playbook to deploy and run this:

```yaml
# render a templated Python script and execute it
---
- name: Configure application
  hosts: app_servers
  vars:
    app_name: myservice
    env: production
    db_host: db.internal
    db_port: 5432
    redis_host: redis.internal
    log_level: WARNING
    worker_count: 8
  tasks:
    - name: Render configuration script from template
      ansible.builtin.template:
        src: templates/configure_app.py.j2
        dest: /tmp/configure_app.py
        mode: '0755'

    - name: Execute configuration script
      ansible.builtin.command:
        cmd: python3 /tmp/configure_app.py
      register: config_output

    - name: Show configuration result
      ansible.builtin.debug:
        var: config_output.stdout_lines

    - name: Clean up temporary script
      ansible.builtin.file:
        path: /tmp/configure_app.py
        state: absent
```

## Handling Script Arguments

You can pass arguments to Python scripts in several ways:

```yaml
# pass arguments to Python scripts using different methods
---
- name: Script argument examples
  hosts: all
  tasks:
    # Method 1: Command line arguments
    - name: Run script with positional arguments
      ansible.builtin.command:
        cmd: python3 /opt/scripts/process.py --input /data/raw --output /data/processed --format csv

    # Method 2: Environment variables
    - name: Run script with environment variables
      ansible.builtin.command:
        cmd: python3 /opt/scripts/process.py
      environment:
        INPUT_DIR: /data/raw
        OUTPUT_DIR: /data/processed
        OUTPUT_FORMAT: csv
        LOG_LEVEL: DEBUG

    # Method 3: Pass JSON via stdin
    - name: Run script with JSON input via stdin
      ansible.builtin.shell:
        cmd: |
          echo '{{ script_params | to_json }}' | python3 /opt/scripts/process.py --stdin
      vars:
        script_params:
          input_dir: /data/raw
          output_dir: /data/processed
          format: csv
```

## Error Handling for Script Execution

Python scripts can fail for many reasons. Here is how to handle errors properly:

```yaml
# robust error handling for Python script execution
---
- name: Run Python script with error handling
  hosts: app_servers
  tasks:
    - name: Check Python3 is available
      ansible.builtin.command:
        cmd: python3 --version
      register: python_check
      changed_when: false
      failed_when: python_check.rc != 0

    - name: Execute data processing script
      ansible.builtin.command:
        cmd: python3 /opt/scripts/process_data.py
      register: script_result
      ignore_errors: true
      timeout: 300  # kill after 5 minutes

    - name: Handle script success
      ansible.builtin.debug:
        msg: "Script completed: {{ script_result.stdout_lines[-1] }}"
      when: script_result.rc == 0

    - name: Handle script failure
      block:
        - name: Log the error
          ansible.builtin.copy:
            content: |
              Host: {{ inventory_hostname }}
              Time: {{ ansible_date_time.iso8601 }}
              Exit Code: {{ script_result.rc }}
              Error: {{ script_result.stderr }}
            dest: /var/log/script_errors.log
          delegate_to: localhost

        - name: Send alert
          ansible.builtin.uri:
            url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
            method: POST
            body_format: json
            body:
              text: "Script failed on {{ inventory_hostname }}: {{ script_result.stderr | truncate(200) }}"
      when: script_result.rc != 0
```

## Running Scripts in a Virtual Environment

When your script has pip dependencies, always use a virtual environment to avoid polluting the system Python:

```yaml
# set up a virtual environment and run a Python script inside it
---
- name: Run script in virtual environment
  hosts: workers
  vars:
    venv_path: /opt/myapp/venv
    script_path: /opt/myapp/scripts
  tasks:
    - name: Ensure python3-venv is installed
      ansible.builtin.apt:
        name: python3-venv
        state: present
      become: true

    - name: Create virtual environment
      ansible.builtin.pip:
        name:
          - requests
          - pandas
          - psycopg2-binary
        virtualenv: "{{ venv_path }}"
        virtualenv_python: python3

    - name: Run script using virtualenv Python
      ansible.builtin.command:
        cmd: "{{ venv_path }}/bin/python {{ script_path }}/analyze.py"
      register: analysis

    - name: Display results
      ansible.builtin.debug:
        var: analysis.stdout_lines
```

## Summary

Running Python scripts on remote hosts with Ansible is straightforward. Use the `script` module for quick transfers and execution, `copy` plus `command` for persistent deployments, `template` for scripts that need Ansible variables, and `shell` for short inline snippets. Always specify `executable: /usr/bin/python3` with the `script` module to avoid interpreter ambiguity, use virtual environments for managing dependencies, and add proper error handling with `ignore_errors` and `register` for production playbooks.
