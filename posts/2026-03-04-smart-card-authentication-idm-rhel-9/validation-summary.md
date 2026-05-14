# Validation Summary: How to Configure Smart Card Authentication with IdM on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM) / FreeIPA
- Smart card authentication with PIV/CAC-style certificates
- SSSD and PAM
- Kerberos PKINIT
- authselect
- OpenSC, PC/SC, and PKCS#11 tooling
- GDM and SSH smart card login

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing smart card authentication: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_smart_card_authentication/index
- Red Hat Enterprise Linux 9 authselect smart card options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_smart_card_authentication/configuring-smart-cards-using-authselect_managing-smart-card-authentication
- FreeIPA Certificate Identity Mapping design and CLI references: https://www.freeipa.org/page/V4/Certificate_Identity_Mapping
- FreeIPA `certmaprule_add` API reference: https://freeipa.readthedocs.io/en/ipa-4-11/api/certmaprule_add.html
- FreeIPA `ipa-cacert-manage(1)` man page: https://cheimes.fedorapeople.org/ipadoc/man/ipa-cacert-manage.1.html
- MIT Kerberos `kinit` documentation for PKINIT `-X X509_user_identity`: https://www.mit.edu/~kerberos/krb5-latest/doc/user/user_commands/kinit.html

## Issues Found
- Removed the invalid `ipa certmap-add` example. FreeIPA/IdM provides `certmaprule-*`, `certmap-match`, `user-add-cert`, and `user-add-certmapdata` commands for certificate mapping, but not `ipa certmap-add`. The post now uses `ipa-cacert-manage ... install` to add an external smart card CA.
- Corrected the SSSD certificate mapping template from `{subject_rfc822name}` to `{subject_rfc822_name}`, matching `sss-certmap` syntax.
- Renamed the "Map by Certificate Serial Number" example to "Map by Full Certificate" because `(userCertificate;binary={cert!bin})` maps by the full binary certificate, not by serial number.
- Replaced the `ipa user-add-cert` PEM string manipulation with the Red Hat-documented DER-to-base64 form using `openssl x509 -outform der ... | base64 -w0`.
- Updated the SSH smart card test command to use OpenSSH's documented PKCS#11 option, `ssh -I`, with the OpenSC PKCS#11 module path used in RHEL documentation.
- Added `--login` to the smart card certificate listing command and converted the extracted DER certificate to PEM before using it in later certificate mapping checks.
- Replaced a fragile direct SSSD D-Bus `FindByCertificate` troubleshooting example with the documented `ipa certmap-match` and `sssctl user-checks -s gdm-smartcard ... -a auth` checks.

## Review Notes
The overall setup flow matches Red Hat's RHEL 9 smart card authentication documentation: configure IdM server and clients with `ipa-advise`, trust the issuing CA chain, enable SSSD certificate authentication, and use `authselect` smart card features. Future improvements could mention copying generated `ipa-advise` scripts from the IdM server to each client and passing the full root/intermediate CA chain in the required order, but the post is technically valid after the corrections above.
