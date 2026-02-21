# How to Encrypt Individual Variables with Ansible Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Security, Variables, Encryption

Description: Learn how to encrypt individual variables in Ansible using encrypt_string for granular secrets management in your playbooks.

---

Encrypting entire files with Ansible Vault is straightforward, but sometimes you only need to protect a single password or API key within a larger YAML file. Encrypting the whole file makes it impossible to see what variables exist without decrypting first, which complicates code reviews and makes diffs useless in version control. The `ansible-vault encrypt_string` command solves this by letting you encrypt individual variable values while keeping the rest of the file in plaintext.

## How encrypt_string Works

When you use `ansible-vault encrypt_string`, Ansible takes a plaintext string and produces a vault-encrypted blob that you embed directly in your YAML files. The surrounding YAML structure stays readable. Only the sensitive value gets encrypted.

The encrypted value is stored as a multi-line YAML block scalar, prefixed with the `!vault` tag so Ansible knows to decrypt it at runtime.

## Basic Usage

The simplest form encrypts a string you type interactively:

```bash
# Encrypt a string interactively
# You'll be prompted for the vault password, then the string to encrypt
ansible-vault encrypt_string --name 'db_password'
```

You can also provide the string directly (useful for scripting):

```bash
# Encrypt a specific string value and name it
# The --name flag sets the YAML variable name in the output
ansible-vault encrypt_string 'SuperSecret123!' --name 'db_password'
```

This produces output like:

```yaml
db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          36323464623062393139336566653338633931363032323031393132356335306530
          62343937313566383531336339363364626133643963326237346232630a323031
          39323462393164303666323736396564346336353230343865613738356266636562
          3563373636653835650a393131323234363763353138343835303566373833363839
          3235
```

## Piping Values from stdin

For values that should never appear in your shell history, pipe them through stdin:

```bash
# Pipe a password from a file or command, avoiding shell history exposure
# The --stdin-name flag names the variable when reading from stdin
echo -n 'MySecretPassword' | ansible-vault encrypt_string \
  --vault-password-file vault_pass.txt \
  --stdin-name 'app_secret'
```

The `-n` flag on echo is important. Without it, a newline character gets appended to your secret, which can cause authentication failures at runtime.

## Embedding Encrypted Variables in YAML Files

Once you have the encrypted output, paste it directly into your variables file:

```yaml
# group_vars/production/vars.yml
# Mix of plaintext config and encrypted secrets in the same file
app_name: my-web-app
app_port: 8080
app_debug: false

# This password is vault-encrypted inline
db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          36323464623062393139336566653338633931363032323031393132356335306530
          62343937313566383531336339363364626133643963326237346232630a323031
          39323462393164303666323736396564346336353230343865613738356266636562
          3563373636653835650a393131323234363763353138343835303566373833363839
          3235

# Another encrypted value in the same file
api_key: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          61323661396237663233353566643566383039643234326464643530636138626133
          31636233303638306432313335393230363731650a383734363233626337396361
          35613364623432376536356334383539393432333739343835616562363762646264
          6530626466616232630a626138656633376136333633636561363264373464623931
          3463
```

## Using Vault IDs with Encrypted Strings

Vault IDs let you label encrypted content so you can use different passwords for different environments:

```bash
# Encrypt with a vault ID label
# 'prod' is the vault ID, and prod_pass.txt contains the password
ansible-vault encrypt_string \
  --vault-id prod@prod_pass.txt \
  'ProductionDBPass!' \
  --name 'db_password'
```

The output includes the vault ID in the header:

```yaml
db_password: !vault |
          $ANSIBLE_VAULT;1.2;AES256;prod
          ...encrypted content...
```

## A Practical Playbook Example

Here is a complete playbook that uses inline encrypted variables to deploy a web application:

