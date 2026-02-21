# How to Decrypt Ansible Vault Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Decryption, Security, Secrets Management

Description: Learn how to decrypt Ansible Vault encrypted files permanently or temporarily, handle multiple vault IDs, and troubleshoot common decryption issues.

---

Ansible Vault encryption is great for keeping secrets safe in your repository, but there are times when you need to decrypt files. Maybe you are migrating to a different secrets management solution. Maybe you need to audit the contents. Or maybe you just need to quickly check a value without going through the edit workflow. Ansible provides several ways to decrypt vault-encrypted files, and each serves a different purpose.

## Permanent Decryption with ansible-vault decrypt

The `decrypt` command removes the encryption from a file, leaving the plain-text content on disk:

```bash
# Decrypt a file permanently (replaces encrypted content with plain text)
ansible-vault decrypt group_vars/production/vault.yml
```

Ansible prompts for the vault password:

```
Vault password:
Decryption successful
```

The file is now plain text:

```bash
# The file is readable again
cat group_vars/production/vault.yml
```

```yaml
vault_db_password: "super_secret_password_123"
vault_api_key: "sk-abc123def456ghi789"
vault_smtp_password: "mail_secret_789"
```

Be careful with this. Once decrypted, the plain-text secrets are on disk and could be accidentally committed to Git.

## Decrypting with a Password File

For scripted or non-interactive decryption:

```bash
# Decrypt using a password file
ansible-vault decrypt --vault-password-file ~/.vault_pass.txt secrets.yml
```

If your `ansible.cfg` has the password file configured:

```ini
# ansible.cfg
[defaults]
vault_password_file = ~/.vault_pass.txt
```

Then just:

```bash
ansible-vault decrypt secrets.yml
```

## Decrypting Multiple Files

You can decrypt several files at once:

```bash
# Decrypt all vault files in one command
ansible-vault decrypt \
  group_vars/production/vault.yml \
  group_vars/staging/vault.yml \
  host_vars/db01/vault.yml
```

All files must be encrypted with the same vault password. If they use different vault IDs, you need separate commands.

## Decrypting Files with Different Vault IDs

When files are encrypted with different vault IDs, specify the ID during decryption:

```bash
# Decrypt a file encrypted with the "production" vault ID
ansible-vault decrypt --vault-id production@~/.vault_pass_prod.txt \
  group_vars/production/vault.yml

# Decrypt a file encrypted with the "staging" vault ID
ansible-vault decrypt --vault-id staging@~/.vault_pass_staging.txt \
  group_vars/staging/vault.yml
```

If you are not sure which vault ID a file uses, check the file header:

```bash
# Check the vault header
head -1 group_vars/production/vault.yml
```

Output for a file with a vault ID:

```
$ANSIBLE_VAULT;1.2;AES256;production
```

Output for a file without a vault ID:

```
$ANSIBLE_VAULT;1.1;AES256
```

## Temporary Decryption: View Without Modifying

Most of the time, you do not want to permanently decrypt a file. You just want to see its contents. Use `ansible-vault view` for that:

```bash
# View encrypted file contents without decrypting the file
ansible-vault view group_vars/production/vault.yml
```

This decrypts the content and displays it in your terminal, but the file on disk remains encrypted. We cover this in more detail in a separate post about `ansible-vault view`.

## Decrypting to a Different File (Output Redirection)

If you need the decrypted content in a separate file without modifying the original:

```bash
# Decrypt to stdout and redirect to a new file
ansible-vault decrypt --output - group_vars/production/vault.yml > /tmp/decrypted_secrets.yml

# Or use the --output flag directly
ansible-vault decrypt --output /tmp/decrypted_secrets.yml group_vars/production/vault.yml
```

The `--output` flag with `-` sends the decrypted content to stdout. With a filename, it writes to that file. Either way, the original encrypted file is not modified.

This is useful for:

- Comparing secrets between environments
- Feeding secrets into non-Ansible tools
- Creating temporary decrypted copies for debugging

```bash
# Example: diff secrets between production and staging
ansible-vault decrypt --output /tmp/prod.yml group_vars/production/vault.yml
ansible-vault decrypt --output /tmp/staging.yml group_vars/staging/vault.yml
diff /tmp/prod.yml /tmp/staging.yml

# Clean up the temporary files
rm /tmp/prod.yml /tmp/staging.yml
```

## Decrypting Inline Encrypted Variables

