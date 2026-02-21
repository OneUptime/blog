# How to Use Ansible local_action for Running Tasks Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Local Action, Automation, DevOps

Description: Learn how to use the Ansible local_action keyword to run tasks on the controller machine as part of a remote host play.

---

The `local_action` keyword in Ansible is an older syntax for running a task on the controller machine (localhost) instead of the remote target host. It is functionally equivalent to `delegate_to: localhost` but uses a different syntax. While `delegate_to: localhost` is the more modern and recommended approach, `local_action` still appears in many existing playbooks and documentation, so understanding it is important.

## Basic local_action Syntax

The `local_action` keyword replaces the module name at the task level. Instead of specifying a module normally, you prefix it with `local_action`.

Here is the basic syntax compared to `delegate_to`:

```yaml
# local-action-syntax.yml - Comparing local_action and delegate_to syntax
---
- name: Compare local_action and delegate_to
  hosts: webservers
  tasks:
    # Using local_action (older syntax)
    - name: Send notification via local_action
      local_action:
        module: ansible.builtin.uri
        url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
        method: POST
        body_format: json
        body:
          text: "Deploying to {{ inventory_hostname }}"

    # Using delegate_to (modern, preferred syntax)
    - name: Send notification via delegate_to
      ansible.builtin.uri:
        url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
        method: POST
        body_format: json
        body:
          text: "Deploying to {{ inventory_hostname }}"
      delegate_to: localhost
```

Both of these do exactly the same thing. The task runs on the controller, and the variable context (like `inventory_hostname`) still references the current remote host.

## Inline Syntax for local_action

There is also a compact inline syntax that you will see in older playbooks:

```yaml
# inline-syntax.yml - Compact local_action syntax
---
- name: Inline local_action examples
  hosts: webservers
  tasks:
    # Inline syntax (very compact)
    - name: Check if host is reachable via HTTP
      local_action: uri url="http://{{ ansible_host }}:8080/health" status_code=200
      register: health_check
      ignore_errors: true

    # Block syntax (more readable, preferred)
    - name: Check if host is reachable via HTTP (block syntax)
      local_action:
        module: ansible.builtin.uri
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      register: health_check_v2
      ignore_errors: true
```

The inline syntax puts everything on one line, which becomes unreadable for anything beyond simple tasks. I always recommend the block syntax or `delegate_to` instead.

## Common Use Cases for local_action

Here are the most frequent scenarios where you run tasks locally.

Making API calls from the controller:

```yaml
# api-calls.yml - API calls with local_action
---
- name: Manage infrastructure via API calls
  hosts: webservers
  serial: 1
  tasks:
    - name: Deregister from load balancer via API
      local_action:
        module: ansible.builtin.uri
        url: "http://lb-api.example.com/v1/backends/web/members/{{ inventory_hostname }}"
        method: DELETE
        status_code: [200, 204, 404]

    - name: Deploy new version on remote host
      ansible.builtin.apt:
        name: myapp={{ app_version }}
        state: present
      become: true

    - name: Restart service on remote host
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true

    - name: Wait for service to be healthy (check from controller)
      local_action:
        module: ansible.builtin.wait_for
        host: "{{ ansible_host }}"
        port: 8080
        delay: 5
        timeout: 120

    - name: Register back with load balancer
      local_action:
        module: ansible.builtin.uri
        url: "http://lb-api.example.com/v1/backends/web/members"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          address: "{{ ansible_host }}"
          port: 8080
```

Writing local files based on remote data:

```yaml
# local-file-ops.yml - Local file operations during remote play
---
- name: Collect inventory data and write locally
  hosts: all
  gather_facts: true
  tasks:
    - name: Create host report directory
      local_action:
        module: ansible.builtin.file
        path: /tmp/ansible-reports
        state: directory
      run_once: true

    - name: Write host data to local CSV
      local_action:
        module: ansible.builtin.lineinfile
        path: /tmp/ansible-reports/inventory.csv
        line: "{{ inventory_hostname }},{{ ansible_host }},{{ ansible_distribution }},{{ ansible_distribution_version }},{{ ansible_memtotal_mb }}"
        create: true

    - name: Write CSV header
      local_action:
        module: ansible.builtin.lineinfile
        path: /tmp/ansible-reports/inventory.csv
        line: "hostname,ip,distribution,version,memory_mb"
        insertbefore: BOF
      run_once: true
```

