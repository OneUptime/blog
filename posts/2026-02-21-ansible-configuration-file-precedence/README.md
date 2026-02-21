# How to Set Up Ansible Configuration File Precedence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration, DevOps, Best Practices

Description: Understand Ansible configuration file precedence and learn how to structure configs across global, user, project, and environment variable levels.

---

Ansible reads its configuration from multiple sources, and understanding which one takes priority over the others is important for avoiding unexpected behavior. I have seen teams waste hours debugging playbooks only to discover that a global ansible.cfg was overriding their project-level settings. This guide explains the full precedence order, shows you how to verify which configuration is active, and gives you practical strategies for managing configurations across different environments.

## The Precedence Order

Ansible checks for configuration in the following order. The first source it finds wins, and it stops looking further:

1. **ANSIBLE_CONFIG** environment variable (highest priority)
2. **ansible.cfg** in the current working directory
3. **~/.ansible.cfg** in the user's home directory
4. **/etc/ansible/ansible.cfg** global system default (lowest priority)

Here is a visual representation of this precedence:

```mermaid
flowchart TD
    A[ANSIBLE_CONFIG env var] -->|Not set?| B[./ansible.cfg in current dir]
    B -->|Not found?| C[~/.ansible.cfg in home dir]
    C -->|Not found?| D[/etc/ansible/ansible.cfg]
    A -->|Set| E[Use this config]
    B -->|Found| E
    C -->|Found| E
    D -->|Found or not| E
    E --> F[Ansible runs with these settings]
```

The key thing to remember is that Ansible uses **one** configuration file, not a merge of all of them. If it finds `ansible.cfg` in your current directory, it ignores `~/.ansible.cfg` and `/etc/ansible/ansible.cfg` entirely.

## Level 1: System-Wide Configuration (/etc/ansible/ansible.cfg)

This file sets defaults for every user on the system. It is created automatically when you install Ansible from a package manager.

```ini
# /etc/ansible/ansible.cfg
# System-wide defaults - applies to all users unless overridden
[defaults]
remote_user = ansible
forks = 5
timeout = 10
host_key_checking = True
log_path = /var/log/ansible.log

[privilege_escalation]
become = False
become_method = sudo
```

Use this level for organization-wide security policies, like enforcing host key checking or setting a standard log path. Since this has the lowest priority, any user can override these settings with a local config.

## Level 2: User-Level Configuration (~/.ansible.cfg)

This file applies to a specific user across all their projects. It is useful for personal preferences that you want everywhere.

```ini
# ~/.ansible.cfg
# User-level settings - personal preferences
[defaults]
remote_user = myuser
stdout_callback = yaml
retry_files_enabled = False
interpreter_python = auto_silent

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=600s
```

Things like your preferred output format, SSH tuning, and Python interpreter settings are good candidates for this level. These are personal workflow preferences that do not vary between projects.

## Level 3: Project-Level Configuration (./ansible.cfg)

This is the most commonly used level. Place an ansible.cfg file in the root of your project directory, and it will be used whenever you run Ansible from that directory.

```ini
# ~/projects/web-platform/ansible.cfg
# Project-specific settings
[defaults]
inventory = inventory/production.ini
roles_path = roles
collections_path = collections
vault_password_file = .vault_pass
forks = 25
gathering = smart
fact_caching = jsonfile
fact_caching_connection = .cache/facts
fact_caching_timeout = 1800
callback_whitelist = timer, profile_tasks

[privilege_escalation]
become = True
become_method = sudo
become_user = root
```

This level should contain settings that are specific to the project and should be shared with the team via version control. The inventory path, roles path, vault password file location, and privilege escalation settings are all project-specific.

## Level 4: Environment Variable Override (ANSIBLE_CONFIG)

This has the highest priority and is extremely useful for CI/CD pipelines and testing.

```bash
# Point Ansible to a specific configuration file
export ANSIBLE_CONFIG=/opt/ansible/configs/ci-pipeline.cfg
ansible-playbook deploy.yml
```

Or use it inline for a single command:

