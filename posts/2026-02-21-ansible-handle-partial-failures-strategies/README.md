# How to Handle Partial Failures in Ansible with Strategies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Strategy, Partial Failures, Deployment

Description: Handle partial failures in Ansible deployments using strategy plugins, rescue blocks, max_fail_percentage, and recovery patterns to maintain fleet consistency.

---

Partial failures are the norm in large-scale Ansible deployments. When you run a playbook against 200 hosts, some will fail. A network glitch drops a connection, a disk fills up, a package repository is temporarily unavailable. The question is not whether failures will happen, but how you handle them. Ansible provides several mechanisms at the strategy level for dealing with partial failures gracefully.

## What Happens by Default

In the default linear strategy, when a host fails a task, that host is removed from the play. The remaining hosts continue with the next task. At the end of the play, you see which hosts succeeded and which failed.

```yaml
# default-behavior.yml - Default partial failure handling
---
- name: Configure servers
  hosts: all  # 10 hosts

  tasks:
    - name: Install packages  # host-05 fails here
      apt:
        name: nginx
        state: present

    # host-05 is excluded from here onward
    # hosts 1-4 and 6-10 continue
    - name: Deploy config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf

    - name: Start service
      service:
        name: nginx
        state: started
```

The play recap shows:

```
host-01: ok=3  changed=0  failed=0
...
host-05: ok=0  changed=0  failed=1  # Failed on task 1
...
host-10: ok=3  changed=0  failed=0
```

## Rescue Blocks for Per-Host Recovery

Use `block`/`rescue` to attempt recovery when a task fails:

```yaml
# rescue-recovery.yml - Recover from failures on each host
---
- name: Deploy with recovery
  hosts: webservers

  tasks:
    - name: Deploy with recovery option
      block:
        - name: Deploy new version
          copy:
            src: "app-v{{ version }}.tar.gz"
            dest: /opt/app/

        - name: Restart application
          service:
            name: myapp
            state: restarted

        - name: Verify health
          uri:
            url: "http://localhost:8080/health"
            status_code: 200
          retries: 3
          delay: 5
          register: health
          until: health.status == 200

      rescue:
        # If any task in the block fails, try to recover
        - name: Attempt recovery
          debug:
            msg: "Deployment failed on {{ inventory_hostname }}, attempting rollback"

        - name: Rollback to previous version
          command: /opt/scripts/rollback.sh
          register: rollback

        - name: Restart with old version
          service:
            name: myapp
            state: restarted

        - name: Verify rollback health
          uri:
            url: "http://localhost:8080/health"
            status_code: 200
          retries: 3
          delay: 5

      always:
        - name: Report final status
          debug:
            msg: "{{ inventory_hostname }}: {{ 'healthy' if health is defined and health.status == 200 else 'rolled back' }}"
```

With rescue blocks, a failed host does not just stop. It tries to recover. If recovery succeeds, the host can continue with subsequent tasks.

## ignore_errors for Non-Critical Tasks

For tasks where failure is acceptable, use `ignore_errors`:

```yaml
# ignore-noncritical.yml - Skip non-critical failures
---
- name: Configure servers
  hosts: all

  tasks:
    # Critical: must succeed
    - name: Install core packages
      apt:
        name: nginx
        state: present

    # Non-critical: nice to have but not essential
    - name: Install monitoring agent
      apt:
        name: prometheus-node-exporter
        state: present
      ignore_errors: true  # Continue even if this fails

    # Critical: must succeed
    - name: Start nginx
      service:
        name: nginx
        state: started
```

Use `ignore_errors` sparingly. Overusing it hides real problems.

## failed_when for Custom Failure Conditions

Define what constitutes a failure instead of using the module's default:

```yaml
# custom-failure.yml - Custom failure conditions
---
- name: Deploy with custom failure detection
  hosts: webservers

  tasks:
    - name: Check application version
      command: /opt/app/version.sh
      register: version_check
      changed_when: false
      # Only fail if the version is wrong AND the app is running
      failed_when:
        - version_check.stdout != deploy_version
        - "'running' in version_check.stdout"

    - name: Check disk space before deploy
      command: df -h /opt --output=pcent
      register: disk_check
      changed_when: false
      # Fail if disk is more than 90% full
      failed_when: (disk_check.stdout_lines[-1] | trim | replace('%','') | int) > 90
```

## max_fail_percentage for Fleet-Level Thresholds

Stop the entire play when too many hosts fail:

