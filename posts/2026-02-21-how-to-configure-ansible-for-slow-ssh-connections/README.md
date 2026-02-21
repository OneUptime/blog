# How to Configure Ansible for Slow SSH Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Performance, DevOps, Networking

Description: Tune Ansible settings to handle slow or high-latency SSH connections without timeouts or playbook failures

---

Not every server sits in a data center with a 1ms ping time from your Ansible controller. Sometimes you are managing hosts across continents, behind satellite links, or on congested networks where SSH connections take seconds to establish and every command feels like it is running through molasses. The default Ansible configuration assumes reasonably fast SSH connections, and when that assumption breaks, playbooks fail with timeout errors or hang indefinitely.

This guide covers every knob you can turn to make Ansible work reliably over slow SSH connections.

## Identifying Slow Connection Issues

Before tuning anything, confirm that the slowness is actually in the SSH connection layer and not somewhere else.

```bash
# Measure raw SSH connection time
time ssh -o ConnectTimeout=30 deploy@slow-server.example.com "echo connected"

# Measure SSH with verbose output to see where time is spent
ssh -vvv deploy@slow-server.example.com "echo connected" 2>&1 | grep -E "debug1: (Connection|Authenticated|Connecting)"

# Test Ansible connectivity with timing
time ansible slow_servers -m ping -v
```

If the raw SSH connection takes more than 2-3 seconds, you are dealing with a slow connection that needs tuning.

## Core Timeout Settings

Ansible has several timeout values that need adjusting for slow connections.

```ini
# ansible.cfg - timeout settings for slow connections
[defaults]
# Time to wait for a connection to be established (seconds)
timeout = 60

# How long to wait for a response from the remote host
# during command execution
gather_timeout = 60

[ssh_connection]
# SSH-level connection timeout
ssh_args = -o ConnectTimeout=60 -o ServerAliveInterval=30 -o ServerAliveCountMax=10

# Number of times to retry failed SSH connections
retries = 5
```

The `timeout` in `[defaults]` controls how long Ansible waits for the initial connection. The `ConnectTimeout` in SSH args controls the SSH client's own timeout. Set both to be safe.

## Connection Multiplexing

SSH multiplexing is the single biggest performance improvement for slow connections. It reuses an existing SSH connection for subsequent commands instead of opening a new one each time.

```ini
# ansible.cfg - aggressive multiplexing for slow connections
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=1800s -o ConnectTimeout=60 -o ServerAliveInterval=30 -o ServerAliveCountMax=10
control_path_dir = ~/.ansible/cp
control_path = %(directory)s/%%h-%%r-%%p
```

The `ControlPersist=1800s` (30 minutes) is much longer than the default. On slow connections, you want to keep that multiplexed connection alive for as long as possible to avoid the cost of re-establishing it.

## Reducing the Number of SSH Operations

Every Ansible task requires multiple SSH operations: transferring the module, executing it, and fetching the result. You can reduce this overhead with pipelining.

```ini
# ansible.cfg - enable pipelining to reduce SSH round trips
[ssh_connection]
pipelining = true
```

Pipelining sends the module code through the SSH pipe rather than transferring it as a separate file. This cuts the number of SSH operations roughly in half. However, pipelining requires that `requiretty` is not set in `/etc/sudoers` on the remote host. If you use `become`, check this:

```bash
# On the remote host, check for requiretty
sudo grep -n "requiretty" /etc/sudoers
# If you see "Defaults requiretty", you need to remove or comment it out
```

## Reducing Gathered Facts

Fact gathering involves running a Python script on the remote host and transferring the results back. On slow connections, this can take a long time.

```yaml
# playbooks/minimal-facts.yml
# Only gather the facts we actually need
---
- name: Deploy with minimal fact gathering
  hosts: slow_servers
  gather_facts: false

  pre_tasks:
    - name: Gather only essential facts
      ansible.builtin.setup:
        gather_subset:
          - min
          - network
      register: facts_result
      retries: 3
      delay: 10
      until: facts_result is not failed

  tasks:
    - name: Display hostname
      ansible.builtin.debug:
        msg: "Managing {{ ansible_hostname }}"
```

Or cache facts so you do not gather them on every run.

```ini
# ansible.cfg - cache facts to avoid repeated gathering
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 86400
```

