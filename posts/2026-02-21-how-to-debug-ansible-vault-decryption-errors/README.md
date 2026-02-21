# How to Debug Ansible Vault Decryption Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Encryption, Security

Description: Learn how to diagnose and fix Ansible Vault decryption errors including wrong passwords, corrupted files, and vault ID mismatches.

---

Ansible Vault encrypts sensitive data like passwords, API keys, and certificates so you can store them safely in version control. When decryption fails, your playbook stops dead because it cannot access the secrets it needs. The error messages for vault failures are intentionally vague (for security reasons), which makes debugging harder. This post covers every common vault decryption error and how to fix it.

## The Common Error Messages

Vault decryption failures typically produce one of these errors:

```
ERROR! Decryption failed on /home/deploy/group_vars/production/vault.yml

ERROR! Attempting to decrypt but no vault secrets found

ERROR! input is not vault encrypted data

fatal: [web-01]: FAILED! => {"msg": "Attempting to decrypt but no vault secrets found"}
```

## Cause 1: Wrong Vault Password

The most common issue. You are providing the wrong password.

**Diagnosis:**

```bash
# Try to view an encrypted file manually
ansible-vault view group_vars/production/vault.yml
# Enter the password when prompted

# If this fails, you have the wrong password
```

**Testing your password file:**

```bash
# If using a password file
ansible-vault view --vault-password-file=.vault_pass group_vars/production/vault.yml

# Check what password file is configured
grep vault_password_file ansible.cfg
```

**Common reasons for wrong password:**
- Different password was used to encrypt different files
- Password file has a trailing newline
- Password file has wrong encoding

**Fix trailing newline issues:**

```bash
# Check if password file has extra whitespace
cat -A .vault_pass
# If you see a '$' at the end, there is a newline (which is normal)
# But if you see '^M$' there is a Windows carriage return

# Write password without trailing newline
echo -n "mypassword" > .vault_pass
chmod 600 .vault_pass
```

## Cause 2: No Vault Password Provided

```
ERROR! Attempting to decrypt but no vault secrets found
```

You have encrypted content but did not tell Ansible how to decrypt it.

**Fix 1: Pass the password on the command line:**

```bash
# Prompt for password
ansible-playbook deploy.yml --ask-vault-pass

# Use a password file
ansible-playbook deploy.yml --vault-password-file=.vault_pass
```

**Fix 2: Configure in ansible.cfg:**

```ini
# ansible.cfg
[defaults]
vault_password_file = .vault_pass
```

**Fix 3: Use an environment variable:**

```bash
export ANSIBLE_VAULT_PASSWORD_FILE=.vault_pass
ansible-playbook deploy.yml
```

## Cause 3: Vault ID Mismatch

If you use multiple vault IDs (different passwords for different environments), a mismatch produces:

```
ERROR! Decryption failed (no vault secrets were found that could decrypt)
```

**Understanding vault IDs:**

```bash
# Encrypt with a specific vault ID
ansible-vault encrypt --vault-id prod@.vault_pass_prod group_vars/production/vault.yml
ansible-vault encrypt --vault-id dev@.vault_pass_dev group_vars/development/vault.yml
```

**Fix: Provide all vault IDs when running:**

```bash
# Provide multiple vault passwords
ansible-playbook deploy.yml \
  --vault-id prod@.vault_pass_prod \
  --vault-id dev@.vault_pass_dev
```

Or configure in ansible.cfg:

```ini
# ansible.cfg
[defaults]
vault_identity_list = prod@.vault_pass_prod, dev@.vault_pass_dev
```

**Check which vault ID was used for a file:**

```bash
# The first line of an encrypted file shows the vault ID
head -1 group_vars/production/vault.yml
# $ANSIBLE_VAULT;1.2;AES256;prod
# The "prod" at the end is the vault ID
```

## Cause 4: Corrupted Vault File

If a vault file was partially edited, merged with git conflicts, or truncated:

```
ERROR! input is not vault encrypted data
```

**Diagnosis:**

```bash
# Check the file header
head -1 group_vars/production/vault.yml
# Should be: $ANSIBLE_VAULT;1.1;AES256

# Check for git merge conflicts
grep -n "<<<<<<" group_vars/production/vault.yml
grep -n "======" group_vars/production/vault.yml
grep -n ">>>>>>" group_vars/production/vault.yml
```

**Fix: If the file has merge conflicts:**

```bash
# Check out the version you want
git checkout --theirs group_vars/production/vault.yml
# Or
git checkout --ours group_vars/production/vault.yml

# Resolve manually if needed by taking one complete encrypted block
```

**Fix: If the file is truncated or corrupted, restore from git:**

```bash
# Restore from the last known good commit
git checkout HEAD~1 -- group_vars/production/vault.yml
```

