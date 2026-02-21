# How to Configure ansible-navigator Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-navigator, Configuration, DevOps

Description: Master the ansible-navigator configuration file to set defaults for execution environments, display modes, logging, and artifact management.

---

ansible-navigator has a lot of command-line flags, and typing them every time gets old fast. The solution is the `ansible-navigator.yml` (or `.ansible-navigator.yml`) configuration file, which lets you set defaults for everything from the EE image to the display mode to artifact storage. This post covers every configuration option and how to set up configs for different scenarios.

## Configuration File Locations

ansible-navigator looks for configuration files in several places, in this order of precedence:

1. `ANSIBLE_NAVIGATOR_CONFIG` environment variable (highest priority)
2. `./ansible-navigator.yml` (current directory)
3. `~/.ansible-navigator.yml` (home directory)

The current directory file takes precedence over the home directory file. This means you can have a global default config in your home directory and project-specific overrides in each project.

## Basic Configuration File

Here is a starter configuration that covers the most common settings:

```yaml
# ansible-navigator.yml - Basic configuration
---
ansible-navigator:
  # Display mode: interactive (TUI) or stdout (like ansible-playbook)
  mode: stdout

  # Execution environment settings
  execution-environment:
    image: quay.io/myorg/ansible-ee:2.1.0
    pull:
      policy: missing
    container-engine: podman

  # Playbook artifact settings
  playbook-artifact:
    enable: true
    save-as: "{playbook_dir}/artifacts/{playbook_name}-{time_stamp}.json"

  # Logging
  logging:
    level: warning
    file: /tmp/ansible-navigator.log
```

## Complete Configuration Reference

Here is a comprehensive configuration file with every option documented:

```yaml
# ansible-navigator.yml - Complete configuration reference
---
ansible-navigator:
  # ========================
  # General Settings
  # ========================

  # Default display mode
  # interactive: Opens the TUI
  # stdout: Prints output to terminal (like ansible-playbook)
  mode: stdout

  # Editor settings (used when opening files from the TUI)
  editor:
    command: vim
    console: true

  # ========================
  # Ansible Settings
  # ========================

  # Ansible configuration file path
  ansible:
    config:
      path: ./ansible.cfg
    # Command-line arguments passed to ansible-playbook
    cmdline: "--forks 10"

  # ========================
  # Execution Environment
  # ========================

  execution-environment:
    # Enable or disable EE (true/false)
    enabled: true

    # Container image to use
    image: quay.io/myorg/ansible-ee:2.1.0

    # Container engine (podman or docker)
    container-engine: podman

    # Image pull policy
    pull:
      # always: Pull every time
      # missing: Only pull if not present locally
      # never: Never pull
      # tag: Pull if the tag is 'latest'
      policy: missing

    # Additional container options
    container-options:
      - "--net=host"

    # Volume mounts
    volume-mounts:
      - src: "${HOME}/.ssh"
        dest: /home/runner/.ssh
        options: ro
      - src: /etc/resolv.conf
        dest: /etc/resolv.conf
        options: ro

    # Environment variables to pass into the container
    environment-variables:
      pass:
        - AWS_ACCESS_KEY_ID
        - AWS_SECRET_ACCESS_KEY
        - AWS_SESSION_TOKEN
      set:
        ANSIBLE_FORCE_COLOR: "true"

  # ========================
  # Inventory
  # ========================

  # Default inventory paths
  inventories:
    - inventory/production.yml
    - inventory/staging.yml

  # ========================
  # Playbook Artifacts
  # ========================

  playbook-artifact:
    # Enable artifact creation
    enable: true
    # Save location with template variables
    save-as: "{playbook_dir}/artifacts/{playbook_name}-{time_stamp}.json"
    # Replay artifact on completion (true/false)
    replay: false

  # ========================
  # Logging
  # ========================

  logging:
    # Log level: debug, info, warning, error, critical
    level: warning
    # Log file path
    file: /tmp/ansible-navigator.log
    # Append to log file instead of overwriting
    append: true

  # ========================
  # Color and Display
  # ========================

  color:
    enable: true
    osc4: true

  # ========================
  # Time Zone
  # ========================

  time-zone: UTC
```

## Configuration for Different Scenarios

### Development Configuration

Optimized for writing and debugging playbooks:

```yaml
# ansible-navigator.yml - Development config
---
ansible-navigator:
  mode: interactive
  execution-environment:
    image: ghcr.io/ansible/community-ansible-dev-tools:latest
    pull:
      policy: missing
    volume-mounts:
      - src: "${HOME}/.ssh"
        dest: /home/runner/.ssh
        options: ro
  playbook-artifact:
    enable: true
    save-as: "{playbook_dir}/artifacts/{playbook_name}-{time_stamp}.json"
  logging:
    level: debug
    file: /tmp/ansible-navigator-dev.log
  ansible:
    cmdline: "--diff"
```

### CI/CD Configuration

Optimized for pipeline runs:

```yaml
# ansible-navigator.yml - CI/CD config
---
ansible-navigator:
  mode: stdout
  execution-environment:
    image: quay.io/myorg/ansible-ee:2.1.0
    pull:
      policy: missing
    environment-variables:
      set:
        ANSIBLE_FORCE_COLOR: "true"
        ANSIBLE_NOCOLOR: "false"
  playbook-artifact:
    enable: true
    save-as: "/artifacts/{playbook_name}-{time_stamp}.json"
  logging:
    level: warning
    file: /var/log/ansible-navigator.log
  color:
    enable: true
```

### Production Configuration

Strict settings for production deployments:

