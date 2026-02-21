# How to Use Ansible loop with Registered Variable Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Registered Variables, Automation

Description: Learn how to register variables inside Ansible loops and iterate over the results in subsequent tasks for powerful multi-step automation workflows.

---

Registered variables are one of Ansible's most powerful features. When you combine them with loops, you get the ability to execute a task for multiple items, capture all the results, and then process those results in follow-up tasks. This pattern is fundamental for building intelligent, reactive playbooks.

## How Registered Variables Work in Loops

When you use `register` on a task without a loop, you get a single result object. When you use `register` on a task with a loop, Ansible stores all the individual results in a `.results` list:

```yaml
# Register results from a loop and inspect the structure
- name: Check if config files exist
  ansible.builtin.stat:
    path: "{{ item }}"
  loop:
    - /etc/nginx/nginx.conf
    - /etc/postgresql/14/main/postgresql.conf
    - /etc/redis/redis.conf
    - /etc/nonexistent.conf
  register: config_checks

- name: Show the registered results structure
  ansible.builtin.debug:
    var: config_checks
```

The `config_checks` variable will have this structure:

```json
{
  "results": [
    {
      "item": "/etc/nginx/nginx.conf",
      "stat": { "exists": true, ... },
      "changed": false
    },
    {
      "item": "/etc/postgresql/14/main/postgresql.conf",
      "stat": { "exists": true, ... },
      "changed": false
    },
    ...
  ],
  "changed": false,
  "msg": "All items completed"
}
```

Each entry in `.results` has:
- `.item` - the original loop item that produced this result
- All the normal return values from the module (`.stat`, `.stdout`, `.rc`, etc.)
- `.changed` - whether that iteration reported a change

## Looping Over Registered Results

The most common pattern is to loop over `.results` in a subsequent task:

```yaml
# Check services and restart any that are stopped
- name: Check service status
  ansible.builtin.command: systemctl is-active {{ item }}
  loop:
    - nginx
    - postgresql
    - redis
    - memcached
  register: service_checks
  changed_when: false
  failed_when: false

- name: Restart stopped services
  ansible.builtin.systemd:
    name: "{{ item.item }}"
    state: started
  loop: "{{ service_checks.results }}"
  when: item.rc != 0
  loop_control:
    label: "{{ item.item }}"
```

The second task loops over the results from the first task. Each `item` in this loop is a result object. `item.item` refers back to the original loop value (the service name), and `item.rc` is the return code from the command.

## Filtering Registered Results

You can filter the results list before looping:

```yaml
# Only process results where the command failed
- name: Download files
  ansible.builtin.get_url:
    url: "{{ item.url }}"
    dest: "{{ item.dest }}"
  loop:
    - { url: "https://example.com/file1.tar.gz", dest: "/tmp/file1.tar.gz" }
    - { url: "https://example.com/file2.tar.gz", dest: "/tmp/file2.tar.gz" }
    - { url: "https://example.com/file3.tar.gz", dest: "/tmp/file3.tar.gz" }
  register: downloads
  ignore_errors: yes

# Retry only the failed downloads
- name: Retry failed downloads
  ansible.builtin.get_url:
    url: "{{ item.item.url }}"
    dest: "{{ item.item.dest }}"
  loop: "{{ downloads.results | selectattr('failed', 'equalto', true) | list }}"
  loop_control:
    label: "{{ item.item.url | basename }}"
```

## Extracting Data from Registered Results

Use `map` and other filters to extract specific data:

```yaml
# Get disk usage for multiple mount points and extract the percentage
- name: Check disk usage
  ansible.builtin.command: df --output=pcent {{ item }}
  loop:
    - /
    - /var
    - /home
    - /data
  register: disk_usage
  changed_when: false

- name: Parse and report disk usage
  ansible.builtin.debug:
    msg: "{{ item.item }}: {{ item.stdout_lines[-1] | trim }}"
  loop: "{{ disk_usage.results }}"
  loop_control:
    label: "{{ item.item }}"

- name: Alert on high disk usage
  ansible.builtin.debug:
    msg: "WARNING: {{ item.item }} is at {{ item.stdout_lines[-1] | trim }}"
  loop: "{{ disk_usage.results }}"
  when: (item.stdout_lines[-1] | trim | regex_replace('%', '') | int) > 80
  loop_control:
    label: "{{ item.item }}"
```

## Building Variables from Registered Results

You can construct new variables from registered loop results:

```yaml
# Collect package versions and build a report
- name: Get installed package versions
  ansible.builtin.command: dpkg-query -W -f='${Version}' {{ item }}
  loop:
    - nginx
    - postgresql
    - redis-server
    - python3
  register: pkg_versions
  changed_when: false
  failed_when: false

- name: Build version report
  ansible.builtin.set_fact:
    version_report: "{{ version_report | default({}) | combine({item.item: item.stdout | default('NOT INSTALLED')}) }}"
  loop: "{{ pkg_versions.results }}"
  loop_control:
    label: "{{ item.item }}"

- name: Display version report
  ansible.builtin.debug:
    var: version_report
```

This builds a dictionary mapping package names to their installed versions, handling cases where a package is not installed.

