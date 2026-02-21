# How to Use Ansible delegate_to localhost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Delegation, Localhost, Automation

Description: Learn how to use delegate_to localhost in Ansible to run tasks on the controller machine while maintaining remote host context.

---

Delegating tasks to `localhost` is one of the most common patterns in Ansible. It runs a task on the Ansible controller machine instead of the remote target host. This is useful for making API calls, sending notifications, updating a CMDB, writing local files, or any operation that should happen on the machine running the playbook rather than on the managed hosts.

## Why Delegate to localhost?

Consider a deployment scenario. You are deploying to 50 web servers. For each server, you need to call an API to deregister it from service discovery, deploy the code, then re-register it. The API call should come from the controller, not from each web server (which may not have network access to the API endpoint, or which should not have the API credentials).

```yaml
# why-delegate-localhost.yml - API calls from the controller
---
- name: Deploy with service discovery management
  hosts: webservers
  serial: 5
  tasks:
    - name: Deregister from Consul
      ansible.builtin.uri:
        url: "http://consul.example.com:8500/v1/agent/service/deregister/{{ inventory_hostname }}-web"
        method: PUT
      delegate_to: localhost

    - name: Deploy application update
      ansible.builtin.copy:
        src: /releases/myapp-latest/
        dest: /opt/myapp/
      become: true

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true

    - name: Wait for health check to pass
      ansible.builtin.uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      register: health
      retries: 20
      delay: 5
      until: health.status == 200
      delegate_to: localhost

    - name: Re-register in Consul
      ansible.builtin.uri:
        url: "http://consul.example.com:8500/v1/agent/service/register"
        method: PUT
        body_format: json
        body:
          ID: "{{ inventory_hostname }}-web"
          Name: web
          Address: "{{ ansible_host }}"
          Port: 8080
          Check:
            HTTP: "http://{{ ansible_host }}:8080/health"
            Interval: "10s"
      delegate_to: localhost
```

## Variable Context When Delegating to localhost

When you delegate to localhost, all variables still refer to the original target host. This is the most important thing to understand.

```yaml
# variable-context-localhost.yml - Variables in localhost delegation
---
- name: Demonstrate variable context
  hosts: webservers
  gather_facts: true
  tasks:
    - name: Show what variables are available on delegated task
      ansible.builtin.debug:
        msg: |
          inventory_hostname: {{ inventory_hostname }}
          ansible_host: {{ ansible_host }}
          ansible_os_family: {{ ansible_os_family }}
          group_names: {{ group_names | join(', ') }}
          NOTE: All of these refer to the REMOTE host, not localhost
      delegate_to: localhost

    - name: Write host info to a local file
      ansible.builtin.lineinfile:
        path: /tmp/host-inventory.txt
        line: "{{ inventory_hostname }} {{ ansible_host }} {{ ansible_os_family }}"
        create: true
      delegate_to: localhost
```

## Writing Local Files Based on Remote Host Data

A common use case is generating reports or configuration files on the controller based on data collected from remote hosts.

```yaml
# local-file-generation.yml - Generate local files from remote data
---
- name: Collect data and generate report
  hosts: all
  gather_facts: true
  tasks:
    - name: Collect disk usage
      ansible.builtin.shell: df -h / | tail -1 | awk '{print $5}'
      register: disk_usage
      changed_when: false

    - name: Collect memory info
      ansible.builtin.shell: free -m | awk '/Mem:/ {printf "%d/%dMB (%.1f%%)", $3, $2, $3/$2*100}'
      register: memory_info
      changed_when: false

    - name: Write host report to local file
      ansible.builtin.lineinfile:
        path: /tmp/fleet-report-{{ ansible_date_time.date }}.csv
        line: "{{ inventory_hostname }},{{ ansible_host }},{{ ansible_os_family }},{{ disk_usage.stdout }},{{ memory_info.stdout }}"
        create: true
      delegate_to: localhost

    - name: Add CSV header (only once)
      ansible.builtin.lineinfile:
        path: /tmp/fleet-report-{{ ansible_date_time.date }}.csv
        line: "hostname,ip,os_family,disk_usage,memory"
        insertbefore: BOF
      delegate_to: localhost
      run_once: true
```

## Sending Notifications from localhost

Notification tasks should almost always delegate to localhost. The remote hosts do not need outbound access to your Slack, PagerDuty, or email servers.

