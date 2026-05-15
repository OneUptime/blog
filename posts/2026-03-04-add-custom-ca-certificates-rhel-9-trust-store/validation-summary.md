# Validation Summary: How to Add Custom CA Certificates to the RHEL Trust Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL system-wide CA trust store
- `update-ca-trust` and `trust`
- OpenSSL command-line tools
- Java trust store integration on RHEL
- Python HTTPS certificate verification
- Node.js `NODE_EXTRA_CA_CERTS`
- Ansible automation

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using shared system certificates": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/using-shared-system-certificates_securing-networks
- Red Hat Enterprise Linux 9 release notes noting `update-ca-trust` without arguments is deprecated and maps to `update-ca-trust extract`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/9.6_release_notes/distribution
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- Local OpenSSL command help for `openssl x509`, `openssl crl2pkcs7`, and `openssl pkcs7`
- Node.js CLI documentation for `NODE_EXTRA_CA_CERTS`: https://nodejs.org/download/release/v22.17.0/docs/api/cli.html#node_extra_ca_certsfile
- Go `crypto/x509` documentation for `SystemCertPool`: https://pkg.go.dev/crypto/x509#SystemCertPool
- Ansible handler documentation for `notify` and `listen`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- The post used `update-ca-trust` without the `extract` subcommand. RHEL documentation shows `update-ca-trust extract`, and recent RHEL 9 release notes note the no-argument form is deprecated compatibility behavior. Updated commands and prose to use `update-ca-trust extract`.
- The `openssl s_client -showcerts` example wrote all presented certificates to `ca-cert.pem` while the text implied it downloaded a single CA certificate. Updated the example to save `server-chain.pem` for inspection and clarified that only intended CA certificates should be copied into separate PEM files.
- The combined PEM example used shell redirection with `sudo`, which would fail for a normal user because the redirection is performed by the non-root shell. Replaced it with `sudo tee`.
- The Java verification command used the generic default `-cacerts` store. Updated it to check RHEL's generated Java trust store at `/etc/pki/java/cacerts`.
- The troubleshooting section said the anchor file must have a `.pem` extension. Red Hat documents simple PEM or DER certificates in the anchors directory, so the note was corrected to focus on valid certificate format and readability.
- The post overgeneralized applications with their own trust stores by naming Firefox, Node.js, and Go programs as bundled-CA examples. Updated the wording to a broader and more accurate caveat about runtimes or applications with their own trust stores, pinned certificates, or explicit CA settings.
- The introduction and wrap-up implied every TLS application automatically uses the RHEL shared trust store. Updated wording to say many applications do, specifically those using shared system trust such as OpenSSL, GnuTLS, NSS, and Java.

## Review Notes
The core workflow is correct for RHEL 9: place trusted CA certificates under `/etc/pki/ca-trust/source/anchors/` and run `update-ca-trust extract`. Red Hat also documents `trust anchor <certificate>` as an alternative management interface, but the file-based workflow used by the post is valid.
