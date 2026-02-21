# How to Use Ansible to Manage Secrets with SOPS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SOPS, Secrets Management, Security, Encryption

Description: Integrate Mozilla SOPS with Ansible for encrypted secrets management, enabling safe storage of sensitive data in version control.

---

Secrets management is one of the hardest problems in infrastructure automation. You need passwords, API keys, certificates, and other sensitive data available to your playbooks, but you cannot store them in plain text in your repository. Ansible Vault is the built-in solution, but it has limitations: it encrypts entire files, makes diffs useless, and managing multiple encryption keys is awkward.

Mozilla SOPS (Secrets OPerationS) takes a different approach. It encrypts only the values in a YAML or JSON file, leaving keys visible. This means you can see the structure of your secrets files, get meaningful diffs, and use multiple encryption backends (AWS KMS, GCP KMS, Azure Key Vault, PGP, or age). In this post, I will show you how to integrate SOPS with Ansible for practical secrets management.

## Why SOPS Over Ansible Vault?

Both tools encrypt secrets, but they work differently:

```mermaid
flowchart LR
    subgraph Ansible Vault
        A[secrets.yml] -->|Encrypt entire file| B[Encrypted blob]
        B -->|git diff| C[Useless diff]
    end
    subgraph SOPS
        D[secrets.yml] -->|Encrypt values only| E[Keys visible, values encrypted]
        E -->|git diff| F[Meaningful diff]
    end
```

With Ansible Vault, a small change produces a completely different encrypted file. With SOPS, you can see exactly which values changed.

## Installing SOPS

First, install SOPS on your Ansible controller and optionally on target hosts.

This playbook installs SOPS:

```yaml
# install_sops.yml - Install Mozilla SOPS
---
- name: Install SOPS
  hosts: localhost
  become: true

  vars:
    sops_version: "3.8.1"

  tasks:
    - name: Download SOPS binary
      ansible.builtin.get_url:
        url: "https://github.com/getsops/sops/releases/download/v{{ sops_version }}/sops-v{{ sops_version }}.linux.amd64"
        dest: /usr/local/bin/sops
        mode: '0755'
      when: ansible_system == "Linux"

    - name: Download SOPS binary (macOS)
      ansible.builtin.get_url:
        url: "https://github.com/getsops/sops/releases/download/v{{ sops_version }}/sops-v{{ sops_version }}.darwin.amd64"
        dest: /usr/local/bin/sops
        mode: '0755'
      when: ansible_system == "Darwin"

    - name: Verify SOPS installation
      ansible.builtin.command: sops --version
      register: sops_version_check
      changed_when: false

    - name: Display SOPS version
      ansible.builtin.debug:
        msg: "{{ sops_version_check.stdout }}"
```

## Setting Up SOPS with age Encryption

age is the simplest encryption backend for SOPS. It is a modern replacement for PGP that is much easier to use.

This playbook sets up age keys for SOPS:

```yaml
# setup_sops_age.yml - Set up SOPS with age encryption
---
- name: Set up SOPS with age
  hosts: localhost
  connection: local

  vars:
    age_key_dir: "{{ ansible_env.HOME }}/.config/sops/age"

  tasks:
    - name: Install age
      ansible.builtin.package:
        name: age
        state: present
      become: true

    - name: Create age key directory
      ansible.builtin.file:
        path: "{{ age_key_dir }}"
        state: directory
        mode: '0700'

    - name: Check if age key exists
      ansible.builtin.stat:
        path: "{{ age_key_dir }}/keys.txt"
      register: age_key

    - name: Generate age key pair
      ansible.builtin.command: age-keygen -o {{ age_key_dir }}/keys.txt
      when: not age_key.stat.exists
      register: keygen_output

    - name: Get public key
      ansible.builtin.shell: grep "public key" {{ age_key_dir }}/keys.txt | awk '{print $NF}'
      register: age_public_key
      changed_when: false

    - name: Display public key
      ansible.builtin.debug:
        msg: "Age public key: {{ age_public_key.stdout }}"

    - name: Set key file permissions
      ansible.builtin.file:
        path: "{{ age_key_dir }}/keys.txt"
        mode: '0600'
```

## Creating the SOPS Configuration

SOPS uses a `.sops.yaml` file to define encryption rules per file path.

This playbook creates the SOPS configuration for your project:

