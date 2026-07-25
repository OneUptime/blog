# Making Ansible Tasks Truly Idempotent with changed_when and failed_when

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Automation, Idempotency, Error Handling, Playbooks

Description: Make command-driven Ansible tasks report changes and failures accurately without masking drift or real operational errors.

---

An idempotent playbook can run repeatedly and converge on the same desired state. On the second run, a stable host should normally report no changes. Ansible's state-aware modules already implement much of this logic. Trouble usually starts when a playbook calls a command-line tool whose exit code and output do not map neatly to Ansible's default assumptions.

`changed_when` controls whether a task reports `changed`. `failed_when` controls whether its result is a failure. They improve reporting and handler behavior, but they do not make an inherently unsafe command idempotent. First design a reliable state transition, then describe its outcome accurately.

## Prefer a State-Aware Module

Before wrapping a command, look for a module that manages the resource:

```yaml
- name: Ensure the application service is enabled and running
  ansible.builtin.service:
    name: myapp
    enabled: true
    state: started

- name: Ensure the configuration has the desired setting
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: '^workers='
    line: 'workers=4'
    mode: "0644"
  notify: Restart myapp
```

These modules inspect current state and report a change only when they act. Replacing them with `systemctl start` or `sed -i` would force you to recreate that state detection and check-mode behavior.

Use `ansible.builtin.command` when no suitable module exists. Use `ansible.builtin.shell` only when the command truly needs shell features such as pipes, redirection, or glob expansion.

## Separate Read, Decide, and Change

A robust command wrapper often has three stages:

1. Read current state without changing it.
2. Decide whether a transition is necessary.
3. Run the transition only when required.

```yaml
- name: Read the active release
  ansible.builtin.command:
    argv:
      - /usr/local/bin/myappctl
      - current-version
  register: current_release
  changed_when: false

- name: Activate the requested release
  ansible.builtin.command:
    argv:
      - /usr/local/bin/myappctl
      - activate
      - "{{ app_version }}"
  register: activation
  when: current_release.stdout | trim != app_version
  changed_when: activation.rc == 0
```

A successful query reports `ok`. The transition is skipped when state already matches. This is more trustworthy than parsing a vague “nothing to do” message after running the mutation every time.

## Use Command Guards When They Match the Resource

The `command` module supports `creates` and `removes`. They can skip a command based on file existence and provide partial check-mode support:

```yaml
- name: Initialize the application data directory once
  ansible.builtin.command:
    cmd: /opt/myapp/bin/initialize --data-dir /var/lib/myapp
    creates: /var/lib/myapp/.initialized
```

Use these only if the file is a reliable marker of completed state. A stale marker must not hide a partial initialization.

## Define Change from Structured Results

Commands report fields such as `rc`, `stdout`, and `stderr`. Register the result, then write a raw Jinja expression without `{{ }}`:

```yaml
- name: Reconcile application configuration
  ansible.builtin.command:
    cmd: /usr/local/bin/myappctl reconcile --output json
  register: reconcile
  changed_when: >-
    reconcile.rc == 0
    and ((reconcile.stdout | from_json).changed | bool)
  failed_when: reconcile.rc != 0
```

Machine-readable JSON is less fragile than matching prose. If the tool offers explicit exit codes, use those:

```yaml
- name: Apply a database migration
  ansible.builtin.command:
    cmd: /opt/myapp/bin/migrate
  register: migration
  changed_when: migration.rc == 2
  failed_when: migration.rc not in [0, 2]
```

In this example, the application contract is:

- `0`: already current, no change
- `2`: migration applied, changed
- anything else: failure

Document nonstandard codes beside the task so a future maintainer does not “simplify” the conditions incorrectly.

## Understand AND and OR Semantics

Multiple list entries in `changed_when` or `failed_when` are joined with an implicit logical AND:

```yaml
- name: Update a local cache
  ansible.builtin.command:
    cmd: /usr/local/bin/cachectl refresh
  register: cache_refresh
  changed_when:
    - cache_refresh.rc == 0
    - "'cache updated' in cache_refresh.stdout"
```