With `gathering = smart`, Ansible only gathers facts when they are not already cached. The cache timeout of 86400 seconds (24 hours) means you only pay the cost of fact gathering once per day.

## Reducing Forks for Bandwidth-Constrained Links

If the slow connection is bandwidth-constrained (like a satellite link), running multiple parallel SSH sessions makes each one slower. Reduce the number of forks.

```ini
# ansible.cfg - fewer parallel connections for slow links
[defaults]
forks = 3
serial = 1
```

In your playbook, use `serial` to process hosts one at a time or in small batches.

```yaml
# playbooks/serial-deploy.yml
# Process hosts sequentially to avoid overwhelming the network link
---
- name: Deploy over slow connection
  hosts: slow_servers
  serial: 2
  gather_facts: false

  tasks:
    - name: Wait for connection
      ansible.builtin.wait_for_connection:
        timeout: 120
        delay: 5

    - name: Run deployment
      ansible.builtin.command: /opt/deploy/run.sh
      async: 600
      poll: 30
```

## Using Async for Long-Running Tasks

On slow connections, tasks that produce a lot of output can overwhelm the SSH channel. Use async to fire off the task and poll for results.

```yaml
# playbooks/async-tasks.yml
# Use async to prevent SSH timeouts on long tasks
---
- name: Long-running tasks over slow connection
  hosts: slow_servers
  become: true

  tasks:
    - name: Update all packages
      ansible.builtin.apt:
        update_cache: true
        upgrade: dist
      async: 1800
      poll: 60
      register: upgrade_result

    - name: Show upgrade result
      ansible.builtin.debug:
        msg: "Upgrade completed: {{ upgrade_result.changed }}"
```

The `async: 1800` gives the task up to 30 minutes to complete, and `poll: 60` checks every minute. The SSH connection only needs to survive the polling interval, not the entire task duration.

## SSH Compression

Enabling SSH compression can help on slow links with decent bandwidth but high latency.

```ini
# ansible.cfg - enable compression for slow links
[ssh_connection]
ssh_args = -o Compression=yes -o ControlMaster=auto -o ControlPersist=1800s -o ConnectTimeout=60 -o ServerAliveInterval=30 -o ServerAliveCountMax=10
```

Compression adds CPU overhead on both ends but reduces the amount of data transferred. This is most beneficial when transferring large files or gathering extensive facts.

## Retry Configuration

Slow connections are also often unreliable connections. Build retries into your configuration and playbooks.

```ini
# ansible.cfg
[ssh_connection]
retries = 5
```

At the task level, use the `retries` directive.

```yaml
# Tasks with built-in retry logic
- name: Copy large configuration file
  ansible.builtin.copy:
    src: files/bigconfig.tar.gz
    dest: /tmp/bigconfig.tar.gz
  retries: 5
  delay: 30
  register: copy_result
  until: copy_result is not failed
```

## Complete Optimized Configuration

Here is a complete ansible.cfg tuned for slow SSH connections.

```ini
# ansible.cfg - fully optimized for slow/high-latency SSH connections
[defaults]
inventory = inventory/hosts.ini
timeout = 120
forks = 5
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 86400
stdout_callback = yaml
any_errors_fatal = false

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=1800s -o ConnectTimeout=60 -o ServerAliveInterval=30 -o ServerAliveCountMax=10 -o Compression=yes -o TCPKeepAlive=yes
control_path_dir = ~/.ansible/cp
control_path = %(directory)s/%%h-%%r-%%p
pipelining = true
retries = 5

[privilege_escalation]
become = true
become_method = sudo
become_user = root
become_ask_pass = false
```

This configuration assumes you have control over the sudoers file (for pipelining), want fact caching, and are OK with up to 5 parallel connections. Adjust the `forks` value based on your available bandwidth.

## Measuring the Improvement

After applying these optimizations, measure the difference.

```bash
# Before optimization
time ansible-playbook playbooks/deploy.yml

# After optimization
time ansible-playbook playbooks/deploy.yml

# Profile individual tasks with the callback plugin
ANSIBLE_CALLBACKS_ENABLED=timer,profile_tasks ansible-playbook playbooks/deploy.yml
```

The `profile_tasks` callback shows you exactly how long each task takes, which helps identify remaining bottlenecks. In my experience, connection multiplexing alone cuts playbook run time by 40-60% on connections with latency above 100ms.
