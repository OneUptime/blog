# How to Use Ansible Strategies for Large-Scale Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Strategy, Large Scale, Deployment, Performance

Description: Configure Ansible strategy plugins, forks, serial, and performance settings for deploying to hundreds or thousands of hosts reliably and efficiently.

---

Deploying to 5 hosts is easy. Deploying to 500 or 5,000 hosts introduces challenges that you do not encounter at small scale: control node resource limits, SSH connection management, execution time that stretches into hours, and the increased probability that some percentage of hosts will fail. This guide covers how to tune Ansible's strategy settings for large-scale deployments.

## The Scale Challenge

At scale, several things break:

- The default 5 forks means 5,000 hosts take 1,000 rounds per task
- SSH connections pile up and hit OS limits
- Memory on the control node grows with fork count
- The probability of at least one host failing approaches 100%
- Playbook output becomes unmanageable

## Performance Configuration for Scale

Start with the right `ansible.cfg`:

```ini
# ansible.cfg - Optimized for large-scale deployments
[defaults]
# Increase forks based on control node capacity
forks = 50

# Use the free strategy for independent tasks
strategy = linear

# Reduce fact gathering overhead
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible-facts-cache
fact_caching_timeout = 86400

# Reduce output noise
stdout_callback = dense
display_skipped_hosts = false
display_ok_hosts = false

# Callbacks for monitoring
callback_whitelist = timer, profile_tasks, profile_roles

[ssh_connection]
# Enable pipelining (major performance improvement)
pipelining = true

# SSH multiplexing
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o PreferredAuthentications=publickey

# Reduce SSH connection overhead
control_path_dir = /tmp/.ansible-cp
```

## Strategy Selection for Scale

Choose your strategy based on the deployment pattern:

```yaml
# large-scale-config.yml - Configuration management (no ordering needed)
---
- name: Apply configuration to all servers
  hosts: all  # 2000 hosts
  strategy: free  # Let fast hosts proceed
  gather_facts: false  # Skip unless needed

  tasks:
    - name: Update configuration
      template:
        src: app.conf.j2
        dest: /etc/app/config.yml
      notify: Reload service

  handlers:
    - name: Reload service
      service:
        name: myapp
        state: reloaded
```

```yaml
# large-scale-deploy.yml - Application deployment (ordering matters)
---
- name: Rolling deployment to web fleet
  hosts: webservers  # 500 hosts
  strategy: linear
  serial: "10%"  # 50 hosts per batch
  max_fail_percentage: 5

  tasks:
    - name: Deploy application
      include_role:
        name: deploy
```

## Splitting Large Inventories

For very large inventories, split into logical groups and process them separately:

```yaml
# large-deploy.yml - Process groups in sequence
---
# Phase 1: Update US East servers
- name: Deploy to US East
  hosts: us_east_webservers
  serial: "10%"
  max_fail_percentage: 5
  tasks:
    - include_role:
        name: deploy

# Phase 2: Update US West servers (after US East succeeds)
- name: Deploy to US West
  hosts: us_west_webservers
  serial: "10%"
  max_fail_percentage: 5
  tasks:
    - include_role:
        name: deploy

# Phase 3: Update EU servers
- name: Deploy to EU
  hosts: eu_webservers
  serial: "10%"
  max_fail_percentage: 5
  tasks:
    - include_role:
        name: deploy
```

## Fact Caching for Speed

Gathering facts on 5,000 hosts takes significant time. Use fact caching:

```ini
# ansible.cfg - Fact caching with Redis
[defaults]
gathering = smart
fact_caching = redis
fact_caching_connection = redis:6379:0
fact_caching_timeout = 86400  # 24 hours
```

Or with a JSON file cache:

```ini
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /var/cache/ansible/facts
fact_caching_timeout = 86400
```

After the first run, subsequent runs skip fact gathering for cached hosts.

## Async for Parallel Long Tasks

For tasks that take a long time (package updates, builds), use async to prevent SSH timeouts:

