# How to Store SSH Keys in Ansible Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, SSH, Security, Key Management

Description: Learn how to securely store and deploy SSH private keys using Ansible Vault for service accounts, deploy keys, and inter-service authentication.

---

SSH private keys are the most sensitive credential type you will deal with in infrastructure automation. Unlike passwords, which can be changed quickly, compromised SSH keys can grant persistent access to systems until the corresponding public key is removed from every authorized_keys file and every service that trusts it. Storing SSH keys in Ansible Vault keeps them encrypted at rest while allowing your automation to deploy them securely to the systems that need them.

## When to Store SSH Keys in Vault

Not every SSH key belongs in Ansible Vault. Here are the common cases where it makes sense:

- **Deploy keys**: Used by CI/CD to pull code from private repositories
- **Service account keys**: Used by applications to connect to other servers (e.g., backup scripts, database tunnels)
- **Inter-service authentication**: Used between microservices for SSH-based communication
- **Host keys**: Private host keys that should be consistent across rebuilds

Personal developer SSH keys should NOT go in vault. Each developer should manage their own keys.

## Storing a Private Key in Vault

SSH private keys are multi-line strings, which requires care when encrypting with `ansible-vault encrypt_string`.

### Method 1: Encrypt the Entire Key File

The simplest approach is to encrypt the key file itself:

```bash
# Generate a new SSH key pair for a service account
ssh-keygen -t ed25519 -f /tmp/deploy_key -N "" -C "deploy@myapp"

# Encrypt the private key file with Ansible Vault
ansible-vault encrypt --vault-password-file vault_pass.txt /tmp/deploy_key

# Move the encrypted file into your project
mv /tmp/deploy_key roles/deploy/files/deploy_key.vault
mv /tmp/deploy_key.pub roles/deploy/files/deploy_key.pub
```

Use it in a playbook:

```yaml
# Deploy the vault-encrypted SSH key
- name: Deploy service account SSH key
  ansible.builtin.copy:
    src: deploy_key.vault
    dest: "/home/{{ deploy_user }}/.ssh/id_ed25519"
    owner: "{{ deploy_user }}"
    group: "{{ deploy_user }}"
    mode: '0600'
  no_log: true
```

### Method 2: Store the Key as a Vault Variable

Store the key contents in a variable file:

```bash
# Read the key and encrypt it as a variable
# The key content needs to be properly formatted for YAML
ansible-vault encrypt_string \
  --vault-password-file vault_pass.txt \
  --name 'vault_deploy_ssh_key' \
  "$(cat /tmp/deploy_key)"
```

Place it in your vault file:

```yaml
# group_vars/production/vault.yml (encrypted)
---
vault_deploy_ssh_key: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
  ... (full key content) ...
  -----END OPENSSH PRIVATE KEY-----

vault_backup_ssh_key: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  ... (another key) ...
  -----END OPENSSH PRIVATE KEY-----
```

Then encrypt the entire file:

```bash
ansible-vault encrypt group_vars/production/vault.yml
```

## Deploying SSH Keys from Variables

Use the `copy` module with `content` to write the key from a variable:

```yaml
# roles/deploy/tasks/main.yml
# Deploys SSH keys for service accounts
---
- name: Ensure .ssh directory exists
  ansible.builtin.file:
    path: "/home/{{ deploy_user }}/.ssh"
    state: directory
    owner: "{{ deploy_user }}"
    group: "{{ deploy_user }}"
    mode: '0700'

- name: Deploy SSH private key
  ansible.builtin.copy:
    content: "{{ vault_deploy_ssh_key }}"
    dest: "/home/{{ deploy_user }}/.ssh/id_ed25519"
    owner: "{{ deploy_user }}"
    group: "{{ deploy_user }}"
    mode: '0600'
  no_log: true

- name: Deploy SSH public key
  ansible.builtin.copy:
    content: "{{ deploy_ssh_public_key }}"
    dest: "/home/{{ deploy_user }}/.ssh/id_ed25519.pub"
    owner: "{{ deploy_user }}"
    group: "{{ deploy_user }}"
    mode: '0644'

- name: Configure SSH to use the key for specific hosts
  ansible.builtin.template:
    src: ssh_config.j2
    dest: "/home/{{ deploy_user }}/.ssh/config"
    owner: "{{ deploy_user }}"
    group: "{{ deploy_user }}"
    mode: '0600'
```

The SSH config template:

```jinja2
{# ssh_config.j2 - SSH client configuration for service account #}
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new

Host backup-server
    HostName {{ backup_server_host }}
    User backup
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    Port {{ backup_server_port | default(22) }}
```

## Deploy Keys for Git Repositories

A common use case is deploying application code from private Git repositories:

