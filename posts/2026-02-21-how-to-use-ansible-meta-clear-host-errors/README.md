# How to Use Ansible meta clear_host_errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Meta, Error Recovery, Host Management

Description: Learn how to use Ansible meta clear_host_errors to reset the failure state of hosts and allow them to continue executing tasks.

---

When an Ansible task fails on a host, that host is typically marked as failed and removed from the list of active hosts for the rest of the play. Even if you use `ignore_errors: true`, the host retains an internal failure counter. In some strategies (like `free`), hosts can end up in a failed state that prevents them from continuing. The `meta: clear_host_errors` directive resets this failure tracking, giving the host a clean slate to continue executing tasks.

## Understanding Host Error State

To understand why `clear_host_errors` exists, you need to know how Ansible tracks host failures. When using features like `max_fail_percentage` or `any_errors_fatal`, Ansible keeps a counter of which hosts have failed. Even with `ignore_errors`, this internal tracking can cause problems.

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
      ignore_errors: true

    # Even with ignore_errors, the host is tracked as having an error
    # If too many hosts have errors, the play could stop

    - name: Clear the error state
      ansible.builtin.meta: clear_host_errors

    # Now the hosts start fresh from an error-tracking perspective
    - name: Continue with deployment
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
      ignore_errors: true

    - name: Apply fallback configuration where primary failed
      ansible.builtin.template:
        src: fallback.conf.j2
        dest: /etc/app/config.conf
      when: primary_config is failed

    - name: Clear host errors after handling failures
      ansible.builtin.meta: clear_host_errors

    - name: Continue with remaining setup (all hosts participate)
      ansible.builtin.systemd:
        name: app
        state: restarted
```

Without `clear_host_errors`, hosts where the primary config failed would still carry that failure state, even though you handled it with the fallback config. Clearing the errors ensures those hosts are treated as fully healthy going forward.

## Use Case: Retry Patterns

When implementing retry logic without the built-in `retries` parameter, `clear_host_errors` lets you reset between attempts.

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
      ignore_errors: true

    - name: Wait before retry
      ansible.builtin.pause:
        seconds: 10
      when: start_attempt_1 is failed

    - name: Clear errors from first attempt
      ansible.builtin.meta: clear_host_errors

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
          when: start_attempt_1 is failed

        - name: Start service (second attempt)
          ansible.builtin.systemd:
            name: myapp
            state: started
          when: start_attempt_1 is failed
          register: start_attempt_2
          ignore_errors: true

    - name: Clear errors from second attempt
      ansible.builtin.meta: clear_host_errors

    - name: Final status check
      ansible.builtin.systemd:
        name: myapp
      register: final_status

    - name: Report final state
      ansible.builtin.debug:
        msg: "Service myapp is {{ final_status.status.ActiveState }} on {{ inventory_hostname }}"
```

## Use Case: Multi-Stage Pipeline

In a multi-stage deployment pipeline, a failure in an optional early stage should not prevent required later stages from running.

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

    - name: Clear any errors from optional stage
      ansible.builtin.meta: clear_host_errors

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

    - name: Clear errors from optional post-deployment stage
      ansible.builtin.meta: clear_host_errors

    # Stage 4: Required verification
    - name: Verify deployment
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        status_code: 200
      retries: 5
      delay: 3
```

## Use Case: Working with any_errors_fatal

When `any_errors_fatal: true` is set, any single host failure stops the entire play. But sometimes you want to handle certain expected failures without stopping everything.

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

    # This might fail on canary hosts testing new config
    - name: Apply configuration
      ansible.builtin.template:
        src: config.j2
        dest: /etc/app/config.yml
      register: config_result
      ignore_errors: "{{ is_canary | bool }}"

    # For canary hosts, revert to safe config if new one failed
    - name: Revert canary to safe config
      ansible.builtin.template:
        src: config-safe.j2
        dest: /etc/app/config.yml
      when:
        - is_canary | bool
        - config_result is failed

    # Clear errors so canary failures do not trigger any_errors_fatal
    - name: Clear host errors
      ansible.builtin.meta: clear_host_errors

    # Now this task runs on all hosts, including canary hosts that had errors
    - name: Restart application
      ansible.builtin.systemd:
        name: app
        state: restarted
```

## Use Case: Dynamic Inventory Health Recovery

When working with dynamic inventory where hosts might be temporarily unreachable, use `clear_host_errors` to give them another chance.

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
      register: first_ping
      ignore_unreachable: true

    - name: Log unreachable hosts
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} was unreachable on first attempt"
      when: first_ping is unreachable

    - name: Wait for potentially booting hosts
      ansible.builtin.pause:
        seconds: 30
      when: first_ping is unreachable

    - name: Clear errors from unreachable hosts
      ansible.builtin.meta: clear_host_errors

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

The `clear_host_errors` directive is especially important when using the `free` strategy, where hosts can get out of sync.

```yaml
# Using clear_host_errors with free strategy
---
- name: Free strategy with error recovery
  hosts: all
  become: true
  strategy: free

  tasks:
    - name: Fast parallel task (might fail on slow hosts)
      ansible.builtin.command:
        cmd: /opt/app/quick-check.sh
      register: quick_check
      ignore_errors: true

    - name: Clear errors to keep all hosts in the game
      ansible.builtin.meta: clear_host_errors

    - name: Synchronization point - gather fresh data
      ansible.builtin.setup:
        gather_subset:
          - min

    - name: Continue with main tasks
      ansible.builtin.debug:
        msg: "All hosts are synchronized and continuing"
```

## Important Caveats

There are some limitations and behaviors to be aware of:

1. `clear_host_errors` is a play-level action that affects all hosts in the current play
2. It clears the internal failure counter but does not change registered variable states
3. It does not make unreachable hosts reachable
4. The registered `failed` state of individual tasks remains unchanged

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

    # The host continues, but the registered variable still shows failure
    - name: Check registered state (still shows failed)
      ansible.builtin.debug:
        msg: "failed_task.failed is still {{ failed_task.failed }}"
```

The `meta: clear_host_errors` directive is a recovery tool for complex playbook scenarios. It is not something you use in every playbook, but when you need it, nothing else will do. It bridges the gap between Ansible's default "fail and stop" behavior and the reality that some failures are expected and recoverable. Use it when you have handled an error condition and want to give hosts a clean slate to continue with the rest of the play.
