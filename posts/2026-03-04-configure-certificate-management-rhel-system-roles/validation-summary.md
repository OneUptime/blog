# Validation Summary: How to Configure Certificate Management with RHEL System Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- certmonger
- TLS/SSL certificates
- IdM/FreeIPA
- OpenSSL

## Sources Consulted
- Red Hat Documentation: Requesting certificates from a CA and creating self-signed certificates by using RHEL system roles - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/requesting-certificates-using-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Customer Portal: Red Hat Enterprise Linux (RHEL) System Roles - https://access.redhat.com/articles/3050101
- Linux System Roles certificate README - https://raw.githubusercontent.com/linux-system-roles/certificate/main/README.md
- certmonger getcert-list man page - https://www.mankier.com/1/getcert-list
- certmonger getcert-resubmit man page - https://www.mankier.com/1/getcert-resubmit

## Issues Found
- The playbook examples used undocumented `certificate_file` and `key_file` fields under `certificate_requests`. The certificate role documents `name` as the field used to derive certificate and key paths, with RHEL-family defaults of `/etc/pki/tls/certs/<name>.crt` and `/etc/pki/tls/private/<name>.key`. I removed the unsupported fields and adjusted `name` values so the examples produce the paths referenced later in the post.
- The installation command only installed `rhel-system-roles`. Red Hat's current RHEL 8.6+, 9, and 10 guidance installs both `rhel-system-roles` and `ansible-core`, so I updated the command to include `ansible-core`.
- The CA description and diagram implied separate support for IdM/FreeIPA, self-signed CAs, and local CAs. The documented role values are `ipa` and `self-sign`; `self-sign` uses certmonger's local signing behavior. I revised the wording and diagram to avoid presenting a separate unsupported local CA option.

## Review Notes
- The `getcert list -f`, `getcert resubmit -f`, and `openssl x509 -in ... -text -noout` verification commands are technically valid.
- The IdM example assumes the Kerberos realm is the uppercase DNS domain. That is common in IdM deployments but not guaranteed in every environment.
