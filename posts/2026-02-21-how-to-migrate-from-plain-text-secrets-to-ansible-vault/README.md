# How to Migrate from Plain Text Secrets to Ansible Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Vault, Security, Migration

Description: Step-by-step guide to migrating existing plain text secrets in your Ansible project to encrypted Ansible Vault files without breaking your playbooks.

---

Every Ansible project starts somewhere. In the early days, it is common to have passwords, API keys, and tokens sitting in plain text inside variable files. Maybe the project started as a quick prototype. Maybe the team just did not get around to encrypting things. Whatever the reason, you now have secrets scattered across your codebase in the clear, and you need to fix that without breaking anything.

This guide walks through a methodical approach to migrating from plain text secrets to Ansible Vault. The goal is zero downtime and zero broken playbooks.

## Assessing What Needs to Be Migrated

Before you start encrypting things, you need to know what you are dealing with. Secrets can hide in several places within an Ansible project:

- `group_vars/` directories
- `host_vars/` directories
- Role `defaults/` and `vars/` directories
- Inline variables in playbooks
- Inventory files

Run a quick scan to find likely candidates:

```bash
# Search for common secret-related variable names in your project
grep -rn "password\|secret\|token\|api_key\|private_key" \
  group_vars/ host_vars/ roles/ --include="*.yml" --include="*.yaml"
```

Make a list of every file and variable that contains sensitive data. You will work through this list systematically.

## The Migration Strategy

The cleanest approach is to use a separate vault file alongside your existing variable files. Ansible supports loading multiple variable files from the same directory, so you can have both `vars.yml` and `vault.yml` in `group_vars/all/`. The convention is to prefix vault variables with `vault_` and then reference them in the regular variables file.

Here is the before and after structure:

```
# BEFORE - secrets in plain text
group_vars/
  all/
    vars.yml         # contains db_password: "plaintext123"

# AFTER - secrets encrypted in vault
group_vars/
  all/
    vars.yml         # contains db_password: "{{ vault_db_password }}"
    vault.yml        # encrypted, contains vault_db_password: "plaintext123"
```

## Step 1: Create a Vault Password File

First, set up a vault password so you do not have to type it every time:

```bash
# Generate a strong random password and save it to a file
openssl rand -base64 32 > ~/.ansible/vault_password
chmod 600 ~/.ansible/vault_password
```

Configure Ansible to use this password file automatically:

```ini
# ansible.cfg - point to your vault password file
[defaults]
vault_password_file = ~/.ansible/vault_password
```

Add the password file to your `.gitignore` so it never gets committed:

```bash
# Make sure the vault password file is never committed
echo ".ansible/vault_password" >> .gitignore
echo "*.vault_password" >> .gitignore
```

## Step 2: Create the Vault File

For each directory that contains secrets, create a vault file. Let us start with `group_vars/all/`:

```bash
# Create a new encrypted vault file
ansible-vault create group_vars/all/vault.yml
```

This opens your editor. Add all the secrets with the `vault_` prefix:

```yaml
# group_vars/all/vault.yml - this file will be encrypted
vault_db_password: "plaintext123"
vault_api_key: "sk-live-abc123"
vault_smtp_password: "mailpass456"
vault_ssl_cert_key: |
  -----BEGIN PRIVATE KEY-----
  MIIEvQIBADANBgkqhkiG9w0BAQEFAASC...
  -----END PRIVATE KEY-----
```

## Step 3: Update the Original Variables File

Now update `vars.yml` to reference the vault variables instead of containing the secrets directly:

```yaml
# group_vars/all/vars.yml - BEFORE migration
db_password: "plaintext123"
api_key: "sk-live-abc123"
smtp_password: "mailpass456"
ssl_cert_key: |
  -----BEGIN PRIVATE KEY-----
  MIIEvQIBADANBgkqhkiG9w0BAQEFAASC...
  -----END PRIVATE KEY-----
app_name: "mywebapp"
app_port: 8080
```

```yaml
# group_vars/all/vars.yml - AFTER migration
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
smtp_password: "{{ vault_smtp_password }}"
ssl_cert_key: "{{ vault_ssl_cert_key }}"
app_name: "mywebapp"
app_port: 8080
```

Notice that `app_name` and `app_port` stay as they are since they are not secrets.

## Step 4: Handle Secrets in Roles

Roles often have secrets in their `defaults/main.yml` or `vars/main.yml`. The same pattern applies:

```yaml
# roles/database/defaults/main.yml - BEFORE
mysql_root_password: "rootpass"
mysql_app_user: "appuser"
mysql_app_password: "appuserpass"
mysql_port: 3306
```

Move the secrets to a vault file at the group or host level, and reference them:

```yaml
# roles/database/defaults/main.yml - AFTER
mysql_root_password: ""  # Override from group_vars vault
mysql_app_user: "appuser"
mysql_app_password: ""   # Override from group_vars vault
mysql_port: 3306
```

```yaml
# group_vars/all/vault.yml - add these entries
vault_mysql_root_password: "rootpass"
vault_mysql_app_password: "appuserpass"
```

```yaml
# group_vars/all/vars.yml - add these references
mysql_root_password: "{{ vault_mysql_root_password }}"
mysql_app_password: "{{ vault_mysql_app_password }}"
```

## Step 5: Migrate Inline Playbook Secrets

Sometimes secrets are embedded directly in playbooks. Extract them into variables:

```yaml
# BEFORE - secret hardcoded in a playbook task
- name: Create database user
  community.mysql.mysql_user:
    name: appuser
    password: "hardcoded-password-here"
    priv: "mydb.*:ALL"
```

```yaml
# AFTER - secret pulled from vault variable
- name: Create database user
  community.mysql.mysql_user:
    name: appuser
    password: "{{ vault_mysql_app_password }}"
    priv: "mydb.*:ALL"
  no_log: true
```

## Step 6: Test Before Committing

Before you commit any changes, verify that everything still works:

```bash
# Dry run to check for variable resolution errors
ansible-playbook site.yml --check --diff

# Run against a staging environment first
ansible-playbook site.yml --limit staging

# Verify that vault-encrypted files decrypt properly
ansible-vault view group_vars/all/vault.yml
```

If you get errors about undefined variables, double-check that the vault variable names match exactly and that the vault file is in the right directory.

## Step 7: Clean Git History (Optional but Recommended)

Even after encrypting secrets, the plain text versions still exist in your git history. If this is a concern, you have a few options:

```bash
# Option 1: Use git-filter-repo to remove the old plain text file from history
# Install git-filter-repo first: pip install git-filter-repo
git filter-repo --path group_vars/all/vars.yml --invert-paths

# Option 2: If the repo is private and history cleanup is too disruptive,
# rotate all the secrets instead. This is often the more practical choice.
```

Rotating secrets is usually the better option. Change every password, key, and token that was ever in plain text, then update the vault file with the new values.

## Step 8: Encrypt Existing Files In-Place

If you prefer to encrypt an entire existing file rather than creating a separate vault file, you can encrypt it in place:

```bash
# Encrypt an existing plain text YAML file
ansible-vault encrypt group_vars/production/secrets.yml

# The file is now encrypted and can only be read with the vault password
cat group_vars/production/secrets.yml
# Output: $ANSIBLE_VAULT;1.1;AES256
# 34623463643438613765...
```

This approach is simpler but has a downside: you cannot easily see which variables exist in the file without decrypting it first.

## Migration Checklist

Here is a checklist to make sure you have not missed anything:

```yaml
# migration-checklist.yml - track your progress
migration_tasks:
  - scan all group_vars for secrets
  - scan all host_vars for secrets
  - scan all role defaults and vars for secrets
  - scan playbooks for inline secrets
  - scan inventory files for secrets
  - create vault password file
  - configure ansible.cfg for vault
  - create vault files for each scope
  - update variable references
  - add no_log to sensitive tasks
  - test in staging
  - rotate all previously exposed secrets
  - update CI/CD pipeline with vault password
  - update team documentation
```

## Updating CI/CD Pipelines

Your CI/CD system needs the vault password to run playbooks. Most CI platforms support secret environment variables:

```bash
# In your CI pipeline, write the vault password from an environment variable
echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_password
chmod 600 /tmp/vault_password

# Run the playbook with the vault password file
ansible-playbook site.yml --vault-password-file /tmp/vault_password

# Clean up after the run
rm -f /tmp/vault_password
```

## Summary

Migrating from plain text secrets to Ansible Vault is straightforward when you approach it methodically. Use the `vault_` prefix convention to keep things organized, move secrets into dedicated vault files, update your variable references, add `no_log` to sensitive tasks, and test thoroughly before deploying. The most commonly overlooked step is rotating the secrets that were previously in plain text, so make sure that is on your list.
