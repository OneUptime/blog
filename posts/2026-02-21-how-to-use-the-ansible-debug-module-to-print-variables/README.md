# How to Use the Ansible debug Module to Print Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Playbooks, Variables

Description: Learn how to use the Ansible debug module to inspect and print variables during playbook execution for faster troubleshooting.

---

When an Ansible playbook does not do what you expect, the first thing you need is visibility. What value does this variable actually hold? Is that registered result structured the way I think it is? The `debug` module is the simplest and most frequently used tool for answering these questions. This post covers everything you need to know about printing variables during playbook execution.

## The Basics: Printing a Variable

The most common use of the debug module is printing the value of a variable:

```yaml
# Print the value of a single variable
- name: Show the target environment
  ansible.builtin.debug:
    var: target_env
```

The `var` parameter takes a variable name (without curly braces) and prints its value. The output looks like this:

```
ok: [web-01] => {
    "target_env": "production"
}
```

## Printing Variables with msg

If you want more context around the variable value, use the `msg` parameter instead:

```yaml
# Print a message that includes variable values
- name: Show deployment details
  ansible.builtin.debug:
    msg: "Deploying version {{ app_version }} to {{ target_env }} on {{ inventory_hostname }}"
```

Output:

```
ok: [web-01] => {
    "msg": "Deploying version 2.4.1 to production on web-01"
}
```

The `msg` parameter accepts Jinja2 expressions, so you can use filters, conditionals, and any other Jinja2 feature inside it.

## Printing Ansible Facts

Ansible facts are automatically gathered variables about your hosts. You can print them just like any other variable:

```yaml
# Print specific facts about the target host
- name: Show OS information
  ansible.builtin.debug:
    msg: "OS: {{ ansible_distribution }} {{ ansible_distribution_version }}, Arch: {{ ansible_architecture }}"

- name: Show memory information
  ansible.builtin.debug:
    var: ansible_memtotal_mb

- name: Show all network interfaces
  ansible.builtin.debug:
    var: ansible_interfaces
```

If you want to see all available facts, you can print the entire `ansible_facts` dictionary:

```yaml
# Print all gathered facts (warning: very verbose)
- name: Show all facts
  ansible.builtin.debug:
    var: ansible_facts
```

## Printing Registered Variables

Registered variables are one of the most common things to debug. When a task does not work as expected, printing the registered result reveals the full structure:

```yaml
# Register a result and print it to see the full structure
- name: Check disk space
  ansible.builtin.command:
    cmd: df -h /
  register: disk_result
  changed_when: false

- name: Show the full registered result
  ansible.builtin.debug:
    var: disk_result

- name: Show just stdout
  ansible.builtin.debug:
    var: disk_result.stdout

- name: Show stdout as a list of lines
  ansible.builtin.debug:
    var: disk_result.stdout_lines
```

The full registered result includes fields like `rc` (return code), `stdout`, `stderr`, `stdout_lines`, `stderr_lines`, `changed`, `failed`, and more. Printing the whole thing helps you understand what data is available.

## Printing Dictionary and List Variables

When working with complex data structures, the debug module handles them natively:

```yaml
# Print a dictionary variable
- name: Define server config
  ansible.builtin.set_fact:
    server_config:
      port: 8080
      workers: 4
      ssl_enabled: true
      allowed_origins:
        - "https://example.com"
        - "https://api.example.com"

- name: Show full config
  ansible.builtin.debug:
    var: server_config

- name: Show a specific key
  ansible.builtin.debug:
    var: server_config.port

- name: Show the list of allowed origins
  ansible.builtin.debug:
    var: server_config.allowed_origins
```

You can also use bracket notation for keys that contain special characters:

```yaml
# Access keys with dots or hyphens using bracket notation
- name: Show a specific nested value
  ansible.builtin.debug:
    var: server_config['ssl_enabled']
```

## Printing Variables in Loops

You can combine the debug module with loops to print multiple values:

```yaml
# Print each item in a list
- name: Show all configured databases
  ansible.builtin.debug:
    msg: "Database: {{ item.name }} on {{ item.host }}:{{ item.port }}"
  loop:
    - { name: 'users_db', host: 'db-01', port: 5432 }
    - { name: 'orders_db', host: 'db-02', port: 5432 }
    - { name: 'cache_db', host: 'redis-01', port: 6379 }
```

For printing registered results from loop tasks:

```yaml
# Check multiple services and print their status
- name: Check service status
  ansible.builtin.command:
    cmd: "systemctl is-active {{ item }}"
  loop:
    - nginx
    - postgresql
    - redis-server
  register: service_checks
  failed_when: false
  changed_when: false

- name: Show status of each service
  ansible.builtin.debug:
    msg: "{{ item.item }}: {{ item.stdout }}"
  loop: "{{ service_checks.results }}"
```

## Printing Variable Types

Sometimes the issue is not the value but the type. A string "8080" and an integer 8080 behave differently in comparisons:

```yaml
# Check the type of a variable
- name: Show variable type
  ansible.builtin.debug:
    msg: "app_port is {{ app_port }} (type: {{ app_port | type_debug }})"

- name: Show multiple type checks
  ansible.builtin.debug:
    msg: |
      String var: {{ my_string }} ({{ my_string | type_debug }})
      Int var: {{ my_int }} ({{ my_int | type_debug }})
      Bool var: {{ my_bool }} ({{ my_bool | type_debug }})
      List var: {{ my_list }} ({{ my_list | type_debug }})
```

The `type_debug` filter is invaluable when you are getting unexpected behavior from conditionals or filters.

## Printing Hostvars from Other Hosts

You can access variables from other hosts using `hostvars`:

```yaml
# Print a variable from a different host
- name: Show the IP of the database server
  ansible.builtin.debug:
    msg: "DB server IP: {{ hostvars['db-01']['ansible_default_ipv4']['address'] }}"

# Print variables from all hosts in a group
- name: Show all webserver IPs
  ansible.builtin.debug:
    msg: "{{ item }}: {{ hostvars[item]['ansible_default_ipv4']['address'] }}"
  loop: "{{ groups['webservers'] }}"
```

## Using Filters to Format Output

The debug module works with all Jinja2 filters, which helps you format the output for readability:

```yaml
# Pretty print a JSON structure
- name: Show config as formatted JSON
  ansible.builtin.debug:
    msg: "{{ server_config | to_nice_json }}"

# Show as YAML
- name: Show config as YAML
  ansible.builtin.debug:
    msg: "{{ server_config | to_nice_yaml }}"

# Filter and sort a list
- name: Show sorted package list
  ansible.builtin.debug:
    msg: "{{ packages | sort | join(', ') }}"

# Show only certain keys from a dictionary
- name: Show only database hosts
  ansible.builtin.debug:
    msg: "{{ databases | map(attribute='host') | list }}"
```

## Conditional Debug Output

You can combine `when` with debug to only print in certain situations:

```yaml
# Only print when something unexpected happens
- name: Check available memory
  ansible.builtin.setup:
    gather_subset:
      - hardware

- name: Warn about low memory
  ansible.builtin.debug:
    msg: "WARNING: Only {{ ansible_memfree_mb }}MB free memory on {{ inventory_hostname }}"
  when: ansible_memfree_mb < 512

# Print different messages based on conditions
- name: Report deployment readiness
  ansible.builtin.debug:
    msg: >-
      {{ inventory_hostname }} is
      {{ 'ready for deployment' if disk_free_gb | int > 10 else 'LOW ON DISK SPACE' }}
```

## Practical Example: Debugging a Full Deployment

Here is a complete playbook that uses debug statements to trace a deployment:

```yaml
---
- name: Deploy application with debug tracing
  hosts: webservers
  become: true

  vars:
    app_name: mywebapp
    deploy_version: "2.5.0"

  tasks:
    - name: Print deployment parameters
      ansible.builtin.debug:
        msg: |
          Deployment Parameters:
            App: {{ app_name }}
            Version: {{ deploy_version }}
            Host: {{ inventory_hostname }}
            OS: {{ ansible_distribution }} {{ ansible_distribution_version }}
            Free disk: {{ ansible_mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_available') | first | int // (1024*1024*1024) }}GB

    - name: Download release artifact
      ansible.builtin.get_url:
        url: "https://releases.example.com/{{ app_name }}/{{ deploy_version }}.tar.gz"
        dest: "/tmp/{{ app_name }}-{{ deploy_version }}.tar.gz"
      register: download_result

    - name: Print download result
      ansible.builtin.debug:
        var: download_result
      when: download_result is changed

    - name: Get current running version
      ansible.builtin.command:
        cmd: "cat /opt/{{ app_name }}/VERSION"
      register: current_version
      failed_when: false
      changed_when: false

    - name: Print version comparison
      ansible.builtin.debug:
        msg: "Upgrading from {{ current_version.stdout | default('N/A') }} to {{ deploy_version }}"

    - name: Extract release
      ansible.builtin.unarchive:
        src: "/tmp/{{ app_name }}-{{ deploy_version }}.tar.gz"
        dest: "/opt/{{ app_name }}/"
        remote_src: true
      register: extract_result

    - name: Print extraction details
      ansible.builtin.debug:
        msg: "Extraction changed: {{ extract_result.changed }}, dest: {{ extract_result.dest }}"
```

## Helpful Patterns

Here are a few patterns I use regularly:

```yaml
# Print all variables available to a host
- name: Dump all variables (careful, very verbose)
  ansible.builtin.debug:
    var: vars

# Print inventory groups the current host belongs to
- name: Show host group membership
  ansible.builtin.debug:
    var: group_names

# Print the inventory hostname vs the actual hostname
- name: Show hostname details
  ansible.builtin.debug:
    msg: "Inventory: {{ inventory_hostname }}, Actual: {{ ansible_hostname }}, FQDN: {{ ansible_fqdn }}"
```

## Summary

The debug module is your primary tool for inspecting what is happening inside an Ansible playbook. Use `var` for quick variable dumps, `msg` for formatted output with context, and always register task results before printing them. Combine debug with `when` conditions to avoid noisy output, and use filters like `type_debug`, `to_nice_json`, and `to_nice_yaml` to make complex data structures readable. The few seconds it takes to add a debug task can save you hours of guessing why a playbook is not working as expected.
