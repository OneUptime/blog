# How to Use Ansible wait_for Module to Check Port Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Networking, Service Management, DevOps

Description: Learn how to use the Ansible wait_for module to check port availability, wait for services to start, and verify network connectivity in your playbooks.

---

Starting a service does not mean it is ready to accept connections. There is always a gap between when a process starts and when it actually binds to a port and begins listening. If your next task depends on that service being available, like running database migrations after starting PostgreSQL, you need to wait for the port to open. The `ansible.builtin.wait_for` module handles this by polling a port until it becomes available or a timeout is reached.

## Basic Port Check

The simplest use case: wait for a specific port to be open.

Wait for PostgreSQL to start listening:

```yaml
---
- name: Wait for services to be ready
  hosts: db_servers
  become: yes
  tasks:
    - name: Start PostgreSQL
      ansible.builtin.systemd:
        name: postgresql
        state: started

    - name: Wait for PostgreSQL port to be available
      ansible.builtin.wait_for:
        port: 5432
        host: 127.0.0.1
        timeout: 60
        state: started

    - name: Run database migrations
      ansible.builtin.command: /opt/myapp/bin/migrate
```

The module will poll port 5432 every second (by default) until it gets a successful TCP connection or the timeout expires.

## Module Parameters

Here are the key parameters for the `wait_for` module:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `port` | none | TCP port to poll |
| `host` | 127.0.0.1 | Host to check |
| `timeout` | 300 | Maximum seconds to wait |
| `delay` | 0 | Seconds to wait before starting to poll |
| `sleep` | 1 | Seconds between polling attempts |
| `state` | started | `started` (port open), `stopped` (port closed), `drained` (no active connections) |
| `connect_timeout` | 5 | Timeout for each individual connection attempt |
| `search_regex` | none | String to look for in the response |
| `exclude_hosts` | none | Hosts to exclude when checking for drained state |
| `msg` | none | Custom error message on timeout |

## Waiting for a Port to Close

Sometimes you need to wait for a service to stop, not start. For example, before starting a new version of an application, you want to make sure the old one has fully released the port.

Wait for a port to be released:

```yaml
- name: Stop the old application
  ansible.builtin.systemd:
    name: myapp
    state: stopped

- name: Wait for port 8080 to be freed
  ansible.builtin.wait_for:
    port: 8080
    host: 127.0.0.1
    state: stopped
    timeout: 30
    msg: "Port 8080 was not released within 30 seconds"

- name: Start the new application
  ansible.builtin.systemd:
    name: myapp
    state: started
```

## Using the delay Parameter

The `delay` parameter skips the initial polling period. This is useful when you know a service takes a minimum amount of time to start.

Add an initial delay before polling:

```yaml
- name: Start Elasticsearch
  ansible.builtin.systemd:
    name: elasticsearch
    state: started

- name: Wait for Elasticsearch to be ready
  ansible.builtin.wait_for:
    port: 9200
    host: 127.0.0.1
    delay: 10    # Elasticsearch takes at least 10 seconds to start
    timeout: 120
    state: started
```

Without the delay, Ansible would make 10 wasted connection attempts before Elasticsearch even begins its initialization.

## Checking Remote Ports

You can check ports on remote hosts to verify network connectivity and service availability.

Verify connectivity to external dependencies:

```yaml
---
- name: Pre-flight connectivity checks
  hosts: app_servers
  tasks:
    - name: Check database connectivity
      ansible.builtin.wait_for:
        host: "{{ db_host }}"
        port: 5432
        timeout: 10
        state: started
      delegate_to: localhost

    - name: Check Redis connectivity
      ansible.builtin.wait_for:
        host: "{{ redis_host }}"
        port: 6379
        timeout: 10
        state: started
      delegate_to: localhost

    - name: Check Elasticsearch cluster
      ansible.builtin.wait_for:
        host: "{{ es_host }}"
        port: 9200
        timeout: 10
        state: started
      delegate_to: localhost
```

## Using search_regex for Application Readiness

Port being open is one thing, but you might want to verify that the service is actually responding with the right data. The `search_regex` parameter lets you wait for a specific string in the response.

Wait for a banner or response string:

```yaml
- name: Wait for SSH to be ready with proper banner
  ansible.builtin.wait_for:
    port: 22
    host: "{{ inventory_hostname }}"
    search_regex: "OpenSSH"
    timeout: 60

- name: Wait for MySQL ready message
  ansible.builtin.wait_for:
    port: 3306
    host: 127.0.0.1
    search_regex: "mysql_native_password"
    timeout: 60

- name: Wait for SMTP server banner
  ansible.builtin.wait_for:
    port: 25
    host: "{{ smtp_host }}"
    search_regex: "220.*ESMTP"
    timeout: 30
```

