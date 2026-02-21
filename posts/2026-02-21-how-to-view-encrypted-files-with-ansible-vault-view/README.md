# How to View Encrypted Files with ansible-vault view

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Encryption, Security, Secrets Management

Description: Learn how to safely view the contents of Ansible Vault encrypted files without permanently decrypting them using ansible-vault view.

---

When you need to check the contents of an Ansible Vault encrypted file, your first instinct might be to decrypt it. But that leaves plain-text secrets on disk, which is a security risk. The `ansible-vault view` command solves this by decrypting the file to stdout only. The encrypted file on disk stays encrypted. Nothing changes. You just see the contents in your terminal and move on.

## Basic Usage

```bash
# View the contents of an encrypted file
ansible-vault view group_vars/production/vault.yml
```

Ansible prompts for the vault password:

```
Vault password:
```

Then displays the decrypted content:

```yaml
vault_db_password: "super_secret_password_123"
vault_api_key: "sk-abc123def456ghi789"
vault_smtp_password: "mail_secret_789"
vault_redis_password: "redis_auth_token_456"
```

The file on disk is still encrypted. No temporary files are created. No changes are made.

## Using a Password File

Skip the password prompt by using a password file:

```bash
# View using a password file
ansible-vault view --vault-password-file ~/.vault_pass.txt group_vars/production/vault.yml
```

Or configure the password file in `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
vault_password_file = ~/.vault_pass.txt
```

Then simply:

```bash
ansible-vault view group_vars/production/vault.yml
```

## Viewing Files with Vault IDs

If the file was encrypted with a specific vault ID:

```bash
# View with a specific vault ID
ansible-vault view --vault-id production@~/.vault_pass_prod.txt \
  group_vars/production/vault.yml

# Prompt for the password interactively
ansible-vault view --vault-id production@prompt \
  group_vars/production/vault.yml
```

Check which vault ID a file uses by looking at its header:

```bash
# Peek at the vault header without decrypting
head -1 group_vars/production/vault.yml
```

For a file with a vault ID:
```
$ANSIBLE_VAULT;1.2;AES256;production
```

For a file without a vault ID:
```
$ANSIBLE_VAULT;1.1;AES256
```

## Piping and Redirecting Output

Since `ansible-vault view` outputs to stdout, you can pipe and redirect:

```bash
# Search for a specific variable in the encrypted file
ansible-vault view group_vars/production/vault.yml | grep "db_password"

# Count the number of secrets
ansible-vault view group_vars/production/vault.yml | grep -c "vault_"

# Save to a temporary file for comparison (clean up after!)
ansible-vault view group_vars/production/vault.yml > /tmp/secrets.yml
# ... do what you need ...
rm /tmp/secrets.yml

# View with syntax highlighting using bat
ansible-vault view group_vars/production/vault.yml | bat --language yaml
```

## Comparing Secrets Across Environments

One of the most useful applications of `ansible-vault view` is comparing secrets between environments:

```bash
# Compare production and staging secrets side by side
diff <(ansible-vault view group_vars/production/vault.yml) \
     <(ansible-vault view group_vars/staging/vault.yml)
```

This uses process substitution to diff the decrypted contents without creating any files. The output shows exactly which secrets differ between environments:

```diff
< vault_db_password: "prod_password_xyz"
---
> vault_db_password: "staging_password_abc"
< vault_api_key: "sk-live-production123"
---
> vault_api_key: "sk-test-staging456"
```

For a side-by-side view:

```bash
# Side-by-side comparison
sdiff <(ansible-vault view group_vars/production/vault.yml) \
      <(ansible-vault view group_vars/staging/vault.yml)
```

## Viewing Multiple Files

`ansible-vault view` only accepts one file at a time. To view multiple files, loop through them:

```bash
# View all vault files in the project
for file in group_vars/*/vault.yml; do
    echo "=== $file ==="
    ansible-vault view --vault-password-file ~/.vault_pass.txt "$file"
    echo ""
done
```

Or create a small script:

```bash
#!/bin/bash
# view-all-vaults.sh
# Display contents of all encrypted vault files

VAULT_PASS_FILE="${1:-~/.vault_pass.txt}"

find . -name "vault.yml" -type f | sort | while read -r file; do
    if head -1 "$file" | grep -q '^\$ANSIBLE_VAULT'; then
        echo "================================================================"
        echo "File: $file"
        echo "================================================================"
        ansible-vault view --vault-password-file "$VAULT_PASS_FILE" "$file"
        echo ""
    fi
done
```

