# Preventing “Variable Is Undefined” with assert, default, and mandatory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Automation, Variables, Error Handling, Jinja2

Description: Prevent undefined-variable failures in Ansible by designing explicit inputs, safe defaults, assertions, and role contracts.

---

Ansible normally stops when a templated expression references a variable that does not exist. That strict behavior is useful: a misspelled database host should not quietly become an empty string. The challenge is deciding which values are optional, which are required, and where to enforce that contract.

The sustainable solution is not to put `default()` after every variable. Give genuine options sensible defaults, validate required input before doing work, and reserve `mandatory` or `undef()` for places where absence must be an error.

## Find the Actual Missing Value

The error often points at the first task that consumes a value, not the place where the value should have been defined. Start by asking:

1. Is the name misspelled?
2. Is the variable expected from role defaults, inventory, facts, a registered result, or `--extra-vars`?
3. Did a `when` condition skip the task that registers it?
4. Is the play running against a host or group that does not receive the expected `group_vars`?
5. Is a nested key absent even though the outer dictionary exists?

Inspect inventory as Ansible sees it:

```bash
ansible-inventory -i inventories/production --host web-01
ansible-inventory -i inventories/production --graph --vars
```

For a non-secret value, inspect both definition and type:

```yaml
- name: Inspect application settings during troubleshooting
  ansible.builtin.debug:
    msg:
      defined: "{{ app_settings is defined }}"
      type: "{{ (app_settings | default(none)) | type_debug }}"
```

Do not debug a secret merely to prove it exists. Test `is defined` or validate its shape inside a task with `no_log: true`.

## Use Defaults Only for Optional Input

Role defaults are the clearest home for values that have a safe, documented fallback:

```yaml
# roles/web/defaults/main.yml
web_listen_port: 8080
web_log_level: info
web_extra_packages: []
web_tls_enabled: false
```

Callers can override role defaults through inventory or role parameters. A task then consumes a stable interface:

```yaml
- name: Install optional web packages
  ansible.builtin.package:
    name: "{{ web_extra_packages }}"
    state: present
  when: web_extra_packages | length > 0
```

For a local fallback, use the fully qualified filter name when clarity matters:

```yaml
- name: Render a development configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
    mode: "0644"
  vars:
    effective_log_level: >-
      {{ app_log_level | ansible.builtin.default('info') }}
```

By default, `default()` replaces only an undefined value. It preserves `false`, `0`, an empty string, and an empty list. That distinction is important:

```jinja2
enabled={{ feature_enabled | default(true) }}
workers={{ worker_count | default(4) }}
```

If `feature_enabled` is explicitly `false`, it stays false. If `worker_count` is explicitly `0`, it stays zero.

Jinja's optional second argument treats false-like values as absent:

```jinja2
display_name={{ service_display_name | default('Unnamed service', true) }}
```

Use that form only when empty, false, or zero is genuinely invalid. Applying it to booleans or counts can silently discard a deliberate configuration.

## Make Loops Safe Without Hiding Errors

An optional list can default to an empty list, allowing the whole loop to skip:

```yaml
- name: Create optional application directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    mode: "0755"
  loop: "{{ app_directories | default([]) }}"
```

Use the matching empty type. A dictionary loop should receive `{}`, not `[]`:

```yaml
- name: Write optional environment entries
  ansible.builtin.lineinfile:
    path: /etc/myapp/environment
    regexp: "^{{ item.key }}="
    line: "{{ item.key }}={{ item.value }}"
    create: true
    mode: "0600"
  loop: "{{ (app_environment | default({})) | dict2items }}"
  no_log: true
```

This pattern is appropriate only when an absent collection means “no items.” If the collection is required business input, fail explicitly instead.

## Omit an Optional Module Argument

Ansible's special `omit` placeholder removes a module parameter entirely. This is different from sending an empty or null value:

```yaml
- name: Create an application user
  ansible.builtin.user:
    name: "{{ app_user }}"
    shell: "{{ app_shell | default(omit) }}"
    uid: "{{ app_uid | default(omit) }}"
    state: present
```

The module can then use its own default behavior. Be careful when chaining filters after `default(omit)`, because another filter may try to transform the placeholder. Ansible's filter guide recommends a pattern such as `default(None) | some_filter or omit` when further transformation is unavoidable.

## Assert the Input Contract Before Changes

`ansible.builtin.assert` evaluates expressions on the controller and supports check mode. Put preflight assertions near the beginning of a role or play:

```yaml
- name: Validate deployment input
  ansible.builtin.assert:
    that:
      - app_name is defined
      - app_name is string
      - app_name | length > 0
      - app_port is defined
      - app_port | int >= 1
      - app_port | int <= 65535
      - deploy_environment in ['development', 'staging', 'production']
    fail_msg: >-
      Define app_name, a valid app_port, and a supported
      deploy_environment before running this role.
    success_msg: Deployment input is valid.
    quiet: true
```

Avoid referencing a missing value before testing that it exists. For complex structures, default to an empty structure inside later expressions:

```yaml
- name: Validate database configuration
  ansible.builtin.assert:
    that:
      - database is defined
      - database | default({}) is mapping
      - (database | default({})).host | default('') | length > 0
      - (database | default({})).port | default(0) | int > 0
    fail_msg: database.host and database.port are required.
```

Assertions are especially valuable when an invalid value would otherwise fail much later, after some hosts have already changed.

## Use mandatory for a Required Template Value

The `mandatory` filter returns the value unchanged when it exists and raises an error when it is undefined:

```jinja2
database_url={{ database_url | mandatory }}
```

It is most useful if undefined-variable failures have been relaxed globally, or when a template should make a required field unmistakable. It checks existence, not quality. An empty string passes `mandatory`, so use `assert` when you also need type, range, format, or cross-field validation.

For a role default that must be overridden, `undef()` can document the contract and provide a useful hint:

```yaml
# roles/deploy/defaults/main.yml
artifact_url: >-
  {{ undef(hint='Set artifact_url to an immutable release artifact') }}
```

This is preferable to a fake placeholder such as `CHANGEME`, which is defined and can accidentally reach production.

## Handle Registered Results Deliberately

Ansible creates a registered variable for each host even when the task is skipped or fails. Test its state rather than assuming a successful result shape:

```yaml
- name: Query current application version
  ansible.builtin.command:
    cmd: /opt/myapp/bin/myapp --version
  register: version_query
  changed_when: false
  # This tool documents rc=3 as "not installed".
  failed_when: version_query.rc not in [0, 3]

- name: Report an installed version
  ansible.builtin.debug:
    msg: "{{ version_query.stdout }}"
  when:
    - version_query is succeeded
    - version_query.rc == 0
    - version_query.stdout | default('') | length > 0
```

When a prior task is conditional, use `result is skipped`, `result is failed`, or a guarded field access. Do not use a broad default that converts a genuine command failure into apparently valid data.

## A Practical Decision Rule

Choose the mechanism based on intent:

- Put a value in role defaults when every caller can safely accept it.
- Use `default()` when absence has a clear local meaning.
- Use `default(omit)` when a module should receive no argument.
- Use `assert` for required values, types, ranges, and relationships.
- Use `mandatory` for a concise existence check during templating.
- Use `undef(hint=...)` to require callers to override a role default.

This turns undefined-variable handling into an explicit interface. A play either proceeds with intentional defaults or stops early with a useful explanation, rather than failing halfway through a deployment.

## Official Documentation

- [Using filters to manipulate data](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html)
- [ansible.builtin.default filter](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_filter.html)
- [ansible.builtin.assert module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html)
- [The undef function](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_undef.html)
- [Using variables](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html)
