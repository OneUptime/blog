# How to Use Ansible set_stats to Pass Data to AWX/Tower

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, Tower, Automation

Description: Learn how to use the Ansible set_stats module to pass custom data and metrics from playbook runs to AWX and Ansible Tower for reporting and workflow integration.

---

When running Ansible playbooks through AWX (the open-source upstream of Ansible Tower), you often need to pass data from one job to the next, display custom metrics in the job output, or feed information into external reporting systems. The `set_stats` module is designed exactly for this. It lets you define custom statistics that AWX captures and makes available through its API, UI, and workflow system.

## What is set_stats?

The `set_stats` module sets custom statistics during a playbook run. These statistics appear in the play recap, get stored in the AWX database, and can be passed as extra variables to subsequent jobs in a workflow.

When running playbooks from the command line, `set_stats` requires the `ansible.builtin.default` callback with `show_custom_stats = true` to display the data. In AWX/Tower, the stats are automatically captured and stored.

## Basic set_stats Usage

```yaml
# basic-set-stats.yml
# Sets custom statistics that AWX captures
---
- name: Deploy and report statistics
  hosts: appservers
  become: yes
  tasks:
    - name: Deploy application
      ansible.builtin.copy:
        src: "builds/myapp-{{ app_version }}.tar.gz"
        dest: /opt/myapp/releases/
        mode: '0644'
      register: deploy_result

    - name: Report deployment statistics
      ansible.builtin.set_stats:
        data:
          deployed_version: "{{ app_version }}"
          deployed_hosts: "{{ ansible_play_hosts | length }}"
          deployment_timestamp: "{{ ansible_date_time.iso8601 }}"
          deployment_status: "success"
```

In AWX, these statistics appear in the job details under "Extra Variables" for the job artifacts, and they are accessible through the API at `/api/v2/jobs/<id>/`.

## Passing Data Between Workflow Jobs

The primary use case for `set_stats` in AWX is passing data between jobs in a workflow. When a workflow template chains multiple job templates together, `set_stats` from one job becomes available as extra variables in the next job.

```yaml
# workflow-step-1.yml
# First job in an AWX workflow - determines what to deploy
---
- name: Determine deployment target
  hosts: localhost
  gather_facts: no
  tasks:
    - name: Get latest release version from API
      ansible.builtin.uri:
        url: https://api.example.com/releases/latest
        return_content: yes
      register: release_info

    - name: Parse release information
      ansible.builtin.set_fact:
        latest_version: "{{ (release_info.content | from_json).version }}"
        release_notes: "{{ (release_info.content | from_json).notes }}"
        artifact_url: "{{ (release_info.content | from_json).artifact_url }}"

    - name: Pass data to next workflow step
      ansible.builtin.set_stats:
        data:
          deploy_version: "{{ latest_version }}"
          deploy_artifact_url: "{{ artifact_url }}"
          deploy_notes: "{{ release_notes }}"
        per_host: false
```

```yaml
# workflow-step-2.yml
# Second job in the workflow - receives data from step 1
---
- name: Deploy the release
  hosts: appservers
  become: yes
  tasks:
    - name: Show received variables
      ansible.builtin.debug:
        msg:
          - "Deploying version: {{ deploy_version }}"
          - "Artifact URL: {{ deploy_artifact_url }}"
          - "Notes: {{ deploy_notes }}"

    - name: Download artifact
      ansible.builtin.get_url:
        url: "{{ deploy_artifact_url }}"
        dest: "/opt/releases/{{ deploy_version }}.tar.gz"
        mode: '0644'

    - name: Deploy and report back
      ansible.builtin.set_stats:
        data:
          final_status: "deployed"
          final_version: "{{ deploy_version }}"
          hosts_updated: "{{ ansible_play_hosts | length }}"
```

In AWX, you create a workflow template that chains Step 1 and Step 2. The `set_stats` data from Step 1 is automatically injected as extra vars into Step 2.

## per_host vs Aggregate Statistics

`set_stats` has a `per_host` parameter that controls whether statistics are tracked per-host or aggregated.

