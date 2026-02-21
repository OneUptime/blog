# How to Use the Ansible lines Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Shell Commands, Automation

Description: Learn how to use the Ansible lines lookup plugin to capture the output of shell commands as a list of lines for use in playbooks.

---

Sometimes you need the output of a local command to drive your Ansible tasks. Maybe you need a list of running containers, the output of a custom script, or data from a CLI tool. The `lines` lookup plugin runs a command on the Ansible controller and returns its stdout split into a list of lines. Each line becomes a separate item you can loop over or process.

## What the lines Lookup Does

The `lines` lookup plugin executes a command on the Ansible controller machine (not on remote hosts) and returns the standard output as a list of strings, one per line. It is essentially a shortcut for running a command and splitting the output by newlines.

## Basic Usage

The simplest usage runs a command and shows the output.

This playbook lists the contents of a local directory:

```yaml
# playbook.yml - Run a command and get output as lines
---
- name: Use local command output
  hosts: localhost
  tasks:
    - name: List local config files
      ansible.builtin.debug:
        msg: "File: {{ item }}"
      loop: "{{ lookup('lines', 'ls /etc/myapp/conf.d/').splitlines() }}"
```

Note: The `lines` lookup returns a single string with newlines. Use `.splitlines()` to convert it to a list for looping.

## Practical Example: Docker Container Management

Here is a real scenario where you need to get a list of running Docker containers and take action on them.

```yaml
# playbook.yml - Manage Docker containers based on running state
---
- name: Docker container management
  hosts: localhost
  tasks:
    - name: Get list of running container names
      ansible.builtin.set_fact:
        running_containers: "{{ lookup('lines', 'docker ps --format \"{{.Names}}\"').splitlines() }}"

    - name: Display running containers
      ansible.builtin.debug:
        msg: "Running container: {{ item }}"
      loop: "{{ running_containers }}"

    - name: Check health of each container
      ansible.builtin.command:
        cmd: "docker inspect --format='{{ '{{' }}.State.Health.Status{{ '}}' }}' {{ item }}"
      loop: "{{ running_containers }}"
      register: health_checks
      ignore_errors: true

    - name: Report unhealthy containers
      ansible.builtin.debug:
        msg: "WARNING: {{ item.item }} is {{ item.stdout }}"
      loop: "{{ health_checks.results }}"
      when: item.stdout is defined and item.stdout != 'healthy'
```

## Feeding Script Output into Variables

You can capture the output of custom scripts and use the results throughout your playbook.

This example reads server lists from a custom inventory script:

```yaml
# playbook.yml - Use script output as variables
---
- name: Process custom script output
  hosts: localhost
  vars:
    # Get the list of database replicas from a custom script
    db_replicas: "{{ lookup('lines', playbook_dir + '/scripts/get_replicas.sh').splitlines() }}"
  tasks:
    - name: Show discovered replicas
      ansible.builtin.debug:
        msg: "Replica server: {{ item }}"
      loop: "{{ db_replicas }}"

    - name: Check replication lag on each replica
      ansible.builtin.command:
        cmd: "scripts/check_lag.sh {{ item }}"
      loop: "{{ db_replicas }}"
      register: lag_results

    - name: Alert on high replication lag
      ansible.builtin.debug:
        msg: "HIGH LAG on {{ item.item }}: {{ item.stdout }} seconds"
      loop: "{{ lag_results.results }}"
      when: (item.stdout | int) > 30
```

## Parsing Structured Command Output

When commands output structured data, you can parse each line to extract what you need.

This playbook parses the output of `df` to find filesystems running low on space:

```yaml
# playbook.yml - Parse df output to check disk usage
---
- name: Check local disk usage
  hosts: localhost
  tasks:
    - name: Get disk usage information
      ansible.builtin.set_fact:
        disk_lines: "{{ lookup('lines', 'df -h --output=target,pcent | tail -n +2').splitlines() }}"

    - name: Parse and check each filesystem
      ansible.builtin.debug:
        msg: "WARNING: {{ item.split()[0] }} is at {{ item.split()[1] }}"
      loop: "{{ disk_lines }}"
      when: (item.split()[1] | regex_replace('%', '') | int) > 80
```

## Using lines with Git

A common use case is pulling information from git for deployment tagging or version tracking.

