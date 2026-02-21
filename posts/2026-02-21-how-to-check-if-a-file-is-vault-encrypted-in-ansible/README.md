# How to Check if a File is Vault Encrypted in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Scripting, Automation, DevOps

Description: Learn multiple methods to detect whether a file is Ansible Vault encrypted, from simple header checks to programmatic approaches in playbooks.

---

Knowing whether a file is vault-encrypted before operating on it is important for several reasons. You might need to verify that sensitive files are actually encrypted before committing them. You might want to build automation that handles encrypted and plaintext files differently. Or you might be troubleshooting a failed playbook run and need to check file states. This guide covers every method from quick command-line checks to programmatic detection in playbooks and scripts.

## The Vault File Header

Every Ansible Vault encrypted file starts with a specific header on the first line:

```
$ANSIBLE_VAULT;1.1;AES256
```

Or, for files encrypted with a vault ID:

```
$ANSIBLE_VAULT;1.2;AES256;prod
```

The header format is:
- `$ANSIBLE_VAULT` - magic identifier
- Version (`1.1` for default, `1.2` for vault ID)
- Cipher (`AES256`)
- Vault ID (optional, only in version 1.2)

If a file starts with this header, it is vault-encrypted. If not, it is plaintext (or some other format).

## Method 1: Quick Visual Check

The simplest check is to look at the first line:

```bash
# Show the first line of a file
head -1 group_vars/production/vault.yml

# Output for encrypted file:
# $ANSIBLE_VAULT;1.1;AES256

# Output for plaintext file:
# ---
```

## Method 2: Using the file Command

The `file` command recognizes Ansible Vault encrypted files:

```bash
# Check file type
file group_vars/production/vault.yml

# Output for encrypted file:
# group_vars/production/vault.yml: Ansible Vault encrypted data

# Output for plaintext file:
# group_vars/production/vault.yml: ASCII text
```

This is a reliable, single-command check.

## Method 3: Shell Script Check

For scripting, check the header programmatically:

```bash
#!/bin/bash
# is_vault_encrypted.sh
# Checks if a file is Ansible Vault encrypted
# Usage: ./is_vault_encrypted.sh <filename>
# Exit code 0 = encrypted, 1 = not encrypted

FILE="$1"

if [ -z "${FILE}" ]; then
  echo "Usage: $0 <filename>"
  exit 2
fi

if [ ! -f "${FILE}" ]; then
  echo "File not found: ${FILE}"
  exit 2
fi

# Read the first line and check for the vault header
HEADER=$(head -1 "${FILE}")

if [[ "${HEADER}" == '$ANSIBLE_VAULT;'* ]]; then
  echo "ENCRYPTED: ${FILE}"
  exit 0
else
  echo "NOT ENCRYPTED: ${FILE}"
  exit 1
fi
```

Use it:

```bash
chmod +x is_vault_encrypted.sh

# Check individual files
./is_vault_encrypted.sh group_vars/production/vault.yml
# Output: ENCRYPTED: group_vars/production/vault.yml

./is_vault_encrypted.sh group_vars/production/vars.yml
# Output: NOT ENCRYPTED: group_vars/production/vars.yml

# Use in conditionals
if ./is_vault_encrypted.sh secrets.yml; then
  echo "File is encrypted, ready to commit"
else
  echo "WARNING: File is not encrypted!"
fi
```

## Method 4: Audit All Files in a Project

Scan your entire project to find all encrypted and unencrypted YAML files:

