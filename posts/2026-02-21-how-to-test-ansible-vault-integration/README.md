# How to Test Ansible Vault Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Testing, Security, DevOps

Description: Practical approaches for testing Ansible Vault integration including encrypted variables, vault files, and multi-password setups in CI pipelines.

---

Ansible Vault lets you store secrets like passwords, API keys, and certificates in encrypted files right alongside your playbooks. But testing playbooks that depend on vault-encrypted data introduces complications. You need the vault password to decrypt during testing, you need to verify that encrypted values actually work when decrypted, and you need to make sure your CI pipeline can handle vault operations without exposing secrets.

This post covers the practical side of testing Ansible Vault integration, from local development to automated CI testing.

## The Testing Challenge with Vault

When you encrypt a variable file with Ansible Vault, it becomes a binary blob that Ansible decrypts at runtime. Your tests need access to the vault password, but you do not want to commit that password to your repository. You also want to verify that the encrypted values are correct without manually decrypting them every time.

Here is a typical encrypted variables file:

```yaml
# group_vars/production/vault.yml (before encryption)
# Sensitive variables that will be encrypted with ansible-vault
vault_db_password: "supersecret123"
vault_api_key: "ak_live_abc123def456"
vault_ssl_passphrase: "certpass789"
```

Encrypt it:

```bash
# Encrypt the vault file with a password file
ansible-vault encrypt group_vars/production/vault.yml --vault-password-file .vault_pass
```

## Strategy 1: Separate Test Vault with Known Passwords

The cleanest approach is maintaining a separate test vault with a known password that you can commit to the repository. Test secrets are not real secrets, so this is safe.

```bash
# Create a test vault password file
echo "test-vault-password" > tests/.vault_pass_test

# Create test secrets
cat > tests/group_vars/all/vault.yml << 'TESTVAULT'
vault_db_password: "test_password_123"
vault_api_key: "test_api_key_abc"
vault_ssl_passphrase: "test_cert_pass"
TESTVAULT

# Encrypt with the test password
ansible-vault encrypt tests/group_vars/all/vault.yml --vault-password-file tests/.vault_pass_test
```

Your Molecule configuration can reference the test vault:

```yaml
# molecule/default/molecule.yml
# Molecule config using test vault credentials
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: vault-test
    image: ubuntu:22.04
    pre_build_image: true
provisioner:
  name: ansible
  config_options:
    defaults:
      vault_password_file: ${MOLECULE_PROJECT_DIRECTORY}/tests/.vault_pass_test
  inventory:
    group_vars:
      all:
        # Override with test-safe values
        db_password: "{{ vault_db_password }}"
        api_key: "{{ vault_api_key }}"
verifier:
  name: ansible
```

## Strategy 2: Testing Vault Encryption and Decryption

Write a test that verifies your vault files can be decrypted and contain the expected keys:

```python
#!/usr/bin/env python3
# tests/test_vault_files.py
# Verify that all vault files decrypt correctly and contain required keys
import subprocess
import yaml
import pytest
import os

VAULT_PASSWORD_FILE = "tests/.vault_pass_test"
VAULT_FILES = [
    "tests/group_vars/all/vault.yml",
]

REQUIRED_KEYS = {
    "tests/group_vars/all/vault.yml": [
        "vault_db_password",
        "vault_api_key",
        "vault_ssl_passphrase",
    ],
}

@pytest.fixture(params=VAULT_FILES)
def vault_file(request):
    return request.param

def decrypt_vault_file(filepath):
    """Decrypt a vault file and return the parsed YAML content."""
    result = subprocess.run(
        ["ansible-vault", "view", filepath, "--vault-password-file", VAULT_PASSWORD_FILE],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Failed to decrypt {filepath}: {result.stderr}")
    return yaml.safe_load(result.stdout)

def test_vault_file_decrypts(vault_file):
    """Verify the vault file can be decrypted."""
    content = decrypt_vault_file(vault_file)
    assert content is not None, f"Vault file {vault_file} decrypted to empty content"

def test_vault_file_has_required_keys(vault_file):
    """Verify all required keys exist in the vault file."""
    content = decrypt_vault_file(vault_file)
    required = REQUIRED_KEYS.get(vault_file, [])
    for key in required:
        assert key in content, f"Missing required key '{key}' in {vault_file}"

def test_vault_values_are_not_empty(vault_file):
    """Verify vault values are not empty strings."""
    content = decrypt_vault_file(vault_file)
    for key, value in content.items():
        assert value is not None and str(value).strip() != "", \
            f"Key '{key}' in {vault_file} has empty value"
```

## Strategy 3: Testing Multi-Vault Setups

Many projects use multiple vault IDs for different environments. Testing this requires validating each vault independently.

```yaml
# ansible.cfg
# Configuration for multiple vault IDs
[defaults]
vault_identity_list = dev@.vault_pass_dev, staging@.vault_pass_staging, prod@.vault_pass_prod
```

