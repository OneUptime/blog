# How to Use Ansible always Block for Cleanup Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cleanup, Error Handling, Automation

Description: Learn how to use the Ansible always block to guarantee cleanup tasks run regardless of whether previous tasks succeeded or failed.

---

The `always` section in an Ansible block structure runs no matter what. Whether the block tasks all succeeded, whether one failed and rescue handled it, or whether rescue itself failed, the `always` section executes. This makes it the perfect place for cleanup operations, status reporting, temporary file removal, lock releases, and anything else that must happen regardless of the outcome.

## Basic always Behavior

The `always` section is simple in concept but powerful in practice.

```yaml
# Basic always behavior
---
- name: Always block demo
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Operation with guaranteed cleanup
      block:
        - name: Create temporary workspace
          ansible.builtin.file:
            path: /tmp/build-workspace
            state: directory

        - name: Perform build operation
          ansible.builtin.command:
            cmd: /opt/build/compile.sh
          args:
            chdir: /tmp/build-workspace

      rescue:
        - name: Handle build failure
          ansible.builtin.debug:
            msg: "Build failed, but cleanup will still happen"

      always:
        - name: Remove temporary workspace
          ansible.builtin.file:
            path: /tmp/build-workspace
            state: absent

        - name: Report completion
          ansible.builtin.debug:
            msg: "Cleanup complete, temporary files removed"
```

The `/tmp/build-workspace` directory gets removed whether the build succeeded, failed, or was rescued.

## Cleanup of Temporary Files

One of the most common uses is removing temporary files and directories that were created during task execution.

```yaml
# Temporary file cleanup
---
- name: Secure file processing
  hosts: all
  become: true

  tasks:
    - name: Process sensitive data
      block:
        - name: Create secure temp directory
          ansible.builtin.tempfile:
            state: directory
            prefix: ansible_secure_
          register: secure_tmpdir

        - name: Download encrypted credentials
          ansible.builtin.get_url:
            url: "{{ vault_credentials_url }}"
            dest: "{{ secure_tmpdir.path }}/encrypted_creds"
            mode: '0600'

        - name: Decrypt credentials
          ansible.builtin.command:
            cmd: "gpg --decrypt {{ secure_tmpdir.path }}/encrypted_creds"
          register: decrypted_creds

        - name: Apply credentials to application config
          ansible.builtin.template:
            src: app-config.j2
            dest: /etc/app/config.yml
            mode: '0600'
          vars:
            credentials: "{{ decrypted_creds.stdout }}"

      rescue:
        - name: Log credential processing failure
          ansible.builtin.debug:
            msg: "Credential processing failed on {{ inventory_hostname }}"

      always:
        - name: Securely remove temporary files
          ansible.builtin.file:
            path: "{{ secure_tmpdir.path }}"
            state: absent
          when: secure_tmpdir is defined and secure_tmpdir.path is defined

        - name: Clear any cached decrypted data
          ansible.builtin.set_fact:
            decrypted_creds: "CLEARED"
          when: decrypted_creds is defined
```

## Lock Management

When tasks require exclusive access to a resource, you need to acquire a lock at the start and release it when done. The `always` block ensures the lock is released even if the task fails.

```yaml
# Lock file management with guaranteed release
---
- name: Exclusive operation with locking
  hosts: app_servers
  become: true

  vars:
    lock_file: /var/lock/deployment.lock

  tasks:
    - name: Perform exclusive deployment
      block:
        - name: Acquire deployment lock
          ansible.builtin.copy:
            content: |
              pid: {{ ansible_play_batch | join(',') }}
              time: {{ ansible_date_time.iso8601 }}
              host: {{ inventory_hostname }}
            dest: "{{ lock_file }}"
            force: false  # Fails if lock already exists
          register: lock_acquired

        - name: Run deployment steps
          ansible.builtin.command:
            cmd: /opt/deploy/run.sh
          when: lock_acquired is not failed

        - name: Run post-deployment verification
          ansible.builtin.command:
            cmd: /opt/deploy/verify.sh

      rescue:
        - name: Deployment failed
          ansible.builtin.debug:
            msg: "Deployment failed, releasing lock"

      always:
        - name: Release deployment lock
          ansible.builtin.file:
            path: "{{ lock_file }}"
            state: absent
          when: lock_acquired is defined and lock_acquired is not failed
```

## Service State Restoration

When you need to stop a service temporarily, the `always` block ensures it gets restarted.

```yaml
# Guarantee service is restarted
---
- name: Maintenance operation
  hosts: webservers
  become: true

  tasks:
    - name: Perform maintenance requiring service downtime
      block:
        - name: Enable maintenance page
          ansible.builtin.copy:
            src: maintenance.html
            dest: /var/www/html/maintenance.html

        - name: Stop application for maintenance
          ansible.builtin.systemd:
            name: myapp
            state: stopped

        - name: Run database maintenance
          ansible.builtin.command:
            cmd: /opt/app/db-maintenance.sh
          register: maintenance_result

        - name: Apply pending system updates
          ansible.builtin.apt:
            upgrade: safe

      rescue:
        - name: Maintenance encountered errors
          ansible.builtin.debug:
            msg: "Some maintenance tasks failed, but service will be restored"

      always:
        - name: Start application
          ansible.builtin.systemd:
            name: myapp
            state: started

        - name: Wait for application to be ready
          ansible.builtin.uri:
            url: "http://localhost:8080/health"
            status_code: 200
          retries: 10
          delay: 5
          register: health_check
          ignore_errors: true

        - name: Remove maintenance page
          ansible.builtin.file:
            path: /var/www/html/maintenance.html
            state: absent

        - name: Report final status
          ansible.builtin.debug:
            msg: "Service status: {{ 'HEALTHY' if health_check is success else 'UNHEALTHY' }}"
```

