# How to Install and Configure ansible-lint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-lint, Code Quality, DevOps

Description: A complete guide to installing ansible-lint, configuring it for your project, and understanding its default rules and configuration options.

---

If you write Ansible playbooks professionally, `ansible-lint` is a tool you should be running on every commit. It catches common mistakes, enforces best practices, and helps maintain consistent code quality across your team. Think of it as what ESLint is to JavaScript or pylint is to Python, but specifically tuned for Ansible content.

In this guide, we will go through installing ansible-lint, setting up your configuration file, understanding the default rules, and integrating it into your daily workflow.

## Installation

There are several ways to install ansible-lint depending on your environment.

### Install with pip

The recommended approach is using pip in a virtual environment:

```bash
# Create a virtual environment for your Ansible tools
python3 -m venv ~/ansible-env
source ~/ansible-env/bin/activate

# Install ansible-lint (this also installs ansible-core as a dependency)
pip install ansible-lint

# Verify the installation
ansible-lint --version
```

### Install with pipx

If you want ansible-lint available globally without polluting your system Python:

```bash
# Install pipx if you do not have it
pip install pipx
pipx ensurepath

# Install ansible-lint in an isolated environment
pipx install ansible-lint

# Verify
ansible-lint --version
```

### Install on macOS with Homebrew

```bash
brew install ansible-lint
```

### Install on Ubuntu/Debian

```bash
# The apt package is often outdated, pip is preferred
sudo apt update
sudo apt install python3-pip
pip3 install ansible-lint
```

## First Run

Once installed, run ansible-lint against a playbook or an entire directory:

```bash
# Lint a single playbook
ansible-lint playbook.yml

# Lint all YAML files in the current directory
ansible-lint

# Lint a specific role
ansible-lint roles/webserver/

# Lint with specific config file
ansible-lint -c .ansible-lint playbook.yml
```

On the first run, you will likely see a wall of warnings and errors. Do not panic. The default configuration is fairly strict, and it is normal to have many findings on an existing codebase.

## Configuration File

Create an `.ansible-lint` file in the root of your project. This YAML file controls all aspects of ansible-lint's behavior.

```yaml
# .ansible-lint - Main configuration file
---
# Set the profile to control the strictness level
# Options: min, basic, moderate, safety, shared, production
profile: moderate

# Paths to exclude from linting
exclude_paths:
  - .cache/
  - .github/
  - changelogs/
  - collections/
  - molecule/*/converge.yml
  - test/

# List of rule IDs or tags to skip
skip_list:
  - yaml[line-length]  # Allow long lines in YAML
  - no-changed-when     # We handle this case by case

# Enable specific optional rules
enable_list:
  - no-same-owner

# Treat these warnings as errors
warn_list:
  - experimental

# Use progressive mode to only report new violations
# progressive: true

# Set the working directory
# cwd: /path/to/project

# Offline mode prevents ansible-lint from downloading collections
offline: false

# Define additional collections paths
# collections_paths:
#   - ./collections

# Specify which extra rules directories to include
# rulesdir:
#   - ./custom_rules/
```

## Understanding the Output

When ansible-lint finds issues, it prints them in a specific format. Here is an example output:

```
WARNING  Listing 4 violation(s) that are fatal
risky-file-permissions: File permissions unset or incorrect.
tasks/main.yml:12 Task/Handler: Copy nginx configuration

name[missing]: All tasks should be named.
tasks/deploy.yml:5 Task/Handler: ansible.builtin.command

yaml[truthy]: Truthy value should be one of [false, true]
defaults/main.yml:8

fqcn[action-core]: Use FQCN for builtin module actions.
tasks/main.yml:20 Task/Handler: Install packages

Finished with 3 failure(s), 1 warning(s) on 8 files.
```

Each violation shows:

- **Rule ID**: The identifier like `risky-file-permissions` or `name[missing]`
- **Description**: What the rule checks for
- **File and line**: Where the violation occurred
- **Task name**: Which task triggered the warning

