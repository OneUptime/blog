# Ansible Variable Precedence Explained Through Real Override Conflicts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ansible, Variables, Debugging, Playbooks, Configuration Management, Automation

Description: Understand Ansible precedence by tracing connection, inventory, role, play, task, set_fact, and extra-variable conflicts.

---

Ansible variable precedence feels unpredictable when the same name is defined in several places. The behavior is deterministic, but there are two related ladders to understand:

1. Configuration settings, command-line options, playbook keywords, variables, and direct plugin assignments have category precedence.
2. Variables have their own detailed order based on source and scope.

The practical solution is not to memorize every position and use all of them. It is to trace a few real conflicts, then design each variable to have one normal owner.

## First Separate Options, Keywords, and Variables

Consider the remote login user. It can be set as:

```ini
# ansible.cfg
[defaults]
remote_user = config-user
```

```bash
# Command-line option
ansible-playbook site.yml -u cli-user
```

```yaml
# Playbook keyword
- name: Configure web servers
  hosts: webservers
  remote_user: play-user
```

```yaml
# Inventory variable
ansible_user: inventory-user
```

These values look equivalent, but they are not in the same category. From lower to higher precedence, Ansible documents:

```text
configuration settings
  < command-line options
  < playbook keywords
  < variables
  < direct assignment to a plugin or module
```

Therefore, `ansible_user: inventory-user` overrides `remote_user`, `-u cli-user`, and the `remote_user` configuration setting. It is a variable, and variables are above those other categories.

Now add:

```bash
ansible-playbook site.yml \
  -u cli-user \
  -e ansible_user=extra-user
```

`-e` or `--extra-vars` is syntactically passed on the command line, but its data belongs to the variable category. Extra vars have the highest precedence among variables, so the connection uses `extra-user`.

This distinction resolves one of the most common misconceptions: a normal command-line option does not automatically beat inventory or play variables.

## Confirm Configuration Before Tracing Variables

Ansible loads the first configuration file it finds:

1. `ANSIBLE_CONFIG`
2. `ansible.cfg` in the current directory
3. `~/.ansible.cfg`
4. `/etc/ansible/ansible.cfg`

Later files are ignored. Environment variables for configuration override values in the selected file, and command-line options override configuration.

Inspect the active sources:

```bash
ansible --version
ansible-config dump --only-changed
```

`ansible --version` prints the active configuration path. `ansible-config dump --only-changed` shows nondefault configuration and often identifies where a surprising timeout, inventory path, connection plugin, or remote user originated.

Do this before editing inventory. A hidden `ANSIBLE_CONFIG` or `ANSIBLE_REMOTE_USER` in CI is not an inventory-precedence issue.

## The Practical Variable Precedence Ladder

Ansible's full list is detailed. These are the sources most often involved in application automation, from lower to higher precedence:

```text
role defaults
  < inventory group variables
  < inventory host variables
  < facts and cached set_facts
  < play vars, vars_prompt, and vars_files
  < role vars
  < block vars
  < task vars
  < include_vars
  < registered vars and set_fact
  < role parameters
  < include parameters
  < extra vars
```

There are more distinctions within inventory:

- `group_vars/all` is less specific than a child group's variables.
- Child-group variables override parent-group variables.
- Host variables override group variables.
- Playbook-relative `group_vars` and `host_vars` override inventory-relative versions at the equivalent level.

The complete official list should be the reference during an unusual conflict. The condensed ladder is a design aid.

## Conflict 1: Role Default vs. Environment Policy

A reusable role should offer an easy-to-override default:

```yaml
# roles/api/defaults/main.yml
api_port: 8080
api_workers: 2
```

Production policy belongs in inventory:

```yaml
# inventories/production/group_vars/api.yml
api_port: 8443
api_workers: 8
```

For hosts in the `api` group, inventory wins because role defaults are the lowest-precedence variables. This is intentional. A role author supplies a safe generic value; the environment owner supplies deployment policy.

Now imagine the role uses:

```yaml
# roles/api/vars/main.yml
api_port: 8080
```

Role vars have much higher precedence and override normal inventory host and group variables. The production value appears to be ignored.

The fix is structural, not another override. Move consumer-configurable values from `roles/api/vars/main.yml` to `roles/api/defaults/main.yml`. Reserve role vars for internal constants that a normal role consumer should not change.

## Conflict 2: Parent, Child, Sibling, and Host Groups

