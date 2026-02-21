# How to Configure ansible.cfg for Your Project

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration, DevOps, Automation

Description: A practical guide to configuring ansible.cfg for your project with explanations of the most important settings and real-world examples.

---

Every Ansible project benefits from a well-tuned `ansible.cfg` file. This is the main configuration file that controls how Ansible behaves, from SSH connection settings to output formatting. While Ansible works with sensible defaults, customizing ansible.cfg for your specific project makes your playbooks faster, your output cleaner, and your team's workflow more consistent.

## Where to Put ansible.cfg

Ansible looks for its configuration file in a specific order. The first match wins:

1. `ANSIBLE_CONFIG` environment variable (path to a config file)
2. `ansible.cfg` in the current working directory
3. `~/.ansible.cfg` in the home directory
4. `/etc/ansible/ansible.cfg` (global default)

For project-specific configurations, place the file in your project's root directory. This way, whenever you `cd` into the project and run a playbook, Ansible picks up the right settings automatically.

```bash
# Create a project directory with ansible.cfg
mkdir -p ~/projects/web-infrastructure
cd ~/projects/web-infrastructure
touch ansible.cfg inventory.ini
```

## The Basic Structure

The ansible.cfg file uses INI format with sections in square brackets. Here is a well-commented starter configuration that covers the most common settings:

```ini
# ansible.cfg - Project-level Ansible configuration

[defaults]
# Path to the inventory file (relative to this config file)
inventory = inventory/

# Default remote user for SSH connections
remote_user = deploy

# Number of parallel processes (default is 5, increase for larger fleets)
forks = 20

# Disable host key checking for lab environments
# Set to True for production
host_key_checking = False

# Don't create .retry files on playbook failure
retry_files_enabled = False

# Use YAML output for better readability
stdout_callback = yaml

# Timeout for SSH connections in seconds
timeout = 30

# Gather only a subset of facts by default (faster)
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 3600

# Roles path
roles_path = roles:~/.ansible/roles:/usr/share/ansible/roles

# Collections path
collections_path = collections:~/.ansible/collections

# Show execution time per task
callback_whitelist = timer, profile_tasks

# Vault password file (avoid typing it every time)
# vault_password_file = .vault_pass

[privilege_escalation]
# Default privilege escalation settings
become = True
become_method = sudo
become_user = root
become_ask_pass = False

[ssh_connection]
# Enable SSH pipelining for better performance
pipelining = True

# SSH arguments for connection reuse
ssh_args = -o ControlMaster=auto -o ControlPersist=300s -o PreferredAuthentications=publickey

# SCP is more reliable than SFTP on some systems
transfer_method = smart

[diff]
# Always show diffs when files change
always = True
context = 3
```

Let me break down the most important sections.

## The [defaults] Section

This is where most of your configuration lives.

### inventory

Instead of passing `-i inventory.ini` every time you run a playbook, set it here. You can point to a file or a directory containing multiple inventory files:

```ini
# Single inventory file
inventory = inventory.ini

# Directory of inventory files (Ansible reads all files in it)
inventory = inventory/
```

If you use a directory, Ansible will merge all inventory files in that directory. This is useful for separating static and dynamic inventories.

### forks

This controls how many hosts Ansible manages in parallel. The default of 5 is conservative. If you manage 50+ hosts, bump this up:

```ini
# 20 is a good starting point for medium-sized fleets
forks = 20
```

Be careful not to set this too high or you will overwhelm your control node's CPU and memory. A good rule of thumb is to match it to the number of CPU cores on your control node, multiplied by 2-4.

### gathering and fact_caching

Fact gathering is one of the most time-consuming parts of a playbook run. By default, Ansible gathers facts at the start of every play. The `smart` gathering mode caches facts and only re-gathers them when the cache expires:

```ini
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 3600
```

This can cut playbook run times significantly, especially when you run playbooks frequently against the same hosts.

### stdout_callback

The default output is hard to read. Switching to the `yaml` callback makes outputs much cleaner:

```ini
stdout_callback = yaml
```

Compare the default output:

```
TASK [Show hostname] ****
ok: [web01] => {"msg": "web01.example.com"}
```

With the YAML callback:

```
TASK [Show hostname] ****
ok: [web01] =>
  msg: web01.example.com
```

### callback_whitelist

Enable additional callback plugins to get execution timing information:

```ini
callback_whitelist = timer, profile_tasks
```

The `timer` callback shows total playbook execution time. The `profile_tasks` callback shows how long each task took, which is invaluable for finding bottlenecks.

## The [privilege_escalation] Section

These settings control how Ansible elevates privileges on managed hosts:

```ini
[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False
```

Setting `become = True` here means all tasks will run with sudo by default. You can override this on a per-task or per-play basis in your playbooks:

```yaml
# Override the default become setting for a specific task
- name: Run as a regular user
  ansible.builtin.command: whoami
  become: false
```

## The [ssh_connection] Section

SSH is the transport layer for Ansible, so tuning these settings has a direct impact on performance.

### pipelining

This is probably the single biggest performance improvement you can make:

```ini
pipelining = True
```

With pipelining enabled, Ansible sends the module code and arguments in one SSH session instead of multiple. This can reduce playbook execution time by 30-50%. The only requirement is that `requiretty` must be disabled in sudoers on the managed hosts (which it is by default on most modern distributions).

### ssh_args

Control Master and Control Persist keep SSH connections open and reuse them:

```ini
ssh_args = -o ControlMaster=auto -o ControlPersist=300s -o PreferredAuthentications=publickey
```

`ControlPersist=300s` keeps the connection alive for 5 minutes after the last use. This speeds up consecutive task execution because Ansible does not need to re-establish SSH connections.

## The [diff] Section

Enable diff output to see exactly what changed in files:

```ini
[diff]
always = True
context = 3
```

This is useful during development and testing. When a template or configuration file changes, Ansible shows you the diff in the output. You might want to disable this in production CI/CD pipelines to keep logs clean.

## Environment-Specific Overrides

You can maintain a base ansible.cfg and override specific settings per environment using environment variables:

```bash
# Override the inventory for a specific run
ANSIBLE_INVENTORY=production.ini ansible-playbook deploy.yml

# Increase verbosity without editing the config
ANSIBLE_VERBOSITY=2 ansible-playbook deploy.yml

# Disable become for a specific run
ANSIBLE_BECOME=False ansible-playbook debug.yml
```

Every ansible.cfg setting has a corresponding environment variable. The naming convention is `ANSIBLE_` followed by the setting name in uppercase. For settings in non-default sections, it is `ANSIBLE_SECTION_SETTING`.

## Security Considerations

If you commit ansible.cfg to a Git repository (which you should), make sure it does not contain sensitive information. The `vault_password_file` setting should point to a file that is in your `.gitignore`:

```bash
# .gitignore
.vault_pass
*.retry
/tmp/
```

Also, setting `host_key_checking = False` is convenient for development but should be set to `True` in production to protect against man-in-the-middle attacks.

## Validating Your Configuration

Check which configuration file Ansible is using and what settings are active:

```bash
# Show the current configuration
ansible-config dump --only-changed

# Show where the config file is loaded from
ansible --version | head -2
```

The `ansible-config dump --only-changed` command is especially useful because it shows only the settings you have customized, making it easy to audit your configuration.

## Summary

A well-configured ansible.cfg is the foundation of any Ansible project. Start with the template above, adjust the forks and timeout values for your environment, enable pipelining for performance, and use YAML output for readability. Keep the file in your project root and commit it to version control so every team member works with the same settings.
