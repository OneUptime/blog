# How to Use Ansible to Run Commands in a Specific Shell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Shell, Bash, DevOps

Description: Learn how to specify which shell Ansible uses for command execution including bash, zsh, sh, and custom shell environments.

---

By default, Ansible's `shell` module runs commands through `/bin/sh` on the target host. That is fine for most things, but sometimes you need a specific shell. Maybe your script depends on bash-specific features like arrays or process substitution. Maybe you are working with a system that uses zsh or fish as its default shell. Or perhaps you need to run commands in a restricted shell for security reasons.

This post covers how to control which shell Ansible uses, how to set up the right shell environment, and how to avoid the common pitfalls that come with shell-specific syntax.

## The Difference Between command and shell Modules

Before diving into shell selection, it helps to understand what the `command` and `shell` modules actually do differently.

The `command` module runs a binary directly without invoking a shell at all. It does not process shell metacharacters like pipes, redirects, or wildcards:

```yaml
# command module runs the binary directly, no shell involved
- name: List files (no shell processing)
  ansible.builtin.command:
    cmd: ls -la /var/log
```

The `shell` module wraps your command in a shell invocation. By default, that shell is `/bin/sh`:

```yaml
# shell module processes the command through /bin/sh
- name: Count log files (shell features like pipes work here)
  ansible.builtin.shell:
    cmd: ls /var/log/*.log | wc -l
```

## Specifying a Shell with the executable Parameter

The `shell` module accepts an `executable` parameter that lets you choose which shell interprets your command:

```yaml
# run a command explicitly through bash
- name: Use bash-specific features
  ansible.builtin.shell:
    cmd: |
      declare -A servers
      servers[web]="10.0.1.10"
      servers[db]="10.0.1.20"
      for role in "${!servers[@]}"; do
        echo "$role -> ${servers[$role]}"
      done
    executable: /bin/bash
  register: result

- name: Show output
  ansible.builtin.debug:
    var: result.stdout_lines
```

Without `executable: /bin/bash`, the associative array syntax would fail on systems where `/bin/sh` points to dash (which is common on Debian and Ubuntu).

## Common Shell Options

Here are the shells you are most likely to use with Ansible:

```yaml
# different shell executables for different use cases
---
- name: Shell selection examples
  hosts: all
  tasks:
    # Standard POSIX shell - most portable
    - name: Run with POSIX sh
      ansible.builtin.shell:
        cmd: "echo $SHELL && echo $0"
        executable: /bin/sh
      changed_when: false

    # Bash - needed for arrays, process substitution, etc.
    - name: Run with bash
      ansible.builtin.shell:
        cmd: |
          shopt -s globstar
          for f in /etc/**/*.conf; do
            echo "$f"
          done
        executable: /bin/bash
      changed_when: false

    # Zsh - useful if target system is configured for zsh
    - name: Run with zsh
      ansible.builtin.shell:
        cmd: |
          setopt extended_glob
          print -l /etc/*(.)
        executable: /bin/zsh
      changed_when: false
      ignore_errors: true  # zsh might not be installed
```

## Setting the Default Shell Globally

If most of your tasks need bash, you can set it as the default in your `ansible.cfg` instead of repeating `executable` on every task:

```ini
# ansible.cfg - set bash as the default shell for the shell module
[defaults]
executable = /bin/bash
```

You can also set it per host in your inventory:

```ini
# inventory with per-host shell settings
[legacy_servers]
old-box1 ansible_shell_executable=/bin/sh

[modern_servers]
new-box1 ansible_shell_executable=/bin/bash
new-box2 ansible_shell_executable=/bin/bash
```

## Running Bash Scripts with Specific Options

Sometimes you want bash with specific flags. For example, running in strict mode to catch errors early:

```yaml
# run bash in strict mode to catch errors
- name: Execute with bash strict mode
  ansible.builtin.shell:
    cmd: |
      set -euo pipefail

      # This will fail fast if any command fails
      CONFIG_DIR="/etc/myapp"
      BACKUP_DIR="/tmp/config_backup"

      mkdir -p "$BACKUP_DIR"
      cp "$CONFIG_DIR"/*.conf "$BACKUP_DIR/"

      # Count backed up files
      FILE_COUNT=$(ls "$BACKUP_DIR"/*.conf | wc -l)
      echo "Backed up $FILE_COUNT configuration files"
    executable: /bin/bash
  register: backup_result
```

The `set -euo pipefail` combination is one of the most useful bash features for Ansible scripts:

- `-e` exits immediately if any command fails
- `-u` treats unset variables as errors
- `-o pipefail` ensures pipe failures are caught

## Working with Shell Environment Variables

Different shells load different configuration files. This matters when your commands depend on environment variables set in shell profiles:

```yaml
# load the full login shell environment before running commands
---
- name: Tasks needing full shell environment
  hosts: app_servers
  tasks:
    # This runs without loading .bashrc or .bash_profile
    - name: Check PATH without login shell
      ansible.builtin.shell:
        cmd: echo $PATH
        executable: /bin/bash
      changed_when: false
      register: basic_path

    # This loads the full login environment
    - name: Check PATH with login shell
      ansible.builtin.shell:
        cmd: bash -l -c 'echo $PATH'
      changed_when: false
      register: login_path

    - name: Compare PATHs
      ansible.builtin.debug:
        msg:
          - "Basic: {{ basic_path.stdout }}"
          - "Login: {{ login_path.stdout }}"
```

If you need specific environment variables, it is often better to set them explicitly rather than depending on shell profiles:

```yaml
# set environment variables explicitly instead of relying on shell profiles
- name: Run with explicit environment
  ansible.builtin.shell:
    cmd: node /opt/myapp/scripts/migrate.js
    executable: /bin/bash
  environment:
    NODE_ENV: production
    DATABASE_URL: "postgres://localhost:5432/myapp"
    PATH: "/usr/local/bin:/usr/bin:/bin:/opt/node/bin"
```

## Running Commands in a Login Shell

Some applications (like those installed via rbenv, nvm, or pyenv) only work in a login shell because they modify PATH in `.bashrc` or `.profile`:

```yaml
# run Ruby commands through rbenv by sourcing the profile
- name: Run Ruby via rbenv
  ansible.builtin.shell:
    cmd: |
      source ~/.bashrc
      rbenv global 3.2.0
      ruby --version
      gem install bundler
    executable: /bin/bash
  become: true
  become_user: deploy

# alternative: use bash login mode
- name: Run Ruby via login shell
  ansible.builtin.shell:
    cmd: "bash -lc 'ruby --version && bundle install --deployment'"
    chdir: /opt/myapp
  become: true
  become_user: deploy
```

## Detecting the Available Shell

On heterogeneous environments, you might not know which shell is available. You can detect it first:

```yaml
# detect available shells and choose accordingly
---
- name: Adaptive shell usage
  hosts: all
  tasks:
    - name: Check if bash is available
      ansible.builtin.stat:
        path: /bin/bash
      register: bash_check

    - name: Check if zsh is available
      ansible.builtin.stat:
        path: /bin/zsh
      register: zsh_check

    - name: Run with bash if available
      ansible.builtin.shell:
        cmd: echo "Running in bash: $BASH_VERSION"
        executable: /bin/bash
      when: bash_check.stat.exists
      changed_when: false

    - name: Fall back to sh if bash is missing
      ansible.builtin.shell:
        cmd: echo "Running in basic sh"
        executable: /bin/sh
      when: not bash_check.stat.exists
      changed_when: false
```

## Using the script Module with a Specific Shell

The `script` module transfers a local script to the remote host and runs it. You can control the interpreter with a shebang or the `executable` parameter:

```yaml
# execute a local script on remote hosts using a specific shell
- name: Run local bash script on remote hosts
  ansible.builtin.script:
    cmd: scripts/setup_environment.sh
    executable: /bin/bash
  register: script_output
```

The script file itself should have a proper shebang line:

```bash
#!/bin/bash
# scripts/setup_environment.sh - setup script with bash-specific features

set -euo pipefail

declare -a PACKAGES=("curl" "wget" "jq" "htop")

for pkg in "${PACKAGES[@]}"; do
    if ! command -v "$pkg" &> /dev/null; then
        echo "Installing $pkg..."
        apt-get install -y "$pkg"
    else
        echo "$pkg is already installed"
    fi
done
```

## Summary

Controlling which shell Ansible uses comes down to the `executable` parameter on the `shell` module, the `ansible_shell_executable` inventory variable, or the `executable` setting in `ansible.cfg`. Use `/bin/sh` for maximum portability, `/bin/bash` when you need bash-specific features like arrays and process substitution, and always set environment variables explicitly rather than relying on shell profiles. When in doubt, add `executable: /bin/bash` to your shell tasks and use `set -euo pipefail` for robust error handling.
