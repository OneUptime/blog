# How to Use Molecule with Ansible Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Vault, Secrets, Testing

Description: Configure Molecule to work with Ansible Vault encrypted variables and files for secure testing of roles that handle secrets.

---

Testing Ansible roles that use Vault-encrypted secrets with Molecule requires some extra configuration. You cannot just run `molecule test` and expect it to decrypt your vault files automatically. In this post, I will cover the different approaches to handling Vault secrets in Molecule tests, from simple password files to environment variables and CI integration.

## The Problem

When your role uses Vault-encrypted variables, Molecule's converge step calls Ansible, which tries to read those encrypted files. Without the vault password, Ansible fails with an error like:

```
ERROR! Attempting to decrypt but no vault secrets found
```

You need to tell Molecule how to pass the vault password to Ansible during the test run.

## Method 1: Vault Password File

The simplest approach is to use a vault password file. Create a file containing just the vault password.

```bash
# Create a vault password file (do NOT commit this to git)
echo "my-vault-password" > .vault-password
chmod 600 .vault-password
```

Add it to your `.gitignore`.

```
# .gitignore
.vault-password
```

Then configure Molecule to pass this file to Ansible.

```yaml
# molecule/default/molecule.yml
dependency:
  name: galaxy

driver:
  name: docker

platforms:
  - name: instance
    image: geerlingguy/docker-ubuntu2204-ansible:latest
    pre_build_image: true
    privileged: true
    cgroupns_mode: host
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw

provisioner:
  name: ansible
  config_options:
    defaults:
      vault_password_file: ${MOLECULE_PROJECT_DIRECTORY}/.vault-password

verifier:
  name: ansible
```

The `${MOLECULE_PROJECT_DIRECTORY}` variable points to the root of your role directory, so this works regardless of where you run Molecule from.

## Method 2: Environment Variable

Instead of a password file, you can use the `ANSIBLE_VAULT_PASSWORD_FILE` environment variable or a script.

```bash
# Set the environment variable before running Molecule
export ANSIBLE_VAULT_PASSWORD_FILE=.vault-password
molecule test
```

Or use a script that outputs the password.

```bash
#!/bin/bash
# vault-password.sh - Script to retrieve vault password
# This could read from a secrets manager, keychain, etc.
echo "my-vault-password"
```

```bash
chmod +x vault-password.sh
export ANSIBLE_VAULT_PASSWORD_FILE=./vault-password.sh
molecule test
```

## Method 3: Provisioner Environment in molecule.yml

You can set environment variables directly in the Molecule configuration.

```yaml
# molecule/default/molecule.yml
provisioner:
  name: ansible
  env:
    ANSIBLE_VAULT_PASSWORD_FILE: ${MOLECULE_PROJECT_DIRECTORY}/.vault-password
```

This is cleaner than setting environment variables externally because the configuration lives with the test scenario.

## Method 4: Vault ID for Multiple Passwords

If your role uses multiple vault IDs (which is common in larger projects), configure them in molecule.yml.

```yaml
# molecule/default/molecule.yml
provisioner:
  name: ansible
  config_options:
    defaults:
      vault_identity_list: dev@${MOLECULE_PROJECT_DIRECTORY}/.vault-password-dev, prod@${MOLECULE_PROJECT_DIRECTORY}/.vault-password-prod
```

Or use the command-line approach through Molecule's ansible_args.

```yaml
# molecule/default/molecule.yml
provisioner:
  name: ansible
  ansible_args:
    - --vault-id
    - dev@.vault-password-dev
    - --vault-id
    - prod@.vault-password-prod
```

## Working with Encrypted Variables Files

A typical role structure with Vault looks like this:

```
my_role/
  defaults/
    main.yml          # Default variables (not encrypted)
  vars/
    main.yml          # Regular variables
    vault.yml          # Encrypted variables
  tasks/
    main.yml
  molecule/
    default/
      molecule.yml
      converge.yml
      verify.yml
```

The encrypted vars file might contain:

```yaml
# vars/vault.yml (encrypted with ansible-vault)
vault_db_password: "supersecretpassword"
vault_api_key: "abc123def456"
vault_ssl_private_key: |
  -----BEGIN PRIVATE KEY-----
  MIIEvgIBADANBgkqhkiG9w0BAQ...
  -----END PRIVATE KEY-----
```

Your tasks reference these through regular variables:

```yaml
# defaults/main.yml
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
```

## Strategy: Use Test-Specific Overrides

A better approach for Molecule testing is to override vault variables with test values. This way, you do not need the actual vault password during testing.

