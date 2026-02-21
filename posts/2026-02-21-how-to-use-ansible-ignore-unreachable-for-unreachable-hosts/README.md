# How to Use Ansible ignore_unreachable for Unreachable Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Inventory, DevOps

Description: Learn how to use Ansible ignore_unreachable to continue playbook execution when some hosts are temporarily offline or unreachable.

---

If you manage a fleet of servers with Ansible, you have probably seen this scenario: you need to push a configuration update to 50 servers, but two of them are in maintenance mode and unreachable. By default, Ansible marks those hosts as failed and removes them from subsequent plays. The `ignore_unreachable` directive gives you a way to keep running tasks on unreachable hosts without removing them from the play entirely. This is different from `ignore_errors` and solves a very specific problem.

## How Ansible Handles Unreachable Hosts by Default

When Ansible cannot connect to a host (SSH timeout, DNS resolution failure, network partition), it marks that host as "unreachable" and removes it from the list of active hosts for the rest of the play. This means if a host is temporarily down during task 1, it will not be retried for tasks 2 through N even if it comes back online.

Here is what a typical unreachable error looks like:

```
fatal: [web-03]: UNREACHABLE! => {
    "changed": false,
    "msg": "Failed to connect to the host via ssh: ssh: connect to host web-03 port 22: Connection timed out",
    "unreachable": true
}
```

After this, Ansible skips `web-03` for every remaining task in that play.

## What ignore_unreachable Does

The `ignore_unreachable` directive tells Ansible to keep trying tasks on a host even after it has been marked unreachable. The host stays in the active host list, and Ansible will attempt to connect to it for each subsequent task.

```yaml
# Basic usage of ignore_unreachable at the task level
- name: Gather uptime from all servers
  ansible.builtin.command:
    cmd: uptime
  register: uptime_result
  ignore_unreachable: true

- name: Show uptime for reachable hosts
  ansible.builtin.debug:
    msg: "{{ uptime_result.stdout }}"
  when: uptime_result is not unreachable
```

With `ignore_unreachable: true`, the host remains in the play and Ansible keeps trying subsequent tasks. You can check whether a host was unreachable by examining the registered variable with `is unreachable`.

## ignore_unreachable vs ignore_errors

These two directives solve different problems and it is important to understand the distinction:

- `ignore_errors: true` handles tasks that execute but return a non-zero exit code (the host was reachable, the command just failed)
- `ignore_unreachable: true` handles situations where Ansible cannot connect to the host at all

Here is a comparison:

```yaml
# This handles command failures (host is reachable, command failed)
- name: Check disk space
  ansible.builtin.command:
    cmd: df -h /data
  ignore_errors: true  # Handles: "No such file or directory" etc.

# This handles connection failures (host is not reachable at all)
- name: Check disk space
  ansible.builtin.command:
    cmd: df -h /data
  ignore_unreachable: true  # Handles: "Connection timed out" etc.

# You might need both in some cases
- name: Check disk space on possibly-offline hosts
  ansible.builtin.command:
    cmd: df -h /data
  ignore_errors: true
  ignore_unreachable: true
```

## Setting ignore_unreachable at the Play Level

Instead of adding `ignore_unreachable` to individual tasks, you can set it for an entire play:

```yaml
---
# Apply ignore_unreachable to the entire play
- name: Collect information from all hosts (some may be offline)
  hosts: all
  gather_facts: false
  ignore_unreachable: true

  tasks:
    - name: Try to gather facts
      ansible.builtin.setup:
      register: facts_result

    - name: Ping each host
      ansible.builtin.ping:
      register: ping_result

    - name: Report reachable hosts
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} is reachable"
      when: ping_result is not unreachable
```

When set at the play level, every task in that play will continue execution even if hosts are unreachable. Note that `gather_facts: false` is important here because if fact gathering fails on an unreachable host, it would normally kill the play for that host before any tasks run.

## Setting ignore_unreachable at the Block Level

You can scope `ignore_unreachable` to a block of tasks, which gives you more granular control:

```yaml
---
- name: Deploy with mixed criticality tasks
  hosts: webservers
  gather_facts: false

  tasks:
    # This block tolerates unreachable hosts
    - name: Optional health check block
      block:
        - name: Check current application health
          ansible.builtin.uri:
            url: "http://{{ inventory_hostname }}:8080/health"
          register: health_check

        - name: Log health status
          ansible.builtin.debug:
            msg: "Health: {{ health_check.json.status }}"
      ignore_unreachable: true

    # Tasks outside the block will still fail on unreachable hosts
    - name: Deploy new application version
      ansible.builtin.copy:
        src: app-release.tar.gz
        dest: /opt/app/
```

