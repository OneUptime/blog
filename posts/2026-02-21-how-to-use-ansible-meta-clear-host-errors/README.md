# How to Use Ansible meta clear_host_errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Meta, Error Recovery, Host Management

Description: Learn how to use Ansible meta clear_host_errors to reset the failure state of hosts and allow them to continue executing tasks.

---

When an Ansible task fails on a host, that host is typically marked as failed and removed from the list of active hosts for the rest of the play. If a host is unreachable, Ansible marks it as `UNREACHABLE` and removes it from active execution as well. The `meta: clear_host_errors` directive clears the failed state for hosts in the play, making them available for targeting in subsequent plays. It does not make a failed host resume execution later in the same play.

## Understanding Host Error State

To understand why `clear_host_errors` exists, you need to know how Ansible tracks host failures. By default, a failed task stops execution for that host while the play continues on other hosts. Features like `max_fail_percentage` or `any_errors_fatal` can make those failures stop a batch or the entire play. A task that uses `ignore_errors: true` continues and is not counted as a failed host, so `clear_host_errors` is mainly useful after Ansible has actually marked a host failed or unreachable.

```yaml
# Scenario where host error state matters

---
- name: Demonstrate host error tracking
  hosts: all
  become: true
  max_fail_percentage: 50  # Stop if more than 50% of hosts fail

  tasks:
    - name: Task that might fail on some hosts
      ansible.builtin.command:
        cmd: /opt/app/check.sh
      register: check_result

    # Hosts where the task failed stop executing this play.
    # This meta task clears their failed state for later plays.
    - name: Clear failed hosts for a follow-up play
      ansible.builtin.meta: clear_host_errors

- name: Follow-up play can target hosts again
  hosts: all
  become: true

  tasks:
    - name: Continue with follow-up deployment work
      ansible.builtin.debug:
        msg: "Proceeding on {{ inventory_hostname }}"
```

## Basic clear_host_errors Usage

Here is a straightforward example showing when and how to use this directive.

```yaml
# Basic clear_host_errors
---
- name: Recovery workflow
  hosts: webservers
  become: true

  tasks:
    - name: Try primary configuration
      ansible.builtin.template:
        src: primary.conf.j2
        dest: /etc/app/config.conf
      register: primary_config

    - name: Clear host errors for the recovery play
      ansible.builtin.meta: clear_host_errors

- name: Recovery workflow follow-up
  hosts: webservers
  become: true

  tasks:
    - name: Apply fallback configuration if needed
      ansible.builtin.template:
        src: fallback.conf.j2
        dest: /etc/app/config.conf

    - name: Continue with remaining setup
      ansible.builtin.systemd:
        name: app
        state: restarted
```

Without `clear_host_errors`, hosts where the primary config failed would still carry that failed state and would not be targeted by later plays in the same run. Clearing the errors lets the follow-up recovery play target those hosts again.

## Use Case: Retry Patterns

When implementing retry logic, the built-in `retries` and `until` parameters are usually the right tool within a single play. Use `clear_host_errors` only when a host has already been marked failed or unreachable and you want a later play to try it again.

```yaml
# Manual retry pattern with clear_host_errors
---
- name: Service startup with retries
  hosts: all
  become: true

  tasks:
    - name: Attempt 1 - Start service
      ansible.builtin.systemd:
        name: myapp
        state: started
      register: start_attempt_1

    - name: Clear failed hosts for the retry play
      ansible.builtin.meta: clear_host_errors

- name: Service startup retry
  hosts: all
  become: true

  tasks:
    - name: Wait before retry
      ansible.builtin.pause:
        seconds: 10

    - name: Attempt 2 - Fix common issue and retry
      block:
        - name: Fix permissions (common cause of startup failure)
          ansible.builtin.file:
            path: /opt/myapp/data
            state: directory
            owner: myapp
            group: myapp
            mode: '0755'
            recurse: true

        - name: Start service (second attempt)
          ansible.builtin.systemd:
            name: myapp
            state: started
          register: start_attempt_2

    - name: Final status check
      ansible.builtin.systemd:
        name: myapp
      register: final_status

    - name: Report final state
      ansible.builtin.debug:
        msg: "Service myapp is {{ final_status.status.ActiveState }} on {{ inventory_hostname }}"
```

## Use Case: Multi-Stage Pipeline

In a multi-stage deployment pipeline, a failure in an optional early stage should not prevent required later stages from running. For optional tasks in the same play, use `ignore_errors`, `failed_when`, or a `block` with `rescue`; `clear_host_errors` is only needed if a previous play marked hosts failed and a later play should target them again.

```yaml
# Multi-stage pipeline with error clearing
---
- name: Deployment pipeline
  hosts: app_servers
  become: true

  tasks:
    # Stage 1: Optional pre-deployment tasks
    - name: Run pre-deployment smoke tests
      ansible.builtin.command:
        cmd: /opt/app/smoke-tests.sh
      register: smoke_tests
      ignore_errors: true

    - name: Log smoke test results
      ansible.builtin.debug:
        msg: "Smoke tests {{ 'PASSED' if smoke_tests is success else 'FAILED (non-blocking)' }}"

    # Stage 2: Required deployment
    - name: Deploy application
      ansible.builtin.copy:
        src: "app-{{ version }}.jar"
        dest: /opt/app/app.jar

    - name: Restart application
      ansible.builtin.systemd:
        name: app
        state: restarted

    # Stage 3: Optional post-deployment tasks
    - name: Run integration tests
      ansible.builtin.command:
        cmd: /opt/app/integration-tests.sh
      register: integration_tests
      ignore_errors: true

    # Stage 4: Required verification
    - name: Verify deployment
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        status_code: 200
      retries: 5
      delay: 3
```

