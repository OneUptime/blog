# How to Use the Ansible linear Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Strategy Plugins, Execution, Playbook

Description: Understand the Ansible linear strategy, the default execution model that runs each task on all hosts before proceeding to the next task.

---

The `linear` strategy is Ansible's default execution model. It runs each task across all hosts in the play before moving to the next task. Every host finishes task 1 before any host starts task 2. This lock-step behavior is what most people expect from Ansible, and it is the right choice for the majority of use cases.

## How Linear Execution Works

Consider a playbook with 3 tasks running against 4 hosts:

```yaml
# site.yml - Simple playbook demonstrating linear execution
---
- name: Configure web servers
  hosts: web-01, web-02, web-03, web-04
  strategy: linear  # This is the default, so you can omit it

  tasks:
    - name: Task 1 - Install packages
      apt:
        name: nginx
        state: present

    - name: Task 2 - Deploy config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf

    - name: Task 3 - Start service
      service:
        name: nginx
        state: started
```

The execution order is:

```
Task 1: Install packages
  -> web-01 (fork 1)
  -> web-02 (fork 2)
  -> web-03 (fork 3)
  -> web-04 (fork 4)
  [All hosts finish Task 1]

Task 2: Deploy config
  -> web-01 (fork 1)
  -> web-02 (fork 2)
  -> web-03 (fork 3)
  -> web-04 (fork 4)
  [All hosts finish Task 2]

Task 3: Start service
  -> web-01 (fork 1)
  -> web-02 (fork 2)
  -> web-03 (fork 3)
  -> web-04 (fork 4)
  [All hosts finish Task 3]
```

Within each task, hosts run in parallel up to the `forks` limit (default 5). But the strategy waits for all hosts to complete the current task before starting the next one.

## The Forks Setting

The `forks` setting controls how many hosts run a task simultaneously within the linear strategy:

```ini
# ansible.cfg
[defaults]
forks = 10  # Run on 10 hosts at a time
```

```bash
# Override forks on the command line
ansible-playbook site.yml -f 20
```

With `forks = 5` and 20 hosts:

```
Task 1:
  Batch 1: web-01, web-02, web-03, web-04, web-05 (parallel)
  Batch 2: web-06, web-07, web-08, web-09, web-10 (parallel)
  Batch 3: web-11, web-12, web-13, web-14, web-15 (parallel)
  Batch 4: web-16, web-17, web-18, web-19, web-20 (parallel)
  [All 20 hosts finish Task 1]

Task 2:
  [Same batching pattern]
```

## Why Linear is the Default

Linear execution has several advantages:

**Predictable ordering.** You know that every host has completed the previous task before the next one starts. This matters when tasks have dependencies (install the package before starting the service).

**Handler coordination.** Handlers triggered by a task run after the task completes across all hosts. With linear strategy, you know the handler fires at a consistent point.

**Error visibility.** If a task fails on some hosts, you see the failure before subsequent tasks run. This gives you a chance to evaluate the failure before more changes are made.

**Simplicity.** The execution model is easy to reason about. Task A, then Task B, then Task C.

## Linear Strategy with Error Handling

The linear strategy interacts with error handling in predictable ways:

```yaml
# error-handling.yml - Error handling with linear strategy
---
- name: Deploy with error handling
  hosts: webservers
  strategy: linear

  tasks:
    - name: Deploy application
      copy:
        src: app.tar.gz
        dest: /opt/app/
      register: deploy_result

    # This task only runs after ALL hosts finish the deploy task
    - name: Restart application
      service:
        name: myapp
        state: restarted
      when: deploy_result.changed

    # If any host failed the deploy, this task still runs on successful hosts
    - name: Verify application
      uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
```

If a host fails a task, it is removed from the play. The remaining hosts continue through subsequent tasks. The failed host does not participate in any further tasks.

## Linear Strategy and Handlers

Handlers in the linear strategy run at specific points:

```yaml
# handler-example.yml
---
- name: Configure and restart
  hosts: webservers
  strategy: linear

  tasks:
    - name: Update config file
      template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      notify: Restart app  # Handler is notified

    - name: Update another config
      template:
        src: logging.conf.j2
        dest: /etc/app/logging.conf
      notify: Restart app  # Handler notified again (deduped)

    # Handlers run HERE after all tasks complete
    # (or when meta: flush_handlers is called)

  handlers:
    - name: Restart app
      service:
        name: myapp
        state: restarted
```

With the linear strategy, the handler runs once after all tasks complete, on all hosts that were notified. You can force handlers to run earlier:

```yaml
    - name: Update config file
      template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      notify: Restart app

    # Force handlers to run now, before the next task
    - meta: flush_handlers

    - name: Verify the restart worked
      uri:
        url: "http://{{ ansible_host }}:8080/health"
```

## Performance Implications

The linear strategy's lock-step nature means the slowest host determines the pace. If web-01 takes 30 seconds on a task and web-02 takes 2 seconds, web-02 sits idle for 28 seconds waiting.

```
Task 1:
  web-01: [=============================] 30s
  web-02: [==] 2s  [waiting................]
  web-03: [===] 3s [waiting................]
  web-04: [=] 1s   [waiting................]
  ^-- All wait for web-01 before Task 2 starts
```

If you have hosts with significantly different performance characteristics, the `free` strategy might be faster because it lets fast hosts proceed without waiting.

## Explicitly Setting the Linear Strategy

Even though linear is the default, you might want to set it explicitly for clarity:

```yaml
# Per-play setting
- name: Configure servers
  hosts: all
  strategy: linear
  tasks:
    - name: Install packages
      apt:
        name: nginx
```

```ini
# ansible.cfg - Set as the global default
[defaults]
strategy = linear
```

## Linear Strategy with serial

Combine the linear strategy with `serial` for rolling updates:

```yaml
# rolling-update.yml - Linear strategy with serial batches
---
- name: Rolling update
  hosts: webservers
  strategy: linear
  serial: 5  # Process 5 hosts at a time

  tasks:
    - name: Pull new version
      docker_image:
        name: myapp:v2
        source: pull

    - name: Restart container
      docker_container:
        name: myapp
        image: myapp:v2
        state: started
        restart: true

    - name: Wait for health check
      uri:
        url: "http://localhost:8080/health"
      retries: 5
      delay: 3
      register: health
      until: health.status == 200
```

With `serial: 5`, the play runs on 5 hosts, completes all tasks linearly, then moves to the next batch of 5. If any host in a batch fails, you can stop the rollout before affecting more hosts.

## When to Use a Different Strategy

Switch away from linear when:

- Hosts have vastly different performance and you want fast hosts to proceed (use `free`)
- You need to debug interactively (use `debug`)
- You need strict host affinity where all tasks for a host run together (use `host_pinned`)

For everything else, linear is the right choice. It is predictable, well-tested, and the strategy that Ansible's entire ecosystem of modules and plugins is designed around.
