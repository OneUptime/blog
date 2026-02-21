# How to Speed Up Ansible Playbook Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Performance, DevOps, Automation

Description: Learn practical techniques to speed up Ansible playbook execution including pipelining, forks, fact caching, and strategy tuning.

---

If you have worked with Ansible long enough, you know the frustration of watching a playbook crawl across hundreds of hosts. What starts as a 5-minute run on 10 servers can balloon into a 45-minute ordeal when your fleet grows. The good news is that Ansible ships with several knobs you can turn to dramatically cut execution time. In this post, I will walk through the most impactful techniques I have used in production to speed things up.

## Why Ansible Playbooks Get Slow

Before jumping into fixes, it helps to understand where time goes. Ansible spends most of its execution time on three things: SSH connection setup, module transfer to remote hosts, and fact gathering. Each task in a playbook opens an SSH connection, copies a Python module to the remote host, executes it, and fetches the results. Multiply that by hundreds of hosts and dozens of tasks, and you have a performance problem.

## Enable SSH Pipelining

By default, Ansible copies each module to the remote host as a temporary file, then executes it in a separate SSH call. SSH pipelining eliminates the file copy step by piping the module code directly through the SSH connection. This alone can cut playbook runtime by 30-40%.

Add this to your `ansible.cfg`:

```ini
# Enable SSH pipelining to skip module file transfer
[ssh_connection]
pipelining = True
```

One caveat: pipelining does not work if the remote host has `requiretty` set in its sudoers file. You can check with:

```bash
# Check if requiretty is enabled on remote hosts
ansible all -m shell -a "grep requiretty /etc/sudoers" --become
```

If it is set, you can disable it with:

```yaml
# Remove requiretty restriction from sudoers
- name: Disable requiretty
  lineinfile:
    path: /etc/sudoers
    regexp: '^\s*Defaults\s+requiretty'
    state: absent
  become: true
```

## Increase the Fork Count

Ansible defaults to running tasks on 5 hosts at a time. If you have 100 hosts, that means 20 sequential batches per task. Bumping the fork count lets Ansible work on more hosts simultaneously.

```ini
# Increase parallel execution to 50 hosts at once
[defaults]
forks = 50
```

A good rule of thumb: set forks to somewhere between 20 and 100, depending on your control node's CPU and memory. I typically use 50 for most workloads. You can also set it per-run:

```bash
# Override forks at the command line
ansible-playbook site.yml -f 50
```

## Use the free Strategy

The default `linear` strategy waits for all hosts to finish a task before moving to the next one. The `free` strategy lets each host move through tasks at its own pace, so fast hosts do not wait for slow ones.

```yaml
# Use free strategy to let hosts proceed independently
- hosts: webservers
  strategy: free
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present

    - name: Copy config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
```

Be careful with the `free` strategy if you have tasks that depend on all hosts being at the same point, like rolling updates with a load balancer.

## Minimize Fact Gathering

Fact gathering runs `setup` on every host at the start of each play. If you do not need facts, turn it off:

```yaml
# Skip fact gathering entirely when facts are not needed
- hosts: webservers
  gather_facts: false
  tasks:
    - name: Restart nginx
      service:
        name: nginx
        state: restarted
```

If you need some facts but not all, use `gather_subset`:

```yaml
# Only gather network-related facts
- hosts: all
  gather_facts: true
  gather_subset:
    - network
  tasks:
    - debug:
        msg: "IP is {{ ansible_default_ipv4.address }}"
```

## Enable Fact Caching

When you do need facts across multiple plays, caching prevents Ansible from re-gathering them every time:

```ini
# Cache facts to JSON files for 24 hours
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_fact_cache
fact_caching_timeout = 86400
```

With `gathering = smart`, Ansible only gathers facts if they are not already in the cache. This is a massive win when you run playbooks frequently against the same hosts.

## Use ControlPersist for SSH

SSH connection setup adds latency on every task. ControlPersist keeps SSH connections alive and reuses them:

```ini
# Keep SSH connections alive for 60 seconds after use
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o ControlPath=/tmp/ansible-ssh-%h-%p-%r
```

This is actually Ansible's default behavior in recent versions, but it is worth verifying your config has sensible timeout values. I have found that bumping ControlPersist to 120s or even 300s can help for playbooks with many tasks.

## Use async for Long-Running Tasks

If you have tasks that take a long time (package installs, database migrations), you can run them asynchronously:

```yaml
# Run a slow task asynchronously and poll every 10 seconds
- name: Run database migration
  command: /opt/app/migrate.sh
  async: 600
  poll: 10

# Or fire-and-forget with poll 0, then check later
- name: Start long backup process
  command: /opt/scripts/backup.sh
  async: 3600
  poll: 0
  register: backup_job

- name: Wait for backup to complete
  async_status:
    jid: "{{ backup_job.ansible_job_id }}"
  register: job_result
  until: job_result.finished
  retries: 60
  delay: 30
```

## Reduce Module Transfer Overhead

Ansible transfers Python modules to each remote host for every task. You can speed this up by using `zip` transfer mode:

```ini
# Compress module transfers
[defaults]
module_compression = ZIP
```

Also consider whether you actually need Python modules for simple tasks. The `raw` module and `command` module skip some of the overhead:

```yaml
# Use raw module for simple commands that don't need Python
- name: Check uptime
  raw: uptime
  changed_when: false
```

## Profile Your Playbooks

Before optimizing, measure. Enable the `profile_tasks` callback to see where time is spent:

```ini
# Show timing for each task
[defaults]
callbacks_enabled = profile_tasks
```

This gives you output like:

```
Wednesday 21 February 2026  10:15:00 +0000 (0:00:03.456)  0:01:23.456 ********
Install packages ------------------------------------------ 45.23s
Copy configuration files ---------------------------------- 12.11s
Restart services ------------------------------------------- 3.45s
```

Now you know exactly which tasks to optimize first.

## Putting It All Together

Here is a comprehensive `ansible.cfg` that incorporates the most impactful settings:

```ini
[defaults]
forks = 50
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_fact_cache
fact_caching_timeout = 86400
callbacks_enabled = profile_tasks
strategy = linear

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=120s -o ControlPath=/tmp/ansible-ssh-%h-%p-%r
```

## Benchmark Before and After

Always measure the impact of your changes. Run your playbook with the `time` command:

```bash
# Time your playbook execution
time ansible-playbook site.yml
```

In my experience, combining pipelining, increased forks, smart fact gathering, and ControlPersist typically results in a 50-70% reduction in playbook runtime. The exact numbers depend on your infrastructure, but even a 30% improvement pays for itself quickly when you run playbooks multiple times a day.

## Quick Reference

Here is a summary of what to try and the expected impact:

| Technique | Expected Speedup | Complexity |
|---|---|---|
| SSH Pipelining | 30-40% | Low |
| Increase Forks | 20-60% | Low |
| Free Strategy | 10-30% | Medium |
| Disable Fact Gathering | 5-15% | Low |
| Fact Caching | 5-15% | Low |
| ControlPersist | 10-20% | Low |
| Async Tasks | Varies | Medium |

Start with the low-complexity changes first. SSH pipelining and increased forks give the biggest bang for the least effort. Then move on to strategy changes and fact caching as needed.

The key takeaway is that Ansible's default settings are tuned for safety and compatibility, not speed. Once you understand your infrastructure's requirements, you can safely loosen those defaults and see significant performance gains.
