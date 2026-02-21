# How to Use Ansible serial for Rolling Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Rolling Updates, Serial, Deployment, DevOps

Description: Use Ansible serial keyword to perform rolling updates by processing hosts in batches, maintaining service availability during deployments.

---

The `serial` keyword in Ansible controls how many hosts are processed at a time during a play. Instead of running tasks on all hosts simultaneously, serial breaks the inventory into batches. The play runs completely on one batch before starting the next. This is the core mechanism for rolling updates where you need to maintain service availability while deploying changes across a fleet of servers.

## Basic serial Usage

```yaml
# rolling-update.yml - Deploy to 3 hosts at a time
---
- name: Rolling update of web servers
  hosts: webservers
  serial: 3

  tasks:
    - name: Pull latest application
      docker_image:
        name: myapp:latest
        source: pull

    - name: Restart application container
      docker_container:
        name: myapp
        image: myapp:latest
        state: started
        restart: true

    - name: Wait for health check
      uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 10
      delay: 5
      register: health
      until: health.status == 200
```

With 12 hosts and `serial: 3`, the play runs in 4 batches:

```
Batch 1: web-01, web-02, web-03 (all tasks, then handlers)
Batch 2: web-04, web-05, web-06 (all tasks, then handlers)
Batch 3: web-07, web-08, web-09 (all tasks, then handlers)
Batch 4: web-10, web-11, web-12 (all tasks, then handlers)
```

Each batch runs the complete play including handlers. If any host in a batch fails, the play stops and does not proceed to the next batch (by default).

## Why Serial Matters for Availability

Without serial, all 12 hosts would be updated simultaneously. If the update involves restarting a service, you would have zero capacity for the duration of the restart. With `serial: 3`, at most 3 hosts are being updated at any time. The other 9 continue serving traffic.

The math is simple: with 12 hosts and `serial: 3`, you maintain at least 75% capacity during the update (9 out of 12 hosts serving traffic at any time).

## Serial with Percentages

Instead of a fixed number, use a percentage of the inventory:

```yaml
# rolling-update-percent.yml - Update 25% of hosts at a time
---
- name: Rolling update
  hosts: webservers
  serial: "25%"

  tasks:
    - name: Deploy new version
      include_role:
        name: deploy
```

With 20 hosts and `serial: "25%"`, each batch has 5 hosts.

## Progressive Serial (Canary Pattern)

The most powerful serial feature is progressive batching. Start with a small batch (canary), verify it works, then increase the batch size:

```yaml
# canary-deploy.yml - Progressive rollout
---
- name: Canary deployment
  hosts: webservers
  serial:
    - 1       # First: deploy to 1 host (canary)
    - 5       # Second: deploy to 5 more hosts
    - "25%"   # Third: deploy to 25% of remaining
    - "100%"  # Fourth: deploy to all remaining hosts

  tasks:
    - name: Deploy application
      copy:
        src: "app-v{{ version }}.tar.gz"
        dest: /opt/app/

    - name: Extract and restart
      unarchive:
        src: /opt/app/app-v{{ version }}.tar.gz
        dest: /opt/app/current/
        remote_src: true
      notify: Restart application

    - name: Run smoke tests
      uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      retries: 5
      delay: 3
      register: smoke
      until: smoke.status == 200

  handlers:
    - name: Restart application
      service:
        name: myapp
        state: restarted
```

With 20 hosts, the batches are:

```
Batch 1: 1 host (canary)
Batch 2: 5 hosts
Batch 3: 25% of remaining 14 = 4 hosts (rounded)
Batch 4: all remaining 10 hosts
```

If the canary fails, only 1 host is affected. If batch 2 fails, only 6 hosts total are affected.

## Serial with max_fail_percentage

Combine serial with `max_fail_percentage` to automatically stop the rollout if too many hosts fail:

```yaml
# safe-rollout.yml - Stop if more than 20% of a batch fails
---
- name: Safe rolling update
  hosts: webservers
  serial: 5
  max_fail_percentage: 20

  tasks:
    - name: Deploy and verify
      include_role:
        name: deploy-and-verify
```

With `serial: 5` and `max_fail_percentage: 20`, if more than 1 host in a batch of 5 fails (20% of 5 = 1), the entire play stops. This prevents a bad deploy from rolling out to the entire fleet.

## Serial with Pre and Post Tasks

Use `pre_tasks` and `post_tasks` for load balancer management:

```yaml
# rolling-with-lb.yml - Rolling update with load balancer coordination
---
- name: Rolling update with load balancer
  hosts: webservers
  serial: 3

  pre_tasks:
    # Remove hosts from load balancer before updating
    - name: Disable in HAProxy
      community.general.haproxy:
        state: disabled
        backend: webservers
        host: "{{ inventory_hostname }}"
      delegate_to: lb-01

    # Wait for connections to drain
    - name: Wait for connections to drain
      pause:
        seconds: 30

  tasks:
    - name: Stop application
      service:
        name: myapp
        state: stopped

    - name: Deploy new version
      unarchive:
        src: "app-{{ version }}.tar.gz"
        dest: /opt/app/
        remote_src: false

    - name: Start application
      service:
        name: myapp
        state: started

    - name: Wait for application to be ready
      uri:
        url: "http://localhost:8080/ready"
        status_code: 200
      retries: 12
      delay: 5
      register: ready
      until: ready.status == 200

  post_tasks:
    # Re-enable hosts in load balancer after successful update
    - name: Enable in HAProxy
      community.general.haproxy:
        state: enabled
        backend: webservers
        host: "{{ inventory_hostname }}"
      delegate_to: lb-01
```

The sequence for each batch is:

1. `pre_tasks`: Remove from load balancer, drain connections
2. `tasks`: Stop, deploy, start, verify
3. `handlers`: Run any triggered handlers
4. `post_tasks`: Re-enable in load balancer

Then the next batch starts.

## Serial with any_errors_fatal

For critical deployments where any failure should stop everything:

```yaml
- name: Critical infrastructure update
  hosts: database_servers
  serial: 1  # One at a time
  any_errors_fatal: true  # Stop on ANY failure

  tasks:
    - name: Update database server
      include_role:
        name: db-update
```

## Monitoring Rolling Updates

Track which batch you are on with custom stats:

```yaml
- name: Rolling update with tracking
  hosts: webservers
  serial: 5

  tasks:
    - name: Track batch number
      set_stats:
        data:
          current_batch: "{{ ansible_play_batch }}"
          hosts_in_batch: "{{ ansible_play_hosts | length }}"
        per_host: false
      run_once: true

    - name: Deploy
      include_role:
        name: deploy
```

The `ansible_play_batch` variable tells you which batch is currently running. Combined with `show_custom_stats = True`, the recap shows batch progress.

Serial is the workhorse of safe deployments in Ansible. Combined with health checks, load balancer coordination, and progressive batch sizing, it gives you a robust rolling update mechanism that maintains availability and limits blast radius.
