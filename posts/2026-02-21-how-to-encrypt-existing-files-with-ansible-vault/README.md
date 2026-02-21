# How to Encrypt Existing Files with Ansible Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Encryption, Security, Secrets Management

Description: Learn how to encrypt existing plain-text files with Ansible Vault, including variable files, templates, and other sensitive content in your repository.

---

You have a repository with plain-text secrets. Maybe the project started without Ansible Vault and passwords ended up in variable files. Or maybe someone added an API key to a configuration template and committed it. Whatever the reason, you need to encrypt those existing files without losing their content or breaking your playbooks. The `ansible-vault encrypt` command handles this, and this post covers every scenario you will run into.

## The Basic Command

Encrypting an existing file is a one-liner:

```bash
# Encrypt an existing file in place
ansible-vault encrypt group_vars/production/secrets.yml
```

Ansible prompts for a password:

```
New Vault password:
Confirm New Vault password:
Encryption successful
```

The file is now encrypted on disk. The original content is gone, replaced with the encrypted version. If you open the file, you see:

```
$ANSIBLE_VAULT;1.1;AES256
39643365323563666533333732303666326163653862303762613732336337636434633033393863
...
```

## Encrypting with a Password File

For non-interactive use (scripts, CI pipelines):

```bash
# Encrypt using a password file
ansible-vault encrypt --vault-password-file ~/.vault_pass.txt secrets.yml
```

Or if your password file is configured in `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
vault_password_file = ~/.vault_pass.txt
```

```bash
# No need to specify the password file
ansible-vault encrypt secrets.yml
```

## Encrypting Multiple Files at Once

You can encrypt several files in a single command:

```bash
# Encrypt multiple files with the same password
ansible-vault encrypt \
  group_vars/production/secrets.yml \
  group_vars/staging/secrets.yml \
  host_vars/db01/vault.yml \
  host_vars/web01/vault.yml
```

All files get encrypted with the same vault password. This is handy when you are adding Vault to an existing project and need to encrypt a batch of files at once.

## Encrypting with a Vault ID

If you use different passwords for different environments:

```bash
# Encrypt production secrets with the "production" vault ID
ansible-vault encrypt --vault-id production@~/.vault_pass_prod.txt \
  group_vars/production/secrets.yml

# Encrypt staging secrets with the "staging" vault ID
ansible-vault encrypt --vault-id staging@~/.vault_pass_staging.txt \
  group_vars/staging/secrets.yml
```

The vault ID is stored in the file header:

```
$ANSIBLE_VAULT;1.2;AES256;production
39643365323563666533333732303666...
```

This tells Ansible which password to use when decrypting.

## Step-by-Step: Encrypting an Existing Project

Here is a practical workflow for adding Vault encryption to a project that currently has plain-text secrets.

### Step 1: Identify Files with Secrets

First, find the files that need encryption:

```bash
# Look for common secret patterns in your files
grep -rn "password:" group_vars/ host_vars/
grep -rn "api_key:" group_vars/ host_vars/
grep -rn "secret:" group_vars/ host_vars/
grep -rn "token:" group_vars/ host_vars/
```

### Step 2: Reorganize Variables

Before encrypting, separate secrets from non-secret variables. This is important because encrypting an entire file that is mostly non-sensitive makes it harder to review changes in pull requests.

Before:

```yaml
# group_vars/production/main.yml - mix of secrets and config
app_name: myapp
app_port: 8080
app_workers: 4
db_host: 10.0.2.10
db_name: myapp_production
db_password: "the_actual_password"
redis_host: 10.0.3.10
redis_password: "another_secret"
api_key: "sk-live-abc123def456"
```

After splitting:

```yaml
# group_vars/production/vars.yml - non-sensitive (stays plain text)
app_name: myapp
app_port: 8080
app_workers: 4
db_host: 10.0.2.10
db_name: myapp_production
redis_host: 10.0.3.10

# References to vault variables
db_password: "{{ vault_db_password }}"
redis_password: "{{ vault_redis_password }}"
api_key: "{{ vault_api_key }}"
```

```yaml
# group_vars/production/vault.yml - to be encrypted
vault_db_password: "the_actual_password"
vault_redis_password: "another_secret"
vault_api_key: "sk-live-abc123def456"
```

### Step 3: Encrypt the Vault Files

```bash
# Set up the vault password
echo "strong_vault_password_here" > ~/.vault_pass.txt
chmod 600 ~/.vault_pass.txt

# Encrypt the vault files
ansible-vault encrypt --vault-password-file ~/.vault_pass.txt \
  group_vars/production/vault.yml \
  group_vars/staging/vault.yml
```

### Step 4: Verify Everything Works

