# How to Use AWX with Ansible Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, Ansible Vault, Secrets, Encryption

Description: Integrate Ansible Vault encrypted files with AWX job templates using vault credentials for secure secret management in automated workflows.

---

Ansible Vault lets you encrypt sensitive data (passwords, API keys, certificates) inside your playbook files and variable files. When you move to AWX, you need a way to provide the vault password at job runtime without someone typing it in. AWX handles this with Vault credentials that automatically supply the password when a job template runs a playbook containing vault-encrypted content.

## How Vault Works in AWX

When AWX runs a playbook that contains vault-encrypted data, it needs the vault password to decrypt it. Instead of prompting interactively (which does not work in an automated system), AWX gets the password from a Vault credential attached to the job template. AWX passes the password to `ansible-playbook` through a password file, and decryption happens transparently.

The key thing to understand: AWX stores vault passwords encrypted in its own database, and injects them at runtime. The vault-encrypted files in your Git repository stay encrypted at rest.

## Creating a Vault Credential in AWX

```bash
# Create a Vault credential
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "Playbook Vault Password",
    "organization": 1,
    "credential_type": 3,
    "inputs": {
      "vault_password": "your-vault-password-here"
    }
  }'
```

Credential type 3 is "Vault" in AWX. The password is encrypted when stored in the AWX database.

## Using a Vault ID

If your project uses multiple vault passwords (common in multi-environment setups), specify the vault ID.

```bash
# Create a vault credential with a specific vault ID
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "Production Vault",
    "organization": 1,
    "credential_type": 3,
    "inputs": {
      "vault_password": "prod-vault-password",
      "vault_id": "production"
    }
  }'
```

```bash
# Create another for staging
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "Staging Vault",
    "organization": 1,
    "credential_type": 3,
    "inputs": {
      "vault_password": "staging-vault-password",
      "vault_id": "staging"
    }
  }'
```

The vault ID in AWX matches the vault ID used when encrypting the file.

```bash
# Encrypt a file with a vault ID (done on your workstation)
ansible-vault encrypt \
  --vault-id production@prompt \
  group_vars/production/secrets.yml
```

## Attaching Vault Credentials to Job Templates

A job template can have multiple credentials, including multiple vault credentials (one per vault ID).

```bash
# Attach the vault credential to a job template
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/job_templates/10/credentials/ \
  -d '{"id": 7}'

# Attach a second vault credential for a different vault ID
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/job_templates/10/credentials/ \
  -d '{"id": 8}'
```

## Vault-Encrypted Variable Files

The most common pattern is to encrypt variable files that contain secrets, while keeping the playbook itself unencrypted.

```yaml
# group_vars/production/vars.yml (unencrypted, non-sensitive)
---
app_port: 8080
app_workers: 4
app_log_level: info
```

```yaml
# group_vars/production/vault.yml (encrypted with ansible-vault)
# Before encryption, the contents look like this:
---
db_password: "s3cret-pr0d-passw0rd"
api_key: "sk_live_abc123"
ssl_certificate: |
  -----BEGIN CERTIFICATE-----
  MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiU...
  -----END CERTIFICATE-----
ssl_private_key: |
  -----BEGIN PRIVATE KEY-----
  MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...
  -----END PRIVATE KEY-----
```

Encrypt the secrets file.

```bash
# Encrypt the secrets file
ansible-vault encrypt group_vars/production/vault.yml

# Verify it is encrypted
head -1 group_vars/production/vault.yml
# Output: $ANSIBLE_VAULT;1.1;AES256
```

## Vault-Encrypted Strings

Instead of encrypting entire files, you can encrypt individual values within an otherwise-readable file. This is useful when you want to see the structure of the file without decrypting it.

```bash
# Encrypt a single string
ansible-vault encrypt_string \
  --vault-id production@prompt \
  'my-secret-password' \
  --name 'db_password'
```

This outputs a YAML-compatible encrypted value that you paste into your variables file.

```yaml
# group_vars/production/mixed.yml
---
app_name: myapp
app_port: 8080
db_password: !vault |
  $ANSIBLE_VAULT;1.2;AES256;production
  31663462613464326463393538353435376436396530333533
  6131363430393663303664366237336461373739353633350a
  ...
db_host: db.production.internal
```

