# How to Set Up Multiple Ansible Configuration Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration, DevOps, Best Practices

Description: Manage multiple Ansible configuration files for different environments, projects, and teams using practical organizational strategies.

---

As your Ansible usage grows, a single ansible.cfg file is rarely enough. Development, staging, and production environments have different requirements. Different teams might need different default settings. CI/CD pipelines need their own configurations. This guide shows you how to organize and manage multiple Ansible configuration files effectively.

## When You Need Multiple Config Files

Here are common reasons to maintain more than one ansible.cfg:

- **Environment separation**: Development uses `host_key_checking = False`, production requires it to be `True`
- **Different inventories**: Each environment points to different hosts
- **Performance tuning**: Dev might use 5 forks, production uses 50
- **Logging requirements**: Production needs detailed logging, dev does not
- **Security policies**: Production uses stricter SSH settings
- **Team preferences**: Infrastructure team and application team have different defaults

## Strategy 1: Directory-Based Configuration

The simplest approach is to have separate project directories, each with its own ansible.cfg. Ansible reads the config from the current working directory.

```
ansible-projects/
  development/
    ansible.cfg
    inventory.ini
    playbooks/
  staging/
    ansible.cfg
    inventory.ini
    playbooks/
  production/
    ansible.cfg
    inventory.ini
    playbooks/
```

Each ansible.cfg is tailored to its environment:

```ini
# development/ansible.cfg
[defaults]
inventory = inventory.ini
host_key_checking = False
forks = 5
retry_files_enabled = False
stdout_callback = yaml
gathering = implicit

[privilege_escalation]
become = True
become_ask_pass = False
```

```ini
# staging/ansible.cfg
[defaults]
inventory = inventory.ini
host_key_checking = True
forks = 15
retry_files_enabled = False
stdout_callback = yaml
log_path = /var/log/ansible/staging.log
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_staging_facts

[privilege_escalation]
become = True
become_ask_pass = False

[ssh_connection]
pipelining = True
```

```ini
# production/ansible.cfg
[defaults]
inventory = inventory.ini
host_key_checking = True
forks = 30
retry_files_enabled = False
stdout_callback = yaml
log_path = /var/log/ansible/production.log
vault_password_file = .vault_pass
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_prod_facts
fact_caching_timeout = 1800
callback_whitelist = timer, profile_tasks, log_plays

[privilege_escalation]
become = True
become_ask_pass = False

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=600s -o PreferredAuthentications=publickey
```

Switch between environments by changing directories:

```bash
# Work in development
cd ~/ansible-projects/development
ansible-playbook playbooks/deploy.yml

# Switch to production
cd ~/ansible-projects/production
ansible-playbook playbooks/deploy.yml
```

## Strategy 2: ANSIBLE_CONFIG Environment Variable

Keep all config files in a single project and use the ANSIBLE_CONFIG environment variable to switch between them:

```
my-project/
  configs/
    dev.cfg
    staging.cfg
    production.cfg
  inventory/
    dev.ini
    staging.ini
    production.ini
  playbooks/
    deploy.yml
    configure.yml
  roles/
```

Each config references its own inventory:

```ini
# configs/dev.cfg
[defaults]
inventory = inventory/dev.ini
host_key_checking = False
forks = 5
stdout_callback = yaml
```

```ini
# configs/production.cfg
[defaults]
inventory = inventory/production.ini
host_key_checking = True
forks = 30
log_path = /var/log/ansible/production.log
vault_password_file = .vault_pass
callback_whitelist = timer, profile_tasks

[ssh_connection]
pipelining = True
```

Switch between configs using the environment variable:

```bash
# Run against development
ANSIBLE_CONFIG=configs/dev.cfg ansible-playbook playbooks/deploy.yml

# Run against production
ANSIBLE_CONFIG=configs/production.cfg ansible-playbook playbooks/deploy.yml
```

## Strategy 3: Makefile or Shell Wrappers

Simplify environment switching with a Makefile:

```makefile
# Makefile

.PHONY: deploy-dev deploy-staging deploy-prod lint

PLAYBOOK ?= playbooks/deploy.yml

deploy-dev:
	ANSIBLE_CONFIG=configs/dev.cfg ansible-playbook $(PLAYBOOK)

deploy-staging:
	ANSIBLE_CONFIG=configs/staging.cfg ansible-playbook $(PLAYBOOK)

deploy-prod:
	ANSIBLE_CONFIG=configs/production.cfg ansible-playbook $(PLAYBOOK)

lint:
	ansible-lint playbooks/ roles/

check-dev:
	ANSIBLE_CONFIG=configs/dev.cfg ansible-playbook --check --diff $(PLAYBOOK)

check-prod:
	ANSIBLE_CONFIG=configs/production.cfg ansible-playbook --check --diff $(PLAYBOOK)
```

