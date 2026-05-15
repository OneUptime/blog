# Validation Summary: How to Configure TLS/SSL Encryption for 389 Directory Server on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- 389 Directory Server / Red Hat Directory Server
- LDAP, LDAPS, and STARTTLS
- TLS certificates and NSS certificate databases
- OpenSSL
- OpenLDAP ldapsearch
- firewalld

## Sources Consulted
- Red Hat Directory Server 13 Security and access control documentation: https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html/security_and_access_control/securing-rhds
- Red Hat Directory Server 13 single-page security documentation: https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html-single/security_and_access_control/index
- OpenLDAP ldapsearch local man page / help output

## Issues Found
- The self-signed certificate command created only a Common Name. Modern TLS clients validate host names using the Subject Alternative Name extension, so I added `-addext "subjectAltName=DNS:ldap.example.com"`.
- The post manually created and imported a PKCS#12 bundle with `pk12util`. Current Red Hat Directory Server documentation recommends importing an externally generated certificate and key with `dsctl <instance_name> tls import-server-key-cert`, so I replaced the PKCS#12 steps with that command.
- The TLS enablement command omitted `nsslapd-securePort=636`. Red Hat's procedure sets both `nsslapd-securePort=636` and `nsslapd-security=on`, so I updated the command.
- The `dsconf localhost security rsa set` options were incorrect: `--tls-name` and `--tls-minimum-version` are not the documented options for that subcommand. I replaced them with `--tls-allow-rsa-certificates on`, `--nss-token "internal (software)"`, and `--nss-cert-name "Server-Cert"`, and added the separate documented `dsconf localhost security set --tls-protocol-min="TLS1.2"` command.
- The STARTTLS `ldapsearch` example omitted `-x`; OpenLDAP uses `-x` for simple authentication with a bind DN and password, so I added it.
- The firewall example used `--add-service=ldaps`. Red Hat's Directory Server TLS procedure documents opening `636/tcp` directly, so I changed it to `--add-port=636/tcp`.
- The final restart command used `dsconf localhost restart`, which is not the documented restart utility. I changed it to `dsctl localhost restart`.

## Review Notes
The post is technically relevant and now matches the current Red Hat Directory Server command-line workflow more closely. In a future revision, it could mention adding the issuing CA or self-signed certificate to client trust stores before using `ldapsearch` or other TLS-verifying clients.
