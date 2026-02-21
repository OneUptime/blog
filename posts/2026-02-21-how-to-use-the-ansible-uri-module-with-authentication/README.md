# How to Use the Ansible uri Module with Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Authentication, uri Module, Security

Description: Learn how to authenticate HTTP requests in Ansible using basic auth, bearer tokens, OAuth, API keys, and client certificates.

---

Almost every API you interact with requires some form of authentication. The Ansible `uri` module supports all common authentication methods: HTTP Basic Auth, Bearer tokens, API keys, OAuth, and client certificate authentication. Getting authentication right is critical because a misconfigured request either fails silently or, worse, exposes credentials in logs.

This post covers each authentication method with working examples and security best practices.

## HTTP Basic Authentication

Basic auth sends a username and password encoded in Base64 with each request. The `uri` module has built-in parameters for this:

```yaml
# authenticate with HTTP Basic Auth
---
- name: Basic auth example
  hosts: localhost
  connection: local
  tasks:
    - name: Query API with basic auth
      ansible.builtin.uri:
        url: https://api.example.com/status
        method: GET
        url_username: "{{ vault_api_username }}"
        url_password: "{{ vault_api_password }}"
        force_basic_auth: true
        return_content: true
      register: api_status
      no_log: true

    - name: Show API status
      ansible.builtin.debug:
        var: api_status.json
```

The `force_basic_auth: true` parameter is important. Without it, Ansible only sends credentials after receiving a 401 challenge from the server. Many APIs expect credentials on the first request without a challenge, so you almost always want this set to `true`.

## Bearer Token Authentication

Bearer tokens are the most common authentication method for modern REST APIs. You pass the token in the `Authorization` header:

```yaml
# authenticate with a Bearer token
---
- name: Bearer token auth
  hosts: localhost
  connection: local
  vars:
    api_token: "{{ vault_api_token }}"
  tasks:
    - name: List resources with bearer token
      ansible.builtin.uri:
        url: https://api.example.com/resources
        method: GET
        headers:
          Authorization: "Bearer {{ api_token }}"
        return_content: true
      register: resources

    - name: Create resource with bearer token
      ansible.builtin.uri:
        url: https://api.example.com/resources
        method: POST
        headers:
          Authorization: "Bearer {{ api_token }}"
        body_format: json
        body:
          name: new-resource
          type: compute
        status_code: 201
```

## API Key Authentication

APIs use keys in different locations: headers, query parameters, or the request body.

```yaml
# different API key authentication patterns
---
- name: API key auth patterns
  hosts: localhost
  connection: local
  tasks:
    # API key in a custom header
    - name: Auth with API key in header
      ansible.builtin.uri:
        url: https://api.example.com/data
        method: GET
        headers:
          X-API-Key: "{{ vault_api_key }}"
        return_content: true
      register: result_header

    # API key as query parameter
    - name: Auth with API key in query string
      ansible.builtin.uri:
        url: "https://api.example.com/data?api_key={{ vault_api_key }}"
        method: GET
        return_content: true
      register: result_query

    # API key in request body (some legacy APIs)
    - name: Auth with API key in body
      ansible.builtin.uri:
        url: https://api.example.com/data
        method: POST
        body_format: json
        body:
          api_key: "{{ vault_api_key }}"
          query: "servers"
        return_content: true
      register: result_body
```

## OAuth 2.0 Client Credentials Flow

OAuth is common for service-to-service authentication. First you get a token, then use it for subsequent requests:

```yaml
# OAuth 2.0 client credentials flow
---
- name: OAuth authentication flow
  hosts: localhost
  connection: local
  tasks:
    # Step 1: Get an access token
    - name: Request OAuth access token
      ansible.builtin.uri:
        url: https://auth.example.com/oauth/token
        method: POST
        body_format: form-urlencoded
        body:
          grant_type: client_credentials
          client_id: "{{ vault_oauth_client_id }}"
          client_secret: "{{ vault_oauth_client_secret }}"
          scope: "read write"
        status_code: 200
      register: oauth_response
      no_log: true

    # Step 2: Extract the token
    - name: Store access token
      ansible.builtin.set_fact:
        access_token: "{{ oauth_response.json.access_token }}"
      no_log: true

    # Step 3: Use the token for API calls
    - name: Query API with OAuth token
      ansible.builtin.uri:
        url: https://api.example.com/resources
        method: GET
        headers:
          Authorization: "Bearer {{ access_token }}"
        return_content: true
      register: api_data

    - name: Create resource with OAuth token
      ansible.builtin.uri:
        url: https://api.example.com/resources
        method: POST
        headers:
          Authorization: "Bearer {{ access_token }}"
        body_format: json
        body:
          name: oauth-created-resource
        status_code: 201
```

## Client Certificate Authentication (mTLS)

Some APIs, especially internal ones, use client certificates for authentication:

```yaml
# authenticate with client certificates (mTLS)
---
- name: Client certificate auth
  hosts: localhost
  connection: local
  tasks:
    - name: Call API with client certificate
      ansible.builtin.uri:
        url: https://secure-api.internal/data
        method: GET
        client_cert: /etc/ansible/certs/client.pem
        client_key: /etc/ansible/certs/client-key.pem
        return_content: true
      register: secure_response

    - name: Call API with PKCS12 cert and CA validation
      ansible.builtin.uri:
        url: https://api.partner.com/exchange
        method: POST
        client_cert: /etc/ansible/certs/partner-client.pem
        client_key: /etc/ansible/certs/partner-client-key.pem
        validate_certs: true
        ca_path: /etc/ansible/certs/partner-ca.pem
        body_format: json
        body:
          transaction_id: "{{ transaction_id }}"
        status_code: 200
      register: exchange_result
```

## Digest Authentication

Digest auth is less common but still used by some services:

```yaml
# authenticate with HTTP Digest authentication
- name: Query with digest auth
  ansible.builtin.uri:
    url: https://api.example.com/protected/data
    method: GET
    url_username: "{{ vault_digest_user }}"
    url_password: "{{ vault_digest_pass }}"
    force_basic_auth: false  # let the server challenge for digest
    return_content: true
  register: digest_result
  no_log: true
```

With digest auth, leave `force_basic_auth` as `false` (the default). The server will challenge with a 401, and Ansible will respond with digest credentials.

## Token Refresh Pattern

Long-running playbooks might need to refresh expired tokens:

```yaml
# handle token refresh for long-running playbooks
---
- name: Long-running API workflow with token refresh
  hosts: localhost
  connection: local
  vars:
    auth_url: https://auth.example.com/oauth/token
    api_url: https://api.example.com/v2
  tasks:
    - name: Get initial token
      ansible.builtin.uri:
        url: "{{ auth_url }}"
        method: POST
        body_format: form-urlencoded
        body:
          grant_type: client_credentials
          client_id: "{{ vault_client_id }}"
          client_secret: "{{ vault_client_secret }}"
        status_code: 200
      register: token_response
      no_log: true

    - name: Store token and expiry
      ansible.builtin.set_fact:
        api_token: "{{ token_response.json.access_token }}"
        token_expires: "{{ token_response.json.expires_in | int }}"
      no_log: true

    - name: Process batch of items (may take a long time)
      ansible.builtin.include_tasks: process_item.yaml
      loop: "{{ items_to_process }}"
      loop_control:
        index_var: item_index

    # In process_item.yaml, refresh token every 100 items:
    # - name: Refresh token periodically
    #   ansible.builtin.include_tasks: refresh_token.yaml
    #   when: item_index % 100 == 0 and item_index > 0
```

## Storing Credentials Securely with Ansible Vault

Never put credentials in plaintext. Use Ansible Vault:

```bash
# create an encrypted variables file for API credentials
ansible-vault create vars/api_credentials.yaml
```

```yaml
# vars/api_credentials.yaml (encrypted with ansible-vault)
vault_api_username: admin
vault_api_password: supersecretpassword
vault_api_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
vault_oauth_client_id: my-client-id
vault_oauth_client_secret: my-client-secret
```

Reference it in your playbook:

```yaml
# use vault-encrypted credentials in your playbook
---
- name: Secure API operations
  hosts: localhost
  connection: local
  vars_files:
    - vars/api_credentials.yaml
  tasks:
    - name: Authenticated API call
      ansible.builtin.uri:
        url: https://api.example.com/data
        method: GET
        headers:
          Authorization: "Bearer {{ vault_api_token }}"
        return_content: true
      register: data
      no_log: true
```

Run with:

```bash
# run playbook with vault password
ansible-playbook api_operations.yaml --ask-vault-pass
```

## Using Environment Variables for Tokens

For CI/CD pipelines, tokens often come from environment variables:

```yaml
# read auth tokens from environment variables
---
- name: API calls with env-based auth
  hosts: localhost
  connection: local
  vars:
    api_token: "{{ lookup('env', 'API_TOKEN') }}"
    github_token: "{{ lookup('env', 'GITHUB_TOKEN') }}"
  tasks:
    - name: Fail if token is not set
      ansible.builtin.fail:
        msg: "API_TOKEN environment variable is not set"
      when: api_token | length == 0

    - name: Call API with env token
      ansible.builtin.uri:
        url: https://api.example.com/data
        method: GET
        headers:
          Authorization: "Bearer {{ api_token }}"
        return_content: true
      register: result
```

## Summary

The Ansible `uri` module supports every common authentication method. Use `url_username`/`url_password` with `force_basic_auth: true` for Basic Auth. Use the `Authorization` header for Bearer tokens and OAuth. Use `client_cert`/`client_key` for certificate-based auth. Always store credentials in Ansible Vault or environment variables, never in plaintext. Add `no_log: true` to any task that handles credentials. For OAuth flows, implement the token-then-request pattern and consider adding token refresh logic for long-running playbooks.
