# How to Use Ansible rescue Block for Task Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Recovery, Block, DevOps

Description: Learn how to use Ansible rescue blocks to recover from task failures with rollback procedures, fallback logic, and error notifications.

---

The `rescue` section in an Ansible block is where you define what happens when things go wrong. Unlike `ignore_errors`, which just silently moves past failures, rescue gives you a structured place to respond to errors: roll back changes, try alternative approaches, send alerts, or clean up partial work. If you manage production systems, the rescue block is one of the most valuable tools in your Ansible toolkit.

## When Does rescue Run?

The rescue section executes when any task inside the associated `block` section fails. Once a block task fails, all remaining block tasks are skipped, and control passes to rescue. If rescue completes without errors, the play continues as if nothing went wrong. The failure is considered "handled."

```yaml
# Basic rescue behavior
---
- name: Rescue behavior demo
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Demonstrate rescue flow
      block:
        - name: Task 1 - succeeds
          ansible.builtin.debug:
            msg: "Task 1 runs"

        - name: Task 2 - fails intentionally
          ansible.builtin.command:
            cmd: /bin/false

        - name: Task 3 - skipped because Task 2 failed
          ansible.builtin.debug:
            msg: "This will never run"

      rescue:
        - name: Recovery task
          ansible.builtin.debug:
            msg: "Rescue is handling the failure from Task 2"

    # This task runs because rescue handled the error
    - name: Task after the block
      ansible.builtin.debug:
        msg: "Playbook continues normally after rescue"
```

## Rollback Pattern

The most common use of rescue is rolling back changes when a deployment or configuration update fails partway through.

```yaml
# Rollback on deployment failure
---
- name: Deploy with rollback capability
  hosts: app_servers
  become: true

  vars:
    app_name: myapp
    new_version: "2.5.0"

  tasks:
    - name: Get current version for rollback reference
      ansible.builtin.command:
        cmd: cat /opt/{{ app_name }}/VERSION
      register: current_version_file
      changed_when: false
      ignore_errors: true

    - name: Set current version fact
      ansible.builtin.set_fact:
        previous_version: "{{ current_version_file.stdout | default('unknown') }}"

    - name: Deploy new version
      block:
        - name: Download new release
          ansible.builtin.get_url:
            url: "https://releases.example.com/{{ app_name }}/{{ new_version }}/{{ app_name }}.tar.gz"
            dest: "/tmp/{{ app_name }}-{{ new_version }}.tar.gz"

        - name: Create backup of current installation
          ansible.builtin.archive:
            path: "/opt/{{ app_name }}/"
            dest: "/var/backups/{{ app_name }}-{{ previous_version }}-backup.tar.gz"

        - name: Stop application
          ansible.builtin.systemd:
            name: "{{ app_name }}"
            state: stopped

        - name: Extract new version
          ansible.builtin.unarchive:
            src: "/tmp/{{ app_name }}-{{ new_version }}.tar.gz"
            dest: "/opt/{{ app_name }}/"
            remote_src: true

        - name: Update version file
          ansible.builtin.copy:
            content: "{{ new_version }}"
            dest: "/opt/{{ app_name }}/VERSION"

        - name: Start application with new version
          ansible.builtin.systemd:
            name: "{{ app_name }}"
            state: started

        - name: Wait for health check
          ansible.builtin.uri:
            url: "http://localhost:8080/health"
            status_code: 200
          retries: 10
          delay: 3

      rescue:
        - name: Deployment failed - starting rollback
          ansible.builtin.debug:
            msg: >
              Deployment of {{ new_version }} failed.
              Rolling back to {{ previous_version }}.
              Failed task: {{ ansible_failed_task.name }}

        - name: Stop failed application
          ansible.builtin.systemd:
            name: "{{ app_name }}"
            state: stopped
          ignore_errors: true

        - name: Restore from backup
          ansible.builtin.unarchive:
            src: "/var/backups/{{ app_name }}-{{ previous_version }}-backup.tar.gz"
            dest: "/"
            remote_src: true
          when: previous_version != 'unknown'

        - name: Restart with previous version
          ansible.builtin.systemd:
            name: "{{ app_name }}"
            state: started

        - name: Verify rollback health check
          ansible.builtin.uri:
            url: "http://localhost:8080/health"
            status_code: 200
          retries: 5
          delay: 3
```

