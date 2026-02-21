# How to Use the unvault Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Filters, Jinja2, Security

Description: Learn how to use the Ansible unvault filter to decrypt vault-encrypted content within Jinja2 templates and task expressions.

---

The `unvault` filter in Ansible decrypts vault-encrypted content directly within Jinja2 expressions. While Ansible automatically decrypts vault-encrypted variables when you reference them, there are situations where you need explicit decryption control, particularly when dealing with vault-encrypted file contents loaded at runtime. This filter was introduced in Ansible 2.12 and provides a programmatic way to handle decrypted data within templates and task parameters.

## What the unvault Filter Does

The `unvault` filter takes a vault-encrypted string and returns the decrypted plaintext. It is the Jinja2 filter equivalent of running `ansible-vault decrypt`, but it operates on variables and expressions at runtime rather than on files.

The most common use case is when you load the contents of a vault-encrypted file using the `file` lookup or `slurp` module and need to decrypt the result within a template or task.

## Basic Usage

Here is the simplest example of the `unvault` filter:

```yaml
# playbook.yml
# Demonstrates basic unvault filter usage
---
- name: Demonstrate unvault filter
  hosts: localhost
  vars:
    # This variable holds raw vault-encrypted content
    encrypted_content: !vault |
              $ANSIBLE_VAULT;1.1;AES256
              62313365396662343061393464336163383764316462616131633538343062376662
              31303031633534393463313865303732646463376565326435613066643831386237
              6337

  tasks:
    - name: Display decrypted content using unvault filter
      ansible.builtin.debug:
        msg: "{{ encrypted_content | unvault }}"
```

In this simple case, Ansible would decrypt `encrypted_content` automatically when you reference it. The `unvault` filter becomes necessary in more advanced scenarios.

## Loading and Decrypting Vault-Encrypted Files

The primary real-world use for the `unvault` filter is when you read vault-encrypted file contents at runtime:

```yaml
# playbook.yml
# Load a vault-encrypted file and decrypt it with unvault
---
- name: Load and decrypt vault-encrypted file
  hosts: localhost
  tasks:
    - name: Read the vault-encrypted file contents
      ansible.builtin.set_fact:
        raw_secret: "{{ lookup('file', 'secrets/api_credentials.yml') }}"

    - name: Decrypt the file contents
      ansible.builtin.set_fact:
        decrypted_secret: "{{ raw_secret | unvault }}"

    - name: Parse the decrypted YAML content
      ansible.builtin.set_fact:
        credentials: "{{ decrypted_secret | from_yaml }}"

    - name: Use the parsed credentials
      ansible.builtin.debug:
        msg: "API endpoint: {{ credentials.api_url }}"
```

## Using unvault with the slurp Module

When fetching vault-encrypted files from remote hosts:

```yaml
# Fetch and decrypt a vault-encrypted file from a remote host
- name: Fetch encrypted config from remote server
  ansible.builtin.slurp:
    src: /etc/myapp/encrypted_secrets.yml
  register: slurped_content

- name: Decrypt the fetched content
  ansible.builtin.set_fact:
    decrypted_config: "{{ (slurped_content.content | b64decode) | unvault }}"

- name: Parse and use the decrypted configuration
  ansible.builtin.set_fact:
    app_config: "{{ decrypted_config | from_yaml }}"
```

## Decrypting in Templates

The `unvault` filter works in Jinja2 templates too:

```jinja2
{# config.conf.j2 #}
{# Template that decrypts vault content inline #}

[database]
host = {{ db_host }}
port = {{ db_port }}
password = {{ vault_encrypted_db_pass | unvault }}

[api]
key = {{ vault_encrypted_api_key | unvault }}
```

Though in practice, you would usually decrypt in tasks and pass plaintext variables to templates. The template approach is useful when you need to selectively decrypt some values but not others.

## Combining unvault with Other Filters

The `unvault` filter can be chained with other Jinja2 filters:

```yaml
# Chain unvault with from_yaml to parse encrypted YAML content
- name: Load and parse encrypted YAML
  ansible.builtin.set_fact:
    parsed_secrets: "{{ lookup('file', 'encrypted_vars.yml') | unvault | from_yaml }}"

# Chain unvault with from_json for encrypted JSON content
- name: Load and parse encrypted JSON
  ansible.builtin.set_fact:
    api_config: "{{ lookup('file', 'encrypted_api_config.json') | unvault | from_json }}"

# Chain unvault with b64encode for base64-encoded output
- name: Decrypt and base64-encode for Kubernetes secrets
  ansible.builtin.set_fact:
    k8s_secret_value: "{{ vault_encrypted_password | unvault | b64encode }}"
```

## Practical Example: Dynamic Secret Selection

Here is a scenario where the `unvault` filter is genuinely useful: selecting and decrypting secrets based on runtime conditions:

```yaml
# Select and decrypt secrets based on the target environment
---
- name: Deploy with environment-specific secrets
  hosts: all
  vars:
    env: "{{ target_environment | default('dev') }}"

  tasks:
    - name: Load the appropriate encrypted secrets file
      ansible.builtin.set_fact:
        raw_secrets: "{{ lookup('file', 'secrets/' + env + '_secrets.yml') }}"

    - name: Decrypt and parse the secrets
      ansible.builtin.set_fact:
        secrets: "{{ raw_secrets | unvault | from_yaml }}"

    - name: Deploy configuration with decrypted secrets
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
        mode: '0600'
      vars:
        db_password: "{{ secrets.db_password }}"
        api_key: "{{ secrets.api_key }}"
      no_log: true
```

## Using unvault with vault_encrypted File Lookup

A common pattern for managing many encrypted files:

```yaml
# Loop through multiple encrypted files and decrypt them
- name: Process multiple encrypted credential files
  ansible.builtin.set_fact:
    "{{ item | basename | regex_replace('.yml$', '') }}_creds": >-
      {{ lookup('file', item) | unvault | from_yaml }}
  loop:
    - secrets/database.yml
    - secrets/redis.yml
    - secrets/elasticsearch.yml
```

This creates variables like `database_creds`, `redis_creds`, and `elasticsearch_creds`, each containing the decrypted and parsed contents of their respective encrypted files.

## Error Handling

When decryption fails (wrong password, corrupted data), the `unvault` filter raises an error. Handle it with a block/rescue:

```yaml
# Handle decryption failures gracefully
- name: Attempt to decrypt secrets
  block:
    - name: Decrypt the secrets file
      ansible.builtin.set_fact:
        app_secrets: "{{ lookup('file', 'secrets/app.yml') | unvault | from_yaml }}"

    - name: Deploy with secrets
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
  rescue:
    - name: Report decryption failure
      ansible.builtin.fail:
        msg: >
          Failed to decrypt secrets file. Check that:
          1. The vault password is correct
          2. The secrets file is not corrupted
          3. The file was encrypted with the vault ID you provided
```

## The unvault Filter vs. Automatic Decryption

Ansible automatically decrypts vault-encrypted variables when you reference them. So when does the `unvault` filter actually add value?

| Scenario | Automatic Decryption | unvault Filter |
|----------|---------------------|----------------|
| Vault-encrypted variable in vars | Works automatically | Not needed |
| Inline !vault tagged value | Works automatically | Not needed |
| File loaded with `file` lookup | Does not decrypt | Required |
| Content from `slurp` module | Does not decrypt | Required |
| Conditional decryption logic | Not possible | Useful |
| Chaining with from_yaml/from_json | Not needed separately | Enables pipeline |

## Version Compatibility

The `unvault` filter requires Ansible 2.12 or later. If you are on an older version, you can achieve similar results by using `include_vars` with the vault-encrypted file, which triggers automatic decryption:

```yaml
# Fallback for Ansible versions before 2.12
- name: Load encrypted variables file (decrypted automatically)
  ansible.builtin.include_vars:
    file: secrets/app_secrets.yml
    name: app_secrets
```

## Summary

The `unvault` filter fills a specific gap in Ansible's vault tooling: decrypting vault-encrypted content within Jinja2 expressions. You will not need it for everyday vault-encrypted variables (those decrypt automatically), but it becomes essential when loading encrypted file contents at runtime, dynamically selecting encrypted files, or building processing pipelines that chain decryption with parsing. Combined with filters like `from_yaml` and `from_json`, it lets you treat encrypted files as structured data sources within your playbooks.