```yaml
# roles/webapp/tasks/deploy.yml
# Deploys application code using a vault-encrypted deploy key
---
- name: Deploy SSH key for Git access
  ansible.builtin.copy:
    content: "{{ vault_git_deploy_key }}"
    dest: "/tmp/git_deploy_key"
    mode: '0600'
  no_log: true

- name: Clone application repository
  ansible.builtin.git:
    repo: "git@github.com:your-org/your-app.git"
    dest: "/opt/{{ app_name }}"
    version: "{{ app_version }}"
    key_file: "/tmp/git_deploy_key"
    accept_hostkey: true

- name: Remove temporary deploy key
  ansible.builtin.file:
    path: "/tmp/git_deploy_key"
    state: absent
```

## Managing Multiple SSH Keys

When you have several service account keys:

```yaml
# group_vars/production/vault.yml (before encryption)
---
vault_ssh_keys:
  deploy:
    private: |
      -----BEGIN OPENSSH PRIVATE KEY-----
      ...deploy key content...
      -----END OPENSSH PRIVATE KEY-----
    public: "ssh-ed25519 AAAA... deploy@myapp"

  backup:
    private: |
      -----BEGIN OPENSSH PRIVATE KEY-----
      ...backup key content...
      -----END OPENSSH PRIVATE KEY-----
    public: "ssh-ed25519 AAAA... backup@myapp"

  monitoring:
    private: |
      -----BEGIN OPENSSH PRIVATE KEY-----
      ...monitoring key content...
      -----END OPENSSH PRIVATE KEY-----
    public: "ssh-ed25519 AAAA... monitoring@myapp"
```

Deploy them with a loop:

```yaml
# Deploy multiple SSH keys from the vault_ssh_keys dictionary
- name: Deploy SSH keys for all service accounts
  ansible.builtin.copy:
    content: "{{ item.value.private }}"
    dest: "/home/{{ item.key }}/.ssh/id_ed25519"
    owner: "{{ item.key }}"
    group: "{{ item.key }}"
    mode: '0600'
  loop: "{{ vault_ssh_keys | dict2items }}"
  loop_control:
    label: "{{ item.key }}"  # Only show the key name, not the content
  no_log: true
```

## SSH Host Keys in Vault

For consistent host keys across server rebuilds (important for known_hosts stability):

```yaml
# group_vars/production/vault.yml (before encryption)
---
vault_host_ssh_keys:
  ed25519:
    private: |
      -----BEGIN OPENSSH PRIVATE KEY-----
      ...host key content...
      -----END OPENSSH PRIVATE KEY-----
    public: "ssh-ed25519 AAAA... root@server"
  rsa:
    private: |
      -----BEGIN OPENSSH PRIVATE KEY-----
      ...host RSA key content...
      -----END OPENSSH PRIVATE KEY-----
    public: "ssh-rsa AAAA... root@server"
```

```yaml
# Deploy consistent host keys
- name: Deploy SSH host keys
  ansible.builtin.copy:
    content: "{{ item.value.private }}"
    dest: "/etc/ssh/ssh_host_{{ item.key }}_key"
    owner: root
    group: root
    mode: '0600'
  loop: "{{ vault_host_ssh_keys | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  no_log: true
  notify: restart sshd

- name: Deploy SSH host public keys
  ansible.builtin.copy:
    content: "{{ item.value.public }}"
    dest: "/etc/ssh/ssh_host_{{ item.key }}_key.pub"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ vault_host_ssh_keys | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
```

## Key Rotation Workflow

```mermaid
flowchart TD
    A[Generate New SSH Key Pair] --> B[Add New Public Key to Authorized Hosts]
    B --> C[Update Vault with New Private Key]
    C --> D[Deploy New Key via Ansible]
    D --> E[Test Connectivity with New Key]
    E --> F{Working?}
    F -->|Yes| G[Remove Old Public Key from Authorized Hosts]
    F -->|No| H[Debug - Old Key Still Works as Fallback]
    G --> I[Commit Updated Vault File]
```

The overlap period (both old and new public keys authorized) ensures zero downtime during rotation.

## Common Pitfalls

**Trailing newlines**: SSH keys are sensitive to formatting. Make sure the key content in your vault variable has exactly the right newlines. An extra newline at the end can cause `ssh` to reject the key.

**File permissions**: SSH strictly enforces permissions. The private key file must be `0600` and the `.ssh` directory must be `0700`. If permissions are wrong, SSH silently refuses to use the key.

**YAML multi-line strings**: Use the pipe (`|`) for multi-line YAML values to preserve newlines in the key content. Do not use `>` (folded style), which replaces newlines with spaces.

```yaml
# CORRECT: pipe preserves newlines
vault_ssh_key: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  line1
  line2
  -----END OPENSSH PRIVATE KEY-----

# WRONG: folded style breaks the key format
vault_ssh_key: >
  -----BEGIN OPENSSH PRIVATE KEY-----
  line1
  line2
  -----END OPENSSH PRIVATE KEY-----
```

## Summary

SSH keys stored in Ansible Vault stay encrypted in your repository and get decrypted only during playbook execution. Use file-level encryption for simplicity or variable-level storage for flexibility. Always set `no_log: true` on tasks that handle private keys, enforce strict file permissions, and use the YAML pipe character to preserve multi-line key formatting. For key rotation, overlap the old and new keys during the transition to avoid access disruptions.
