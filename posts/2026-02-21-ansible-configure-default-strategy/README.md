# How to Configure the Default Strategy in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Strategy Plugins, Configuration, Execution

Description: Configure the default execution strategy in Ansible at the global, playbook, and play level to control how tasks run across your inventory hosts.

---

Ansible's strategy setting controls the fundamental execution model for your playbooks. While most people leave it at the default `linear` strategy and never think about it, there are situations where changing the default makes sense. This guide covers all the ways to configure the strategy and when each approach is appropriate.

## Strategy Configuration Levels

You can set the strategy at three levels, from broadest to most specific:

1. Global default in `ansible.cfg`
2. Per-playbook using an environment variable
3. Per-play within the playbook YAML

The most specific setting wins. A per-play strategy overrides the global default.

## Global Default in ansible.cfg

Set the default strategy for all playbooks:

```ini
# ansible.cfg - Set the global default strategy
[defaults]
strategy = linear
```

The available built-in strategies are:

- `linear` - run each task on all hosts before the next task (default)
- `free` - let each host proceed through tasks independently
- `host_pinned` - like free, but each worker stays with one host
- `debug` - interactive debugger on failure

## Per-Playbook via Environment Variable

Override the strategy for a single playbook run:

```bash
# Run with the free strategy just this time
ANSIBLE_STRATEGY=free ansible-playbook site.yml

# Run with debug strategy for troubleshooting
ANSIBLE_STRATEGY=debug ansible-playbook site.yml
```

This is useful when you want to try a different strategy without modifying any files.

## Per-Play Configuration

Set the strategy directly in your playbook:

```yaml
# multi-strategy.yml - Different strategies for different plays
---
# This play uses linear (synchronized execution)
- name: Initial setup
  hosts: all
  strategy: linear

  tasks:
    - name: Update package cache
      apt:
        update_cache: true
      when: ansible_os_family == 'Debian'

# This play uses free (each host proceeds independently)
- name: Install packages
  hosts: all
  strategy: free

  tasks:
    - name: Install common packages
      apt:
        name:
          - htop
          - vim
          - curl
        state: present

# This play uses host_pinned (complete all tasks per host)
- name: Deploy application
  hosts: webservers
  strategy: host_pinned

  tasks:
    - name: Stop service
      service:
        name: myapp
        state: stopped

    - name: Deploy new version
      copy:
        src: myapp.tar.gz
        dest: /opt/myapp/

    - name: Start service
      service:
        name: myapp
        state: started
```

## Strategy Configuration for Different Environments

Use different strategies based on the environment:

```bash
#!/bin/bash
# deploy.sh - Choose strategy by environment
ENV=$1

case $ENV in
    development)
        # Free strategy for speed in dev
        STRATEGY=free
        ;;
    staging)
        # Linear for predictable staging runs
        STRATEGY=linear
        ;;
    production)
        # Linear with serial for production safety
        STRATEGY=linear
        ;;
esac

ANSIBLE_STRATEGY=$STRATEGY ansible-playbook -i "inventory/$ENV" deploy.yml
```

## Verifying the Active Strategy

Check which strategy is being used:

```bash
# Show current strategy configuration
ansible-config dump | grep STRATEGY

# Show all strategy-related settings
ansible-config list | grep -A 5 strategy
```

In verbose mode, Ansible logs the strategy being used:

```bash
# See strategy information in verbose output
ansible-playbook site.yml -vvv 2>&1 | grep -i strategy
```

## Strategy Plugin Path

If you have custom strategy plugins, tell Ansible where to find them:

```ini
# ansible.cfg - Custom strategy plugin path
[defaults]
strategy_plugins = ./strategy_plugins:/opt/ansible/strategy_plugins
strategy = my_custom_strategy
```

Ansible searches for strategy plugins in this order:

1. Paths listed in `strategy_plugins` setting
2. `strategy_plugins/` directory in the playbook directory
3. `~/.ansible/plugins/strategy/`
4. Built-in Ansible strategy plugins

## Common Configuration Patterns

### Fast Configuration Management

For playbooks that just apply configurations without dependencies between tasks:

```ini
# ansible.cfg - Optimized for fast configuration
[defaults]
strategy = free
forks = 20
```

### Safe Production Deployments

For production deployments where predictability matters:

```yaml
# production-deploy.yml
---
- name: Production deployment
  hosts: webservers
  strategy: linear
  serial: "25%"
  max_fail_percentage: 10

  tasks:
    - name: Deploy application
      include_role:
        name: deploy
```

### Development and Testing

For development where you want fast feedback:

```ini
# ansible.cfg (in your dev project)
[defaults]
strategy = free
forks = 10
gathering = smart
```

### Debugging Issues

Temporarily switch to debug strategy:

```bash
# Quick debug run
ANSIBLE_STRATEGY=debug ansible-playbook problematic-playbook.yml
```

## Strategy Interactions with Other Settings

The strategy interacts with several other settings:

**serial**: Works with all strategies. Splits hosts into batches.

```yaml
- hosts: all
  strategy: linear
  serial: 5  # Process 5 hosts at a time through all tasks
```

**forks**: Limits parallelism within the strategy.

```ini
[defaults]
strategy = free
forks = 10  # Max 10 concurrent operations
```

**order**: Controls host ordering within the strategy.

```yaml
- hosts: all
  strategy: linear
  order: sorted  # Process hosts in alphabetical order
```

**throttle**: Per-task concurrency limit, works with all strategies.

```yaml
- name: Rate-limited task
  command: /opt/heavy-operation.sh
  throttle: 3  # Max 3 hosts at once, regardless of forks
```

## Troubleshooting Strategy Issues

If your playbook behaves differently than expected, check the strategy:

```bash
# Verify the strategy is set correctly
ansible-config dump --only-changed | grep -i strategy

# Check for environment variable overrides
env | grep ANSIBLE_STRATEGY

# Run with maximum verbosity to see strategy loading
ansible-playbook site.yml -vvvv 2>&1 | head -50
```

Common issues:

- An environment variable overrides your ansible.cfg setting
- A per-play strategy overrides the global default
- A custom strategy plugin has the same name as a built-in one

The strategy is a foundational configuration that affects everything about how your playbook runs. Set it deliberately based on your use case rather than just leaving the default. For most production deployments, `linear` with `serial` is the safest. For configuration management and package updates, `free` can be significantly faster.
