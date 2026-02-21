# How to Use the password_hash Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Security, User Management

Description: Learn how to use the password_hash filter in Ansible to generate secure password hashes for Linux user management and authentication.

---

When you manage Linux user accounts with Ansible, you cannot just pass a plaintext password to the `user` module. Linux expects passwords to be stored as cryptographic hashes in `/etc/shadow`. The `password_hash` filter takes a plaintext password and produces a properly formatted hash that Linux systems can use for authentication. This post covers how to use it correctly, which algorithms to choose, and how to avoid common pitfalls.

## Basic Usage

The `password_hash` filter takes a hashing algorithm as its argument:

```yaml
# create_user.yml - Create a user with a hashed password
- name: Create application user
  ansible.builtin.user:
    name: deploy
    password: "{{ 'my_secure_password' | password_hash('sha512') }}"
    shell: /bin/bash
    state: present
```

This generates a SHA-512 hash that looks something like:

```
$6$rounds=656000$randomsalt$longhashstring...
```

The `$6$` prefix indicates SHA-512. The salt is generated randomly, and the hash is computed using the standard crypt function.

## Supported Algorithms

The filter supports several hashing algorithms:

```yaml
# Different hashing algorithms
- name: SHA-512 (recommended for modern systems)
  ansible.builtin.debug:
    msg: "{{ 'password' | password_hash('sha512') }}"

- name: SHA-256
  ansible.builtin.debug:
    msg: "{{ 'password' | password_hash('sha256') }}"

- name: Blowfish (bcrypt) - good for BSD systems
  ansible.builtin.debug:
    msg: "{{ 'password' | password_hash('blowfish') }}"

- name: MD5 (legacy, not recommended)
  ansible.builtin.debug:
    msg: "{{ 'password' | password_hash('md5') }}"
```

For modern Linux systems, **sha512** is the standard choice. It is the default algorithm used by most distributions for `/etc/shadow`.

## Using a Fixed Salt for Idempotency

By default, `password_hash` generates a random salt each time it runs. This means the hash changes on every playbook run, causing the `user` module to report a change and update the password even when the actual password has not changed. To make it idempotent, provide a fixed salt:

```yaml
# idempotent_user.yml - Create user with stable password hash
- name: Create user with idempotent password hash
  ansible.builtin.user:
    name: deploy
    password: "{{ user_password | password_hash('sha512', 'myFixedSalt123') }}"
    shell: /bin/bash
```

With a fixed salt, the same password always produces the same hash, so the `user` module only reports a change when the password actually changes.

However, using the same salt for all users is not ideal for security. A better approach is to use a per-user salt:

```yaml
# per_user_salt.yml - Unique salt per user for better security
- name: Create users with per-user salts
  ansible.builtin.user:
    name: "{{ item.name }}"
    password: "{{ item.password | password_hash('sha512', 65534 | random(seed=item.name) | string) }}"
    shell: "{{ item.shell | default('/bin/bash') }}"
  loop:
    - name: alice
      password: "{{ vault_alice_password }}"
    - name: bob
      password: "{{ vault_bob_password }}"
    - name: charlie
      password: "{{ vault_charlie_password }}"
```

The `random(seed=item.name)` generates a deterministic "random" number based on the username, giving each user a unique but stable salt.

## Practical Example: Bulk User Management

Here is a complete example of managing multiple users with proper password handling:

```yaml
# manage_users.yml - Full user management playbook
- name: Manage system users
  hosts: all
  vars:
    system_users:
      - name: deploy
        password: "{{ vault_deploy_password }}"
        groups:
          - sudo
          - docker
        shell: /bin/bash
      - name: monitoring
        password: "{{ vault_monitoring_password }}"
        groups:
          - monitoring
        shell: /bin/bash
      - name: backup
        password: "{{ vault_backup_password }}"
        groups:
          - backup
        shell: /bin/sh
  tasks:
    - name: Create user groups
      ansible.builtin.group:
        name: "{{ item }}"
        state: present
      loop:
        - docker
        - monitoring
        - backup

    - name: Create users with hashed passwords
      ansible.builtin.user:
        name: "{{ item.name }}"
        password: "{{ item.password | password_hash('sha512', 65534 | random(seed=item.name) | string) }}"
        groups: "{{ item.groups | join(',') }}"
        shell: "{{ item.shell }}"
        create_home: true
        state: present
      loop: "{{ system_users }}"
      no_log: true  # Prevent passwords from appearing in logs
```

The `no_log: true` directive is important. Without it, the password (even though hashed) would appear in Ansible's output logs.

## Using password_hash in Templates

You can use the filter in Jinja2 templates, for example when generating htpasswd files or other authentication configurations:

