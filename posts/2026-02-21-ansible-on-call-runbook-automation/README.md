# How to Use Ansible for On-Call Runbook Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Runbooks, On-Call, Incident Response, DevOps

Description: Convert your on-call runbooks into executable Ansible playbooks to reduce incident response time and minimize human error during outages.

---

Every on-call engineer has a binder (or wiki page) full of runbooks. When the pager goes off at 3 AM, you open the runbook and follow the steps. But manually executing commands on production servers while half asleep is a recipe for mistakes. Ansible lets you turn those runbooks into executable playbooks that on-call engineers can run with a single command.

This guide shows how to convert common operational runbooks into Ansible playbooks.

## Why Automate Runbooks

Manual runbooks have several problems. Steps get outdated as infrastructure changes. Engineers make typos when running commands under pressure. Different people interpret instructions differently. And there is no audit trail of exactly what was done.

Automated runbooks solve all of these:

```mermaid
graph LR
    A[Alert Fires] --> B[Engineer Runs Playbook]
    B --> C[Ansible Executes Steps]
    C --> D[Results Logged]
    D --> E[Notification Sent]
```

## Runbook: Restart a Stuck Service

One of the most common runbook tasks is restarting a service that has become unresponsive:

```yaml
# runbooks/restart-service.yml
# Safely restart a service with pre and post checks
---
- name: "RUNBOOK: Restart stuck service"
  hosts: "{{ target_hosts }}"
  become: true
  serial: 1
  vars:
    service_name: "{{ target_service }}"

  tasks:
    - name: Check current service status
      ansible.builtin.systemd:
        name: "{{ service_name }}"
      register: service_status

    - name: Display current status
      ansible.builtin.debug:
        msg: |
          Service: {{ service_name }}
          State: {{ service_status.status.ActiveState }}
          PID: {{ service_status.status.MainPID }}
          Memory: {{ service_status.status.MemoryCurrent | default('unknown') }}
          Uptime: {{ service_status.status.ActiveEnterTimestamp | default('unknown') }}

    - name: Capture process state before restart
      ansible.builtin.shell: |
        echo "=== Top processes ==="
        ps aux --sort=-%mem | head -20
        echo "=== Open connections ==="
        ss -tlnp | grep {{ service_name }} || true
        echo "=== Recent logs ==="
        journalctl -u {{ service_name }} --no-pager -n 50
      register: pre_restart_state
      changed_when: false

    - name: Save pre-restart diagnostics
      ansible.builtin.copy:
        content: "{{ pre_restart_state.stdout }}"
        dest: "/var/log/runbook_{{ service_name }}_{{ ansible_date_time.epoch }}.log"
        mode: '0644'

    - name: Deregister from load balancer
      ansible.builtin.uri:
        url: "http://{{ lb_api }}/backends/{{ inventory_hostname }}/drain"
        method: POST
      delegate_to: localhost
      when: lb_api is defined

    - name: Wait for connections to drain
      ansible.builtin.pause:
        seconds: 15
      when: lb_api is defined

    - name: Restart the service
      ansible.builtin.systemd:
        name: "{{ service_name }}"
        state: restarted

    - name: Wait for service to be healthy
      ansible.builtin.uri:
        url: "http://localhost:{{ health_check_port | default(8080) }}/health"
        status_code: 200
      retries: 30
      delay: 5
      register: health
      until: health.status == 200

    - name: Re-register with load balancer
      ansible.builtin.uri:
        url: "http://{{ lb_api }}/backends/{{ inventory_hostname }}/enable"
        method: POST
      delegate_to: localhost
      when: lb_api is defined

    - name: Confirm service is running
      ansible.builtin.systemd:
        name: "{{ service_name }}"
      register: post_status
      failed_when: post_status.status.ActiveState != 'active'
```

Run it with:

```bash
ansible-playbook runbooks/restart-service.yml \
  -e target_hosts=web01.prod.example.com \
  -e target_service=myapp
```

## Runbook: Clear Disk Space

Another common on-call task is clearing disk space when alerts fire:

```yaml
# runbooks/clear-disk-space.yml
# Free up disk space on servers hitting disk alerts
---
- name: "RUNBOOK: Clear disk space"
  hosts: "{{ target_hosts }}"
  become: true

  tasks:
    - name: Get current disk usage
      ansible.builtin.command: df -h /
      register: disk_before
      changed_when: false

    - name: Display current usage
      ansible.builtin.debug:
        var: disk_before.stdout_lines

    - name: Clean package manager cache
      ansible.builtin.apt:
        autoclean: true
        autoremove: true
      when: ansible_os_family == 'Debian'

    - name: Remove old journal logs (keep 2 days)
      ansible.builtin.command:
        cmd: journalctl --vacuum-time=2d
      register: journal_clean
      changed_when: "'Vacuuming done' in journal_clean.stderr"

    - name: Find and remove old log files (older than 7 days)
      ansible.builtin.find:
        paths:
          - /var/log
          - /tmp
        patterns:
          - "*.log.*"
          - "*.gz"
          - "*.old"
        age: 7d
        recurse: true
      register: old_files

    - name: Delete old log files
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_files.files }}"
      when: old_files.matched > 0

    - name: Clean Docker resources
      community.docker.docker_prune:
        containers: true
        images: true
        networks: true
        volumes: false
        builder_cache: true
      when: "'docker' in ansible_facts.packages | default({})"

    - name: Remove old application releases (keep 3)
      ansible.builtin.shell: |
        cd {{ app_releases_dir }} && ls -dt */ | tail -n +4 | xargs rm -rf
      when: app_releases_dir is defined
      changed_when: true

    - name: Get disk usage after cleanup
      ansible.builtin.command: df -h /
      register: disk_after
      changed_when: false

    - name: Display results
      ansible.builtin.debug:
        msg: |
          Before: {{ disk_before.stdout_lines[-1] }}
          After: {{ disk_after.stdout_lines[-1] }}
```