```bash
# Test that the playbook can still read the encrypted values
ansible-playbook deploy.yml --check --vault-password-file ~/.vault_pass.txt
```

### Step 5: Remove Secrets from Git History

Encrypting files in the working directory does not remove the plain-text versions from Git history. You need to handle that separately:

```bash
# Option 1: If the secret exposure is limited, rotate the secrets
# (change all passwords, API keys, etc. to new values)

# Option 2: If you need to purge history (destructive)
# Use git filter-branch or BFG Repo Cleaner
# bfg --delete-files secrets.yml
# git reflog expire --expire=now --all
# git gc --prune=now --aggressive
```

Rotating secrets is almost always the better option. Purging Git history is messy and forces everyone to re-clone.

### Step 6: Update .gitignore

```
# .gitignore
# Vault password files
.vault_pass*
*.vault_pass
vault_password*

# Decrypted temp files
*.decrypted
*.plain
```

## Encrypting Non-YAML Files

Ansible Vault can encrypt any file, not just YAML:

```bash
# Encrypt an SSL private key
ansible-vault encrypt files/ssl/private.key

# Encrypt a configuration file with embedded secrets
ansible-vault encrypt templates/database.conf

# Encrypt a shell script with credentials
ansible-vault encrypt files/deploy.sh
```

For non-YAML files, you will need to use them differently in your playbooks:

```yaml
# For encrypted files used with the 'copy' module
- name: Deploy encrypted private key
  ansible.builtin.copy:
    src: ssl/private.key    # Ansible decrypts this automatically
    dest: /etc/ssl/private/server.key
    owner: root
    group: root
    mode: '0600'
```

## Encrypting Strings Within Files

If you only want to encrypt specific values rather than entire files:

```bash
# Encrypt a single string value
ansible-vault encrypt_string --vault-password-file ~/.vault_pass.txt \
  'the_actual_password' \
  --name 'vault_db_password'
```

Output:

```yaml
vault_db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          36303861363266343733383838333766616563376530313833613134636530653864633463316163
          3739623738656230306237633263376232346132333333660a366630626466303633333538393363
          31376136343461633835393837396437636264616636323232383561393164323834363138633633
          6161653135623538360a613964613461623163396363653132373035343862316363376534303063
          31343466326163343533656363353764636565366464386361306563373263343966
```

Paste this into any YAML file. The rest of the file stays in plain text.

## Bulk Encryption Script

For larger projects, use a script:

```bash
#!/bin/bash
# encrypt-vault-files.sh
# Encrypt all vault.yml files in the project

VAULT_PASS_FILE="${1:-~/.vault_pass.txt}"

if [ ! -f "$VAULT_PASS_FILE" ]; then
    echo "Vault password file not found: $VAULT_PASS_FILE"
    exit 1
fi

# Find all files named vault.yml that are not already encrypted
find . -name "vault.yml" -type f | while read -r file; do
    if ! head -1 "$file" | grep -q '^\$ANSIBLE_VAULT'; then
        echo "Encrypting: $file"
        ansible-vault encrypt --vault-password-file "$VAULT_PASS_FILE" "$file"
    else
        echo "Already encrypted: $file"
    fi
done
```

```bash
# Run the script
chmod +x encrypt-vault-files.sh
./encrypt-vault-files.sh ~/.vault_pass.txt
```

## Verifying Encryption

After encrypting, verify that the files are properly encrypted:

```bash
# Check if a file is encrypted
head -1 group_vars/production/vault.yml
# Should show: $ANSIBLE_VAULT;1.1;AES256

# Verify you can decrypt it (view without modifying)
ansible-vault view --vault-password-file ~/.vault_pass.txt group_vars/production/vault.yml

# Run a full playbook check
ansible-playbook site.yml --check --vault-password-file ~/.vault_pass.txt
```

## Common Mistakes

**Forgetting to encrypt a new secret file.** Add a pre-commit hook:

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Check for unencrypted vault files
for file in $(git diff --cached --name-only | grep "vault"); do
    if ! head -1 "$file" | grep -q '^\$ANSIBLE_VAULT'; then
        echo "ERROR: $file contains unencrypted vault data"
        exit 1
    fi
done
```

**Using a weak vault password.** Use a long, random password. Generate one:

```bash
# Generate a strong vault password
openssl rand -base64 32 > ~/.vault_pass.txt
chmod 600 ~/.vault_pass.txt
```

**Not backing up the vault password.** If you lose the vault password, the encrypted data is gone forever. Store the password in a separate, secure location like a password manager or a hardware security module.

The `ansible-vault encrypt` command is the workhorse for retrofitting encryption into existing projects. The key is to plan the file reorganization before you start encrypting, and to always verify that your playbooks still work after the migration.
