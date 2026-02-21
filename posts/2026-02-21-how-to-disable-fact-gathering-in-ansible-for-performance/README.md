# How to Disable Fact Gathering in Ansible for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Performance, Optimization, Automation

Description: Learn how to disable or optimize Ansible fact gathering to significantly speed up playbook execution in large-scale environments.

---

Fact gathering is one of the first things Ansible does when a play starts. It connects to every host, runs the setup module, and collects hundreds of data points about the system. On a handful of servers, this takes a few seconds. On 500 servers, it can add minutes to every playbook run. If your playbook does not actually need those facts, that is wasted time.

## The Cost of Fact Gathering

To understand why disabling fact gathering matters, consider what happens during a typical run. For each host in the play, Ansible opens an SSH connection, uploads the setup module, executes it, parses the JSON output, and stores the results. On a reasonably fast network with modern hardware, this takes 2 to 5 seconds per host.

For a playbook targeting 200 hosts with the default `forks: 5`, that is 200 hosts processed in batches of 5, with each batch taking about 3 seconds for fact gathering alone. That is roughly 2 minutes of pure fact gathering before a single task runs. If your playbook just copies a config file and restarts a service, those 2 minutes are entirely overhead.

## Disabling Fact Gathering Completely

The simplest optimization is setting `gather_facts: no` at the play level.

```yaml
# no-facts-playbook.yml
# Skips fact gathering entirely for faster execution
---
- name: Quick config deployment
  hosts: webservers
  gather_facts: no
  become: yes
  tasks:
    - name: Deploy updated nginx config
      ansible.builtin.copy:
        src: files/nginx.conf
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: '0644'

    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

This play skips the setup module entirely. The SSH connection for the first task is the only connection overhead.

## When Can You Safely Disable Facts?

You can disable fact gathering when your play meets these criteria:

- No tasks use `ansible_facts` or `ansible_*` fact variables
- No templates reference system facts
- No conditionals depend on OS family, distribution, or hardware
- No Jinja2 expressions reference things like `ansible_default_ipv4`

Here are common tasks that do NOT need facts.

```yaml
# tasks-without-facts.yml
# These common tasks work fine without fact gathering
---
- name: Tasks that do not need system facts
  hosts: all
  gather_facts: no
  become: yes
  tasks:
    # Copying files does not need facts
    - name: Copy application config
      ansible.builtin.copy:
        src: app.conf
        dest: /etc/myapp/app.conf

    # Managing services does not need facts
    - name: Restart application
      ansible.builtin.service:
        name: myapp
        state: restarted

    # Running commands does not need facts
    - name: Clear application cache
      ansible.builtin.command: /opt/myapp/bin/clear-cache

    # Managing files and directories does not need facts
    - name: Create log directory
      ansible.builtin.file:
        path: /var/log/myapp
        state: directory
        mode: '0755'

    # Managing cron jobs does not need facts
    - name: Add log rotation cron
      ansible.builtin.cron:
        name: "rotate myapp logs"
        hour: "2"
        minute: "0"
        job: "/usr/sbin/logrotate /etc/logrotate.d/myapp"
```

## Gathering Facts Only When Needed

Sometimes only one play in a multi-play playbook needs facts. Disable gathering for the plays that do not need it.

```yaml
# selective-facts.yml
# Only gathers facts for the play that actually uses them
---
- name: Deploy application (no facts needed)
  hosts: appservers
  gather_facts: no
  become: yes
  tasks:
    - name: Deploy application binary
      ansible.builtin.copy:
        src: "builds/myapp-latest"
        dest: /opt/myapp/bin/myapp
        mode: '0755'

    - name: Restart application
      ansible.builtin.service:
        name: myapp
        state: restarted

- name: Update monitoring (facts needed for IP addresses)
  hosts: monitoring
  gather_facts: yes
  tasks:
    - name: Update Prometheus targets
      ansible.builtin.template:
        src: prometheus-targets.yml.j2
        dest: /etc/prometheus/targets.yml
```

## Using gather_subset to Collect Fewer Facts

If you need some facts but not all, use `gather_subset` to limit what gets collected. This is faster than gathering everything.

```yaml
# subset-facts.yml
# Gathers only network facts, skipping hardware detection
---
- name: Configure networking (only need network facts)
  hosts: all
  gather_facts: yes
  gather_subset:
    - network
  tasks:
    - name: Show IP address
      ansible.builtin.debug:
        msg: "IP: {{ ansible_facts['default_ipv4']['address'] }}"
