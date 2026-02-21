# How to Use the Ansible unvault Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Vault, Security

Description: Learn how to use the Ansible unvault lookup plugin to decrypt vault-encrypted files inline and access their contents in your playbooks.

---

Ansible Vault lets you encrypt sensitive data like passwords, API keys, and certificates so you can store them safely in version control. Normally, Ansible decrypts vault files automatically when they are included as variable files. But what about vault-encrypted files that are not variable files, such as encrypted certificates, license keys, or arbitrary text? The `unvault` lookup plugin decrypts any vault-encrypted file and returns its raw contents as a string.

## What the unvault Lookup Does

The `unvault` lookup reads a file that has been encrypted with `ansible-vault encrypt`, decrypts it using the configured vault password, and returns the plaintext contents. Unlike `include_vars` which expects YAML format, `unvault` returns the raw decrypted contents as-is, making it suitable for any file type.

## Encrypting Files for Use with unvault

Before using the lookup, you need to encrypt your files with Ansible Vault.

```bash
# Encrypt a file with ansible-vault
ansible-vault encrypt secrets/api_key.txt

# Encrypt a certificate file
ansible-vault encrypt secrets/server.crt

# Encrypt with a specific vault ID
ansible-vault encrypt --vault-id prod@prompt secrets/prod_database.conf

# View encrypted file contents (for verification)
ansible-vault view secrets/api_key.txt
```

## Basic Usage

The simplest form decrypts a vault-encrypted file and returns its contents.

This playbook reads a vault-encrypted API key:

```yaml
# playbook.yml - Read a vault-encrypted file
---
- name: Deploy application with vault-encrypted secrets
  hosts: appservers
  tasks:
    - name: Display decrypted API key
      ansible.builtin.debug:
        msg: "API Key: {{ lookup('unvault', 'secrets/api_key.txt') }}"
      no_log: true

    - name: Deploy API key to application config
      ansible.builtin.copy:
        content: "{{ lookup('unvault', 'secrets/api_key.txt') }}"
        dest: /etc/myapp/api_key
        mode: '0600'
        owner: myapp
        group: myapp
```

Run it with:

```bash
# Provide the vault password at runtime
ansible-playbook playbook.yml --ask-vault-pass

# Or use a vault password file
ansible-playbook playbook.yml --vault-password-file ~/.vault_pass
```

## Deploying Encrypted Certificates

SSL certificates and private keys are ideal candidates for vault encryption.

```yaml
# playbook.yml - Deploy vault-encrypted SSL certificates
---
- name: Deploy SSL certificates
  hosts: webservers
  tasks:
    - name: Deploy SSL certificate
      ansible.builtin.copy:
        content: "{{ lookup('unvault', 'secrets/ssl/' + inventory_hostname + '.crt') }}"
        dest: /etc/ssl/certs/server.crt
        mode: '0644'
        owner: root
        group: root

    - name: Deploy SSL private key
      ansible.builtin.copy:
        content: "{{ lookup('unvault', 'secrets/ssl/' + inventory_hostname + '.key') }}"
        dest: /etc/ssl/private/server.key
        mode: '0600'
        owner: root
        group: root
      no_log: true

    - name: Deploy CA bundle
      ansible.builtin.copy:
        content: "{{ lookup('unvault', 'secrets/ssl/ca-bundle.crt') }}"
        dest: /etc/ssl/certs/ca-bundle.crt
        mode: '0644'
      notify: reload nginx
```

## Configuration Files with Embedded Secrets

When you have entire configuration files that contain secrets and should be encrypted:

```yaml
# playbook.yml - Deploy vault-encrypted configuration files
---
- name: Deploy encrypted application configs
  hosts: appservers
  tasks:
    - name: Deploy database configuration (contains credentials)
      ansible.builtin.copy:
        content: "{{ lookup('unvault', 'secrets/configs/database.yml') }}"
        dest: /etc/myapp/database.yml
        mode: '0600'
        owner: myapp
        group: myapp
      no_log: true

    - name: Deploy Redis configuration (contains password)
      ansible.builtin.copy:
        content: "{{ lookup('unvault', 'secrets/configs/redis.conf') }}"
        dest: /etc/redis/redis.conf
        mode: '0600'
        owner: redis
        group: redis
      no_log: true
      notify: restart redis
```

## Per-Environment Secrets

Organize encrypted files by environment and select the right one dynamically.

Directory structure:

```
secrets/
  production/
    database.conf    # vault-encrypted
    api_keys.yml     # vault-encrypted
    jwt_secret.txt   # vault-encrypted
  staging/
    database.conf    # vault-encrypted
    api_keys.yml     # vault-encrypted
    jwt_secret.txt   # vault-encrypted
```

```yaml
# playbook.yml - Environment-specific vault-encrypted secrets
---
- name: Deploy environment-specific secrets
  hosts: all
  vars:
    env: "{{ target_env | default('staging') }}"
    secrets_dir: "secrets/{{ env }}"
  tasks:
    - name: Deploy database config
      ansible.builtin.copy:
        content: "{{ lookup('unvault', secrets_dir + '/database.conf') }}"
        dest: /etc/myapp/database.conf
        mode: '0600'
        owner: myapp
      no_log: true

    - name: Deploy JWT secret
      ansible.builtin.copy:
        content: "{{ lookup('unvault', secrets_dir + '/jwt_secret.txt') | trim }}"
        dest: /etc/myapp/jwt_secret
        mode: '0600'
        owner: myapp
      no_log: true
```