## Cause 5: Encrypted File Inside Unencrypted File

When you embed an encrypted string in a YAML file, the formatting must be exact:

```yaml
# WRONG: Broken indentation
db_password: !vault |
$ANSIBLE_VAULT;1.1;AES256
61666131653839613565386...

# CORRECT: Proper indentation (all encrypted lines indented)
db_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  61666131653839613565386...
  33363733626339616233653...
```

**Fix: Re-encrypt the string:**

```bash
# Encrypt a string and get proper YAML formatting
ansible-vault encrypt_string 'my_secret_password' --name 'db_password'

# Output (copy this exactly):
# db_password: !vault |
#   $ANSIBLE_VAULT;1.1;AES256
#   6166613165383961...
```

## Cause 6: Mixed Encrypted and Unencrypted Content

You cannot mix encrypted vault content with plain text in the same file (when encrypting the entire file):

```bash
# This file is entirely encrypted
ansible-vault encrypt group_vars/production/vault.yml

# You cannot edit it with a regular text editor
# Use ansible-vault edit instead
ansible-vault edit group_vars/production/vault.yml
```

**Best practice: Separate vault files from variable files:**

```
group_vars/
  production/
    vars.yml        # Plain text, references vault variables
    vault.yml       # Entirely encrypted
```

```yaml
# group_vars/production/vars.yml (plain text)
db_host: db-primary.internal
db_port: 5432
db_name: myapp
db_user: "{{ vault_db_user }}"
db_password: "{{ vault_db_password }}"

# group_vars/production/vault.yml (encrypted)
vault_db_user: myapp_prod
vault_db_password: supersecret123
vault_api_key: abc123def456
```

## Cause 7: Password File Executable Issues

If using a script as a vault password source:

```ini
# ansible.cfg
[defaults]
vault_password_file = ./vault_password_script.sh
```

The script must be executable and output only the password:

```bash
#!/bin/bash
# vault_password_script.sh
# Must output ONLY the password, nothing else

# Example: Read from environment variable
echo "$VAULT_PASSWORD"

# Example: Read from a secrets manager
aws secretsmanager get-secret-value --secret-id ansible-vault --query SecretString --output text
```

```bash
# Make it executable
chmod +x vault_password_script.sh

# Test it manually
./vault_password_script.sh
# Should output just the password, no extra lines or whitespace
```

## Diagnostic Commands

```bash
# Verify you can decrypt a file
ansible-vault view group_vars/production/vault.yml

# Check if a file is encrypted
file group_vars/production/vault.yml
# Output: "group_vars/production/vault.yml: ASCII text"
# (All vault files appear as ASCII text)

# Check the vault header
head -1 group_vars/production/vault.yml

# Try to decrypt with a specific password
echo "mypassword" | ansible-vault view --vault-password-file=/dev/stdin group_vars/production/vault.yml

# Re-encrypt with a new password
ansible-vault rekey group_vars/production/vault.yml
```

## Rekeying Vault Files

If you need to change the vault password:

```bash
# Rekey a single file
ansible-vault rekey group_vars/production/vault.yml

# Rekey with password files
ansible-vault rekey \
  --vault-password-file=old_password.txt \
  --new-vault-password-file=new_password.txt \
  group_vars/production/vault.yml

# Rekey all vault files at once
find . -name "vault.yml" -exec ansible-vault rekey {} \;
```

## Debugging in CI/CD Pipelines

Vault issues in CI/CD are tricky because you cannot interactively enter passwords:

```yaml
# GitHub Actions example
- name: Create vault password file
  run: echo "${{ secrets.ANSIBLE_VAULT_PASSWORD }}" > .vault_pass

- name: Set permissions
  run: chmod 600 .vault_pass

- name: Run playbook
  run: ansible-playbook deploy.yml --vault-password-file=.vault_pass

- name: Clean up vault password
  if: always()
  run: rm -f .vault_pass
```

```yaml
# GitLab CI example
ansible-deploy:
  script:
    - echo "$ANSIBLE_VAULT_PASSWORD" > .vault_pass
    - chmod 600 .vault_pass
    - ansible-playbook deploy.yml --vault-password-file=.vault_pass
  after_script:
    - rm -f .vault_pass
  variables:
    ANSIBLE_VAULT_PASSWORD: $VAULT_PASSWORD  # From CI/CD settings
```

## Summary

Vault decryption errors are most commonly caused by wrong passwords, missing password files, vault ID mismatches, or corrupted encrypted content. Debug by first testing decryption manually with `ansible-vault view`, checking that your password file has no trailing whitespace or encoding issues, and verifying vault IDs match between encryption and decryption. Keep vault files separate from plain variable files, use scripts for password retrieval in automated environments, and always clean up password files after use in CI/CD pipelines.