```yaml
- name: Large-scale package update
  hosts: all  # 1000 hosts
  strategy: free

  tasks:
    - name: Update all packages (async to prevent timeout)
      apt:
        upgrade: safe
      async: 1800  # 30 minute maximum
      poll: 0       # Fire and forget
      register: update_job

    - name: Wait for updates to complete
      async_status:
        jid: "{{ update_job.ansible_job_id }}"
      register: update_result
      until: update_result.finished
      retries: 60
      delay: 30
```

## Managing SSH Connections at Scale

SSH connection limits can be a bottleneck. Tune the OS and SSH:

```bash
# On the control node: increase file descriptor limits
ulimit -n 65536

# In /etc/security/limits.conf
ansible    soft    nofile    65536
ansible    hard    nofile    65536
```

```ini
# ansible.cfg - SSH connection management
[ssh_connection]
# Control path reduces SSH overhead
control_path_dir = /tmp/.ansible-cp

# Persist connections for 120 seconds
ssh_args = -o ControlMaster=auto -o ControlPersist=120s

# Timeout for SSH connections
timeout = 30
```

## Monitoring Large Runs

Use the dense callback for manageable output:

```ini
# ansible.cfg - Output for large runs
[defaults]
stdout_callback = dense
callback_whitelist = timer, profile_tasks, profile_roles
show_custom_stats = true
```

Track progress with custom stats:

```yaml
- name: Large deployment with tracking
  hosts: webservers  # 500 hosts
  serial: 50
  max_fail_percentage: 5

  tasks:
    - name: Deploy
      include_role:
        name: deploy

  post_tasks:
    - name: Track batch progress
      set_stats:
        data:
          batches_completed: 1
          hosts_updated: "{{ ansible_play_hosts | length }}"
        aggregate: true
      run_once: true
```

## Handling Failures at Scale

At scale, some percentage of hosts will always fail. Plan for it:

```yaml
# large-scale-with-recovery.yml
---
- name: Deploy with failure tolerance
  hosts: webservers
  serial: "10%"
  max_fail_percentage: 5

  tasks:
    - name: Deploy application
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

# Recovery play for failed hosts
- name: Retry failed hosts
  hosts: webservers
  serial: 5

  tasks:
    - name: Check if this host needs recovery
      set_fact:
        needs_recovery: "{{ inventory_hostname in (ansible_stats.aggregated.failed_hosts | default([])) }}"

    - name: Skip healthy hosts
      meta: end_host
      when: not needs_recovery

    - name: Retry deployment
      include_role:
        name: deploy
```

## Parallel Playbook Execution

For the largest environments, run multiple Ansible processes against different host groups:

```bash
#!/bin/bash
# parallel-deploy.sh - Run against multiple groups in parallel
GROUPS="us_east us_west eu_west ap_southeast"
PIDS=""

for group in $GROUPS; do
    ansible-playbook -i "inventory/$group" deploy.yml \
        --limit "$group" \
        -f 50 \
        > "/var/log/ansible/deploy-$group.log" 2>&1 &
    PIDS="$PIDS $!"
done

# Wait for all to complete
FAILED=0
for pid in $PIDS; do
    if ! wait $pid; then
        FAILED=$((FAILED + 1))
    fi
done

echo "Completed with $FAILED failures out of $(echo $GROUPS | wc -w) groups"
exit $FAILED
```

## Using AWX/Tower for Scale

For consistent large-scale operations, use AWX or Ansible Tower:

- Job templates with predefined inventory and credentials
- Workflow templates that chain multiple playbooks
- Built-in job queuing and scheduling
- Web UI for monitoring multiple concurrent jobs
- Credential management without SSH key distribution
- Survey prompts for deployment parameters

## Capacity Planning for the Control Node

Estimate control node requirements:

```
Memory: forks * 100MB + base Ansible overhead (500MB)
  50 forks = ~5.5 GB RAM
  100 forks = ~10.5 GB RAM

CPU: 1 core per 25 forks is a good starting point
  50 forks = 2 cores minimum
  100 forks = 4 cores minimum

Network: depends on file transfer tasks
  Uploading a 50MB artifact to 50 hosts simultaneously = 2.5 GB bandwidth burst
```

Large-scale Ansible is about tuning every layer: connection management, parallelism, output handling, failure tolerance, and resource usage. Start with the performance settings in this guide, profile with `profile_tasks` and `timer`, and iterate until your deployments run within your time and reliability targets.
