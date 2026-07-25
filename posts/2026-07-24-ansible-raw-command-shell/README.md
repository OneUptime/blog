# Ansible raw vs. command vs. shell: Which Module Should You Use?

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ansible, Playbook, Command Line, Shell, Automation, Security

Description: Choose between Ansible raw, command, and shell based on Python availability, shell syntax, safety, and idempotence.

---

`ansible.builtin.raw`, `ansible.builtin.command`, and `ansible.builtin.shell` can all run a program on a managed node, but they use different execution paths:

- Prefer a purpose-built Ansible module whenever one describes the desired state.
- Use `command` for an executable and arguments that do not need shell syntax.
- Use `shell` only when pipes, redirects, globbing, compound commands, or another shell feature is required.
- Use `raw` for exceptional bootstrap cases where the normal Ansible module subsystem cannot run.

That order improves predictability, security, check-mode behavior, and idempotence.

## The Core Differences

| Capability | `raw` | `command` | `shell` |
|---|---|---|---|
| Uses normal module subsystem | No | Yes | Yes |
| Needs Python on normal POSIX target | No | Yes | Yes |
| Runs through a remote shell | Yes | No | Yes |
| Supports pipes and redirects | Yes | No | Yes |
| Supports `argv` list | No | Yes | No |
| Supports `creates` and `removes` | No | Yes | Yes |
| Check mode | None | Partial with `creates`/`removes` | Partial with `creates`/`removes` |
| Diff mode | None | None | None |
| Normal first choice | Almost never | For non-shell commands | Only for shell expressions |

The table applies to normal POSIX targets. For Windows automation, prefer `ansible.windows.win_command`, `ansible.windows.win_shell`, and purpose-built Windows modules.

## Prefer Desired-State Modules First

This task invokes the operating-system package tool:

```yaml
- name: Install Nginx with a command
  ansible.builtin.command:
    argv:
      - apt-get
      - install
      - -y
      - nginx
```

It can run successfully, but Ansible does not understand the package state. The command normally reports a change every time, Debian-specific details leak into the playbook, and check mode cannot predict the package transaction.

Use the package module:

```yaml
- name: Install Nginx
  ansible.builtin.package:
    name: nginx
    state: present
```

The same principle applies to users, services, files, repositories, archives, Git checkouts, databases, cloud resources, and HTTP APIs. Search `ansible-doc` before dropping to a command:

```bash
ansible-doc -l
ansible-doc ansible.builtin.package
```

Use a command when no suitable module exists or the executable itself is the supported interface.

## Use command for Executable Plus Arguments

`ansible.builtin.command` invokes a program without passing the command through a shell. Shell metacharacters such as these have no special meaning:

```text
*  <  >  |  ;  &  &&
```

This will not create a pipeline:

```yaml
- name: Incorrect attempt to use a pipe
  ansible.builtin.command: journalctl -u api | tail -n 50
```

The pipe character is passed as an ordinary argument to `journalctl`.

For a normal command, use `argv`:

```yaml
- name: Check an application configuration
  ansible.builtin.command:
    argv:
      - /usr/local/bin/contoso-api
      - validate
      - --config
      - "{{ api_config_path }}"
  register: api_validation_result
  changed_when: false
```

`argv` preserves argument boundaries without shell quoting. A path containing spaces remains one argument. It also avoids injecting a semicolon or command substitution through a templated value because no shell interprets it.

The called program still interprets its own options. If a user-controlled value can begin with `-`, use `--` before it when the program supports that convention and validate the input.

`command` supports:

- `chdir` to set the working directory.
- `creates` to skip when a path already exists.
- `removes` to run only when a path exists.
- `stdin` and `stdin_add_newline`.
- `argv` for explicit argument boundaries.
- `expand_argument_vars`.

Example:

```yaml
- name: Initialize the application database once
  ansible.builtin.command:
    argv:
      - /usr/local/bin/contoso-api
      - database
      - initialize
    chdir: /var/lib/contoso-api
    creates: /var/lib/contoso-api/.initialized
```

`creates` gives Ansible a limited idempotence guard and partial check-mode prediction. It does not verify that the marker accurately represents a healthy database. Prefer a database-aware module or application status command when available.