```yaml
# deploy_app.yml
# Deploys a web app with secrets stored as inline vault-encrypted values
---
- name: Deploy web application
  hosts: webservers
  vars:
    app_name: customer-portal
    app_port: 3000
    # Encrypted database connection string
    database_url: !vault |
              $ANSIBLE_VAULT;1.1;AES256
              ...encrypted content...
    # Encrypted session secret
    session_secret: !vault |
              $ANSIBLE_VAULT;1.1;AES256
              ...encrypted content...

  tasks:
    - name: Create application config file
      ansible.builtin.template:
        src: app_config.j2
        dest: "/opt/{{ app_name }}/config.env"
        owner: appuser
        group: appuser
        mode: '0600'

    - name: Restart application service
      ansible.builtin.systemd:
        name: "{{ app_name }}"
        state: restarted
```

And the corresponding template:

```jinja2
{# app_config.j2 - Application configuration #}
APP_NAME={{ app_name }}
APP_PORT={{ app_port }}
DATABASE_URL={{ database_url }}
SESSION_SECRET={{ session_secret }}
```

Run the playbook with the vault password:

```bash
# Execute the playbook, providing the vault password
ansible-playbook deploy_app.yml --vault-password-file vault_pass.txt
```

## Generating Multiple Encrypted Strings Efficiently

When you have several secrets to encrypt, a helper script speeds things up:

```bash
#!/bin/bash
# encrypt_vars.sh
# Encrypts multiple variables from a source file
# Input: a file with KEY=VALUE pairs (one per line)

VAULT_PASS_FILE="$1"
INPUT_FILE="$2"

if [ -z "$VAULT_PASS_FILE" ] || [ -z "$INPUT_FILE" ]; then
  echo "Usage: $0 <vault_pass_file> <input_file>"
  exit 1
fi

while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" == \#* ]] && continue

  echo "# Encrypting: $key"
  echo -n "$value" | ansible-vault encrypt_string \
    --vault-password-file "$VAULT_PASS_FILE" \
    --stdin-name "$key"
  echo ""
done < "$INPUT_FILE"
```

Feed it a simple key-value file:

```bash
# secrets.env - plaintext source (DO NOT commit this file)
db_password=MyDBPassword123
api_key=sk-abc123def456
smtp_password=MailPass789
```

```bash
# Generate all encrypted variables at once
chmod +x encrypt_vars.sh
./encrypt_vars.sh vault_pass.txt secrets.env >> group_vars/production/vault.yml
```

## Viewing Encrypted Variable Values

To check what an inline encrypted variable actually contains, use the `ansible` debug module:

```bash
# Decrypt and display a specific variable from a vars file
ansible localhost \
  -m debug \
  -a "var=db_password" \
  -e "@group_vars/production/vars.yml" \
  --vault-password-file vault_pass.txt
```

## Limitations to Know About

Inline encrypted variables have a couple of limitations worth noting.

You cannot rekey inline encrypted strings with `ansible-vault rekey`. That command only works on fully encrypted files. To rotate the password for inline encrypted variables, you need to decrypt each value, then re-encrypt it with the new password. This is where the helper script above becomes especially valuable.

Also, `ansible-vault view` does not work on files containing inline encrypted strings. It only works on files that are entirely vault-encrypted. Use the `ansible debug` approach shown above to inspect individual values.

## Best Practices

Keep your encrypted variables organized. A common pattern is to split each environment's variables into two files:

```
group_vars/
  production/
    vars.yml        # plaintext config (app ports, feature flags, etc.)
    vault.yml       # all vault-encrypted secrets
```

This way, `vars.yml` stays fully readable and diffable, while `vault.yml` contains only encrypted values. Both files get loaded automatically by Ansible based on the group name.

Name your encrypted variables with a `vault_` prefix, then reference them through plaintext variables. This makes it clear which values are secrets:

```yaml
# vault.yml - encrypted values
vault_db_password: !vault |
          ...

# vars.yml - plaintext references
db_password: "{{ vault_db_password }}"
```

This indirection makes it trivial to swap in test values during development without touching the vault file.
