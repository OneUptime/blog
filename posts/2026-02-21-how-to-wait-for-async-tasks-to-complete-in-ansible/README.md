# How to Wait for Async Tasks to Complete in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Async, Task Management, DevOps

Description: Learn how to properly wait for asynchronous tasks to complete in Ansible using async_status, retries, and until loops.

---

When you fire off async tasks in Ansible with `poll: 0`, those tasks run in the background on the remote host. At some point, you need to check whether they finished successfully, failed, or timed out. The `async_status` module is your tool for this. Combined with `until` loops and proper error handling, it gives you full control over async task lifecycle management.

## The async_status Module

The `async_status` module queries the status of an async task using its job ID. Every async task returns an `ansible_job_id` when launched, which you use as the identifier.

```yaml
# basic-async-status.yml - Launch and wait for a single task
---
- name: Run and wait for async task
  hosts: all
  become: yes

  tasks:
    - name: Start long-running system update
      apt:
        upgrade: dist
        update_cache: yes
      async: 3600  # 1 hour max
      poll: 0      # Fire and forget
      register: update_job

    - name: Wait for system update to complete
      async_status:
        jid: "{{ update_job.ansible_job_id }}"
      register: update_result
      until: update_result.finished
      retries: 120   # Number of times to check
      delay: 30      # Seconds between checks
      # Total max wait: 120 * 30 = 3600 seconds (1 hour)
```

The `until` loop keeps calling `async_status` until the `.finished` attribute is `1` (truthy). The `retries` and `delay` parameters control how long and how often to check.

## Understanding async_status Return Values

The `async_status` module returns several useful fields:

```yaml
# inspect-status.yml - Show all async_status fields
---
- name: Inspect async status details
  hosts: all

  tasks:
    - name: Start a background command
      command: sleep 30 && echo "done"
      async: 120
      poll: 0
      register: bg_job

    - name: Check status immediately
      async_status:
        jid: "{{ bg_job.ansible_job_id }}"
      register: job_status
      ignore_errors: yes

    - name: Display status details
      debug:
        msg:
          - "Job ID: {{ bg_job.ansible_job_id }}"
          - "Finished: {{ job_status.finished }}"
          - "Started: {{ job_status.started | default('unknown') }}"
          - "Results file: {{ job_status.results_file | default('unknown') }}"
```

When a task is still running, `finished` is 0. When it completes (success or failure), `finished` is 1. The rest of the return data depends on the module that was run asynchronously.

## Waiting for Multiple Async Tasks

The most common pattern is launching several tasks in parallel and then waiting for all of them:

```yaml
# multi-async-wait.yml - Launch parallel tasks and wait for all
---
- name: Parallel operations with async
  hosts: all
  become: yes

  tasks:
    # Launch all tasks in parallel
    - name: Download application package
      get_url:
        url: https://releases.example.com/myapp-v2.tar.gz
        dest: /tmp/myapp-v2.tar.gz
      async: 600
      poll: 0
      register: download_job

    - name: Compile extension module
      command: make -j4 extension
      args:
        chdir: /opt/source
      async: 1200
      poll: 0
      register: compile_job

    - name: Generate SSL certificates
      command: /opt/scripts/generate-certs.sh
      async: 300
      poll: 0
      register: certs_job

    # Wait for each task to complete
    - name: Wait for download
      async_status:
        jid: "{{ download_job.ansible_job_id }}"
      register: download_result
      until: download_result.finished
      retries: 40
      delay: 15

    - name: Wait for compilation
      async_status:
        jid: "{{ compile_job.ansible_job_id }}"
      register: compile_result
      until: compile_result.finished
      retries: 80
      delay: 15

    - name: Wait for certificate generation
      async_status:
        jid: "{{ certs_job.ansible_job_id }}"
      register: certs_result
      until: certs_result.finished
      retries: 20
      delay: 15

    - name: Proceed with deployment
      debug:
        msg: "All background tasks completed. Starting deployment."
```

## Waiting for Loop-Based Async Tasks

When you launch async tasks in a loop, you need to wait for each one:

```yaml
# async-loop-wait.yml - Async tasks in a loop with waiting
---
- name: Download and process multiple datasets
  hosts: data_servers

  vars:
    datasets:
      - name: users
        url: https://data.example.com/users.csv.gz
        dest: /opt/data/users.csv.gz
      - name: transactions
        url: https://data.example.com/transactions.csv.gz
        dest: /opt/data/transactions.csv.gz
      - name: products
        url: https://data.example.com/products.csv.gz
        dest: /opt/data/products.csv.gz

  tasks:
    - name: Download all datasets in parallel
      get_url:
        url: "{{ item.url }}"
        dest: "{{ item.dest }}"
      loop: "{{ datasets }}"
      async: 600
      poll: 0
      register: download_jobs

    - name: Wait for all downloads to complete
      async_status:
        jid: "{{ item.ansible_job_id }}"
      register: download_results
      until: download_results.finished
      retries: 40
      delay: 15
      loop: "{{ download_jobs.results }}"
      loop_control:
        label: "{{ item.item.name }}"

    - name: Verify all downloads succeeded
      assert:
        that:
          - item.finished == 1
          - item.failed is not defined or item.failed == false
        fail_msg: "Download of {{ item.item.item.name }} failed"
      loop: "{{ download_results.results }}"
      loop_control:
        label: "{{ item.item.item.name }}"
```

## Error Handling for Async Waits

Async tasks can fail in several ways. Handle each case:

```yaml
# async-error-handling.yml - Comprehensive error handling
---
- name: Async with full error handling
  hosts: all
  become: yes

  tasks:
    - name: Start database migration
      command: /opt/myapp/bin/migrate --all
      async: 1800
      poll: 0
      register: migration_job

    - name: Wait for migration to complete
      async_status:
        jid: "{{ migration_job.ansible_job_id }}"
      register: migration_result
      until: migration_result.finished
      retries: 60
      delay: 30
      failed_when: false  # We will handle errors ourselves

    - name: Handle migration timeout
      block:
        - name: Log timeout
          debug:
            msg: "Migration timed out after 30 minutes on {{ inventory_hostname }}"

        - name: Kill the background process
          async_status:
            jid: "{{ migration_job.ansible_job_id }}"
            mode: cleanup
          ignore_errors: yes

        - name: Send alert for timeout
          uri:
            url: "{{ alert_webhook }}"
            method: POST
            body_format: json
            body:
              text: "Migration timeout on {{ inventory_hostname }}"
      when: not migration_result.finished

    - name: Handle migration failure
      block:
        - name: Log failure details
          debug:
            msg: "Migration failed: {{ migration_result.stderr | default('No error output') }}"

        - name: Run rollback
          command: /opt/myapp/bin/migrate --rollback
      when:
        - migration_result.finished
        - migration_result.rc is defined
        - migration_result.rc != 0

    - name: Handle migration success
      debug:
        msg: "Migration completed successfully on {{ inventory_hostname }}"
      when:
        - migration_result.finished
        - migration_result.rc is defined
        - migration_result.rc == 0
```

## Cleaning Up Async Jobs

You can clean up async job status files using the `cleanup` mode:

```yaml
# async-cleanup.yml - Clean up after async jobs
---
- name: Clean up async jobs
  hosts: all

  tasks:
    - name: Start background task
      command: /opt/scripts/long-task.sh
      async: 3600
      poll: 0
      register: bg_job

    - name: Wait for task
      async_status:
        jid: "{{ bg_job.ansible_job_id }}"
      register: bg_result
      until: bg_result.finished
      retries: 120
      delay: 30

    - name: Clean up job status file
      async_status:
        jid: "{{ bg_job.ansible_job_id }}"
        mode: cleanup

    # Or clean up all old async job files
    - name: Remove old async status files
      find:
        paths: ~/.ansible_async
        age: 1d
      register: old_async_files

    - name: Delete old async files
      file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_async_files.files }}"
```

## Real-World Example: Rolling Deployment with Async

Here is a practical deployment that uses async for the slow parts:

```yaml
# rolling-async-deploy.yml - Speed up deployment with async
---
- name: Rolling deployment with async tasks
  hosts: webservers
  serial: 5
  become: yes

  vars:
    app_version: "3.1.0"

  tasks:
    - name: Remove from load balancer
      uri:
        url: "http://lb.example.com/api/remove/{{ inventory_hostname }}"
        method: POST
      delegate_to: localhost

    # Start the slow download while we do other tasks
    - name: Download new release (async)
      get_url:
        url: "https://releases.example.com/myapp-{{ app_version }}.tar.gz"
        dest: "/tmp/myapp-{{ app_version }}.tar.gz"
        checksum: "sha256:{{ release_checksum }}"
      async: 300
      poll: 0
      register: download_job

    # Do prep work while download runs
    - name: Stop application gracefully
      systemd:
        name: myapp
        state: stopped

    - name: Backup current version
      archive:
        path: /opt/myapp/current
        dest: "/opt/myapp/backups/myapp-backup-{{ ansible_date_time.iso8601 }}.tar.gz"

    - name: Clean deployment directory
      file:
        path: /opt/myapp/current
        state: absent

    # Now wait for the download that has been running in parallel
    - name: Wait for download to complete
      async_status:
        jid: "{{ download_job.ansible_job_id }}"
      register: download_result
      until: download_result.finished
      retries: 30
      delay: 10

    - name: Extract new release
      unarchive:
        src: "/tmp/myapp-{{ app_version }}.tar.gz"
        dest: /opt/myapp/current
        remote_src: yes

    - name: Start application
      systemd:
        name: myapp
        state: started

    - name: Wait for health check
      uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        status_code: 200
      retries: 10
      delay: 5
      register: health
      until: health.status == 200

    - name: Add back to load balancer
      uri:
        url: "http://lb.example.com/api/add/{{ inventory_hostname }}"
        method: POST
      delegate_to: localhost
```

## Calculating Retry and Delay Values

The total wait time is `retries * delay` seconds. Here is a helper for calculating these values:

```yaml
# Calculate appropriate retry settings
# Formula: retries = max_wait_seconds / delay
#
# Example scenarios:
# - 5 minute task:   retries: 30,  delay: 10  (300s total)
# - 30 minute task:  retries: 60,  delay: 30  (1800s total)
# - 1 hour task:     retries: 120, delay: 30  (3600s total)
# - 4 hour task:     retries: 240, delay: 60  (14400s total)
```

A good rule is to set `delay` to something that does not hammer the remote host (10-60 seconds) and calculate `retries` from your expected maximum runtime.

## Summary

Waiting for async tasks in Ansible revolves around the `async_status` module combined with `until` loops. Launch tasks with `poll: 0`, register the job ID, and then use `async_status` with `until: result.finished` to wait. Handle timeouts, failures, and successes explicitly. For parallel operations, launch everything first and then wait for all jobs sequentially. Clean up async status files when you are done to avoid clutter on the remote host.