```yaml
# playbook.yml - Get git information for deployment
---
- name: Deploy with git metadata
  hosts: appservers
  vars:
    git_branch: "{{ lookup('lines', 'git -C ' + playbook_dir + ' rev-parse --abbrev-ref HEAD') }}"
    git_commit: "{{ lookup('lines', 'git -C ' + playbook_dir + ' rev-parse --short HEAD') }}"
    git_author: "{{ lookup('lines', 'git -C ' + playbook_dir + ' log -1 --format=%an') }}"
    recent_commits: "{{ lookup('lines', 'git -C ' + playbook_dir + ' log --oneline -5').splitlines() }}"
  tasks:
    - name: Show deployment info
      ansible.builtin.debug:
        msg: |
          Deploying from: {{ git_branch }}
          Commit: {{ git_commit }}
          Last changed by: {{ git_author }}

    - name: Show recent commits being deployed
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ recent_commits }}"

    - name: Tag the deployment on remote host
      ansible.builtin.copy:
        content: |
          branch={{ git_branch }}
          commit={{ git_commit }}
          deployed_at={{ ansible_date_time.iso8601 }}
          deployed_by={{ git_author }}
        dest: /etc/myapp/deploy.info
        mode: '0644'
```

## Combining with Filters

You can chain Ansible filters to transform the output before using it.

This playbook processes a list, filtering and transforming it:

```yaml
# playbook.yml - Process command output with filters
---
- name: Process and filter command output
  hosts: localhost
  tasks:
    # Get all .service files that are enabled
    - name: Get enabled systemd services
      ansible.builtin.set_fact:
        enabled_services: >-
          {{ lookup('lines', 'systemctl list-unit-files --type=service --state=enabled --no-legend')
             .splitlines()
             | map('regex_replace', '\\s+.*$', '')
             | list }}

    - name: Show enabled services count
      ansible.builtin.debug:
        msg: "Found {{ enabled_services | length }} enabled services"

    # Filter to only application services
    - name: Show application services
      ansible.builtin.debug:
        msg: "App service: {{ item }}"
      loop: "{{ enabled_services | select('match', 'myapp.*') | list }}"
```

## Error Handling

If the command fails (returns a non-zero exit code), the lookup will raise an error. Handle this with `errors='ignore'` or block/rescue.

```yaml
# playbook.yml - Handle command failures gracefully
---
- name: Safely run commands with lines lookup
  hosts: localhost
  tasks:
    # Use errors='ignore' for optional commands
    - name: Try to get optional data
      ansible.builtin.set_fact:
        optional_data: "{{ lookup('lines', 'some-optional-command', errors='ignore') | default('') }}"

    - name: Process data if available
      ansible.builtin.debug:
        msg: "Got data: {{ optional_data }}"
      when: optional_data | length > 0

    # Use block/rescue for critical commands
    - name: Run critical command with fallback
      block:
        - name: Get current cluster state
          ansible.builtin.set_fact:
            cluster_nodes: "{{ lookup('lines', 'kubectl get nodes -o name').splitlines() }}"
      rescue:
        - name: Use cached node list
          ansible.builtin.set_fact:
            cluster_nodes: "{{ lookup('file', 'cache/nodes.txt').splitlines() }}"
        - name: Warn about using cache
          ansible.builtin.debug:
            msg: "WARNING: kubectl failed, using cached node list"
```

## lines vs pipe vs command Module

It is worth understanding when to use each approach:

- **lines lookup**: Runs on the controller at variable evaluation time. Best for getting data you need in variable definitions or `loop` expressions.
- **pipe lookup**: Similar to lines, but returns a single string instead of splitting by lines. Use when you need the raw output as one value.
- **command/shell module**: Runs on the remote host during task execution. Use when you need to run commands on the target servers, not the controller.

```yaml
# playbook.yml - Comparing different approaches
---
- name: Compare lines vs pipe vs command
  hosts: webservers
  vars:
    # lines lookup - runs on controller, returns list of lines
    local_users: "{{ lookup('lines', 'getent passwd | cut -d: -f1').splitlines() }}"
    # pipe lookup - runs on controller, returns single string
    controller_hostname: "{{ lookup('pipe', 'hostname -f') }}"
  tasks:
    # command module - runs on the remote host
    - name: Get remote hostname
      ansible.builtin.command:
        cmd: hostname -f
      register: remote_hostname

    - name: Compare
      ansible.builtin.debug:
        msg: |
          Controller users: {{ local_users | length }}
          Controller hostname: {{ controller_hostname }}
          Remote hostname: {{ remote_hostname.stdout }}
```

## Security Considerations

Since the `lines` lookup runs arbitrary commands on your controller, keep these points in mind:

1. **Never pass untrusted input** as part of the command string. This could lead to command injection.
2. **Commands run with the privileges** of the user running Ansible. Be careful with commands that could modify your controller's state.
3. **Output is not sanitized**. If you pass the output to a shell command on a remote host, be mindful of special characters.

The `lines` lookup is a straightforward bridge between local command output and Ansible's data model. It is at its most useful when you need to query the state of your local environment and use that information to drive your automation logic.
