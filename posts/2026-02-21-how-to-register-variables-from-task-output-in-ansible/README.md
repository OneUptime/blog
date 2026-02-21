# How to Register Variables from Task Output in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Task Output, DevOps

Description: Learn how to capture Ansible task output using the register keyword and use the result in subsequent tasks for conditional logic and data processing.

---

One of the most powerful features in Ansible is the ability to capture the output of a task and use it later in the playbook. The `register` keyword stores the entire result of a task into a variable, giving you access to return codes, stdout, stderr, changed status, and module-specific data. This is essential for building playbooks that make decisions based on the actual state of the system rather than assumptions.

## Basic Registration

Every task in Ansible returns a result dictionary. The `register` keyword captures it:

```yaml
---
# basic-register.yml
# Capture command output and display it

- hosts: webservers
  tasks:
    # Run a command and store the result
    - name: Get current disk usage
      command: df -h /
      register: disk_result

    # Display the captured output
    - name: Show disk usage
      debug:
        var: disk_result
```

The `disk_result` variable contains a dictionary with multiple fields. Here is what it looks like:

```json
{
    "changed": true,
    "cmd": ["df", "-h", "/"],
    "delta": "0:00:00.003",
    "end": "2026-02-21 10:30:00.123",
    "rc": 0,
    "start": "2026-02-21 10:30:00.120",
    "stderr": "",
    "stderr_lines": [],
    "stdout": "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        50G   12G   35G  26% /",
    "stdout_lines": [
        "Filesystem      Size  Used Avail Use% Mounted on",
        "/dev/sda1        50G   12G   35G  26% /"
    ]
}
```

## Accessing Registered Data

You can access specific parts of the registered variable:

```yaml
---
# access-registered.yml
# Different ways to access registered variable data

- hosts: webservers
  tasks:
    - name: Check application version
      command: /opt/myapp/bin/myapp --version
      register: version_check
      changed_when: false    # This command does not change anything

    # Access just the stdout
    - name: Show version
      debug:
        msg: "App version: {{ version_check.stdout }}"

    # Access the return code
    - name: Show return code
      debug:
        msg: "Command exit code: {{ version_check.rc }}"

    # Access stdout as a list of lines
    - name: Show first line of output
      debug:
        msg: "First line: {{ version_check.stdout_lines[0] }}"

    # Access stderr (if any)
    - name: Show errors
      debug:
        msg: "Errors: {{ version_check.stderr }}"
      when: version_check.stderr | length > 0
```

## Using Registered Variables for Conditionals

The most common use of `register` is to make decisions based on task results:

```yaml
---
# conditional-register.yml
# Make decisions based on registered task output

- hosts: webservers
  become: yes
  tasks:
    # Check if the application is already installed
    - name: Check for existing installation
      stat:
        path: /opt/myapp/bin/myapp
      register: app_exists

    # Only install if not already present
    - name: Install application
      unarchive:
        src: "https://releases.example.com/myapp-latest.tar.gz"
        dest: /opt/myapp
        remote_src: yes
      when: not app_exists.stat.exists

    # Check if a service is running
    - name: Check nginx status
      command: systemctl is-active nginx
      register: nginx_status
      failed_when: false    # Do not fail if nginx is not running
      changed_when: false

    # Act based on the service status
    - name: Start nginx if it is not running
      service:
        name: nginx
        state: started
      when: nginx_status.rc != 0

    # Check current config and compare
    - name: Get current nginx config hash
      stat:
        path: /etc/nginx/nginx.conf
        checksum_algorithm: sha256
      register: current_config

    - name: Show config checksum
      debug:
        msg: "Current config SHA256: {{ current_config.stat.checksum }}"
```

## Registering Loop Results

When a task uses a loop, the registered variable contains a `results` list with one entry per loop iteration:

```yaml
---
# register-loop.yml
# Register results from a looped task

- hosts: webservers
  tasks:
    # Check multiple services
    - name: Check service status
      command: "systemctl is-active {{ item }}"
      loop:
        - nginx
        - postgresql
        - redis-server
        - myapp
      register: service_checks
      failed_when: false
      changed_when: false

    # Display the status of each service
    - name: Show service statuses
      debug:
        msg: "{{ item.item }}: {{ item.stdout }}"
      loop: "{{ service_checks.results }}"

    # Build a list of stopped services
    - name: Identify stopped services
      set_fact:
        stopped_services: "{{ service_checks.results | selectattr('rc', 'ne', 0) | map(attribute='item') | list }}"

    - name: Report stopped services
      debug:
        msg: "These services are not running: {{ stopped_services }}"
      when: stopped_services | length > 0

    # Start any stopped services
    - name: Start stopped services
      service:
        name: "{{ item }}"
        state: started
      loop: "{{ stopped_services }}"
      when: stopped_services | length > 0
      become: yes
```

