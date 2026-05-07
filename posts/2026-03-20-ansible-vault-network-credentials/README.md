# How to Use Ansible Vault to Secure Network Device Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Security, Credential, Network Automation

Description: Learn how to use Ansible Vault to encrypt network device credentials in your inventory and playbooks, preventing password exposure in source control.

## Why Use Ansible Vault?

Network automation playbooks often contain sensitive credentials: device passwords, enable passwords, SNMP community strings. Storing these in plain-text YAML files and committing to Git is a security risk.

Ansible Vault encrypts secrets using AES256 so they can be stored in version control in encrypted form.

## Step 1: Create a Vault Password File

```bash
# Create a secure vault password file (don't commit this!)

echo "my_very_strong_vault_password" > ~/.ansible_vault_pass
chmod 600 ~/.ansible_vault_pass

# If you also keep a vault password file in the repository, ignore it
echo ".ansible_vault_pass" >> .gitignore
echo "vault_pass.txt" >> .gitignore
```

## Step 2: Encrypt Credentials with ansible-vault

```bash
# Create an encrypted variables file
ansible-vault create --vault-password-file ~/.ansible_vault_pass group_vars/all/vault.yml

# The file editor opens. Add content like the following, then save:
# vault_network_password: "device_password_here"
# vault_enable_password: "enable_password_here"
# vault_snmp_community: "snmp_read_community"

# Encrypt an existing file
ansible-vault encrypt --vault-password-file ~/.ansible_vault_pass \
  group_vars/cisco_routers/credentials.yml

# Edit an encrypted file
ansible-vault edit --vault-password-file ~/.ansible_vault_pass \
  group_vars/all/vault.yml

# View an encrypted file (decrypts temporarily)
ansible-vault view --vault-password-file ~/.ansible_vault_pass \
  group_vars/all/vault.yml
```

## Step 3: Structure Your Inventory Variables

```yaml
# group_vars/cisco_routers/vars.yml (NOT encrypted - just references)
ansible_user: admin
ansible_password: "{{ vault_network_password }}"    # References vault
ansible_become: yes
ansible_become_method: enable
ansible_become_password: "{{ vault_enable_password }}"    # References vault
ansible_network_os: cisco.ios.ios
ansible_connection: ansible.netcommon.network_cli
```

```yaml
# group_vars/cisco_routers/vault.yml (ENCRYPTED with ansible-vault)
vault_network_password: "actual_device_password"
vault_enable_password: "actual_enable_password"
```

## Step 4: Run Playbooks with Vault

```bash
# Run with vault password file
ansible-playbook -i inventory/hosts.yml \
  --vault-password-file ~/.ansible_vault_pass \
  playbooks/configure.yml

# Or prompt for vault password interactively
ansible-playbook -i inventory/hosts.yml \
  --ask-vault-pass \
  playbooks/configure.yml

# Or via environment variable
export ANSIBLE_VAULT_PASSWORD_FILE=~/.ansible_vault_pass
ansible-playbook -i inventory/hosts.yml playbooks/configure.yml
```

## Step 5: Encrypt Individual Values (Inline Vault)

For single values mixed with plain-text variables:

```bash
# Create an encrypted string for a single variable
ansible-vault encrypt_string --vault-password-file ~/.ansible_vault_pass \
  'my_device_password' \
  --name 'ansible_password'

# Output:
# ansible_password: !vault |
#           $ANSIBLE_VAULT;1.1;AES256
#           61623339333063306338623832663631...
```

Paste the output into your vars file:

```yaml
# group_vars/cisco_routers/vars.yml
ansible_user: admin
ansible_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          61623339333063306338623832663631...
```

## Step 6: Use Vault with CI/CD Pipelines

```yaml
# .github/workflows/network-deploy.yml
name: Deploy Network Configuration

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Install Ansible
        run: pip install ansible

      - name: Create vault password file
        run: echo "${{ secrets.ANSIBLE_VAULT_PASSWORD }}" > vault_pass.txt

      - name: Run playbook
        run: |
          ansible-playbook -i inventory/hosts.yml \
            --vault-password-file vault_pass.txt \
            playbooks/configure.yml
        env:
          ANSIBLE_HOST_KEY_CHECKING: false

      - name: Clean up vault password
        run: rm -f vault_pass.txt
        if: always()
```

## Step 7: Re-key Vault After Password Rotation

```bash
# Change the vault password
ansible-vault rekey --vault-password-file old_vault_pass.txt \
  --new-vault-password-file new_vault_pass.txt \
  group_vars/all/vault.yml

# Or using --ask-vault-pass and --new-vault-password-file
ansible-vault rekey --ask-vault-pass \
  --new-vault-password-file new_vault_pass.txt \
  group_vars/all/vault.yml
```

## Conclusion

Ansible Vault protects network credentials with AES256 encryption. Create a `vault.yml` file with `ansible-vault create` for each group, store actual credentials there, and reference them via `{{ vault_variable_name }}` in your plain-text vars files. Provide the vault password via `--vault-password-file` at runtime or via the `ANSIBLE_VAULT_PASSWORD_FILE` environment variable in CI/CD pipelines. Never commit the vault password file to source control - add it to `.gitignore`.
