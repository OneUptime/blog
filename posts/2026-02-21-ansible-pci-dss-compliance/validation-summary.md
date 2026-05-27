# Validation Summary: How to Use Ansible to Automate PCI DSS Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks and roles
- PCI DSS compliance automation
- UFW firewall management
- OpenSSL TLS and certificate checks
- Nginx TLS configuration
- Linux auditd rules
- OpenSSH server hardening
- Linux networking and system commands

## Sources Consulted
- PCI Security Standards Council Document Library, PCI DSS v4.0.1: https://www.pcisecuritystandards.org/document_library/
- PCI Security Standards Council SAQ D for Service Providers, PCI DSS v4.0 Requirement 5 wording: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.builtin.include_tasks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- OpenSSL s_client documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL x509 documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- Nginx ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Linux audit augenrules manual page: https://www.man7.org/linux/man-pages/man8/augenrules.8.html
- OpenSSH sshd_config manual page: https://man.openbsd.org/sshd_config
- Linux ss manual page: https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- The post used older PCI DSS requirement titles such as "Do not use vendor-supplied defaults" and "Use and update anti-virus." Updated the task names and overview wording to align with PCI DSS v4.0.1 terminology.
- The introductory compliance claim was overly broad and referred to "credit card data." Changed it to say PCI DSS applies to organizations that process, store, or transmit cardholder data, and softened "Ansible automates" to "Ansible helps automate."
- The UFW examples used the unqualified `ufw` module name. Updated them to `community.general.ufw`, matching current Ansible collection documentation.
- The firewall status result treated any stdout containing `active` as passing, which would incorrectly pass `inactive`. Updated the check to look for `Status: active` and the remediation condition to look for `Status: inactive`.
- The TLS section claimed to verify TLS 1.0 and 1.1 were disabled but only tested TLS 1.1. Added a TLS 1.0 check, updated the PCI DSS control label to 4.2.1, and made the result require both legacy protocol checks to fail.
- The certificate validity check printed dates but did not actually fail for an expired certificate. Replaced it with `openssl x509 -checkend 0`, which exits nonzero when the certificate is expired.
- The LUKS encryption example collected `lsblk -f` output but did not assert that encryption was present. Added an assertion for `crypto_LUKS`.
- The unauthorized port check searched for bare port numbers anywhere in `ss` output, which could create false positives from unrelated text. Updated it to match listening address fields ending in the target port.
- The report-generation example recorded a passed password complexity check but did not record the failure case. Added a failure record and made the grep pattern tolerate leading whitespace around `minlen =`.

## Review Notes
- The examples are illustrative and still need environment-specific control mapping, inventories, variables, handlers, and assessor review before being used as evidence for PCI DSS compliance.
- Ansible was not installed in the local environment, so validation used official documentation and YAML parsing rather than `ansible-playbook --syntax-check`.
