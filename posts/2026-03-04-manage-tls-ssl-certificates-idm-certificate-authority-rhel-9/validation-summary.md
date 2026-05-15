# Validation Summary: How to Manage TLS/SSL Certificates with IdM Certificate Authority on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management (IdM)
- FreeIPA / IPA CLI
- Dogtag Certificate System
- certmonger / ipa-getcert
- OpenSSL
- TLS/SSL certificates and PKI

## Sources Consulted
- Red Hat Enterprise Linux 9, Managing certificates in IdM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_certificates_in_idm/index
- FreeIPA API reference, cert_request: https://freeipa.readthedocs.io/en/ipa-4-11/api/cert_request.html
- FreeIPA API reference, cert_find: https://freeipa.readthedocs.io/en/ipa-4-11/api/cert_find.html
- FreeIPA API reference, cert_show: https://freeipa.readthedocs.io/en/ipa-4-11/api/cert_show.html
- FreeIPA API reference, ca_add: https://freeipa.readthedocs.io/en/ipa-4-11/api/ca_add.html
- FreeIPA API reference, certprofile_import and certprofile_show: https://freeipa.readthedocs.io/en/ipa-4-11/api/certprofile_import.html and https://freeipa.readthedocs.io/en/ipa-4-11/api/certprofile_show.html
- certmonger getcert man pages: https://www.mankier.com/1/getcert-list, https://www.mankier.com/1/getcert-status, and https://www.mankier.com/1/getcert-refresh

## Issues Found
- The CA certificate export example used `ipa-cacert-manage install --ca-cert-file=/tmp/ipa-ca.crt`, which is not an export operation. Replaced it with copying `/etc/ipa/ca.crt`, the IdM CA certificate bundle documented by Red Hat.
- The OpenSSL CSR examples included only a common name. Added `subjectAltName` extensions so the resulting certificates are suitable for modern TLS hostname validation.
- The `ipa-getcert request` examples wrote to key paths without specifying how to generate the key if it was absent. Added `-g 2048`, matching Red Hat's certmonger examples.
- The sub-CA creation example omitted the required trust update step after creating a sub-CA. Added `ipa-certupdate`, which Red Hat documents as necessary to add tracking for sub-CA certificates.
- The sub-CA certmonger example omitted the DNS SAN. Added `-D web1.example.com` to keep it consistent with the service certificate request.

## Review Notes
Most CLI commands and explanations matched RHEL 9 IdM documentation. In future, certificate profile examples could also show CA ACL updates when demonstrating actual issuance with custom profiles, but the current section only covers listing, viewing, and importing profiles.
