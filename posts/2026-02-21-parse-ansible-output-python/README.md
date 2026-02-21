# How to Parse Ansible Output in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python, Parsing, JSON, Automation

Description: Parse Ansible playbook output in Python using the JSON callback plugin and regex patterns for reporting and monitoring integration.

---

When you run Ansible from Python scripts or CI/CD pipelines, you often need to parse the output to extract results, detect failures, and generate reports. Ansible supports multiple output formats through callback plugins, and the JSON callback is the most parse-friendly. This guide covers all the approaches to parsing Ansible output programmatically.

## Using the JSON Callback Plugin

The cleanest approach is to tell Ansible to output JSON:

```python
# parse_json_output.py - Parse Ansible JSON callback output
import subprocess
import json
import os


def run_and_parse(playbook, inventory):
    """Run a playbook with JSON output and parse the results."""
    env = os.environ.copy()
    env['ANSIBLE_STDOUT_CALLBACK'] = 'json'
    env['ANSIBLE_LOAD_CALLBACK_PLUGINS'] = '1'

    result = subprocess.run(
        ['ansible-playbook', playbook, '-i', inventory],
        capture_output=True,
        text=True,
        env=env,
    )

    output = json.loads(result.stdout)
    return parse_playbook_results(output)


def parse_playbook_results(data):
    """Extract structured results from JSON callback output."""
    summary = {
        'plays': [],
        'stats': {},
        'failures': [],
        'changes': [],
    }

    for play in data.get('plays', []):
        play_info = {
            'name': play['play']['name'],
            'tasks': [],
        }

        for task in play.get('tasks', []):
            task_name = task['task']['name']
            for host, result in task.get('hosts', {}).items():
                task_result = {
                    'host': host,
                    'task': task_name,
                    'changed': result.get('changed', False),
                    'failed': result.get('failed', False),
                    'skipped': result.get('skipped', False),
                    'msg': result.get('msg', ''),
                    'stdout': result.get('stdout', ''),
                }
                play_info['tasks'].append(task_result)

                if result.get('failed'):
                    summary['failures'].append(task_result)
                if result.get('changed'):
                    summary['changes'].append(task_result)

        summary['plays'].append(play_info)

    # Parse stats
    for host, stats in data.get('stats', {}).items():
        summary['stats'][host] = {
            'ok': stats.get('ok', 0),
            'changed': stats.get('changed', 0),
            'failures': stats.get('failures', 0),
            'unreachable': stats.get('unreachable', 0),
            'skipped': stats.get('skipped', 0),
        }

    return summary


if __name__ == '__main__':
    results = run_and_parse('deploy.yml', 'inventory/hosts')

    print("=== Deployment Summary ===")
    for host, stats in results['stats'].items():
        print(f"{host}: ok={stats['ok']} changed={stats['changed']} "
              f"failed={stats['failures']}")

    if results['failures']:
        print("\n=== Failures ===")
        for f in results['failures']:
            print(f"  {f['host']} - {f['task']}: {f['msg']}")

    if results['changes']:
        print(f"\n=== Changes ({len(results['changes'])} total) ===")
        for c in results['changes']:
            print(f"  {c['host']} - {c['task']}")
```

## Parsing Standard Text Output with Regex

When you cannot use the JSON callback, parse the default output:

```python
# parse_text_output.py - Parse standard Ansible text output
import re


def parse_play_recap(output):
    """Parse the PLAY RECAP section from standard output."""
    recap_pattern = re.compile(
        r'^(\S+)\s+:\s+'
        r'ok=(\d+)\s+'
        r'changed=(\d+)\s+'
        r'unreachable=(\d+)\s+'
        r'failed=(\d+)\s+'
        r'skipped=(\d+)',
        re.MULTILINE,
    )

    results = {}
    for match in recap_pattern.finditer(output):
        host = match.group(1)
        results[host] = {
            'ok': int(match.group(2)),
            'changed': int(match.group(3)),
            'unreachable': int(match.group(4)),
            'failed': int(match.group(5)),
            'skipped': int(match.group(6)),
        }

    return results


def parse_task_results(output):
    """Parse individual task results from standard output."""
    task_pattern = re.compile(
        r'^(ok|changed|fatal|skipping):\s+\[(\S+)\]',
        re.MULTILINE,
    )

    results = []
    for match in task_pattern.finditer(output):
        results.append({
            'status': match.group(1),
            'host': match.group(2),
        })

    return results


def has_failures(output):
    """Quick check if there were any failures."""
    recap = parse_play_recap(output)
    return any(
        stats['failed'] > 0 or stats['unreachable'] > 0
        for stats in recap.values()
    )
```

## Generating Reports

```python
# report_generator.py - Generate deployment reports from Ansible output
import json
from datetime import datetime


def generate_report(results, deploy_info):
    """Generate a deployment report from parsed results."""
    report = {
        'timestamp': datetime.now().isoformat(),
        'deployment': deploy_info,
        'summary': {
            'total_hosts': len(results['stats']),
            'successful': sum(
                1 for s in results['stats'].values()
                if s['failures'] == 0 and s['unreachable'] == 0
            ),
            'failed': sum(
                1 for s in results['stats'].values()
                if s['failures'] > 0 or s['unreachable'] > 0
            ),
            'total_changes': sum(
                s['changed'] for s in results['stats'].values()
            ),
        },
        'host_details': results['stats'],
        'failures': results['failures'],
        'changes': results['changes'],
    }

    return report


def save_report(report, filepath):
    """Save the report as JSON."""
    with open(filepath, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"Report saved to {filepath}")
```

## Summary

Parsing Ansible output in Python is best done with the JSON callback plugin, which gives you structured data that maps directly to Python dictionaries. For standard text output, use regex patterns to extract the PLAY RECAP and task results. Build report generators on top of the parsed data for deployment tracking, compliance auditing, and monitoring integration. Always prefer the JSON callback when you have control over the execution environment.

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