## Practical Use Case: Rolling Health Checks

One of the most common use cases for `ignore_unreachable` is performing health checks across a fleet where some hosts might be down for maintenance:

```yaml
---
- name: Fleet-wide health check
  hosts: all
  gather_facts: false
  ignore_unreachable: true
  serial: 10

  tasks:
    - name: Check SSH connectivity
      ansible.builtin.ping:
      register: ssh_check

    - name: Check disk usage
      ansible.builtin.command:
        cmd: df --output=pcent / | tail -1
      register: disk_check
      when: ssh_check is not unreachable
      changed_when: false

    - name: Check memory usage
      ansible.builtin.command:
        cmd: free -m | awk '/Mem:/{printf "%d/%dMB (%.1f%%)", $3, $2, $3/$2*100}'
      register: mem_check
      when: ssh_check is not unreachable
      changed_when: false

    - name: Build health report
      ansible.builtin.set_fact:
        host_status:
          hostname: "{{ inventory_hostname }}"
          reachable: "{{ ssh_check is not unreachable }}"
          disk: "{{ disk_check.stdout | default('N/A') | trim }}"
          memory: "{{ mem_check.stdout | default('N/A') }}"

    - name: Display host health
      ansible.builtin.debug:
        msg: "{{ host_status }}"
```

## Practical Use Case: Retry After Reboot

Another common scenario is rebooting servers and waiting for them to come back. The `ignore_unreachable` directive helps bridge the gap during reboot:

```yaml
---
- name: Reboot and verify servers
  hosts: webservers
  become: true
  serial: 5

  tasks:
    - name: Reboot the server
      ansible.builtin.reboot:
        reboot_timeout: 300
        msg: "Rebooting for kernel update"
      register: reboot_result
      ignore_unreachable: true

    - name: Wait for server to come back
      ansible.builtin.wait_for_connection:
        timeout: 600
        delay: 30
      when: reboot_result is not unreachable

    - name: Verify server is healthy after reboot
      ansible.builtin.command:
        cmd: systemctl is-system-running
      register: system_status
      changed_when: false

    - name: Report unhealthy systems
      ansible.builtin.fail:
        msg: "System {{ inventory_hostname }} is in state: {{ system_status.stdout }}"
      when: system_status.stdout != 'running'
```

## Combining with max_fail_percentage

In large deployments, you might want to tolerate some unreachable hosts but fail the entire play if too many hosts are down:

```yaml
---
- name: Deploy to web tier
  hosts: webservers
  gather_facts: false
  ignore_unreachable: true
  max_fail_percentage: 20

  tasks:
    - name: Check connectivity
      ansible.builtin.ping:
      register: connectivity

    - name: Count unreachable hosts
      ansible.builtin.fail:
        msg: "Host {{ inventory_hostname }} is unreachable"
      when: connectivity is unreachable
```

This play will abort if more than 20% of hosts are unreachable, giving you a safety net while still tolerating a few offline machines.

## Setting it in ansible.cfg

You can also set the default behavior in your Ansible configuration file:

```ini
# ansible.cfg
[defaults]
# This sets the default for all plays
# Individual plays/tasks can still override this
ignore_unreachable = true
```

However, I would not recommend setting this globally. It is better to be explicit in your playbooks about which tasks or plays should tolerate unreachable hosts. Setting it globally can mask genuine connectivity problems.

## Checking Unreachable Status in Conditionals

When you use `ignore_unreachable`, you should check the status in subsequent tasks to avoid running commands that assume the host is reachable:

```yaml
# Pattern for safely handling unreachable hosts
- name: Attempt to gather system info
  ansible.builtin.setup:
    gather_subset:
      - hardware
  register: system_info
  ignore_unreachable: true

- name: Process system info only if host was reachable
  ansible.builtin.set_fact:
    total_memory_mb: "{{ ansible_memtotal_mb }}"
  when:
    - system_info is not unreachable
    - system_info is succeeded

- name: Set default for unreachable hosts
  ansible.builtin.set_fact:
    total_memory_mb: "unknown"
  when: system_info is unreachable
```

## Summary

The `ignore_unreachable` directive is a targeted tool for handling connectivity issues in your Ansible playbooks. It keeps hosts in the active play list even when they cannot be reached, which is different from `ignore_errors` that handles command failures on reachable hosts. Use it for health checks across large fleets, during rolling reboots, and in any situation where some hosts being temporarily offline should not stop the entire playbook. Always pair it with conditional checks on registered variables so downstream tasks can react appropriately to the host's actual status.
