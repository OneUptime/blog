# How to Retry Failed Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Retry, DevOps

Description: Learn multiple strategies for retrying failed Ansible playbooks including retry files, task-level retries, and wrapper scripts.

---

Playbooks fail. Sometimes it is a transient network issue, sometimes a package mirror is temporarily down, sometimes a cloud API throttles your requests. The question is not whether your playbooks will fail, but how you recover from failures efficiently. Ansible gives you several mechanisms for retrying failed runs, from built-in retry files to task-level retry loops and external wrapper scripts.

## Task-Level Retries with until/retries/delay

The most granular retry mechanism is at the task level. You register the task result and use `until`, `retries`, and `delay` to keep trying.

This playbook demonstrates retry patterns for common flaky operations:

```yaml
# task-retries.yml - Task-level retry examples
---
- name: Demonstrate task-level retries
  hosts: webservers
  tasks:
    - name: Download artifact from sometimes-flaky mirror
      ansible.builtin.get_url:
        url: https://releases.example.com/myapp-latest.tar.gz
        dest: /tmp/myapp-latest.tar.gz
        timeout: 30
      register: download_result
      retries: 5            # Try up to 5 times
      delay: 10             # Wait 10 seconds between retries
      until: download_result is succeeded

    - name: Wait for application to become healthy after restart
      ansible.builtin.uri:
        url: http://localhost:8080/health
        status_code: 200
      register: health_check
      retries: 30
      delay: 5
      until: health_check.status == 200

    - name: Install package (retrying on lock contention)
      ansible.builtin.apt:
        name: nginx
        state: present
      become: true
      register: apt_result
      retries: 3
      delay: 30
      until: apt_result is succeeded
```

## Using Retry Files (--retry)

When an Ansible playbook fails, it creates a `.retry` file containing the hostnames of failed hosts. You can rerun the playbook targeting only those hosts.

Here is the workflow:

```bash
# Run the original playbook
ansible-playbook deploy.yml

# If it fails, Ansible creates deploy.retry with failed hosts
# The file looks like:
# web3.example.com
# web7.example.com

# Rerun targeting only the failed hosts
ansible-playbook deploy.yml --limit @deploy.retry
```

You can control retry file behavior in `ansible.cfg`:

```ini
# ansible.cfg - Retry file configuration
[defaults]
# Enable or disable retry file creation
retry_files_enabled = True

# Where to save retry files (default is same directory as playbook)
retry_files_save_path = /tmp/ansible-retries
```

## Building a Wrapper Script for Automatic Retries

For CI/CD pipelines, you might want automatic retries of the entire playbook. Here is a bash wrapper that handles this:

```bash
#!/bin/bash
# run-with-retry.sh - Wrapper script that retries failed playbooks
# Usage: ./run-with-retry.sh playbook.yml [additional ansible-playbook args]

PLAYBOOK=$1
shift
EXTRA_ARGS="$@"
MAX_RETRIES=3
RETRY_DELAY=30

for attempt in $(seq 1 $MAX_RETRIES); do
    echo "=== Attempt $attempt of $MAX_RETRIES ==="

    if [ $attempt -eq 1 ]; then
        # First run: target all hosts
        ansible-playbook "$PLAYBOOK" $EXTRA_ARGS
    else
        # Subsequent runs: target only failed hosts from retry file
        RETRY_FILE="${PLAYBOOK%.yml}.retry"
        if [ -f "$RETRY_FILE" ]; then
            echo "Retrying failed hosts from $RETRY_FILE"
            sleep $RETRY_DELAY
            ansible-playbook "$PLAYBOOK" --limit "@$RETRY_FILE" $EXTRA_ARGS
        else
            echo "No retry file found, all hosts succeeded"
            exit 0
        fi
    fi

    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
        echo "Playbook succeeded on attempt $attempt"
        exit 0
    fi

    echo "Attempt $attempt failed with exit code $EXIT_CODE"
done

echo "All $MAX_RETRIES attempts failed"
exit 1
```

## Retry with Exponential Backoff

For tasks that fail due to rate limiting or resource contention, exponential backoff is better than a fixed delay.

Ansible does not natively support exponential backoff, but you can implement it:

```yaml
# exponential-backoff.yml - Implementing exponential backoff for retries
---
- name: API call with exponential backoff
  hosts: localhost
  gather_facts: false
  vars:
    max_retries: 5
    base_delay: 2
  tasks:
    - name: Call rate-limited API with backoff
      ansible.builtin.uri:
        url: https://api.example.com/v1/deploy
        method: POST
        body_format: json
        body:
          action: deploy
          version: "2.0.1"
        status_code: [200, 201]
        timeout: 30
      register: api_result
      retries: "{{ max_retries }}"
      delay: "{{ base_delay }}"
      until: api_result.status in [200, 201]
      # Note: Ansible's built-in delay is fixed, not exponential
      # For true exponential backoff, use the shell approach below

    - name: True exponential backoff using shell
      ansible.builtin.shell: |
        # Attempt the API call with curl
        RESPONSE=$(curl -s -o /tmp/api_response.json -w "%{http_code}" \
          -X POST \
          -H "Content-Type: application/json" \
          -d '{"action": "deploy", "version": "2.0.1"}' \
          https://api.example.com/v1/deploy)

        if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "201" ]; then
          echo "SUCCESS: HTTP $RESPONSE"
          exit 0
        elif [ "$RESPONSE" = "429" ]; then
          echo "RATE_LIMITED: HTTP $RESPONSE"
          exit 1
        else
          echo "FAILED: HTTP $RESPONSE"
          exit 2
        fi
      register: backoff_result
      retries: 5
      delay: "{{ item }}"
      until: backoff_result.rc == 0
      loop: [2, 4, 8, 16, 32]  # Exponential delays
      when: backoff_result is not defined or backoff_result.rc != 0
```

## Block-Level Retry Pattern

You can retry a group of tasks using `block` and a workaround with `include_tasks`.

Create a task file that contains the block you want to retry:

```yaml
# tasks/deploy-block.yml - Tasks that should be retried as a group
---
- name: Pull latest code
  ansible.builtin.git:
    repo: https://github.com/myorg/myapp.git
    dest: /opt/myapp
    version: "{{ app_version }}"

- name: Install dependencies
  ansible.builtin.pip:
    requirements: /opt/myapp/requirements.txt
    virtualenv: /opt/myapp/venv

- name: Run database migrations
  ansible.builtin.shell: |
    cd /opt/myapp
    source venv/bin/activate
    python manage.py migrate --no-input
  become: true
  become_user: appuser
```

Then call it with retries:

```yaml
# deploy-with-block-retry.yml - Retry an entire block of tasks
---
- name: Deploy with block retry
  hosts: appservers
  tasks:
    - name: Attempt deployment (with retries)
      ansible.builtin.include_tasks: tasks/deploy-block.yml
      register: deploy_attempt
      retries: 3
      delay: 30
      until: deploy_attempt is succeeded
```

## Selective Retry Based on Error Type

Not all errors should be retried. A permission error will fail every time, but a network timeout might succeed on retry. Here is how to be selective:

```yaml
# selective-retry.yml - Only retry specific error types
---
- name: Selective retry based on error type
  hosts: webservers
  tasks:
    - name: Download application binary
      ansible.builtin.get_url:
        url: "{{ download_url }}"
        dest: /opt/myapp/bin/myapp
        mode: '0755'
        timeout: 30
      register: download
      retries: 5
      delay: 15
      until: >
        download is succeeded or
        ('permission denied' in (download.msg | default('') | lower)) or
        ('404' in (download.msg | default('')))
      # This retries on network errors but stops on permission or 404 errors

    - name: Check if download failed permanently
      ansible.builtin.fail:
        msg: "Download failed with non-retryable error: {{ download.msg }}"
      when: download is failed
```

## Retry Strategy for Multi-Host Deployments

When deploying to many hosts, some might fail while others succeed. Here is a strategy that handles partial failures:

```yaml
# multi-host-retry.yml - Handle partial failures across many hosts
---
- name: Deploy to fleet with failure tolerance
  hosts: webservers
  serial: "30%"          # Deploy to 30% of hosts at a time
  max_fail_percentage: 10  # Allow up to 10% failures per batch
  tasks:
    - name: Deploy application
      block:
        - name: Stop old version
          ansible.builtin.systemd:
            name: myapp
            state: stopped
          become: true

        - name: Deploy new version
          ansible.builtin.copy:
            src: /releases/myapp-{{ version }}/
            dest: /opt/myapp/
          become: true

        - name: Start new version
          ansible.builtin.systemd:
            name: myapp
            state: started
          become: true

        - name: Verify health
          ansible.builtin.uri:
            url: http://localhost:8080/health
          register: health
          retries: 12
          delay: 5
          until: health.status == 200

      rescue:
        - name: Rollback on failure
          ansible.builtin.shell: |
            # Restore previous version
            cp -r /opt/myapp.backup/* /opt/myapp/
            systemctl restart myapp
          become: true

        - name: Mark host as failed
          ansible.builtin.fail:
            msg: "Deployment failed on {{ inventory_hostname }}, rolled back"
```

After running, use the retry file to attempt the failed hosts again:

```bash
# After the playbook completes with some failures
ansible-playbook multi-host-retry.yml --limit @multi-host-retry.retry -e version=2.0.1
```

## Summary

Retrying failed Ansible playbooks requires a layered approach. Use task-level `retries`/`delay`/`until` for individual flaky operations, retry files with `--limit` for re-running against failed hosts, wrapper scripts for CI/CD automation, and `serial` with `max_fail_percentage` for fleet deployments. The right retry strategy depends on your failure mode: transient network issues deserve automatic retries, while configuration errors need investigation before retrying. Build your playbooks so they are idempotent (safe to run multiple times), which makes retrying always safe.