```

Available subsets include:

```yaml
# Available fact subsets and what they collect
# You can combine multiple subsets or exclude with '!'
gather_subset:
  - all          # Everything (default)
  - min          # Minimal facts (always collected unless 'all' is excluded)
  - hardware     # CPU, memory, devices
  - network      # Network interfaces, IPs, routes
  - virtual      # Virtualization type
  - ohai         # Ohai facts (if installed)
  - facter       # Facter facts (if installed)
```

You can also exclude specific subsets.

```yaml
# exclude-hardware.yml
# Skips the slow hardware detection subset
---
- name: Quick play without hardware facts
  hosts: all
  gather_subset:
    - "!hardware"
  tasks:
    - name: Show OS info (still available)
      ansible.builtin.debug:
        msg: "{{ ansible_facts['distribution'] }} {{ ansible_facts['distribution_version'] }}"
```

Hardware fact gathering is typically the slowest subset because it probes disks, CPU, and memory. Excluding it can cut fact gathering time by 30-50%.

## Disabling Facts Globally in ansible.cfg

If most of your playbooks do not need facts, you can disable gathering globally and enable it only where needed.

```ini
# ansible.cfg
# Disables fact gathering by default across all playbooks
[defaults]
gathering = explicit
```

The `gathering` setting has three values:

- `implicit` (default) - always gather facts unless `gather_facts: no` is set
- `explicit` - never gather facts unless `gather_facts: yes` is set
- `smart` - only gather facts if they are not already cached

With `gathering = explicit`, your playbooks must opt in to fact gathering.

```yaml
# explicit-gathering.yml
# With gathering=explicit in ansible.cfg, this play needs
# gather_facts: yes to get any facts at all
---
- name: Play that needs facts
  hosts: webservers
  gather_facts: yes
  tasks:
    - name: Install packages based on OS
      ansible.builtin.package:
        name: nginx
        state: present
      when: ansible_facts['os_family'] in ['Debian', 'RedHat']
```

## On-Demand Fact Gathering with setup Module

Even with `gather_facts: no`, you can gather facts mid-play when needed. Call the setup module as a task.

```yaml
# on-demand-facts.yml
# Gathers facts only when a conditional branch needs them
---
- name: Conditional fact gathering
  hosts: all
  gather_facts: no
  become: yes
  tasks:
    - name: Deploy config file (no facts needed)
      ansible.builtin.copy:
        src: myapp.conf
        dest: /etc/myapp/myapp.conf

    - name: Gather facts only for OS-specific tasks
      ansible.builtin.setup:
        gather_subset:
          - min
      when: install_packages | default(false) | bool

    - name: Install OS-specific packages
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop:
        - python3-pip
        - python3-venv
      when:
        - install_packages | default(false) | bool
        - ansible_facts['os_family'] == "Debian"
```

## Benchmarking the Difference

Here is a quick way to measure the impact of disabling fact gathering.

```bash
# Time a playbook with fact gathering
time ansible-playbook deploy.yml

# Time the same playbook with fact gathering disabled
time ansible-playbook deploy.yml -e "gather_facts_override=no"
```

Or build a benchmark playbook.

```yaml
# benchmark-facts.yml
# Run this to see how long fact gathering takes in your environment
---
- name: Benchmark with facts
  hosts: all
  gather_facts: yes
  tasks:
    - name: Ping with facts
      ansible.builtin.ping:

- name: Benchmark without facts
  hosts: all
  gather_facts: no
  tasks:
    - name: Ping without facts
      ansible.builtin.ping:
```

Run it with timing enabled.

```bash
# Shows per-task timing to compare the two plays
ANSIBLE_CALLBACKS_ENABLED=timer,profile_tasks ansible-playbook benchmark-facts.yml
```

## Summary

Disabling fact gathering is one of the easiest Ansible performance wins. Set `gather_facts: no` on plays that do not reference system facts, use `gather_subset` to collect only what you need, and consider `gathering = explicit` in `ansible.cfg` for large environments. For a 200-host inventory, these changes can shave minutes off every playbook run. The setup module is always available as a task for on-demand gathering when you need facts only in specific situations.
