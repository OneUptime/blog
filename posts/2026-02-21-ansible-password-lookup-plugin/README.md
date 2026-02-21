# How to Use the Ansible password Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Security, Password Management

Description: Learn how to use the Ansible password lookup plugin to generate and store random passwords for use in automated infrastructure provisioning.

---

Managing passwords across dozens or hundreds of servers is a headache. You want unique, strong passwords for every service, but you also need those passwords to be reproducible across playbook runs so you do not accidentally reset them every time. The Ansible `password` lookup plugin solves both problems: it generates random passwords and stores them in files so they persist between runs.

## How the password Lookup Works

When you call `lookup('password', '/path/to/file')`, Ansible checks whether the file exists. If it does, Ansible reads the password from it. If it does not exist, Ansible generates a new random password, writes it to the file, and returns it. This means the first run creates the password, and every subsequent run reuses it.

## Basic Usage

The simplest usage generates a random password and stores it in a file.

This playbook creates a password file for a database user:

```yaml
# playbook.yml - Generate and store a database password
---
- name: Set up database credentials
  hosts: dbservers
  tasks:
    - name: Generate database password
      ansible.builtin.debug:
        msg: "DB password is {{ lookup('password', 'credentials/db_password.txt') }}"
```

After the first run, you will find a file at `credentials/db_password.txt` containing the generated password. Every future run reads from that file instead of generating a new one.

## Controlling Password Characteristics

You can control the length and character set of generated passwords using parameters.

This example generates passwords with specific requirements:

```yaml
# playbook.yml - Password generation with custom parameters
---
- name: Generate passwords with specific requirements
  hosts: localhost
  tasks:
    # Generate a 32-character password (default is 20)
    - name: Long password
      ansible.builtin.debug:
        msg: "{{ lookup('password', 'credentials/long_pass.txt length=32') }}"

    # Generate a password with only ASCII letters and digits
    - name: Alphanumeric only password
      ansible.builtin.debug:
        msg: "{{ lookup('password', 'credentials/alphanum_pass.txt chars=ascii_letters,digits') }}"

    # Generate a numeric-only PIN
    - name: 6-digit PIN
      ansible.builtin.debug:
        msg: "{{ lookup('password', 'credentials/pin.txt length=6 chars=digits') }}"

    # Include special characters explicitly
    - name: Password with special chars
      ansible.builtin.debug:
        msg: "{{ lookup('password', 'credentials/special_pass.txt chars=ascii_letters,digits,punctuation') }}"
```

The `chars` parameter accepts Python string module character class names:

- `ascii_letters` - a-z and A-Z
- `digits` - 0-9
- `ascii_lowercase` - a-z only
- `ascii_uppercase` - A-Z only
- `punctuation` - special characters like `!@#$%` etc.
- `hexdigits` - 0-9 and a-f

You can also specify literal characters by including them directly.

## Generating Passwords Without Storing Them

Sometimes you want a random password but do not need it saved to disk. Use `/dev/null` as the path.

This generates a one-time password that is not stored anywhere:

```yaml
# playbook.yml - One-time password generation
---
- name: Generate ephemeral password
  hosts: localhost
  tasks:
    - name: Create a temporary password
      ansible.builtin.set_fact:
        temp_password: "{{ lookup('password', '/dev/null length=16 chars=ascii_letters,digits') }}"

    - name: Use the temporary password
      ansible.builtin.debug:
        msg: "Temporary password: {{ temp_password }}"
```

Be aware that using `/dev/null` means a new password is generated on every single run. This is useful for temporary tokens but not for passwords that need to stay consistent.

## Practical Example: Provisioning Multiple Services

Here is a real-world scenario where you provision a web application stack with unique passwords for each service.

```yaml
# playbook.yml - Provision a full application stack with unique passwords
---
- name: Provision application stack
  hosts: appservers
  vars:
    credential_dir: "{{ playbook_dir }}/credentials/{{ inventory_hostname }}"
    db_password: "{{ lookup('password', credential_dir + '/db_password.txt length=24 chars=ascii_letters,digits') }}"
    redis_password: "{{ lookup('password', credential_dir + '/redis_password.txt length=24 chars=ascii_letters,digits') }}"
    api_secret: "{{ lookup('password', credential_dir + '/api_secret.txt length=48 chars=ascii_letters,digits') }}"
  tasks:
    - name: Create database user
      community.mysql.mysql_user:
        name: appuser
        password: "{{ db_password }}"
        priv: "myapp.*:ALL"
        state: present

    - name: Configure Redis authentication
      ansible.builtin.lineinfile:
        path: /etc/redis/redis.conf
        regexp: '^requirepass'
        line: "requirepass {{ redis_password }}"
      notify: restart redis

    - name: Template application config with all credentials
      ansible.builtin.template:
        src: app_config.j2
        dest: /etc/myapp/config.yml
        mode: '0600'
        owner: appuser
        group: appuser
```

