# Ansible Vault or External Secret Manager? Choosing a Sustainable Secrets Pattern

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Secrets Management, Ansible Vault, Automation

Description: Choose between encrypted repository secrets and runtime secret retrieval based on rotation, audit, availability, and ownership needs.

---

Ansible Vault and an external secret manager solve related but different problems.

Ansible Vault encrypts variables or files that travel with your automation content. It protects those files at rest and makes encrypted data practical to keep in source control. An external manager keeps the secret in a separate service and lets the play retrieve it, or receive it through an automation-platform credential, at run time.

Neither choice automatically prevents exposure after retrieval. Once a secret is decrypted into a task argument, registered result, generated file, or process environment, output and host controls still apply.

## What Ansible Vault Provides

Vault can encrypt a complete file:

```bash
ansible-vault create \
  --vault-id production@prompt \
  inventories/production/group_vars/all/vault.yml
```

Or encrypt one variable:

```bash
ansible-vault encrypt_string \
  --vault-id production@prompt \
  --name database_password
```

A common repository layout separates readable configuration from encrypted values:

```text
inventories/
  production/
    group_vars/
      all/
        settings.yml
        vault.yml
```

```yaml
# settings.yml
database_host: db.internal.example
database_user: myapp
database_password: "{{ vault_database_password }}"
```

```yaml
# vault.yml, edited with ansible-vault
vault_database_password: secret-value
```

Vault's strengths are simplicity, offline operation, reviewable placement alongside environment configuration, and no runtime network dependency beyond access to the password source. It works well for low-churn secrets, small teams, disconnected environments, and bootstrapping.

Its limits are equally important:

- Vault encryption protects data at rest, not data in use.
- Anyone with the vault password and repository can decrypt all content protected by it.
- Per-secret access policy and audit are limited compared with a dedicated service.
- Rotation requires changing the encrypted content, distributing or retrieving the new vault password, and committing updates.
- Old encrypted values remain in repository history, though still encrypted.

## Use Vault IDs for Distinct Trust Domains

Vault IDs label encrypted content and password sources:

```bash
ansible-playbook site.yml \
  --vault-id development@dev-password-client.py \
  --vault-id production@prod-password-client.py
```

Labels help Ansible try the matching secret first and make operator intent clearer. By default, labels are hints and Ansible may try other supplied vault secrets when decrypting. Review the vault-ID matching configuration if strict separation is a requirement.

Do not use one password across development and production merely because multiple vault files are convenient. Separate environments, owners, and recovery processes.

A vault password source can be:

- an interactive prompt
- a protected file
- an executable client script that prints the password

The client-script mechanism allows a secret manager to supply the Ansible Vault password without storing it in the repository.

## What an External Secret Manager Provides

A dedicated manager typically offers capabilities beyond file encryption:

- per-secret authorization
- identity-based access rather than a shared decryption password
- central rotation without changing every repository
- access audit records
- short-lived or dynamically generated credentials
- revocation independent of a Git commit
- ownership by a security or platform team

Ansible can retrieve values through collection lookup plugins. For HashiCorp Vault KV v2, use the focused plugin documented by the `community.hashi_vault` collection:

```yaml
- name: Read the production database secret
  ansible.builtin.set_fact:
    database_secret: >-
      {{
        lookup(
          'community.hashi_vault.vault_kv2_get',
          'myapp/database',
          engine_mount_point='secret',
          url='https://vault.example.com'
        ).secret
      }}
  no_log: true
```

Install and pin the collection in `collections/requirements.yml`, and satisfy its Python-library requirements in the controller or execution environment:

```yaml
---
collections:
  - name: community.hashi_vault
    version: ">=7.1.0,<8.0.0"
```

Lookup plugins execute on the controller during templating. The controller, not the managed host, needs network access, CA trust, plugin dependencies, and an authentication method for the secret service.

Use workload identity, AppRole, cloud identity, or another short-lived mechanism appropriate to the manager. Do not solve secret retrieval by committing a long-lived manager token.

## Compare the Operational Tradeoffs

