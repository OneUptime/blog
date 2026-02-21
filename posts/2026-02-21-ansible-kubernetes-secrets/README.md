# How to Use Ansible to Create Kubernetes Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Secrets, Security, DevOps

Description: Learn how to securely create and manage Kubernetes Secrets using Ansible with Ansible Vault integration for safe credential management.

---

Kubernetes Secrets store sensitive data like passwords, API keys, TLS certificates, and tokens. While they are only base64-encoded (not encrypted) by default in etcd, they still provide a better separation of concerns than stuffing credentials into ConfigMaps or container images. When you combine Kubernetes Secrets with Ansible and Ansible Vault, you get a workflow where secrets are encrypted at rest in your repository and only decrypted at deployment time.

This guide covers creating different types of Kubernetes Secrets with Ansible, integrating Ansible Vault for safe storage, and handling TLS certificates and Docker registry credentials.

## Prerequisites

- Ansible 2.12+
- `kubernetes.core` collection installed
- Python `kubernetes` library
- A valid kubeconfig
- Ansible Vault set up (optional, but strongly recommended)

```bash
# Install the required pieces
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Creating Opaque Secrets

Opaque is the default Secret type. It stores arbitrary key-value pairs. The `kubernetes.core.k8s` module handles base64 encoding for you when you use `stringData` instead of `data`.

```yaml
# playbook: create-opaque-secret.yml
# Creates a secret with database credentials using stringData (auto-encoded)
---
- name: Create Kubernetes Opaque Secret
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create database credentials secret
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: db-credentials
            namespace: production
            labels:
              app: myapp
              managed-by: ansible
          type: Opaque
          stringData:
            DB_USERNAME: "app_user"
            DB_PASSWORD: "s3cur3P@ssw0rd"
            DB_CONNECTION_STRING: "postgresql://app_user:s3cur3P@ssw0rd@postgres:5432/myapp"
```

Using `stringData` is much more convenient than `data` because you do not have to manually base64-encode your values. Kubernetes converts `stringData` to base64 `data` when storing the Secret.

## Integrating Ansible Vault for Real Security

Hardcoding passwords in a playbook is obviously a bad idea. Ansible Vault encrypts your sensitive variables so they can safely live in version control.

First, create an encrypted variables file:

```bash
# Create an encrypted file to store secret values
ansible-vault create vars/secrets.yml
```

Inside `vars/secrets.yml`, define your sensitive values:

```yaml
# vars/secrets.yml (this file is encrypted with Ansible Vault)
vault_db_username: "app_user"
vault_db_password: "s3cur3P@ssw0rd"
vault_api_key: "ak_live_xxxxxxxxxxxxxxxxxxxxxxxx"
vault_jwt_secret: "your-256-bit-secret-key-here"
```

Now reference those vault variables in your playbook:

```yaml
# playbook: create-secret-with-vault.yml
# Uses Ansible Vault-encrypted variables for secret values
---
- name: Create Secret using Ansible Vault values
  hosts: localhost
  connection: local
  gather_facts: false
  vars_files:
    - vars/secrets.yml

  tasks:
    - name: Create application secrets
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: app-secrets
            namespace: production
          type: Opaque
          stringData:
            DB_USERNAME: "{{ vault_db_username }}"
            DB_PASSWORD: "{{ vault_db_password }}"
            API_KEY: "{{ vault_api_key }}"
            JWT_SECRET: "{{ vault_jwt_secret }}"
```

Run the playbook with the vault password:

```bash
# Run with vault password prompt
ansible-playbook create-secret-with-vault.yml --ask-vault-pass

# Or use a password file
ansible-playbook create-secret-with-vault.yml --vault-password-file ~/.vault_pass
```

## Creating TLS Secrets

TLS secrets store certificate and private key pairs. Kubernetes has a dedicated `kubernetes.io/tls` type for this.

```yaml
# playbook: create-tls-secret.yml
# Creates a TLS secret from certificate files on disk
---
- name: Create TLS Secret
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create TLS secret from certificate files
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: tls-wildcard
            namespace: production
          type: kubernetes.io/tls
          data:
            # Load and base64 encode the certificate and key files
            tls.crt: "{{ lookup('file', 'certs/wildcard.crt') | b64encode }}"
            tls.key: "{{ lookup('file', 'certs/wildcard.key') | b64encode }}"
