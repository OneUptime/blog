# How to Use the vault Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Jinja2, Filters, Encryption

Description: Learn how to use the Ansible vault filter to encrypt data dynamically within playbooks and Jinja2 templates at runtime.

---

The `vault` filter in Ansible encrypts data at runtime within Jinja2 expressions. It is the counterpart to the `unvault` filter: where `unvault` decrypts, `vault` encrypts. This filter lets you take a plaintext value and produce vault-encrypted output programmatically, without needing to run `ansible-vault encrypt_string` from the command line. It was introduced in Ansible 2.12 and is useful for generating encrypted artifacts, migrating secrets, and building automation around vault encryption itself.

## What the vault Filter Does

The `vault` filter takes a plaintext string and a vault secret (password), and returns the vault-encrypted version of that string. This is the Jinja2 equivalent of `ansible-vault encrypt_string`, but it runs during playbook execution rather than as a separate CLI command.

## Basic Syntax

The filter takes the vault password as a required argument:

```yaml
# Encrypt a string at runtime using the vault filter
- name: Encrypt a value dynamically
  ansible.builtin.debug:
    msg: "{{ 'my-secret-value' | vault('my-vault-password') }}"
```

This outputs the vault-encrypted version of `my-secret-value` encrypted with `my-vault-password`.

## Using with a Vault Password Variable

In practice, you would not hardcode the password. You would use a variable:

```yaml
# playbook.yml
# Encrypt values at runtime using a variable for the vault password
---
- name: Dynamic vault encryption
  hosts: localhost
  vars:
    vault_password: "{{ lookup('file', '~/.vault_pass.txt') }}"

  tasks:
    - name: Encrypt a database password
      ansible.builtin.set_fact:
        encrypted_db_pass: "{{ db_password_plain | vault(vault_password) }}"

    - name: Display the encrypted result
      ansible.builtin.debug:
        msg: "{{ encrypted_db_pass }}"
```

## Practical Use Case: Generating Encrypted Variable Files

One of the most useful applications is generating vault-encrypted variable files programmatically:

```yaml
# generate_vault_vars.yml
# Generates a vault-encrypted variables file from plaintext inputs
---
- name: Generate encrypted variables file
  hosts: localhost
  vars:
    vault_password: "{{ lookup('file', '~/.vault_pass.txt') }}"
    # These would come from an external source (API, database, etc.)
    secrets_to_encrypt:
      db_password: "SuperSecretPass123"
      api_key: "sk-abc123def456ghi789"
      smtp_password: "MailerPass456"

  tasks:
    - name: Create encrypted variable entries
      ansible.builtin.set_fact:
        encrypted_vars: "{{ encrypted_vars | default({}) | combine({
          'vault_' + item.key: item.value | vault(vault_password)
        }) }}"
      loop: "{{ secrets_to_encrypt | dict2items }}"
      no_log: true

    - name: Write encrypted variables to file
      ansible.builtin.copy:
        content: "{{ encrypted_vars | to_nice_yaml }}"
        dest: "{{ playbook_dir }}/group_vars/production/vault.yml"
        mode: '0644'
```

## Encrypting with Vault IDs

The `vault` filter supports vault IDs through an optional second argument:

```yaml
# Encrypt with a specific vault ID
- name: Encrypt with vault ID
  ansible.builtin.set_fact:
    encrypted_value: "{{ 'my-secret' | vault(vault_password, vault_id='prod') }}"
```

This adds the vault ID label to the encrypted output, matching what you would get with `ansible-vault encrypt_string --vault-id prod@password`.

## Migrating Secrets Between Encryption Methods

The `vault` filter is helpful when migrating from one secrets storage to another. For example, pulling secrets from a cloud secrets manager and creating vault-encrypted files:

```yaml
# migrate_secrets.yml
# Pull secrets from AWS Secrets Manager and create vault-encrypted files
---
- name: Migrate secrets to Ansible Vault format
  hosts: localhost
  vars:
    vault_password: "{{ lookup('file', '~/.vault_pass.txt') }}"

  tasks:
    - name: Fetch secrets from AWS Secrets Manager
      ansible.builtin.set_fact:
        aws_db_pass: "{{ lookup('amazon.aws.aws_secret', 'myapp/db-password') }}"
        aws_api_key: "{{ lookup('amazon.aws.aws_secret', 'myapp/api-key') }}"
        aws_redis_pass: "{{ lookup('amazon.aws.aws_secret', 'myapp/redis-password') }}"

    - name: Create vault-encrypted YAML file
      ansible.builtin.copy:
        content: |
          ---
          vault_db_password: {{ aws_db_pass | vault(vault_password) | indent(2) }}
          vault_api_key: {{ aws_api_key | vault(vault_password) | indent(2) }}
          vault_redis_password: {{ aws_redis_pass | vault(vault_password) | indent(2) }}
        dest: "{{ playbook_dir }}/group_vars/production/vault.yml"
        mode: '0644'
      no_log: true
```