## Key Configuration Options Explained

### Profiles

Profiles are the easiest way to set the strictness level. Each profile includes all rules from the less strict profiles below it.

```yaml
# Increasing strictness:
# min -> basic -> moderate -> safety -> shared -> production
profile: moderate
```

For a new project, start with `moderate`. For legacy projects, start with `min` and gradually increase.

### exclude_paths

Exclude directories and files that you do not want to lint. This is useful for generated files, vendored collections, or test fixtures.

```yaml
exclude_paths:
  - .cache/
  - vendor/
  - roles/external/  # Downloaded galaxy roles
  - "*.bak"
```

### skip_list vs warn_list

The `skip_list` completely suppresses rules. The `warn_list` still shows them but does not count them as errors (exit code stays 0).

```yaml
# These rules will not appear in output at all
skip_list:
  - yaml[line-length]

# These rules appear as warnings but do not cause failure
warn_list:
  - risky-file-permissions
  - no-changed-when
```

### Progressive Mode

Progressive mode is a lifesaver for existing projects. When enabled, ansible-lint only reports violations in files that have been modified compared to the default branch.

```yaml
# Only report violations in changed files
progressive: true
```

This lets you gradually improve code quality without fixing hundreds of existing issues upfront.

## Per-Task Rule Skipping

Sometimes you need to skip a rule for a specific task. Use the `noqa` comment:

```yaml
# tasks/main.yml - Skip specific rules on individual tasks
---
- name: Run database migration script
  ansible.builtin.command: /opt/app/migrate.sh  # noqa: no-changed-when
  when: run_migrations | bool

- name: Download and extract archive  # noqa: risky-file-permissions
  ansible.builtin.unarchive:
    src: https://example.com/app.tar.gz
    dest: /opt/app/
    remote_src: true
```

You can also skip multiple rules on one task:

```yaml
- name: Quick and dirty fix  # noqa: no-changed-when command-instead-of-shell
  ansible.builtin.shell: |
    cd /opt/app && ./fix.sh
```

## Listing Available Rules

To see all available rules and their descriptions:

```bash
# List all rules
ansible-lint -L

# List rules with tags
ansible-lint -T

# Show details for a specific rule
ansible-lint -L | grep "fqcn"
```

## Recommended Starting Configuration

Here is a configuration I recommend for teams just starting with ansible-lint:

```yaml
# .ansible-lint - Recommended starter config
---
profile: basic

exclude_paths:
  - .cache/
  - .git/
  - collections/
  - roles/external/

skip_list:
  - yaml[line-length]

warn_list:
  - experimental
  - fqcn[action-core]
  - name[casing]

# Show rule IDs in output for easy reference
# parseable: true

# Match output format for IDE integration
# sarif_file: ansible-lint-results.sarif
```

Start here, and over a few weeks, move rules from `warn_list` to enforced, and eventually bump up to the `moderate` profile. This gradual approach gets your team used to the tool without overwhelming them with hundreds of violations on day one.

## Integration with ansible.cfg

ansible-lint respects your `ansible.cfg` settings for things like roles_path and collections_paths. Make sure your ansible.cfg is in the project root alongside your `.ansible-lint` file.

```ini
# ansible.cfg - Settings that ansible-lint also uses
[defaults]
roles_path = ./roles:./roles/external
collections_path = ./collections

[galaxy]
server_list = galaxy
```

## What to Do Next

After setting up ansible-lint, the natural next steps are:

1. Run it in your CI pipeline to enforce standards on every pull request
2. Set up pre-commit hooks so developers catch issues before pushing
3. Gradually increase the profile strictness as your codebase improves
4. Write custom rules for your organization's specific standards

We will cover each of these topics in detail in upcoming posts. For now, get ansible-lint installed, configure it with the starter config above, and start fixing the most critical violations in your codebase.
