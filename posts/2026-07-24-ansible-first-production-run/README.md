# Ansible’s First Production Run: Inventory, ansible.cfg, SSH, and Playbook Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ansible, Automation, Configuration Management, SSH, Infrastructure, DevOps

Description: Prepare a safe first Ansible production run with a versioned project, explicit inventory, verified SSH, and a canary rollout.

---

Ansible can run a command against a server within minutes. A first production run deserves more preparation. The control node, inventory, configuration file, SSH trust, privilege escalation, variables, and playbook all need to resolve the same way for every operator and CI job.

The goal is not merely to make `ansible.builtin.ping` return `pong`. It is to create a small, repeatable project that can be reviewed, tested on one host, and expanded without changing hidden workstation state.

## Know the Control and Managed Node Requirements

Ansible runs from a control node. For the normal SSH connection path:

- The control node needs a supported Python version, Ansible, OpenSSH, and access to the managed network.
- Managed Linux or Unix nodes need SSH access and usually Python for Ansible modules.
- Most managed nodes do not need an Ansible agent.
- The connecting identity needs only the privileges required by the playbook.

The `ansible.builtin.raw` module is a special bootstrap tool that does not require Python on the managed node. Use it only when a minimal image lacks Python or when managing a device that cannot run normal modules. Fact gathering and `ansible.builtin.ping` require the module subsystem, so they will fail before Python is available.

## Install and Record a Tested Ansible Version

Use an isolated Python virtual environment:

```bash
mkdir ansible-platform
cd ansible-platform

python3 -m venv .venv
. .venv/bin/activate

python -m pip install --upgrade pip
python -m pip install ansible-core

ansible --version
ansible-playbook --version
```

For a real project, test a specific `ansible-core` release and pin it in a requirements or lock file. Do not let every CI run silently install whatever version is newest that day. Collections have independent versions and should also be declared in `collections/requirements.yml`.

The `ansible` community package includes `ansible-core` plus a curated set of collections. `ansible-core` is smaller. Choose deliberately and record both core and collection versions:

```bash
ansible-galaxy collection list
python -m pip freeze
```

## Create a Reviewable Project Layout

Start with this structure:

```text
ansible-platform/
├── ansible.cfg
├── collections/
│   └── requirements.yml
├── inventories/
│   └── production/
│       ├── hosts.yml
│       ├── group_vars/
│       │   └── all.yml
│       └── host_vars/
├── playbooks/
│   └── production-baseline.yml
└── roles/
```

Keep inventory names, configuration, and playbooks in version control. Do not commit private keys, passwords, vault passwords, or cloud credentials.

An explicit environment directory prevents a staging host and a production host from being selected through the same ambiguous file.

## Write a YAML Inventory

Create `inventories/production/hosts.yml`:

```yaml
all:
  children:
    production:
      children:
        webservers:
          hosts:
            web-01:
              ansible_host: web-01.prod.example.com
            web-02:
              ansible_host: web-02.prod.example.com
        database:
          hosts:
            db-01:
              ansible_host: db-01.prod.example.com
```

`web-01` is the `inventory_hostname`, the stable name Ansible uses for variables and patterns. `ansible_host` is the address passed to the connection plugin. Keeping them separate lets a server address change without renaming its host-variable file.

Create `inventories/production/group_vars/all.yml`:

```yaml
ansible_user: automation
ansible_become_method: sudo
ansible_python_interpreter: /usr/bin/python3
```

Set `ansible_python_interpreter` only when that path is known across these hosts. Ansible supports interpreter discovery, so omitting the variable is better than hard-coding the wrong path on a heterogeneous fleet.

Avoid putting `ansible_password`, `ansible_become_password`, or a private-key value in plain inventory. Prefer an SSH agent, protected CI credential, managed secret integration, or Ansible Vault as appropriate.

Verify how Ansible parsed the inventory:

```bash
ansible-inventory \
  -i inventories/production/hosts.yml \
  --graph

ansible-inventory \
  -i inventories/production/hosts.yml \
  --host web-01 \
  --yaml
```

If the graph is wrong, stop. A successful SSH connection to the wrong set of hosts is worse than a parser error.

## Make ansible.cfg Explicit

Create a project-level `ansible.cfg`:

```ini
[defaults]
inventory = inventories/production/hosts.yml
roles_path = roles
forks = 20
timeout = 30
host_key_checking = True

[ssh_connection]
pipelining = True
```

`pipelining` can reduce SSH operations, but some older sudo configurations that require a TTY are incompatible with it. Test it against the actual production sudo policy.

Ansible uses the first configuration file it finds in this order:

1. The path in `ANSIBLE_CONFIG`.
2. `ansible.cfg` in the current directory.
3. `~/.ansible.cfg`.
4. `/etc/ansible/ansible.cfg`.

It ignores all later files. A command launched from the wrong directory can therefore use different defaults. Confirm the active file and changed settings:

```bash
ansible --version
ansible-config dump --only-changed
```

The `ansible --version` output includes the configuration file path. Ansible will not automatically load `ansible.cfg` from a world-writable current directory because another user could replace it with malicious configuration. Fix directory ownership and permissions instead of attempting to bypass that safeguard.

For CI, set `ANSIBLE_CONFIG` to a controlled absolute path or always run from the repository root.

## Establish SSH Trust Before Running Ansible

Ansible uses native OpenSSH by default on suitable systems and can use normal SSH configuration, agents, jump hosts, and ControlPersist.

Create a dedicated automation key according to the organization's key policy:

```bash
ssh-keygen \
  -t ed25519 \
  -f "$HOME/.ssh/ansible-production" \
  -C "ansible-production"

ssh-add "$HOME/.ssh/ansible-production"
```

Provision only the public key on managed nodes. Restrict the account through sudo rules, network policy, and key lifecycle controls.

Verify each host key through a trusted channel before adding it to `known_hosts`. `ssh-keyscan` can collect a key, but it does not authenticate the server on its own. Comparing the fingerprint with a value from the provisioning system, console, or another trusted source is the security step.

Test the exact user and route manually:

```bash
ssh automation@web-01.prod.example.com
```

If production requires a bastion, express it in controlled OpenSSH configuration:

```sshconfig
Host *.prod.example.com
    User automation
    IdentityFile ~/.ssh/ansible-production
    IdentitiesOnly yes
    ProxyJump bastion.prod.example.com
```

Do not set `host_key_checking = False` to make onboarding easier. It removes an important defense against connecting to an impersonated host.

## Test Connectivity in Layers

Start with a read-only OpenSSH check, then use Ansible:

```bash
ansible all --list-hosts

ansible all \
  --module-name ansible.builtin.ping \
  --one-line
```

`ansible.builtin.ping` is not an ICMP ping. It logs in, runs a small Python module, and verifies a usable response. Its success proves the SSH and Python module path, but it does not prove sudo works.

Test privilege escalation without changing state:

```bash
ansible webservers \
  --become \
  --module-name ansible.builtin.command \
  --args "id -u" \
  --one-line
```

The expected output is `0` when the account can become root. If sudo requires a password, use `--ask-become-pass` for an interactive run or a protected credential flow in automation. Never pass a password directly on a shared command line.

If the host has no Python, inspect it with `raw` and disable fact gathering in the bootstrap play:

```bash
ansible web-01 \
  --module-name ansible.builtin.raw \
  --args "command -v python3 || true"
```

Install Python through the target's supported bootstrap method, then return to normal idempotent modules.

## Write a Small Idempotent Playbook

Create `playbooks/production-baseline.yml`:

```yaml
---
- name: Apply the production automation marker
  hosts: production
  gather_facts: true
  become: true
  serial: 1
  any_errors_fatal: true

  pre_tasks:
    - name: Verify the target is classified as production
      ansible.builtin.assert:
        that:
          - "'production' in group_names"
          - ansible_facts['system'] in ['Linux', 'FreeBSD']
        fail_msg: "Host classification or operating system is unexpected."

  tasks:
    - name: Create the platform configuration directory
      ansible.builtin.file:
        path: /etc/contoso-platform
        state: directory
        owner: root
        group: root
        mode: "0755"

    - name: Record that the node is managed by Ansible
      ansible.builtin.copy:
        dest: /etc/contoso-platform/managed-by-ansible
        owner: root
        group: root
        mode: "0644"
        content: |
          Managed by Ansible.
          Inventory host: {{ inventory_hostname }}
```

This example makes a deliberately small change and uses modules that describe desired state. Replace it with a reviewed organizational baseline. The `serial: 1` setting makes the first rollout one host at a time, and `any_errors_fatal: true` stops the play across the batch after a fatal failure.

Quoting `"0755"` and `"0644"` prevents YAML from interpreting modes unexpectedly.

## Prove Selection Before Proving Change

Run local checks:

```bash
ansible-playbook \
  playbooks/production-baseline.yml \
  --syntax-check

ansible-playbook \
  playbooks/production-baseline.yml \
  --list-hosts

ansible-playbook \
  playbooks/production-baseline.yml \
  --list-tasks
```

Syntax checking cannot validate remote package state, permissions, runtime variables, or every Jinja expression. Follow with check mode on one canary:

```bash
ansible-playbook \
  playbooks/production-baseline.yml \
  --check \
  --diff \
  --limit web-01
```

Check mode is a simulation and module support varies. Review each task's check-mode support. Never treat a clean check-mode run as proof that the live command must succeed.

Execute the canary:

```bash
ansible-playbook \
  playbooks/production-baseline.yml \
  --limit web-01
```

Verify the resulting file and application health outside Ansible. Then run the whole explicitly selected group:

```bash
ansible-playbook playbooks/production-baseline.yml
```

Run it a second time. An idempotent baseline should report no change on the second run unless a dynamic value or external system legitimately changes.

## Preserve Evidence and a Rollback Path

Before the run, record:

- Git commit of the playbook and inventory.
- `ansible-core` and collection versions.
- Active configuration file.
- Exact inventory source and limit.
- Change ticket or approval.
- Canary host and expected health checks.

After the run, retain the structured job result according to policy. Do not log vaulted values, passwords, private keys, or module arguments that contain secrets. If a task handles a secret, use `no_log: true` carefully and still design the task so secret values do not appear in command strings.

Rollback should restore application state, not merely run the previous playbook. For file changes, preserve a tested prior template or package version. For a failed first run, `serial`, a canary, and small scope are more reliable risk controls than a theoretical universal undo command.

## First-Run Checklist

- Pin and record Ansible and collection versions.
- Commit a project-level `ansible.cfg`.
- Verify the active config with `ansible --version`.
- Parse inventory with `ansible-inventory`.
- Verify SSH host keys through a trusted source.
- Test manual SSH, module execution, and sudo separately.
- Keep secrets out of inventory and source control.
- Use fully qualified collection names in playbooks.
- Run syntax, host, and task listings.
- Use check mode while understanding its limits.
- Run one canary, verify health, then expand.
- Run again to check idempotence.
- Preserve the commit, versions, selection, and result.

The first production run should feel uneventful. That happens when target selection, connection trust, privileges, and the intended state are all visible before Ansible changes a host.

## Official Documentation

- [Start automating with Ansible](https://docs.ansible.com/projects/ansible/latest/getting_started/get_started_ansible.html)
- [How to build an inventory](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html)
- [Connection methods and details](https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html)
- [Configuring Ansible](https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_configuration.html)
- [Creating a playbook](https://docs.ansible.com/projects/ansible/latest/getting_started/get_started_playbook.html)
- [Validating Ansible playbooks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html)