## local_action with Loops

You can use `local_action` with loops just like any other task:

```yaml
# local-action-loop.yml - Looping with local_action
---
- name: Register host with multiple external services
  hosts: webservers
  vars:
    monitoring_endpoints:
      - url: "http://datadog.example.com/api/v1/hosts"
        service: datadog
      - url: "http://newrelic.example.com/api/v1/servers"
        service: newrelic
      - url: "http://prometheus.example.com/api/v1/targets"
        service: prometheus
  tasks:
    - name: Register host with all monitoring services
      local_action:
        module: ansible.builtin.uri
        url: "{{ item.url }}"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip: "{{ ansible_host }}"
          tags:
            - "environment:{{ env }}"
            - "service:{{ item.service }}"
        timeout: 10
      loop: "{{ monitoring_endpoints }}"
      ignore_errors: true
```

## local_action with Become

Like `delegate_to: localhost`, if you use `become` with `local_action`, the privilege escalation happens on the controller machine.

```yaml
# local-become.yml - Privilege escalation with local_action
---
- name: Local tasks with privilege escalation
  hosts: webservers
  tasks:
    # This runs as root on the CONTROLLER machine
    - name: Update controller's hosts file
      local_action:
        module: ansible.builtin.lineinfile
        path: /etc/hosts
        line: "{{ ansible_host }} {{ inventory_hostname }}"
        state: present
      become: true
      # WARNING: become happens on the controller, not the remote host

    # Regular remote task with become on the remote host
    - name: Install package on remote host
      ansible.builtin.apt:
        name: nginx
        state: present
      become: true
      # become happens on the remote host
```

## Migrating from local_action to delegate_to

If you are maintaining older playbooks, you might want to modernize the syntax. Here is how to convert:

```yaml
# before-migration.yml - Old style with local_action
---
- name: Old style playbook
  hosts: webservers
  tasks:
    - name: Check connectivity
      local_action: wait_for host={{ ansible_host }} port=22 timeout=60

    - name: Send webhook
      local_action:
        module: uri
        url: "http://api.example.com/deploy"
        method: POST
        body_format: json
        body:
          host: "{{ inventory_hostname }}"
```

```yaml
# after-migration.yml - Modern style with delegate_to
---
- name: Modern style playbook
  hosts: webservers
  tasks:
    - name: Check connectivity
      ansible.builtin.wait_for:
        host: "{{ ansible_host }}"
        port: 22
        timeout: 60
      delegate_to: localhost

    - name: Send webhook
      ansible.builtin.uri:
        url: "http://api.example.com/deploy"
        method: POST
        body_format: json
        body:
          host: "{{ inventory_hostname }}"
      delegate_to: localhost
```

The `delegate_to` version is better because it uses the standard module specification format, works consistently with all other task-level keywords (like `become`, `when`, `register`), and is more readable.

## Error Handling in local_action

Error handling works the same as with any other task:

```yaml
# error-handling.yml - Error handling with local_action
---
- name: Local action with error handling
  hosts: webservers
  tasks:
    - name: API interaction with error handling
      block:
        - name: Deregister from service
          local_action:
            module: ansible.builtin.uri
            url: "http://api.example.com/deregister/{{ inventory_hostname }}"
            method: DELETE
            timeout: 10

        - name: Perform maintenance
          ansible.builtin.apt:
            upgrade: safe
          become: true

      rescue:
        - name: Re-register if maintenance failed
          local_action:
            module: ansible.builtin.uri
            url: "http://api.example.com/register/{{ inventory_hostname }}"
            method: POST
            timeout: 10

      always:
        - name: Log the attempt
          local_action:
            module: ansible.builtin.lineinfile
            path: /tmp/maintenance.log
            line: "{{ inventory_hostname }} - {{ 'SUCCESS' if ansible_failed_task is not defined else 'FAILED' }} - {{ now() }}"
            create: true
```

## Summary

The `local_action` keyword runs tasks on the Ansible controller while maintaining the variable context of the current remote host. It is functionally identical to `delegate_to: localhost` but uses an older, less flexible syntax. For new playbooks, use `delegate_to: localhost` instead. If you encounter `local_action` in existing code, it works fine and there is no urgent need to migrate, but when you are making changes to those playbooks anyway, converting to `delegate_to` improves readability and consistency.
