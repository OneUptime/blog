# How to Use the community.hashi_vault Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HashiCorp Vault, Secrets Management, DevOps, Security

Description: Learn how to integrate HashiCorp Vault with Ansible using the community.hashi_vault collection for secure secrets management in your automation workflows.

---

Managing secrets in automation pipelines is one of those problems that gets harder as your infrastructure grows. Hardcoding passwords in playbooks is a non-starter, and even Ansible Vault has its limitations when you need centralized secret rotation and auditing. That is where HashiCorp Vault comes in, and the `community.hashi_vault` collection makes it straightforward to pull secrets from Vault directly into your Ansible plays.

## What the community.hashi_vault Collection Provides

The collection includes lookup plugins, modules, and inventory plugins that let Ansible talk to a HashiCorp Vault server. You can read secrets, write them, manage auth methods, and even use Vault as a dynamic inventory source. The main components you will use day to day are:

- `hashi_vault` lookup plugin for reading secrets inline
- `vault_read` and `vault_write` modules for more complex operations
- `vault_login` module for explicit token management
- Connection plugins for Vault-backed inventory

## Installing the Collection

First, install the collection and its Python dependency.

```bash
# Install the Ansible collection
ansible-galaxy collection install community.hashi_vault

# Install the hvac Python library (required by the collection)
pip install hvac
```

You can also pin a specific version in your `requirements.yml` file.

```yaml
# requirements.yml - pin collection versions for reproducibility
collections:
  - name: community.hashi_vault
    version: ">=5.0.0"
```

Then install with:

```bash
ansible-galaxy collection install -r requirements.yml
```

## Authentication Methods

Before you can read secrets, you need to authenticate with Vault. The collection supports multiple auth methods. Here are the most common ones.

### Token Authentication

The simplest approach is to pass a Vault token directly.

```yaml
# playbook-token-auth.yml - using a Vault token directly
- hosts: webservers
  vars:
    vault_addr: "https://vault.example.com:8200"
    vault_token: "{{ lookup('env', 'VAULT_TOKEN') }}"
  tasks:
    - name: Read a secret from Vault KV v2
      ansible.builtin.debug:
        msg: "{{ lookup('community.hashi_vault.hashi_vault',
                  'secret/data/myapp/config',
                  url=vault_addr,
                  token=vault_token) }}"
```

### AppRole Authentication

For automation pipelines, AppRole is the recommended approach. It gives you a role ID and secret ID pair that maps to specific policies.

```yaml
# playbook-approle-auth.yml - authenticate with AppRole
- hosts: webservers
  vars:
    vault_addr: "https://vault.example.com:8200"
  tasks:
    - name: Read database credentials using AppRole
      ansible.builtin.set_fact:
        db_creds: "{{ lookup('community.hashi_vault.hashi_vault',
                      'secret/data/myapp/database',
                      url=vault_addr,
                      auth_method='approle',
                      role_id=lookup('env', 'VAULT_ROLE_ID'),
                      secret_id=lookup('env', 'VAULT_SECRET_ID')) }}"

    - name: Use the retrieved credentials
      ansible.builtin.debug:
        msg: "DB user is {{ db_creds.data.username }}"
```

### Kubernetes Authentication

If you are running Ansible from within a Kubernetes pod, you can use the service account token for authentication.

```yaml
# playbook-k8s-auth.yml - authenticate using Kubernetes service account
- hosts: localhost
  tasks:
    - name: Read secret using Kubernetes auth
      ansible.builtin.set_fact:
        app_secret: "{{ lookup('community.hashi_vault.hashi_vault',
                        'secret/data/myapp/api-keys',
                        url='https://vault.example.com:8200',
                        auth_method='kubernetes',
                        role='my-ansible-role',
                        jwt=lookup('file', '/var/run/secrets/kubernetes.io/serviceaccount/token'),
                        mount_point='kubernetes') }}"
```

## Reading Secrets from KV v2

Most Vault deployments use the KV v2 secrets engine. Here is how you work with it.

```yaml
# playbook-kv2.yml - reading from KV version 2 secrets engine
- hosts: appservers
  vars:
    vault_addr: "https://vault.example.com:8200"
  tasks:
    - name: Get the full secret including metadata
      community.hashi_vault.vault_read:
        url: "{{ vault_addr }}"
        path: "secret/data/myapp/config"
        auth_method: token
        token: "{{ lookup('env', 'VAULT_TOKEN') }}"
      register: vault_response

    - name: Extract just the data portion
      ansible.builtin.set_fact:
        app_config: "{{ vault_response.data.data.data }}"

    - name: Template a config file with secrets
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
        mode: '0600'
      vars:
        api_key: "{{ app_config.api_key }}"
        db_password: "{{ app_config.db_password }}"
```

The corresponding template might look like this:

```jinja2
# app.conf.j2 - application config with secrets injected
[database]
password = {{ db_password }}

[api]
key = {{ api_key }}
```

## Writing Secrets to Vault

You can also write secrets back to Vault, which is useful for rotating credentials or storing generated values.

```yaml
# playbook-write-secret.yml - write a new secret to Vault
- hosts: localhost
  tasks:
    - name: Generate a random password
      ansible.builtin.set_fact:
        new_password: "{{ lookup('ansible.builtin.password', '/dev/null length=32 chars=ascii_letters,digits') }}"

    - name: Store the generated password in Vault
      community.hashi_vault.vault_write:
        url: "https://vault.example.com:8200"
        path: "secret/data/myapp/generated"
        data:
          data:
            password: "{{ new_password }}"
            generated_at: "{{ ansible_date_time.iso8601 }}"
        auth_method: token
        token: "{{ lookup('env', 'VAULT_TOKEN') }}"
```

## Using Vault with Dynamic Database Credentials

One of Vault's killer features is generating short-lived database credentials on the fly. The collection supports this too.

```yaml
# playbook-dynamic-db.yml - get dynamic database credentials from Vault
- hosts: appservers
  tasks:
    - name: Request dynamic database credentials
      community.hashi_vault.vault_read:
        url: "https://vault.example.com:8200"
        path: "database/creds/my-app-role"
        auth_method: approle
        role_id: "{{ lookup('env', 'VAULT_ROLE_ID') }}"
        secret_id: "{{ lookup('env', 'VAULT_SECRET_ID') }}"
      register: db_creds

    - name: Deploy application with dynamic credentials
      ansible.builtin.template:
        src: db-config.j2
        dest: /etc/myapp/db.conf
        mode: '0600'
      vars:
        db_user: "{{ db_creds.data.data.username }}"
        db_pass: "{{ db_creds.data.data.password }}"
        lease_id: "{{ db_creds.data.lease_id }}"

    - name: Log the lease ID for renewal tracking
      ansible.builtin.lineinfile:
        path: /var/log/vault-leases.log
        line: "{{ lease_id }} - {{ ansible_date_time.iso8601 }}"
        create: yes
```

## Environment Variable Configuration

Instead of passing connection details in every task, you can set environment variables that the collection picks up automatically.

```yaml
# playbook-env-config.yml - use environment variables for Vault config
- hosts: all
  environment:
    VAULT_ADDR: "https://vault.example.com:8200"
    VAULT_TOKEN: "{{ vault_token_from_ansible_vault }}"
    VAULT_NAMESPACE: "my-team"
    VAULT_SKIP_VERIFY: "false"
  tasks:
    - name: Read secret (uses env vars for connection)
      ansible.builtin.set_fact:
        secret_val: "{{ lookup('community.hashi_vault.hashi_vault', 'secret/data/myapp/config') }}"
```

## Error Handling

Vault lookups can fail for many reasons: expired tokens, network issues, missing paths. Always handle errors gracefully.

```yaml
# playbook-error-handling.yml - handle Vault failures gracefully
- hosts: appservers
  tasks:
    - name: Try to read a secret from Vault
      community.hashi_vault.vault_read:
        url: "https://vault.example.com:8200"
        path: "secret/data/myapp/config"
        auth_method: token
        token: "{{ lookup('env', 'VAULT_TOKEN') }}"
      register: vault_result
      ignore_errors: yes

    - name: Fail with a helpful message if Vault is unreachable
      ansible.builtin.fail:
        msg: >
          Could not read secret from Vault. Check that VAULT_TOKEN is set
          and that the Vault server at {{ vault_addr }} is reachable.
          Error: {{ vault_result.msg | default('unknown') }}
      when: vault_result is failed

    - name: Use fallback values if secret path does not exist
      ansible.builtin.set_fact:
        app_config: "{{ vault_result.data.data.data | default({'api_key': 'PLACEHOLDER'}) }}"
```

## Tips from Production Use

After running this collection in production for a while, here are some things I have learned:

1. **Cache your tokens.** If you are making multiple Vault calls in a playbook, authenticate once and reuse the token rather than authenticating per task.

2. **Use namespaces.** If your Vault supports namespaces (Enterprise feature), use them to isolate secrets per team or environment.

3. **Pin collection versions.** Vault API changes can break things. Always pin your collection version in `requirements.yml`.

4. **Audit everything.** Vault has built-in audit logging. Make sure it is enabled so you can trace which Ansible runs accessed which secrets.

5. **Prefer AppRole over tokens.** Tokens can be leaked in logs. AppRole with wrapped secret IDs is much safer for automated pipelines.

The `community.hashi_vault` collection is one of those tools that, once you set it up, you wonder how you ever managed secrets without it. The initial configuration takes some effort, but the payoff in security and operational simplicity is well worth it.
