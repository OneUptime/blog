# How to Use the Ansible expect Module for Interactive Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Expect Module, Interactive Commands, Automation

Description: Learn how to automate interactive command-line prompts in Ansible using the expect module with pattern matching and response mapping.

---

Some commands insist on interactive input. They ask questions, prompt for passwords, or require confirmations that you cannot bypass with command-line flags. The Ansible `expect` module handles these situations by watching for specific prompts and sending predefined responses, similar to the `expect` command-line tool on Linux.

## Prerequisites

The `expect` module requires the `pexpect` Python library on the target host. Install it before using the module.

```yaml
# install_pexpect.yml - Install pexpect dependency
---
- name: Install pexpect for expect module
  hosts: all
  become: yes

  tasks:
    - name: Install pexpect via pip
      ansible.builtin.pip:
        name: pexpect
        state: present

    # Or install via system package manager
    - name: Install pexpect on Debian/Ubuntu
      ansible.builtin.apt:
        name: python3-pexpect
        state: present
      when: ansible_os_family == "Debian"
```

## Basic Usage

The `expect` module takes a command and a dictionary of prompt-response pairs. The keys are Python regular expressions that match prompts, and the values are the responses to send.

```yaml
# basic_expect.yml - Simple interactive command automation
---
- name: Basic expect module usage
  hosts: all
  become: yes

  tasks:
    - name: Change user password interactively
      ansible.builtin.expect:
        command: passwd deploy
        responses:
          "New password:": "SecureP@ss2026"
          "Retype new password:": "SecureP@ss2026"
      no_log: true  # Hide sensitive output
```

The `responses` dictionary maps prompt patterns to answers. When the `expect` module sees output matching "New password:", it sends "SecureP@ss2026" followed by a newline.

## Handling Multiple Prompts

Some commands have multiple distinct prompts. Map each one in the responses dictionary.

```yaml
# multiple_prompts.yml - Handle multiple different prompts
---
- name: Handle multiple interactive prompts
  hosts: all
  become: yes

  tasks:
    - name: Initialize an application with interactive setup
      ansible.builtin.expect:
        command: /opt/myapp/bin/setup --init
        responses:
          "Enter database host": "db.example.com"
          "Enter database port": "5432"
          "Enter database name": "myapp_production"
          "Enter database username": "myapp"
          "Enter database password": "{{ vault_db_password }}"
          "Enable SSL.*\\(y/n\\)": "y"
          "Enter SSL certificate path": "/etc/ssl/certs/myapp.crt"
          "Confirm settings.*\\(y/n\\)": "y"
        timeout: 60
      no_log: true
```

## Using Regular Expressions in Prompts

The prompt patterns are Python regular expressions, giving you flexibility in matching.

```yaml
# regex_prompts.yml - Using regex patterns for prompt matching
---
- name: Regex-based prompt matching
  hosts: all
  become: yes

  tasks:
    - name: Handle prompts with variable text
      ansible.builtin.expect:
        command: /opt/installer/setup.sh
        responses:
          # Match any yes/no prompt
          "\\(y/n\\)": "y"
          "\\[y/N\\]": "y"
          "\\(yes/no\\)": "yes"
          # Match password prompts regardless of exact wording
          "(?i)password": "{{ setup_password }}"
          # Match prompts with dynamic content
          "Enter value for .+:": "default"
          # Match prompts ending with specific characters
          ".*\\?\\s*$": "yes"
          # Case-insensitive matching
          "(?i)continue": "y"
      timeout: 120
      no_log: true
```

## Handling Repeated Prompts

Some commands ask the same question multiple times. You can provide a list of responses.

```yaml
# repeated_prompts.yml - Handle the same prompt appearing multiple times
---
- name: Handle repeated prompts
  hosts: all
  become: yes

  tasks:
    - name: Handle password confirmation (same prompt twice)
      ansible.builtin.expect:
        command: /opt/myapp/bin/change-master-key
        responses:
          # Provide a list when the same prompt appears multiple times
          "Enter new master key:":
            - "NewMasterK3y!2026"
          "Confirm master key:":
            - "NewMasterK3y!2026"
          "Are you sure.*": "yes"
        timeout: 30
      no_log: true

    - name: SSH key generation with passphrase
      ansible.builtin.expect:
        command: "ssh-keygen -t ed25519 -f /home/deploy/.ssh/id_ed25519"
        responses:
          "Overwrite.*": "y"
          "Enter passphrase": "{{ ssh_passphrase }}"
          "Enter same passphrase": "{{ ssh_passphrase }}"
        creates: /home/deploy/.ssh/id_ed25519
      become_user: deploy
      no_log: true
```

## Setting Timeouts

The `timeout` parameter controls how long the module waits for a prompt before considering the command hung.

```yaml
# timeout_handling.yml - Managing timeouts with expect
---
- name: Timeout management
  hosts: all
  become: yes

  tasks:
    - name: Long-running interactive command
      ansible.builtin.expect:
        command: /opt/myapp/bin/full-reindex
        responses:
          "Proceed with reindex.*": "yes"
          "Reindex complete.*press Enter": ""
        timeout: 3600  # 1 hour timeout for long operations

    - name: Quick command with short timeout
      ansible.builtin.expect:
        command: /opt/myapp/bin/quick-check
        responses:
          "Check all modules.*": "y"
        timeout: 30
      register: check_result
      failed_when: check_result.rc != 0
```