```yaml
# fleet-threshold.yml - Stop when failure rate is too high
---
- name: Deploy with fleet protection
  hosts: webservers  # 100 hosts
  serial: 10
  max_fail_percentage: 20  # Stop if >20% of batch fails

  tasks:
    - name: Deploy application
      block:
        - name: Pull and deploy
          include_role:
            name: deploy

        - name: Verify health
          uri:
            url: "http://localhost:8080/health"
            status_code: 200
          retries: 5
          delay: 5
          register: health
          until: health.status == 200

      rescue:
        - name: Mark host as failed
          fail:
            msg: "Deploy failed on {{ inventory_hostname }}, contributing to failure threshold"
```

## Recovery Playbook for Failed Hosts

After a partial failure, run a recovery playbook targeting only the failed hosts:

```bash
# First, collect the failed hosts from the previous run
ansible-playbook deploy.yml 2>&1 | tee deploy.log

# Extract failed hosts
grep "failed=1" deploy.log | awk '{print $1}' > /tmp/failed_hosts.txt
```

```yaml
# recover-failed.yml - Target only previously failed hosts
---
- name: Recover failed hosts
  hosts: all
  gather_facts: false

  tasks:
    - name: Check if this host failed
      set_fact:
        needs_recovery: "{{ inventory_hostname in lookup('file', '/tmp/failed_hosts.txt').splitlines() }}"

    - name: Skip hosts that did not fail
      meta: end_host
      when: not needs_recovery

    - name: Run full deployment on failed host
      include_role:
        name: deploy
```

Or use a simpler approach with a limit file:

```bash
# Use Ansible's retry file (created automatically on failure)
ansible-playbook deploy.yml --limit @deploy.retry
```

## Strategy-Specific Failure Handling

### Linear Strategy

With linear strategy, failed hosts are removed from subsequent tasks. This means a host that fails task 2 will not run tasks 3, 4, or 5:

```yaml
- name: Linear failure handling
  hosts: all
  strategy: linear

  tasks:
    - name: Task 1  # All hosts run
      command: /bin/true

    - name: Task 2  # host-05 fails here
      command: "{{ 'false' if inventory_hostname == 'host-05' else 'true' }}"

    - name: Task 3  # host-05 skipped
      command: /bin/true

    - name: Task 4  # host-05 skipped
      command: /bin/true
```

### Free Strategy

With the free strategy, failures behave similarly but other hosts do not wait. A failed host stops its own execution while others continue independently:

```yaml
- name: Free strategy failure handling
  hosts: all
  strategy: free

  tasks:
    - name: Task that fails on some hosts
      command: /opt/flaky-operation.sh
      register: result
      ignore_errors: true

    - name: Continue only if previous succeeded
      command: /opt/next-step.sh
      when: result is not failed
```

### host_pinned Strategy

With host_pinned, a failed host stops its entire sequence but the fork immediately picks up the next host:

```
Fork 1: host-01/task1 -> host-01/task2(FAIL) -> host-06/task1 -> host-06/task2 -> ...
Fork 2: host-02/task1 -> host-02/task2 -> host-02/task3 -> host-07/task1 -> ...
```

## Collecting Failure Information

Use `set_stats` to aggregate failure information:

```yaml
- name: Deploy with failure tracking
  hosts: webservers

  tasks:
    - name: Deploy
      block:
        - name: Run deployment
          include_role:
            name: deploy

      rescue:
        - name: Record failure
          set_stats:
            data:
              failed_hosts: ["{{ inventory_hostname }}"]
            aggregate: true

        - name: Attempt recovery
          include_role:
            name: rollback

  post_tasks:
    - name: Show failure summary
      debug:
        msg: "Failed hosts: {{ ansible_stats.aggregated.failed_hosts | default([]) }}"
      run_once: true
      when: ansible_stats is defined
```

## Best Practices

Always have a plan for what happens after partial failures. Know how to:

1. Identify which hosts failed and why
2. Decide whether to retry, rollback, or investigate
3. Re-run against only the failed hosts
4. Verify the fleet is in a consistent state

Use `--limit @playbook.retry` to re-run against failed hosts. Ansible automatically creates a `.retry` file listing hosts that failed.

Combine multiple strategies: `serial` for batching, `max_fail_percentage` for automatic circuit breaking, `block/rescue` for per-host recovery, and `ignore_errors` for non-critical tasks. Each mechanism handles a different aspect of partial failure management.

Partial failures are not a bug in your infrastructure. They are a normal operating condition that your playbooks should handle gracefully.
