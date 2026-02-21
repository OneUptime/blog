# How to Use the b64encode and b64decode Filters in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Base64, Security

Description: Learn how to use the b64encode and b64decode filters in Ansible for encoding and decoding data in base64 format.

---

Base64 encoding shows up everywhere in infrastructure automation. Kubernetes secrets are base64-encoded. HTTP basic authentication uses base64. SSL certificates are often transmitted in base64 PEM format. Cloud-init user data is base64-encoded. Ansible provides two filters for handling this: `b64encode` converts plain text to base64, and `b64decode` converts base64 back to plain text.

## Basic Usage

### Encoding

```jinja2
{# Encode a plain string to base64 #}
{{ "Hello, World!" | b64encode }}
{# Output: SGVsbG8sIFdvcmxkIQ== #}
```

### Decoding

```jinja2
{# Decode a base64 string back to plain text #}
{{ "SGVsbG8sIFdvcmxkIQ==" | b64decode }}
{# Output: Hello, World! #}
```

## Kubernetes Secrets

This is probably the most common use case. Kubernetes stores secret values as base64-encoded strings:

```yaml
# k8s_secrets.yml - Generate Kubernetes Secret manifest
- name: Generate Kubernetes secrets
  hosts: localhost
  vars:
    db_username: "myapp_user"
    db_password: "{{ vault_db_password }}"
    api_key: "{{ vault_api_key }}"
  tasks:
    - name: Generate Secret manifest
      ansible.builtin.template:
        src: secret.yml.j2
        dest: /opt/k8s/manifests/app-secret.yml
        mode: "0600"
```

```jinja2
{# secret.yml.j2 - Kubernetes Secret with base64-encoded values #}
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: production
type: Opaque
data:
  DB_USERNAME: {{ db_username | b64encode }}
  DB_PASSWORD: {{ db_password | b64encode }}
  API_KEY: {{ api_key | b64encode }}
```

The rendered output:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: production
type: Opaque
data:
  DB_USERNAME: bXlhcHBfdXNlcg==
  DB_PASSWORD: c3VwZXJzZWNyZXRwYXNz
  API_KEY: YWJjMTIzZGVmNDU2
```

## Decoding Kubernetes Secrets

Going the other direction, you might need to read and decode existing Kubernetes secrets:

```yaml
# read_k8s_secret.yml - Read and decode Kubernetes secrets
- name: Get existing secret
  ansible.builtin.shell: >
    kubectl get secret app-credentials -n production -o json
  register: secret_raw
  changed_when: false

- name: Parse and decode secret values
  ansible.builtin.set_fact:
    secret_data: "{{ secret_raw.stdout | from_json }}"

- name: Display decoded values
  ansible.builtin.debug:
    msg: |
      DB Username: {{ secret_data.data.DB_USERNAME | b64decode }}
      DB Password: {{ secret_data.data.DB_PASSWORD | b64decode }}
```

## Working with the slurp Module

The Ansible `slurp` module reads files from remote hosts and returns the content as base64. You always need `b64decode` to use the data:

```yaml
# read_remote_files.yml - Read and process remote files
- name: Read SSL certificate
  ansible.builtin.slurp:
    src: /etc/ssl/certs/server.crt
  register: cert_raw

- name: Read application config
  ansible.builtin.slurp:
    src: /etc/myapp/config.yml
  register: config_raw

- name: Parse the config file content
  ansible.builtin.set_fact:
    cert_content: "{{ cert_raw.content | b64decode }}"
    app_config: "{{ config_raw.content | b64decode | from_yaml }}"

- name: Check certificate details
  ansible.builtin.debug:
    msg: "Config app name: {{ app_config.app.name }}"
```

## HTTP Basic Authentication

HTTP Basic Auth requires base64 encoding of the `username:password` string:

```yaml
# basic_auth.yml - Create Basic Auth headers
- name: Call API with Basic Authentication
  ansible.builtin.uri:
    url: "https://api.example.com/v1/data"
    method: GET
    headers:
      Authorization: "Basic {{ (api_username ~ ':' ~ api_password) | b64encode }}"
  register: api_response
  vars:
    api_username: "admin"
    api_password: "{{ vault_api_password }}"
```

The `~` operator in Jinja2 concatenates strings. So `api_username ~ ':' ~ api_password` produces `admin:secretpassword`, which then gets base64-encoded.

## Cloud-Init User Data

AWS, Azure, and GCP accept base64-encoded user data for cloud-init scripts:

```yaml
# cloud_init.yml - Encode user data for cloud instances
- name: Launch EC2 instance with user data
  amazon.aws.ec2_instance:
    name: "web-server-01"
    instance_type: "t3.medium"
    image_id: "ami-0123456789abcdef0"
    user_data: "{{ lookup('template', 'cloud-init.yml.j2') | b64encode }}"
    region: "us-east-1"