## Waiting for Drained Connections

The `drained` state waits until there are no active connections to a port. This is useful for graceful shutdowns.

Wait for all active connections to finish before stopping:

```yaml
- name: Signal application to stop accepting new connections
  ansible.builtin.command: "kill -USR1 $(cat /var/run/myapp.pid)"

- name: Wait for existing connections to drain
  ansible.builtin.wait_for:
    port: 8080
    host: 0.0.0.0
    state: drained
    timeout: 120
    exclude_hosts:
      - 127.0.0.1  # Exclude health check connections
    msg: "Connections did not drain within 120 seconds"

- name: Stop the application
  ansible.builtin.systemd:
    name: myapp
    state: stopped
```

## Waiting for Files

The `wait_for` module can also wait for files to appear or contain specific content. This is useful for services that write a ready indicator file.

Wait for a lock file or PID file:

```yaml
- name: Start the application
  ansible.builtin.systemd:
    name: myapp
    state: started

- name: Wait for PID file to appear
  ansible.builtin.wait_for:
    path: /var/run/myapp.pid
    state: present
    timeout: 30

- name: Wait for application ready file
  ansible.builtin.wait_for:
    path: /var/run/myapp.ready
    search_regex: "READY"
    timeout: 60
```

## Multi-Service Startup Verification

When deploying a full stack, check each service in sequence.

Verify an entire application stack is ready:

```yaml
---
- name: Deploy and verify application stack
  hosts: app_servers
  become: yes

  vars:
    service_checks:
      - name: PostgreSQL
        port: 5432
        host: 127.0.0.1
        timeout: 60
        delay: 5
      - name: Redis
        port: 6379
        host: 127.0.0.1
        timeout: 30
        delay: 2
      - name: Application API
        port: 8080
        host: 127.0.0.1
        timeout: 90
        delay: 10
      - name: Nginx
        port: 80
        host: 127.0.0.1
        timeout: 30
        delay: 2

  tasks:
    - name: Start all services
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: started
      loop:
        - postgresql
        - redis-server
        - myapp
        - nginx

    - name: Wait for each service to be ready
      ansible.builtin.wait_for:
        port: "{{ item.port }}"
        host: "{{ item.host }}"
        timeout: "{{ item.timeout }}"
        delay: "{{ item.delay }}"
        msg: "{{ item.name }} did not become available on port {{ item.port }}"
      loop: "{{ service_checks }}"
      loop_control:
        label: "{{ item.name }} (port {{ item.port }})"
```

## Using wait_for After Firewall Changes

After modifying firewall rules, verify that the port is actually accessible.

Verify firewall changes took effect:

```yaml
- name: Open port 443 in firewall
  ansible.builtin.firewalld:
    port: 443/tcp
    permanent: yes
    immediate: yes
    state: enabled

- name: Verify port 443 is accessible from outside
  ansible.builtin.wait_for:
    port: 443
    host: "{{ ansible_default_ipv4.address }}"
    timeout: 10
    state: started
  delegate_to: localhost
```

## Combining with Retries

For flaky services, combine `wait_for` with task-level retries.

Retry the entire wait operation if it fails:

```yaml
- name: Wait for unstable service with retries
  ansible.builtin.wait_for:
    port: 9200
    host: 127.0.0.1
    timeout: 30
    state: started
  register: wait_result
  retries: 3
  delay: 15
  until: wait_result is success
```

## Error Handling Pattern

Gracefully handle the case where a service fails to come up.

Handle wait_for timeout gracefully:

```yaml
- name: Try to wait for the service
  ansible.builtin.wait_for:
    port: 8080
    host: 127.0.0.1
    timeout: 60
  register: wait_result
  ignore_errors: yes

- name: Handle service startup failure
  when: wait_result is failed
  block:
    - name: Get service logs for debugging
      ansible.builtin.command: journalctl -u myapp --no-pager -n 50
      register: service_logs

    - name: Display failure details
      ansible.builtin.debug:
        msg: |
          Service failed to start on {{ inventory_hostname }}.
          Last 50 log lines:
          {{ service_logs.stdout }}

    - name: Fail with useful error
      ansible.builtin.fail:
        msg: "Service did not become available on port 8080. Check the logs above."
```

## Summary

The `wait_for` module bridges the gap between starting a service and that service being ready for use. Instead of guessing with `pause` tasks (which either wait too long or not long enough), `wait_for` actively polls until the condition is met. Use it for port availability checks after service starts, port release verification before service upgrades, connection draining during graceful shutdowns, file existence checks for services that write ready indicators, and pre-flight connectivity verification against external dependencies. Combined with timeouts and error handling, it makes your playbooks robust against the real-world timing issues that come with distributed systems.