```bash
chmod +x view-all-vaults.sh
./view-all-vaults.sh
```

## Auditing Secrets

Use `ansible-vault view` for security audits. Here is a script that checks for common issues:

```bash
#!/bin/bash
# audit-vault-secrets.sh
# Audit vault files for security issues

VAULT_PASS_FILE="${1:-~/.vault_pass.txt}"

find . -name "vault.yml" -type f | while read -r file; do
    if ! head -1 "$file" | grep -q '^\$ANSIBLE_VAULT'; then
        continue
    fi

    content=$(ansible-vault view --vault-password-file "$VAULT_PASS_FILE" "$file" 2>/dev/null)

    if [ $? -ne 0 ]; then
        echo "WARN: Cannot decrypt $file"
        continue
    fi

    # Check for weak or default passwords
    echo "$content" | grep -inE "(password|changeme|default|example|test123)" && \
        echo "  ^^ Found in: $file"

    # Check for empty values
    echo "$content" | grep -E ':\s*""' && \
        echo "  ^^ Empty secret in: $file"

    # Check for TODO markers
    echo "$content" | grep -i "todo" && \
        echo "  ^^ TODO found in: $file"

done
```

## Viewing Non-YAML Encrypted Files

`ansible-vault view` works with any encrypted file, not just YAML:

```bash
# View an encrypted SSH key
ansible-vault view files/ssl/private.key

# View an encrypted configuration file
ansible-vault view templates/database.conf.encrypted

# View an encrypted shell script
ansible-vault view files/deploy-secrets.sh
```

## Using ansible-vault view in Scripts

Integrate `ansible-vault view` into automation scripts:

```bash
#!/bin/bash
# extract-db-password.sh
# Extract a specific secret for use in a migration script

VAULT_PASS_FILE="$1"
DB_PASSWORD=$(ansible-vault view --vault-password-file "$VAULT_PASS_FILE" \
  group_vars/production/vault.yml | grep "vault_db_password" | cut -d'"' -f2)

if [ -z "$DB_PASSWORD" ]; then
    echo "Failed to extract database password"
    exit 1
fi

# Use the password (it only lives in this variable, never on disk)
pg_dump -h db.example.com -U myapp -d production \
  PGPASSWORD="$DB_PASSWORD" > /tmp/backup.sql
```

## Viewing Inline Encrypted Variables

For files with inline encrypted variables (using `!vault`), `ansible-vault view` does not work directly because the file itself is not fully encrypted. Instead, use the Ansible debug module:

```bash
# View a specific inline encrypted variable
ansible localhost -m debug -a "var=vault_db_password" \
  -e "@group_vars/production/vars.yml" \
  --vault-password-file ~/.vault_pass.txt
```

Or use a one-liner playbook:

```bash
# Show all variables from a file with inline vault values
ansible localhost -m debug -a "var=vars" \
  -e "@group_vars/production/vars.yml" \
  --vault-password-file ~/.vault_pass.txt
```

## Troubleshooting

### "Decryption failed" Error

```
ERROR! Decryption failed (no vault secrets were found that could decrypt)
```

This means the wrong password was provided. Verify your password:

```bash
# Test if the password file is correct
ansible-vault view --vault-password-file ~/.vault_pass.txt secrets.yml
```

If you are using multiple vault IDs, make sure you provide the right one.

### "input is not vault encrypted data" Error

```
ERROR! input is not vault encrypted data for group_vars/production/vars.yml
```

The file is not encrypted. You can read it normally with `cat`:

```bash
# This is a regular file, not a vault file
cat group_vars/production/vars.yml
```

### File Not Found

```
ERROR! The file secrets.yml does not exist
```

Check the file path. Use tab completion or `find` to locate the file:

```bash
find . -name "vault.yml" -type f
```

## Security Considerations

When you use `ansible-vault view`, the decrypted content is displayed in your terminal. Be aware of:

- **Terminal history**: The content is shown on screen but not saved to shell history (the command is, but not the output)
- **Screen sharing**: Do not run this while sharing your screen
- **Terminal scrollback**: The content is in your terminal scrollback buffer. Close the terminal or clear it after viewing
- **Pipe to clipboard**: Avoid piping to clipboard managers that save history

```bash
# Clear terminal after viewing secrets
ansible-vault view secrets.yml
clear  # or press Ctrl+L
```

The `ansible-vault view` command is the go-to tool for reading encrypted files safely. It keeps your secrets encrypted on disk, shows you what you need in the terminal, and leaves no trace on the filesystem. Use it instead of `ansible-vault decrypt` whenever you just need to check a value.