```yaml
# configure_sops.yml - Create SOPS configuration
---
- name: Configure SOPS
  hosts: localhost
  connection: local

  vars:
    project_dir: "{{ playbook_dir }}"
    age_recipients:
      - age1abc123...  # DevOps team key
      - age1def456...  # CI/CD key
    sops_rules:
      - path_regex: ".*secrets.*\\.ya?ml$"
        encrypted_regex: "^(password|secret|key|token|api_key|private_key)$"
      - path_regex: ".*credentials.*\\.ya?ml$"

  tasks:
    - name: Deploy .sops.yaml configuration
      ansible.builtin.copy:
        content: |
          # SOPS configuration - Managed by Ansible
          creation_rules:
          {% for rule in sops_rules %}
            - path_regex: {{ rule.path_regex }}
          {% if rule.encrypted_regex is defined %}
              encrypted_regex: '{{ rule.encrypted_regex }}'
          {% endif %}
              age: >-
                {{ age_recipients | join(',') }}
          {% endfor %}
        dest: "{{ project_dir }}/.sops.yaml"
        mode: '0644'
```

## Creating Encrypted Secrets Files

With SOPS configured, create encrypted secrets files that Ansible can consume.

This shows how to create and manage SOPS-encrypted variable files:

```yaml
# The plaintext version of secrets (before encryption)
# group_vars/production/secrets.yml
---
database_password: super_secret_password
api_key: sk-abc123def456
redis_password: another_secret
tls_private_key: |
  -----BEGIN PRIVATE KEY-----
  MIIEvgIBADANBgkqhk...
  -----END PRIVATE KEY-----
```

After running `sops -e -i group_vars/production/secrets.yml`, the file becomes:

```yaml
# What SOPS-encrypted secrets look like (keys visible, values encrypted)
database_password: ENC[AES256_GCM,data:abc123...,iv:...,tag:...,type:str]
api_key: ENC[AES256_GCM,data:def456...,iv:...,tag:...,type:str]
redis_password: ENC[AES256_GCM,data:ghi789...,iv:...,tag:...,type:str]
tls_private_key: ENC[AES256_GCM,data:jkl012...,iv:...,tag:...,type:str]
sops:
    age:
        - recipient: age1abc123...
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            ...
            -----END AGE ENCRYPTED FILE-----
    lastmodified: "2026-02-21T10:00:00Z"
    version: 3.8.1
```

## Using SOPS with Ansible Lookup Plugin

The community.sops collection provides a lookup plugin that decrypts SOPS files inline.

This playbook uses SOPS-encrypted variables:

```yaml
# deploy_with_sops.yml - Use SOPS secrets in Ansible
---
- name: Deploy application with SOPS secrets
  hosts: webservers
  become: true

  vars:
    # Load secrets from SOPS-encrypted file
    db_secrets: "{{ lookup('community.sops.sops', 'group_vars/production/secrets.yml') | from_yaml }}"

  tasks:
    - name: Deploy database configuration
      ansible.builtin.template:
        src: database.conf.j2
        dest: /etc/myapp/database.conf
        owner: root
        group: myapp
        mode: '0640'
      vars:
        db_password: "{{ db_secrets.database_password }}"
        db_host: "db.example.com"

    - name: Deploy application configuration
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
        owner: root
        group: myapp
        mode: '0640'
      vars:
        api_key: "{{ db_secrets.api_key }}"
```

Install the required collection first:

```yaml
# requirements.yml - Ansible collection requirements
---
collections:
  - name: community.sops
    version: ">=1.6.0"
```

## Using SOPS with AWS KMS

For production environments, AWS KMS provides a more robust key management solution.

This playbook sets up SOPS with AWS KMS:

```yaml
# setup_sops_kms.yml - Configure SOPS with AWS KMS
---
- name: Set up SOPS with AWS KMS
  hosts: localhost
  connection: local

  vars:
    kms_key_arn: "arn:aws:kms:us-east-1:123456789:key/abcdef-1234-5678"

  tasks:
    - name: Deploy .sops.yaml for KMS
      ansible.builtin.copy:
        content: |
          creation_rules:
            - path_regex: ".*secrets.*\\.ya?ml$"
              kms: '{{ kms_key_arn }}'
              encrypted_regex: '^(password|secret|key|token|api_key|private_key|cert)$'
            - path_regex: ".*credentials.*\\.ya?ml$"
              kms: '{{ kms_key_arn }}'
        dest: .sops.yaml
        mode: '0644'

    - name: Test SOPS encryption with KMS
      ansible.builtin.shell: |
        echo "test_secret: hello" | sops -e --input-type yaml --output-type yaml /dev/stdin
      register: sops_test
      changed_when: false
      environment:
        AWS_PROFILE: default

    - name: Verify encryption worked
      ansible.builtin.debug:
        msg: "SOPS KMS encryption working"
      when: "'ENC[' in sops_test.stdout"
```

## Secret Rotation with SOPS

When you need to rotate secrets, SOPS makes it simple because you can edit encrypted files directly.

This playbook automates secret rotation:

```yaml
# rotate_secrets.yml - Rotate secrets in SOPS files
---
- name: Rotate secrets
  hosts: localhost
  connection: local

  vars:
    secrets_file: group_vars/production/secrets.yml
    new_db_password: "{{ lookup('password', '/dev/null length=32 chars=ascii_letters,digits') }}"

  tasks:
    - name: Decrypt secrets file
      ansible.builtin.command: sops -d {{ secrets_file }}
      register: current_secrets
      changed_when: false

    - name: Parse current secrets
      ansible.builtin.set_fact:
        secrets: "{{ current_secrets.stdout | from_yaml }}"

    - name: Update database password
      ansible.builtin.set_fact:
        updated_secrets: "{{ secrets | combine({'database_password': new_db_password}) }}"

    - name: Write updated secrets
      ansible.builtin.copy:
        content: "{{ updated_secrets | to_nice_yaml }}"
        dest: "{{ secrets_file }}.tmp"
        mode: '0600'

    - name: Re-encrypt with SOPS
      ansible.builtin.command: sops -e -i {{ secrets_file }}.tmp
      changed_when: true

    - name: Replace original file
      ansible.builtin.command: mv {{ secrets_file }}.tmp {{ secrets_file }}
      changed_when: true

    - name: Deploy rotated password to servers
      ansible.builtin.debug:
        msg: "Run your deployment playbook to push the new password"
```

## Managing Multiple Environments

SOPS excels at managing secrets across environments because each environment can use different encryption keys.

The `.sops.yaml` configuration supports per-environment rules:

```yaml
# .sops.yaml - Multi-environment SOPS configuration
creation_rules:
  # Development secrets - encrypted with dev team key
  - path_regex: "environments/dev/.*secrets.*\\.ya?ml$"
    age: age1devkey...

  # Staging secrets - encrypted with staging key
  - path_regex: "environments/staging/.*secrets.*\\.ya?ml$"
    age: age1stagingkey...
    kms: "arn:aws:kms:us-east-1:123456789:key/staging-key"

  # Production secrets - encrypted with production keys (multiple recipients)
  - path_regex: "environments/prod/.*secrets.*\\.ya?ml$"
    age: >-
      age1prodkey1...,
      age1prodkey2...
    kms: "arn:aws:kms:us-east-1:123456789:key/prod-key"
```

## CI/CD Integration

Decrypt secrets in CI/CD pipelines without storing plain text:

```yaml
# ci_sops_decrypt.yml - Decrypt secrets for CI/CD
---
- name: CI/CD secrets handling
  hosts: localhost
  connection: local

  vars:
    environment: production
    secrets_files:
      - "environments/{{ environment }}/secrets.yml"
      - "environments/{{ environment }}/credentials.yml"

  tasks:
    - name: Decrypt all secrets files
      ansible.builtin.command: "sops -d {{ item }}"
      loop: "{{ secrets_files }}"
      register: decrypted_secrets
      changed_when: false
      no_log: true

    - name: Load secrets into variables
      ansible.builtin.set_fact:
        "{{ item.item | basename | splitext | first | replace('-', '_') }}": "{{ item.stdout | from_yaml }}"
      loop: "{{ decrypted_secrets.results }}"
      no_log: true
```

## Auditing Secret Access

Track who has access to decrypt secrets:

```yaml
# audit_sops_access.yml - Audit SOPS encryption keys
---
- name: Audit SOPS secret access
  hosts: localhost
  connection: local

  tasks:
    - name: Find all SOPS-encrypted files
      ansible.builtin.find:
        paths: .
        patterns: "*.yml,*.yaml"
        recurse: true
        contains: "sops:"
      register: sops_files

    - name: Extract recipient info from each file
      ansible.builtin.shell: "sops -d --extract '[\"sops\"]' {{ item.path }} 2>/dev/null | grep -A1 recipient || true"
      loop: "{{ sops_files.files }}"
      register: recipient_info
      changed_when: false

    - name: Report SOPS access summary
      ansible.builtin.debug:
        msg: "{{ item.item.path }}: {{ item.stdout_lines | length }} recipients"
      loop: "{{ recipient_info.results }}"
```

## Production Tips

1. **Use partial encryption.** The `encrypted_regex` setting lets you encrypt only sensitive values. This keeps your files readable and diffs meaningful.
2. **Use multiple recipients.** Always encrypt to multiple keys so you are not locked out if one key is lost.
3. **Prefer KMS over PGP.** Cloud KMS services (AWS, GCP, Azure) provide better key management, access control, and audit logging than PGP.
4. **Commit encrypted files to git.** This is the whole point of SOPS. Encrypted secrets are safe to version control.
5. **Rotate encryption keys periodically.** SOPS supports re-encrypting files with new keys using `sops updatekeys`.
6. **Use no_log in Ansible.** When working with decrypted secrets in playbooks, use `no_log: true` to prevent sensitive values from appearing in logs.

SOPS with Ansible gives you a secrets management workflow that is version-control friendly, supports multiple encryption backends, and produces readable diffs. It is a significant step up from Ansible Vault for teams managing secrets across multiple environments.
