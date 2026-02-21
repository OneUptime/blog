# How to Use Ansible Vault with Password Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Security, Scripting, Automation

Description: Learn how to use executable password scripts with Ansible Vault to dynamically retrieve passwords from external sources like keychains and APIs.

---

A plain text password file is fine for basic use, but in production you often want to pull vault passwords from a password manager, a secrets API, or a hardware security module. Ansible Vault supports executable password scripts for exactly this purpose. When the password file is executable, Ansible runs it and reads the password from stdout instead of reading the file contents directly. This opens up powerful integrations without changing how your playbooks work.

## How Password Scripts Work

When you pass a file to `--vault-password-file`, Ansible checks whether the file has execute permission. If it does, Ansible runs the file as a subprocess and captures whatever it prints to stdout as the vault password. If the file is not executable, Ansible reads its contents as a plain text password.

This distinction means the file extension does not matter. What matters is the execute bit.

## A Minimal Password Script

Here is the simplest possible password script:

```bash
#!/bin/bash
# minimal_vault_pass.sh
# Outputs a hardcoded password (not useful in production, but shows the concept)
echo "my-vault-password"
```

```bash
# Set execute permission
chmod +x minimal_vault_pass.sh

# Use it with any vault command
ansible-vault view --vault-password-file ./minimal_vault_pass.sh secrets.yml
```

## Pulling from macOS Keychain

On macOS, you can store the vault password in the system keychain and retrieve it at runtime:

```bash
# First, store the password in the keychain
# This prompts you to enter the password once
security add-generic-password \
  -a "${USER}" \
  -s "ansible-vault" \
  -w "your-vault-password"
```

Then create the retrieval script:

```bash
#!/bin/bash
# vault_pass_keychain.sh
# Retrieves Ansible Vault password from macOS Keychain

PASSWORD=$(security find-generic-password \
  -a "${USER}" \
  -s "ansible-vault" \
  -w 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "ERROR: Could not retrieve vault password from Keychain" >&2
  exit 1
fi

echo "${PASSWORD}"
```

## Pulling from Linux Secret Service (GNOME Keyring)

On Linux desktops with GNOME Keyring or KDE Wallet:

```bash
#!/bin/bash
# vault_pass_secret_tool.sh
# Retrieves vault password from GNOME Keyring using secret-tool

PASSWORD=$(secret-tool lookup service ansible-vault 2>/dev/null)

if [ -z "${PASSWORD}" ]; then
  echo "ERROR: Could not retrieve vault password from secret service" >&2
  exit 1
fi

echo "${PASSWORD}"
```

Store the password first:

```bash
# Store the password in GNOME Keyring
echo -n "your-vault-password" | secret-tool store --label="Ansible Vault" service ansible-vault
```

## Pulling from the pass Password Manager

The `pass` command-line password manager is popular among Linux users and integrates cleanly:

```bash
#!/bin/bash
# vault_pass_from_pass.sh
# Retrieves vault password from the 'pass' password manager
# Requires: pass (https://www.passwordstore.org/)

PASSWORD=$(pass show infrastructure/ansible-vault 2>/dev/null)

if [ $? -ne 0 ] || [ -z "${PASSWORD}" ]; then
  echo "ERROR: Could not retrieve vault password from pass" >&2
  exit 1
fi

# pass may store multiline entries; grab only the first line (the password)
echo "${PASSWORD}" | head -1
```

## Pulling from 1Password CLI

If your team uses 1Password:

```bash
#!/bin/bash
# vault_pass_1password.sh
# Retrieves vault password from 1Password using the op CLI
# Requires: 1Password CLI (op) authenticated session

PASSWORD=$(op read "op://Infrastructure/Ansible Vault/password" 2>/dev/null)

if [ $? -ne 0 ] || [ -z "${PASSWORD}" ]; then
  echo "ERROR: Could not retrieve vault password from 1Password" >&2
  exit 1
fi

echo "${PASSWORD}"
```

## Python-Based Password Script

For more complex logic or cross-platform compatibility, write the script in Python:

```python
#!/usr/bin/env python3
"""vault_pass.py - retrieves vault password from a configured source."""
import os
import sys
import subprocess

def get_from_env():
    """Try to get password from environment variable."""
    return os.environ.get('ANSIBLE_VAULT_PASS')

def get_from_keyring():
    """Try to get password from Python keyring library."""
    try:
        import keyring
        return keyring.get_password('ansible-vault', 'default')
    except ImportError:
        return None

def get_from_file():
    """Fall back to a password file in the home directory."""
    path = os.path.expanduser('~/.vault_pass.txt')
    if os.path.exists(path):
        with open(path, 'r') as f:
            return f.read().strip()
    return None

# Try multiple sources in order of preference
for getter in [get_from_env, get_from_keyring, get_from_file]:
    password = getter()
    if password:
        print(password, end='')
        sys.exit(0)

print("ERROR: Could not retrieve vault password from any source", file=sys.stderr)
sys.exit(1)
```

This cascading approach tries the environment variable first, then the keyring, then falls back to a file. It makes the same script work across developer laptops (keyring), CI pipelines (env var), and older setups (file).

## Script with Vault ID Awareness

When Ansible calls a password script with vault IDs, it passes the vault ID label as the first argument. Your script can use this to return different passwords for different vault IDs:

```bash
#!/bin/bash
# vault_pass_multi.sh
# Returns different passwords based on the vault ID passed by Ansible
# Ansible invokes this as: ./vault_pass_multi.sh --vault-id <label>

VAULT_ID="${1}"

case "${VAULT_ID}" in
  --vault-id)
    # Ansible passes --vault-id as first arg, label as second
    VAULT_ID="${2}"
    ;;
esac

case "${VAULT_ID}" in
  dev)
    pass show infrastructure/ansible-vault-dev | head -1
    ;;
  staging)
    pass show infrastructure/ansible-vault-staging | head -1
    ;;
  prod)
    pass show infrastructure/ansible-vault-prod | head -1
    ;;
  *)
    echo "ERROR: Unknown vault ID '${VAULT_ID}'" >&2
    exit 1
    ;;
esac
```

Configure it in `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
vault_identity_list = dev@./vault_pass_multi.sh, staging@./vault_pass_multi.sh, prod@./vault_pass_multi.sh
```

## Error Handling Best Practices

Your password script should handle errors cleanly:

```bash
#!/bin/bash
# vault_pass_robust.sh
# Demonstrates proper error handling in a vault password script

set -euo pipefail

# Verify we can reach the secrets source
if ! command -v pass &> /dev/null; then
  echo "ERROR: 'pass' command not found. Install it with your package manager." >&2
  exit 1
fi

# Attempt to retrieve the password
PASSWORD=$(pass show ansible/vault-password 2>/dev/null) || {
  echo "ERROR: Failed to retrieve password from pass. Is your GPG key available?" >&2
  exit 1
}

if [ -z "${PASSWORD}" ]; then
  echo "ERROR: Retrieved empty password from pass." >&2
  exit 1
fi

# Output only the password (first line), nothing else
echo "${PASSWORD}" | head -1
```

Key rules for password scripts:

1. Print the password (and only the password) to stdout.
2. Send all error messages and debug output to stderr.
3. Exit with code 0 on success and non-zero on failure.
4. Never print extra whitespace or newlines after the password.

## Testing Your Password Script

Before using a password script with Ansible, test it independently:

```bash
# Run the script and check its output
./vault_pass.sh

# Check the exit code
echo $?
# Should be 0

# Verify no extra characters (pipe through xxd to see exact bytes)
./vault_pass.sh | xxd | tail -5
# The last byte should be 0a (newline from echo) and nothing after it

# Test with a vault operation to confirm end-to-end
ansible-vault view --vault-password-file ./vault_pass.sh test_encrypted.yml
```

## Security Considerations

Password scripts can be more secure than plain text files because the password never rests on disk in an unprotected form. However, the script itself can be a security risk if it is world-readable or if it logs the password. Keep these guidelines in mind:

```bash
# Script should be executable only by the owner
chmod 700 vault_pass.sh

# Script should not be committed to version control
echo "vault_pass*.sh" >> .gitignore
```

Also consider that the password will be in the script's process memory briefly. On a shared system, other users might be able to inspect it via `/proc`. For truly high-security environments, look into integrating with HSMs or using a purpose-built secrets management tool that handles memory securely.

Password scripts give you the flexibility to integrate Ansible Vault with whatever password management system your organization uses. Whether that is a desktop keychain, a CLI password manager, or a cloud secrets API, the pattern is the same: write a script that retrieves the secret and prints it to stdout.
