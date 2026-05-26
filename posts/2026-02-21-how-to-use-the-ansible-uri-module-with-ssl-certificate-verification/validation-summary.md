# Validation Summary: How to Use the Ansible uri Module with SSL Certificate Verification

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible `ansible.builtin.uri`
- Ansible `ansible.builtin.get_url`
- SSL/TLS certificate verification
- Custom CA certificates and system trust stores
- Client certificate authentication / mutual TLS
- OpenSSL certificate inspection commands

## Sources Consulted
- Ansible `ansible.builtin.uri` official documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.get_url` official documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Python `ssl` official documentation for OpenSSL default verification paths: https://docs.python.org/3/library/ssl.html#ssl.get_default_verify_paths
- Debian `update-ca-certificates(8)` man page: https://manpages.debian.org/bookworm/ca-certificates/update-ca-certificates.8.en.html
- Red Hat Enterprise Linux documentation for shared system certificates and `update-ca-trust`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/using-shared-system-certificates_securing-networks

## Issues Found
- The post said `uri.ca_path` can point to a single CA certificate file or a directory. Current Ansible documentation describes `ca_path` as a PEM-formatted CA certificate file, so the wording was corrected to avoid claiming directory support.
- The post said `get_url` has the same SSL options as `uri` and showed `ca_path` under `get_url`. Current `get_url` documentation lists `validate_certs`, `client_cert`, and `client_key`, but not `ca_path`, so the example was changed to rely on the system trust store for internal CAs.
- The environment-variable section claimed `REQUESTS_CA_BUNDLE` and `SSL_CERT_FILE` affect all Python-based HTTP requests. Ansible's built-in URL modules use Ansible URL utilities rather than the Python Requests library, and Python/OpenSSL documents default verification path environment handling. The section was narrowed to `SSL_CERT_FILE` and phrased as applying to Python/OpenSSL-based HTTPS clients that honor OpenSSL default verification paths.

## Review Notes
The remaining examples use current Ansible FQCN module names and documented SSL options. The OpenSSL inspection commands are plausible and use standard `openssl s_client` and `openssl x509` flags, though the post could be improved in the future by using a purpose-built certificate module for structured certificate audits.
