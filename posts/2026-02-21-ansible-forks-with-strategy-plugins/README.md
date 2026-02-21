# How to Use Ansible Forks with Strategy Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Forks, Strategy Plugins, Performance, Parallelism

Description: Optimize Ansible performance by tuning the forks setting alongside strategy plugins for the right balance of parallelism and resource usage.

---

The `forks` setting controls how many hosts Ansible works on simultaneously. It is the primary parallelism knob, but how it behaves depends heavily on which strategy plugin you use. Understanding the interaction between forks and strategies helps you optimize playbook performance without overwhelming your control node or target infrastructure.

## What Forks Controls

Forks determines the maximum number of worker processes Ansible spawns. Each worker handles one host at a time. With `forks: 5` (the default), Ansible processes up to 5 hosts in parallel.

```ini
# ansible.cfg - Set the forks value
[defaults]
forks = 5  # Default
```

Override on the command line:

```bash
# Run with 20 forks
ansible-playbook site.yml -f 20
```

## Forks with the Linear Strategy

With the linear strategy, forks determines how many hosts run each task simultaneously. If you have 100 hosts and `forks: 10`:

```
Task 1:
  Forks 1-10:  hosts 1-10 (parallel)
  Forks 1-10:  hosts 11-20 (parallel)
  ...
  Forks 1-10:  hosts 91-100 (parallel)
  [All 100 hosts complete Task 1]

Task 2:
  [Same pattern]
```

Each task runs on groups of 10 hosts at a time. All 100 hosts must finish the current task before the next task starts.

```yaml
# linear-forks.yml - Linear strategy with forks
---
- name: Configure servers (linear + forks)
  hosts: all  # 100 hosts
  strategy: linear
  # forks: 20 (set in ansible.cfg or -f 20)

  tasks:
    - name: Install packages
      apt:
        name: nginx
        state: present
      # Runs on 20 hosts at a time, all 100 must finish before next task
```

## Forks with the Free Strategy

With the free strategy, forks limits the total number of concurrent operations, but hosts can be on different tasks:

```
Forks 1-10 (free strategy, 100 hosts):
  Fork 1: host-01 / task 3
  Fork 2: host-02 / task 2
  Fork 3: host-15 / task 1  (just started)
  Fork 4: host-03 / task 4
  Fork 5: host-20 / task 1
  ...
```

Different hosts can be on different tasks simultaneously. As soon as a fork finishes with one host, it picks up the next available work.

```yaml
# free-forks.yml - Free strategy with forks
---
- name: Configure servers (free + forks)
  hosts: all
  strategy: free

  tasks:
    - name: Install packages
      apt:
        name: nginx

    - name: Deploy config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf

    - name: Start service
      service:
        name: nginx
        state: started
```

## Forks with host_pinned

With host_pinned, each fork is dedicated to one host until all tasks complete:

```
Forks 1-5 (host_pinned, 20 hosts):
  Fork 1: host-01 tasks 1,2,3,4,5 -> host-06 tasks 1,2,3,4,5 -> ...
  Fork 2: host-02 tasks 1,2,3,4,5 -> host-07 tasks 1,2,3,4,5 -> ...
  Fork 3: host-03 tasks 1,2,3,4,5 -> host-08 tasks 1,2,3,4,5 -> ...
  Fork 4: host-04 tasks 1,2,3,4,5 -> host-09 tasks 1,2,3,4,5 -> ...
  Fork 5: host-05 tasks 1,2,3,4,5 -> host-10 tasks 1,2,3,4,5 -> ...
```

Each fork processes all tasks for its assigned host before picking up a new host. The forks value determines how many hosts are processed simultaneously.

## Choosing the Right Forks Value

The optimal forks value depends on several factors:

**Control node resources.** Each fork is a process that uses memory and CPU. A typical fork uses 50-100 MB of RAM. With `forks: 50`, you need 2.5-5 GB of RAM on the control node just for Ansible workers.

```bash
# Check available memory on the control node
free -h

# Monitor fork processes during a run
watch -n 1 "ps aux | grep ansible | wc -l"
```

**Network bandwidth.** If tasks transfer files, more forks means more simultaneous transfers. With `forks: 50` copying a 100 MB file, you need 5 GB of bandwidth simultaneously.

**Target infrastructure.** External APIs, databases, and load balancers have concurrency limits. More forks means more concurrent hits.

General guidelines:

```ini
# ansible.cfg - Forks by scenario
[defaults]
# Small environment (< 20 hosts): default is fine
forks = 5

# Medium environment (20-100 hosts): increase for speed
forks = 20

# Large environment (100-500 hosts): balance speed and resources
forks = 50

# Very large environment (500+ hosts): be careful with resources
forks = 100
```

## Forks with serial

When `serial` is set, forks applies within each batch:

```yaml
- name: Rolling deploy
  hosts: all  # 100 hosts
  serial: 20  # 20 hosts per batch
  # forks: 10

  tasks:
    - name: Deploy
      include_role:
        name: deploy
```

In each batch of 20 hosts, tasks run on 10 hosts at a time (limited by forks). Setting forks higher than serial has no effect since the batch size limits the maximum hosts.

```ini
# Effective parallelism = min(forks, serial_batch_size)
# forks=50, serial=10 -> 10 hosts at a time
# forks=10, serial=50 -> 10 hosts at a time
# forks=50, serial=50 -> 50 hosts at a time
```

## Forks with throttle

The `throttle` keyword limits per-task concurrency independently of forks:

```yaml
- name: Mixed concurrency
  hosts: all  # 100 hosts
  # forks: 50

  tasks:
    # Runs on 50 hosts at a time (limited by forks)
    - name: Install packages
      apt:
        name: nginx

    # Runs on 3 hosts at a time (limited by throttle)
    - name: Register with API
      uri:
        url: "https://api.example.com/register"
        method: POST
      throttle: 3

    # Back to 50 hosts at a time
    - name: Start service
      service:
        name: nginx
        state: started
```

## Performance Tuning Forks

Measure the impact of different fork values:

```bash
#!/bin/bash
# benchmark-forks.sh - Test different forks values
for forks in 5 10 20 50; do
    echo "Testing forks=$forks"
    time ansible-playbook -f $forks site.yml 2>&1 | grep "Playbook run took"
done
```

Enable connection pipelining alongside forks for maximum performance:

```ini
# ansible.cfg - Optimized performance settings
[defaults]
forks = 50

[ssh_connection]
# Enable pipelining (reduces SSH round trips)
pipelining = True
# Use ControlMaster for SSH connection reuse
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
```

## Monitoring Fork Usage

Watch fork utilization during a run:

```bash
# Count active Ansible processes
watch -n 2 "ps aux | grep '[a]nsible' | wc -l"

# Monitor system resources during a run
top -b -n 1 | head -20

# Check network connections from the control node
ss -tn | grep ":22" | wc -l
```

## Dynamic Forks

Adjust forks based on the time of day or environment:

```bash
#!/bin/bash
# smart-deploy.sh - Adjust forks based on context
HOUR=$(date +%H)

if [ "$HOUR" -ge 22 ] || [ "$HOUR" -le 6 ]; then
    # Off-peak: use more forks
    FORKS=50
else
    # Peak hours: be conservative
    FORKS=10
fi

ansible-playbook -f $FORKS site.yml
```

The forks setting is a blunt instrument. It sets the global maximum parallelism, and strategy plugins determine how those forks are used. The right approach is: set forks based on your control node capacity, then use strategy, serial, and throttle to shape the execution pattern for each specific need.
