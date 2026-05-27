# Validation Summary: How to Use Ansible to Generate Self-Signed Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, handlers, tags, and task includes
- community.crypto Ansible collection
- OpenSSL private keys, CSRs, X.509 certificates, and certificate verification
- Self-signed certificates, internal CA trust, and mTLS client certificates
- Debian and Red Hat CA trust store update workflows

## Sources Consulted
- Ansible community.crypto x509_certificate module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/x509_certificate_module.html
- Ansible community.crypto openssl_csr module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/openssl_csr_module.html
- Ansible community.crypto openssl_privatekey module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/openssl_privatekey_module.html
- Ansible include_tasks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible delegation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- OpenSSL verify documentation: https://docs.openssl.org/3.1/man1/openssl-verify/
- OpenSSL x509 documentation: https://docs.openssl.org/1.1.1/man1/x509/

## Issues Found
- The architecture diagram showed an intermediate CA, but the tutorial only creates a root CA and signs service certificates directly. I updated the diagram to match the actual implementation.
- The CA certificate was generated without first creating a CSR, so it would not include the configured subject or CA extensions such as `basicConstraints: CA:TRUE` and key-cert-signing usage. I added a CA CSR task and passed `csr_path` to `community.crypto.x509_certificate`.
- The server certificate generation role showed the mTLS client certificate task file but never included it. I added an include for `generate-client-cert.yml` using `mtls_client_certs`.
- The `include_tasks` example used `delegate_to: localhost`, but Ansible documentation states include actions themselves cannot be delegated. Since the play runs on `localhost`, I removed that misleading delegation.
- The fullchain creation used a shell `cat` task with `changed_when: true`, which would report changes on every run. I replaced it with an idempotent `copy` task using file lookups.
- The deploy-only command used `--tags deploy`, but the deploy tasks were not tagged. I added deploy tags and used `apply` on the dynamic include so included tasks inherit the tag.
- The service reload handler depended on `cert_spec`, a loop variable from an included task file, after handlers are flushed later in the play. I replaced it with an immediate reload task that runs when the certificate or key copy changed.
- The quick self-signed certificate example generated a certificate without a CSR, so it would not include the intended common name or SANs. I added a CSR task, passed `csr_path`, and added SAN variables to the example.

## Review Notes
Ansible was not installed in the local workspace, so I could not run `ansible-playbook --syntax-check` or local `ansible-doc`. I verified module and playbook behavior against current official Ansible documentation and used PyYAML locally to confirm the YAML fenced code blocks parse successfully.
