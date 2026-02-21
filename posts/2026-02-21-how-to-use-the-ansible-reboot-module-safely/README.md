# How to Use the Ansible reboot Module Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Reboot, Linux, Server Management, DevOps

Description: Learn how to safely reboot servers using the Ansible reboot module with proper timeouts, health checks, and rolling strategies for production environments.

---

Rebooting a production server is one of those operations that should be boring. But without proper automation, it often is not. You reboot a machine, forget to check if all services came back, and then get a page at 3 AM because the database did not start. The Ansible `reboot` module handles the full reboot lifecycle: sending the reboot command, waiting for the host to go down, waiting for it to come back, and verifying connectivity. But using it safely in production requires some additional care.

## Basic Usage

The `reboot` module in its simplest form:

```yaml
---
- name: Reboot servers
  hosts: all
  become: yes
  tasks:
    - name: Reboot the machine
      ansible.builtin.reboot:
```

This works, but it is the bare minimum. Let's look at the parameters that make it production-safe.

## Module Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `pre_reboot_delay` | 0 | Seconds to wait before sending reboot command |
| `post_reboot_delay` | 0 | Seconds to wait after reboot before testing connectivity |
| `reboot_timeout` | 600 | Maximum seconds to wait for the host to come back |
| `connect_timeout` | 5 | Timeout for each connection test |
| `test_command` | `whoami` | Command to run to verify the host is usable |
| `msg` | `Reboot initiated by Ansible` | Message sent to logged-in users |
| `reboot_command` | platform default | Custom reboot command (overrides default) |

## A Production-Safe Reboot Task

A reboot task with all the safety parameters:

```yaml
- name: Safely reboot the server
  ansible.builtin.reboot:
    pre_reboot_delay: 5
    post_reboot_delay: 30
    reboot_timeout: 600
    connect_timeout: 10
    test_command: uptime
    msg: "Server is being rebooted for maintenance - {{ reboot_reason | default('routine update') }}"
  register: reboot_result

- name: Show reboot duration
  ansible.builtin.debug:
    msg: "Reboot took {{ reboot_result.elapsed }} seconds"
```

The `pre_reboot_delay` gives users and applications a few seconds to wrap up. The `post_reboot_delay` accounts for services that start after SSH but take time to initialize. The `test_command` verifies the host is actually usable, not just that SSH is accepting connections.

## Conditional Reboot

Often you only need to reboot if something changed, like a kernel update or a config that requires a reboot.

Only reboot if the kernel was updated:

```yaml
---
- name: Patch and reboot if needed
  hosts: all
  become: yes
  tasks:
    - name: Update all packages
      ansible.builtin.apt:
        upgrade: dist
        update_cache: yes
      register: apt_result

    - name: Check if reboot is required
      ansible.builtin.stat:
        path: /var/run/reboot-required
      register: reboot_required

    - name: Reboot if required
      ansible.builtin.reboot:
        reboot_timeout: 600
        post_reboot_delay: 30
        msg: "Rebooting for kernel/package update"
      when: reboot_required.stat.exists
```

On Debian/Ubuntu, the file `/var/run/reboot-required` is created when a package update requires a reboot (typically kernel updates).

For RHEL/CentOS, use the `needs-restarting` command:

```yaml
- name: Check if reboot needed (RHEL)
  ansible.builtin.command: needs-restarting -r
  register: reboot_check
  changed_when: false
  failed_when: false

- name: Reboot if needed
  ansible.builtin.reboot:
    reboot_timeout: 600
  when: reboot_check.rc == 1
```

## Rolling Reboot for Clusters

Never reboot all nodes at once. Use `serial` to reboot one at a time with verification between each.

Rolling reboot with full health checks:

```yaml
---
- name: Rolling reboot of web cluster
  hosts: web_servers
  become: yes
  serial: 1
  max_fail_percentage: 0
  order: sorted

  pre_tasks:
    - name: Remove from load balancer
      ansible.builtin.uri:
        url: "http://{{ haproxy_host }}/api/backend/{{ inventory_hostname }}/disable"
        method: POST
      delegate_to: localhost

    - name: Wait for connections to drain
      ansible.builtin.pause:
        seconds: 30

  tasks:
    - name: Reboot the server
      ansible.builtin.reboot:
        reboot_timeout: 600
        post_reboot_delay: 30
        test_command: systemctl is-system-running

  post_tasks:
    - name: Verify all critical services are running
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: started
      loop:
        - nginx
        - myapp
        - node_exporter

    - name: Wait for application to be healthy
      ansible.builtin.uri:
        url: http://localhost:8080/health
      register: health
      retries: 20
      delay: 5
      until: health.status == 200

    - name: Re-add to load balancer
      ansible.builtin.uri:
        url: "http://{{ haproxy_host }}/api/backend/{{ inventory_hostname }}/enable"
        method: POST
      delegate_to: localhost

    - name: Wait for load balancer health check to pass
      ansible.builtin.pause:
        seconds: 15
```