## Use Case: Working with any_errors_fatal

When `any_errors_fatal: true` is set, any single host failure stops the entire play after the fatal task completes for the current batch. Use a `block` with `rescue` for expected, recoverable failures; `clear_host_errors` is not a way to prevent `any_errors_fatal` from stopping the current play.

```yaml
# Handle expected failures with any_errors_fatal
---
- name: Strict deployment with exception handling
  hosts: app_servers
  become: true
  any_errors_fatal: true

  tasks:
    - name: Check if host is a canary
      ansible.builtin.set_fact:
        is_canary: "{{ 'canary' in group_names }}"

    - name: Apply configuration with canary rescue
      block:
        - name: Apply configuration
          ansible.builtin.template:
            src: config.j2
            dest: /etc/app/config.yml
      rescue:
        - name: Revert canary to safe config
          ansible.builtin.template:
            src: config-safe.j2
            dest: /etc/app/config.yml
          when: is_canary | bool

        - name: Fail non-canary hosts
          ansible.builtin.fail:
            msg: "Configuration failed on a non-canary host"
          when: not is_canary | bool

    # This task runs if the failure was recovered in the rescue section
    - name: Restart application
      ansible.builtin.systemd:
        name: app
        state: restarted
```

## Use Case: Dynamic Inventory Health Recovery

When working with dynamic inventory where hosts might be temporarily unreachable, use `clear_host_errors` to give them another chance in a later play.

```yaml
# Give unreachable hosts a second chance
---
- name: Resilient deployment
  hosts: all
  become: true
  gather_facts: false

  tasks:
    - name: First connection attempt
      ansible.builtin.ping:

    - name: Clear errors from unreachable hosts
      ansible.builtin.meta: clear_host_errors

- name: Resilient deployment retry
  hosts: all
  become: true
  gather_facts: false

  tasks:
    - name: Wait for potentially booting hosts
      ansible.builtin.pause:
        seconds: 30

    - name: Second connection attempt
      ansible.builtin.ping:
      register: second_ping
      ignore_unreachable: true

    - name: Gather facts on reachable hosts
      ansible.builtin.setup:
      when: second_ping is not unreachable

    - name: Proceed with deployment on reachable hosts
      ansible.builtin.debug:
        msg: "Deploying to {{ inventory_hostname }}"
      when: second_ping is not unreachable
```

## Combining with Strategy Plugins

The `clear_host_errors` directive has important strategy-plugin caveats. The `ansible.builtin.meta` documentation notes that some meta actions bypass the host loop and do not work normally outside lockstep strategies, so avoid relying on `clear_host_errors` as a synchronization mechanism with the `free` strategy.

```yaml
# Using clear_host_errors with the default lockstep strategy
---
- name: Lockstep strategy with error recovery
  hosts: all
  become: true

  tasks:
    - name: Preflight task that might fail
      ansible.builtin.command:
        cmd: /opt/app/quick-check.sh
      register: quick_check

    - name: Clear failed hosts for the next play
      ansible.builtin.meta: clear_host_errors

- name: Continue after error recovery
  hosts: all
  become: true

  tasks:
    - name: Gather fresh data
      ansible.builtin.setup:
        gather_subset:
          - min

    - name: Continue with main tasks
      ansible.builtin.debug:
        msg: "Host is participating in the follow-up play"
```

## Important Caveats

There are some limitations and behaviors to be aware of:

1. `clear_host_errors` clears failed state for hosts specified in the play's host list
2. It clears the internal failure counter but does not change registered variable states
3. It does not make unreachable hosts reachable
4. The registered `failed` state of individual tasks remains unchanged
5. It makes failed hosts available for subsequent plays, but it does not make them continue later tasks in the current play

```yaml
# Registered states persist after clear_host_errors
---
- name: Demonstrate state persistence
  hosts: all
  gather_facts: false

  tasks:
    - name: This will fail
      ansible.builtin.command:
        cmd: /bin/false
      register: failed_task
      ignore_errors: true

    - name: Clear host errors
      ansible.builtin.meta: clear_host_errors

    # The host continues because ignore_errors was used, but the registered
    # variable still shows the task result.
    - name: Check registered state (still shows failed)
      ansible.builtin.debug:
        msg: "failed_task.failed is still {{ failed_task.failed }}"
```

The `meta: clear_host_errors` directive is a recovery tool for complex playbook scenarios. It is not something you use in every playbook, and it is not a replacement for `ignore_errors`, `failed_when`, retries, or `block`/`rescue` error handling. Use it when Ansible has marked hosts failed or unreachable and you want later plays in the same run to target those hosts again.