```yaml
# ansible-navigator.yml - Production config
---
ansible-navigator:
  mode: stdout
  execution-environment:
    image: quay.io/myorg/ansible-ee:2.1.0
    pull:
      policy: never
    volume-mounts:
      - src: "${HOME}/.ssh"
        dest: /home/runner/.ssh
        options: ro
      - src: /etc/ansible/vault_pass
        dest: /etc/ansible/vault_pass
        options: ro
  playbook-artifact:
    enable: true
    save-as: "/var/log/ansible/artifacts/{playbook_name}-{time_stamp}.json"
  logging:
    level: info
    file: /var/log/ansible/navigator.log
  ansible:
    cmdline: "--forks 20"
```

### AWS Configuration

Settings for AWS automation:

```yaml
# ansible-navigator.yml - AWS config
---
ansible-navigator:
  mode: stdout
  execution-environment:
    image: quay.io/myorg/ee-aws:2.1.0
    pull:
      policy: missing
    environment-variables:
      pass:
        - AWS_ACCESS_KEY_ID
        - AWS_SECRET_ACCESS_KEY
        - AWS_SESSION_TOKEN
        - AWS_DEFAULT_REGION
        - AWS_PROFILE
      set:
        ANSIBLE_FORCE_COLOR: "true"
    volume-mounts:
      - src: "${HOME}/.aws"
        dest: /home/runner/.aws
        options: ro
  inventories:
    - inventory/aws_ec2.yml
```

## Volume Mount Configuration

Volume mounts control which host directories are accessible inside the EE container. This is critical for SSH keys, credentials, and project files.

```yaml
# Detailed volume mount examples
execution-environment:
  volume-mounts:
    # SSH keys (read-only for security)
    - src: "${HOME}/.ssh"
      dest: /home/runner/.ssh
      options: ro

    # AWS credentials
    - src: "${HOME}/.aws"
      dest: /home/runner/.aws
      options: ro

    # Kubernetes config
    - src: "${HOME}/.kube"
      dest: /home/runner/.kube
      options: ro

    # Custom CA certificates
    - src: /etc/pki/ca-trust/source/anchors
      dest: /etc/pki/ca-trust/source/anchors
      options: ro

    # Shared data directory (read-write)
    - src: /opt/ansible/data
      dest: /opt/ansible/data
      options: rw

    # DNS configuration
    - src: /etc/resolv.conf
      dest: /etc/resolv.conf
      options: ro
```

## Environment Variable Configuration

Pass environment variables into the EE container:

```yaml
execution-environment:
  environment-variables:
    # Pass existing environment variables from the host
    pass:
      - ANSIBLE_VAULT_PASSWORD
      - SSH_AUTH_SOCK
      - AWS_ACCESS_KEY_ID
      - AWS_SECRET_ACCESS_KEY
      - HTTPS_PROXY
      - NO_PROXY

    # Set specific values
    set:
      ANSIBLE_FORCE_COLOR: "true"
      ANSIBLE_CALLBACK_WHITELIST: "timer,profile_tasks"
      ANSIBLE_STDOUT_CALLBACK: "yaml"
      TZ: "UTC"
```

## Using Multiple Config Files

You can have different configs for different scenarios using the environment variable:

```bash
# Use the development config
ANSIBLE_NAVIGATOR_CONFIG=navigator-dev.yml ansible-navigator run site.yml

# Use the production config
ANSIBLE_NAVIGATOR_CONFIG=navigator-prod.yml ansible-navigator run site.yml

# Use the CI config
ANSIBLE_NAVIGATOR_CONFIG=navigator-ci.yml ansible-navigator run site.yml
```

Or create shell aliases:

```bash
# .bashrc or .zshrc - Aliases for different configs
alias nav-dev='ANSIBLE_NAVIGATOR_CONFIG=navigator-dev.yml ansible-navigator'
alias nav-prod='ANSIBLE_NAVIGATOR_CONFIG=navigator-prod.yml ansible-navigator'

# Usage
nav-dev run site.yml
nav-prod run deploy.yml -i inventory/production.yml
```

## Verifying Your Configuration

Check that ansible-navigator is reading your configuration correctly:

```bash
# Show current settings
ansible-navigator settings --mode stdout

# Show settings in interactive mode for detailed browsing
ansible-navigator settings
```

The settings view shows every configuration option and its current value, including where the value came from (default, config file, or command line).

## Command-Line Overrides

Any configuration file setting can be overridden on the command line. Command-line flags always take the highest precedence.

```bash
# Config says mode: stdout, but override to interactive
ansible-navigator run site.yml --mode interactive

# Config says image: my-ee:1.0, but override to a different image
ansible-navigator run site.yml --execution-environment-image my-ee:2.0

# Config says pull: missing, but force a pull
ansible-navigator run site.yml --pull-policy always
```

## Configuration Tips

Based on experience managing navigator configs across multiple projects, here are some practical tips:

Keep a global config in `~/.ansible-navigator.yml` with safe defaults (mode, logging, color). Override per project with a local `ansible-navigator.yml` file.

Always set `pull.policy: missing` in development and `pull.policy: never` in production. The `always` policy adds network latency to every run.

Use environment variable passthrough (`pass`) rather than hardcoded values (`set`) for secrets. This keeps credentials out of your config file.

Set `ANSIBLE_FORCE_COLOR: "true"` in the EE environment variables so you get colored output in both interactive and stdout modes.

Always enable playbook artifacts. They take minimal disk space and are invaluable for debugging.

## Wrapping Up

A well-configured ansible-navigator.yml file eliminates the need to remember and type long command-line flags. Set it up once per project, commit it to version control, and every team member gets the same experience. Use the settings command to verify your configuration, and remember that command-line flags always win over config file values when you need a one-off override.
