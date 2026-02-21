# How to Use ansible-vault encrypt_string from stdin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Vault, Security, CLI

Description: Learn how to use ansible-vault encrypt_string with stdin input to encrypt individual values without exposing secrets in your shell history.

---

When you need to encrypt a single variable value for use in an Ansible playbook or variable file, `ansible-vault encrypt_string` is the go-to command. But if you type the secret directly on the command line, it ends up in your shell history. That is a security problem. The solution is to pipe the value through stdin, which keeps it out of history and gives you more flexibility in how you supply the secret.

This post covers every practical way to use `ansible-vault encrypt_string` with stdin, along with tips for avoiding common mistakes.

## Why Use stdin Instead of Command Line Arguments

The most basic form of `encrypt_string` looks like this:

```bash
# This works but leaves the secret in shell history - avoid this
ansible-vault encrypt_string 'MySecretPassword' --name 'db_password'
```

The problem is clear: `MySecretPassword` is now in your `~/.bash_history` or `~/.zsh_history`. Anyone with access to your workstation or its backups can read it. Using stdin avoids this entirely.

## Method 1: Interactive Prompt with --stdin-name

The simplest stdin method uses the `--stdin-name` flag, which tells Ansible to read the value from stdin and assign it the given variable name:

```bash
# Read the secret interactively - nothing is saved in history
ansible-vault encrypt_string --vault-password-file ~/.vault_pass \
  --stdin-name 'db_password'
```

After running this command, type the secret value and press `Ctrl+D` (on Linux/macOS) to signal end of input. The output will be something like:

```yaml
db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          62313365396662343061393464336163383764316462616132323330353135306537
          3562633163626530363736316238373536616632373764650a326134643636643764
          ...
```

You can paste this directly into your variable file.

## Method 2: Pipe from echo (With Caution)

You can pipe a value using `echo`, but you need to use the `-n` flag to avoid adding a trailing newline, which would become part of the encrypted value:

```bash
# Pipe a value using echo - note the -n flag to strip the trailing newline
echo -n 'MySecretPassword' | ansible-vault encrypt_string \
  --vault-password-file ~/.vault_pass \
  --stdin-name 'db_password'
```

The `-n` flag on `echo` is critical. Without it, the encrypted value will include a newline character at the end, which will cause problems when the decrypted value is used in templates or commands.

One caveat: `echo -n` still puts the secret in your shell history if typed directly. To avoid that, combine it with a prompt:

```bash
# Read the secret into a variable first, then pipe it - nothing in history
read -s -p "Enter secret: " SECRET && echo -n "$SECRET" | \
  ansible-vault encrypt_string --vault-password-file ~/.vault_pass \
  --stdin-name 'db_password'
unset SECRET
```

The `read -s` flag suppresses the input echo so the secret is not visible on screen.

## Method 3: Pipe from a File

If the secret is stored in a file (common for certificates, SSH keys, etc.), you can pipe the file contents:

```bash
# Encrypt the contents of a file as a vault string
cat /path/to/ssl_private_key.pem | ansible-vault encrypt_string \
  --vault-password-file ~/.vault_pass \
  --stdin-name 'ssl_private_key'
```

For multiline values like certificates or SSH keys, this works perfectly. The entire file content becomes the encrypted string value.

## Method 4: Pipe from a Password Manager

If your team uses a CLI password manager like `pass`, `1password-cli`, or `bitwarden-cli`, you can pipe directly from it:

```bash
# Encrypt a value directly from the 'pass' password manager
pass show production/db_password | ansible-vault encrypt_string \
  --vault-password-file ~/.vault_pass \
  --stdin-name 'db_password'
```

```bash
# Encrypt a value from 1Password CLI
op read "op://Production/Database/password" | ansible-vault encrypt_string \
  --vault-password-file ~/.vault_pass \
  --stdin-name 'db_password'
```

This is one of the cleanest approaches because the secret never touches the filesystem or shell history.

## Using --ask-vault-pass with stdin

If you do not have a vault password file and want to be prompted for the vault password, you can combine `--ask-vault-pass` with stdin input:

```bash
# Prompt for both the vault password and the secret value
echo -n 'MySecretPassword' | ansible-vault encrypt_string \
  --ask-vault-pass \
  --stdin-name 'db_password'
```

