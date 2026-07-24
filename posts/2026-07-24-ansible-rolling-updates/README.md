# Rolling Updates with Ansible serial, max_fail_percentage, and Failure Controls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Deployment, Rolling Updates, Error Handling, Automation

Description: Build controlled Ansible rolling updates with explicit batches, health gates, load-balancer delegation, and well-defined abort behavior.

---

A rolling update is not just `serial: 1`. A production-safe rollout defines:

- how hosts are batched
- when a host leaves and rejoins service
- which health checks gate progress
- how many failures stop the batch
- whether failures on one host stop every host
- what recovery runs after a partial change

Ansible provides the mechanics, but you must choose the safety policy.

## Start with an Explicit Batch

```yaml
---
- name: Roll out the application
  hosts: app
  serial: 2
  tasks:
    - name: Install the requested release
      ansible.builtin.package:
        name: "myapp-{{ app_version }}"
        state: present
```

Ansible completes the entire play for the current two-host batch before starting the next batch. With the default linear strategy, tasks remain in lockstep within that batch.

`serial` accepts a count, percentage, or list:

```yaml
serial:
  - 1
  - 5
  - "20%"
```

This canary pattern updates one host, then five, then batches sized at 20 percent of the play's total host count until complete. The final batch takes any smaller remainder, and percentage batches always include at least one host.

Choose a size based on spare capacity, traffic distribution, startup time, and how quickly monitoring detects a regression. The fastest batch that keeps enough healthy capacity is not necessarily the safest batch.

## Drain and Restore Each Host

Load-balancer actions normally run somewhere other than the app host, so delegate them:

```yaml
- name: Roll out behind the load balancer
  hosts: app
  serial: 2
  tasks:
    - name: Remove host from the load balancer
      ansible.builtin.uri:
        url: "https://lb.example.com/api/backends/{{ inventory_hostname }}"
        method: DELETE
        status_code:
          - 200
          - 204
          - 404
        headers:
          Authorization: "Bearer {{ lb_api_token }}"
      delegate_to: localhost
      no_log: true

    - name: Wait for active requests to drain
      ansible.builtin.uri:
        url: "https://lb.example.com/api/backends/{{ inventory_hostname }}/connections"
        headers:
          Authorization: "Bearer {{ lb_api_token }}"
        return_content: true
      register: connection_status
      until: connection_status.json.active | int == 0
      retries: 30
      delay: 2
      delegate_to: localhost
      no_log: true

    - name: Deploy release
      ansible.builtin.include_role:
        name: myapp_deploy

    - name: Verify local application health
      ansible.builtin.uri:
        url: http://127.0.0.1:8080/health
        status_code: 200
      register: local_health
      until: local_health.status == 200
      retries: 30
      delay: 5

    - name: Return host to the load balancer
      ansible.builtin.uri:
        url: "https://lb.example.com/api/backends/{{ inventory_hostname }}"
        method: PUT
        body_format: json
        body:
          enabled: true
        status_code:
          - 200
          - 201
          - 204
        headers:
          Authorization: "Bearer {{ lb_api_token }}"
      delegate_to: localhost
      no_log: true
```

Delegated tasks still run in parallel for hosts in the batch. Ensure the load-balancer API supports concurrent updates, or add `throttle: 1`.

## Define the Batch Failure Threshold

`max_fail_percentage` stops the play when failures in the current serial batch exceed the percentage:

```yaml
- name: Roll out with a failure budget
  hosts: app
  serial: 4
  max_fail_percentage: 25
```

The comparison is “exceeded,” not “reached.” If a batch of four must stop when two hosts fail, set `49`, not `50`: two failures are 50 percent, which exceeds 49 but does not exceed 50.

Small batches make percentages coarse:

- with `serial: 2`, one failed host is 50 percent
- with `serial: 3`, one is about 33 percent
- with `serial: 4`, one is 25 percent

Write down the host count represented by the percentage and test it. If any failed host must stop progress, use `max_fail_percentage: 0`.

## Use any_errors_fatal for Global Preconditions

Some steps must succeed everywhere in the current batch or the whole play should stop:

```yaml
- name: Disable traffic in both regions
  hosts: app
  serial: 4
  any_errors_fatal: true
  tasks:
    - name: Apply global maintenance gate
      ansible.builtin.uri:
        url: https://control.example.com/maintenance
        method: POST
        status_code: 204
      delegate_to: localhost
      run_once: true
```

With `any_errors_fatal`, Ansible finishes the fatal task on all hosts in the current batch, then stops the play on all hosts.