Since `ansible-core` 2.16, `command` has `expand_argument_vars`, enabled by default. It expands values such as `$HOME` through Python before execution. It is not shell expansion: unmatched variables remain unchanged, and pipes, redirects, command substitutions, and globbing still do not work. Set it to `false` when a literal dollar expression must reach the program:

```yaml
- name: Pass a literal dollar expression
  ansible.builtin.command:
    argv:
      - /usr/local/bin/template-check
      - '$UNEXPANDED_VALUE'
    expand_argument_vars: false
  changed_when: false
```

## Use shell Only for Shell Semantics

`ansible.builtin.shell` runs the command through `/bin/sh` on the remote node by default. Use it when the operation truly depends on shell behavior.

A pipeline:

```yaml
- name: Count recent API errors
  ansible.builtin.shell:
    cmd: >-
      journalctl --unit contoso-api --since '10 minutes ago'
      | grep -F -- ' ERROR '
      | wc -l
  register: api_error_count_result
  changed_when: false
```

Before accepting this task, check whether `journalctl`, a logging collection, or the application offers structured filtering that avoids a shell pipeline.

Redirection is another valid shell need:

```yaml
- name: Export a read-only application status snapshot
  ansible.builtin.shell:
    cmd: /usr/local/bin/contoso-api status > /var/tmp/contoso-api-status.txt
    creates: /var/tmp/contoso-api-status.txt
```

The shell adds risk because templated values can become syntax. Quote every value that enters a shell expression:

```yaml
- name: Search an operator-selected log safely
  ansible.builtin.shell:
    cmd: "grep -F -- {{ search_text | quote }} {{ log_path | quote }}"
  register: search_result
  changed_when: false
  failed_when: search_result.rc not in [0, 1]
```

The Jinja `quote` filter makes a value safe as one POSIX shell argument. Input validation is still required when a value controls a path or authorization boundary.

Do not write:

```yaml
- name: Unsafe templating
  ansible.builtin.shell: "grep {{ search_text }} {{ log_path }}"
```

A value containing spaces, `;`, `$()`, or redirection can change the command.

## Remember That shell Means /bin/sh

The default is the target's `/bin/sh`, not the operator's interactive login shell and not necessarily Bash. Arrays, `[[ ... ]]`, brace expansion, `source`, and `set -o pipefail` are not portable POSIX `sh` features.

When Bash is an explicit managed-node prerequisite:

```yaml
- name: Run a pipeline and fail if either stage fails
  ansible.builtin.shell:
    cmd: |
      set -o pipefail
      /usr/local/bin/produce-report |
        /usr/local/bin/validate-report
    executable: /bin/bash
  register: report_validation_result
  changed_when: false
```

Without `pipefail`, a failed producer can be hidden by a successful final command in the pipeline. `executable` must be an absolute path. Assert or manage that path before using it.

If several lines form a real maintained script, consider `ansible.builtin.script` to transfer and run a versioned local script, or deploy the script with `template` or `copy` and invoke it with `command`. Large inline shell blocks are difficult to test and reuse.

## Use raw to Bootstrap the Module Subsystem

`ansible.builtin.raw` sends a command directly through the configured remote shell. It bypasses the normal module subsystem and does not require Python on the target.

The classic use case is a minimal Linux image without Python:

```yaml
---
- name: Bootstrap Python on known Debian-family images
  hosts: debian_bootstrap
  gather_facts: false
  become: true

  tasks:
    - name: Check whether Python 3 exists
      ansible.builtin.raw: test -x /usr/bin/python3
      register: python_probe
      changed_when: false
      failed_when: false

    - name: Install Python 3 when absent
      ansible.builtin.raw: >-
        apt-get update &&
        DEBIAN_FRONTEND=noninteractive
        apt-get install --yes python3
      when: python_probe.rc != 0

    - name: Gather facts after Python is available
      ansible.builtin.setup:
```

This play deliberately targets an inventory group whose image family is already known. A generic `raw` command that guesses among package managers is hard to audit and can leave a host partially bootstrapped.

Fact gathering is disabled at the play level because the normal setup module cannot run before Python. After installation, `ansible.builtin.setup` gathers facts normally.

Other documented `raw` cases include network devices or other targets that cannot run Python. Outside those exceptions, use `command` or `shell`.

Limitations matter:

- `raw` has no check-mode or diff-mode support.
- It has no normal change-handler support.
- It does not provide `creates` or `removes`.
- The `environment` keyword does not normally work with `raw` unless the execution path provides a shell through an explicit executable or privilege escalation.
- Output that is not valid UTF-8 must be encoded before Ansible consumes it.

Keep a raw bootstrap small, deterministic, and immediately followed by normal modules.

## Model Changed and Failed Results Honestly

Command-like modules cannot infer application state from an arbitrary process. Read-only commands should not report changes:

```yaml
- name: Read application version
  ansible.builtin.command:
    argv:
      - /usr/local/bin/contoso-api
      - version
  register: api_version_result
  changed_when: false
```

Some tools use a nonzero status for a normal result. Encode that contract explicitly:

```yaml
- name: Check whether a restart is required
  ansible.builtin.command:
    argv:
      - /usr/local/bin/contoso-api
      - restart-required
  register: restart_probe
  changed_when: false
  failed_when: restart_probe.rc not in [0, 10]
```

Do not add `failed_when: false` to silence an unexplained failure. It converts broken commands, missing binaries, and permission errors into apparent success.

For a state-changing command, use an application status query, `creates`, or `removes` to avoid executing an already-satisfied operation. Use a carefully tested `changed_when` only to report whether an executed command changed state; it does not make the command idempotent. If no guard can prevent repeated changes, the task is not idempotent and should be documented and isolated.

## Understand Check Mode

`command` and `shell` have partial check-mode support through `creates` and `removes`. Without those options, Ansible generally skips the arbitrary command in check mode because it cannot safely predict the result.

`raw` has no check-mode support.

Never force an arbitrary command to run during `--check` merely to make the preview complete. Separate a read-only probe from the state-changing operation:

```yaml
- name: Read current schema version
  ansible.builtin.command:
    argv:
      - /usr/local/bin/contoso-api
      - schema-version
  register: schema_version_result
  changed_when: false
  check_mode: false

- name: Upgrade schema when required
  ansible.builtin.command:
    argv:
      - /usr/local/bin/contoso-api
      - schema-upgrade
  when: schema_version_result.stdout | trim != desired_schema_version
```

Only mark a probe `check_mode: false` when it is proven read-only.

## Keep Secrets Out of Process Arguments

All three modules can expose data through:

- Playbook source.
- Controller or job logs.
- Remote process listings.
- Shell history inside a wrapper.
- Diagnostic tracing.
- Registered output.

`no_log: true` suppresses normal Ansible task output, but it does not protect debug output or prevent a secret placed in an argument from appearing in the remote process table. Prefer a purpose-built module's secret parameter, protected temporary file, `stdin` where the application supports it, or another documented credential mechanism.

Do not build a shell command by concatenating credentials, even with `quote`.

## A Selection Flow

Ask these questions in order:

1. Is there a module that manages this resource or operation?
   - Use it.
2. Can the target run normal Ansible modules?
   - If no, use a minimal `raw` bootstrap.
3. Is the operation one executable with arguments?
   - Use `command`, preferably `argv`.
4. Does it require a pipe, redirect, glob, shell parameter expansion, or compound shell statement?
   - Use `shell`, quote all templated values, and specify Bash only when required.
5. Is the inline shell becoming a program?
   - Move it to a tested script or custom module.

## Review Checklist

- Use the fully qualified module name.
- Prefer desired-state modules.
- Prefer `command.argv` for argument boundaries.
- Use `shell` only for actual shell syntax.
- Quote every templated shell argument.
- Do not assume `/bin/sh` is Bash.
- Use `raw` only for bootstrap or non-Python targets.
- Disable initial fact gathering for a Python bootstrap.
- Define truthful `changed_when` and `failed_when`.
- Understand the limited check-mode behavior.
- Keep secrets out of commands and logs.
- Replace large inline scripts with maintained content.

The safest choice is usually the least powerful execution path that satisfies the task. A module understands state, `command` understands arguments, `shell` understands shell syntax, and `raw` understands only the bootstrap escape hatch.

## Official Documentation

- [ansible.builtin.raw module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html)
- [ansible.builtin.command module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html)
- [ansible.builtin.shell module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html)
- [ansible.builtin.script module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_module.html)
- [Validating tasks with check mode and diff mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html)