```

Note that with `type: kubernetes.io/tls`, you must use the exact keys `tls.crt` and `tls.key`. Also, since we are using the `data` field here (not `stringData`), we need to base64-encode the values ourselves using the `b64encode` filter.

## Creating Docker Registry Secrets

To pull images from private container registries, Kubernetes needs a `kubernetes.io/dockerconfigjson` secret.

```yaml
# playbook: create-registry-secret.yml
# Creates a Docker registry pull secret for private image repositories
---
- name: Create Docker Registry Secret
  hosts: localhost
  connection: local
  gather_facts: false

  vars_files:
    - vars/secrets.yml  # Contains vault_registry_password

  vars:
    registry_server: "registry.company.com"
    registry_username: "deploy-bot"

  tasks:
    - name: Build the Docker config JSON
      ansible.builtin.set_fact:
        docker_config:
          auths:
            "{{ registry_server }}":
              username: "{{ registry_username }}"
              password: "{{ vault_registry_password }}"
              auth: "{{ (registry_username + ':' + vault_registry_password) | b64encode }}"

    - name: Create the image pull secret
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: registry-credentials
            namespace: production
          type: kubernetes.io/dockerconfigjson
          data:
            .dockerconfigjson: "{{ docker_config | to_json | b64encode }}"
```

This creates a secret that can be referenced in pod specs or attached to a service account for automatic image pulling.

## Creating Secrets for Multiple Environments

When managing multiple environments, generating secrets from a single source of truth avoids drift.

```yaml
# playbook: create-secrets-multi-env.yml
# Deploys environment-specific secrets across namespaces
---
- name: Create secrets for all environments
  hosts: localhost
  connection: local
  gather_facts: false
  vars_files:
    - vars/secrets.yml

  vars:
    environments:
      - name: development
        db_host: dev-db.internal
        db_password: "{{ vault_dev_db_password }}"
      - name: staging
        db_host: staging-db.internal
        db_password: "{{ vault_staging_db_password }}"
      - name: production
        db_host: prod-db.internal
        db_password: "{{ vault_prod_db_password }}"

  tasks:
    - name: Create database secret for each environment
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: db-credentials
            namespace: "{{ item.name }}"
          type: Opaque
          stringData:
            DB_HOST: "{{ item.db_host }}"
            DB_PASSWORD: "{{ item.db_password }}"
      loop: "{{ environments }}"
      loop_control:
        label: "{{ item.name }}"
      no_log: true  # Prevents secret values from appearing in Ansible output
```

The `no_log: true` directive is critical here. Without it, Ansible prints the full task output, including your secret values, to the terminal and any log files.

## Rotating Secrets Safely

Secret rotation is a fact of life. Here is a pattern for updating a secret and verifying the dependent application still works.

```yaml
# playbook: rotate-secret.yml
# Rotates a secret value and restarts the dependent deployment
---
- name: Rotate application secret
  hosts: localhost
  connection: local
  gather_facts: false
  vars_files:
    - vars/secrets.yml

  tasks:
    - name: Update the secret with new credentials
      kubernetes.core.k8s:
        state: present
        force: true
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: app-secrets
            namespace: production
            annotations:
              rotated-at: "{{ ansible_date_time.iso8601 | default(lookup('pipe', 'date -u +%Y-%m-%dT%H:%M:%SZ')) }}"
          type: Opaque
          stringData:
            API_KEY: "{{ vault_new_api_key }}"
      register: secret_update
      no_log: true

    - name: Restart deployment to pick up new secret
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: myapp
            namespace: production
          spec:
            template:
              metadata:
                annotations:
                  secret-rotation: "{{ lookup('pipe', 'date +%s') }}"
      when: secret_update.changed

    - name: Wait for rollout to complete
      kubernetes.core.k8s_info:
        kind: Deployment
        name: myapp
        namespace: production
      register: deploy_status
      until: >
        deploy_status.resources[0].status.updatedReplicas is defined and
        deploy_status.resources[0].status.updatedReplicas == deploy_status.resources[0].status.replicas and
        deploy_status.resources[0].status.unavailableReplicas is not defined
      retries: 30
      delay: 10
```

The `force: true` parameter ensures the secret is fully replaced rather than merged, which is what you want during rotation.

## Cleaning Up Unused Secrets

Over time, orphaned secrets accumulate. This task finds and removes secrets that are not referenced by any pod.

```yaml
# task: list all secrets and flag those not in use
- name: Get all secrets in the namespace
  kubernetes.core.k8s_info:
    kind: Secret
    namespace: production
    label_selectors:
      - managed-by=ansible
  register: all_secrets

- name: Display managed secrets for review
  ansible.builtin.debug:
    msg: "Secret: {{ item.metadata.name }} | Type: {{ item.type }} | Created: {{ item.metadata.creationTimestamp }}"
  loop: "{{ all_secrets.resources }}"
  loop_control:
    label: "{{ item.metadata.name }}"
```

## Summary

Managing Kubernetes Secrets through Ansible, especially with Ansible Vault integration, gives you a secure and repeatable workflow. Your secrets are encrypted in your repository, decrypted only at deployment time, and applied consistently across environments. The `no_log` directive and Vault encryption together ensure that sensitive values never leak into logs or console output. Whether you are managing database credentials, TLS certificates, or registry pull secrets, Ansible has you covered with a single consistent interface.