AWX handles vault-encrypted strings exactly the same as vault-encrypted files. It uses the same vault credential to decrypt them.

## Playbook Using Vault Variables

The playbook does not need any special syntax to use vault-encrypted variables. Ansible decrypts them before the playbook sees them.

```yaml
# deploy.yml
---
- name: Deploy application with secrets
  hosts: webservers
  become: true

  tasks:
    - name: Configure database connection
      ansible.builtin.template:
        src: database.conf.j2
        dest: /etc/myapp/database.conf
        owner: myapp
        group: myapp
        mode: "0600"
      notify: Restart application

    - name: Set API key in environment
      ansible.builtin.lineinfile:
        path: /etc/myapp/env
        regexp: "^API_KEY="
        line: "API_KEY={{ api_key }}"
        mode: "0600"
      no_log: true

  handlers:
    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
```

Notice the `no_log: true` on the task that handles the API key. This prevents the secret from appearing in the AWX job output.

## Credential Flow

```mermaid
flowchart TD
    A[Job Template Launched] --> B[AWX Loads Vault Credential]
    B --> C[Decrypt Vault Password from AWX DB]
    C --> D[Create Temp Password File]
    D --> E[Pass --vault-password-file to ansible-playbook]
    E --> F[Ansible Decrypts Vault Files/Strings]
    F --> G[Playbook Runs with Decrypted Variables]
    G --> H[Clean Up Temp Files]
```

## Multiple Environments with Multiple Vault Passwords

Here is a common project layout for multi-environment deployments.

```text
project/
  playbooks/
    deploy.yml
    configure.yml
  group_vars/
    production/
      vars.yml          # unencrypted
      vault.yml          # encrypted with vault-id "production"
    staging/
      vars.yml          # unencrypted
      vault.yml          # encrypted with vault-id "staging"
    development/
      vars.yml          # unencrypted
      vault.yml          # encrypted with vault-id "development"
  inventories/
    production.yml
    staging.yml
```

In AWX, create three vault credentials (one per environment) and attach the appropriate ones to each job template.

For a production deploy template, attach the "Production Vault" credential. For staging, attach the "Staging Vault" credential. The job template's inventory determines which `group_vars` directory Ansible reads, and the matching vault credential decrypts the secrets in that directory.

## Rotating Vault Passwords

When you need to change a vault password (for example, when someone who knew it leaves the team), you need to re-encrypt the vault files and update the AWX credential.

```bash
# Re-encrypt with a new password (on your workstation)
ansible-vault rekey \
  --vault-id production@prompt \
  --new-vault-id production@prompt \
  group_vars/production/vault.yml

# Update the AWX credential with the new password
curl -s -X PATCH \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/7/ \
  -d '{"inputs": {"vault_password": "new-vault-password", "vault_id": "production"}}'
```

Commit the re-encrypted files to Git. The next time AWX syncs the project, it will use the new password.

## Vault vs AWX Credentials

You might wonder when to use Ansible Vault versus AWX's own credential system. Here is the difference:

- **Ansible Vault** - Secrets live in Git, encrypted. Good for configuration files, database passwords, and anything that is part of the playbook's variable structure. Versioned alongside your code.
- **AWX Credentials** - Secrets live in the AWX database. Good for SSH keys, cloud API keys, and credentials that are shared across many templates. Managed through the AWX UI/API.

Most production setups use both. Machine credentials and cloud credentials come from AWX. Application-specific secrets (database passwords, API tokens for the app being deployed) come from vault-encrypted files in the Git repository.

## Troubleshooting Vault in AWX

**"Attempting to decrypt but no vault secrets found"** - The vault credential is not attached to the job template, or the vault ID does not match.

**"Decryption failed"** - The vault password in the AWX credential does not match the password used to encrypt the file. Re-check the credential and the vault-encrypted file.

**Secrets showing in job output** - Add `no_log: true` to any task that handles sensitive data. AWX respects the `no_log` directive and replaces the output with "censored."

## Wrapping Up

Ansible Vault and AWX work together seamlessly. Encrypt your secrets in Git with vault, create corresponding vault credentials in AWX, and attach them to the right job templates. The secrets stay encrypted in your repository, and AWX provides the decryption password at runtime. Combine this with `no_log: true` on sensitive tasks, and you have secrets that are encrypted at rest, encrypted in transit, and hidden from job output.
