# How to Use Ansible to Run Commands Across Multiple Hosts Simultaneously

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Parallel Execution, Forks, Scaling

Description: Learn how to run Ansible commands across multiple hosts in parallel using forks, serial, async, and free strategy.

---

One of the biggest reasons people choose Ansible is its ability to manage hundreds or thousands of hosts from a single control node. By default, Ansible runs tasks on multiple hosts at the same time, but the defaults are conservative. Understanding how to tune parallel execution can mean the difference between a deployment that takes 5 minutes and one that takes an hour.

This post covers forks, strategies, async tasks, serial execution, and rolling updates. These are the tools that control how Ansible distributes work across your fleet.

## Understanding Forks

Forks control how many hosts Ansible manages simultaneously. The default is 5, which means Ansible processes 5 hosts at a time:

```ini
# ansible.cfg - increase the default fork count
[defaults]
forks = 30
```

You can also set it per-run:

```bash
# override forks on the command line
ansible-playbook deploy.yaml -f 50
```

The right number depends on your control node's resources. Each fork consumes memory and a network connection. A good starting point is 20-50 for most environments. If your control node has 16GB RAM and the tasks are lightweight, you can push it higher.

## Linear Strategy (Default)

The default strategy is `linear`. It runs one task at a time across all hosts (up to the fork limit), waiting for all hosts to finish the current task before moving to the next one:

```yaml
# linear strategy - all hosts run the same task before moving to the next
---
- name: Deploy to web servers (linear)
  hosts: webservers
  strategy: linear  # this is the default
  tasks:
    - name: Stop application
      ansible.builtin.systemd:
        name: myapp
        state: stopped

    # ALL hosts finish stopping before any host starts pulling code
    - name: Pull latest code
      ansible.builtin.git:
        repo: https://github.com/example/myapp.git
        dest: /opt/myapp
        version: main

    # ALL hosts finish pulling before any host starts
    - name: Start application
      ansible.builtin.systemd:
        name: myapp
        state: started
```

Linear strategy is predictable but can be slow if some hosts are faster than others. Fast hosts sit idle waiting for slow ones.

## Free Strategy

The `free` strategy lets each host proceed through tasks independently as fast as it can, without waiting for other hosts:

```yaml
# free strategy - each host runs through tasks at its own pace
---
- name: System maintenance (free strategy)
  hosts: all
  strategy: free
  tasks:
    - name: Update package cache
      ansible.builtin.apt:
        update_cache: true
      become: true

    - name: Upgrade packages
      ansible.builtin.apt:
        upgrade: safe
      become: true

    - name: Clean up old packages
      ansible.builtin.apt:
        autoremove: true
        autoclean: true
      become: true

    - name: Check if reboot is needed
      ansible.builtin.stat:
        path: /var/run/reboot-required
      register: reboot_needed

    - name: Report status
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: reboot {{ 'needed' if reboot_needed.stat.exists else 'not needed' }}"
```

Free strategy is faster for heterogeneous environments but makes the output harder to follow since tasks from different hosts interleave in the log.

## Serial Execution for Rolling Updates

The `serial` directive controls how many hosts are updated at once in a rolling fashion. This is critical for zero-downtime deployments:

```yaml
# rolling update with serial to avoid taking all servers offline at once
---
- name: Rolling deployment
  hosts: webservers
  serial: 2  # update 2 hosts at a time
  become: true
  tasks:
    - name: Remove from load balancer
      ansible.builtin.uri:
        url: "http://lb.internal/api/remove"
        method: POST
        body_format: json
        body:
          host: "{{ inventory_hostname }}"
      delegate_to: localhost

    - name: Stop application
      ansible.builtin.systemd:
        name: myapp
        state: stopped

    - name: Deploy new version
      ansible.builtin.unarchive:
        src: "/releases/myapp-latest.tar.gz"
        dest: /opt/myapp/
        remote_src: true

    - name: Start application
      ansible.builtin.systemd:
        name: myapp
        state: started

    - name: Wait for health check
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:3000/health"
        status_code: 200
      retries: 10
      delay: 5

    - name: Add back to load balancer
      ansible.builtin.uri:
        url: "http://lb.internal/api/add"
        method: POST
        body_format: json
        body:
          host: "{{ inventory_hostname }}"
      delegate_to: localhost
```

You can also use percentages or progressive batch sizes:

```yaml
# progressive serial values for canary-style deployments
---
- name: Canary deployment
  hosts: webservers
  serial:
    - 1        # first, deploy to 1 host (canary)
    - 5        # then 5 at a time
    - "25%"    # then 25% of remaining hosts at a time
  max_fail_percentage: 10
  tasks:
    - name: Deploy and verify
      ansible.builtin.include_tasks: deploy_tasks.yaml
```

