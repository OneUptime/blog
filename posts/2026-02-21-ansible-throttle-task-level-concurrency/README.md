# How to Use Ansible throttle for Task-Level Concurrency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Throttle, Concurrency, Performance, Rate Limiting

Description: Use the Ansible throttle keyword to limit concurrent execution of specific tasks across hosts, protecting APIs and shared resources from overload.

---

The `throttle` keyword in Ansible limits how many hosts can run a specific task concurrently. While `forks` controls the global parallelism and `serial` controls per-play batching, `throttle` gives you per-task control. This is essential when a particular task interacts with a shared resource that cannot handle the full concurrency of your playbook.

## Why Throttle Exists

Consider a playbook that runs on 50 hosts with `forks: 50`. Most tasks are fine running on all 50 hosts simultaneously. But one task calls an external API that has a rate limit of 10 requests per second. Without throttle, all 50 hosts hit the API at once, causing rate limit errors.

The `throttle` keyword lets you limit just that one task to 5 concurrent executions while everything else runs at full speed.

## Basic Throttle Usage

```yaml
# throttle-example.yml - Limit concurrency on specific tasks
---
- name: Configure servers
  hosts: all
  # forks is 50 (set in ansible.cfg)

  tasks:
    # This task runs on all hosts in parallel (up to forks limit)
    - name: Install packages
      apt:
        name:
          - nginx
          - python3
        state: present

    # This task is throttled to 3 concurrent executions
    - name: Register with load balancer API
      uri:
        url: "https://lb-api.example.com/register"
        method: POST
        body_format: json
        body:
          host: "{{ inventory_hostname }}"
          port: 8080
      throttle: 3

    # Back to full parallelism
    - name: Start service
      service:
        name: nginx
        state: started
```

## How Throttle Works

Throttle creates a semaphore that limits concurrent task execution. If `throttle: 3` and you have 20 hosts:

```
Time -->
Host 01: [Register API] ----
Host 02: [Register API] ----
Host 03: [Register API] ----
Host 04:                      [Register API] ----
Host 05:                      [Register API] ----
Host 06:                      [Register API] ----
Host 07:                                          [Register API] ----
...
```

At most 3 hosts execute the throttled task at any time. The other hosts wait for a slot to open.

Important: throttle only limits this specific task. Other tasks before and after it run at the normal forks parallelism.

## Throttle vs Forks vs Serial

These three settings control concurrency at different levels:

```yaml
# Understanding the three levels of concurrency control
---
- name: Example
  hosts: all          # 50 hosts
  serial: 10          # Process 10 hosts per batch (play level)
  # forks: 10 (ansible.cfg, within each batch)

  tasks:
    - name: Normal task
      command: echo "runs on up to 10 hosts at once"
      # Limited by forks (10) and serial (10 per batch)

    - name: Throttled task
      command: echo "runs on up to 3 hosts at once"
      throttle: 3
      # Limited by throttle (3), regardless of forks

    - name: Another normal task
      command: echo "back to 10 hosts at once"
```

The hierarchy: `serial` creates batches, `forks` limits parallelism within batches, `throttle` limits parallelism for individual tasks.

## Common Use Cases

### Rate-Limited APIs

Many external APIs (cloud providers, DNS services, load balancers) have rate limits:

```yaml
- name: Create DNS records via API
  uri:
    url: "https://api.cloudflare.com/client/v4/zones/{{ zone_id }}/dns_records"
    method: POST
    headers:
      Authorization: "Bearer {{ cf_token }}"
    body_format: json
    body:
      type: A
      name: "{{ inventory_hostname }}"
      content: "{{ ansible_default_ipv4.address }}"
  throttle: 5  # Cloudflare API rate limit consideration
```

### Database Operations

Limit concurrent database connections or operations:

```yaml
- name: Run database migration
  command: /opt/app/migrate.sh
  throttle: 1  # Only one migration at a time
```

### Download Tasks

Prevent saturating your network or download server:

```yaml
- name: Download large artifact
  get_url:
    url: "https://artifacts.example.com/app-v{{ version }}.tar.gz"
    dest: /tmp/app.tar.gz
  throttle: 5  # Limit concurrent downloads
```

### Shared Resource Access

When tasks access a shared resource like an NFS mount:

```yaml
- name: Write to shared storage
  copy:
    src: config.yml
    dest: /mnt/shared/configs/{{ inventory_hostname }}/config.yml
  throttle: 3  # Limit concurrent writes to NFS
```

## Throttle with Loops

Throttle applies to the entire task, including all loop iterations:

```yaml
- name: Process items with throttle
  command: "process-item {{ item }}"
  loop:
    - item1
    - item2
    - item3
  throttle: 2
  # Each host runs the loop sequentially
  # But only 2 hosts run the loop concurrently
```

## Throttle in Roles

You can set throttle on tasks within roles:

```yaml
# roles/deploy/tasks/main.yml
- name: Pull Docker image
  docker_image:
    name: "myapp:{{ version }}"
    source: pull
  throttle: 5  # Limit concurrent pulls from registry
```

## Throttle with Block

Apply throttle to a group of tasks using a block:

```yaml
- name: API operations
  throttle: 3
  block:
    - name: Create load balancer pool
      uri:
        url: "{{ lb_api }}/pools"
        method: POST
        body_format: json
        body:
          name: "{{ inventory_hostname }}"

    - name: Add health check
      uri:
        url: "{{ lb_api }}/healthchecks"
        method: POST
        body_format: json
        body:
          pool: "{{ inventory_hostname }}"
          interval: 30
```

Both tasks in the block are limited to 3 concurrent executions.

## Monitoring Throttled Tasks

When using the `profile_tasks` callback, throttled tasks show their actual elapsed time including wait time:

```ini
# ansible.cfg
[defaults]
callback_whitelist = profile_tasks
```

A throttled task with 50 hosts and `throttle: 5` will show a longer total time because hosts queue up waiting for their turn:

```
Register with load balancer API ----------------------------------- 45.23s
Install packages --------------------------------------------------- 12.45s
Start service ------------------------------------------------------- 3.21s
```

The 45 seconds reflects 50 hosts processed 5 at a time, not the actual per-host API call time.

## Practical Tips

Set throttle to the lowest value that still gives acceptable performance. If an API can handle 10 concurrent requests, start with `throttle: 5` to leave headroom.

Always add throttle when calling external APIs. Even if you do not have rate limit issues today, as your inventory grows, you will.

Use `throttle: 1` for operations that must be serialized (database migrations, leader election, lock acquisition).

Remember that throttle does not carry over to other tasks. If you need multiple sequential tasks to all be throttled, put them in a block with throttle.

The throttle keyword is a precision tool for managing concurrency at the task level. It lets you run most of your playbook at full speed while protecting sensitive operations from overload. Use it whenever a task touches a shared resource with limited capacity.