## SSL Certificate Operations

Interactive SSL/TLS operations are a common use case.

```yaml
# ssl_operations.yml - SSL certificate operations with expect
---
- name: SSL certificate management
  hosts: all
  become: yes

  tasks:
    - name: Generate self-signed certificate with openssl
      ansible.builtin.expect:
        command: >
          openssl req -new -x509 -days 365
          -keyout /etc/ssl/private/myapp.key
          -out /etc/ssl/certs/myapp.crt
        responses:
          "Enter PEM pass phrase": "{{ ssl_passphrase }}"
          "Verifying.*Enter PEM pass phrase": "{{ ssl_passphrase }}"
          "Country Name": "US"
          "State or Province": "California"
          "Locality Name": "San Francisco"
          "Organization Name": "My Company"
          "Organizational Unit": "Engineering"
          "Common Name": "{{ ansible_fqdn }}"
          "Email Address": "admin@example.com"
        creates: /etc/ssl/certs/myapp.crt
      no_log: true

    - name: Import certificate to Java keystore
      ansible.builtin.expect:
        command: >
          keytool -import -trustcacerts
          -file /etc/ssl/certs/ca-bundle.crt
          -keystore /opt/java/lib/security/cacerts
          -alias myca
        responses:
          "Enter keystore password": "changeit"
          "Trust this certificate.*": "yes"
      register: keytool_result
      failed_when:
        - keytool_result.rc != 0
        - "'already exists' not in keytool_result.stdout"
```

## Database Initialization

Database tools often have interactive setup wizards.

```yaml
# db_init.yml - Database initialization with expect
---
- name: Initialize database interactively
  hosts: db_servers
  become: yes

  tasks:
    - name: Run MySQL secure installation
      ansible.builtin.expect:
        command: mysql_secure_installation
        responses:
          "Enter password for user root": ""
          "VALIDATE PASSWORD": "y"
          "password validation policy": "2"
          "New password": "{{ vault_mysql_root_password }}"
          "Re-enter new password": "{{ vault_mysql_root_password }}"
          "Do you wish to continue": "y"
          "Remove anonymous users": "y"
          "Disallow root login remotely": "y"
          "Remove test database": "y"
          "Reload privilege tables": "y"
        timeout: 60
      no_log: true
      register: mysql_secure
      failed_when: mysql_secure.rc != 0
```

## Working with chdir and Environment

Set the working directory and environment variables for the expect command.

```yaml
# expect_with_env.yml - expect with chdir and environment
---
- name: Expect with working directory and environment
  hosts: all
  become: yes

  tasks:
    - name: Run interactive installer in specific directory
      ansible.builtin.expect:
        command: ./install.sh
        chdir: /opt/installer
        responses:
          "Installation directory": "/opt/myapp"
          "Create directory.*": "y"
          "License agreement.*accept": "accept"
          "Install additional components": "n"
        timeout: 300
      environment:
        LANG: "en_US.UTF-8"
        HOME: "/root"
```

## Error Handling Strategies

Handle failures gracefully when expect does not match a prompt.

```yaml
# expect_error_handling.yml - Error handling with expect
---
- name: Error handling for expect commands
  hosts: all
  become: yes

  tasks:
    - name: Run interactive command with error handling
      block:
        - name: Attempt interactive setup
          ansible.builtin.expect:
            command: /opt/myapp/bin/configure
            responses:
              "Enter config mode": "advanced"
              "Database type": "postgresql"
              "Continue.*": "y"
            timeout: 120
          register: config_result

      rescue:
        - name: Log the failure
          ansible.builtin.debug:
            msg: "Interactive setup failed: {{ config_result.stdout_lines | default(['No output']) }}"

        - name: Fall back to non-interactive setup
          ansible.builtin.command:
            cmd: /opt/myapp/bin/configure --non-interactive --db-type=postgresql --mode=advanced
          register: fallback_result
```

## When NOT to Use expect

The expect module should be a last resort. Always check for non-interactive alternatives first.

```yaml
# prefer_alternatives.yml - Alternatives to expect
---
- name: Prefer non-interactive approaches
  hosts: all
  become: yes

  tasks:
    # Instead of expect with passwd, use the user module
    - name: Set password without expect
      ansible.builtin.user:
        name: deploy
        password: "{{ 'SecureP@ss2026' | password_hash('sha512') }}"

    # Instead of expect with ssh-keygen, use openssh_keypair
    - name: Generate SSH key without expect
      community.crypto.openssh_keypair:
        path: /home/deploy/.ssh/id_ed25519
        type: ed25519
      become_user: deploy

    # Instead of expect with mysql, use pipe
    - name: Run SQL without expect
      ansible.builtin.shell:
        cmd: "mysql -u root -p'{{ vault_mysql_password }}' -e 'SHOW DATABASES'"
      no_log: true
```

## Summary

The `expect` module automates interactive command-line prompts by matching patterns and sending responses. Always install `pexpect` on the target host first. Use Python regular expressions for flexible prompt matching, set appropriate timeouts for long-running commands, and always use `no_log: true` when dealing with passwords. Before reaching for `expect`, check if the command has a non-interactive mode or if there is a dedicated Ansible module for the task. The `expect` module is a last resort for commands that genuinely require interactive input.