```

```jinja2
{# cloud-init.yml.j2 - Cloud-init configuration #}
#cloud-config
package_update: true
packages:
  - nginx
  - python3
  - certbot

write_files:
  - path: /etc/myapp/config.yml
    content: |
      app_name: {{ app_name }}
      port: {{ app_port }}
    permissions: '0644'

runcmd:
  - systemctl enable nginx
  - systemctl start nginx
```

## Encoding Multi-Line Content

Base64 encoding works with multi-line content, which is useful for embedding configuration files or scripts:

```yaml
# encode_multiline.yml - Encode multi-line content
- name: Create Kubernetes Secret with multi-line config
  hosts: localhost
  vars:
    nginx_config: |
      server {
          listen 80;
          server_name example.com;
          location / {
              proxy_pass http://backend:8080;
          }
      }
  tasks:
    - name: Generate secret with config file
      ansible.builtin.template:
        src: config-secret.yml.j2
        dest: /opt/k8s/config-secret.yml
```

```jinja2
{# config-secret.yml.j2 - Secret containing a full config file #}
apiVersion: v1
kind: Secret
metadata:
  name: nginx-config
type: Opaque
data:
  nginx.conf: {{ nginx_config | b64encode }}
```

## Encoding and Decoding with Different Charsets

By default, `b64encode` and `b64decode` use UTF-8 encoding. If you need a different character set, you cannot specify it directly through the filter, but you can handle it in a few ways:

```yaml
# The default encoding is UTF-8, which handles most use cases
- name: Encode UTF-8 text
  ansible.builtin.set_fact:
    encoded: "{{ 'Hello World' | b64encode }}"
    decoded: "{{ 'SGVsbG8gV29ybGQ=' | b64decode }}"
```

## Practical Example: SSH Key Management

Encode and manage SSH keys using base64:

```yaml
# ssh_keys.yml - Manage SSH keys with base64 encoding
- name: Deploy SSH keys from vault
  hosts: all
  vars:
    # SSH key stored as base64 in Ansible Vault
    ssh_private_key_b64: "{{ vault_ssh_private_key_b64 }}"
  tasks:
    - name: Deploy SSH private key
      ansible.builtin.copy:
        content: "{{ ssh_private_key_b64 | b64decode }}"
        dest: "/home/{{ deploy_user }}/.ssh/id_rsa"
        owner: "{{ deploy_user }}"
        group: "{{ deploy_user }}"
        mode: "0600"

    - name: Deploy SSH public key
      ansible.builtin.copy:
        content: "{{ ssh_public_key_b64 | b64decode }}"
        dest: "/home/{{ deploy_user }}/.ssh/id_rsa.pub"
        owner: "{{ deploy_user }}"
        group: "{{ deploy_user }}"
        mode: "0644"
```

## Template Pattern: Docker Registry Credentials

Docker registry credentials in Kubernetes are stored as base64-encoded JSON:

```yaml
# docker_registry.yml - Generate Docker registry secret
- name: Create Docker registry secret
  hosts: localhost
  vars:
    registry_server: "registry.example.com"
    registry_username: "deploy"
    registry_password: "{{ vault_registry_password }}"
    registry_email: "deploy@example.com"
  tasks:
    - name: Build Docker config JSON
      ansible.builtin.set_fact:
        docker_config:
          auths:
            "{{ registry_server }}":
              username: "{{ registry_username }}"
              password: "{{ registry_password }}"
              email: "{{ registry_email }}"
              auth: "{{ (registry_username ~ ':' ~ registry_password) | b64encode }}"

    - name: Generate registry secret manifest
      ansible.builtin.copy:
        content: |
          apiVersion: v1
          kind: Secret
          metadata:
            name: registry-credentials
            namespace: production
          type: kubernetes.io/dockerconfigjson
          data:
            .dockerconfigjson: {{ docker_config | to_json | b64encode }}
        dest: /opt/k8s/registry-secret.yml
        mode: "0600"
```

## Chaining b64decode with Parsing Filters

A very common pattern is decoding base64 and then parsing the result:

```yaml
# chain_decode.yml - Decode and parse in one chain
- name: Read and parse remote YAML file
  ansible.builtin.slurp:
    src: /etc/myapp/config.yml
  register: config_slurp

- name: Decode and parse in one step
  ansible.builtin.set_fact:
    config: "{{ config_slurp.content | b64decode | from_yaml }}"

# Similarly for JSON files
- name: Read and parse remote JSON file
  ansible.builtin.slurp:
    src: /etc/myapp/state.json
  register: state_slurp

- name: Decode and parse JSON
  ansible.builtin.set_fact:
    state: "{{ state_slurp.content | b64decode | from_json }}"
```

## Wrapping Up

The `b64encode` and `b64decode` filters are simple but essential tools in the Ansible toolkit. They bridge the gap between human-readable text and the base64-encoded formats required by Kubernetes secrets, HTTP authentication, cloud-init, and the `slurp` module. Whenever you see base64 data in your infrastructure, these filters give you the ability to encode and decode it cleanly within your playbooks and templates.