```yaml
# htpasswd.yml - Generate htpasswd file
- name: Generate htpasswd file
  hosts: web_servers
  vars:
    web_users:
      - name: admin
        password: "{{ vault_admin_password }}"
      - name: readonly
        password: "{{ vault_readonly_password }}"
  tasks:
    - name: Generate htpasswd file
      ansible.builtin.template:
        src: htpasswd.j2
        dest: /etc/nginx/.htpasswd
        owner: root
        group: www-data
        mode: "0640"
```

```jinja2
{# htpasswd.j2 - Apache-compatible htpasswd file #}
{# Note: For actual htpasswd files, you might want to use the htpasswd module instead #}
{% for user in web_users %}
{{ user.name }}:{{ user.password | password_hash('sha512') }}
{% endfor %}
```

## Generating Password Hashes for Database Users

Some databases accept pre-hashed passwords. While the format varies by database, here is how you might handle PostgreSQL:

```yaml
# pg_users.yml - Create PostgreSQL users
- name: Create database user
  community.postgresql.postgresql_user:
    name: "{{ db_user }}"
    password: "{{ db_password }}"
    encrypted: true
    state: present
  # PostgreSQL handles its own hashing, but you can use password_hash
  # for system-level password management related to the DB server
```

## Rounds Parameter for Strengthening

You can specify the number of hashing rounds to increase the computational cost of brute-force attacks:

```yaml
# strong_hash.yml - Use increased rounds for stronger hashing
- name: Create user with strengthened hash
  ansible.builtin.user:
    name: admin
    password: "{{ admin_password | password_hash('sha512', 'salt123', rounds=1000000) }}"
```

More rounds means the hash takes longer to compute, which slows down brute-force attempts. The default is typically 5000 rounds for SHA-512. For high-security accounts, you might want to increase this to 100000 or more. Be aware that higher round counts also make login slightly slower.

## Storing Passwords Securely with Ansible Vault

Never put plaintext passwords in your playbook files. Always use Ansible Vault:

```bash
# Create an encrypted vault file for passwords
ansible-vault create group_vars/all/vault.yml
```

Inside the vault file:

```yaml
# group_vars/all/vault.yml (encrypted)
vault_deploy_password: "actual_password_here"
vault_admin_password: "another_password_here"
vault_monitoring_password: "monitoring_pass_here"
```

Then reference the vaulted variables in your playbook:

```yaml
# deploy.yml - Reference vaulted passwords
- name: Create deploy user
  ansible.builtin.user:
    name: deploy
    password: "{{ vault_deploy_password | password_hash('sha512', 65534 | random(seed='deploy') | string) }}"
  no_log: true
```

## Password Expiry and Aging

When creating users with `password_hash`, you might also want to set password aging policies:

```yaml
# password_policy.yml - Set password with aging policy
- name: Create user with password policy
  ansible.builtin.user:
    name: "{{ item.name }}"
    password: "{{ item.password | password_hash('sha512', 65534 | random(seed=item.name) | string) }}"
    password_expire_min: 1
    password_expire_max: 90
  loop: "{{ managed_users }}"
  no_log: true

- name: Force password change on first login
  ansible.builtin.command: "chage -d 0 {{ item.name }}"
  loop: "{{ new_users }}"
  when: force_password_change | default(false) | bool
```

## Verifying Your Hash

To verify that a generated hash is correct, you can test it manually:

```yaml
# verify_hash.yml - Verify password hash works
- name: Generate hash and verify
  hosts: localhost
  tasks:
    - name: Generate password hash
      ansible.builtin.set_fact:
        test_hash: "{{ 'testpassword' | password_hash('sha512', 'testsalt') }}"

    - name: Display the hash
      ansible.builtin.debug:
        msg: "Generated hash: {{ test_hash }}"

    - name: Verify hash format
      ansible.builtin.assert:
        that:
          - test_hash is match('\\$6\\$.*\\$.*')
        fail_msg: "Hash does not match expected SHA-512 format"
```

## Common Mistakes

**Forgetting no_log.** Always use `no_log: true` on tasks that handle passwords to prevent them from appearing in logs.

**Random salt causing unnecessary changes.** Without a fixed salt, every playbook run generates a different hash, causing the user module to update the password every time. Use a per-user deterministic salt.

**Using MD5.** The `md5` algorithm is considered weak for password hashing. Always use `sha512` or `blowfish` for password hashes.

**Passing the hash to the wrong parameter.** The `password` parameter of the `user` module expects a hash. If you pass a plaintext password, it will be set as the literal hash value, and the user will not be able to log in.

## Wrapping Up

The `password_hash` filter is essential for managing Linux user passwords in Ansible. Use SHA-512 as your default algorithm, provide per-user deterministic salts for idempotency, store actual passwords in Ansible Vault, and always use `no_log: true` to keep passwords out of your logs. With these practices in place, you can automate user management securely across your infrastructure.
