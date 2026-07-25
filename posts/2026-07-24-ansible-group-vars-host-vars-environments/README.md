# Organizing Ansible Inventories with group_vars and host_vars Across Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ansible, Inventory, Variable, Configuration Management, Automation, DevOps

Description: Structure staging and production inventories so group defaults, host exceptions, secrets, and override behavior remain predictable.

---

Ansible inventory answers two different questions: which hosts belong to a deployment target, and which values apply to each host. Putting every host and variable in one large file works briefly, then makes staging and production easy to mix and override conflicts hard to explain.

The built-in `host_group_vars` vars plugin gives each inventory a clean data hierarchy. Group files describe policy shared by a class of hosts. Host files contain genuine exceptions. Separate environment roots keep production membership and values out of a staging run.

## Use One Inventory Root per Environment

A practical repository can look like this:

```text
automation/
├── ansible.cfg
├── inventories/
│   ├── staging/
│   │   ├── hosts.yml
│   │   ├── group_vars/
│   │   │   ├── all/
│   │   │   │   ├── 00-defaults.yml
│   │   │   │   └── 90-vault.yml
│   │   │   ├── webservers.yml
│   │   │   └── database.yml
│   │   └── host_vars/
│   │       └── stg-web-01.yml
│   └── production/
│       ├── hosts.yml
│       ├── group_vars/
│       │   ├── all/
│       │   │   ├── 00-defaults.yml
│       │   │   └── 90-vault.yml
│       │   ├── webservers.yml
│       │   └── database.yml
│       └── host_vars/
│           └── prod-web-02.yml
├── playbooks/
│   └── site.yml
└── roles/
```

Select exactly one environment:

```bash
ansible-playbook \
  -i inventories/staging/hosts.yml \
  playbooks/site.yml

ansible-playbook \
  -i inventories/production/hosts.yml \
  playbooks/site.yml
```

Do not pass both merely to save typing. Ansible merges multiple inventory sources in the order supplied. Hosts, groups, and variables from staging and production would share one in-memory inventory, and later definitions can replace earlier values.

A small wrapper, CI job parameter, or deployment tool should make environment selection explicit and log the selected source.

## Keep Host Membership in hosts.yml

Create `inventories/production/hosts.yml`:

```yaml
all:
  children:
    production:
      children:
        eu_west:
          children:
            webservers:
              hosts:
                prod-web-01:
                  ansible_host: 10.20.1.11
                prod-web-02:
                  ansible_host: 10.20.1.12
            database:
              hosts:
                prod-db-01:
                  ansible_host: 10.20.2.11
```

This models three useful dimensions:

- `production` is the environment safety boundary.
- `eu_west` is a location group.
- `webservers` and `database` are functional groups.

A host can be in more than one group. Ansible flattens group variables onto each host before a play runs. The group hierarchy is not an object hierarchy available at task time, so inspect the final host values rather than assuming a visual tree alone determines them.

The YAML inventory plugin expects valid YAML extensions such as `.yml`, `.yaml`, or `.json`. Use a colon after every host name to avoid ambiguous YAML.

## Put Environment-Wide Defaults in group_vars/all

Create `inventories/production/group_vars/all/00-defaults.yml`:

```yaml
environment_name: production
monitoring_region: eu
ntp_servers:
  - time1.example.com
  - time2.example.com
backup_retention_days: 35
ansible_user: automation
ansible_become_method: sudo
```

The `all` group contains every host. It is the right place for values that truly apply throughout this one inventory, not values that are universal across all companies, repositories, or environments.

Staging can define the same variable names with staging values:

```yaml
# inventories/staging/group_vars/all/00-defaults.yml
environment_name: staging
monitoring_region: eu
backup_retention_days: 7
ansible_user: automation
ansible_become_method: sudo
```

The playbook consumes one stable interface:

```yaml
- name: Show selected environment
  ansible.builtin.debug:
    msg: "Deploying to {{ environment_name }}"
```

