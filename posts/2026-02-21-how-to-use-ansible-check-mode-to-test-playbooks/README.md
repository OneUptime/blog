# How to Use Ansible --check Mode to Test Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Check Mode, Dry Run

Description: Learn how to use Ansible check mode to safely test playbooks without making any changes to your target systems.

---

Every infrastructure engineer knows the anxiety of running a playbook against production for the first time. Did I get the template right? Will this service restart break anything? Ansible's check mode (also called dry run mode) lets you simulate playbook execution without actually modifying anything on the target hosts. This post covers how to use check mode effectively, its limitations, and patterns for making your playbooks check-mode friendly.

## Running a Playbook in Check Mode

The simplest way to use check mode is the `--check` flag:

```bash
# Dry run - no changes will be made to target hosts
ansible-playbook deploy.yml --check

# Combine with diff to see what would change
ansible-playbook deploy.yml --check --diff

# Limit to specific hosts for targeted testing
ansible-playbook deploy.yml --check --limit web-01
```

When you run with `--check`, Ansible goes through every task but instead of making changes, it predicts what would change. Tasks that would modify the system report "changed" and tasks that would not modify anything report "ok."

## What Check Mode Actually Does

In check mode, Ansible modules that support it will:
- Compare the desired state to the current state
- Report whether a change would be needed
- Not make any actual modifications

Here is a simple example:

```yaml
---
- name: Configure web server
  hosts: webservers
  become: true

  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
      # In check mode: reports "changed" if nginx is not installed
      #                reports "ok" if nginx is already installed

    - name: Deploy nginx config
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      # In check mode: reports "changed" if template output differs from current file
      #                reports "ok" if they match

    - name: Ensure nginx is running
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
      # In check mode: reports "changed" if service is not running
      #                reports "ok" if already running and enabled
```

## Modules That Do Not Support Check Mode

Not all modules support check mode. The `command`, `shell`, `raw`, and `script` modules cannot predict their outcome without actually running:

```yaml
# This task will be SKIPPED in check mode
- name: Run database migration
  ansible.builtin.command:
    cmd: /opt/app/bin/migrate
```

When a module does not support check mode, Ansible skips it entirely. This can cause problems if later tasks depend on the skipped task's results.

## Forcing Tasks to Run in Check Mode

Use `check_mode: false` (previously `always_run: true`) to force a task to execute even during check mode:

```yaml
# This task always runs, even in check mode
- name: Get current application version
  ansible.builtin.command:
    cmd: cat /opt/app/VERSION
  register: current_version
  check_mode: false
  changed_when: false

# Now this task can use the registered variable
- name: Show version comparison
  ansible.builtin.debug:
    msg: "Current: {{ current_version.stdout }}, Target: {{ target_version }}"
```

This is essential for read-only tasks whose output is needed by subsequent tasks. Without `check_mode: false`, the command task would be skipped and `current_version` would be undefined.

## Forcing Tasks to Only Run in Check Mode

The opposite is also possible. You can make a task only run during check mode:

```yaml
# Only runs during check mode - useful for validation
- name: Validate deployment prerequisites
  ansible.builtin.assert:
    that:
      - ansible_memfree_mb > 512
      - ansible_mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_available') | first > 1073741824
    fail_msg: "Insufficient resources for deployment"
  check_mode: true
  when: ansible_check_mode
```

Wait, there is a simpler way. Ansible provides the `ansible_check_mode` variable that is true during check mode:

```yaml
# Run extra validations only during check mode
- name: Pre-deployment validation (check mode only)
  ansible.builtin.debug:
    msg: |
      Pre-deployment checklist:
        Target: {{ inventory_hostname }}
        Memory: {{ ansible_memfree_mb }}MB free
        Disk: {{ ansible_mounts[0].size_available // 1048576 }}MB available
  when: ansible_check_mode
```

## Making Command Tasks Check-Mode Friendly

Since command and shell modules skip in check mode, you need patterns to work around this:

```yaml
# Pattern 1: Separate check and execute tasks
- name: Check if migration is needed
  ansible.builtin.command:
    cmd: /opt/app/bin/migrate --dry-run
  register: migration_check
  check_mode: false  # Always run this read-only check
  changed_when: false

- name: Run migration if needed
  ansible.builtin.command:
    cmd: /opt/app/bin/migrate
  when: "'pending migrations' in migration_check.stdout"
  # This will be skipped in check mode (which is correct behavior)
```

```yaml
# Pattern 2: Use creates/removes for idempotent commands
- name: Initialize the database
  ansible.builtin.command:
    cmd: /opt/app/bin/init-db
    creates: /var/lib/app/db.initialized
  # In check mode: reports "ok" if the file exists, "changed" if it does not
```