```yaml
# notifications-localhost.yml - Various notification patterns
---
- name: Deploy with notifications
  hosts: appservers
  serial: "25%"
  tasks:
    - name: Notify Slack about deployment start
      ansible.builtin.uri:
        url: "{{ slack_webhook_url }}"
        method: POST
        body_format: json
        body:
          text: "Starting deployment of v{{ app_version }} to {{ inventory_hostname }}"
      delegate_to: localhost
      run_once: true

    - name: Deploy application
      ansible.builtin.copy:
        src: /releases/{{ app_version }}/
        dest: /opt/myapp/
      become: true

    - name: Restart service
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true

    - name: Send PagerDuty change event
      ansible.builtin.uri:
        url: "https://events.pagerduty.com/v2/change/enqueue"
        method: POST
        body_format: json
        headers:
          Content-Type: "application/json"
        body:
          routing_key: "{{ pagerduty_routing_key }}"
          payload:
            summary: "Deployed v{{ app_version }} to {{ inventory_hostname }}"
            source: "ansible"
            timestamp: "{{ now(utc=true).isoformat() }}"
        status_code: [200, 202]
      delegate_to: localhost
```

## Using delegate_to localhost with become

When you use `become` with `delegate_to: localhost`, privilege escalation happens on the controller machine. Be careful with this because it means the Ansible process will try to sudo on your local machine.

```yaml
# localhost-become.yml - Careful with become on localhost
---
- name: Tasks requiring local privilege escalation
  hosts: webservers
  tasks:
    # This runs as root on the CONTROLLER, not the remote host
    - name: Update local DNS cache
      ansible.builtin.shell: |
        echo "{{ ansible_host }} {{ inventory_hostname }}" >> /etc/hosts
      delegate_to: localhost
      become: true
      # WARNING: This modifies the CONTROLLER's /etc/hosts

    # Usually you want become on the remote task, not the local one
    - name: This is more common - become on remote, no become on local
      ansible.builtin.uri:
        url: "http://api.example.com/register"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
      delegate_to: localhost
      # No become here - the API call does not need root
```

## Handling localhost Connection Type

When delegating to localhost, Ansible uses the `local` connection plugin by default (if localhost is defined implicitly). If you have `localhost` explicitly in your inventory with SSH connection, the behavior changes.

```yaml
# inventory/hosts.yml - Explicit localhost definition
---
all:
  hosts:
    localhost:
      ansible_connection: local    # Use local connection, no SSH
      ansible_python_interpreter: /usr/bin/python3
  children:
    webservers:
      hosts:
        web1.example.com:
        web2.example.com:
```

If you do not have localhost in your inventory, Ansible creates an implicit localhost entry with `ansible_connection: local`. This usually works fine, but if you see unexpected SSH connection attempts to 127.0.0.1, check your inventory for an explicit localhost definition.

## Template Rendering on localhost

You can use `delegate_to: localhost` with the `template` module to render templates on the controller using remote host facts:

```yaml
# template-localhost.yml - Render templates locally using remote facts
---
- name: Generate per-host configuration files locally
  hosts: webservers
  gather_facts: true
  tasks:
    - name: Generate monitoring configuration for each host
      ansible.builtin.template:
        src: monitoring-host.yml.j2
        dest: "/tmp/monitoring/{{ inventory_hostname }}.yml"
      delegate_to: localhost

    - name: Generate Prometheus scrape config
      ansible.builtin.template:
        src: prometheus-target.yml.j2
        dest: "/tmp/prometheus/targets/{{ inventory_hostname }}.yml"
      delegate_to: localhost
```

The template file can reference remote host variables:

```yaml
# templates/monitoring-host.yml.j2
# Auto-generated monitoring configuration for {{ inventory_hostname }}
host:
  name: {{ inventory_hostname }}
  address: {{ ansible_host }}
  os: {{ ansible_distribution }} {{ ansible_distribution_version }}
  cpus: {{ ansible_processor_vcpus }}
  memory_mb: {{ ansible_memtotal_mb }}
  checks:
    - type: ping
      interval: 30s
    - type: http
      url: http://{{ ansible_host }}:8080/health
      interval: 10s
```

## Parallel Execution Considerations

When delegating to localhost, keep in mind that tasks are still executed per host. If you have 50 hosts and each one fires an API call delegated to localhost, those 50 API calls happen from your controller. If your `forks` setting is high, many of these run in parallel.

```yaml
# throttle-localhost.yml - Throttle delegated tasks to avoid overwhelming APIs
---
- name: Register servers with rate-limited API
  hosts: webservers
  tasks:
    - name: Register with inventory API (throttled)
      ansible.builtin.uri:
        url: "http://cmdb.example.com/api/register"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip: "{{ ansible_host }}"
      delegate_to: localhost
      throttle: 5          # Only 5 concurrent API calls at a time
```

The `throttle` parameter limits how many hosts can execute this task concurrently. This prevents you from overwhelming an API endpoint or exceeding rate limits.

## Summary

Delegating to localhost is a fundamental Ansible pattern for any task that should execute on the controller: API calls, notifications, local file generation, template rendering, and CMDB updates. The key points to remember are that variables always reference the original remote host, `become` applies on the controller when delegated, and you should use `throttle` to limit concurrent local operations. Combined with `run_once` for tasks that only need to happen once regardless of host count, localhost delegation gives you flexible control over where each piece of your automation runs.
