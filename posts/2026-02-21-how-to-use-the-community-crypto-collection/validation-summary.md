# Validation Summary: How to Use the community.crypto Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.crypto collection
- TLS/SSL certificates
- OpenSSL private keys and CSRs
- ACME and Let's Encrypt
- Internal certificate authorities

## Sources Consulted
- Ansible community.crypto openssl_privatekey module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/openssl_privatekey_module.html
- Ansible community.crypto openssl_csr module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/openssl_csr_module.html
- Ansible community.crypto x509_certificate module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/x509_certificate_module.html
- Ansible community.crypto acme_certificate module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/acme_certificate_module.html
- Ansible community.crypto x509_certificate_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/x509_certificate_info_module.html
- Ansible community.crypto openssl_privatekey_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/openssl_privatekey_info_module.html

## Issues Found
- The installation section listed obsolete `cryptography` requirements (`>= 1.6` generally and `>= 1.5` for ACME). Current community.crypto documentation requires `cryptography >= 3.3` for the private key, CSR, x509 certificate, and info modules; the ACME module requires either `openssl` or `cryptography >= 3.3`. Updated the text accordingly.
- The internal CA example delegated the `x509_certificate` signing task to the CA server while referencing `/etc/ssl/certs/server.csr`, which is generated on the webserver and would not exist on the delegated CA host. Updated the example to slurp the CSR from the webserver, pass it to the CA signing task with `csr_content`, return the certificate content, and copy the signed certificate back to the webserver.

## Review Notes
- The ACME example uses the documented two-step `community.crypto.acme_certificate` flow and current Let's Encrypt ACME v2 directory URL. In future updates, consider adding `remaining_days` to demonstrate renewal behavior explicitly.
