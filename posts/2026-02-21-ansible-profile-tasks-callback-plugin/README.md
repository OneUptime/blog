# How to Use the Ansible profile_tasks Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Performance, Profiling

Description: Use the Ansible profile_tasks callback plugin to measure individual task execution times and identify slow tasks that need optimization.

---

The `profile_tasks` callback plugin adds timing information to every task in your Ansible playbook output. After the playbook finishes, it shows a sorted summary of all tasks ranked by execution time. This is the go-to tool for finding performance bottlenecks in your playbooks.

## Enabling profile_tasks

Add it to your callback whitelist:

```ini
# ansible.cfg - Enable task profiling
[defaults]
callback_whitelist = profile_tasks
```

Or for a single run:

```bash
# Profile tasks for this run only
ANSIBLE_CALLBACK_WHITELIST=profile_tasks ansible-playbook site.yml
```

## What the Output Shows

With profile_tasks enabled, each task line includes the elapsed time. At the end of the run, you get a sorted summary:

```
TASK [Gathering Facts] *******************************************************
Thursday 21 February 2026  10:00:00 +0000 (0:00:00.012)       0:00:00.012 ****
ok: [web-01]
ok: [web-02]

TASK [Install packages] ******************************************************
Thursday 21 February 2026  10:00:12 +0000 (0:00:12.345)       0:00:12.357 ****
ok: [web-01]
changed: [web-02]

TASK [Deploy config] *********************************************************
Thursday 21 February 2026  10:02:15 +0000 (0:02:03.123)       0:02:15.480 ****
changed: [web-01]
changed: [web-02]

PLAY RECAP *******************************************************************
web-01  : ok=3  changed=1  unreachable=0  failed=0
web-02  : ok=3  changed=2  unreachable=0  failed=0

Thursday 21 February 2026  10:02:20 +0000 (0:00:04.567)       0:02:20.047 ****
===============================================================================
Deploy config -------------------------------------------------------- 123.12s
Install packages ----------------------------------------------------- 12.35s
Gathering Facts ------------------------------------------------------ 12.35s
```

Each task line shows two timestamps:
- The first is the elapsed time for that specific task
- The second is the cumulative elapsed time from the start

The summary at the bottom sorts tasks from slowest to fastest.

## Reading the Timing Data

The two columns on each task line mean:

```
Thursday 21 February 2026  10:02:15 +0000 (0:02:03.123)       0:02:15.480 ****
                                           ^task duration^     ^total elapsed^
```

- `(0:02:03.123)` - this task took 2 minutes and 3.123 seconds
- `0:02:15.480` - 2 minutes 15 seconds have elapsed since the playbook started

This tells you both how long each task takes and where you are in the overall timeline.

## Finding Bottlenecks

The sorted summary at the end is where you look first:

```
===============================================================================
Compile application from source ------------------------------------ 345.67s
Download dependencies from npm ------------------------------------- 120.34s
Run database migrations --------------------------------------------- 89.12s
Install system packages --------------------------------------------- 45.23s
Deploy configuration files ------------------------------------------- 3.45s
Restart services ----------------------------------------------------- 2.13s
Gathering Facts ------------------------------------------------------ 1.89s
Verify health check -------------------------------------------------- 0.56s
```

Immediately you can see that compiling takes 5.5 minutes and downloading dependencies takes 2 minutes. Those two tasks account for most of the playbook runtime. Optimizing them (pre-compiled artifacts, dependency caching) would have the biggest impact.

## Practical Optimization Workflow

Use profile_tasks to measure, optimize, then measure again:

```bash
# Step 1: Get baseline timing
ANSIBLE_CALLBACK_WHITELIST=profile_tasks ansible-playbook deploy.yml 2>&1 | tee baseline.log

# Step 2: Make optimizations (e.g., enable pipelining, increase forks, use async)

# Step 3: Measure again
ANSIBLE_CALLBACK_WHITELIST=profile_tasks ansible-playbook deploy.yml 2>&1 | tee optimized.log

# Step 4: Compare
echo "=== Baseline ==="
grep "^=\|^[A-Z].*---" baseline.log | tail -20
echo ""
echo "=== Optimized ==="
grep "^=\|^[A-Z].*---" optimized.log | tail -20
```

## Configuration Options

profile_tasks has a few settings:

```ini
# ansible.cfg - Configure profile_tasks
[defaults]
callback_whitelist = profile_tasks

[callback_profile_tasks]
# Sort order: descending (slowest first) or ascending
sort_order = descending
# Number of tasks to show in the summary
task_output_limit = 20
```

To show only the top 10 slowest tasks:

```ini
[callback_profile_tasks]
task_output_limit = 10
sort_order = descending
```

## Combining with profile_roles

For a complete performance picture, use both profile_tasks and profile_roles:

```ini
# ansible.cfg - Full performance profiling
[defaults]
callback_whitelist = profile_tasks, profile_roles, timer
```

This gives you task-level timing, role-level timing, and total time.

## Using profile_tasks in CI/CD

Track task performance over time in your CI pipeline:

```bash
#!/bin/bash
# ci-profile.sh - Extract timing data for metrics
export ANSIBLE_CALLBACK_WHITELIST=profile_tasks

ansible-playbook deploy.yml 2>&1 | tee /tmp/ansible-output.log

# Extract the timing summary
sed -n '/^====/,$ p' /tmp/ansible-output.log | while read -r line; do
    # Parse task name and duration
    task=$(echo "$line" | sed 's/ --.*//')
    duration=$(echo "$line" | grep -oP '[\d.]+s$' | sed 's/s//')

    if [ -n "$duration" ]; then
        # Send to metrics system
        curl -s -X POST "https://metrics.example.com/api/v1/gauge" \
            -d "{\"metric\":\"ansible.task.duration\",\"tags\":[\"task:$task\"],\"value\":$duration}"
    fi
done
```

## Common Slow Tasks and Fixes

Based on what profile_tasks typically reveals, here are common bottlenecks and solutions:

Package installation is slow:

```yaml
# Slow: Installing packages one at a time
- name: Install nginx
  apt:
    name: nginx
    state: present

- name: Install certbot
  apt:
    name: certbot
    state: present

# Fast: Install all packages in one task
- name: Install all required packages
  apt:
    name:
      - nginx
      - certbot
      - python3-certbot-nginx
    state: present
    update_cache: true
    cache_valid_time: 3600
```

Gathering facts is slow when you do not need them:

```yaml
# Skip fact gathering when you do not need it
- name: Deploy configs
  hosts: webservers
  gather_facts: false  # Saves 2-10 seconds per host
  tasks:
    - name: Copy config
      copy:
        src: app.conf
        dest: /etc/app/app.conf
```

Loops are slow because each iteration is a separate module execution:

```yaml
# Slow: Loop over individual files
- name: Copy config files
  copy:
    src: "{{ item }}"
    dest: /etc/app/
  loop:
    - config1.yml
    - config2.yml
    - config3.yml

# Fast: Use synchronize or copy with directory
- name: Copy all config files at once
  copy:
    src: configs/
    dest: /etc/app/
```

## profile_tasks for Async Task Monitoring

When using async tasks, profile_tasks shows you the actual wait time:

```yaml
- name: Long running task
  command: /opt/app/build.sh
  async: 600
  poll: 10
```

profile_tasks will show the total time including all poll cycles, which helps you tune the `poll` interval and `async` timeout.

The profile_tasks callback is the first tool to reach for when a playbook is too slow. Enable it, read the summary, find the slowest tasks, optimize them, and repeat. Most playbook performance issues are caused by a small number of slow tasks, and profile_tasks points you right at them.