```bash
#!/bin/bash
# audit_vault_files.sh
# Scans a project directory and reports vault encryption status of all YAML files

PROJECT_DIR="${1:-.}"
ENCRYPTED=0
PLAINTEXT=0

echo "Vault Encryption Audit"
echo "======================"
echo "Directory: ${PROJECT_DIR}"
echo ""

find "${PROJECT_DIR}" -name "*.yml" -o -name "*.yaml" | sort | while read -r file; do
  # Skip files in .git directory
  [[ "${file}" == */.git/* ]] && continue

  header=$(head -1 "${file}" 2>/dev/null)
  if [[ "${header}" == '$ANSIBLE_VAULT;'* ]]; then
    # Extract vault ID if present
    vault_id=$(echo "${header}" | awk -F';' '{if(NF>=4) print $4; else print "default"}')
    printf "  [ENCRYPTED vault-id=%s] %s\n" "${vault_id}" "${file}"
  fi
done

echo ""
echo "Files named 'vault.yml' that are NOT encrypted (potential issues):"
find "${PROJECT_DIR}" -name "vault.yml" -o -name "vault.yaml" | sort | while read -r file; do
  [[ "${file}" == */.git/* ]] && continue
  header=$(head -1 "${file}" 2>/dev/null)
  if [[ "${header}" != '$ANSIBLE_VAULT;'* ]]; then
    echo "  WARNING: ${file} is NOT encrypted!"
  fi
done
```

## Method 5: Python Script

For integration with other Python tooling:

```python
#!/usr/bin/env python3
"""check_vault.py - Check if files are Ansible Vault encrypted."""
import sys
import os

VAULT_HEADER = b"$ANSIBLE_VAULT;"

def is_vault_encrypted(filepath):
    """Check if a file is Ansible Vault encrypted.

    Returns a tuple of (is_encrypted, vault_id).
    """
    try:
        with open(filepath, 'rb') as f:
            first_line = f.readline().strip()

        if not first_line.startswith(VAULT_HEADER):
            return False, None

        # Parse the header
        parts = first_line.decode('ascii').split(';')
        vault_id = parts[3] if len(parts) >= 4 else None
        return True, vault_id

    except (IOError, UnicodeDecodeError):
        return False, None

def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file1> [file2] ...")
        sys.exit(2)

    exit_code = 0
    for filepath in sys.argv[1:]:
        encrypted, vault_id = is_vault_encrypted(filepath)
        if encrypted:
            vid = f" (vault-id: {vault_id})" if vault_id else ""
            print(f"ENCRYPTED{vid}: {filepath}")
        else:
            print(f"NOT ENCRYPTED: {filepath}")
            exit_code = 1

    sys.exit(exit_code)

if __name__ == '__main__':
    main()
```

```bash
# Check multiple files at once
python3 check_vault.py group_vars/production/vault.yml group_vars/production/vars.yml
# ENCRYPTED (vault-id: prod): group_vars/production/vault.yml
# NOT ENCRYPTED: group_vars/production/vars.yml
```

## Method 6: Ansible Playbook Check

Check vault encryption status from within a playbook:

```yaml
# check_vault_status.yml
# Playbook that checks if files are vault-encrypted
---
- name: Check vault encryption status of files
  hosts: localhost
  connection: local

  vars:
    files_to_check:
      - group_vars/production/vault.yml
      - group_vars/production/vars.yml
      - group_vars/staging/vault.yml
      - roles/database/vars/vault.yml

  tasks:
    - name: Read first line of each file
      ansible.builtin.command:
        cmd: "head -1 {{ item }}"
      register: file_headers
      loop: "{{ files_to_check }}"
      changed_when: false

    - name: Report encryption status
      ansible.builtin.debug:
        msg: >-
          {{ item.item }}:
          {{ 'ENCRYPTED' if item.stdout.startswith('$ANSIBLE_VAULT') else 'NOT ENCRYPTED' }}
      loop: "{{ file_headers.results }}"
      loop_control:
        label: "{{ item.item }}"
```

## Method 7: Pre-Commit Hook

Prevent committing unencrypted files that should be encrypted:

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Verifies that files named vault.yml are actually vault-encrypted before committing

ERRORS=0

