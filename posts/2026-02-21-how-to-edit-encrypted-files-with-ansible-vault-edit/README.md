# How to Edit Encrypted Files with ansible-vault edit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Encryption, Security, Secrets Management

Description: Learn how to safely edit Ansible Vault encrypted files using ansible-vault edit without ever leaving plain-text secrets on disk.

---

One of the most common operations with Ansible Vault is editing existing encrypted files. You need to add a new password, change an API key, or remove an old secret. The naive approach of decrypting, editing, and re-encrypting leaves a window where plain-text secrets sit on your filesystem. The `ansible-vault edit` command eliminates that risk by handling the entire decrypt-edit-encrypt cycle in a single atomic operation.

## How ansible-vault edit Works

When you run `ansible-vault edit`, here is what happens behind the scenes:

1. Ansible prompts for (or reads) the vault password
2. It decrypts the file to a temporary location
3. It opens the temporary file in your editor
4. When you save and close the editor, it re-encrypts the file
5. It overwrites the original with the newly encrypted version
6. It removes the temporary file

At no point does the decrypted content exist as the original file on disk. The plain text only lives in a temporary file while your editor is open, and that temporary file is cleaned up automatically.

## Basic Usage

```bash
# Edit an encrypted file
ansible-vault edit group_vars/production/vault.yml
```

Ansible asks for the vault password:

```
Vault password:
```

Your default editor opens with the decrypted content:

```yaml
# group_vars/production/vault.yml (temporarily decrypted)
vault_db_password: "current_password_123"
vault_api_key: "sk-abc123def456"
vault_smtp_password: "mail_pass_789"
```

Make your changes, save, and close the editor. Ansible re-encrypts the file immediately.

## Using a Password File

Avoid the password prompt by using a password file:

```bash
# Edit using a password file
ansible-vault edit --vault-password-file ~/.vault_pass.txt group_vars/production/vault.yml
```

Or configure it in `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
vault_password_file = ~/.vault_pass.txt
```

Then just:

```bash
ansible-vault edit group_vars/production/vault.yml
```

## Choosing Your Editor

`ansible-vault edit` uses the editor defined by the `$EDITOR` environment variable. If `$EDITOR` is not set, it falls back to `vi`.

```bash
# Use vim
EDITOR=vim ansible-vault edit secrets.yml

# Use nano (easier for quick edits)
EDITOR=nano ansible-vault edit secrets.yml

# Use VS Code (must wait for the file to close)
EDITOR="code --wait" ansible-vault edit secrets.yml

# Use Sublime Text
EDITOR="subl --wait" ansible-vault edit secrets.yml
```

Set your preferred editor permanently:

```bash
# Add to ~/.bashrc or ~/.zshrc
export EDITOR=vim
```

For VS Code, the `--wait` flag is crucial. Without it, VS Code opens the file and returns immediately, causing Ansible to think you are done editing and re-encrypt the file before you have made any changes.

## Editing Files with Vault IDs

When a file was encrypted with a specific vault ID:

```bash
# Edit a file encrypted with the "production" vault ID
ansible-vault edit --vault-id production@~/.vault_pass_prod.txt \
  group_vars/production/vault.yml

# Edit a file encrypted with the "staging" vault ID
ansible-vault edit --vault-id staging@prompt \
  group_vars/staging/vault.yml
```

The `@prompt` suffix tells Ansible to ask for the password interactively. The `@filepath` suffix reads the password from a file.

## Practical Editing Scenarios

### Adding a New Secret

Open the vault file and add a new line:

```bash
ansible-vault edit group_vars/production/vault.yml
```

Before:

```yaml
vault_db_password: "password_123"
vault_api_key: "sk-abc123"
```

After:

```yaml
vault_db_password: "password_123"
vault_api_key: "sk-abc123"
vault_redis_password: "new_redis_auth_token"
vault_stripe_secret_key: "sk_live_newstripekey123"
```

Then update your non-encrypted vars file to reference the new variables:

```yaml
# group_vars/production/vars.yml (not encrypted)
redis_password: "{{ vault_redis_password }}"
stripe_secret_key: "{{ vault_stripe_secret_key }}"
```

### Rotating a Secret

Open the file and change the value:

```bash
ansible-vault edit group_vars/production/vault.yml
```

Change:

```yaml
vault_db_password: "old_password_123"
```

To:

```yaml
vault_db_password: "new_rotated_password_456"
```

Save and close. Then run your playbook to deploy the new password:

```bash
ansible-playbook deploy.yml --tags database
```

### Removing a Secret

Open the file and delete the line:

```bash
ansible-vault edit group_vars/production/vault.yml
```

Remove the line with the old secret. Also update the vars file that references it.

## Editing Multiple Files

You can only edit one file at a time with `ansible-vault edit`. For bulk changes across multiple vault files, you can script it:

```bash
#!/bin/bash
# rotate-db-password.sh
# Update the database password in all environment vault files

NEW_PASSWORD="$1"
VAULT_PASS_FILE="$2"

if [ -z "$NEW_PASSWORD" ] || [ -z "$VAULT_PASS_FILE" ]; then
    echo "Usage: $0 <new_password> <vault_pass_file>"
    exit 1
fi

for env in production staging; do
    VAULT_FILE="group_vars/${env}/vault.yml"

    if [ -f "$VAULT_FILE" ]; then
        # Decrypt, modify, re-encrypt
        ansible-vault decrypt --vault-password-file "$VAULT_PASS_FILE" "$VAULT_FILE"
        sed -i "s/vault_db_password:.*/vault_db_password: \"${NEW_PASSWORD}\"/" "$VAULT_FILE"
        ansible-vault encrypt --vault-password-file "$VAULT_PASS_FILE" "$VAULT_FILE"
        echo "Updated: $VAULT_FILE"
    fi
done
```

This approach temporarily decrypts the file, which is not ideal. For a more secure approach, use Python with the Ansible Vault library:

```python
#!/usr/bin/env python3
# rotate_secret.py
# Update a secret across multiple vault files without temp files

import yaml
import sys
from ansible.constants import DEFAULT_VAULT_ID_MATCH
from ansible.parsing.vault import VaultLib, VaultSecret

def update_vault_file(filepath, key, new_value, password):
    vault_secret = VaultSecret(password.encode())
    vault = VaultLib([(DEFAULT_VAULT_ID_MATCH, vault_secret)])

    # Read and decrypt
    with open(filepath, 'rb') as f:
        encrypted_data = f.read()

    decrypted = vault.decrypt(encrypted_data)
    data = yaml.safe_load(decrypted)

    # Update the value
    data[key] = new_value

    # Re-encrypt and write
    new_content = yaml.dump(data, default_flow_style=False)
    encrypted = vault.encrypt(new_content.encode())

    with open(filepath, 'wb') as f:
        f.write(encrypted)

    print(f"Updated {key} in {filepath}")

if __name__ == "__main__":
    password = open(sys.argv[1]).read().strip()
    update_vault_file(
        "group_vars/production/vault.yml",
        "vault_db_password",
        "new_rotated_password",
        password
    )
```

## Working with ansible-vault edit in CI/CD

In a CI/CD pipeline, you typically do not edit vault files interactively. But automated secret rotation is a valid use case:

```yaml
# GitHub Actions example for automated secret rotation
- name: Rotate database password
  env:
    VAULT_PASSWORD: ${{ secrets.ANSIBLE_VAULT_PASSWORD }}
    NEW_DB_PASSWORD: ${{ secrets.NEW_DB_PASSWORD }}
  run: |
    echo "$VAULT_PASSWORD" > /tmp/vault_pass.txt

    # Decrypt, update, re-encrypt
    ansible-vault decrypt --vault-password-file /tmp/vault_pass.txt \
      group_vars/production/vault.yml

    # Use yq to update the specific value
    yq e ".vault_db_password = \"$NEW_DB_PASSWORD\"" -i \
      group_vars/production/vault.yml

    ansible-vault encrypt --vault-password-file /tmp/vault_pass.txt \
      group_vars/production/vault.yml

    rm /tmp/vault_pass.txt
```

## What Happens If the Editor Crashes?

If your editor crashes or you close the terminal without saving, Ansible cleans up the temporary file. The original encrypted file remains unchanged. No data is lost and no secrets are exposed.

If you save the file but the re-encryption fails (very rare), Ansible will print an error and the temporary file might be left behind. Check `/tmp` for any leftover files and remove them:

```bash
# Check for leftover temporary files
ls -la /tmp/tmp*vault* 2>/dev/null
```

## Diff After Editing

After editing a vault file, Git will show the entire file as changed because the encrypted content is completely different, even if you only changed one line. This is expected behavior because AES encryption uses random initialization vectors, so the same content encrypts differently each time.

To see what actually changed:

```bash
# Compare the decrypted old version with the decrypted new version
git stash
ansible-vault view group_vars/production/vault.yml > /tmp/old.yml
git stash pop
ansible-vault view group_vars/production/vault.yml > /tmp/new.yml
diff /tmp/old.yml /tmp/new.yml
rm /tmp/old.yml /tmp/new.yml
```

## Tips for Efficient Editing

Keep vault files small and focused. One vault file per environment or per service is easier to manage than one giant vault file with everything. Use a consistent naming convention (prefix with `vault_`) so you can quickly identify which variables come from vault files. When editing, double-check the YAML syntax before saving. A syntax error in a vault file is frustrating to debug because you cannot just open the file and look at it.

The `ansible-vault edit` command is the safest way to modify encrypted secrets. It keeps plain text off your filesystem, handles cleanup automatically, and integrates with your preferred editor. Use it as your default workflow for any vault file changes.
