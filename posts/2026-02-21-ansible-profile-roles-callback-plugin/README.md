# How to Use the Ansible profile_roles Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Performance, Roles

Description: Use the Ansible profile_roles callback plugin to measure execution time per role and identify which roles slow down your playbooks.

---

The `profile_roles` callback plugin measures how long each Ansible role takes to execute. While `profile_tasks` gives you per-task timing, `profile_roles` aggregates those times by role, giving you a higher-level view of where your playbook spends its time. This is especially useful when you have playbooks that call many roles and you need to know which role to optimize first.

## Enabling profile_roles

Enable it in your `ansible.cfg`:

```ini
# ansible.cfg - Enable role profiling
[defaults]
callback_whitelist = profile_roles
```

Or via environment variable:

```bash
# Enable role profiling for one run
ANSIBLE_CALLBACK_WHITELIST=profile_roles ansible-playbook site.yml
```

## What the Output Shows

After the play recap, profile_roles adds a sorted summary of role execution times:

```
PLAY RECAP *******************************************************************
web-01  : ok=15  changed=3  unreachable=0  failed=0
web-02  : ok=15  changed=3  unreachable=0  failed=0

Thursday 21 February 2026  10:05:30 +0000 (0:00:01.234)       0:05:30.567 ****
===============================================================================
database ----------------------------------------------------------- 145.23s
webserver ----------------------------------------------------------- 98.45s
common -------------------------------------------------------------- 45.67s
monitoring ---------------------------------------------------------- 32.12s
security ------------------------------------------------------------ 12.34s
```

Each line shows the role name and the total time spent executing tasks in that role. The roles are sorted from slowest to fastest.

## Why Role-Level Timing Matters

Consider a playbook that applies several roles:

```yaml
# site.yml - Apply roles to web servers
---
- name: Configure web servers
  hosts: webservers
  become: true

  roles:
    - common
    - security
    - webserver
    - monitoring
    - application
```

With profile_tasks, you might see 30 individual tasks sorted by time. With profile_roles, you see 5 role summaries. This tells you immediately: "the database role takes 2.5 minutes, everything else combined takes 3 minutes." You know where to focus your optimization effort.

## Combining with profile_tasks

Use both callbacks together for the full picture:

```ini
# ansible.cfg - Both task and role profiling
[defaults]
callback_whitelist = profile_roles, profile_tasks, timer
```

The output includes three summaries:

1. Per-task timing from profile_tasks (which specific tasks are slow)
2. Per-role timing from profile_roles (which roles aggregate to the most time)
3. Total elapsed time from timer

```
===============================================================================
# profile_tasks output
database : Install PostgreSQL 14 ------------------------------------- 89.45s
database : Run database migrations ----------------------------------- 45.67s
webserver : Install nginx and dependencies --------------------------- 34.56s
common : Update apt cache -------------------------------------------- 23.45s
...

# profile_roles output
===============================================================================
database ----------------------------------------------------------- 145.23s
webserver ----------------------------------------------------------- 98.45s
common -------------------------------------------------------------- 45.67s
monitoring ---------------------------------------------------------- 32.12s
security ------------------------------------------------------------ 12.34s

Playbook run took 0 days, 0 hours, 5 minutes, 30 seconds
```

You can see that the `database` role takes 145 seconds total, broken down into 89 seconds for installation and 45 seconds for migrations.

## Practical Optimization Based on Role Profiling

Once you know which role is slowest, dig into it:

```bash
# Profile a single role in isolation
ANSIBLE_CALLBACK_WHITELIST=profile_tasks,profile_roles \
  ansible-playbook -i inventory --tags database site.yml
```

Or create a test playbook that runs just one role:

```yaml
# test-database-role.yml - Profile the database role in isolation
---
- name: Profile database role
  hosts: db-servers
  become: true
  roles:
    - database
```

```bash
# Run with profiling
ANSIBLE_CALLBACK_WHITELIST=profile_tasks,profile_roles ansible-playbook test-database-role.yml
```

## Role Profiling Across Environments

Compare role execution times between environments:

```bash
#!/bin/bash
# compare-environments.sh - Compare role timing across staging and production
export ANSIBLE_CALLBACK_WHITELIST=profile_roles

echo "=== Staging ==="
ansible-playbook -i inventory/staging site.yml 2>&1 | sed -n '/^====/,$ p'

echo ""
echo "=== Production ==="
ansible-playbook -i inventory/production site.yml 2>&1 | sed -n '/^====/,$ p'
```

If a role takes significantly longer in production, it could indicate:
- More data to migrate
- Slower network connections
- Larger package downloads
- More hosts to configure

## Tracking Role Performance Over Time

Build a simple tracking system:

```bash
#!/bin/bash
# track-role-timing.sh - Extract and log role timing data
LOG_FILE="/var/log/ansible/role-timing.csv"
export ANSIBLE_CALLBACK_WHITELIST=profile_roles

# Run the playbook and capture output
output=$(ansible-playbook site.yml 2>&1)
timestamp=$(date -Iseconds)

# Parse the role timing summary
echo "$output" | sed -n '/^====/,$ p' | grep -E '^\w' | while read -r line; do
    role=$(echo "$line" | awk '{print $1}')
    time=$(echo "$line" | grep -oP '[\d.]+s$' | sed 's/s//')
    echo "$timestamp,$role,$time" >> "$LOG_FILE"
done
```

The CSV file grows over time:

```csv
2026-02-18T10:00:00+00:00,database,145.23
2026-02-18T10:00:00+00:00,webserver,98.45
2026-02-18T10:00:00+00:00,common,45.67
2026-02-19T10:00:00+00:00,database,142.89
2026-02-19T10:00:00+00:00,webserver,95.12
2026-02-19T10:00:00+00:00,common,44.23
```

## Common Role Optimization Patterns

Based on profile_roles data, here are typical optimizations:

Slow `common` role (package updates):

```yaml
# roles/common/tasks/main.yml - Optimized package management
- name: Update apt cache (with caching)
  apt:
    update_cache: true
    cache_valid_time: 3600  # Only update if cache is older than 1 hour

- name: Install all common packages in one call
  apt:
    name: "{{ common_packages }}"
    state: present
  # Instead of looping over individual packages
```

Slow `webserver` role (file deployment):

```yaml
# roles/webserver/tasks/main.yml - Optimized file deployment
- name: Sync all config files at once
  synchronize:
    src: configs/
    dest: /etc/nginx/
    recursive: true
  # Instead of individual copy tasks for each file
```

Slow `database` role (migrations):

```yaml
# roles/database/tasks/main.yml - Skip migrations when not needed
- name: Check migration status
  command: python manage.py showmigrations --plan
  register: migration_status
  changed_when: false

- name: Run migrations only if needed
  command: python manage.py migrate --noinput
  when: "'[ ]' in migration_status.stdout"
```

## profile_roles in Multi-Play Playbooks

If your playbook has multiple plays, profile_roles aggregates the time for each role across all plays:

```yaml
# multi-play.yml
---
- name: Common setup
  hosts: all
  roles:
    - common

- name: Web servers
  hosts: webservers
  roles:
    - common  # Applied again for web-specific common tasks
    - webserver

- name: Database servers
  hosts: dbservers
  roles:
    - common  # Applied again for db-specific common tasks
    - database
```

The profile_roles summary will show the `common` role's total time across all three plays, which might reveal that you are running common tasks unnecessarily multiple times.

The profile_roles callback gives you the strategic view of your playbook performance. Use it to decide which role to optimize, then use profile_tasks within that role to find the specific slow tasks. Together, they make a complete performance profiling toolkit for Ansible.