## Module-Specific Return Values

Different modules return different data structures. Here are some common ones:

### The stat Module

```yaml
- name: Check file properties
  stat:
    path: /etc/myapp/config.yml
  register: config_file

- name: Show file info
  debug:
    msg: |
      Exists: {{ config_file.stat.exists }}
      Size: {{ config_file.stat.size | default('N/A') }} bytes
      Owner: {{ config_file.stat.pw_name | default('N/A') }}
      Mode: {{ config_file.stat.mode | default('N/A') }}
      Modified: {{ config_file.stat.mtime | default('N/A') }}
  when: config_file.stat.exists
```

### The uri Module

```yaml
- name: Call application API
  uri:
    url: http://localhost:8080/api/status
    return_content: yes
  register: api_response

- name: Process API response
  debug:
    msg: |
      Status Code: {{ api_response.status }}
      Content Type: {{ api_response.content_type }}
      Response Body: {{ api_response.json }}
```

### The find Module

```yaml
- name: Find log files older than 7 days
  find:
    paths: /var/log/myapp
    age: 7d
    recurse: yes
  register: old_logs

- name: Show how many old log files were found
  debug:
    msg: "Found {{ old_logs.matched }} log files older than 7 days, totaling {{ old_logs.files | map(attribute='size') | sum }} bytes"

- name: Remove old log files
  file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ old_logs.files }}"
  when: old_logs.matched > 0
```

## Parsing Registered Output

Often you need to extract specific data from command output:

```yaml
---
# parse-output.yml
# Parse and transform registered command output

- hosts: databases
  tasks:
    # Get PostgreSQL version
    - name: Get PostgreSQL version
      command: psql --version
      register: psql_version_raw
      changed_when: false

    # Extract just the version number
    - name: Parse version number
      set_fact:
        psql_version: "{{ psql_version_raw.stdout | regex_search('([0-9]+\\.[0-9]+)') }}"

    - name: Show PostgreSQL version
      debug:
        msg: "PostgreSQL version: {{ psql_version }}"

    # Get active database connections as JSON
    - name: Query active connections
      command: >
        psql -t -A -c
        "SELECT json_agg(row_to_json(t))
         FROM (SELECT datname, count(*) as connections
               FROM pg_stat_activity
               GROUP BY datname) t"
      register: db_connections_raw
      become: yes
      become_user: postgres
      changed_when: false

    # Parse the JSON output
    - name: Parse connection data
      set_fact:
        db_connections: "{{ db_connections_raw.stdout | from_json }}"

    - name: Show connection counts
      debug:
        msg: "Database {{ item.datname }}: {{ item.connections }} connections"
      loop: "{{ db_connections }}"
```

## Handling Failed Tasks

By default, a failed task stops the playbook. Use `failed_when` and `ignore_errors` to control this:

```yaml
---
# handle-failures.yml
# Register results from tasks that might fail

- hosts: webservers
  tasks:
    # Custom failure condition: only fail if exit code is not 0 or 1
    - name: Check application health
      command: /opt/myapp/bin/healthcheck
      register: health_result
      failed_when: health_result.rc > 1
      # rc=0 means healthy, rc=1 means degraded, rc>1 means broken

    - name: Handle degraded state
      include_tasks: tasks/handle-degraded.yml
      when: health_result.rc == 1

    # Ignore errors but still capture the result
    - name: Try to connect to optional service
      uri:
        url: http://optional-service:8080/ping
        timeout: 5
      register: optional_service
      ignore_errors: yes

    - name: Configure optional service integration
      template:
        src: optional-service.conf.j2
        dest: /etc/myapp/optional-service.conf
      when: optional_service is succeeded
```

## Registered Variables and changed_when

Use `changed_when` to prevent read-only commands from showing as "changed":

```yaml
# Without changed_when, every command reports "changed"
- name: Get current date
  command: date
  register: current_date
  changed_when: false    # This command never changes anything

# Dynamic changed_when based on output
- name: Run database migration
  command: /opt/myapp/bin/migrate
  register: migration_result
  changed_when: "'Applied' in migration_result.stdout"
```

## Wrapping Up

The `register` keyword turns Ansible from a simple task runner into a powerful orchestration tool. By capturing task output, you can build playbooks that inspect the system, make intelligent decisions, and adapt their behavior based on what they find. Remember to use `changed_when: false` for read-only commands, `failed_when` for custom error handling, and `stdout_lines` when you need to process output line by line. The combination of `register`, `when`, and `set_fact` gives you the building blocks for sophisticated automation workflows.