Test that each vault ID works:

```bash
#!/bin/bash
# tests/test_multi_vault.sh
# Verify all vault identities can decrypt their respective files
set -euo pipefail

VAULT_IDS=("dev" "staging" "prod")

for env in "${VAULT_IDS[@]}"; do
    echo "Testing vault ID: $env"

    vault_file="group_vars/${env}/vault.yml"
    pass_file=".vault_pass_${env}"

    if [ ! -f "$vault_file" ]; then
        echo "  SKIP: $vault_file does not exist"
        continue
    fi

    if [ ! -f "$pass_file" ]; then
        echo "  FAIL: Password file $pass_file not found"
        exit 1
    fi

    # Try to decrypt the file
    if ansible-vault view "$vault_file" --vault-id "${env}@${pass_file}" > /dev/null 2>&1; then
        echo "  PASS: $vault_file decrypted successfully"
    else
        echo "  FAIL: Could not decrypt $vault_file with vault ID $env"
        exit 1
    fi
done

echo "All vault identity tests passed"
```

## Strategy 4: Testing Vault in Playbook Context

The most realistic test runs your playbook with vault-encrypted variables and verifies the secrets end up where they should:

```yaml
# tests/test_vault_playbook.yml
# Verify vault variables are correctly injected into configuration
- name: Test vault variable injection
  hosts: testhost
  become: true
  vars_files:
    - tests/group_vars/all/vault.yml
  tasks:
    - name: Verify vault variables are accessible
      ansible.builtin.assert:
        that:
          - vault_db_password is defined
          - vault_db_password | length > 0
          - vault_api_key is defined
          - vault_api_key | length > 0
        fail_msg: "Vault variables are not properly loaded"

    - name: Deploy database config with vault password
      ansible.builtin.template:
        src: db_config.yml.j2
        dest: /tmp/db_config.yml
        mode: '0600'

    - name: Read deployed config
      ansible.builtin.slurp:
        src: /tmp/db_config.yml
      register: deployed_config

    - name: Verify password was injected into config
      ansible.builtin.assert:
        that:
          - "'password:' in (deployed_config.content | b64decode)"
        fail_msg: "Database password was not injected into config file"

    - name: Verify config file permissions are restrictive
      ansible.builtin.stat:
        path: /tmp/db_config.yml
      register: config_stat

    - name: Assert file permissions
      ansible.builtin.assert:
        that:
          - config_stat.stat.mode == '0600'
        fail_msg: "Config file with secrets has wrong permissions"
```

## Strategy 5: CI Pipeline Integration

In CI, you cannot commit real vault passwords. Use environment variables or CI secret stores:

```yaml
# .github/workflows/test-vault.yml
# GitHub Actions workflow for testing vault integration
name: Test Vault Integration
on: push
jobs:
  vault-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install ansible-core pytest pyyaml molecule molecule-docker

      - name: Create vault password file from CI secret
        run: echo "${{ secrets.ANSIBLE_VAULT_PASSWORD }}" > .vault_pass
        shell: bash

      - name: Run vault decryption tests
        run: pytest tests/test_vault_files.py -v

      - name: Run playbook with vault
        run: |
          ansible-playbook tests/test_vault_playbook.yml \
            --vault-password-file .vault_pass \
            -i tests/inventory

      - name: Cleanup vault password file
        if: always()
        run: rm -f .vault_pass
```

## Strategy 6: Testing Vault String Encryption

Sometimes you encrypt individual strings rather than whole files:

```yaml
# group_vars/all/main.yml
# Mix of plain and vault-encrypted variables
app_name: myapp
app_port: 8080
app_secret: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  363438373...encrypted_data...
```

Test that inline vault strings decrypt properly:

```bash
#!/bin/bash
# tests/test_inline_vault.sh
# Verify inline vault strings in variable files can be processed
set -euo pipefail

# Run a minimal playbook that reads the variables
ansible-playbook -i localhost, -c local \
  --vault-password-file tests/.vault_pass_test \
  -e @tests/group_vars/all/main.yml \
  tests/test_inline_vault_playbook.yml

echo "Inline vault string test passed"
```

## Common Pitfalls

One mistake I see often is encrypting the entire variable file instead of just the sensitive values. This makes it impossible to do code review on variable changes because the entire file shows up as a binary diff. A better practice is to keep a separate `vault.yml` for encrypted values and reference them from your main variables file using the `vault_` prefix convention.

Another common issue is forgetting to test that vault-encrypted files actually contain valid YAML after decryption. Corruption during git merges can produce vault files that decrypt to invalid YAML.

## Conclusion

Testing Ansible Vault integration boils down to three things: verifying files decrypt successfully, verifying decrypted values contain what you expect, and verifying your playbooks work correctly with those values injected. Keep test vaults separate from production vaults, automate everything in CI, and always clean up password files after tests complete.