The `creates` and `removes` parameters make command tasks check-mode aware. Ansible checks for the file without running the command.

## Using Check Mode in CI/CD Pipelines

Check mode is valuable in CI/CD pipelines for validating playbook changes before they reach production:

```yaml
# .gitlab-ci.yml example
stages:
  - validate
  - deploy

ansible-check:
  stage: validate
  script:
    - ansible-playbook deploy.yml --check --diff
  rules:
    - if: $CI_MERGE_REQUEST_ID

ansible-deploy:
  stage: deploy
  script:
    - ansible-playbook deploy.yml
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  when: manual
```

This runs a check mode dry run on every merge request and only allows actual deployment from the main branch.

## Check Mode with Handlers

Handlers behave differently in check mode. Even if a task reports "changed" in check mode, handlers are not actually triggered. This is correct behavior because the notifying task did not actually make changes.

```yaml
---
- name: Update configuration
  hosts: webservers
  become: true

  handlers:
    - name: Restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted

  tasks:
    - name: Deploy new config
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Restart nginx
    # In check mode: reports "changed" if config would change
    # Handler notification is recorded but handler does not execute
```

## Practical Example: Safe Deployment Testing

Here is a complete example showing check mode best practices in a deployment playbook:

```yaml
---
- name: Deploy application with check mode support
  hosts: webservers
  become: true

  vars:
    app_version: "4.2.0"
    app_dir: /opt/myapp

  tasks:
    # Always gather info, even in check mode
    - name: Get current deployed version
      ansible.builtin.command:
        cmd: "cat {{ app_dir }}/VERSION"
      register: current_version
      check_mode: false
      changed_when: false
      failed_when: false

    - name: Show deployment plan
      ansible.builtin.debug:
        msg: |
          Deployment Plan:
            Current version: {{ current_version.stdout | default('not installed') }}
            Target version: {{ app_version }}
            Mode: {{ 'DRY RUN' if ansible_check_mode else 'LIVE' }}

    # These module-based tasks support check mode natively
    - name: Create application directory
      ansible.builtin.file:
        path: "{{ app_dir }}"
        state: directory
        owner: appuser
        mode: "0755"

    - name: Deploy application configuration
      ansible.builtin.template:
        src: config.yml.j2
        dest: "{{ app_dir }}/config.yml"
        owner: appuser
        mode: "0640"

    - name: Install system dependencies
      ansible.builtin.apt:
        name:
          - libpq-dev
          - libssl-dev
        state: present

    # Command task with creates for check mode support
    - name: Download application release
      ansible.builtin.get_url:
        url: "https://releases.example.com/myapp/{{ app_version }}.tar.gz"
        dest: "/tmp/myapp-{{ app_version }}.tar.gz"

    - name: Extract application
      ansible.builtin.unarchive:
        src: "/tmp/myapp-{{ app_version }}.tar.gz"
        dest: "{{ app_dir }}"
        remote_src: true
        creates: "{{ app_dir }}/bin/myapp-{{ app_version }}"

    # Read-only validation that always runs
    - name: Validate configuration syntax
      ansible.builtin.command:
        cmd: "{{ app_dir }}/bin/myapp validate-config"
      check_mode: false
      changed_when: false
      when: not ansible_check_mode or current_version.rc == 0

    - name: Start application
      ansible.builtin.service:
        name: myapp
        state: restarted
```

## Combining Check Mode with Tags

You can use tags to run specific sections in check mode:

```bash
# Only check the configuration tasks
ansible-playbook deploy.yml --check --diff --tags configuration

# Check everything except the service restart
ansible-playbook deploy.yml --check --skip-tags restart
```

## Limitations to Be Aware Of

Check mode has some important limitations:

1. **Dependency chains break**: If task B depends on a file created by task A, task A is skipped in check mode, and task B may fail because the file does not exist
2. **Dynamic data is missing**: Registered variables from skipped tasks are undefined
3. **External side effects are not simulated**: API calls, database changes, and webhook triggers are not predicted
4. **Some modules report inaccurately**: A module might report "ok" in check mode when it would actually change something

These limitations mean check mode is a useful safety net but not a guarantee. Always test in a staging environment before running against production.

## Summary

Ansible check mode (`--check`) is your first line of defense against unintended changes. Use it in CI/CD pipelines to validate playbook changes, combine it with `--diff` to see what would change, and mark read-only tasks with `check_mode: false` to keep dependency chains intact. Understand its limitations (skipped command tasks, broken dependency chains) and design your playbooks to work well in both check mode and normal mode. It takes a few extra minutes to make a playbook check-mode friendly, but it pays off every time you need to safely verify a change before applying it.
