# Validation Summary: How to Use Ansible to Configure SSL/TLS with Apache

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Apache HTTP Server
- SSL/TLS
- OpenSSL
- Ubuntu 22.04

## Sources Consulted
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Apache HTTP Server 2.4 mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache HTTP Server 2.4 mod_proxy documentation: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Ansible 2.9 apache2_module documentation: https://docs.ansible.com/projects/ansible/2.9/modules/apache2_module_module.html
- Ansible 2.9 command module documentation: https://docs.ansible.com/projects/ansible/2.9/modules/command_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- OpenSSL req documentation: https://docs.openssl.org/3.0/man1/openssl-req/
- Ubuntu 22.04 apache2 package details: https://packages.ubuntu.com/jammy/apache2
- Ubuntu 22.04 openssl package details: https://packages.ubuntu.com/jammy/openssl

## Issues Found
- The Apache virtual host used `SSLCertificateChainFile`. Apache 2.4.8 and later make this directive obsolete because `SSLCertificateFile` can include intermediate certificates. Since the post targets Ubuntu 22.04, which ships Apache 2.4.x, I changed the example to use a full-chain certificate file in `SSLCertificateFile` and removed the separate chain-file deployment and directive.
- The certificate copy tasks referenced `ssl_cert_local` and `ssl_key_local`, but those variables were missing from `group_vars/all.yml`. I added them to the variables example.
- The `use_self_signed=true` run path would still try to copy local certificate files before generating a self-signed certificate. I made the local certificate copy tasks conditional on not using self-signed certificates and added the self-signed generation task to the main role task flow.
- The OpenSSL self-signed certificate command used `-nodes`, which OpenSSL 3.0 documents as deprecated. Ubuntu 22.04 ships OpenSSL 3.0, so I changed the command to use `-noenc`.

## Review Notes
- The Ansible examples use short module names, which remain valid for Ansible 2.9. Current Ansible documentation recommends fully qualified collection names for clarity, but this is not required for correctness in the version range stated by the post.
- The `X-XSS-Protection` response header is accepted by Apache but is obsolete in modern browsers. It was left unchanged because removing it would be broader than a correctness fix.