```yaml
# per-host-stats.yml
# Demonstrates per-host vs aggregate statistics
---
- name: Gather per-host metrics
  hosts: all
  gather_facts: yes
  tasks:
    # Per-host statistics - each host gets its own entry
    - name: Report per-host disk usage
      ansible.builtin.set_stats:
        data:
          disk_usage_pct: >-
            {{
              ((ansible_facts['mounts'] | selectattr('mount', 'equalto', '/') | first).size_total -
               (ansible_facts['mounts'] | selectattr('mount', 'equalto', '/') | first).size_available) /
              (ansible_facts['mounts'] | selectattr('mount', 'equalto', '/') | first).size_total * 100
              | round(1)
            }}
          memory_used_pct: >-
            {{ ((ansible_facts['memtotal_mb'] - ansible_facts['memfree_mb']) / ansible_facts['memtotal_mb'] * 100) | round(1) }}
        per_host: true

    # Aggregate statistic - one value for the entire play
    - name: Report aggregate statistics
      ansible.builtin.set_stats:
        data:
          total_hosts_checked: "{{ ansible_play_hosts | length }}"
          check_timestamp: "{{ ansible_date_time.iso8601 }}"
        per_host: false
      run_once: true
```

With `per_host: true`, AWX stores separate values for each host. With `per_host: false`, a single value is stored for the entire job.

## Reporting Deployment Metrics

Track deployment metrics that AWX can expose through its API.

```yaml
# deployment-metrics.yml
# Reports comprehensive deployment metrics via set_stats
---
- name: Deploy and track metrics
  hosts: appservers
  become: yes
  vars:
    deploy_start: "{{ ansible_date_time.epoch }}"
  tasks:
    - name: Stop application
      ansible.builtin.service:
        name: myapp
        state: stopped
      register: stop_result

    - name: Deploy new version
      ansible.builtin.unarchive:
        src: "releases/myapp-{{ app_version }}.tar.gz"
        dest: /opt/myapp/
        owner: myapp
        group: myapp
      register: deploy_result

    - name: Run database migrations
      ansible.builtin.command: /opt/myapp/bin/migrate
      register: migrate_result
      changed_when: "'migrated' in migrate_result.stdout"

    - name: Start application
      ansible.builtin.service:
        name: myapp
        state: started
      register: start_result

    - name: Wait for health check
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
        status_code: 200
      register: health_check
      retries: 10
      delay: 5
      until: health_check.status == 200

    - name: Calculate deployment duration
      ansible.builtin.set_fact:
        deploy_duration: "{{ ansible_date_time.epoch | int - deploy_start | int }}"

    - name: Report deployment metrics
      ansible.builtin.set_stats:
        data:
          deployment_version: "{{ app_version }}"
          deployment_duration_seconds: "{{ deploy_duration }}"
          deployment_status: "success"
          hosts_deployed: "{{ ansible_play_hosts | length }}"
          migrations_applied: "{{ 'yes' if migrate_result.changed else 'no' }}"
          health_check_passed: true
        per_host: false
      run_once: true
```

## Conditional Workflow Routing

AWX workflows can use `set_stats` data to decide which path to take (success/failure/always).

```yaml
# validation-step.yml
# Sets stats that AWX workflow can use for routing decisions
---
- name: Pre-deployment validation
  hosts: appservers
  gather_facts: yes
  tasks:
    - name: Check disk space
      ansible.builtin.set_fact:
        disk_ok: "{{ (ansible_facts['mounts'] | selectattr('mount', 'equalto', '/') | first).size_available > 5368709120 }}"

    - name: Check memory
      ansible.builtin.set_fact:
        memory_ok: "{{ ansible_facts['memtotal_mb'] > 4096 }}"

    - name: Check services
      ansible.builtin.service_facts:

    - name: Check database connectivity
      ansible.builtin.wait_for:
        host: "{{ db_host }}"
        port: 5432
        timeout: 5
      register: db_check
      ignore_errors: yes

    - name: Report validation results
      ansible.builtin.set_stats:
        data:
          validation_passed: "{{ disk_ok and memory_ok and db_check is success }}"
          disk_check: "{{ 'pass' if disk_ok else 'fail' }}"
          memory_check: "{{ 'pass' if memory_ok else 'fail' }}"
          db_check: "{{ 'pass' if db_check is success else 'fail' }}"
        per_host: false
      run_once: true

    - name: Fail if validation did not pass
      ansible.builtin.fail:
        msg: "Pre-deployment validation failed"
      when: not (disk_ok and memory_ok and db_check is success)
```

