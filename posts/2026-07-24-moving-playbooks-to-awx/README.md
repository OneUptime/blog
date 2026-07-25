# Moving Playbooks to AWX: Inventories, Credentials, Vaults, and Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, Automation, Inventories, Credentials, Ansible Vault

Description: Move local Ansible playbooks into AWX by separating source content, inventories, credentials, vault passwords, and runtime dependencies.

---

A playbook that works on a laptop depends on more than its YAML. It may read `~/.ssh/config`, use an SSH agent, load an inventory from a relative path, decrypt Vault with a local password file, import a collection installed in the user's home directory, or call a Python library that happens to be installed.

AWX makes those dependencies explicit:

- A **Project** synchronizes playbook content from source control.
- An **Inventory** supplies hosts, groups, variables, and inventory sources.
- **Credentials** provide machine, source-control, cloud, Vault, and other secrets.
- A **Job Template** combines project, playbook, inventory, credentials, execution environment, and launch options.
- An **Execution Environment** contains `ansible-core`, collections, Python packages, and system tools.

The migration succeeds when every local dependency has one deliberate AWX home.

## Inventory the Local Runtime First

Capture what the successful local run actually uses:

```bash
ansible --version
ansible-config dump --only-changed
ansible-galaxy collection list
ansible-inventory -i inventories/production --graph
ansible-playbook -i inventories/production site.yml --list-hosts
```

Review:

- selected `ansible.cfg`
- inventory sources and plugins
- roles and collections
- Python and system dependencies
- environment variables
- SSH user, key, port, and jump-host settings
- become method and password
- Vault IDs and password sources
- files read outside the repository
- commands delegated to `localhost`

In AWX, `localhost` is the job's execution environment, not your workstation and not necessarily the AWX control-plane container. A delegated command that relies on a laptop binary or file must move into the execution environment or be redesigned.

## Make the Repository Self-Describing

A practical project layout is:

```text
ansible-project/
  ansible.cfg
  collections/
    requirements.yml
  site.yml
  roles/
    myapp/
      defaults/main.yml
      handlers/main.yml
      tasks/main.yml
      templates/
  inventories/
    production/
      hosts.yml
      group_vars/
      host_vars/
  README.md
```

AWX discovers playbooks beneath the Project base path for selection in a Job Template. Keep paths repository-relative:

```yaml
- name: Import application role
  hosts: app
  roles:
    - role: myapp
```

Avoid:

```yaml
vars_files:
  - /home/alice/private/production.yml
```

Do not commit SSH keys, cloud keys, Vault password files, or plaintext secrets to make the repository “portable.” Portability comes from explicit AWX credentials and runtime dependencies.

AWX project updates can install collections listed in `collections/requirements.yml`:

```yaml
---
collections:
  - name: ansible.posix
    version: ">=2.1.0,<3.0.0"
  - name: community.postgresql
    version: ">=4.1.0,<5.0.0"
```

Pin compatible ranges or exact versions and test updates. For reproducibility and additional Python or system requirements, build an execution environment rather than downloading unbounded content during every job.

## Create the AWX Project

Create a Source Control credential for a private Git repository. AWX supports a username/password or token, SSH private key, and key passphrase for SCM authentication. This credential is for cloning the Project, not for connecting to managed nodes.

Create the Project with:

- source control type
- repository URL
- source control credential when required
- branch, tag, or commit policy
- optional update-on-launch behavior

Sync it and inspect the update job before creating a Job Template. A Project update must resolve:

- repository authentication
- requested revision
- submodules, if used
- role and collection requirements
- certificate trust

For production, decide whether jobs follow a mutable branch, a release tag, or an immutable commit. “Update on launch” improves freshness but can also make an unreviewed upstream change enter the next job immediately.

## Choose the AWX Inventory Model

An AWX Inventory is the host set selected by a Job Template. It is distinct from the Project even when inventory files live in the same Git repository.

Choose one of three common models.

### Manual Inventory

Create hosts, groups, and variables through AWX. This is simple for a small stable fleet but can duplicate an existing source of truth.

### Dynamic Inventory Source

Configure an inventory source for AWS, Azure, Google Cloud, VMware, OpenStack, or another supported inventory plugin. Attach the appropriate cloud credential and test the source update independently.

Use plugin variables for grouping and hostname selection. Enable update-on-launch only after measuring refresh time and API rate limits.

### Inventory Sourced from a Project

AWX can read a flat inventory file, directory, or script from a synchronized Project. A source-controlled inventory keeps `group_vars` and `host_vars` with review history:

```text
inventories/production/
  hosts.yml
  group_vars/
    all.yml
    app.yml
  host_vars/
    app-01.yml
```

Create a standard AWX Inventory, add a source of “Sourced from a Project,” select the Project and inventory path, then sync the source. Files synchronized this way are updated from source control and are not edited as the authoritative source in AWX.

Do not pass `-i` inside a playbook. The Job Template supplies the selected AWX inventory to Ansible Runner.

## Map Credentials by Purpose

Do not create one “everything” credential. Map each local secret to the AWX credential type that consumes it.

### Machine Credential

A Machine credential supplies SSH or WinRM authentication and can include privilege-escalation details. It replaces local private keys, SSH-agent state, and interactive become prompts.

Inventory still defines non-secret connection behavior when needed:

```yaml
ansible_user: ansible_deploy
ansible_port: 22
ansible_ssh_common_args: -o ProxyJump=bastion.example.com
```

Avoid duplicating usernames or passwords across AWX credentials and inventory without understanding which source wins.

### Source Control Credential

This credential is attached to the Project and used only for repository synchronization. It cannot be prompted on launch.

### Cloud or External Credentials

Attach cloud credentials to inventory sources or Job Templates as required. AWX injects supported credential fields into the job environment or files in the format expected by Ansible content.

For a custom service, define a custom credential type with carefully scoped inputs and injectors. Keep the secret out of `extra_vars`.

## Handle Ansible Vault Correctly

An AWX Vault credential stores the Vault password and an optional Vault Identifier. It does not replace the encrypted file. Keep Vault-encrypted variables or files in the Project or synchronized inventory:

```yaml
# inventories/production/group_vars/all/vault.yml
vault_database_password: !vault |
  $ANSIBLE_VAULT;1.2;AES256;production
  ...
```

Create an AWX Vault credential with identifier `production` and attach it to the Job Template. For content encrypted with multiple Vault IDs, attach the matching Vault credentials.

Keep the identifier aligned with the label used during variable encryption. This command prompts for the value and emits the `!vault` YAML to place in the variables file:

```bash
ansible-vault encrypt_string \
  --vault-id production@prompt \
  --stdin-name vault_database_password
```

AWX supplies the decryption password at job time. Vault still protects data at rest only. Use `no_log: true` and `diff: false` for tasks that consume the decrypted value.

Do not store a local vault-password client script in the Project unless AWX is intentionally designed to run it and its own authentication dependency is available in the execution environment. In many cases, an AWX Vault credential or external-secret credential is clearer.

## Build the Execution Environment

The Project contains Ansible content. The execution environment supplies runtime software:

```yaml
# execution-environment.yml
---
version: 3

dependencies:
  galaxy: collections/requirements.yml
  python: requirements.txt
  system: bindep.txt
```

Example Python dependencies:

```text
psycopg[binary]
hvac
```

Example system dependencies:

```text
git [platform:rpm]
openssh-clients [platform:rpm]
```

Build and publish the image with Ansible Builder, register it in AWX, and select it on the Job Template. Pin the image by immutable digest or controlled tag.

Test controller-side lookups and delegated commands inside that image. Installing a Python library on a managed host does not satisfy a lookup plugin that executes in the controller.

## Create a Job Template

Select:

- Inventory
- Project
- Execution Environment
- playbook path
- Machine and Vault credentials
- job type, normally Run or Check
- verbosity
- limit, tags, and extra variables when appropriate

AWX allows some fields to be prompted on launch. Treat prompts as an interface:

- use a survey for validated, non-secret business input
- use credential prompts for supported secret types
- restrict branch override in production
- do not expose an unrestricted Limit or Extra Variables field to users who should not retarget the play

Extra variables have high Ansible precedence. A launch-time value can override repository and inventory configuration, so use role argument validation and RBAC.

## Migrate in Stages

Use a low-risk sequence:

1. Sync the Project.
2. Sync or create the Inventory and inspect its hosts.
3. Create credentials with minimum required access.
4. Run `--list-hosts` or an AWX Check job against a test group.
5. Run a read-only diagnostic play.
6. Run the real play against one disposable or staging host.
7. Compare local and AWX variables, module versions, and results.
8. Expand the limit gradually.

For diagnosis, increase Job Template verbosity and inspect Project-update and inventory-update jobs separately. A failed inventory sync is not a playbook failure, and an execution-environment import error is not an SSH failure.

## Common Migration Failures

### Playbook Is Missing from the Selector

Confirm the file is valid YAML under the Project base path and the latest Project sync contains it.

### Role or Collection Is Not Found

Declare requirements, fix repository-relative paths, and rebuild the execution environment if the dependency has Python or system requirements.

### SSH Works Locally but AWX Is Unreachable

The AWX execution node lacks your agent, `~/.ssh/config`, known-hosts state, route, or bastion configuration. Reproduce from the execution environment and map settings to Machine credential and inventory variables.

### Vault Decryption Fails

Check that the Job Template has a Vault credential, the identifier matches the encrypted label, and all required Vault IDs are attached.

### Delegated localhost Task Fails

Install its binary and Python library in the execution environment or replace it with a module/API call. Do not assume access to files on the AWX control plane.

### Variables Differ

Export effective inventory locally and inspect AWX host, group, inventory, survey, and extra variables. Remember that launch-time extra vars can override many other sources.

## Treat AWX Objects as Deployable Configuration

After the first migration, manage AWX objects through the `awx.awx` collection or another supported configuration-as-code workflow. Version:

- organizations and teams
- inventories and sources
- projects
- execution environments
- credential references, not secret values
- job templates and workflows
- schedules and notifications

This makes a second AWX installation recoverable and keeps UI drift visible. Secret material still belongs in AWX's encrypted credential store or an integrated external manager.

## Official Documentation

- [AWX Projects](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/projects.html)
- [AWX Inventories](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/inventories.html)
- [AWX Credentials](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html)
- [AWX Job Templates](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html)
- [AWX inventory files from source control](https://docs.ansible.com/projects/awx/en/24.6.1/administration/scm-inv-source.html)
- [Ansible Builder execution environments](https://docs.ansible.com/projects/builder/en/latest/)