## Async Tasks for Long-Running Commands

The `async` and `poll` parameters let you fire off long-running commands without blocking:

```yaml
# run long tasks asynchronously across hosts
---
- name: Parallel long-running operations
  hosts: all
  tasks:
    - name: Start database backup (async, do not wait)
      ansible.builtin.shell:
        cmd: "/opt/scripts/full_backup.sh"
      async: 3600  # allow up to 1 hour
      poll: 0      # do not wait, fire and forget
      register: backup_job

    - name: Do other tasks while backup runs
      ansible.builtin.command:
        cmd: /opt/scripts/cleanup_temp.sh
      changed_when: false

    - name: Check backup status periodically
      ansible.builtin.async_status:
        jid: "{{ backup_job.ansible_job_id }}"
      register: backup_result
      until: backup_result.finished
      retries: 60
      delay: 60  # check every minute

    - name: Show backup result
      ansible.builtin.debug:
        msg: "Backup completed on {{ inventory_hostname }}: {{ backup_result.stdout_lines | last }}"
```

With `poll: 0`, Ansible fires the command on all hosts and immediately moves on. You can then check back later with `async_status`.

## Running Ad-Hoc Commands on Multiple Hosts

For quick one-off commands, use the `ansible` command directly:

```bash
# run a command across all web servers with 20 forks
ansible webservers -m shell -a "uptime" -f 20

# check disk space on all hosts
ansible all -m shell -a "df -h / | tail -1" -f 50

# restart a service on all app servers (2 at a time to avoid outage)
ansible app_servers -m systemd -a "name=myapp state=restarted" -f 2
```

## Throttle for Resource-Limited Tasks

The `throttle` directive limits how many hosts run a specific task simultaneously, regardless of the fork count:

```yaml
# throttle specific tasks that would overwhelm a shared resource
---
- name: Deploy with throttled database migration
  hosts: app_servers
  tasks:
    - name: Deploy code (run on all hosts in parallel)
      ansible.builtin.git:
        repo: https://github.com/example/myapp.git
        dest: /opt/myapp
        version: main

    - name: Run database migration (only 1 at a time)
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate
      throttle: 1  # only one host runs this at a time

    - name: Restart application (all hosts in parallel)
      ansible.builtin.systemd:
        name: myapp
        state: restarted
```

This is perfect for tasks that hit a shared resource like a database where concurrent migrations would cause conflicts.

## Combining Strategies for Complex Deployments

Here is a complete deployment that uses multiple parallelism controls:

```yaml
# multi-stage deployment with different parallelism at each stage
---
# Stage 1: Pre-flight checks on all hosts simultaneously
- name: Pre-flight checks
  hosts: all
  strategy: free
  gather_facts: true
  tasks:
    - name: Verify connectivity
      ansible.builtin.ping:

    - name: Check disk space
      ansible.builtin.shell:
        cmd: "df --output=pcent / | tail -1 | tr -d ' %'"
      register: disk_pct
      changed_when: false

    - name: Fail if disk is too full
      ansible.builtin.fail:
        msg: "Disk {{ disk_pct.stdout }}% full on {{ inventory_hostname }}"
      when: disk_pct.stdout | int > 90

# Stage 2: Rolling deployment to web servers
- name: Deploy to web tier
  hosts: webservers
  serial: "30%"
  max_fail_percentage: 10
  tasks:
    - name: Deploy application
      ansible.builtin.include_tasks: tasks/deploy_web.yaml

# Stage 3: Sequential deployment to database servers
- name: Deploy to database tier
  hosts: db_servers
  serial: 1  # one at a time for safety
  tasks:
    - name: Deploy database changes
      ansible.builtin.include_tasks: tasks/deploy_db.yaml
```

## Monitoring Parallel Execution

Track what is happening across hosts using callback plugins:

```ini
# ansible.cfg - use timer and profile callbacks to monitor parallel execution
[defaults]
callback_whitelist = timer, profile_tasks, profile_roles

[callback_profile_tasks]
task_output_limit = 20
sort_order = descending
```

This shows you how long each task took across hosts, helping you identify bottlenecks.

## Summary

Ansible provides several controls for parallel execution. Forks set the maximum concurrent connections. The `linear` strategy keeps hosts in step while `free` lets them proceed independently. The `serial` directive enables rolling updates for zero-downtime deployments. Async tasks let you fire long-running commands without blocking. And `throttle` limits parallelism on individual tasks that hit shared resources. For most production deployments, combine `serial` with health checks for safe rolling updates, and tune your `forks` setting based on your control node's capacity.