It does not contain `if production else staging` logic for every setting.

## Put Functional Policy in Named Group Files

The filename must match the inventory group exactly. For `webservers`, create `group_vars/webservers.yml`:

```yaml
application_port: 8443
application_workers: 8
healthcheck_path: /healthz
```

For `database`, create `group_vars/database.yml`:

```yaml
database_port: 5432
database_backup_enabled: true
```

Location policy belongs in `group_vars/eu_west.yml`:

```yaml
artifact_mirror: https://packages.eu.example.com
timezone_name: Europe/Dublin
```

This keeps ownership understandable. The web role owns `application_workers`; the location group owns `artifact_mirror`; the environment owns retention.

Avoid duplicating the same variable in several unrelated sibling groups. A host in both groups will receive only one final value, and the winner may depend on inventory merge order.

## Reserve host_vars for Real Exceptions

Suppose `prod-web-02` needs fewer workers temporarily. Create:

```yaml
# inventories/production/host_vars/prod-web-02.yml
application_workers: 4
exception_ticket: CHG-2048
exception_expires: "2026-08-15"
```

The file uses the `inventory_hostname`, `prod-web-02`, not the value of `ansible_host`. Host variables override group inventory variables, so this host gets four workers while the rest get eight.

Host exceptions should be:

- Rare.
- Documented with an owner or ticket.
- Time-bounded where practical.
- Reviewed for removal.

If half the group needs the same exception, create a meaningful subgroup instead of many copied host files.

Do not use `host_vars` as a dumping ground for discovered runtime facts. Dynamic properties belong in facts, dynamic inventory, or another authoritative source.

## Understand Where Ansible Searches

The default `host_group_vars` plugin loads YAML variable files from `group_vars/` and `host_vars/` relative to:

- The inventory source.
- The playbook file.

If both locations define the same variable, values found relative to the playbook directory override values found relative to the inventory source.

That detail explains a common debugging surprise: `ansible-playbook` sees a playbook-level `group_vars/all.yml`, while an `ansible-inventory` command launched without a playbook does not.

For a non-playbook command, supply the project directory explicitly when playbook-relative variables matter:

```bash
ansible-inventory \
  -i inventories/production/hosts.yml \
  --playbook-dir . \
  --host prod-web-02 \
  --yaml
```

For a strong environment boundary, prefer environment-specific values next to their inventory. Reserve playbook-relative variables for values intentionally shared across inventories.

## Use Directories to Split Large Variable Sets

A group or host name can be a directory:

```text
group_vars/
└── all/
    ├── 00-defaults.yml
    ├── 20-monitoring.yml
    └── 90-vault.yml
```

Ansible reads files in these directories in lexicographical order. If two files define the same variable, the later definition can replace the earlier one. Numeric prefixes make the order visible, but they should not become an elaborate override language.

A better secret pattern avoids reusing the same name:

```yaml
# 20-database.yml
database_password: "{{ vault_database_password }}"
```

```yaml
# 90-vault.yml, encrypted with Ansible Vault
vault_database_password: replace-before-encryption
```

Encrypt the secret file:

```bash
ansible-vault encrypt \
  inventories/production/group_vars/all/90-vault.yml
```

The reference makes it clear which value is secret and avoids depending on alphabetical replacement of `database_password`.

Ansible Vault encrypts data at rest. Decrypted values can still leak through debug output, module arguments, templates, or logs. Apply `no_log: true` to secret-handling tasks where necessary and control access to job output.

## Know the Inventory Merge Rules

Within inventory, the general specificity order is:

1. `all` group.
2. Parent group.
3. Child group.
4. Host.

A child group's variable overrides the same variable from its parent. A host variable overrides group variables.

Sibling groups are different. By default, Ansible merges same-level groups alphabetically, and the group loaded later wins for a conflicting variable. You can set `ansible_group_priority` in the inventory source to change that order:

```yaml
all:
  children:
    regional_defaults:
      vars:
        ansible_group_priority: 10
      hosts:
        prod-web-01:
    emergency_override:
      vars:
        ansible_group_priority: 50
      hosts:
        prod-web-01:
```

`ansible_group_priority` must be in the inventory source. It cannot be in `group_vars/` because Ansible needs it before loading those variables.

Use this capability sparingly. If production correctness depends on remembering an invisible priority between many sibling groups, the group model is too ambiguous.

Variables from other categories can override inventory entirely. Play vars, task vars, `include_vars`, `set_fact`, role parameters, and extra vars have higher positions in Ansible's variable-precedence order. Extra vars passed with `-e` have the highest variable precedence.

## Keep Role Defaults Overridable

Reusable roles should put consumer-adjustable defaults in:

```text
roles/application/defaults/main.yml
```

For example:

```yaml
application_port: 8080
application_workers: 2
healthcheck_path: /health
```

Inventory then expresses the environment's policy and overrides those low-precedence role defaults.

Do not put normal environment settings in `roles/application/vars/main.yml`. Role vars have high precedence and are intentionally harder for inventory to override. Use them only for values that are internal to the role and should not be consumer configuration.

## Validate the Effective Inventory

Validate membership:

```bash
ansible-inventory \
  -i inventories/production/hosts.yml \
  --graph
```

Include variables in the graph:

```bash
ansible-inventory \
  -i inventories/production/hosts.yml \
  --graph \
  --vars
```

Inspect one host's final variables:

```bash
ansible-inventory \
  -i inventories/production/hosts.yml \
  --host prod-web-02 \
  --yaml
```

Confirm play selection:

```bash
ansible-playbook \
  -i inventories/production/hosts.yml \
  playbooks/site.yml \
  --list-hosts
```

Add assertions near the start of a production play:

```yaml
- name: Verify the selected inventory is production
  ansible.builtin.assert:
    that:
      - environment_name == "production"
      - "'production' in group_names"
    fail_msg: "This play requires the production inventory."
```

An assertion does not replace access control, approvals, or `--limit`, but it catches an accidental inventory mismatch early.

## Avoid Common Layout Failures

### A variable file does not load

Check spelling, case, valid YAML extension, and whether the filename matches the `inventory_hostname` or group name. Then run `ansible-inventory --host`.

### Ad hoc and playbook commands disagree

Look for playbook-relative `group_vars` and use `--playbook-dir` when comparing.

### A staging value appears in production

Check for multiple `-i` arguments, `ANSIBLE_INVENTORY`, and the active `ansible.cfg`. Run:

```bash
ansible --version
ansible-config dump --only-changed
```

### One sibling group unexpectedly wins

Remove the duplicate setting, create a parent-child relationship, or set a documented `ansible_group_priority` in inventory.

### A dictionary loses keys

The default `hash_behavior` is `replace`, not a deep merge. Prefer complete dictionaries or combine them explicitly in a controlled expression. Changing global hash behavior can make roles behave differently and is not a substitute for clear variable ownership.

## Recommended Rules

- Use one inventory root per environment.
- Select only one environment in a run.
- Keep membership in inventory and policy in variable files.
- Put broad defaults in `group_vars/all`.
- Put functional and regional values in matching group files.
- Use `host_vars` only for documented exceptions.
- Keep overridable role values in role defaults.
- Give vaulted variables distinct names.
- Inspect the effective host with `ansible-inventory`.
- Eliminate duplicate definitions instead of memorizing precedence.

A predictable inventory is not the one with the most layers. It is the one where an operator can identify the owner and expected override path of any value before a play begins.

## Official Documentation

- [How to build your inventory](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html)
- [Using variables](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html)
- [Controlling Ansible behavior with precedence rules](https://docs.ansible.com/projects/ansible/latest/reference_appendices/general_precedence.html)
- [Using encrypted variables and files](https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html)
- [ansible-inventory command reference](https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html)