Apply it to genuine global invariants, not every task. A single transient host failure otherwise aborts all remaining healthy hosts and may leave more of the fleet on the old version than intended.

## Use Blocks for Per-Host Recovery

```yaml
- name: Deploy with rollback
  block:
    - name: Install the new release
      ansible.builtin.command:
        cmd: "/opt/myapp/bin/activate {{ app_version }}"
      register: activation
      changed_when: "'activated' in activation.stdout"
      notify: Restart myapp

    - name: Apply pending restart before health check
      ansible.builtin.meta: flush_handlers

    - name: Check the new release
      ansible.builtin.uri:
        url: http://127.0.0.1:8080/health
        status_code: 200

  rescue:
    - name: Restore the previous release
      ansible.builtin.command:
        cmd: "/opt/myapp/bin/activate {{ previous_app_version }}"
      notify: Restart myapp

    - name: Run rollback handler
      ansible.builtin.meta: flush_handlers

    - name: Mark the host as failed after rollback
      ansible.builtin.fail:
        msg: Deployment failed and the previous release was restored.
```

A successfully rescued task is treated as recovered for play control and does not trigger `max_fail_percentage` or `any_errors_fatal`, though Ansible still reports the original failure in statistics. The final explicit `fail` above makes the host count against the rollout failure budget after rollback.

Choose the behavior deliberately. If rollback restores service and the rollout may continue, omit the final failure. If one failed upgrade indicates a bad artifact, fail so later batches stop.

## Know What Does Not Count the Same Way

`ignore_errors` continues after task failures but does not ignore undefined variables, syntax errors, connection failures, or some execution errors. Blanket use can convert a broken health gate into a “successful” rollout.

`ignore_unreachable` treats connection problems separately. A host that cannot be reached should rarely be returned to a load balancer or counted as successfully updated.

Prefer a narrow `failed_when` for documented return codes or a block with explicit recovery.

## Be Careful with run_once and serial

With serial batching, `run_once: true` executes once per batch, not necessarily once for the entire play. This is useful for a batch checkpoint:

```yaml
- name: Announce the current batch
  ansible.builtin.debug:
    msg: "Starting batch {{ ansible_play_batch }}"
  run_once: true
```

For a migration that must run exactly once for all hosts, use a separate play targeting localhost or one dedicated migration host:

```yaml
- name: Run the database migration once
  hosts: migration_controller
  tasks:
    - name: Migrate schema
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate

- name: Roll out application hosts
  hosts: app
  serial: 2
  roles:
    - myapp_deploy
```

This is easier to reason about than relying on the first host of an evolving batch.

## Coordinate Handlers with Batches

Handlers notified in a serial play run for the current batch at handler boundaries before Ansible completes that batch. Flush them before a health check when the check requires the new process state.

Keep restart handlers idempotent and host-local. A handler that performs a cluster-wide operation can execute once for each notifying host and batch unless redesigned around a separate coordination play.

## Add External Gates Between Batches

An application returning HTTP 200 immediately after restart may still have elevated error rates. Consider a delegated gate that queries monitoring after the batch has soaked:

```yaml
- name: Gate the current batch with monitoring
  any_errors_fatal: true
  block:
    - name: Pause for monitoring to collect data
      ansible.builtin.pause:
        seconds: 60
      run_once: true

    - name: Check batch error rate
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/error-rate?hosts={{ ansible_play_batch | join(',') | urlencode }}"
        return_content: true
      register: batch_metrics
      failed_when: batch_metrics.json.error_rate | float > 0.01
      delegate_to: localhost
      run_once: true
```

Do not put API tokens in the URL. Use protected headers and `no_log`.

## Test the Failure Matrix

In a staging inventory, simulate:

- one unhealthy host in each batch size
- the exact `max_fail_percentage` boundary
- an unreachable host
- load-balancer API failure during drain and restore
- handler failure
- successful and failed rollback
- operator interruption between drain and restore
- a migration that has already run

The rollout should leave every host in an explainable state: serving the old healthy release, serving the new healthy release, or deliberately removed from traffic with a visible failure.

## Official Documentation

- [Controlling playbook execution and serial](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html)
- [Error handling: any_errors_fatal and max_fail_percentage](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html)
- [Delegation and rolling updates](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html)
- [Blocks and rescue behavior](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html)
- [Continuous delivery and rolling upgrades](https://docs.ansible.com/projects/ansible/latest/playbook_guide/guide_rolling_upgrade.html)