## Runbook: Database Connection Pool Exhaustion

```yaml
# runbooks/db-connection-reset.yml
# Handle database connection pool exhaustion
---
- name: "RUNBOOK: Reset database connections"
  hosts: "{{ target_hosts | default('db_primary') }}"
  become: true
  become_user: postgres

  tasks:
    - name: Check active connections
      community.postgresql.postgresql_query:
        db: "{{ db_name }}"
        query: |
          SELECT
            count(*) as total,
            count(*) FILTER (WHERE state = 'active') as active,
            count(*) FILTER (WHERE state = 'idle') as idle,
            count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_tx
          FROM pg_stat_activity
          WHERE datname = '{{ db_name }}';
      register: conn_stats

    - name: Display connection stats
      ansible.builtin.debug:
        msg: |
          Total connections: {{ conn_stats.query_result[0].total }}
          Active: {{ conn_stats.query_result[0].active }}
          Idle: {{ conn_stats.query_result[0].idle }}
          Idle in transaction: {{ conn_stats.query_result[0].idle_in_tx }}

    - name: Kill idle in transaction connections (older than 5 min)
      community.postgresql.postgresql_query:
        db: "{{ db_name }}"
        query: |
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = '{{ db_name }}'
            AND state = 'idle in transaction'
            AND state_change < now() - interval '5 minutes';
      register: killed_idle_tx

    - name: Kill long-running idle connections (older than 30 min)
      community.postgresql.postgresql_query:
        db: "{{ db_name }}"
        query: |
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = '{{ db_name }}'
            AND state = 'idle'
            AND state_change < now() - interval '30 minutes'
            AND usename != 'postgres';
      register: killed_idle

    - name: Verify connections after cleanup
      community.postgresql.postgresql_query:
        db: "{{ db_name }}"
        query: "SELECT count(*) as total FROM pg_stat_activity WHERE datname = '{{ db_name }}';"
      register: final_count

    - name: Display results
      ansible.builtin.debug:
        msg: "Connections reduced to {{ final_count.query_result[0].total }}"
```

## Runbook Index Playbook

Create a wrapper playbook that lists all available runbooks:

```yaml
# runbooks/index.yml
# Display available runbooks
---
- name: Available Runbooks
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: List all available runbooks
      ansible.builtin.debug:
        msg: |
          Available runbooks:
          1. restart-service.yml     - Safely restart a stuck service
          2. clear-disk-space.yml    - Free up disk space
          3. db-connection-reset.yml - Reset database connection pool
          4. scale-up.yml            - Add more instances
          5. failover-db.yml         - Promote DB replica to primary
          6. rollback.yml            - Roll back last deployment

          Usage: ansible-playbook runbooks/<name>.yml -e target_hosts=<host>
```

## Integrating with PagerDuty

Trigger runbooks automatically from alerts:

```yaml
# runbooks/auto-remediation.yml
# Auto-remediation triggered by PagerDuty webhook
---
- name: Auto-remediate based on alert type
  hosts: localhost
  connection: local

  tasks:
    - name: Route to correct runbook
      ansible.builtin.include_tasks: "{{ runbook_map[alert_type] }}"
      when: alert_type in runbook_map
      vars:
        runbook_map:
          high_disk_usage: clear-disk-space.yml
          service_down: restart-service.yml
          db_connections_high: db-connection-reset.yml

    - name: Acknowledge PagerDuty incident
      ansible.builtin.uri:
        url: "https://events.pagerduty.com/v2/enqueue"
        method: POST
        body_format: json
        body:
          routing_key: "{{ pagerduty_routing_key }}"
          event_action: acknowledge
          dedup_key: "{{ incident_key }}"
```

## Key Takeaways

Turning runbooks into Ansible playbooks dramatically reduces incident response time and eliminates human error during stressful situations. Start with your most frequently used runbooks and automate them first. Always include pre-checks that capture the current state before making changes, and post-checks that verify the fix worked. Log everything so you have an audit trail for post-incident reviews. The ultimate goal is that an on-call engineer can resolve common incidents with a single command instead of following a multi-step manual procedure.