Suppose the inventory contains:

```yaml
all:
  children:
    production:
      vars:
        api_port: 8000
      children:
        api:
          vars:
            api_port: 8080
          hosts:
            api-01:
            api-02:
```

and:

```yaml
# host_vars/api-02.yml
api_port: 8181
```

The effective values are:

```text
api-01 -> 8080, from child group api
api-02 -> 8181, from host_vars
```

The child overrides its parent, and the host overrides the group.

Sibling groups are more subtle. If `api-01` belongs to both `blue` and `canary`, and both define `api_port`, Ansible normally merges same-level groups alphabetically. The later group wins. That is deterministic but fragile.

You can set `ansible_group_priority` in the inventory source:

```yaml
canary:
  vars:
    ansible_group_priority: 50
    api_port: 8282
  hosts:
    api-01:
```

A higher group priority merges later. The priority must be in the inventory source, not `group_vars/`, because Ansible needs it before group variables are loaded.

Prefer a more explicit child group or one variable owner. Alphabetical filenames and group priority should not become the main environment policy engine.

Inspect final inventory values:

```bash
ansible-inventory \
  -i inventories/production/hosts.yml \
  --host api-01 \
  --yaml
```

This shows inventory-derived values. It cannot, by itself, show a play var or a `set_fact` that has not executed yet.

## Conflict 3: Inventory vs. Play and Task Vars

Given the inventory value:

```yaml
api_port: 8443
```

this play overrides it:

```yaml
---
- name: Demonstrate play and task scope
  hosts: api
  gather_facts: false

  vars:
    api_port: 9000

  tasks:
    - name: Show the play value
      ansible.builtin.debug:
        var: api_port

    - name: Show a task-local value
      ansible.builtin.debug:
        var: api_port
      vars:
        api_port: 9001

    - name: Show the play value again
      ansible.builtin.debug:
        var: api_port
```

The output is conceptually:

```text
9000
9001
9000
```

Play vars override inventory. The task var is more specific but exists only for that task. After the task, the play value is visible again.

This is useful for a truly local parameter. It is a poor way to define environment policy because `ansible-inventory --host` cannot expose the override and another play may not share it.

## Conflict 4: include_vars and set_fact

Start with a play var:

```yaml
vars:
  release_channel: stable
```

Load a file:

```yaml
- name: Load an emergency variable file
  ansible.builtin.include_vars:
    file: emergency.yml
```

where:

```yaml
# emergency.yml
release_channel: hotfix
```

`include_vars` has higher precedence than normal play, role, and task vars, so subsequent tasks see `hotfix`.

Now set a fact:

```yaml
- name: Select a channel at runtime
  ansible.builtin.set_fact:
    release_channel: runtime

- name: Display the effective value
  ansible.builtin.debug:
    var: release_channel
```

The value is `runtime`. A `set_fact` variable has higher precedence than `include_vars` and remains associated with that host for subsequent plays in the current playbook run.

That persistence causes a common bug:

```yaml
- name: Reset channel with an ordinary task variable
  ansible.builtin.debug:
    var: release_channel
  vars:
    release_channel: stable
```

The earlier `set_fact` still has higher precedence. Adding more low-precedence definitions will not reset it.

Use a different runtime variable name, avoid mutating configuration names with `set_fact`, or calculate the value once through an explicit expression.

## Cached set_fact Has Two Lives

With:

```yaml
- name: Cache a discovered deployment wave
  ansible.builtin.set_fact:
    deployment_wave: 3
    cacheable: true
```

Ansible creates a high-precedence host variable for the current run and an `ansible_fact` copy eligible for the configured fact cache. On a later run, the cached value has the lower precedence of a cached fact.

This can produce different winners between the run that created the value and the next run. Do not use cached facts as a substitute for authoritative inventory policy. They are well suited to discovered data with a clear expiry.

Inspect and clear the configured fact cache using its plugin-specific operational procedure when testing this behavior.

## Conflict 5: Registered Results Reuse a Name

A registered variable has high precedence:

```yaml
- name: Read the current release file
  ansible.builtin.command:
    argv:
      - /usr/bin/cat
      - /etc/contoso/release
  register: release_channel
  changed_when: false
```

`release_channel` is no longer a string. It is a result dictionary containing keys such as `stdout`, `rc`, `stderr`, and `changed`. A later template expecting:

```jinja2
channel={{ release_channel }}
```

now receives the whole dictionary.

Use a descriptive result name:

```yaml
register: release_file_result
```

Then derive a separate value:

```yaml
- name: Normalize the release channel
  ansible.builtin.set_fact:
    effective_release_channel: "{{ release_file_result.stdout | trim }}"
```

Variable precedence determines which object wins; it does not protect the expected type.

Assert both value and type near a boundary:

```yaml
- name: Validate release inputs
  ansible.builtin.assert:
    that:
      - api_port | type_debug == "int"
      - api_port >= 1
      - api_port <= 65535
```

Quote or cast inputs deliberately. Values passed as simple `key=value` extra vars are strings, while JSON or YAML extra-vars files preserve types.

## Conflict 6: Extra Vars Override Everything Else

Run:

```bash
ansible-playbook \
  -i inventories/production/hosts.yml \
  site.yml \
  -e api_port=9443
```

Every normal variable source loses to the extra var, including role parameters, `include_vars`, registered variables, and `set_fact`.

That makes extra vars appropriate for explicit run inputs such as an immutable release digest:

```bash
ansible-playbook deploy.yml \
  -e @releases/payments-2026.07.24.yml
```

It makes them dangerous as a routine fix for a confusing variable model. A pipeline that always passes dozens of `-e` values prevents inventory and roles from expressing policy and makes local reproduction harder.

Never pass secrets directly on a command line, where shell history and process inspection can expose them. Use Vault, protected job credentials, or a supported secret integration.

## Dictionary Conflicts Are Usually Replacement

Suppose a role default defines:

```yaml
service_settings:
  port: 8080
  workers: 2
  log_level: info
```

Inventory defines:

```yaml
service_settings:
  workers: 8
```

With the default `hash_behavior=replace`, the inventory dictionary replaces the lower-precedence dictionary. `port` and `log_level` do not automatically survive.

Prefer complete dictionaries at the owning layer or combine explicit fragments:

```yaml
service_defaults:
  port: 8080
  workers: 2
  log_level: info

service_environment_overrides:
  workers: 8

service_settings: >-
  {{
    service_defaults
    | combine(service_environment_overrides, recursive=true)
  }}
```

Make one expression responsible for merging. A global switch to merge hashes changes behavior throughout the project and can conceal ownership conflicts.

## Trace a Surprising Value Systematically

Use this sequence:

1. Search for every definition of the exact variable name.
2. Classify each as config, option, keyword, or variable.
3. Confirm the active config with `ansible --version`.
4. Inspect inventory with `ansible-inventory --host`.
5. Check play, role, task, include, and role-parameter sources.
6. Look for earlier `register` and `set_fact` tasks.
7. Check `-e` and job-template survey inputs.
8. Print the value and type in a nonsecret debug task.
9. Use `-vvv` to inspect connection behavior when the conflict is a connection variable.

A temporary diagnostic task:

```yaml
- name: Diagnose a nonsecret variable
  ansible.builtin.debug:
    msg:
      value: "{{ api_port }}"
      type: "{{ api_port | type_debug }}"
      host: "{{ inventory_hostname }}"
      groups: "{{ group_names }}"
```

Do not debug passwords, tokens, private keys, or full dictionaries that might contain secrets.

## Design Rules That Avoid Precedence Battles

- Put reusable consumer defaults in role `defaults/`.
- Put environment and location policy in inventory.
- Use host vars only for documented exceptions.
- Use role vars only for internal, hard-to-override constants.
- Keep task vars local to one task.
- Give registered results names ending in `_result`.
- Give runtime-derived values new names instead of overwriting inputs.
- Use extra vars for explicit run inputs, not permanent configuration.
- Keep secret variables distinct, such as `vault_database_password`.
- Avoid defining the same setting in sibling groups.
- Assert important types and environment invariants.

Precedence is a conflict-resolution mechanism, not a configuration architecture. The cleanest Ansible project rarely needs to ask which of ten definitions wins because each value has one normal source and a small, intentional override path.

## Official Documentation

- [Using variables and the full variable precedence list](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html)
- [Controlling how Ansible behaves: precedence rules](https://docs.ansible.com/projects/ansible/latest/reference_appendices/general_precedence.html)
- [How inventory variables are merged](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html)
- [ansible.builtin.set_fact module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html)
- [Discovering variables, facts, and magic variables](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html)

