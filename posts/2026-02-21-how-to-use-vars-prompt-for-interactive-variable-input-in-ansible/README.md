# How to Use vars_prompt for Interactive Variable Input in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Interactive, Playbooks

Description: Learn how to use vars_prompt in Ansible to collect user input at runtime for passwords, confirmations, and deployment parameters.

---

Sometimes you need to collect input from the operator running a playbook. Maybe it is a database password that should not be stored anywhere, a confirmation before a destructive operation, or a version number for a deployment. The `vars_prompt` directive lets you prompt for variable values interactively before the play executes.

## Basic vars_prompt Usage

Add `vars_prompt` at the play level to define prompts that appear when the playbook starts.

```yaml
# basic-prompt.yml
# Prompts the user for deployment parameters
---
- name: Deploy application
  hosts: appservers
  vars_prompt:
    - name: app_version
      prompt: "Which version do you want to deploy?"
      private: false

    - name: confirm_deploy
      prompt: "Deploy to production? Type 'yes' to confirm"
      private: false

  tasks:
    - name: Abort if not confirmed
      ansible.builtin.fail:
        msg: "Deployment cancelled by operator"
      when: confirm_deploy != "yes"

    - name: Deploy version
      ansible.builtin.debug:
        msg: "Deploying version {{ app_version }}"
```

When you run this, Ansible prompts for each variable before executing any tasks:

```
Which version do you want to deploy?: 2.4.1
Deploy to production? Type 'yes' to confirm: yes
```

## Prompting for Passwords

The most common use of `vars_prompt` is collecting passwords. Set `private: true` to hide the input.

```yaml
# password-prompt.yml
# Securely prompts for a password with confirmation
---
- name: Set up database user
  hosts: dbservers
  become: yes
  vars_prompt:
    - name: db_password
      prompt: "Enter the new database password"
      private: true
      confirm: true

  tasks:
    - name: Create database user
      community.postgresql.postgresql_user:
        name: appuser
        password: "{{ db_password }}"
        state: present
      become_user: postgres
```

The `confirm: true` parameter asks the user to type the password twice, ensuring there are no typos. The `private: true` parameter hides the input so the password is not displayed on screen.

## Default Values

You can provide default values that are used when the operator just presses Enter.

```yaml
# defaults-prompt.yml
# Prompts with default values for common options
---
- name: Configure deployment
  hosts: all
  vars_prompt:
    - name: deploy_env
      prompt: "Target environment"
      default: "staging"
      private: false

    - name: worker_count
      prompt: "Number of workers"
      default: "4"
      private: false

    - name: log_level
      prompt: "Log level (debug/info/warn/error)"
      default: "info"
      private: false

  tasks:
    - name: Show deployment configuration
      ansible.builtin.debug:
        msg:
          - "Environment: {{ deploy_env }}"
          - "Workers: {{ worker_count }}"
          - "Log level: {{ log_level }}"
```

The prompt shows the default in brackets:

```
Target environment [staging]:
Number of workers [4]:
Log level (debug/info/warn/error) [info]:
```

## Encrypting Prompted Values

You can encrypt the input using a hashing algorithm. This is useful when setting user passwords on Linux systems, which expect hashed passwords.

```yaml
# hashed-password.yml
# Prompts for a password and hashes it for Linux user creation
---
- name: Create system user with prompted password
  hosts: all
  become: yes
  vars_prompt:
    - name: user_password
      prompt: "Enter password for the new user"
      private: true
      confirm: true
      encrypt: sha512_crypt
      salt_size: 8

  tasks:
    - name: Create user with hashed password
      ansible.builtin.user:
        name: deploy
        password: "{{ user_password }}"
        state: present
        shell: /bin/bash
        groups: sudo
        append: yes
```

Available encryption schemes include `sha512_crypt`, `sha256_crypt`, `md5_crypt`, and `blowfish_crypt`. For Linux systems, `sha512_crypt` is the standard choice.

Note: You need the `passlib` Python library installed on the control node for encryption to work.

```bash
# Install passlib for password encryption support
pip install passlib
```

## Input Validation

`vars_prompt` does not have built-in validation, but you can validate inputs in your tasks.

```yaml
# validated-prompt.yml
# Prompts for input and validates it before proceeding
---
- name: Deploy with validated input
  hosts: appservers
  vars_prompt:
    - name: target_env
      prompt: "Target environment (dev/staging/prod)"
      private: false

    - name: release_version
      prompt: "Release version (format: X.Y.Z)"
      private: false

  tasks:
    - name: Validate environment
      ansible.builtin.fail:
        msg: "Invalid environment '{{ target_env }}'. Must be dev, staging, or prod."
      when: target_env not in ['dev', 'staging', 'prod']

    - name: Validate version format
      ansible.builtin.fail:
        msg: "Invalid version '{{ release_version }}'. Expected format: X.Y.Z"
      when: release_version is not match('^[0-9]+\.[0-9]+\.[0-9]+$')

    - name: Proceed with deployment
      ansible.builtin.debug:
        msg: "Deploying {{ release_version }} to {{ target_env }}"
```

## Combining vars_prompt with vars and vars_files

