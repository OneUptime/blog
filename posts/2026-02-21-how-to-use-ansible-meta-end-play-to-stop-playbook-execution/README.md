# How to Use Ansible meta end_play to Stop Playbook Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Meta, Playbook Control, Automation

Description: Learn how to use the Ansible meta end_play directive to gracefully stop playbook execution for all hosts when a condition is met.

---

Sometimes you need to stop an entire playbook run, not because something failed, but because there is nothing left to do. Maybe the system is already up to date, or an external dependency is unavailable and there is no point continuing. The `meta: end_play` directive gives you a clean way to stop the current play for all hosts without raising an error. It is a graceful exit, not a crash.

## Basic end_play Usage

The `meta: end_play` task ends the current play immediately. No further tasks in the play will execute on any host.

```yaml
# Basic end_play example
---
- name: Conditional playbook execution
  hosts: all
  gather_facts: true

  tasks:
    - name: Check if update is needed
      ansible.builtin.command:
        cmd: /opt/app/check-updates.sh
      register: update_check
      changed_when: false
      delegate_to: localhost
      run_once: true

    - name: End play if no updates available
      ansible.builtin.meta: end_play
      when: update_check.stdout == "NO_UPDATES"

    - name: Download updates
      ansible.builtin.debug:
        msg: "Downloading updates..."

    - name: Apply updates
      ansible.builtin.debug:
        msg: "Applying updates..."
```

When `update_check.stdout` equals "NO_UPDATES", the play stops cleanly. The download and apply tasks never execute. No error is raised, and the playbook reports a successful run.

## end_play vs end_host

Understanding the difference between `end_play` and `end_host` is critical:

- `end_play` stops the entire play for ALL hosts
- `end_host` stops the play for just the current host (other hosts continue)

```yaml
# Demonstrating end_play stops everything
---
- name: end_play affects all hosts
  hosts: webservers  # Even if there are 100 hosts
  gather_facts: false

  tasks:
    - name: Check maintenance mode (only check once)
      ansible.builtin.stat:
        path: /etc/maintenance_mode
      register: maint_flag
      delegate_to: localhost
      run_once: true

    - name: Stop if maintenance mode is active
      ansible.builtin.meta: end_play
      when:
        - maint_flag.stat.exists is defined
        - maint_flag.stat.exists

    - name: Deploy application
      ansible.builtin.debug:
        msg: "Deploying to {{ inventory_hostname }}"
```

If the maintenance flag file exists, the play stops for all webservers, not just the one that checked.

## Use Case: Already Up to Date

The most common use case is skipping work when the target is already in the desired state.

```yaml
# Skip play when already at target version
---
- name: Deploy application
  hosts: app_servers
  become: true

  vars:
    target_version: "3.2.1"

  tasks:
    - name: Get current version on all hosts
      ansible.builtin.command:
        cmd: cat /opt/app/VERSION
      register: current_version
      changed_when: false
      failed_when: false

    - name: Check if all hosts are at target version
      ansible.builtin.set_fact:
        needs_update: "{{ current_version.stdout | trim != target_version }}"

    - name: Count hosts needing update
      ansible.builtin.set_fact:
        hosts_needing_update: "{{ ansible_play_hosts | map('extract', hostvars) | selectattr('needs_update', 'equalto', true) | list | length }}"
      run_once: true

    - name: End play if all hosts are current
      ansible.builtin.meta: end_play
      when: hosts_needing_update | default(0) | int == 0

    - name: Proceed with deployment
      ansible.builtin.debug:
        msg: "Updating {{ inventory_hostname }} from {{ current_version.stdout | trim }} to {{ target_version }}"
      when: needs_update
```

## Use Case: External Dependency Check

Check if an external service is available before attempting operations that depend on it.

```yaml
# Check external dependencies before proceeding
---
- name: Deploy with external dependency check
  hosts: all
  gather_facts: false

  tasks:
    - name: Check if artifact server is reachable
      ansible.builtin.uri:
        url: "https://artifacts.example.com/health"
        status_code: 200
        timeout: 5
      register: artifact_server
      ignore_errors: true
      delegate_to: localhost
      run_once: true

    - name: Report and end play if artifacts are unavailable
      block:
        - name: Log the issue
          ansible.builtin.debug:
            msg: >
              Artifact server is not reachable. Cannot proceed with deployment.
              This is not an error, the deployment will be retried later.
          run_once: true

        - name: End play gracefully
          ansible.builtin.meta: end_play
      when: artifact_server is failed

    - name: Download artifacts
      ansible.builtin.get_url:
        url: "https://artifacts.example.com/releases/app-latest.tar.gz"
        dest: /tmp/app-latest.tar.gz
```

