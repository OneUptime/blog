# How to Use Ansible ignore_errors Selectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Playbooks, DevOps

Description: Learn how to use Ansible ignore_errors selectively to handle expected failures without masking real problems in your playbooks.

---

When you start using Ansible in production, you quickly learn that not every failed task is actually a problem. Sometimes a package is already removed, a service is already stopped, or a file does not exist yet. The `ignore_errors` directive lets you keep going when a task fails, but slapping `ignore_errors: true` everywhere is a recipe for hidden bugs. This post walks through how to use `ignore_errors` selectively so you handle expected failures without sweeping real issues under the rug.

## The Problem with Blanket ignore_errors

Many Ansible beginners end up writing playbooks that look like this:

```yaml
# Bad practice: ignoring errors on every task
- name: Stop the old service
  ansible.builtin.service:
    name: legacy-app
    state: stopped
  ignore_errors: true

- name: Remove old config
  ansible.builtin.file:
    path: /etc/legacy-app/config.yml
    state: absent
  ignore_errors: true

- name: Install new package
  ansible.builtin.apt:
    name: new-app
    state: present
  ignore_errors: true
```

The third task should never be ignored. If the package installation fails, your deployment is broken. But because every task has `ignore_errors: true`, the playbook keeps running and you only find out later when the application crashes.

## Using ignore_errors on Specific Tasks

The right approach is to only use `ignore_errors` on tasks where failure is genuinely expected and acceptable. Here is a common pattern for checking if a service exists before trying to stop it:

```yaml
# Only ignore errors where failure is expected
- name: Check if legacy service exists
  ansible.builtin.command:
    cmd: systemctl list-unit-files legacy-app.service
  register: legacy_service_check
  ignore_errors: true
  changed_when: false

- name: Stop legacy service if it exists
  ansible.builtin.service:
    name: legacy-app
    state: stopped
  when: legacy_service_check.rc == 0
```

In this example, the first task might fail if the service does not exist at all, and that is fine. The second task only runs when the check succeeded, so you never get an unexpected failure from trying to stop a nonexistent service.

## Combining ignore_errors with register

The `register` keyword is your best friend when using `ignore_errors`. It captures the result of the task so you can make decisions based on what actually happened.

```yaml
# Register results to make smart decisions after an ignored error
- name: Try to fetch the current deployment version
  ansible.builtin.uri:
    url: "http://{{ app_host }}:8080/api/version"
    return_content: true
  register: version_check
  ignore_errors: true

- name: Set version fact based on check result
  ansible.builtin.set_fact:
    current_version: "{{ version_check.json.version | default('unknown') }}"
    app_is_running: "{{ version_check is succeeded }}"

- name: Log current state
  ansible.builtin.debug:
    msg: "App running: {{ app_is_running }}, version: {{ current_version }}"
```

Here the URI module will fail if the application is not running or the endpoint is down. That is expected during initial deployments. By registering the result and using `is succeeded` or `is failed` in subsequent tasks, you maintain control flow without hiding errors.

## Using ignore_errors with Loops

When you use `ignore_errors` inside a loop, every iteration that fails gets ignored. This can be tricky because some items might fail for legitimate reasons. A better approach is to collect results and filter them afterward.

```yaml
# Selectively handle errors in loops
- name: Check connectivity to all database servers
  ansible.builtin.wait_for:
    host: "{{ item }}"
    port: 5432
    timeout: 5
  loop:
    - db-primary.internal
    - db-replica-1.internal
    - db-replica-2.internal
  register: db_checks
  ignore_errors: true

- name: Identify unreachable databases
  ansible.builtin.debug:
    msg: "WARNING: {{ item.item }} is unreachable"
  loop: "{{ db_checks.results }}"
  when: item is failed

- name: Fail if primary database is unreachable
  ansible.builtin.fail:
    msg: "Primary database is down, aborting deployment"
  when: db_checks.results[0] is failed
```

This pattern lets you tolerate replica failures (maybe one is in maintenance) while still catching the critical failure of the primary database being unreachable.

## Scoping ignore_errors to Specific Error Codes

Sometimes you want to ignore only certain types of failures. The `ignore_errors` directive is binary, so you need to combine it with `failed_when` to get finer control.

```yaml
# Ignore only "already exists" errors from a command
- name: Create database user
  ansible.builtin.command:
    cmd: createuser --no-superuser --no-createdb appuser
  register: create_user_result
  failed_when:
    - create_user_result.rc != 0
    - "'already exists' not in create_user_result.stderr"
  changed_when: create_user_result.rc == 0
```