| Question | Ansible Vault | External manager |
|---|---|---|
| Where is ciphertext or secret stored? | Usually with the repository | Separate service |
| Runtime service dependency | No, except password source | Yes |
| Fine-grained access | Usually by vault password/file | Usually per identity and path |
| Central rotation | Manual repository update | Native capability |
| Dynamic credentials | No | Often supported |
| Access audit | Git and job context | Usually secret-access events |
| Offline use | Strong | Requires a replicated/offline design |
| Bootstrap complexity | Low | Higher |
| Repository readability | Encrypted files obscure content | Secret references remain readable |

These are general characteristics. Verify the exact guarantees of the selected manager and Ansible plugin.

## A Practical Selection Rule

Prefer Ansible Vault when:

- the environment must run disconnected
- secrets change infrequently
- the same tightly controlled team owns the repository and decryption authority
- a secret is needed to bootstrap access to another system
- adding a highly available service would create more risk than it removes

Prefer an external manager when:

- credentials rotate frequently
- applications need short-lived database or cloud credentials
- different teams need distinct access to individual secret paths
- central revocation and detailed access audit are required
- many repositories or automation systems consume the same secret
- security policy requires secrets to stay outside source control

Do not choose based only on team size. A small team with high-value, frequently rotated production credentials may benefit greatly from a manager. A large disconnected operations environment may still require repository-bound encryption.

## Use a Hybrid Pattern Deliberately

Many mature deployments combine both:

```text
automation identity
  -> authenticates to secret manager
  -> retrieves operational secrets at runtime

Ansible Vault
  -> protects rare bootstrap or recovery material
  -> may protect configuration unavailable from the manager
```

Another hybrid uses a vault-password client script that retrieves the Ansible Vault password from an external service:

```bash
ansible-playbook site.yml \
  --vault-id production@vault-password-client.py
```

This centralizes access to the decryption key while retaining encrypted repository files. It does not provide per-secret authorization inside that encrypted file. Anyone allowed to retrieve its vault password can decrypt its contents.

Avoid a circular recovery design. If the secret manager is down and its own recovery automation requires a vault password stored only in that manager, neither system can start. Document and test break-glass procedures.

## Keep Secret Retrieval Out of Managed Hosts

Prefer controller-side lookups when the target does not need direct manager access. This avoids distributing manager credentials, CA configuration, and network permission to every managed host.

If an application itself needs dynamic secrets, consider its native secret-manager integration rather than using Ansible to render a long-lived plaintext file. Ansible can configure the workload identity and policy without becoming the delivery path for every secret value.

## Prevent Exposure After Decryption

With either pattern:

```yaml
- name: Render the protected application configuration
  become: true
  ansible.builtin.template:
    src: app-secrets.conf.j2
    dest: /etc/myapp/secrets.conf
    owner: root
    group: myapp
    mode: "0640"
  no_log: true
  diff: false
```

Use `no_log: true` on retrieval and every later task that may display the value. Disable diff for secret-bearing files. Never include secrets in task names, debug output, URLs, or shell command lines. Treat fact caches, registered variables, job artifacts, and callback plugins as possible storage.

## Design for Failure

An external manager adds runtime failure modes:

- service unavailable
- expired authentication
- permission denied
- certificate or DNS failure
- rate limit
- missing or malformed secret version

Fail before changing hosts:

```yaml
- name: Validate retrieved database fields
  ansible.builtin.assert:
    that:
      - database_secret.username | default('') | length > 0
      - database_secret.password | default('') | length > 0
    fail_msg: Required database secret fields are unavailable.
  no_log: true
```

For Vault files, test password recovery and rekey procedures:

```bash
ansible-vault view \
  --vault-id production@prod-password-client.py \
  inventories/production/group_vars/all/vault.yml

ansible-vault rekey \
  --vault-id production@old-client.py \
  --new-vault-id production@new-client.py \
  inventories/production/group_vars/all/vault.yml
```

The sustainable choice is the one whose rotation, outage, audit, and recovery behavior your team can operate, not simply the one with the shortest playbook syntax.

## Official Documentation

- [Ansible Vault guide](https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html)
- [Encrypting content with Ansible Vault](https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html)
- [Using encrypted variables and vault IDs](https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html)
- [community.hashi_vault lookup guide](https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/docsite/lookup_guide.html)
- [community.hashi_vault.vault_kv2_get lookup](https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_kv2_get_lookup.html)