## Generating Kubernetes Secrets with Vault Encryption

When you manage Kubernetes secrets through Ansible and want to keep them encrypted in git:

```yaml
# generate_k8s_vault_secrets.yml
# Creates vault-encrypted Kubernetes secret manifests
---
- name: Generate encrypted K8s secret manifests
  hosts: localhost
  vars:
    vault_password: "{{ lookup('file', '~/.vault_pass.txt') }}"
    app_secrets:
      DATABASE_URL: "postgresql://user:pass@db:5432/myapp"
      REDIS_URL: "redis://:password@redis:6379/0"
      SESSION_SECRET: "random-session-secret-value"

  tasks:
    - name: Create encrypted secrets variable file
      ansible.builtin.template:
        src: k8s_secrets_vault.yml.j2
        dest: "{{ playbook_dir }}/vars/k8s_secrets_vault.yml"
        mode: '0644'
      no_log: true
```

With the template:

```jinja2
{# k8s_secrets_vault.yml.j2 #}
---
{% for key, value in app_secrets.items() %}
vault_k8s_{{ key | lower }}: {{ value | vault(vault_password) }}
{% endfor %}
```

## Round-Trip: vault and unvault Together

You can verify the encrypt-decrypt round trip:

```yaml
# Demonstrate round-trip encryption and decryption
- name: Encrypt a value
  ansible.builtin.set_fact:
    encrypted: "{{ 'hello-world' | vault(vault_password) }}"

- name: Decrypt it back
  ansible.builtin.set_fact:
    decrypted: "{{ encrypted | unvault }}"

- name: Verify round trip
  ansible.builtin.assert:
    that:
      - decrypted == 'hello-world'
    fail_msg: "Round trip failed"
    success_msg: "Round trip successful"
```

## Automating Secret Rotation

The `vault` filter enables automated secret rotation workflows:

```yaml
# rotate_secrets.yml
# Generates new secrets and creates vault-encrypted files
---
- name: Rotate application secrets
  hosts: localhost
  vars:
    vault_password: "{{ lookup('file', '~/.vault_pass.txt') }}"

  tasks:
    - name: Generate new random passwords
      ansible.builtin.set_fact:
        new_db_password: "{{ lookup('password', '/dev/null length=32 chars=ascii_letters,digits') }}"
        new_api_key: "{{ lookup('password', '/dev/null length=48 chars=ascii_letters,digits') }}"
        new_session_secret: "{{ lookup('password', '/dev/null length=64 chars=ascii_letters,digits') }}"

    - name: Create encrypted variables file with new secrets
      ansible.builtin.copy:
        content: |
          ---
          vault_db_password: {{ new_db_password | vault(vault_password) }}
          vault_api_key: {{ new_api_key | vault(vault_password) }}
          vault_session_secret: {{ new_session_secret | vault(vault_password) }}
        dest: "{{ playbook_dir }}/group_vars/production/vault.yml"
        mode: '0644'
      no_log: true

    - name: Update the database with the new password
      community.postgresql.postgresql_user:
        name: app_user
        password: "{{ new_db_password }}"
      delegate_to: db_primary
      no_log: true
```

## Important Considerations

The `vault` filter has a few things to watch out for.

The vault password must be available as a plaintext string to the filter. This means your playbook needs access to the raw vault password, which has security implications. Be careful about how you source this password and make sure `no_log: true` is set on any task that handles it.

The encrypted output from the `vault` filter matches the format produced by `ansible-vault encrypt_string`, so files generated this way are fully compatible with standard vault operations.

Each call to the `vault` filter produces different encrypted output even for the same input and password. This is expected behavior because AES-256 uses a random salt. It means that running the same playbook twice will produce different encrypted strings, which can create noisy git diffs.

## Version Requirements

The `vault` filter requires Ansible core 2.12 or later. Check your version:

```bash
# Verify Ansible version supports the vault filter
ansible --version
# Look for "ansible [core 2.12.x]" or later
```

## Summary

The `vault` filter brings vault encryption into the Jinja2 expression layer, enabling you to encrypt values dynamically during playbook execution. Its primary value is in automation: generating vault-encrypted files, migrating secrets between systems, and building rotation workflows. Combined with the `unvault` filter, you have full programmatic control over vault encryption and decryption within your playbooks.