# Check all staged files matching vault patterns
for file in $(git diff --cached --name-only --diff-filter=ACM); do
  # Check files that should be encrypted (by naming convention)
  if [[ "${file}" == *vault.yml ]] || [[ "${file}" == *vault.yaml ]] || [[ "${file}" == *.vault ]]; then
    header=$(head -1 "${file}" 2>/dev/null)
    if [[ "${header}" != '$ANSIBLE_VAULT;'* ]]; then
      echo "ERROR: ${file} should be vault-encrypted but is NOT"
      echo "  Run: ansible-vault encrypt ${file}"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

# Also check for files that SHOULD NOT be encrypted but are (unusual, but worth checking)
for file in $(git diff --cached --name-only --diff-filter=ACM); do
  if [[ "${file}" == *vars.yml ]] && [[ "${file}" != *vault* ]]; then
    header=$(head -1 "${file}" 2>/dev/null)
    if [[ "${header}" == '$ANSIBLE_VAULT;'* ]]; then
      echo "WARNING: ${file} is vault-encrypted but does not follow the vault naming convention"
      echo "  Consider renaming to vault.yml or decrypting if not needed"
    fi
  fi
done

if [ ${ERRORS} -gt 0 ]; then
  echo ""
  echo "${ERRORS} file(s) need to be encrypted before committing."
  exit 1
fi
```

## Method 8: Using ansible-vault is-encrypted (Ansible 2.12+)

Starting with Ansible 2.12, you can use the `ansible-vault` command to check:

```bash
# Check if a file is vault-encrypted (returns exit code 0 if encrypted)
ansible-vault is-encrypted group_vars/production/vault.yml
echo $?
# 0 = encrypted
# 1 = not encrypted
```

This is the most idiomatic way to check, but requires a newer Ansible version.

## CI/CD Integration

Add vault encryption checks to your CI pipeline:

```yaml
# .github/workflows/vault-check.yml
name: Vault Encryption Check
on: pull_request

jobs:
  check-vault:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check that vault files are encrypted
        run: |
          ERRORS=0
          for file in $(find . -name "vault.yml" -o -name "vault.yaml" | grep -v .git); do
            header=$(head -1 "$file")
            if [[ "$header" != '$ANSIBLE_VAULT;'* ]]; then
              echo "ERROR: $file is NOT vault-encrypted"
              ERRORS=$((ERRORS + 1))
            else
              echo "OK: $file is encrypted"
            fi
          done
          if [ $ERRORS -gt 0 ]; then
            echo "Found $ERRORS unencrypted vault files. These must be encrypted before merging."
            exit 1
          fi
```

## Getting Vault Metadata

Beyond just checking if a file is encrypted, extract useful metadata:

```bash
#!/bin/bash
# vault_info.sh
# Shows detailed information about a vault-encrypted file

FILE="$1"
if [ -z "${FILE}" ]; then
  echo "Usage: $0 <filename>"
  exit 1
fi

HEADER=$(head -1 "${FILE}")

if [[ "${HEADER}" != '$ANSIBLE_VAULT;'* ]]; then
  echo "Not a vault-encrypted file: ${FILE}"
  exit 1
fi

# Parse header components
IFS=';' read -ra PARTS <<< "${HEADER}"

echo "File: ${FILE}"
echo "Format: ${PARTS[0]}"
echo "Version: ${PARTS[1]}"
echo "Cipher: ${PARTS[2]}"

if [ ${#PARTS[@]} -ge 4 ]; then
  echo "Vault ID: ${PARTS[3]}"
else
  echo "Vault ID: (none - default)"
fi

echo "File size: $(wc -c < "${FILE}") bytes"
echo "Lines: $(wc -l < "${FILE}")"
```

## Summary

Checking whether a file is Ansible Vault encrypted boils down to inspecting its first line for the `$ANSIBLE_VAULT;` header. The `file` command, the `head` command, and `ansible-vault is-encrypted` all provide quick answers from the command line. For automation, use shell scripts or Python to check headers programmatically. Integrate these checks into pre-commit hooks and CI pipelines to ensure vault files stay encrypted throughout your development workflow. The naming convention of `vault.yml` combined with automated checks gives you a reliable safety net against accidental plaintext commits.
