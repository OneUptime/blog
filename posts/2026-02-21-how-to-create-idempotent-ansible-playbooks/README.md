# How to Create Idempotent Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Idempotency, DevOps, Configuration Management

Description: Learn how to write idempotent Ansible playbooks that produce the same result regardless of how many times they run, avoiding duplicated work and configuration drift.

---

Idempotency is the single most important property of a well-written Ansible playbook. An idempotent playbook produces the exact same end state whether you run it once or fifty times. If you have ever been burned by a playbook that appends duplicate lines to a config file or restarts services unnecessarily, you already know why this matters.

In this post, I will walk through the patterns and anti-patterns that determine whether your playbooks are truly idempotent, with real examples you can use today.

## What Idempotency Actually Means in Practice

When Ansible runs a task, it first checks the current state of the target system. If the system already matches the desired state, the task reports "ok" and moves on without making any changes. If the state does not match, Ansible makes the necessary change and reports "changed."

A playbook is idempotent when every task in it follows this pattern. The first run might show many "changed" results. Every subsequent run should show all "ok" results, assuming nothing else has modified the system in between.

## The Most Common Idempotency Violations

### Anti-Pattern 1: Using shell or command Without creates/removes

The shell and command modules are not idempotent by default because Ansible has no way to know what they do.

This task will run every single time, even if the directory already exists:

```yaml
# BAD: This runs every time, always reports "changed"
- name: Create application directory
  command: mkdir -p /opt/myapp
```

Fix it by using the proper module or adding a guard condition:

```yaml
# GOOD: The file module is inherently idempotent
- name: Create application directory
  file:
    path: /opt/myapp
    state: directory
    owner: appuser
    group: appuser
    mode: '0755'
```

If you absolutely must use shell or command, use the `creates` or `removes` parameter:

```yaml
# ACCEPTABLE: The creates parameter prevents re-execution
- name: Initialize the database schema
  command: /opt/myapp/bin/init-schema.sh
  args:
    creates: /opt/myapp/.schema_initialized
```

### Anti-Pattern 2: Using lineinfile Incorrectly

The lineinfile module can be tricky. Without the `regexp` parameter, it might add duplicate lines:

```yaml
# BAD: Will add a new line every run if the exact string is not found
- name: Set max open files
  lineinfile:
    path: /etc/security/limits.conf
    line: "appuser soft nofile 65536"
```

Use regexp to make it idempotent:

```yaml
# GOOD: The regexp ensures only one matching line exists
- name: Set max open files
  lineinfile:
    path: /etc/security/limits.conf
    regexp: '^appuser\s+soft\s+nofile'
    line: "appuser soft nofile 65536"
```

### Anti-Pattern 3: Restarting Services Unconditionally

Restarting a service on every playbook run is wasteful and causes unnecessary downtime:

```yaml
# BAD: Restarts nginx every single run
- name: Deploy nginx config
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf

- name: Restart nginx
  service:
    name: nginx
    state: restarted
```

Use handlers instead, which only fire when notified by a changed task:

```yaml
# GOOD: Handler only fires when the config actually changes
- name: Deploy nginx config
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: restart nginx

handlers:
  - name: restart nginx
    service:
      name: nginx
      state: restarted
```

## Building Idempotent Playbooks from the Ground Up

Here is a complete example of an idempotent playbook that sets up a web application server:

