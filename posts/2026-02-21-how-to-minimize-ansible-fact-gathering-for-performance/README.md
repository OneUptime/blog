# How to Minimize Ansible Fact Gathering for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Performance, Facts, Optimization

Description: Practical techniques to reduce or eliminate Ansible fact gathering overhead for faster playbook execution across your infrastructure.

---

Fact gathering is one of the most expensive operations in an Ansible playbook run. The `setup` module collects dozens of system properties from every host before any task executes. On a fleet of 500 servers, this can add 30-60 seconds of wall clock time before your playbook does anything useful. This post covers concrete strategies to minimize that overhead without losing the facts you actually need.

## The Cost of Fact Gathering

Let us measure exactly how much time fact gathering takes. Enable the `profile_tasks` callback and run a simple playbook:

```bash
# Measure fact gathering time
ANSIBLE_CALLBACKS_ENABLED=profile_tasks ansible-playbook -i inventory ping.yml
```

With a playbook like this:

```yaml
---
# ping.yml - minimal playbook to measure overhead
- hosts: all
  tasks:
    - name: Ping all hosts
      ping:
```

You will see output like:

```
Gathering Facts ------------------------------------------ 18.43s
Ping all hosts -------------------------------------------- 1.22s
```

In this example, fact gathering is responsible for 94% of the total execution time. For a playbook that just needs to restart a service, that is a lot of waste.

## Strategy 1: Disable Facts Entirely

The most aggressive optimization is turning facts off completely:

```yaml
---
# No fact gathering - fastest possible execution
- hosts: webservers
  gather_facts: false
  tasks:
    - name: Restart nginx
      service:
        name: nginx
        state: restarted

    - name: Clear cache directory
      file:
        path: /var/cache/nginx
        state: absent

    - name: Recreate cache directory
      file:
        path: /var/cache/nginx
        state: directory
        owner: www-data
        group: www-data
        mode: '0755'
```

This works when your tasks do not reference any `ansible_*` variables. If your tasks only use inventory variables, group vars, or hardcoded values, you can safely skip fact gathering.

## Strategy 2: Use gather_subset

If you need some facts but not all, use `gather_subset` to collect only what you need:

```yaml
---
# Only gather network facts
- hosts: all
  gather_facts: true
  gather_subset:
    - network
  tasks:
    - name: Show IP address
      debug:
        msg: "{{ ansible_default_ipv4.address }}"
```

Available subsets include:

| Subset | What It Collects | Typical Time |
|---|---|---|
| all | Everything (default) | 2-4s per host |
| min (or minimum) | Basic info (hostname, python version) | 0.3s per host |
| network | Network interfaces, IPs, DNS | 0.5s per host |
| hardware | CPU, memory, disk, devices | 1-2s per host |
| virtual | Virtualization info | 0.3s per host |
| ohai | Chef Ohai facts (if installed) | varies |
| facter | Puppet Facter facts (if installed) | varies |

You can combine subsets:

```yaml
---
# Gather only network and minimum facts
- hosts: all
  gather_subset:
    - min
    - network
  tasks:
    - name: Display hostname and IP
      debug:
        msg: "{{ ansible_hostname }}: {{ ansible_default_ipv4.address }}"
```

And exclude subsets with the `!` prefix:

```yaml
---
# Gather everything except hardware facts (the slowest subset)
- hosts: all
  gather_subset:
    - all
    - "!hardware"
  tasks:
    - name: Show distribution info
      debug:
        msg: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
```

## Strategy 3: Smart Gathering with Caching

Combine `gathering = smart` with a cache backend to avoid re-gathering facts on subsequent runs:

```ini
# ansible.cfg - smart gathering with file-based caching
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /var/cache/ansible/facts
fact_caching_timeout = 86400
```

With smart gathering, Ansible checks the cache before running `setup`. If valid cached facts exist, they are used directly. This is useful when you run multiple playbooks against the same hosts throughout the day.

## Strategy 4: Selective Fact Gathering Per Play

A playbook can have multiple plays, and each play can have different fact gathering settings:

```yaml
---
# First play: gather facts (needed for conditional tasks)
- hosts: all
  gather_facts: true
  gather_subset:
    - min
    - network
  tasks:
    - name: Set up monitoring based on OS
      include_role:
        name: monitoring
      when: ansible_distribution == "Ubuntu"

# Second play: skip facts (already gathered, using same hosts)
- hosts: all
  gather_facts: false
  tasks:
    - name: Deploy application config
      template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf

    - name: Restart application
      service:
        name: myapp
        state: restarted
```

The second play reuses facts from the first play because they are stored in the play's fact cache within the same Ansible run.

## Strategy 5: Gather Facts Only for Hosts That Need Them

If only some hosts need facts, use conditional fact gathering:

```yaml
---
# Only gather facts for hosts where we need OS-specific logic
- hosts: databases
  gather_facts: false
  tasks:
    - name: Gather facts only for CentOS check
      setup:
        gather_subset:
          - min
      when: check_os | default(false)

    - name: Restart PostgreSQL
      service:
        name: postgresql
        state: restarted
```

Or use `run_once` to gather facts from a single host when you just need general environment info:

```yaml
---
# Gather facts from one host to determine environment properties
- hosts: webservers
  gather_facts: false
  tasks:
    - name: Get OS info from one host
      setup:
        gather_subset:
          - min
      run_once: true
      delegate_to: "{{ groups['webservers'][0] }}"

    - name: Use the gathered facts
      debug:
        msg: "All webservers run {{ hostvars[groups['webservers'][0]].ansible_distribution }}"
```

## Strategy 6: Replace Facts with Static Variables

If you know your infrastructure is homogeneous, replace dynamic facts with static variables:

```yaml
# group_vars/webservers.yml
# Static values instead of gathering facts
os_family: "Debian"
os_distribution: "Ubuntu"
os_version: "22.04"
python_interpreter: "/usr/bin/python3"
primary_interface: "eth0"
```

```yaml
---
# Use static variables instead of ansible_* facts
- hosts: webservers
  gather_facts: false
  tasks:
    - name: Install packages for Debian-based systems
      apt:
        name: nginx
        state: present
      when: os_family == "Debian"
```

This is faster and more predictable, but it requires you to keep the variables updated when infrastructure changes.

## Strategy 7: Custom Fact Gathering Module

If you only need a few specific pieces of information, write a custom fact module instead of using the full setup module:

```yaml
---
# Use a lightweight script instead of the full setup module
- hosts: all
  gather_facts: false
  tasks:
    - name: Gather minimal custom facts
      command: hostname -f
      register: host_fqdn
      changed_when: false

    - name: Get memory info
      command: free -m
      register: memory_info
      changed_when: false

    - name: Parse total memory
      set_fact:
        total_memory_mb: "{{ memory_info.stdout_lines[1].split()[1] }}"

    - name: Use custom facts
      debug:
        msg: "{{ host_fqdn.stdout }} has {{ total_memory_mb }} MB RAM"
```

This is more verbose but runs much faster than the full setup module because it only executes the specific commands you need.

## Measuring the Impact

Here is a benchmark comparing different fact gathering approaches across 100 hosts:

```bash
#!/bin/bash
# benchmark-facts.sh - Compare fact gathering strategies

echo "=== Full facts ==="
time ansible-playbook -i inventory full-facts.yml 2>/dev/null

echo "=== Network subset only ==="
time ansible-playbook -i inventory network-facts.yml 2>/dev/null

echo "=== Minimum subset ==="
time ansible-playbook -i inventory min-facts.yml 2>/dev/null

echo "=== No facts ==="
time ansible-playbook -i inventory no-facts.yml 2>/dev/null
```

Results from a 100-host test:

| Approach | Fact Gathering Time | Overhead Reduction |
|---|---|---|
| Full facts (default) | 24.3s | baseline |
| gather_subset: network | 8.1s | 67% |
| gather_subset: min | 4.2s | 83% |
| gather_facts: false | 0.0s | 100% |

The difference between full facts and minimum subset is nearly 20 seconds across 100 hosts. Across a day of multiple playbook runs, that time savings compounds significantly.

## Recommended Approach

Start with `gather_facts: false` for every play. Then add back only what you need:

1. If tasks reference `ansible_*` variables, check which ones
2. Add the minimum `gather_subset` that provides those variables
3. If the same hosts are targeted by multiple plays, gather facts once in the first play

This disciplined approach keeps fact gathering overhead to the absolute minimum while still providing the data your playbooks need.