When variables are encrypted inline (using `!vault`), you cannot use `ansible-vault decrypt` on the file because the file itself is not fully encrypted. Instead, use the `debug` module:

```bash
# View an inline encrypted variable
ansible localhost -m debug -a "var=vault_db_password" \
  -e "@group_vars/production/vars.yml" \
  --vault-password-file ~/.vault_pass.txt
```

Or decrypt the specific string:

```bash
# Pipe the encrypted string to ansible-vault
echo '$ANSIBLE_VAULT;1.1;AES256
36303861363266343733383838333766...' | ansible-vault decrypt --vault-password-file ~/.vault_pass.txt /dev/stdin --output -
```

## Decrypting for Migration

When migrating from Ansible Vault to another secrets management system (HashiCorp Vault, AWS Secrets Manager, etc.), you need to extract all secrets:

```bash
#!/bin/bash
# export-vault-secrets.sh
# Decrypt all vault files and export their contents for migration

VAULT_PASS_FILE="$1"
OUTPUT_DIR="$2"

if [ -z "$VAULT_PASS_FILE" ] || [ -z "$OUTPUT_DIR" ]; then
    echo "Usage: $0 <vault_pass_file> <output_dir>"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Find and decrypt all vault files
find . -name "vault.yml" -type f | while read -r file; do
    if head -1 "$file" | grep -q '^\$ANSIBLE_VAULT'; then
        # Create the output directory structure
        outfile="$OUTPUT_DIR/$file"
        mkdir -p "$(dirname "$outfile")"

        # Decrypt to the output directory
        ansible-vault decrypt \
            --vault-password-file "$VAULT_PASS_FILE" \
            --output "$outfile" \
            "$file"

        echo "Decrypted: $file -> $outfile"
    fi
done
```

```bash
chmod +x export-vault-secrets.sh
./export-vault-secrets.sh ~/.vault_pass.txt /tmp/exported_secrets
```

## Re-encrypting After Decryption

A common workflow is: decrypt, make changes, re-encrypt:

```bash
# Decrypt
ansible-vault decrypt secrets.yml

# Edit the file
vim secrets.yml

# Re-encrypt with the same password
ansible-vault encrypt secrets.yml
```

But this is risky. If your shell session crashes between decrypt and re-encrypt, the file is left in plain text. The safer approach is to use `ansible-vault edit`, which handles the decrypt-edit-encrypt cycle atomically.

## Troubleshooting Decryption Errors

### Wrong Password

```
ERROR! Decryption failed (no vault secrets were found that could decrypt)
```

This means the password you provided does not match the one used to encrypt the file. Double-check your password file or the password you are typing.

### Corrupt File

```
ERROR! input is not vault encrypted data
```

The file does not start with the `$ANSIBLE_VAULT` header. It might have been partially overwritten or is not actually a vault file.

### Wrong Vault ID

```
ERROR! Decryption failed on secrets.yml
```

If the file was encrypted with a specific vault ID, you need to provide that vault ID during decryption:

```bash
# Check which vault ID was used
head -1 secrets.yml
# $ANSIBLE_VAULT;1.2;AES256;production

# Use the matching vault ID
ansible-vault decrypt --vault-id production@~/.vault_pass_prod.txt secrets.yml
```

### File Permission Issues

```
ERROR! The file secrets.yml does not exist
```

Check file permissions. The user running `ansible-vault` needs read and write permissions on the file:

```bash
ls -la secrets.yml
chmod 644 secrets.yml
```

## Automating Decryption Checks

Add a check to your CI pipeline to ensure vault files can be decrypted:

```yaml
# .github/workflows/ansible-check.yml
- name: Verify vault files can be decrypted
  env:
    ANSIBLE_VAULT_PASSWORD: ${{ secrets.VAULT_PASSWORD }}
  run: |
    echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_pass.txt

    # Try to view each vault file
    find . -name "vault.yml" -type f | while read -r file; do
      if head -1 "$file" | grep -q '^\$ANSIBLE_VAULT'; then
        ansible-vault view --vault-password-file /tmp/vault_pass.txt "$file" > /dev/null
        echo "OK: $file"
      fi
    done

    rm /tmp/vault_pass.txt
```

## Best Practices

Never permanently decrypt files in a shared repository. Use `ansible-vault view` to inspect contents and `ansible-vault edit` to make changes. If you must decrypt for migration, do it in a temporary directory and clean up immediately. Always verify that vault files are still encrypted before committing. Treat vault passwords with the same care as the secrets they protect, because they are the single key to everything.