```yaml
---
# playbook: setup-webserver.yml
# This playbook configures an nginx web server with a custom application.
# Every task is idempotent and safe to run repeatedly.

- hosts: webservers
  become: yes
  vars:
    app_user: webapp
    app_port: 8080
    nginx_worker_processes: auto

  tasks:
    # The user module checks if the user exists before creating
    - name: Create application user
      user:
        name: "{{ app_user }}"
        shell: /bin/bash
        system: yes
        create_home: yes

    # The apt module checks package state before installing
    - name: Install required packages
      apt:
        name:
          - nginx
          - python3
          - python3-pip
        state: present
        update_cache: yes
        cache_valid_time: 3600

    # The file module checks directory state
    - name: Create application directories
      file:
        path: "{{ item }}"
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: '0755'
      loop:
        - /opt/webapp
        - /opt/webapp/logs
        - /opt/webapp/config

    # The template module compares checksums before writing
    - name: Deploy application configuration
      template:
        src: app-config.yml.j2
        dest: /opt/webapp/config/app.yml
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: '0644'
      notify: restart webapp

    # The template module handles nginx config the same way
    - name: Deploy nginx site configuration
      template:
        src: nginx-site.conf.j2
        dest: /etc/nginx/sites-available/webapp.conf
        owner: root
        group: root
        mode: '0644'
      notify: reload nginx

    # The file module checks if the symlink already exists and points correctly
    - name: Enable nginx site
      file:
        src: /etc/nginx/sites-available/webapp.conf
        dest: /etc/nginx/sites-enabled/webapp.conf
        state: link
      notify: reload nginx

    # The copy module compares checksums
    - name: Deploy systemd unit file
      copy:
        src: webapp.service
        dest: /etc/systemd/system/webapp.service
        owner: root
        group: root
        mode: '0644'
      notify:
        - reload systemd
        - restart webapp

    # The service module checks current state before acting
    - name: Ensure services are enabled and running
      service:
        name: "{{ item }}"
        state: started
        enabled: yes
      loop:
        - nginx
        - webapp

  handlers:
    - name: reload systemd
      systemd:
        daemon_reload: yes

    - name: restart webapp
      service:
        name: webapp
        state: restarted

    - name: reload nginx
      service:
        name: nginx
        state: reloaded
```

## Testing Idempotency

The simplest test is to run the playbook twice and check the output. On the second run, you should see zero "changed" tasks:

```bash
# First run - expect changes
ansible-playbook setup-webserver.yml

# Second run - should show 0 changed
ansible-playbook setup-webserver.yml
```

You can also use the `--check` flag combined with `--diff` to see what would change without actually applying it:

```bash
# Dry run with diff output to verify idempotency
ansible-playbook setup-webserver.yml --check --diff
```

For automated testing, you can parse the playbook output programmatically:

```bash
# Run playbook and capture stats, then check for zero changes
ansible-playbook setup-webserver.yml 2>&1 | tail -1 | grep -q "changed=0"
if [ $? -eq 0 ]; then
    echo "Playbook is idempotent"
else
    echo "WARNING: Playbook made changes on second run"
    exit 1
fi
```

## When You Cannot Avoid Non-Idempotent Tasks

Sometimes you genuinely need a task that is not idempotent, like running a database migration script. In those cases, guard the task with a condition:

```yaml
# Use a flag file to ensure the migration only runs once
- name: Check if migration v2 has been applied
  stat:
    path: /opt/webapp/.migration_v2_done
  register: migration_check

- name: Run database migration v2
  command: /opt/webapp/bin/migrate.sh --version 2
  when: not migration_check.stat.exists

- name: Mark migration v2 as complete
  file:
    path: /opt/webapp/.migration_v2_done
    state: touch
  when: not migration_check.stat.exists
```

## Quick Reference: Idempotent Module Choices

| Instead of This | Use This |
|---|---|
| `command: mkdir -p /foo` | `file: path=/foo state=directory` |
| `command: useradd bob` | `user: name=bob state=present` |
| `shell: echo "line" >> file` | `lineinfile: path=file line="line"` |
| `command: cp src dest` | `copy: src=src dest=dest` |
| `shell: apt-get install pkg` | `apt: name=pkg state=present` |
| `command: systemctl restart svc` | handler with `service: name=svc state=restarted` |

## Wrapping Up

Building idempotent playbooks comes down to three practices. First, prefer built-in Ansible modules over shell and command whenever possible. Second, use handlers to trigger service restarts only when configurations actually change. Third, guard any unavoidably non-idempotent tasks with conditional checks.

If you adopt these habits, your playbooks will be safe to run at any time, on any schedule, without fear of breaking a working system. That reliability is what makes Ansible such a powerful tool for managing infrastructure at scale.
