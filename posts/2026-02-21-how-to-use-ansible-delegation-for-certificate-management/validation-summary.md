# Validation Summary: How to Use Ansible Delegation for Certificate Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible delegation
- Ansible built-in modules: file, fetch, copy, shell, command, apt, uri, systemd, set_fact, debug
- community.crypto OpenSSL modules
- OpenSSL x509, verify, and s_client commands
- Certbot / Let's Encrypt
- Cloudflare Custom Certificates API
- SSL/TLS certificate rotation and expiry monitoring

## Sources Consulted
- Ansible delegation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible fetch module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fetch_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- community.crypto openssl_csr module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/openssl_csr_module.html
- OpenSSL x509 command documentation: https://docs.openssl.org/master/man1/openssl-x509/
- Certbot command-line documentation: https://eff-certbot.readthedocs.io/en/stable/
- Cloudflare Custom Certificates API documentation: https://developers.cloudflare.com/api/resources/custom_certificates/methods/create/
- Ansible filter documentation for to_datetime: https://docs.ansible.com/projects/ansible/3/user_guide/playbooks_filters.html#handling-dates-and-times

## Issues Found
- The first internal CA example fetched the CSR from the target host to the controller, then delegated signing to the CA server while referencing the controller-local CSR path. Added CA staging directory creation and a controller-to-CA copy step so the delegated signing task reads a file that exists on the CA server.
- The OpenSSL signing commands used Bash process substitution with Ansible's shell module. Since the shell module runs through `/bin/sh` by default, added `args: executable: /bin/bash` to those tasks.
- The Let's Encrypt CDN update example used `lookup('file', ...)` for certificate files that exist on the target host, while the API update was delegated to localhost. Added fetch tasks for `fullchain.pem` and `privkey.pem`, then updated the local lookup paths.
- The certificate rotation example delegated a copy task to the CA server with `src` pointing at a CSR path on the target host. The copy module reads `src` from the controller by default, so added a fetch-to-controller step and changed the delegated copy to use that controller-local CSR.
- The rotation signing command did not include the requested SAN values in the signed certificate. Added an OpenSSL `-extfile` subjectAltName argument matching the generated CSR values.
- The verification and expiry-monitoring examples assumed `ansible_host` is always defined. Updated those connection strings to fall back to `inventory_hostname`.
- The expiry calculation applied `int` too narrowly because of Jinja filter precedence. Added parentheses so the computed day count is converted to an integer.

## Review Notes
- The examples are technically valid snippets, but production certificate management should also account for CA serial file locking, cleanup of temporary private-key material on the controller, service configuration validation before reloads, and load balancer draining if reloads or restarts are not fully graceful.
