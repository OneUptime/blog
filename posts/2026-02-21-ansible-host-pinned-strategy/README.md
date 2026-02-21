# How to Use the Ansible host_pinned Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Strategy Plugins, Execution, Performance

Description: Use the Ansible host_pinned strategy for free-form task execution where each worker stays dedicated to one host until all its tasks complete.

---

The `host_pinned` strategy is a variation of the `free` strategy with one important difference: once a worker (fork) is assigned to a host, it stays with that host until all tasks for that host complete. In the regular free strategy, workers can switch between hosts. With host_pinned, each fork is "pinned" to a single host, running all tasks for that host sequentially before moving to the next host.

## How host_pinned Differs from free

In the `free` strategy, worker allocation is dynamic. A fork finishes task 1 on host A, might pick up task 3 on host C, then task 2 on host B. The free strategy optimizes for throughput by filling forks with whatever work is available.

In the `host_pinned` strategy, a fork finishes task 1 on host A, then runs task 2 on host A, then task 3 on host A. Only after all tasks for host A complete does that fork pick up a new host.

```
free strategy (forks=2):
  Fork 1: [host-A task1] [host-C task1] [host-A task2] [host-B task3]
  Fork 2: [host-B task1] [host-A task3] [host-B task2] [host-C task2]

host_pinned strategy (forks=2):
  Fork 1: [host-A task1] [host-A task2] [host-A task3] [host-C task1] [host-C task2] [host-C task3]
  Fork 2: [host-B task1] [host-B task2] [host-B task3] [host-D task1] [host-D task2] [host-D task3]
```

## Enabling host_pinned

Set it per play:

```yaml
# host-pinned.yml - Use host_pinned strategy
---
- name: Configure servers with host pinning
  hosts: all
  strategy: host_pinned

  tasks:
    - name: Gather system info
      setup:
        gather_subset:
          - hardware
          - network

    - name: Install packages
      apt:
        name:
          - nginx
          - certbot
        state: present

    - name: Deploy configuration
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Restart nginx

  handlers:
    - name: Restart nginx
      service:
        name: nginx
        state: restarted
```

Or globally:

```ini
# ansible.cfg
[defaults]
strategy = host_pinned
```

## When host_pinned is the Right Choice

The host_pinned strategy excels in scenarios where host-level consistency matters more than task-level synchronization.

**Deployment workflows where each host needs to complete its full sequence:**

```yaml
# deploy-host-pinned.yml
---
- name: Deploy application
  hosts: webservers
  strategy: host_pinned

  tasks:
    # Each host completes this full sequence before the fork moves on
    - name: Drain connections from load balancer
      uri:
        url: "http://lb.example.com/api/drain/{{ inventory_hostname }}"
        method: POST

    - name: Stop old application
      service:
        name: myapp
        state: stopped

    - name: Deploy new version
      unarchive:
        src: "app-v{{ version }}.tar.gz"
        dest: /opt/app/
        remote_src: false

    - name: Start new application
      service:
        name: myapp
        state: started

    - name: Wait for health check
      uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      retries: 10
      delay: 5
      register: result
      until: result.status == 200

    - name: Re-enable in load balancer
      uri:
        url: "http://lb.example.com/api/enable/{{ inventory_hostname }}"
        method: POST
```

With host_pinned, each host goes through the complete drain-stop-deploy-start-verify-enable cycle before the fork moves to the next host. This prevents a situation where host A is drained and stopped while the fork jumps to start working on host B's drain.

**Database operations where each host needs its full migration sequence:**

```yaml
- name: Database migration
  hosts: db_replicas
  strategy: host_pinned

  tasks:
    - name: Take replica out of rotation
      command: pg_ctl stop -D /var/lib/postgresql/data -m fast

    - name: Run schema migration
      command: /opt/db-tools/migrate.sh --version {{ target_version }}

    - name: Start database
      command: pg_ctl start -D /var/lib/postgresql/data

    - name: Wait for replication to catch up
      command: /opt/db-tools/check-replication-lag.sh
      retries: 30
      delay: 10
      register: lag
      until: lag.rc == 0
```

## host_pinned vs linear vs free

Here is how the three strategies compare:

```yaml
# Comparison with 3 tasks on 4 hosts (forks=2)
```

**linear** (synchronized):
```
Round 1 - Task 1: host-A and host-B (parallel), then host-C and host-D
Round 2 - Task 2: host-A and host-B (parallel), then host-C and host-D
Round 3 - Task 3: host-A and host-B (parallel), then host-C and host-D
```

**free** (unsynchronized, worker-optimized):
```
Fork 1: host-A/task1, host-A/task2, host-C/task1, host-A/task3, host-C/task2 ...
Fork 2: host-B/task1, host-B/task2, host-B/task3, host-D/task1 ...
(Workers grab whatever work is available)
```

**host_pinned** (unsynchronized, host-optimized):
```
Fork 1: host-A/task1, host-A/task2, host-A/task3, host-C/task1, host-C/task2, host-C/task3
Fork 2: host-B/task1, host-B/task2, host-B/task3, host-D/task1, host-D/task2, host-D/task3
(Each fork completes all tasks for a host before moving on)
```

## Forks and host_pinned

The forks setting determines how many hosts are processed in parallel:

```ini
# ansible.cfg
[defaults]
strategy = host_pinned
forks = 5  # 5 hosts at a time, each completing all tasks
```

With forks=5 and 20 hosts:
- Hosts 1-5 start simultaneously, each working through all tasks
- As each host completes, the fork picks up the next host (host 6, 7, etc.)
- At any point, at most 5 hosts are being worked on

## Handler Behavior

With host_pinned, handlers fire per host after that host's tasks complete:

```yaml
- name: Example with handlers
  hosts: all
  strategy: host_pinned

  tasks:
    - name: Update config
      template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      notify: Restart app

    - name: Update second config
      template:
        src: logging.conf.j2
        dest: /etc/app/logging.conf
      notify: Restart app

  # Handler runs when THIS HOST finishes all tasks
  # Not synchronized across hosts
  handlers:
    - name: Restart app
      service:
        name: myapp
        state: restarted
```

## Practical Considerations

The host_pinned strategy is great for deployment workflows but has some things to watch:

- Output is interleaved (different hosts on different tasks simultaneously)
- Cross-host coordination (like `run_once` or `delegate_to`) needs care
- The total runtime depends on the slowest host, not the slowest task
- Forks determine maximum parallel host processing

Use the `dense` callback for readable output:

```ini
[defaults]
strategy = host_pinned
stdout_callback = dense
```

The host_pinned strategy gives you the speed benefits of free execution with the consistency guarantee that each host completes its full task sequence before the worker moves on. It is the best strategy for deployment workflows where each host needs to go through a complete lifecycle.