The `serial: 1` ensures only one host reboots at a time. The `max_fail_percentage: 0` means the play stops if any host fails. The load balancer integration ensures no traffic is sent to a rebooting host.

## Custom Test Command

The default `test_command` is `whoami`, which only verifies SSH works. For better verification, use a command that checks system health.

Use systemctl to verify the system is fully booted:

```yaml
- name: Reboot with thorough verification
  ansible.builtin.reboot:
    reboot_timeout: 600
    post_reboot_delay: 60
    test_command: "systemctl is-system-running --wait"
```

`systemctl is-system-running --wait` blocks until the system reaches a running or degraded state. This is much better than just checking if SSH works, because SSH comes up long before all services finish starting.

## Handling Reboot Failures

When a reboot times out, you need to handle it gracefully.

Handle reboot failure with alerting:

```yaml
- name: Attempt reboot
  ansible.builtin.reboot:
    reboot_timeout: 600
    msg: "Scheduled maintenance reboot"
  register: reboot_result
  ignore_errors: yes

- name: Handle reboot failure
  when: reboot_result is failed
  block:
    - name: Alert the operations team
      ansible.builtin.uri:
        url: "{{ pagerduty_webhook }}"
        method: POST
        body_format: json
        body:
          event_action: trigger
          payload:
            summary: "{{ inventory_hostname }} failed to come back after reboot"
            severity: critical
            source: ansible
      delegate_to: localhost

    - name: Record failure
      ansible.builtin.lineinfile:
        path: /tmp/reboot_failures.txt
        line: "{{ inventory_hostname }} - {{ ansible_date_time.iso8601 }}"
        create: yes
      delegate_to: localhost

    - name: Fail this host
      ansible.builtin.fail:
        msg: "Server did not come back after reboot within 600 seconds"
```

## Pre-Reboot Preparation

Before rebooting, prepare the system for a clean shutdown.

Pre-reboot preparation tasks:

```yaml
tasks:
  - name: Sync filesystems
    ansible.builtin.command: sync

  - name: Stop application gracefully
    ansible.builtin.systemd:
      name: myapp
      state: stopped
    timeout: 60

  - name: Flush database connections
    ansible.builtin.command: /opt/myapp/bin/flush-connections
    ignore_errors: yes

  - name: Create reboot marker for post-reboot verification
    ansible.builtin.copy:
      content: "{{ ansible_date_time.iso8601 }}"
      dest: /var/tmp/last_reboot_marker
    become: yes

  - name: Reboot the server
    ansible.builtin.reboot:
      pre_reboot_delay: 5
      post_reboot_delay: 30
      reboot_timeout: 600
```

## Post-Reboot Verification Playbook

After reboot, run a comprehensive check to verify everything is working.

Post-reboot verification:

```yaml
- name: Post-reboot verification
  hosts: just_rebooted
  become: yes
  tasks:
    - name: Check system boot status
      ansible.builtin.command: systemctl is-system-running
      register: system_status
      changed_when: false
      failed_when: false

    - name: Report system status
      ansible.builtin.debug:
        msg: "System status: {{ system_status.stdout }}"

    - name: Check for failed services
      ansible.builtin.command: systemctl --failed --no-pager
      register: failed_services
      changed_when: false

    - name: Report failed services
      ansible.builtin.debug:
        var: failed_services.stdout_lines

    - name: Verify filesystem mounts
      ansible.builtin.command: df -h
      register: disk_status
      changed_when: false

    - name: Check available memory
      ansible.builtin.command: free -h
      register: memory_status
      changed_when: false

    - name: Verify network connectivity
      ansible.builtin.wait_for:
        host: "{{ item.host }}"
        port: "{{ item.port }}"
        timeout: 10
      loop:
        - { host: "8.8.8.8", port: 53 }
        - { host: "{{ gateway_ip }}", port: 22 }
      ignore_errors: yes

    - name: Check kernel version
      ansible.builtin.command: uname -r
      register: kernel_version
      changed_when: false

    - name: Display kernel version
      ansible.builtin.debug:
        msg: "Running kernel: {{ kernel_version.stdout }}"
```

## Rebooting Windows Hosts

The reboot module works on Windows too, via WinRM.

Reboot a Windows host:

```yaml
- name: Reboot Windows server
  hosts: windows_servers
  tasks:
    - name: Reboot after Windows Update
      ansible.builtin.reboot:
        reboot_timeout: 1200  # Windows updates can be slow
        post_reboot_delay: 60
        test_command: "powershell.exe Get-Process"
        msg: "Rebooting for Windows Update"
```

## Summary

The Ansible `reboot` module handles the mechanical parts of rebooting (send the command, wait for disconnect, wait for reconnect, verify). But safe rebooting in production requires the surrounding context: conditional reboots (only when needed), rolling strategy (one host at a time), pre-reboot preparation (graceful app shutdown, LB drain), post-reboot verification (service health checks, monitoring re-registration), and failure handling (alerting, rollback). Build your reboot playbooks with all of these layers, and server reboots become a non-event instead of a source of anxiety.