## Fallback Pattern

Instead of rolling back, sometimes you want to try an alternative approach when the primary one fails.

```yaml
# Fallback to alternative method
---
- name: Install with fallback methods
  hosts: all
  become: true

  tasks:
    - name: Install monitoring agent
      block:
        - name: Try package manager installation
          ansible.builtin.apt:
            name: datadog-agent
            state: present
          register: pkg_install

      rescue:
        - name: Package install failed, trying direct download
          block:
            - name: Download agent installer
              ansible.builtin.get_url:
                url: "https://s3.amazonaws.com/dd-agent/scripts/install_script.sh"
                dest: /tmp/dd-install.sh
                mode: '0755'

            - name: Run installer script
              ansible.builtin.command:
                cmd: /tmp/dd-install.sh
              environment:
                DD_API_KEY: "{{ datadog_api_key }}"

          rescue:
            - name: Both installation methods failed
              ansible.builtin.debug:
                msg: "WARNING: Could not install monitoring agent on {{ inventory_hostname }}"

            - name: Log installation failure
              ansible.builtin.lineinfile:
                path: /var/log/install_failures.log
                line: "{{ ansible_date_time.iso8601 }} - monitoring agent install failed"
                create: true
```

## Accessing Failure Context in Rescue

Ansible provides two special variables inside rescue blocks that tell you exactly what went wrong.

```yaml
# Using failure context variables
---
- name: Detailed error recovery
  hosts: all
  become: true

  tasks:
    - name: Configuration update
      block:
        - name: Update main config
          ansible.builtin.template:
            src: main.conf.j2
            dest: /etc/app/main.conf

        - name: Validate configuration
          ansible.builtin.command:
            cmd: /opt/app/validate-config
          register: validation

        - name: Reload application
          ansible.builtin.systemd:
            name: app
            state: reloaded

      rescue:
        - name: Extract error details
          ansible.builtin.set_fact:
            failure_info:
              task_name: "{{ ansible_failed_task.name }}"
              task_action: "{{ ansible_failed_task.action }}"
              error_message: "{{ ansible_failed_result.msg | default('No message available') }}"
              return_code: "{{ ansible_failed_result.rc | default('N/A') }}"
              stderr: "{{ ansible_failed_result.stderr | default('No stderr') }}"

        - name: Display failure summary
          ansible.builtin.debug:
            msg: |
              === FAILURE REPORT ===
              Task: {{ failure_info.task_name }}
              Action: {{ failure_info.task_action }}
              Error: {{ failure_info.error_message }}
              Return Code: {{ failure_info.return_code }}
              Stderr: {{ failure_info.stderr }}
              =====================

        - name: Restore previous config
          ansible.builtin.copy:
            src: /etc/app/main.conf.bak
            dest: /etc/app/main.conf
            remote_src: true
          ignore_errors: true

        - name: Ensure app is still running with old config
          ansible.builtin.systemd:
            name: app
            state: started
```

## Conditional Recovery Logic

You can use conditionals inside rescue to choose different recovery strategies based on what went wrong.