Ansible will first prompt you for the vault password, then read the string value from stdin. This works, but it can be confusing since you are entering two different things in sequence.

## Encrypting Multiple Strings in a Script

For batch operations, you can encrypt multiple strings in a loop:

```bash
#!/bin/bash
# encrypt-secrets.sh - Encrypt multiple secrets from a source file
# The source file format is: variable_name=secret_value

VAULT_PASS_FILE="$HOME/.vault_pass"
OUTPUT_FILE="vault_strings.yml"

# Clear the output file
> "$OUTPUT_FILE"

# Read each line from the secrets source file
while IFS='=' read -r name value; do
    # Skip empty lines and comments
    [[ -z "$name" || "$name" == \#* ]] && continue

    # Encrypt each value and append to the output file
    echo -n "$value" | ansible-vault encrypt_string \
        --vault-password-file "$VAULT_PASS_FILE" \
        --stdin-name "$name" >> "$OUTPUT_FILE"

    echo "" >> "$OUTPUT_FILE"
done < secrets_source.txt

echo "Encrypted secrets written to $OUTPUT_FILE"
```

The source file would look like:

```
# secrets_source.txt - plain text source (delete after migration)
vault_db_password=SuperSecret123
vault_api_key=sk-live-abc123def456
vault_smtp_password=mailpass789
```

## Verifying the Encrypted String

After encrypting, you can verify the value decrypts correctly by placing it in a test file and using `ansible-vault decrypt`:

```bash
# Create a test playbook to verify the encrypted string
cat > /tmp/test_vault.yml << 'PLAYBOOK'
---
- name: Test vault string
  hosts: localhost
  connection: local
  vars:
    db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          62313365396662343061393464336163...
  tasks:
    - name: Show decrypted value
      ansible.builtin.debug:
        var: db_password
PLAYBOOK

# Run the test playbook to see the decrypted value
ansible-playbook /tmp/test_vault.yml --vault-password-file ~/.vault_pass

# Clean up
rm /tmp/test_vault.yml
```

## Handling the Newline Problem

The most common issue with `encrypt_string` from stdin is accidental newlines. Here is how different input methods behave:

```bash
# WRONG - echo without -n adds a trailing newline to the encrypted value
echo 'password123' | ansible-vault encrypt_string --stdin-name 'test'

# CORRECT - echo -n strips the trailing newline
echo -n 'password123' | ansible-vault encrypt_string --stdin-name 'test'

# CORRECT - printf also works without trailing newline
printf '%s' 'password123' | ansible-vault encrypt_string --stdin-name 'test'

# CORRECT for multiline values - use cat with heredoc
cat <<'EOF' | ansible-vault encrypt_string --stdin-name 'ssh_key'
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/
...
-----END RSA PRIVATE KEY-----
EOF
```

When in doubt, test your encrypted value by decrypting it and checking for unexpected whitespace:

```bash
# Quick test to see exactly what was encrypted (including hidden characters)
echo -n 'password123' | ansible-vault encrypt_string \
  --vault-password-file ~/.vault_pass \
  --stdin-name 'test' | python3 -c "
import yaml, sys
data = yaml.safe_load(sys.stdin)
print(repr(data['test']))
"
```

## Integrating with CI/CD

In a CI/CD environment, you often need to encrypt strings as part of a pipeline. Here is an example using environment variables:

```bash
# In a CI pipeline, the secret comes from the CI system's secret store
# and the vault password also comes from the CI environment
echo -n "$CI_DB_PASSWORD" | ansible-vault encrypt_string \
  --vault-password-file <(echo -n "$ANSIBLE_VAULT_PASSWORD") \
  --stdin-name 'vault_db_password'
```

The `<(...)` syntax is process substitution, which creates a temporary file descriptor from the output of the command inside. This avoids writing the vault password to disk.

## Summary

Using `ansible-vault encrypt_string` with stdin is the secure way to encrypt individual values. The key points are: always use `echo -n` or `printf '%s'` to avoid trailing newlines, use `read -s` for interactive input to keep secrets out of shell history, pipe from password managers for the cleanest workflow, and always verify your encrypted values decrypt to exactly what you expect. These practices keep your secrets safe from the moment they are typed to the moment they are used.
