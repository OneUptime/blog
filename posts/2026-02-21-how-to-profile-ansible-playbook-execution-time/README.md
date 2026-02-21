# How to Profile Ansible Playbook Execution Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Profiling, Performance, Monitoring

Description: Learn how to measure and profile Ansible playbook execution time using callback plugins, custom scripts, and analysis techniques.

---

You cannot optimize what you do not measure. Before tuning your Ansible playbooks for speed, you need to know exactly where time is being spent. Is it fact gathering? Module execution? SSH connection setup? This post covers the profiling tools and techniques available in Ansible, from built-in callback plugins to custom timing scripts.

## Built-in Profiling Callback Plugins

Ansible ships with three profiling callback plugins:

- `profile_tasks`: Shows execution time for each task
- `profile_roles`: Shows execution time for each role
- `timer`: Shows total playbook execution time

You can enable them in `ansible.cfg`:

```ini
# Enable all three profiling callbacks
[defaults]
callbacks_enabled = profile_tasks, profile_roles, timer
```

Or via environment variable for a single run:

```bash
# Enable profiling for one run without changing ansible.cfg
ANSIBLE_CALLBACKS_ENABLED=profile_tasks,timer ansible-playbook site.yml
```

## Using profile_tasks

The `profile_tasks` callback is the most useful profiling tool. It shows the execution time for every task and a sorted summary at the end:

```bash
# Run with profile_tasks enabled
ANSIBLE_CALLBACKS_ENABLED=profile_tasks ansible-playbook deploy.yml
```

The output includes timestamps during execution:

```
TASK [Install packages] ********************************************************
Thursday 21 February 2026  10:15:03 +0000 (0:00:02.345)       0:00:05.678 ****
ok: [web-01]
ok: [web-02]

TASK [Copy configuration] ******************************************************
Thursday 21 February 2026  10:15:48 +0000 (0:00:45.123)       0:00:50.801 ****
changed: [web-01]
changed: [web-02]
```

And a sorted summary at the end:

```
Thursday 21 February 2026  10:17:30 +0000 (0:00:01.234)       0:02:30.456 ****
===============================================================================
Install packages ----------------------------------------- 45.12s
Run database migration ----------------------------------- 32.45s
Copy configuration --------------------------------------- 12.34s
Restart application --------------------------------------- 5.67s
Gathering Facts ------------------------------------------- 3.21s
Health check ---------------------------------------------- 2.89s
```

Now you can see that "Install packages" takes 45 seconds and is the top optimization target.

## Using profile_roles

The `profile_roles` callback aggregates time by role, which is useful for complex playbooks that use many roles:

```bash
# Profile by role
ANSIBLE_CALLBACKS_ENABLED=profile_roles ansible-playbook site.yml
```

Output:

```
===============================================================================
common --------------------------------------------------- 23.45s
nginx ---------------------------------------------------- 18.67s
postgresql ----------------------------------------------- 45.12s
app_deploy ----------------------------------------------- 12.34s
monitoring ------------------------------------------------ 8.91s
```

This tells you which roles are the most expensive. If `postgresql` takes 45 seconds, dig into that role's tasks with `profile_tasks` to find the bottleneck.

## Using the timer Callback

The `timer` callback simply shows the total playbook execution time:

```bash
# Show total execution time
ANSIBLE_CALLBACKS_ENABLED=timer ansible-playbook site.yml
```

Output:

```
Playbook run took 0 days, 0 hours, 2 minutes, 30 seconds
```

This is useful for tracking performance over time. Record this value in your CI/CD pipeline to detect regressions.

## Custom Profiling with Timestamps

For more granular profiling, add timestamp tasks throughout your playbook:

```yaml
---
# deploy.yml - Playbook with custom profiling checkpoints
- hosts: webservers
  become: true
  vars:
    profile_start: "{{ now() }}"
  tasks:
    - name: "PROFILE: Start deployment"
      debug:
        msg: "Deployment started at {{ now() }}"

    - name: Install packages
      apt:
        name:
          - nginx
          - python3-pip
        state: present

    - name: "PROFILE: After package install"
      debug:
        msg: "Package install completed at {{ now() }}"

    - name: Deploy application code
      copy:
        src: app/
        dest: /opt/myapp/
      notify: restart app

    - name: "PROFILE: After code deploy"
      debug:
        msg: "Code deploy completed at {{ now() }}"

    - name: Run database migrations
      command: /opt/myapp/migrate.sh
      run_once: true

    - name: "PROFILE: After migrations"
      debug:
        msg: "Migrations completed at {{ now() }}"

  handlers:
    - name: restart app
      service:
        name: myapp
        state: restarted
```

## Profiling with the Shell

Wrap your ansible-playbook command with timing utilities:

```bash
#!/bin/bash
# profile-playbook.sh - Detailed playbook profiling

PLAYBOOK="$1"
LOG_DIR="/var/log/ansible/profiles"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/profile-$TIMESTAMP.log"

mkdir -p "$LOG_DIR"

echo "=== Ansible Playbook Profile ===" > "$LOG_FILE"
echo "Playbook: $PLAYBOOK" >> "$LOG_FILE"
echo "Started: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Run with profiling enabled and capture output
ANSIBLE_CALLBACKS_ENABLED=profile_tasks,timer \
    /usr/bin/time -v ansible-playbook "$PLAYBOOK" 2>&1 | tee -a "$LOG_FILE"

echo "" >> "$LOG_FILE"
echo "Finished: $(date)" >> "$LOG_FILE"
echo "Profile saved to: $LOG_FILE"
```

The `/usr/bin/time -v` command gives you system-level metrics like peak memory usage, context switches, and I/O operations.

