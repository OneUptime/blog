# How to Use Ansible run_once for Single Execution Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, run_once, Task Execution, Playbook Patterns

Description: Use the Ansible run_once directive to execute a task on only one host while applying the result to all hosts in the play for efficient operations.

---

The `run_once` directive tells Ansible to execute a task on only one host, even when the play targets multiple hosts. The task runs on the first host in the batch, and the result can be shared with all other hosts. This is useful for tasks that interact with a central resource (like a database migration), fetch shared data (like a deployment artifact URL), or coordinate actions (like clearing a cache).

## Basic Usage

```yaml
# run-once-example.yml
---
- name: Deploy application
  hosts: webservers
  become: true

  tasks:
    # This runs on ALL hosts
    - name: Install dependencies
      apt:
        name: python3
        state: present

    # This runs on ONE host only
    - name: Run database migration
      command: /opt/app/manage.py migrate --noinput
      run_once: true

    # This runs on ALL hosts again
    - name: Restart application
      service:
        name: myapp
        state: restarted
```

The database migration runs on the first host in the inventory (typically the first host listed). All other hosts skip this task.

## How run_once Selects the Host

By default, `run_once` picks the first host in the current batch. With the `linear` strategy, that is the first host in the play's host list:

```yaml
- name: Example
  hosts: web-01, web-02, web-03
  tasks:
    - name: This runs on web-01 only
      debug:
        msg: "I am the chosen one"
      run_once: true
```

If you use `serial`, `run_once` executes once per batch:

```yaml
- name: Batch example
  hosts: web-01, web-02, web-03, web-04
  serial: 2

  tasks:
    - name: This runs once per batch
      debug:
        msg: "Batch leader: {{ inventory_hostname }}"
      run_once: true
```

Output:

```
Batch 1: runs on web-01 (batch of web-01, web-02)
Batch 2: runs on web-03 (batch of web-03, web-04)
```

To run truly once across all batches, combine `run_once` with `delegate_to`:

```yaml
    - name: This runs exactly once across all batches
      command: /opt/migrate.sh
      run_once: true
      delegate_to: "{{ groups['webservers'][0] }}"
```

## Sharing Results with run_once

When you register a variable from a `run_once` task, the result is available to all hosts:

```yaml
- name: Fetch shared configuration
  hosts: webservers

  tasks:
    # Fetch the latest version info once
    - name: Get latest version from API
      uri:
        url: https://releases.example.com/api/latest
        return_content: true
      register: latest_version
      run_once: true

    # Use the result on all hosts
    - name: Deploy the latest version
      get_url:
        url: "https://releases.example.com/download/{{ (latest_version.content | from_json).version }}"
        dest: /opt/app/release.tar.gz
```

The API is called once, but every host gets access to `latest_version`.

## Common Use Cases

### Database Migrations

The most common use case. Migrations should only run once, not on every app server:

```yaml
- name: Deploy with migration
  hosts: app_servers

  tasks:
    - name: Deploy code
      git:
        repo: https://github.com/myorg/myapp.git
        dest: /opt/app
        version: "{{ deploy_version }}"

    - name: Run migrations
      command: /opt/app/manage.py migrate --noinput
      run_once: true
      register: migration_result

    - name: Show migration output
      debug:
        var: migration_result.stdout_lines
      run_once: true

    - name: Restart all app servers
      service:
        name: myapp
        state: restarted
```

### Cache Clearing

Clear a shared cache once, not from every server:

```yaml
- name: Clear CDN cache
  uri:
    url: "https://cdn-api.example.com/purge"
    method: POST
    headers:
      Authorization: "Bearer {{ cdn_token }}"
    body_format: json
    body:
      zone_id: "{{ cdn_zone }}"
  run_once: true
  delegate_to: localhost
```

### Build Artifacts

Build once, then distribute:

```yaml
- name: Build and deploy
  hosts: app_servers

  tasks:
    # Build the artifact on one host
    - name: Build application
      command: make release
      args:
        chdir: /opt/src/myapp
      run_once: true
      register: build_output

    # Fetch the artifact from the build host
    - name: Fetch artifact from build host
      fetch:
        src: /opt/src/myapp/dist/app.tar.gz
        dest: /tmp/app.tar.gz
        flat: true
      run_once: true

    # Deploy to all hosts
    - name: Deploy artifact to all servers
      copy:
        src: /tmp/app.tar.gz
        dest: /opt/app/
```

### Sending Notifications

Notify once, not per host:

```yaml
- name: Send deployment notification
  community.general.slack:
    token: "{{ slack_token }}"
    channel: "#deployments"
    msg: "Deploying v{{ version }} to {{ ansible_play_hosts | length }} servers"
  run_once: true
  delegate_to: localhost
```

## run_once with delegate_to

Combine `run_once` with `delegate_to` for tasks that should run on a specific host:

```yaml
- name: Load balancer operations
  hosts: webservers

  tasks:
    # Run once on the load balancer, not on a web server
    - name: Create new backend pool
      command: /opt/lb/create-pool.sh --name v{{ version }}
      run_once: true
      delegate_to: lb-01

    # Run on each web server
    - name: Deploy application
      copy:
        src: app.tar.gz
        dest: /opt/app/

    # Run once on the load balancer again
    - name: Switch traffic to new pool
      command: /opt/lb/switch-pool.sh --pool v{{ version }}
      run_once: true
      delegate_to: lb-01
```

## run_once with when Conditions

The `when` condition is evaluated on the host that `run_once` selects. If the condition is false on that host, the task is skipped for all hosts:

```yaml
- name: Conditional run_once
  hosts: webservers

  tasks:
    # This checks the condition on the FIRST host only
    - name: Run migration if needed
      command: /opt/app/check-and-migrate.sh
      run_once: true
      when: run_migration | default(false)
```

If you need the condition to be evaluated based on a different host's facts, use `delegate_to`:

```yaml
    - name: Run migration on the primary database
      command: /opt/app/migrate.sh
      run_once: true
      delegate_to: "{{ groups['db_primary'][0] }}"
      when: hostvars[groups['db_primary'][0]].needs_migration
```

## run_once vs throttle: 1

These two are different:

```yaml
# run_once: runs on ONE host, others skip it
- name: Migrate database
  command: migrate.sh
  run_once: true
  # Only web-01 runs this

# throttle: 1: ALL hosts run it, but one at a time
- name: Register with service
  command: register.sh
  throttle: 1
  # web-01, then web-02, then web-03 (sequentially)
```

Use `run_once` when the task should execute exactly once. Use `throttle: 1` when every host needs to run the task but only one at a time.

The `run_once` directive is a fundamental pattern for any playbook that targets multiple hosts but has tasks that should only execute once. Database migrations, cache purges, API calls to central services, and notifications are all natural fits for `run_once`.
