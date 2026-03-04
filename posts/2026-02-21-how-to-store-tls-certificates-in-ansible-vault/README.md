# How to Store TLS Certificates in Ansible Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, TLS, Certificates, Security

Description: Learn how to securely store and deploy TLS certificates and private keys using Ansible Vault for web servers and internal services.

---

TLS certificates and their private keys are essential for encrypted communication. While the certificate itself is public (your browser sees it during every HTTPS handshake), the private key must be kept strictly confidential. If someone obtains your TLS private key, they can impersonate your server and decrypt traffic. Ansible Vault provides a practical way to store these sensitive files encrypted in your repository and deploy them to your web servers, load balancers, and internal services.

## What to Encrypt (and What Not To)

Not everything TLS-related needs encryption:

| File | Encrypt? | Reason |
|------|----------|--------|
| Private key (.key) | Yes | This is the actual secret |
| Certificate (.crt/.pem) | Optional | Public data, but encrypting keeps the pair together |
| CA chain (.ca-bundle) | No | Publicly available |
| CSR (.csr) | No | Not sensitive |

The private key is the critical piece. Everything else is either public or non-sensitive.

## Storing Certificates in Vault Variables

Store the certificate and key in a vault-encrypted variables file:

```yaml
# group_vars/production/vault.yml (before encryption)
---
vault_tls_private_key: |
  -----BEGIN RSA PRIVATE KEY-----
  MIIEowIBAAKCAQEA2a2rwplBQLfBCycN8gBydLxnBgsVDTLzFm...
  ... (full key content) ...
  -----END RSA PRIVATE KEY-----

vault_tls_certificate: |
  -----BEGIN CERTIFICATE-----
  MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiUMA0GCSqGSIb3Qq2Iu...
  ... (full certificate content) ...
  -----END CERTIFICATE-----

vault_tls_ca_chain: |
  -----BEGIN CERTIFICATE-----
  MIIFjTCCA3WgAwIBAgIRANOxciY0IzLc9AUoUSrsnGowDQYJKo...
  ... (intermediate CA certificate) ...
  -----END CERTIFICATE-----
  -----BEGIN CERTIFICATE-----
  MIIFYDCCBEigAwIBAgIQQAF3ITfU6UK47naqPGQKtzANBgkqhk...
  ... (root CA certificate) ...
  -----END CERTIFICATE-----
```

Encrypt the file:

```bash
ansible-vault encrypt group_vars/production/vault.yml
```

## Plaintext References

```yaml
# group_vars/production/vars.yml
---
tls_private_key: "{{ vault_tls_private_key }}"
tls_certificate: "{{ vault_tls_certificate }}"
tls_ca_chain: "{{ vault_tls_ca_chain }}"
tls_cert_path: /etc/ssl/certs
tls_key_path: /etc/ssl/private
```

## Deploying to Nginx

```yaml
# roles/nginx/tasks/tls.yml
# Deploys TLS certificates and configures Nginx for HTTPS
---
- name: Create SSL directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    owner: root
    group: root
    mode: '0755'
  loop:
    - "{{ tls_cert_path }}"
    - "{{ tls_key_path }}"

- name: Deploy TLS private key
  ansible.builtin.copy:
    content: "{{ tls_private_key }}"
    dest: "{{ tls_key_path }}/{{ domain }}.key"
    owner: root
    group: root
    mode: '0600'
  no_log: true
  notify: reload nginx

- name: Deploy TLS certificate (with CA chain)
  ansible.builtin.copy:
    content: |
      {{ tls_certificate }}
      {{ tls_ca_chain }}
    dest: "{{ tls_cert_path }}/{{ domain }}.crt"
    owner: root
    group: root
    mode: '0644'
  notify: reload nginx

- name: Deploy Nginx HTTPS configuration
  ansible.builtin.template:
    src: nginx_ssl.conf.j2
    dest: "/etc/nginx/sites-available/{{ domain }}"
    owner: root
    group: root
    mode: '0644'
  notify: reload nginx
```

The Nginx template:

```jinja2
{# nginx_ssl.conf.j2 #}
server {
    listen 443 ssl http2;
    server_name {{ domain }};

    ssl_certificate {{ tls_cert_path }}/{{ domain }}.crt;
    ssl_certificate_key {{ tls_key_path }}/{{ domain }}.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://127.0.0.1:{{ app_port }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name {{ domain }};
    return 301 https://$host$request_uri;
}
```

## Deploying to Apache

```yaml
# roles/apache/tasks/tls.yml
---
- name: Enable Apache SSL module
  community.general.apache2_module:
    name: ssl
    state: present

- name: Deploy TLS private key
  ansible.builtin.copy:
    content: "{{ tls_private_key }}"
    dest: "/etc/ssl/private/{{ domain }}.key"
    owner: root
    group: ssl-cert
    mode: '0640'
  no_log: true
  notify: reload apache

- name: Deploy TLS certificate
  ansible.builtin.copy:
    content: "{{ tls_certificate }}"
    dest: "/etc/ssl/certs/{{ domain }}.crt"
    owner: root
    group: root
    mode: '0644'
  notify: reload apache

- name: Deploy CA chain
  ansible.builtin.copy:
    content: "{{ tls_ca_chain }}"
    dest: "/etc/ssl/certs/{{ domain }}-chain.crt"
    owner: root
    group: root
    mode: '0644'
  notify: reload apache
```

