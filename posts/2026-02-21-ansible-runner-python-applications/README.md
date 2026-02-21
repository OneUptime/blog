# How to Use Ansible Runner in Python Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python, ansible-runner, API, Automation

Description: Integrate Ansible into Python applications using ansible-runner for simplified playbook execution, event handling, and result processing.

---

Ansible Runner is the recommended way to embed Ansible execution into Python applications. It provides a clean, well-documented API that handles all the complexity of setting up the Ansible execution environment. Unlike the raw Ansible Python API, ansible-runner manages artifacts, provides event-based callbacks, and supports asynchronous execution out of the box.

## Installation

```bash
pip install ansible-runner
```

## Basic Usage: Running a Playbook

The simplest way to run a playbook:

```python
# run_playbook.py - Basic ansible-runner usage
import ansible_runner

# Run a playbook
result = ansible_runner.run(
    private_data_dir='/path/to/project',
    playbook='deploy.yml',
)

# Check the result
print(f"Status: {result.status}")        # successful, failed, timeout
print(f"Return code: {result.rc}")        # 0 = success
print(f"Final output:\n{result.stdout.read()}")

# Access individual host results
for event in result.events:
    if event['event'] == 'runner_on_ok':
        host = event['event_data']['host']
        task = event['event_data']['task']
        print(f"OK: {host} - {task}")
```

## Project Structure for ansible-runner

ansible-runner expects a specific directory layout:

```
project/
  project/
    deploy.yml            # Your playbooks
    roles/                # Roles used by playbooks
  inventory/
    hosts                 # Inventory files
  env/
    settings              # Runner settings (JSON)
    extravars             # Extra variables (JSON)
    passwords             # Passwords (JSON)
    ssh_key               # SSH private key
  artifacts/              # Created automatically for results
```

## Running Ad-Hoc Commands

```python
# run_adhoc.py - Run ad-hoc commands with ansible-runner
import ansible_runner

result = ansible_runner.run(
    private_data_dir='/path/to/project',
    module='command',
    module_args='uptime',
    host_pattern='webservers',
)

for event in result.events:
    if event['event'] == 'runner_on_ok':
        host = event['event_data']['host']
        stdout = event['event_data']['res'].get('stdout', '')
        print(f"{host}: {stdout}")
```

## Passing Extra Variables

```python
result = ansible_runner.run(
    private_data_dir='/path/to/project',
    playbook='deploy.yml',
    extravars={
        'app_version': '2.5.0',
        'deploy_env': 'production',
        'rollback': False,
    },
)
```

## Event-Based Processing

ansible-runner emits events for every Ansible action. This lets you build real-time dashboards and notifications:

```python
# event_handler.py - Process events in real time
import ansible_runner


def event_handler(event):
    """Called for every Ansible event during execution."""
    event_type = event.get('event', '')

    if event_type == 'playbook_on_play_start':
        play = event['event_data'].get('play', 'unknown')
        print(f"[PLAY] {play}")

    elif event_type == 'playbook_on_task_start':
        task = event['event_data'].get('task', 'unknown')
        print(f"[TASK] {task}")

    elif event_type == 'runner_on_ok':
        host = event['event_data']['host']
        changed = event['event_data']['res'].get('changed', False)
        status = 'CHANGED' if changed else 'OK'
        print(f"  [{status}] {host}")

    elif event_type == 'runner_on_failed':
        host = event['event_data']['host']
        msg = event['event_data']['res'].get('msg', 'Unknown error')
        print(f"  [FAILED] {host}: {msg}")

    elif event_type == 'playbook_on_stats':
        print("[STATS] Playbook complete")


result = ansible_runner.run(
    private_data_dir='/path/to/project',
    playbook='deploy.yml',
    event_handler=event_handler,
)
```

## Asynchronous Execution

Run playbooks in the background:

```python
# async_run.py - Non-blocking playbook execution
import ansible_runner
import time

# Start the run in the background
thread, runner = ansible_runner.run_async(
    private_data_dir='/path/to/project',
    playbook='deploy.yml',
)

# Monitor progress
while runner.status == 'running':
    print(f"Status: {runner.status}")
    time.sleep(5)

# Get the final result
print(f"Final status: {runner.status}")
print(f"Return code: {runner.rc}")
```

## Integration with Flask

```python
# app.py - Flask web app that triggers Ansible runs
from flask import Flask, jsonify, request
import ansible_runner
import threading

app = Flask(__name__)
runs = {}


@app.route('/deploy', methods=['POST'])
def deploy():
    data = request.json
    version = data.get('version', 'latest')

    thread, runner = ansible_runner.run_async(
        private_data_dir='/opt/ansible/project',
        playbook='deploy.yml',
        extravars={'app_version': version},
    )

    run_id = runner.config.artifact_dir
    runs[run_id] = runner

    return jsonify({
        'run_id': run_id,
        'status': 'started',
    })


@app.route('/status/<path:run_id>')
def status(run_id):
    runner = runs.get(run_id)
    if not runner:
        return jsonify({'error': 'Run not found'}), 404

    return jsonify({
        'status': runner.status,
        'rc': runner.rc,
    })
```

## Handling Passwords and Secrets

```python
result = ansible_runner.run(
    private_data_dir='/path/to/project',
    playbook='deploy.yml',
    passwords={
        'become_pass': 'sudo_password',
        'conn_pass': 'ssh_password',
    },
)
```

Or use the `env/passwords` file:

```json
{
    "^SSH [Pp]assword:": "ssh_password",
    "^BECOME [Pp]assword:": "sudo_password"
}
```

## Summary

ansible-runner is the best way to integrate Ansible into Python applications. It provides a clean API for running playbooks and ad-hoc commands, event-based callbacks for real-time monitoring, async execution for non-blocking operations, and artifact management for audit trails. Use it for web applications, CI/CD pipelines, and any Python code that needs to trigger Ansible automation.

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