Both conditions must be true. To use OR, write one expression:

```yaml
failed_when: >-
  cache_refresh.rc not in [0, 3]
  or 'fatal:' in cache_refresh.stderr | lower
```

A common bug is writing a list while intending OR. The task then fails only when every listed problem occurs simultaneously.

## Treat Expected Negative Results as Data

Some query tools use a nonzero code for a normal negative answer. Define that narrowly:

```yaml
- name: Check whether the release exists
  ansible.builtin.command:
    argv:
      - /usr/local/bin/releasectl
      - inspect
      - "{{ app_version }}"
  register: release_check
  changed_when: false
  failed_when: release_check.rc not in [0, 4]

- name: Publish the missing release
  ansible.builtin.command:
    argv:
      - /usr/local/bin/releasectl
      - publish
      - "{{ app_version }}"
  when: release_check.rc == 4
```

Do not use `failed_when: false` as a blanket workaround. It converts permission errors, malformed input, network failures, and program crashes into successful tasks. If continuation is necessary, model the expected result codes or use a `block` with `rescue`.

## Report Read-Only Tasks as Unchanged

Commands such as health checks and version queries often default to `changed` because the command module cannot know their intent:

```yaml
- name: Query application health
  ansible.builtin.command:
    cmd: /opt/myapp/bin/healthcheck
  register: health
  changed_when: false
  failed_when:
    - health.rc != 0
    - "'warming up' not in health.stderr | lower"
```

Accurate status matters beyond a tidy recap. A false change can notify a handler, create noisy audit history, or make CI conclude that a drift check failed.

## Keep Handler Notifications Honest

A handler runs only when a notifying task reports a change:

```yaml
- name: Configure application routing
  hosts: all
  tasks:
    - name: Import routing rules
      ansible.builtin.command:
        cmd: /usr/local/bin/routectl import /etc/myapp/routes.yaml
      register: route_import
      changed_when: "'applied 0 changes' not in route_import.stdout"
      notify: Reload myapp

  handlers:
    - name: Reload myapp
      ansible.builtin.service:
        name: myapp
        state: reloaded
```

If output format is not a stable public interface, prefer a checksum, a separate state query, or structured output. A translated or reworded message can otherwise cause unnecessary reloads.

## Do Not Confuse Reporting with Idempotency

This task lies:

```yaml
- name: Append a line
  ansible.builtin.shell:
    cmd: echo enabled=true >> /etc/myapp/app.conf
  changed_when: false
```

It mutates the file on every run while reporting `ok`. The correct implementation manages the desired state:

```yaml
- name: Ensure the setting has the desired value
  ansible.builtin.lineinfile:
    path: /etc/myapp/app.conf
    regexp: '^enabled='
    line: enabled=true
    create: true
    mode: "0644"
```

Similarly, `changed_when: true` can be appropriate for an action that always changes state, but it does not make the action safe to repeat.

## Test the Contract

Run the playbook in an isolated environment at least twice:

```bash
ansible-playbook -i inventories/test site.yml
ansible-playbook -i inventories/test site.yml
```

On the second run, inspect every changed task. Then test prediction:

```bash
ansible-playbook -i inventories/test site.yml --check --diff
```

Check mode is a simulation. Modules without check-mode support may skip, and tasks that depend on a registered result from a skipped command may behave differently. It complements, rather than replaces, a real second convergence run.

Test failure paths too:

- missing permissions
- unavailable services
- malformed command output
- every documented nonzero exit code
- handler notification on both changed and unchanged results

The goal is a precise task contract: actual transitions report changed, stable state reports ok, expected negative queries remain usable, and operational errors still fail the task and stop execution for the affected host.

## Official Documentation

- [Error handling in playbooks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html)
- [ansible.builtin.command module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html)
- [Ansible playbooks and idempotency](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html)
- [Validating tasks with check and diff mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html)
- [Handlers: running operations on change](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html)
