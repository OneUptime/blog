# Validation Summary: How to Use the Ansible uri Module with Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible `ansible.builtin.uri`
- HTTP Basic authentication
- Bearer token authentication
- API key authentication
- OAuth 2.0 client credentials flow
- Mutual TLS client certificate authentication
- HTTP Digest authentication
- Ansible Vault
- Ansible environment variable lookup

## Sources Consulted
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible-vault` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible.builtin.env` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/env_lookup.html
- RFC 7617, The Basic HTTP Authentication Scheme: https://www.rfc-editor.org/rfc/rfc7617
- RFC 6749, The OAuth 2.0 Authorization Framework: https://www.rfc-editor.org/rfc/rfc6749
- RFC 6750, The OAuth 2.0 Authorization Framework: Bearer Token Usage: https://www.rfc-editor.org/rfc/rfc6750

## Issues Found
- The post said the `uri` module "supports" all common authentication methods. Ansible officially documents built-in support for Digest, Basic, and WSSE HTTP authentication, while bearer tokens, API keys, and OAuth access tokens are implemented by setting headers or request bodies. Changed this wording to "can be used with" common authentication methods.
- Several examples handled bearer tokens or API keys but omitted `no_log: true`, which contradicted the post's own security guidance. Added `no_log: true` to the affected token and API key tasks.
- The OAuth client credentials examples sent `client_id` and `client_secret` in the form body. RFC 6749 requires confidential clients to authenticate to the token endpoint, and HTTP Basic client authentication is the common interoperable pattern. Updated the examples to use `url_username`, `url_password`, and `force_basic_auth: true`, leaving the form body for `grant_type` and `scope`.
- A client certificate task was labeled as using a PKCS12 certificate, but Ansible `uri` documents `client_cert`, `client_key`, and `ca_path` as PEM-formatted files. Changed the task label to "separate PEM cert/key and CA validation."
- The introduction said misconfigured requests can fail silently. Ansible `uri` defaults to explicit success status code handling and reports failures outside accepted status codes, so the wording was changed to "fails."

## Review Notes
Local Ansible CLI tools were not installed in this environment, so command verification used the official Ansible CLI documentation rather than local `--help` output.