In the AWX workflow, the validation job connects to the deployment job on success and a notification job on failure. The `set_stats` data is available in both paths.

## Enabling set_stats on the Command Line

When not using AWX, you need to enable custom stats in `ansible.cfg` to see `set_stats` output.

```ini
# ansible.cfg
# Enable custom statistics display in play recap
[defaults]
show_custom_stats = true
```

Or set it via environment variable:

```bash
# Enable custom stats display
export ANSIBLE_SHOW_CUSTOM_STATS=true
ansible-playbook deploy.yml
```

The output appears in the play recap section:

```
PLAY RECAP *********************************************************************
web-01   : ok=5    changed=2    unreachable=0    failed=0    skipped=0

CUSTOM STATS: ******************************************************************
        RUN: { "deployed_version": "2.4.1", "deployment_status": "success", "hosts_deployed": 3 }
```

## Accessing set_stats Data via AWX API

After a job completes, you can retrieve the stats through the AWX REST API.

```bash
# Get job artifacts (set_stats data) from AWX API
curl -s -H "Authorization: Bearer $AWX_TOKEN" \
  https://awx.example.com/api/v2/jobs/42/artifacts/ | python3 -m json.tool

# Response:
# {
#   "deployed_version": "2.4.1",
#   "deployment_status": "success",
#   "hosts_deployed": 3,
#   "deployment_duration_seconds": "45"
# }
```

You can use this in scripts that query AWX after a deployment.

```python
#!/usr/bin/env python3
# check-deployment.py
# Queries AWX API for deployment results
import requests
import sys

AWX_URL = "https://awx.example.com"
AWX_TOKEN = "your-api-token"

def get_job_stats(job_id):
    """Get set_stats data from a completed AWX job."""
    resp = requests.get(
        f"{AWX_URL}/api/v2/jobs/{job_id}/artifacts/",
        headers={"Authorization": f"Bearer {AWX_TOKEN}"}
    )
    resp.raise_for_status()
    return resp.json()

if __name__ == "__main__":
    job_id = sys.argv[1]
    stats = get_job_stats(job_id)
    print(f"Version: {stats.get('deployed_version', 'unknown')}")
    print(f"Status: {stats.get('deployment_status', 'unknown')}")
    print(f"Hosts: {stats.get('hosts_deployed', 0)}")
```

## Accumulating Statistics

By default, `set_stats` replaces previous values. Use `aggregate: true` to accumulate numeric values.

```yaml
# aggregate-stats.yml
# Accumulates statistics across multiple tasks
---
- name: Process files and accumulate stats
  hosts: all
  tasks:
    - name: Process batch 1
      ansible.builtin.command: /opt/processor/run --batch 1
      register: batch1

    - name: Report batch 1 stats
      ansible.builtin.set_stats:
        data:
          files_processed: 150
          errors_found: 3
        aggregate: true

    - name: Process batch 2
      ansible.builtin.command: /opt/processor/run --batch 2
      register: batch2

    - name: Report batch 2 stats
      ansible.builtin.set_stats:
        data:
          files_processed: 200
          errors_found: 1
        aggregate: true

    # Final stats: files_processed = 350, errors_found = 4
```

## Summary

The `set_stats` module is the bridge between Ansible playbook execution and AWX/Tower's reporting and workflow systems. Use it to pass data between workflow jobs, report deployment metrics, enable conditional workflow routing, and expose custom statistics through the AWX API. Set `per_host: false` with `run_once: true` for aggregate stats, and `per_host: true` for host-specific data. Outside of AWX, enable `show_custom_stats` in `ansible.cfg` to see the output in the play recap. This module turns playbooks from fire-and-forget scripts into observable, data-rich automation that integrates into larger operational workflows.
