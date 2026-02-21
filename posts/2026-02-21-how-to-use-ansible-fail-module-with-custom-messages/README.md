# How to Use Ansible fail Module with Custom Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Automation, DevOps

Description: Learn how to use the Ansible fail module to enforce custom validation checks and produce meaningful error messages in your playbooks.

---

When you are building Ansible playbooks for production use, you need more than just running tasks and hoping they succeed. You need to validate inputs, check preconditions, and stop execution with clear messages when something is wrong. The `fail` module is your primary tool for this. It lets you explicitly abort a playbook run with a custom error message that tells the operator exactly what went wrong and what to do about it.

I have seen too many playbooks that silently proceed with bad inputs, only to fail twenty tasks later with a cryptic error. Using `fail` strategically saves hours of debugging.

## Basic Usage of the fail Module

The simplest use of the `fail` module takes a single `msg` parameter.

This task will always fail and print the given message:

```yaml
# basic-fail.yml - Demonstrates the simplest fail usage
---
- name: Demonstrate basic fail module
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Stop execution with a message
      ansible.builtin.fail:
        msg: "This playbook requires manual confirmation before running in production."
```

When you run this, Ansible stops immediately and prints:

```
TASK [Stop execution with a message] ******************************************
fatal: [localhost]: FAILED! => {"changed": false, "msg": "This playbook requires manual confirmation before running in production."}
```

## Conditional Failures with when

The real power comes from combining `fail` with the `when` clause. This lets you validate variables, check system state, and enforce business rules before proceeding.

This playbook validates that required variables are defined and have acceptable values:

```yaml
# validate-inputs.yml - Validates variables before proceeding with deployment
---
- name: Deploy application with input validation
  hosts: webservers
  vars:
    app_version: "2.3.1"
    environment: "staging"
    allowed_environments:
      - staging
      - production
  tasks:
    - name: Fail if app_version is not defined
      ansible.builtin.fail:
        msg: "The variable 'app_version' must be defined. Pass it with -e app_version=x.y.z"
      when: app_version is not defined

    - name: Fail if environment is not in allowed list
      ansible.builtin.fail:
        msg: "Environment '{{ environment }}' is not valid. Allowed values: {{ allowed_environments | join(', ') }}"
      when: environment not in allowed_environments

    - name: Fail if app_version does not match semver pattern
      ansible.builtin.fail:
        msg: "Version '{{ app_version }}' does not match semantic versioning (x.y.z)"
      when: app_version is not regex('^[0-9]+\.[0-9]+\.[0-9]+$')

    - name: Proceed with deployment
      ansible.builtin.debug:
        msg: "Deploying version {{ app_version }} to {{ environment }}"
```

## Validating System State Before Deployment

Beyond input validation, you can check the actual state of the target system. This is useful for ensuring prerequisites are met.

This playbook checks disk space and memory before deploying:

```yaml
# check-system-state.yml - Validates system resources before deployment
---
- name: Pre-deployment system checks
  hosts: appservers
  tasks:
    - name: Check available disk space on /var
      ansible.builtin.shell: df /var --output=avail | tail -1 | tr -d ' '
      register: disk_space
      changed_when: false

    - name: Fail if less than 5GB free on /var
      ansible.builtin.fail:
        msg: >
          Insufficient disk space on /var. Available: {{ (disk_space.stdout | int / 1024 / 1024) | round(2) }}GB.
          Required: 5GB minimum. Free up space before deploying.
      when: (disk_space.stdout | int) < 5242880

    - name: Check available memory
      ansible.builtin.shell: free -m | awk '/Mem:/ {print $7}'
      register: available_memory
      changed_when: false

    - name: Fail if less than 1GB free memory
      ansible.builtin.fail:
        msg: >
          Insufficient memory. Available: {{ available_memory.stdout }}MB.
          Need at least 1024MB free. Check running processes with 'top' or 'htop'.
      when: (available_memory.stdout | int) < 1024
```

## Using fail with Complex Conditions

You can combine multiple conditions using `and`, `or`, and Jinja2 expressions to build sophisticated validation logic.

This example validates a database migration scenario with multiple checks:

```yaml
# validate-migration.yml - Multi-condition validation for database migration
---
- name: Validate database migration prerequisites
  hosts: db_primary
  vars:
    db_backup_taken: true
    replication_lag_seconds: 45
    max_allowed_lag: 30
    maintenance_window: true
  tasks:
    - name: Fail if backup not taken before migration
      ansible.builtin.fail:
        msg: >
          Database backup has not been taken. Run the backup playbook first:
          ansible-playbook backup-database.yml -e target=db_primary
      when: not db_backup_taken

    - name: Fail if replication lag is too high
      ansible.builtin.fail:
        msg: >
          Replication lag is {{ replication_lag_seconds }}s, which exceeds the
          maximum allowed {{ max_allowed_lag }}s. Wait for replication to catch up
          or investigate the replica health.
      when: replication_lag_seconds > max_allowed_lag

    - name: Fail if outside maintenance window
      ansible.builtin.fail:
        msg: >
          This migration can only run during a maintenance window.
          Set maintenance_window=true after confirming the window is active.
          Current schedule: Saturdays 02:00-06:00 UTC.
      when: not maintenance_window
```

## Building a Validation Role

For larger projects, you can wrap your validation checks in a reusable role. This keeps your main playbook clean.

Here is the role structure:

```
roles/
  validate_deploy/
    tasks/
      main.yml
    defaults/
      main.yml
```

The role's task file collects all deployment validations:

```yaml
# roles/validate_deploy/tasks/main.yml - Reusable deployment validation role
---
- name: Check that deploy_target is specified
  ansible.builtin.fail:
    msg: "deploy_target must be set to 'staging' or 'production'"
  when: deploy_target is not defined or deploy_target not in ['staging', 'production']

- name: Check that deploy_version is specified
  ansible.builtin.fail:
    msg: "deploy_version is required. Example: -e deploy_version=1.2.3"
  when: deploy_version is not defined

- name: Check that deployer has provided their name
  ansible.builtin.fail:
    msg: "deployer_name is required for audit logging. Example: -e deployer_name='Jane Smith'"
  when: deployer_name is not defined or deployer_name | length == 0

- name: Production-specific checks
  when: deploy_target == 'production'
  block:
    - name: Fail if no change ticket provided for production
      ansible.builtin.fail:
        msg: "Production deployments require a change ticket. Example: -e change_ticket=CHG-12345"
      when: change_ticket is not defined

    - name: Fail if change ticket format is invalid
      ansible.builtin.fail:
        msg: "Change ticket '{{ change_ticket }}' is invalid. Expected format: CHG-XXXXX"
      when: change_ticket is not regex('^CHG-[0-9]{5}$')
```

Then use it in your playbook:

```yaml
# deploy.yml - Main deployment playbook using the validation role
---
- name: Deploy application
  hosts: "{{ deploy_target }}_servers"
  roles:
    - validate_deploy
  tasks:
    - name: Run deployment
      ansible.builtin.debug:
        msg: "Deploying {{ deploy_version }} to {{ deploy_target }}"
```

## Using fail with assert as an Alternative

Ansible also provides the `assert` module, which is essentially `fail` with built-in condition checking. It is worth comparing the two approaches.

```yaml
# assert-vs-fail.yml - Comparing assert and fail approaches
---
- name: Compare assert and fail
  hosts: localhost
  gather_facts: false
  vars:
    http_port: 8080
  tasks:
    # Using fail with when
    - name: Validate port range with fail
      ansible.builtin.fail:
        msg: "HTTP port {{ http_port }} is outside the valid range (1024-65535)"
      when: http_port < 1024 or http_port > 65535

    # Using assert (equivalent)
    - name: Validate port range with assert
      ansible.builtin.assert:
        that:
          - http_port >= 1024
          - http_port <= 65535
        fail_msg: "HTTP port {{ http_port }} is outside the valid range (1024-65535)"
        success_msg: "HTTP port {{ http_port }} is valid"
```

Both work well. I prefer `fail` when I need a detailed, multi-line error message with remediation steps. I lean toward `assert` when checking multiple simple conditions at once, since it keeps the conditions more readable.

## Writing Helpful Error Messages

The biggest mistake people make with the `fail` module is writing vague messages. Your error message should answer three questions: what failed, why it matters, and what to do about it.

Here are some guidelines for good fail messages:

- Include the current value of the offending variable so the operator can see what went wrong
- Suggest the exact command or variable to fix the problem
- Reference documentation or runbooks when applicable
- Keep the message on a single logical thought, but do not be afraid of longer messages if they save debugging time

A bad message: "Invalid configuration." A good message: "The ssl_cert_path '/etc/ssl/old.pem' does not exist on {{ inventory_hostname }}. Generate a new certificate with: ansible-playbook renew-certs.yml -l {{ inventory_hostname }}"

## Summary

The `fail` module is straightforward, but using it well requires discipline. Validate your inputs at the top of your playbooks, check system state before making changes, and invest time in writing error messages that your future self (or your on-call colleague at 3 AM) will appreciate. Combined with `when` clauses and reusable roles, the `fail` module turns your playbooks from fragile scripts into robust automation with built-in guardrails.