## Analyzing Profiling Data

Once you have profiling output, here is how to analyze it:

```bash
# Extract task timing data from profile_tasks output
# Assumes output is saved to a file
grep -E "^[A-Za-z].*---" profile-output.log | \
    sort -t'-' -k2 -rn | \
    head -20
```

Or create a more structured analysis:

```bash
#!/bin/bash
# analyze-profile.sh - Parse and analyze profile_tasks output

PROFILE_FILE="$1"

echo "=== Top 10 Slowest Tasks ==="
grep -E "^.+---+\s+[0-9]+\.[0-9]+s$" "$PROFILE_FILE" | \
    sed 's/\s*-*\s*/\t/' | \
    sort -t$'\t' -k2 -rn | \
    head -10

echo ""
echo "=== Time Breakdown ==="

# Calculate fact gathering time
FACT_TIME=$(grep "Gathering Facts" "$PROFILE_FILE" | grep -oP '[0-9]+\.[0-9]+s' | head -1)
echo "Fact gathering: ${FACT_TIME:-N/A}"

# Calculate total task time (from timer callback)
TOTAL_TIME=$(grep "Playbook run took" "$PROFILE_FILE")
echo "Total: ${TOTAL_TIME:-N/A}"
```

## Profiling Over Time

Track playbook performance across runs to catch regressions:

```bash
#!/bin/bash
# track-performance.sh - Record playbook execution times

PLAYBOOK="$1"
METRICS_FILE="/var/log/ansible/performance-history.csv"

# Initialize CSV if it does not exist
if [ ! -f "$METRICS_FILE" ]; then
    echo "timestamp,playbook,duration_seconds,hosts,tasks" > "$METRICS_FILE"
fi

# Run the playbook and capture timing
START=$(date +%s)
ANSIBLE_CALLBACKS_ENABLED=profile_tasks ansible-playbook "$PLAYBOOK" > /tmp/ansible-profile-output.txt 2>&1
END=$(date +%s)
DURATION=$((END - START))

# Count hosts and tasks from output
HOSTS=$(grep -c "ok:" /tmp/ansible-profile-output.txt | head -1)
TASKS=$(grep -c "TASK \[" /tmp/ansible-profile-output.txt)

# Append to CSV
echo "$(date -Iseconds),$PLAYBOOK,$DURATION,$HOSTS,$TASKS" >> "$METRICS_FILE"

echo "Recorded: $PLAYBOOK took ${DURATION}s"
```

## Profiling at the SSH Level

Sometimes the bottleneck is SSH itself. Profile SSH connection time:

```bash
# Measure raw SSH connection time to each host
ansible all -m ping -vvvv 2>&1 | grep -E "SSH|ESTABLISH|EXEC" | head -30
```

For detailed SSH timing:

```bash
# Time SSH connections to individual hosts
for host in $(ansible all --list-hosts 2>/dev/null | tail -n +2 | tr -d ' '); do
    START=$(date +%s%N)
    ssh -o ConnectTimeout=5 "$host" "echo ok" > /dev/null 2>&1
    END=$(date +%s%N)
    ELAPSED=$(echo "scale=3; ($END - $START) / 1000000000" | bc)
    echo "$host: ${ELAPSED}s"
done
```

## Creating a Profiling Playbook

Build a dedicated profiling playbook that tests various aspects of your Ansible infrastructure:

```yaml
---
# profile-infrastructure.yml - Comprehensive Ansible profiling
- hosts: all
  gather_facts: false
  tasks:
    - name: "BENCHMARK: Raw SSH connectivity"
      raw: echo "connected"
      changed_when: false

    - name: "BENCHMARK: Python module execution"
      ping:

    - name: "BENCHMARK: File read"
      command: cat /etc/hostname
      changed_when: false

    - name: "BENCHMARK: File write"
      copy:
        content: "benchmark-test"
        dest: /tmp/ansible-benchmark
        mode: '0644'

    - name: "BENCHMARK: Template render"
      template:
        src: benchmark.j2
        dest: /tmp/ansible-benchmark-template

    - name: "BENCHMARK: Package query"
      command: dpkg -l
      changed_when: false

    - name: "BENCHMARK: Cleanup"
      file:
        path: "{{ item }}"
        state: absent
      loop:
        - /tmp/ansible-benchmark
        - /tmp/ansible-benchmark-template
```

Run it with profiling:

```bash
# Profile infrastructure performance
ANSIBLE_CALLBACKS_ENABLED=profile_tasks ansible-playbook profile-infrastructure.yml
```

This gives you a baseline for different operation types. If "File write" is disproportionately slow, you know to investigate disk I/O or SFTP performance. If "Raw SSH connectivity" is slow, the problem is at the network or SSH layer.

## Profiling in CI/CD

Integrate profiling into your CI/CD pipeline:

```yaml
# .gitlab-ci.yml example
ansible-deploy:
  script:
    - ANSIBLE_CALLBACKS_ENABLED=profile_tasks,timer ansible-playbook deploy.yml 2>&1 | tee profile-output.txt
    - grep "Playbook run took" profile-output.txt
    # Fail if playbook takes longer than 10 minutes
    - |
      DURATION=$(grep -oP '\d+ minutes' profile-output.txt | grep -oP '\d+')
      if [ "$DURATION" -gt 10 ]; then
        echo "WARNING: Playbook took $DURATION minutes (threshold: 10)"
        exit 1
      fi
  artifacts:
    paths:
      - profile-output.txt
```

Profiling is the foundation of performance optimization. Enable `profile_tasks` as a standard practice, track execution times over time, and use the data to focus your optimization efforts where they will have the most impact. Without measurement, you are just guessing.