In this example, the task fails only when the return code is nonzero AND the error message does not contain "already exists." If the user already exists, Ansible treats the task as OK. If something else goes wrong (wrong permissions, PostgreSQL is down), the task properly fails.

## Using ignore_errors at the Block Level

You can also apply `ignore_errors` to an entire block of tasks. This is useful when a whole section of your playbook is optional.

```yaml
# Apply ignore_errors to a block of optional monitoring setup
- name: Set up optional monitoring agent
  block:
    - name: Install monitoring agent
      ansible.builtin.apt:
        name: datadog-agent
        state: present

    - name: Configure monitoring agent
      ansible.builtin.template:
        src: datadog.yaml.j2
        dest: /etc/datadog-agent/datadog.yaml

    - name: Start monitoring agent
      ansible.builtin.service:
        name: datadog-agent
        state: started
        enabled: true
  ignore_errors: "{{ monitoring_optional | default(true) }}"
```

Notice the use of a variable to control whether errors are ignored. In production, you might set `monitoring_optional: false` so monitoring failures actually break the deployment, while in development you keep it optional.

## Making ignore_errors Conditional

You can use Jinja2 expressions in `ignore_errors` to make it conditional:

```yaml
# Conditionally ignore errors based on environment
- name: Validate SSL certificate
  ansible.builtin.command:
    cmd: openssl verify /etc/ssl/certs/app.crt
  register: ssl_check
  ignore_errors: "{{ ansible_env.ENVIRONMENT | default('dev') == 'dev' }}"

- name: Warn about SSL in non-prod
  ansible.builtin.debug:
    msg: "SSL validation failed in dev, continuing anyway"
  when:
    - ssl_check is failed
    - ansible_env.ENVIRONMENT | default('dev') == 'dev'
```

This means SSL validation errors will halt the playbook in production but get ignored in development environments.

## Best Practices

Here is a quick summary of when to use and when to avoid `ignore_errors`:

**Use ignore_errors when:**
- Checking for the existence of optional resources
- Running preflight checks that might not apply to all hosts
- Handling tasks that are genuinely optional
- Working with external services that might be temporarily unavailable during setup

**Avoid ignore_errors when:**
- Installing critical packages or dependencies
- Configuring security settings
- Writing essential configuration files
- Starting services that your application depends on

**Always pair ignore_errors with:**
- `register` to capture the result
- Follow-up tasks that check the registered variable
- `failed_when` when you want to ignore only specific failure types
- Clear task names that explain why the error is being ignored

## A Complete Example

Here is a realistic playbook that demonstrates selective error handling during a deployment:

```yaml
---
- name: Deploy web application
  hosts: webservers
  become: true
  vars:
    app_name: mywebapp
    deploy_version: "2.1.0"

  tasks:
    # Preflight: check if old version is running (might not be on fresh hosts)
    - name: Check current running version
      ansible.builtin.command:
        cmd: "{{ app_name }} --version"
      register: current_version
      ignore_errors: true
      changed_when: false

    - name: Display current version or note fresh install
      ansible.builtin.debug:
        msg: >-
          {{ 'Upgrading from ' ~ current_version.stdout
             if current_version is succeeded
             else 'Fresh installation detected' }}

    # Critical: this must not be ignored
    - name: Download application package
      ansible.builtin.get_url:
        url: "https://releases.example.com/{{ app_name }}/{{ deploy_version }}.tar.gz"
        dest: "/tmp/{{ app_name }}-{{ deploy_version }}.tar.gz"
        checksum: "sha256:{{ package_checksum }}"

    # Critical: installation must succeed
    - name: Install application
      ansible.builtin.unarchive:
        src: "/tmp/{{ app_name }}-{{ deploy_version }}.tar.gz"
        dest: /opt/{{ app_name }}
        remote_src: true

    # Optional: migrate database (only on primary)
    - name: Run database migration
      ansible.builtin.command:
        cmd: "/opt/{{ app_name }}/bin/migrate"
      when: inventory_hostname == groups['webservers'][0]
      register: migration_result

    # Critical: must start successfully
    - name: Start application
      ansible.builtin.service:
        name: "{{ app_name }}"
        state: restarted
```

Notice how `ignore_errors` only appears on the version check, which is a harmless preflight task. Every critical step (download, install, migrate, start) runs without it, so genuine failures stop the playbook immediately.

The key takeaway is simple: treat `ignore_errors` like a scalpel, not a sledgehammer. Apply it precisely where you know failures are acceptable, and always capture the result so downstream tasks can act on what actually happened.