```yaml
# molecule/default/molecule.yml
provisioner:
  name: ansible
  inventory:
    group_vars:
      all:
        # Override vault variables with test values
        vault_db_password: "test-password-for-molecule"
        vault_api_key: "test-api-key-for-molecule"
        vault_ssl_private_key: "test-key-content"
```

This approach has several advantages:

- No vault password file needed
- Tests do not depend on actual secrets
- Easier to set up in CI
- New team members can run tests immediately

The flow looks like this:

```mermaid
graph TD
    A[molecule.yml group_vars] --> B[Override vault_* variables]
    B --> C[Converge runs with test values]
    C --> D[Role uses test secrets]
    D --> E[Verify checks functionality]
    style A fill:#9f9,stroke:#333
```

## Combining Override and Real Vault

Sometimes you need both: test overrides for most variables but real vault decryption for a few. You can use a converge playbook that loads vault files explicitly.

```yaml
# molecule/default/converge.yml
---
- name: Converge
  hosts: all
  become: true
  vars_files:
    # This file is encrypted and needs the vault password
    - ../../vars/vault.yml
  roles:
    - role: my_role
```

```yaml
# molecule/default/molecule.yml
provisioner:
  name: ansible
  config_options:
    defaults:
      vault_password_file: ${MOLECULE_PROJECT_DIRECTORY}/.vault-password
```

## CI Integration

In CI environments, the vault password needs to come from the CI system's secrets management.

For GitHub Actions:

```yaml
# .github/workflows/molecule.yml
jobs:
  molecule:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install molecule molecule-plugins[docker] ansible-core

      - name: Create vault password file
        run: echo "${{ secrets.ANSIBLE_VAULT_PASSWORD }}" > .vault-password

      - name: Run Molecule
        run: molecule test

      - name: Clean up vault password
        if: always()
        run: rm -f .vault-password
```

For GitLab CI:

```yaml
# .gitlab-ci.yml
molecule:
  stage: test
  image: python:3.11-slim
  services:
    - docker:24-dind
  variables:
    DOCKER_HOST: tcp://docker:2375
  before_script:
    - pip install molecule molecule-plugins[docker] ansible-core
    - echo "$ANSIBLE_VAULT_PASSWORD" > .vault-password
  script:
    - molecule test
  after_script:
    - rm -f .vault-password
```

## Testing Vault Encryption Itself

You might want to verify that your vault files are properly encrypted and not accidentally committed in plaintext. Add a verification task.

```yaml
# molecule/default/verify.yml
---
- name: Verify
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    - name: Find vault files
      ansible.builtin.find:
        paths: "{{ lookup('env', 'MOLECULE_PROJECT_DIRECTORY') }}/vars"
        patterns: "vault*.yml"
      register: vault_files

    - name: Check vault files are encrypted
      ansible.builtin.command: "head -1 {{ item.path }}"
      register: file_headers
      loop: "{{ vault_files.files }}"
      changed_when: false

    - name: Assert all vault files are encrypted
      ansible.builtin.assert:
        that:
          - "'$ANSIBLE_VAULT' in item.stdout"
        fail_msg: "File {{ item.item.path }} is not encrypted!"
      loop: "{{ file_headers.results }}"
```

## Using ansible-vault in Prepare

If your prepare step needs to create encrypted files for testing, you can use ansible-vault directly.

```yaml
# molecule/default/prepare.yml
---
- name: Prepare - Create test vault files
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    - name: Create test secrets file
      ansible.builtin.copy:
        dest: /tmp/test-secrets.yml
        content: |
          test_secret: "this-is-a-test-secret"
          test_token: "abc123"
        mode: '0600'

    - name: Encrypt the test secrets file
      ansible.builtin.command: >
        ansible-vault encrypt /tmp/test-secrets.yml
        --vault-password-file {{ lookup('env', 'MOLECULE_PROJECT_DIRECTORY') }}/.vault-password
      changed_when: true
```

## Best Practices

1. **Never commit vault passwords to git.** Use `.gitignore` and CI secrets.

2. **Prefer variable overrides over real vault in tests.** Your tests should validate role logic, not secret values.

3. **Use a consistent vault password across the team.** Store it in a shared secrets manager like HashiCorp Vault or 1Password.

4. **Document the vault password location.** Add it to your role's README so new team members know where to find it.

5. **Keep vault variables separate.** Put encrypted variables in their own file (e.g., `vars/vault.yml`) rather than mixing them with unencrypted variables.

6. **Use vault IDs in multi-environment setups.** This prevents accidentally decrypting the wrong secrets.

Working with Ansible Vault and Molecule takes a bit of initial setup, but once you have a pattern that works, it becomes second nature. The variable override approach is the simplest for most cases, and it keeps your test infrastructure independent from your actual secrets. Reserve real vault decryption in Molecule for cases where you need to test the encryption and decryption process itself.