## Status Reporting and Logging

Using `always` for reporting ensures you always get a record of what happened.

```yaml
# Comprehensive status reporting
---
- name: Deployment with reporting
  hosts: app_servers
  become: true
  serial: 1

  tasks:
    - name: Track deployment timing
      ansible.builtin.set_fact:
        deploy_start_time: "{{ ansible_date_time.epoch }}"

    - name: Execute deployment
      block:
        - name: Pull latest code
          ansible.builtin.git:
            repo: "{{ app_repo }}"
            dest: /opt/app
            version: "{{ app_version }}"
          register: git_result

        - name: Install dependencies
          ansible.builtin.command:
            cmd: pip install -r /opt/app/requirements.txt
          register: deps_result

        - name: Restart application
          ansible.builtin.systemd:
            name: app
            state: restarted
          register: restart_result

        - name: Set success flag
          ansible.builtin.set_fact:
            deploy_status: "SUCCESS"

      rescue:
        - name: Set failure flag
          ansible.builtin.set_fact:
            deploy_status: "FAILED"
            deploy_error: "{{ ansible_failed_task.name }}: {{ ansible_failed_result.msg | default('Unknown error') }}"

      always:
        - name: Calculate deployment duration
          ansible.builtin.set_fact:
            deploy_duration: "{{ ansible_date_time.epoch | int - deploy_start_time | int }}"

        - name: Write deployment log entry
          ansible.builtin.lineinfile:
            path: /var/log/deployment.log
            line: >-
              {{ ansible_date_time.iso8601 }}
              host={{ inventory_hostname }}
              version={{ app_version }}
              status={{ deploy_status | default('UNKNOWN') }}
              duration={{ deploy_duration }}s
              {{ 'error=' + deploy_error if deploy_error is defined else '' }}
            create: true

        - name: Send deployment report
          ansible.builtin.uri:
            url: "{{ monitoring_webhook }}"
            method: POST
            body_format: json
            body:
              host: "{{ inventory_hostname }}"
              version: "{{ app_version }}"
              status: "{{ deploy_status | default('UNKNOWN') }}"
              duration_seconds: "{{ deploy_duration | int }}"
              error: "{{ deploy_error | default(omit) }}"
          ignore_errors: true
```

## Network Resource Cleanup

When working with cloud APIs, always close sessions and release resources.

```yaml
# API session management
---
- name: Cloud resource management
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Manage cloud resources
      block:
        - name: Authenticate to cloud API
          ansible.builtin.uri:
            url: "https://api.cloud.example.com/auth/token"
            method: POST
            body_format: json
            body:
              client_id: "{{ vault_client_id }}"
              client_secret: "{{ vault_client_secret }}"
          register: auth_response

        - name: Set auth token
          ansible.builtin.set_fact:
            api_token: "{{ auth_response.json.access_token }}"

        - name: Create resources
          ansible.builtin.uri:
            url: "https://api.cloud.example.com/v1/instances"
            method: POST
            headers:
              Authorization: "Bearer {{ api_token }}"
            body_format: json
            body:
              name: "worker-{{ item }}"
              type: "small"
          loop: "{{ range(1, 4) | list }}"

      rescue:
        - name: Resource creation failed
          ansible.builtin.debug:
            msg: "Failed to create some resources, cleaning up"

      always:
        - name: Revoke API token
          ansible.builtin.uri:
            url: "https://api.cloud.example.com/auth/revoke"
            method: POST
            headers:
              Authorization: "Bearer {{ api_token }}"
          when: api_token is defined
          ignore_errors: true

        - name: Clear token from memory
          ansible.builtin.set_fact:
            api_token: "REVOKED"
          when: api_token is defined
```

## always Without rescue

You do not need a rescue section to use always. The `block` and `always` combination is valid on its own.

```yaml
# Block with always but no rescue
---
- name: Cleanup without recovery
  hosts: all
  become: true

  tasks:
    - name: File processing
      block:
        - name: Download large dataset
          ansible.builtin.get_url:
            url: "{{ dataset_url }}"
            dest: /tmp/dataset.csv

        - name: Process dataset
          ansible.builtin.command:
            cmd: /opt/tools/process_data.py /tmp/dataset.csv

      always:
        - name: Remove downloaded dataset (save disk space)
          ansible.builtin.file:
            path: /tmp/dataset.csv
            state: absent
```

Without a rescue section, if a block task fails, the always section runs and then the play fails for that host. The always section guarantees cleanup, but it does not suppress the error.

## Defensive always Tasks

Since always tasks must run reliably, write them defensively. Use `ignore_errors` and check that variables exist before using them.

```yaml
# Defensive always section
---
- name: Robust cleanup
  hosts: all
  become: true

  tasks:
    - name: Complex operation
      block:
        - name: Create resources
          ansible.builtin.command:
            cmd: /opt/scripts/create-resources.sh
          register: created_resources

      always:
        # Check if variable exists before using it
        - name: Clean up created resources
          ansible.builtin.command:
            cmd: "/opt/scripts/cleanup.sh {{ created_resources.stdout }}"
          when:
            - created_resources is defined
            - created_resources is success
            - created_resources.stdout | length > 0
          ignore_errors: true

        # This runs even if cleanup fails
        - name: Final status log
          ansible.builtin.debug:
            msg: "Operation complete on {{ inventory_hostname }}"
```

The `always` block is your guarantee that critical cleanup, logging, and state restoration happens regardless of what went wrong in your playbook. Use it anywhere you create temporary resources, acquire locks, stop services, or need to report on outcomes. It is the foundation of reliable Ansible automation that does not leave your infrastructure in an inconsistent state when things go sideways.