## Deploying to HAProxy

HAProxy expects the certificate, key, and chain combined in a single PEM file:

```yaml
# roles/haproxy/tasks/tls.yml
---
- name: Deploy combined PEM file for HAProxy
  ansible.builtin.copy:
    content: |
      {{ tls_certificate }}
      {{ tls_ca_chain }}
      {{ tls_private_key }}
    dest: "/etc/haproxy/certs/{{ domain }}.pem"
    owner: root
    group: haproxy
    mode: '0640'
  no_log: true
  notify: reload haproxy
```

## Multiple Certificates for Multiple Domains

When managing certificates for several domains:

```yaml
# group_vars/production/vault.yml (before encryption)
---
vault_tls_certs:
  example.com:
    key: |
      -----BEGIN RSA PRIVATE KEY-----
      ...example.com key...
      -----END RSA PRIVATE KEY-----
    cert: |
      -----BEGIN CERTIFICATE-----
      ...example.com cert...
      -----END CERTIFICATE-----
    chain: |
      -----BEGIN CERTIFICATE-----
      ...CA chain...
      -----END CERTIFICATE-----

  api.example.com:
    key: |
      -----BEGIN RSA PRIVATE KEY-----
      ...api.example.com key...
      -----END RSA PRIVATE KEY-----
    cert: |
      -----BEGIN CERTIFICATE-----
      ...api.example.com cert...
      -----END CERTIFICATE-----
    chain: |
      -----BEGIN CERTIFICATE-----
      ...CA chain...
      -----END CERTIFICATE-----
```

Deploy all certificates with a loop:

```yaml
# Deploy certificates for all domains
- name: Deploy TLS private keys
  ansible.builtin.copy:
    content: "{{ item.value.key }}"
    dest: "/etc/ssl/private/{{ item.key }}.key"
    owner: root
    group: root
    mode: '0600'
  loop: "{{ vault_tls_certs | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  no_log: true
  notify: reload nginx

- name: Deploy TLS certificates with chain
  ansible.builtin.copy:
    content: |
      {{ item.value.cert }}
      {{ item.value.chain }}
    dest: "/etc/ssl/certs/{{ item.key }}.crt"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ vault_tls_certs | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  notify: reload nginx
```

## Wildcard Certificates

Wildcard certificates follow the same pattern but are shared across multiple services:

```yaml
# group_vars/all/vault.yml (before encryption)
# Wildcard cert shared across all servers
---
vault_wildcard_tls_key: |
  -----BEGIN RSA PRIVATE KEY-----
  ...*.example.com key...
  -----END RSA PRIVATE KEY-----

vault_wildcard_tls_cert: |
  -----BEGIN CERTIFICATE-----
  ...*.example.com cert...
  -----END CERTIFICATE-----
```

## Certificate Validation Task

Verify deployed certificates are valid:

```yaml
# Validate the deployed certificate
- name: Check certificate expiration
  ansible.builtin.command:
    cmd: openssl x509 -enddate -noout -in {{ tls_cert_path }}/{{ domain }}.crt
  register: cert_expiry
  changed_when: false

- name: Parse certificate expiration date
  ansible.builtin.set_fact:
    cert_expiry_date: "{{ cert_expiry.stdout | regex_replace('notAfter=', '') }}"

- name: Verify certificate matches private key
  ansible.builtin.shell: |
    CERT_MD5=$(openssl x509 -noout -modulus -in {{ tls_cert_path }}/{{ domain }}.crt | openssl md5)
    KEY_MD5=$(openssl rsa -noout -modulus -in {{ tls_key_path }}/{{ domain }}.key | openssl md5)
    [ "${CERT_MD5}" = "${KEY_MD5}" ] && echo "MATCH" || echo "MISMATCH"
  register: cert_key_match
  changed_when: false
  no_log: true

- name: Fail if certificate and key do not match
  ansible.builtin.fail:
    msg: "TLS certificate and private key do not match for {{ domain }}"
  when: cert_key_match.stdout != "MATCH"
```

## Certificate Renewal Workflow

```mermaid
flowchart TD
    A[Obtain New Certificate] --> B[Update Vault Variables]
    B --> C[Run Deployment Playbook]
    C --> D[Validate Certificate on Server]
    D --> E{Valid?}
    E -->|Yes| F[Commit Updated Vault File]
    E -->|No| G[Roll Back to Previous Certificate]
    F --> H[Certificate Live on All Servers]
```

## Summary

TLS private keys belong in Ansible Vault. Store them as multi-line YAML variables using the pipe character, deploy them with the `copy` module, and always set `no_log: true` on tasks that handle private keys. Use strict file permissions (`0600` for keys) and validate that the certificate matches the key after deployment. For multiple domains, use a dictionary structure and deploy with loops. This approach keeps your TLS infrastructure automated and your private keys protected.