Usage:

```bash
# Deploy to development
make deploy-dev

# Deploy to production
make deploy-prod

# Deploy a specific playbook to staging
make deploy-staging PLAYBOOK=playbooks/configure-nginx.yml

# Dry run against production
make check-prod
```

Or use a shell wrapper script:

```bash
#!/bin/bash
# run-ansible.sh

ENVIRONMENT="${1}"
shift

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <environment> <ansible-playbook args>"
    echo "Environments: dev, staging, production"
    exit 1
fi

CONFIG_FILE="configs/${ENVIRONMENT}.cfg"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file not found: $CONFIG_FILE"
    exit 1
fi

echo "Using config: $CONFIG_FILE"
ANSIBLE_CONFIG="$CONFIG_FILE" ansible-playbook "$@"
```

Usage:

```bash
# Deploy to production
./run-ansible.sh production playbooks/deploy.yml

# Deploy to dev with extra verbosity
./run-ansible.sh dev playbooks/deploy.yml -vv
```

## Strategy 4: Base Config with Environment Overrides

Use a base ansible.cfg with common settings and override environment-specific settings via environment variables:

```ini
# ansible.cfg (base configuration)
[defaults]
roles_path = roles
collections_path = collections
stdout_callback = yaml
retry_files_enabled = False

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=300s
```

Then set per-environment variables in separate files:

```bash
# env/dev.sh
export ANSIBLE_INVENTORY=inventory/dev.ini
export ANSIBLE_HOST_KEY_CHECKING=False
export ANSIBLE_FORKS=5
```

```bash
# env/production.sh
export ANSIBLE_INVENTORY=inventory/production.ini
export ANSIBLE_HOST_KEY_CHECKING=True
export ANSIBLE_FORKS=30
export ANSIBLE_LOG_PATH=/var/log/ansible/production.log
export ANSIBLE_VAULT_PASSWORD_FILE=.vault_pass
export ANSIBLE_CALLBACK_WHITELIST=timer,profile_tasks,log_plays
```

Source the environment file before running:

```bash
# Load production environment and run
source env/production.sh
ansible-playbook playbooks/deploy.yml
```

This approach has the advantage of sharing a single base config while only overriding what differs between environments.

## Strategy 5: direnv for Automatic Switching

direnv automatically loads and unloads environment variables based on the directory you are in. Create `.envrc` files in each environment directory:

```bash
# Install direnv
# Ubuntu: sudo apt install direnv
# macOS: brew install direnv

# Add to your shell profile
eval "$(direnv hook bash)"  # or zsh
```

```bash
# development/.envrc
export ANSIBLE_CONFIG=$(pwd)/ansible.cfg
export ANSIBLE_VAULT_PASSWORD_FILE=~/.vault_pass_dev
```

```bash
# production/.envrc
export ANSIBLE_CONFIG=$(pwd)/ansible.cfg
export ANSIBLE_VAULT_PASSWORD_FILE=~/.vault_pass_prod
```

Allow each directory:

```bash
cd development && direnv allow
cd ../production && direnv allow
```

Now, simply changing into a directory automatically configures the right Ansible environment.

## Validating Your Configuration

After setting up multiple configurations, verify each one:

```bash
# Check which config is active
ansible --version

# Show all settings that differ from defaults
ansible-config dump --only-changed

# Show settings with their sources (config file, env var, default)
ansible-config dump --only-changed -v
```

Run this for each environment to make sure the right settings are being applied:

```bash
# Verify development config
ANSIBLE_CONFIG=configs/dev.cfg ansible-config dump --only-changed

# Verify production config
ANSIBLE_CONFIG=configs/production.cfg ansible-config dump --only-changed
```

## Version Control Considerations

Not all config files should be committed to version control:

```gitignore
# .gitignore

# Vault password files
.vault_pass*

# Local environment overrides
env/local.sh

# Log files
logs/
*.log

# Retry files
*.retry

# Fact cache
.cache/
```

Config files that contain paths, performance tuning, and output preferences should be committed. Files containing secrets or machine-specific paths should not.

## Summary

Managing multiple Ansible configurations is about finding the right balance between shared settings and environment-specific overrides. For small teams, the ANSIBLE_CONFIG environment variable with a Makefile works great. For larger organizations, directory-based separation with direnv provides automatic switching. Whichever approach you choose, always verify your active configuration with `ansible-config dump --only-changed` before running critical playbooks, and keep sensitive settings out of version control.