## Use Case: Dry Run Mode

Implement a dry-run mode that checks what would change and then stops.

```yaml
# Dry run mode with end_play
---
- name: Deployment with dry run support
  hosts: app_servers
  become: true

  vars:
    dry_run: false

  tasks:
    - name: Calculate changes
      block:
        - name: Check current state
          ansible.builtin.command:
            cmd: cat /opt/app/VERSION
          register: current_state
          changed_when: false
          failed_when: false

        - name: Report planned changes
          ansible.builtin.debug:
            msg: |
              === Deployment Plan ===
              Host: {{ inventory_hostname }}
              Current version: {{ current_state.stdout | default('not installed') }}
              Target version: {{ target_version }}
              Action: {{ 'UPGRADE' if current_state.stdout is defined else 'INSTALL' }}

    - name: End play after dry run report
      ansible.builtin.meta: end_play
      when: dry_run | bool

    - name: Perform actual deployment
      ansible.builtin.debug:
        msg: "Deploying {{ target_version }} to {{ inventory_hostname }}"
```

Run with `ansible-playbook deploy.yml -e "dry_run=true"` to see what would happen without making changes.

## Use Case: Time Window Enforcement

Stop execution if outside an approved change window.

```yaml
# Enforce change windows
---
- name: Time-restricted deployment
  hosts: production
  become: true
  gather_facts: true

  tasks:
    - name: Determine if we are in the change window
      ansible.builtin.set_fact:
        in_change_window: >-
          {{
            (ansible_date_time.weekday in ['Saturday', 'Sunday']) or
            (ansible_date_time.hour | int >= 22 or ansible_date_time.hour | int < 6) or
            (force_deploy | default(false) | bool)
          }}
      run_once: true

    - name: Report change window status
      ansible.builtin.debug:
        msg: >
          {% if in_change_window | bool %}
          Within change window, proceeding with deployment.
          {% else %}
          Outside change window ({{ ansible_date_time.weekday }} {{ ansible_date_time.hour }}:{{ ansible_date_time.minute }}).
          Production changes are allowed on weekends and between 10 PM - 6 AM.
          Use -e "force_deploy=true" to override.
          {% endif %}
      run_once: true

    - name: End play if outside change window
      ansible.builtin.meta: end_play
      when: not (in_change_window | bool)

    - name: Begin deployment
      ansible.builtin.debug:
        msg: "Starting production deployment"
```

## Combining end_play with Multiple Plays

When a playbook has multiple plays, `end_play` only stops the current play. Subsequent plays will still run.

```yaml
# end_play only affects the current play
---
- name: Play 1 - might end early
  hosts: all
  gather_facts: false

  tasks:
    - name: Check condition
      ansible.builtin.meta: end_play
      when: skip_play_1 | default(false) | bool

    - name: Play 1 task
      ansible.builtin.debug:
        msg: "This runs if play 1 was not ended"

- name: Play 2 - always runs
  hosts: all
  gather_facts: false

  tasks:
    - name: Play 2 task
      ansible.builtin.debug:
        msg: "This always runs regardless of play 1"
```

## Important Considerations

The `meta: end_play` directive is not a task in the traditional sense. It is a meta-action that modifies the play execution flow. Because of this, it has some behaviors worth noting:

1. It cannot be used inside a `block/rescue/always` structure
2. It does not trigger handlers that were notified before it
3. It ends the play for ALL hosts, even if the `when` condition only applies to one host
4. It does not count as a failure, so subsequent plays in the playbook still execute

```yaml
# Handling the handler issue
---
- name: Ensure handlers run before potential end_play
  hosts: all
  become: true

  tasks:
    - name: Update config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      notify: restart app

    # Flush handlers before the potential end_play
    - name: Flush handlers now
      ansible.builtin.meta: flush_handlers

    - name: Check post-config state
      ansible.builtin.command:
        cmd: /opt/app/health-check.sh
      register: health
      changed_when: false
      run_once: true

    - name: End if everything is healthy
      ansible.builtin.meta: end_play
      when: health.rc == 0

  handlers:
    - name: restart app
      ansible.builtin.systemd:
        name: app
        state: restarted
```

The `meta: end_play` directive is about making your playbooks smart enough to know when they are done. Instead of running unnecessary tasks on systems that are already configured correctly, you can check the state first and bail out early. This saves time, reduces risk, and makes your playbook output cleaner and easier to interpret.