## Using with Templates

You can use decrypted content within Jinja2 templates by passing it as a variable.

```yaml
# playbook.yml - Use vault content in templates
---
- name: Generate configs with vault secrets
  hosts: appservers
  vars:
    db_password: "{{ lookup('unvault', 'secrets/db_password.txt') | trim }}"
    api_secret: "{{ lookup('unvault', 'secrets/api_secret.txt') | trim }}"
  tasks:
    - name: Template application config with secrets
      ansible.builtin.template:
        src: app_config.j2
        dest: /etc/myapp/config.yml
        mode: '0600'
        owner: myapp
      no_log: true
```

The template:

```yaml
# templates/app_config.j2
database:
  host: db.internal.example.com
  port: 5432
  name: myapp
  password: "{{ db_password }}"

security:
  api_secret: "{{ api_secret }}"
  session_timeout: 3600
```

## Multiple Vault IDs

If you use different vault passwords for different environments, you can leverage multiple vault IDs.

```bash
# Encrypt production secrets with production vault ID
ansible-vault encrypt --vault-id prod@prod_vault_pass secrets/production/database.conf

# Encrypt staging secrets with staging vault ID
ansible-vault encrypt --vault-id staging@staging_vault_pass secrets/staging/database.conf
```

```bash
# Run playbook with multiple vault IDs
ansible-playbook playbook.yml \
  --vault-id prod@prod_vault_pass \
  --vault-id staging@staging_vault_pass
```

Ansible automatically determines which vault ID to use for decryption based on the vault ID stored in the encrypted file header.

## Difference Between unvault and file Lookups

Here is how `unvault` compares to the regular `file` lookup:

```yaml
# playbook.yml - Compare unvault and file
---
- name: Compare lookup behaviors
  hosts: localhost
  tasks:
    # file lookup: returns raw file contents (would show encrypted blob)
    - name: Read with file lookup (shows encrypted content)
      ansible.builtin.debug:
        msg: "{{ lookup('file', 'secrets/api_key.txt') }}"
      # This shows: $ANSIBLE_VAULT;1.1;AES256 followed by encrypted data

    # unvault lookup: decrypts and returns plaintext
    - name: Read with unvault lookup (shows decrypted content)
      ansible.builtin.debug:
        msg: "{{ lookup('unvault', 'secrets/api_key.txt') }}"
      no_log: true
      # This shows the actual API key value
```

## Deploying SSH Keys

Deploy vault-encrypted SSH keys to servers:

```yaml
# playbook.yml - Deploy SSH keys from vault
---
- name: Deploy SSH keys
  hosts: all
  tasks:
    - name: Deploy deploy user private key
      ansible.builtin.copy:
        content: "{{ lookup('unvault', 'secrets/ssh/deploy_id_rsa') }}"
        dest: /home/deploy/.ssh/id_rsa
        mode: '0600'
        owner: deploy
        group: deploy
      no_log: true

    - name: Deploy deploy user public key
      ansible.builtin.copy:
        content: "{{ lookup('unvault', 'secrets/ssh/deploy_id_rsa.pub') }}"
        dest: /home/deploy/.ssh/id_rsa.pub
        mode: '0644'
        owner: deploy
        group: deploy
```

## Working with Binary Files

Be cautious with binary files. The `unvault` lookup returns the content as a string, which can corrupt binary data. For binary files, consider using the `copy` module with `decrypt: yes` instead:

```yaml
# playbook.yml - Handling binary vs text vault files
---
- name: Deploy encrypted files
  hosts: all
  tasks:
    # For text files: unvault works well
    - name: Deploy text-based secret
      ansible.builtin.copy:
        content: "{{ lookup('unvault', 'secrets/text_config.conf') }}"
        dest: /etc/myapp/config.conf
        mode: '0600'

    # For binary files: use copy module with decrypt parameter
    - name: Deploy binary file (like a keystore)
      ansible.builtin.copy:
        src: secrets/keystore.jks
        dest: /etc/myapp/keystore.jks
        mode: '0600'
        decrypt: true
```

## Security Best Practices

1. **Always use no_log**: When debugging tasks that handle decrypted secrets, set `no_log: true` to prevent secrets from appearing in Ansible output.

2. **Vault password management**: Never store your vault password in the repository. Use a password file outside the repo, an environment variable, or a script that retrieves it from a secrets manager.

3. **Encrypt at the file level**: Rather than encrypting individual strings within YAML files (inline vault), encrypting entire files with `unvault` gives you a clearer audit trail of which files contain secrets.

4. **Git history**: Once a file is encrypted, make sure it was never committed in plaintext. Check your git history.

5. **Restrict file permissions**: Always set restrictive modes (0600) on deployed secret files.

The `unvault` lookup plugin fills the gap between Ansible Vault's automatic decryption of variable files and the need to decrypt arbitrary file types. Whether it is certificates, configuration files with embedded credentials, or raw secret values, `unvault` makes them accessible in your playbooks while keeping them encrypted at rest.