```bash
# Use a staging-specific config for one run
ANSIBLE_CONFIG=configs/staging.cfg ansible-playbook deploy.yml
```

This is the most flexible level because you can switch configurations without changing directories or modifying files.

## Individual Setting Overrides with Environment Variables

Beyond the ANSIBLE_CONFIG variable that selects the entire config file, every individual Ansible setting can be overridden with its own environment variable. These override the value from whatever config file is active:

```bash
# Override individual settings regardless of which config file is loaded
export ANSIBLE_FORKS=50
export ANSIBLE_REMOTE_USER=admin
export ANSIBLE_HOST_KEY_CHECKING=False
export ANSIBLE_STDOUT_CALLBACK=json
export ANSIBLE_PIPELINING=True
```

The naming pattern is `ANSIBLE_` plus the setting name in uppercase. For settings in specific sections, the section name is included, like `ANSIBLE_SSH_ARGS` for `ssh_args` in the `[ssh_connection]` section.

## How to Check Which Config is Active

Always verify which configuration Ansible is actually using. This is the first thing to check when debugging unexpected behavior.

```bash
# Show which config file is loaded and the Python version
ansible --version
```

The output includes a line like:

```
config file = /home/user/projects/web-platform/ansible.cfg
```

To see all settings and their sources:

```bash
# Show all configuration settings with their current values
ansible-config dump

# Show only settings that differ from the defaults
ansible-config dump --only-changed

# Show settings and where each value came from
ansible-config dump --only-changed -v
```

The verbose flag (`-v`) is especially useful because it tells you whether each setting came from the config file, an environment variable, or the default.

## A Practical Multi-Environment Strategy

Here is a pattern I use for managing configurations across development, staging, and production environments. Keep a base configuration in the project root and environment-specific configs in a subdirectory:

```
my-project/
  ansible.cfg              # Base config (used by default)
  configs/
    development.cfg        # Dev overrides
    staging.cfg            # Staging overrides
    production.cfg         # Production overrides
  inventory/
    development.ini
    staging.ini
    production.ini
  playbooks/
    deploy.yml
    configure.yml
```

The base ansible.cfg contains shared settings:

```ini
# ansible.cfg (base)
[defaults]
roles_path = roles
collections_path = collections
stdout_callback = yaml
retry_files_enabled = False

[ssh_connection]
pipelining = True
```

Environment-specific configs override the inventory and security settings:

```ini
# configs/production.cfg
[defaults]
inventory = inventory/production.ini
forks = 30
host_key_checking = True
vault_password_file = .vault_pass_prod
log_path = /var/log/ansible/production.log

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=300s
```

Use them like this:

```bash
# Development (uses default ansible.cfg)
ansible-playbook playbooks/deploy.yml

# Staging
ANSIBLE_CONFIG=configs/staging.cfg ansible-playbook playbooks/deploy.yml

# Production
ANSIBLE_CONFIG=configs/production.cfg ansible-playbook playbooks/deploy.yml
```

## Makefile or Shell Scripts for Convenience

Wrap these commands in a Makefile to save typing:

```makefile
# Makefile
.PHONY: deploy-dev deploy-staging deploy-prod

deploy-dev:
	ansible-playbook playbooks/deploy.yml

deploy-staging:
	ANSIBLE_CONFIG=configs/staging.cfg ansible-playbook playbooks/deploy.yml

deploy-prod:
	ANSIBLE_CONFIG=configs/production.cfg ansible-playbook playbooks/deploy.yml
```

## Security Note

If you are working in a shared directory (like /tmp or a shared mount), Ansible will refuse to load an ansible.cfg file from the current directory for security reasons. This is because someone could plant a malicious config file in a shared location. If you encounter this, set the `ANSIBLE_CONFIG` environment variable explicitly or move your project to a directory owned by your user.

## Summary

Understanding Ansible's configuration precedence saves you from debugging headaches. The environment variable has the highest priority, followed by the current directory config, then the home directory config, and finally the system-wide config. Use project-level configs for team-shared settings, user-level configs for personal preferences, and environment variables for CI/CD pipelines. Always run `ansible-config dump --only-changed` to verify which settings are active before running important playbooks.