The corresponding template:

```yaml
# templates/app_config.j2
database:
  host: localhost
  port: 3306
  user: appuser
  password: "{{ db_password }}"
  name: myapp

redis:
  host: localhost
  port: 6379
  password: "{{ redis_password }}"

security:
  api_secret_key: "{{ api_secret }}"
```

Each host gets its own credential directory, so every server has unique passwords.

## Hashing Passwords for User Accounts

When creating Linux user accounts, you need hashed passwords rather than plaintext. Combine the password lookup with the `password_hash` filter.

This playbook creates user accounts with randomly generated, properly hashed passwords:

```yaml
# playbook.yml - Create users with hashed passwords
---
- name: Create application users
  hosts: all
  tasks:
    - name: Create deploy user with random password
      ansible.builtin.user:
        name: deploy
        password: "{{ lookup('password', 'credentials/' + inventory_hostname + '/deploy_pass.txt length=20 chars=ascii_letters,digits') | password_hash('sha512') }}"
        state: present
        shell: /bin/bash

    - name: Create service accounts
      ansible.builtin.user:
        name: "{{ item }}"
        password: "{{ lookup('password', 'credentials/' + inventory_hostname + '/' + item + '_pass.txt length=20 chars=ascii_letters,digits') | password_hash('sha512') }}"
        state: present
        shell: /usr/sbin/nologin
      loop:
        - app_worker
        - app_scheduler
        - app_monitor
```

## Per-Host Password Generation

You can generate unique passwords per host by incorporating the hostname into the file path.

```yaml
# playbook.yml - Per-host unique passwords
---
- name: Generate per-host secrets
  hosts: all
  tasks:
    - name: Generate unique node secret
      ansible.builtin.set_fact:
        node_secret: "{{ lookup('password', 'secrets/' + inventory_hostname + '/node_secret.txt length=32') }}"

    - name: Show the per-host secret
      ansible.builtin.debug:
        msg: "Secret for {{ inventory_hostname }}: {{ node_secret }}"
```

## Securing the Credential Files

The password lookup creates plaintext files on your Ansible controller. You need to protect these.

Here is a workflow that encrypts credential files with Ansible Vault after generation:

```bash
# After running the playbook, encrypt all generated credential files
find credentials/ -name "*.txt" -exec ansible-vault encrypt {} \;
```

You can also add the credentials directory to your `.gitignore`:

```bash
# .gitignore - Never commit plaintext credentials
credentials/
```

Or better yet, use a vault password file and encrypt them automatically as part of your CI/CD pipeline.

## Combining with Ansible Vault

For a more integrated approach, store the generated passwords in an encrypted vars file:

```yaml
# playbook.yml - Generate passwords and store in vault-encrypted file
---
- name: Generate and encrypt credentials
  hosts: localhost
  tasks:
    - name: Generate all required passwords
      ansible.builtin.set_fact:
        app_credentials:
          db_password: "{{ lookup('password', '/dev/null length=24 chars=ascii_letters,digits') }}"
          redis_password: "{{ lookup('password', '/dev/null length=24 chars=ascii_letters,digits') }}"
          jwt_secret: "{{ lookup('password', '/dev/null length=64 chars=ascii_letters,digits') }}"

    - name: Write encrypted vars file
      ansible.builtin.copy:
        content: "{{ app_credentials | to_nice_yaml }}"
        dest: "group_vars/all/vault.yml"
        mode: '0600'
```

Then encrypt it:

```bash
# Encrypt the generated vars file
ansible-vault encrypt group_vars/all/vault.yml
```

## Common Pitfalls

There are a few things that trip people up with this plugin:

1. **Password changes on accident**: If you delete the password file, the next run generates a new password. This will break things if the old password was already in use somewhere. Keep backups of your credential files.

2. **File permissions**: The plugin creates files with your default umask. On shared systems, other users might be able to read them. Set strict permissions on your credentials directory.

3. **Idempotency with /dev/null**: Using `/dev/null` generates a new password every run. If you pass that password to a task that sets a password, it will change the password on every run. Only use `/dev/null` when you genuinely want fresh passwords each time.

4. **Special characters in passwords**: Some applications choke on certain special characters in passwords. Use `chars=ascii_letters,digits` to avoid problems with characters that need escaping in shell commands or config file formats.

5. **Directory creation**: The plugin does not create parent directories automatically. Make sure the directory exists before the lookup runs, or create it with a task first.

The `password` lookup plugin is one of the most practical tools in the Ansible ecosystem. It removes the manual work of generating and tracking passwords across your infrastructure, and the file-based persistence means your playbooks stay idempotent without any extra effort on your part.