## Chaining Multiple Registered Loops

You can chain several tasks where each one processes the registered output of the previous:

```yaml
# Multi-step process: find, validate, and deploy configuration files
- name: Find configuration files
  ansible.builtin.find:
    paths: /opt/configs/pending
    patterns: "*.conf"
  register: pending_configs

- name: Validate each configuration file
  ansible.builtin.command: /opt/tools/validate-config {{ item.path }}
  loop: "{{ pending_configs.files }}"
  register: validations
  changed_when: false
  failed_when: false
  loop_control:
    label: "{{ item.path | basename }}"

- name: Deploy only valid configurations
  ansible.builtin.copy:
    src: "{{ item.item.path }}"
    dest: "/etc/myapp/conf.d/{{ item.item.path | basename }}"
    remote_src: yes
  loop: "{{ validations.results }}"
  when: item.rc == 0
  loop_control:
    label: "{{ item.item.path | basename }}"

- name: Report invalid configurations
  ansible.builtin.debug:
    msg: "INVALID: {{ item.item.path | basename }} - {{ item.stderr }}"
  loop: "{{ validations.results }}"
  when: item.rc != 0
  loop_control:
    label: "{{ item.item.path | basename }}"
```

This three-step chain finds files, validates them, and deploys only the valid ones while reporting the invalid ones.

## Aggregating Results for Reporting

```yaml
# Run health checks and produce a summary
- name: Health check all endpoints
  ansible.builtin.uri:
    url: "{{ item }}"
    status_code: [200, 301, 302]
    timeout: 5
  loop:
    - https://api.example.com/health
    - https://web.example.com/health
    - https://admin.example.com/health
    - https://ws.example.com/health
  register: health_checks
  ignore_errors: yes

- name: Build health summary
  ansible.builtin.set_fact:
    healthy_count: "{{ health_checks.results | selectattr('status', 'defined') | selectattr('status', 'equalto', 200) | list | length }}"
    total_count: "{{ health_checks.results | length }}"

- name: Report health status
  ansible.builtin.debug:
    msg: "{{ healthy_count }}/{{ total_count }} endpoints are healthy"

- name: List unhealthy endpoints
  ansible.builtin.debug:
    msg: "UNHEALTHY: {{ item.item }}"
  loop: "{{ health_checks.results }}"
  when: item is failed or (item.status is defined and item.status != 200)
  loop_control:
    label: "{{ item.item }}"
```

## Practical Example: Automated Remediation

Here is a complete playbook that checks, reports, and fixes issues:

```yaml
# Automated system health check and remediation
- name: System health check and fix
  hosts: all
  become: yes
  vars:
    critical_services:
      - nginx
      - postgresql
      - redis-server
      - cron

  tasks:
    - name: Check all critical services
      ansible.builtin.command: systemctl is-active {{ item }}
      loop: "{{ critical_services }}"
      register: service_status
      changed_when: false
      failed_when: false

    - name: Identify stopped services
      ansible.builtin.set_fact:
        stopped_services: >-
          {{
            service_status.results
            | rejectattr('rc', 'equalto', 0)
            | map(attribute='item')
            | list
          }}

    - name: Report stopped services
      ansible.builtin.debug:
        msg: "Services down on {{ inventory_hostname }}: {{ stopped_services | join(', ') }}"
      when: stopped_services | length > 0

    - name: Attempt to restart stopped services
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: started
      loop: "{{ stopped_services }}"
      register: restart_results
      ignore_errors: yes

    - name: Verify restarts
      ansible.builtin.command: systemctl is-active {{ item.item }}
      loop: "{{ restart_results.results | default([]) }}"
      register: verify_results
      changed_when: false
      failed_when: false
      when: restart_results.results is defined
      loop_control:
        label: "{{ item.item }}"

    - name: Report services that could not be restarted
      ansible.builtin.debug:
        msg: "CRITICAL: {{ item.item.item }} failed to restart on {{ inventory_hostname }}"
      loop: "{{ verify_results.results | default([]) }}"
      when:
        - verify_results.results is defined
        - item.rc is defined
        - item.rc != 0
      loop_control:
        label: "{{ item.item.item | default('unknown') }}"
```

This playbook checks all critical services, identifies stopped ones, attempts to restart them, and reports any that could not be recovered. Each step builds on the registered results of the previous step.

## Tips for Working with Registered Loop Results

Always use `loop_control` with `label` when looping over registered results. The full result objects are very verbose and will flood your terminal.

When accessing nested registered results (results from a loop that processed results from another loop), the nesting can get deep: `item.item.item`. Consider using `set_fact` to flatten the data at each step instead.

Use `failed_when: false` on information-gathering loops so that failures in individual items do not stop the entire playbook. Then filter on `.failed` or `.rc` in subsequent tasks.

## Summary

Registered variables in loops capture per-item results in a `.results` list. Each result includes the original `.item` plus all module return values. You can loop over these results, filter them with `selectattr` and `rejectattr`, extract data with `map`, and build new variables from them. This enables powerful multi-step workflows where each task reacts to the outcomes of previous tasks.