`vars_prompt` works alongside other variable sources. Prompted values have higher precedence than `vars` and `vars_files`.

```yaml
# combined-vars.yml
# Uses vars_prompt alongside other variable sources
---
- name: Deploy with mixed variable sources
  hosts: appservers
  vars:
    app_name: mywebapp
    default_port: 8080
  vars_files:
    - vars/app-config.yml
  vars_prompt:
    - name: deploy_version
      prompt: "Version to deploy"
      private: false

    - name: override_port
      prompt: "Override port (press Enter for default {{ default_port }})"
      default: "{{ default_port }}"
      private: false

  tasks:
    - name: Show all variables
      ansible.builtin.debug:
        msg:
          - "App: {{ app_name }}"
          - "Version: {{ deploy_version }}"
          - "Port: {{ override_port }}"
```

## Safety Confirmations for Destructive Operations

Use `vars_prompt` to add a manual safety check before dangerous operations.

```yaml
# safe-delete.yml
# Requires explicit confirmation before destructive operations
---
- name: Clean up old deployments
  hosts: appservers
  become: yes
  vars_prompt:
    - name: confirm_cleanup
      prompt: >
        This will delete all deployments older than 30 days on
        {{ groups['appservers'] | length }} servers.
        Type DELETE to confirm
      private: false

  tasks:
    - name: Validate confirmation
      ansible.builtin.fail:
        msg: "Cleanup cancelled. You must type DELETE to confirm."
      when: confirm_cleanup != "DELETE"

    - name: Find old deployments
      ansible.builtin.find:
        paths: /opt/deployments
        age: 30d
        file_type: directory
      register: old_deploys

    - name: Remove old deployments
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_deploys.files }}"
      loop_control:
        label: "{{ item.path }}"
```

## Multiple Password Prompts

For situations where you need multiple credentials.

```yaml
# multi-password.yml
# Collects multiple credentials for a complex setup
---
- name: Configure multi-service authentication
  hosts: appservers
  vars_prompt:
    - name: db_admin_pass
      prompt: "Database admin password"
      private: true

    - name: app_db_pass
      prompt: "Application database password"
      private: true
      confirm: true

    - name: redis_pass
      prompt: "Redis password"
      private: true

    - name: smtp_pass
      prompt: "SMTP relay password"
      private: true

  tasks:
    - name: Deploy configuration with all credentials
      ansible.builtin.template:
        src: app-secrets.yml.j2
        dest: /etc/myapp/secrets.yml
        owner: myapp
        group: myapp
        mode: '0600'
```

## Skipping Prompts with Extra Vars

You can bypass prompts by passing the variables via `-e` on the command line. This is useful in CI/CD pipelines where interactive input is not possible.

```yaml
# skippable-prompt.yml
# Prompts can be skipped by passing values on command line
---
- name: Deploy with optional prompts
  hosts: appservers
  vars_prompt:
    - name: deploy_version
      prompt: "Version to deploy"
      private: false

  tasks:
    - name: Deploy
      ansible.builtin.debug:
        msg: "Deploying version {{ deploy_version }}"
```

```bash
# Interactive mode - prompts for input
ansible-playbook skippable-prompt.yml

# Non-interactive mode - skips prompt by providing the value
ansible-playbook skippable-prompt.yml -e deploy_version=2.4.1

# CI/CD pipeline usage
ansible-playbook skippable-prompt.yml \
  -e deploy_version="${RELEASE_VERSION}"
```

When a variable is already defined (via `-e`, inventory, or elsewhere), the prompt is skipped automatically.

## Practical Example: Interactive Server Setup

Here is a practical example of using vars_prompt for an initial server setup wizard.

```yaml
# server-setup.yml
# Interactive server setup wizard using vars_prompt
---
- name: Initial server setup
  hosts: new_servers
  become: yes
  vars_prompt:
    - name: server_hostname
      prompt: "Hostname for this server"
      private: false

    - name: admin_user
      prompt: "Admin username"
      default: "deploy"
      private: false

    - name: admin_password
      prompt: "Admin user password"
      private: true
      confirm: true
      encrypt: sha512_crypt

    - name: ssh_port
      prompt: "SSH port"
      default: "22"
      private: false

    - name: timezone
      prompt: "Timezone"
      default: "UTC"
      private: false

  tasks:
    - name: Set hostname
      ansible.builtin.hostname:
        name: "{{ server_hostname }}"

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Create admin user
      ansible.builtin.user:
        name: "{{ admin_user }}"
        password: "{{ admin_password }}"
        groups: sudo
        shell: /bin/bash
        state: present

    - name: Configure SSH port
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?Port '
        line: "Port {{ ssh_port }}"
      notify: restart sshd

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

## Summary

`vars_prompt` adds interactive input to Ansible playbooks, making them suitable for operations that need human confirmation, password entry, or runtime parameter selection. Use `private: true` for passwords, `confirm: true` for double-entry verification, `default` for common choices, and `encrypt` for hashing passwords. The prompted values can be bypassed with `-e` for non-interactive execution in CI/CD pipelines. This directive strikes a balance between automation and human oversight for sensitive operations.
