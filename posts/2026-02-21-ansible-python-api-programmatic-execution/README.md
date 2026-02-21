# How to Use Ansible Python API for Programmatic Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python, API, Automation, Programming

Description: Use the Ansible Python API to execute playbooks and ad-hoc commands programmatically from your Python applications and scripts.

---

The Ansible Python API lets you run playbooks and ad-hoc commands directly from Python code. This is useful when you need to integrate Ansible into a web application, a CI/CD pipeline, or a custom automation framework. Instead of shelling out to the `ansible-playbook` command, you can use the API for tighter control over execution, result handling, and error management.

## The Modern Ansible API

Ansible's Python API has evolved significantly. The current approach uses `ansible-runner` for most use cases (covered in the next post), but the core API gives you lower-level control.

Here is the minimal setup for running an ad-hoc command:

```python
# run_adhoc.py - Execute an ad-hoc command using Ansible Python API
import json
import shutil
from ansible.module_utils.common.collections import ImmutableDict
from ansible.parsing.dataloader import DataLoader
from ansible.vars.manager import VariableManager
from ansible.inventory.manager import InventoryManager
from ansible.playbook.play import Play
from ansible.executor.task_queue_manager import TaskQueueManager
from ansible.plugins.callback import CallbackBase
from ansible import context

# Custom callback to capture results
class ResultCallback(CallbackBase):
    """Callback plugin that stores results in a list."""

    def __init__(self):
        super(ResultCallback, self).__init__()
        self.results = []

    def v2_runner_on_ok(self, result):
        host = result._host.get_name()
        self.results.append({
            'host': host,
            'status': 'ok',
            'result': result._result,
        })

    def v2_runner_on_failed(self, result, ignore_errors=False):
        host = result._host.get_name()
        self.results.append({
            'host': host,
            'status': 'failed',
            'result': result._result,
        })

    def v2_runner_on_unreachable(self, result):
        host = result._host.get_name()
        self.results.append({
            'host': host,
            'status': 'unreachable',
            'result': result._result,
        })


def run_adhoc_command(hosts, module, args, inventory_path='/etc/ansible/hosts'):
    """Run an ad-hoc Ansible command programmatically."""

    # Set global options (equivalent to command-line flags)
    context.CLIARGS = ImmutableDict(
        connection='ssh',
        forks=10,
        become=True,
        become_method='sudo',
        become_user='root',
        check=False,
        diff=False,
        verbosity=0,
    )

    # Initialize the data loader
    loader = DataLoader()

    # Initialize inventory
    inventory = InventoryManager(loader=loader, sources=[inventory_path])

    # Initialize variable manager
    variable_manager = VariableManager(loader=loader, inventory=inventory)

    # Create a play with the ad-hoc task
    play_source = {
        'name': 'Ad-Hoc Command',
        'hosts': hosts,
        'gather_facts': 'no',
        'tasks': [
            {
                'action': {
                    'module': module,
                    'args': args,
                },
            },
        ],
    }

    play = Play().load(play_source, variable_manager=variable_manager, loader=loader)

    # Create the callback
    callback = ResultCallback()

    # Run the play
    tqm = None
    try:
        tqm = TaskQueueManager(
            inventory=inventory,
            variable_manager=variable_manager,
            loader=loader,
            passwords={},
            stdout_callback=callback,
        )
        result_code = tqm.run(play)
    finally:
        if tqm is not None:
            tqm.cleanup()
        shutil.rmtree(loader._tempdir, True)

    return {
        'rc': result_code,
        'results': callback.results,
    }


# Example usage
if __name__ == '__main__':
    # Run 'uptime' on all hosts
    result = run_adhoc_command(
        hosts='all',
        module='command',
        args='uptime',
        inventory_path='inventory/hosts',
    )

    print("Return code:", result['rc'])
    for r in result['results']:
        print(f"{r['host']}: {r['status']}")
        if 'stdout' in r['result']:
            print(f"  Output: {r['result']['stdout']}")
```

## Running a Playbook Programmatically

```python
# run_playbook.py - Execute a playbook using the Python API
from ansible.parsing.dataloader import DataLoader
from ansible.vars.manager import VariableManager
from ansible.inventory.manager import InventoryManager
from ansible.executor.playbook_executor import PlaybookExecutor
from ansible.module_utils.common.collections import ImmutableDict
from ansible import context


def run_playbook(playbook_path, inventory_path, extra_vars=None):
    """Execute an Ansible playbook programmatically."""

    context.CLIARGS = ImmutableDict(
        connection='ssh',
        forks=10,
        become=True,
        become_method='sudo',
        become_user='root',
        check=False,
        diff=False,
        verbosity=0,
        tags=[],
        skip_tags=[],
        start_at_task=None,
        listhosts=False,
        listtasks=False,
        listtags=False,
        syntax=False,
    )

    loader = DataLoader()
    inventory = InventoryManager(loader=loader, sources=[inventory_path])
    variable_manager = VariableManager(loader=loader, inventory=inventory)

    if extra_vars:
        variable_manager.extra_vars = extra_vars

    executor = PlaybookExecutor(
        playbooks=[playbook_path],
        inventory=inventory,
        variable_manager=variable_manager,
        loader=loader,
        passwords={},
    )

    result = executor.run()
    stats = executor._tqm._stats

    # Collect results per host
    host_results = {}
    for host in stats.processed:
        summary = stats.summarize(host)
        host_results[host] = summary

    return {
        'rc': result,
        'stats': host_results,
    }


if __name__ == '__main__':
    result = run_playbook(
        playbook_path='playbooks/deploy.yml',
        inventory_path='inventory/hosts',
        extra_vars={'app_version': '2.5.0'},
    )

    print("Playbook result:", result['rc'])
    for host, stats in result['stats'].items():
        print(f"  {host}: ok={stats['ok']} changed={stats['changed']} failed={stats['failures']}")
```

## Error Handling

Always wrap API calls in proper error handling:

```python
from ansible.errors import AnsibleError, AnsibleParserError

try:
    result = run_playbook('deploy.yml', 'inventory/hosts')
except AnsibleParserError as e:
    print(f"Playbook parse error: {e}")
except AnsibleError as e:
    print(f"Ansible error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Summary

The Ansible Python API gives you programmatic control over playbook and ad-hoc command execution. Use `TaskQueueManager` for ad-hoc commands and `PlaybookExecutor` for playbooks. Custom callback plugins let you capture results in any format you need. For most use cases, consider `ansible-runner` (covered in the next guide) as a simpler alternative that handles many of the setup details automatically.

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