```yaml
# Conditional recovery strategies
---
- name: Smart recovery
  hosts: all
  become: true

  tasks:
    - name: Service deployment
      block:
        - name: Pull container image
          community.docker.docker_image:
            name: "myapp:{{ target_version }}"
            source: pull
          register: image_pull

        - name: Deploy container
          community.docker.docker_container:
            name: myapp
            image: "myapp:{{ target_version }}"
            state: started
            ports:
              - "8080:8080"

      rescue:
        # If the image pull failed, the issue is probably a network or registry problem
        - name: Handle image pull failure
          block:
            - name: Try alternative registry
              community.docker.docker_image:
                name: "backup-registry.example.com/myapp:{{ target_version }}"
                source: pull

            - name: Deploy from alternative registry
              community.docker.docker_container:
                name: myapp
                image: "backup-registry.example.com/myapp:{{ target_version }}"
                state: started
                ports:
                  - "8080:8080"
          when: ansible_failed_task.name == "Pull container image"

        # If the container deploy failed, roll back to previous version
        - name: Handle container deploy failure
          block:
            - name: Rollback to previous container
              community.docker.docker_container:
                name: myapp
                image: "myapp:{{ previous_version }}"
                state: started
                ports:
                  - "8080:8080"
          when: ansible_failed_task.name == "Deploy container"
```

## Rescue with Notification

In production, you want to know when rescue runs. Integrating notifications into rescue blocks is a best practice.

```yaml
# Rescue with multi-channel notifications
---
- name: Deploy with alerting
  hosts: app_servers
  become: true

  vars:
    slack_webhook: "{{ vault_slack_webhook }}"
    pagerduty_key: "{{ vault_pagerduty_key }}"

  tasks:
    - name: Critical deployment
      block:
        - name: Deploy application update
          ansible.builtin.copy:
            src: release/
            dest: /opt/app/
          register: deploy

        - name: Restart services
          ansible.builtin.systemd:
            name: "{{ item }}"
            state: restarted
          loop:
            - myapp-web
            - myapp-worker

      rescue:
        - name: Send Slack alert
          ansible.builtin.uri:
            url: "{{ slack_webhook }}"
            method: POST
            body_format: json
            body:
              channel: "#deployments"
              text: ":red_circle: Deployment FAILED on {{ inventory_hostname }}\nFailed task: {{ ansible_failed_task.name }}\nError: {{ ansible_failed_result.msg | default('Unknown') }}"
          ignore_errors: true

        - name: Create PagerDuty incident
          ansible.builtin.uri:
            url: "https://events.pagerduty.com/v2/enqueue"
            method: POST
            body_format: json
            body:
              routing_key: "{{ pagerduty_key }}"
              event_action: trigger
              payload:
                summary: "Deployment failure on {{ inventory_hostname }}"
                severity: "critical"
                source: "ansible-deploy"
          ignore_errors: true

        - name: Attempt automatic recovery
          ansible.builtin.command:
            cmd: /opt/app/emergency-rollback.sh
```

## What Happens When Rescue Fails

If a task inside the rescue section also fails, the play stops for that host (unless you have additional error handling). This is important to understand because your rescue logic itself might encounter problems.

```yaml
# Handle rescue failures safely
---
- name: Defensive rescue
  hosts: all
  become: true

  tasks:
    - name: Risky operation
      block:
        - name: Do something that might fail
          ansible.builtin.command:
            cmd: /opt/app/risky-operation.sh

      rescue:
        # Use ignore_errors on rescue tasks that might also fail
        - name: Try to clean up (might also fail)
          ansible.builtin.command:
            cmd: /opt/app/cleanup.sh
          ignore_errors: true

        - name: Try to restore backup (might also fail)
          ansible.builtin.command:
            cmd: /opt/app/restore.sh
          ignore_errors: true

        # This final task should always work
        - name: Log the failure regardless
          ansible.builtin.lineinfile:
            path: /var/log/ansible-failures.log
            line: "{{ ansible_date_time.iso8601 }} {{ inventory_hostname }} {{ ansible_failed_task.name }}"
            create: true
```

The rescue block is not just about catching errors; it is about responding to them intelligently. Whether you need to roll back deployments, try alternative approaches, or simply ensure that someone gets notified about a failure, the rescue block provides a clean, organized way to handle the unexpected in your automation workflows.
