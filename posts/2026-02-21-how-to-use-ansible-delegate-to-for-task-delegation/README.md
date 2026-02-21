# How to Use Ansible delegate_to for Task Delegation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Delegation, Automation, Infrastructure

Description: Learn how to use Ansible delegate_to to run tasks on different hosts than the current play target for cross-host orchestration.

---

Ansible's `delegate_to` directive is one of the most powerful features for orchestrating multi-host workflows. It lets you run a task on a host different from the one currently being targeted in your play. This is essential for scenarios like removing a server from a load balancer before patching it, running API calls from the controller, or executing database commands from a specific management host.

## Basic delegate_to Usage

The `delegate_to` keyword redirects task execution to a specified host while keeping the context (variables, facts) of the original target host.

This playbook demonstrates removing a web server from a load balancer, updating it, then adding it back:

```yaml
# basic-delegation.yml - Rolling update with load balancer management
---
- name: Rolling update of web servers
  hosts: webservers
  serial: 1
  tasks:
    - name: Remove this server from the load balancer
      ansible.builtin.shell: |
        # Remove the current web server from haproxy backend
        echo "disable server web_backend/{{ inventory_hostname }}" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: lb.example.com

    - name: Update application on the web server
      ansible.builtin.apt:
        name: myapp
        state: latest
      become: true

    - name: Restart the application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true

    - name: Wait for the application to be healthy
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        status_code: 200
      retries: 12
      delay: 5
      until: health_check.status == 200
      register: health_check
      delegate_to: localhost

    - name: Add this server back to the load balancer
      ansible.builtin.shell: |
        echo "enable server web_backend/{{ inventory_hostname }}" | \
          socat stdio /var/run/haproxy/admin.sock
      delegate_to: lb.example.com
```

Notice that even though the tasks run on `lb.example.com` or `localhost`, the `{{ inventory_hostname }}` variable still refers to the current web server being processed. This is the key behavior of delegation: the task executes on another host, but the variable context remains the original host.

## Understanding Variable Context in Delegation

This is where people often get confused. When you delegate a task, the variables and facts come from the original host, not the delegate host.

```yaml
# variable-context.yml - Demonstrating variable context in delegation
---
- name: Show variable context in delegation
  hosts: webservers
  tasks:
    - name: Show which host is running this task
      ansible.builtin.debug:
        msg: >
          Task delegated to localhost, but inventory_hostname is {{ inventory_hostname }}.
          ansible_host is {{ ansible_host }}.
          The task physically runs on localhost.
      delegate_to: localhost

    - name: Access delegate host facts (if gathered)
      ansible.builtin.debug:
        msg: >
          Original host: {{ inventory_hostname }}
          Delegate host OS: {{ hostvars['localhost']['ansible_os_family'] | default('facts not gathered') }}
      delegate_to: localhost
```

If you need facts from the delegate host, you need to have gathered facts for that host earlier, or use `delegate_facts: true` (covered in a separate post).

## Delegating to Multiple Hosts

You can combine `delegate_to` with loops to run a task on multiple hosts for each target:

```yaml
# multi-delegate.yml - Notify multiple monitoring systems about each server
---
- name: Notify monitoring systems during maintenance
  hosts: webservers
  tasks:
    - name: Put server in maintenance mode on all monitoring systems
      ansible.builtin.uri:
        url: "http://{{ item }}:5000/api/v1/maintenance"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          reason: "Scheduled maintenance"
          duration: 3600
      delegate_to: "{{ item }}"
      loop:
        - monitor1.example.com
        - monitor2.example.com
```

## Delegation with become

When using `delegate_to` with `become`, the privilege escalation happens on the delegate host, not the original host. This is important to understand:

```yaml
# delegation-become.yml - Privilege escalation on delegate host
---
- name: Delegation with become
  hosts: webservers
  tasks:
    - name: Create DNS record on DNS server (requires root)
      ansible.builtin.shell: |
        # nsupdate requires root to read the TSIG key
        nsupdate -k /etc/bind/keys/update.key << EOF
        server dns.example.com
        update add {{ inventory_hostname }} 300 A {{ ansible_host }}
        send
        EOF
      delegate_to: dns.example.com
      become: true          # become happens on dns.example.com, not the web server
      become_user: root
```

## Conditional Delegation

You can make the delegation target dynamic using variables or conditional logic:

```yaml
# conditional-delegation.yml - Dynamic delegation target
---
- name: Dynamic delegation based on environment
  hosts: appservers
  vars:
    lb_host: "{{ 'prod-lb.example.com' if env == 'production' else 'staging-lb.example.com' }}"
  tasks:
    - name: Register with appropriate load balancer
      ansible.builtin.shell: |
        /usr/local/bin/lb-register \
          --backend {{ inventory_hostname }} \
          --port 8080 \
          --health-check /health
      delegate_to: "{{ lb_host }}"
```

## Delegation for Cross-Platform Coordination

A common real-world pattern is coordinating between application servers and database servers:

```yaml
# cross-platform.yml - Coordinate app deployment with database migration
---
- name: Deploy with database migration coordination
  hosts: appservers
  serial: 1
  tasks:
    - name: Check if database migration is needed
      ansible.builtin.shell: |
        cd /opt/myapp && python3 manage.py showmigrations --plan | grep '\[ \]' | wc -l
      register: pending_migrations
      changed_when: false

    - name: Run database migration from the primary DB host
      ansible.builtin.shell: |
        # Connect to the app database and run migrations
        # Running from DB host to avoid network latency
        cd /opt/myapp-migrations && python3 run_migrations.py \
          --database myapp_production \
          --version {{ app_version }}
      delegate_to: db-primary.example.com
      run_once: true        # Only run migrations once, not per app server
      when: pending_migrations.stdout | int > 0

    - name: Deploy application code
      ansible.builtin.copy:
        src: "/releases/myapp-{{ app_version }}/"
        dest: /opt/myapp/
      become: true

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true
```

## Error Handling with Delegation

When a delegated task fails, the failure is attributed to the original host in the play recap. Handle errors in delegated tasks carefully:

```yaml
# delegation-error-handling.yml - Handling errors in delegated tasks
---
- name: Deployment with delegated error handling
  hosts: webservers
  serial: 1
  tasks:
    - name: Drain and deploy
      block:
        - name: Drain connections on load balancer
          ansible.builtin.shell: |
            /usr/local/bin/lb-drain {{ inventory_hostname }}
          delegate_to: lb.example.com

        - name: Deploy new version
          ansible.builtin.copy:
            src: /releases/latest/
            dest: /opt/myapp/

        - name: Restart service
          ansible.builtin.systemd:
            name: myapp
            state: restarted
          become: true

      rescue:
        - name: Re-enable on load balancer after failure
          ansible.builtin.shell: |
            /usr/local/bin/lb-enable {{ inventory_hostname }}
          delegate_to: lb.example.com

        - name: Mark host as failed
          ansible.builtin.fail:
            msg: "Deployment failed on {{ inventory_hostname }}"

      always:
        - name: Ensure host is enabled on load balancer
          ansible.builtin.shell: |
            /usr/local/bin/lb-enable {{ inventory_hostname }}
          delegate_to: lb.example.com
```

## Common Pitfalls

There are a few gotchas with `delegate_to` that trip up even experienced Ansible users.

First, SSH keys and credentials: when you delegate to a host, Ansible needs to be able to connect to that host. Make sure your SSH keys or credentials work for the delegate target.

Second, fact caching: if you delegate a task that uses `ansible_*` facts, those facts are from the original host. If you need facts from the delegate host, use `hostvars['delegate_host_name']`.

Third, connection type: the connection type used for the delegated task is the one configured for the delegate host, not the original host. If your original host uses SSH but the delegate host uses WinRM, the delegated task uses WinRM.

```yaml
# pitfall-example.yml - Demonstrating a common pitfall
---
- name: Avoid the wrong facts pitfall
  hosts: webservers
  tasks:
    # WRONG: ansible_default_ipv4 is the web server's IP, not localhost's
    - name: This uses the WRONG host's facts
      ansible.builtin.debug:
        msg: "IP: {{ ansible_default_ipv4.address }}"
      delegate_to: localhost

    # RIGHT: explicitly reference the web server's IP
    - name: This correctly references the desired host
      ansible.builtin.debug:
        msg: "Web server IP: {{ hostvars[inventory_hostname]['ansible_default_ipv4']['address'] }}"
      delegate_to: localhost
```

## Summary

The `delegate_to` directive is essential for any playbook that coordinates actions across multiple hosts. It enables rolling deployments with load balancer management, centralized API calls, cross-host orchestration, and more. The key thing to remember is that variables and facts stay with the original host while execution happens on the delegate. Combine it with `serial`, `block`/`rescue`, and `run_once` for production-grade orchestration workflows.
