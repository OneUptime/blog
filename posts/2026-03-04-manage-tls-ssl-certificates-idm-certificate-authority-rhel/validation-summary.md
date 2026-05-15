# Validation Summary: How to Manage TLS/SSL Certificates with IdM Certificate Authority on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux Identity Management (IdM)
- FreeIPA
- Dogtag Certificate Authority
- certmonger and ipa-getcert
- OpenSSL
- Linux system trust store
- TLS/SSL certificates and PKI

## Sources Consulted
- Red Hat Enterprise Linux 8: Managing certificates in IdM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/managing_certificates_in_idm/index
- Red Hat Enterprise Linux 10: Obtaining an IdM certificate for a service using certmonger: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_certificates_in_idm/obtaining-an-idm-certificate-for-a-service-using-certmonger-assembly
- certmonger getcert-status manual page: https://www.mankier.com/1/getcert-status
- FreeIPA Certificate Authority documentation: https://www.freeipa.org/page/Certificate_Authority.html
- Red Hat Knowledgebase: Creating certificate with a custom validity period with IdM's CA: https://api.access.redhat.com/solutions/5956481

## Issues Found
- The introduction implied that all IdM-issued certificates are automatically tracked by certmonger. Updated it to state that certificates requested through certmonger are automatically tracked, because certificates requested directly with `ipa cert-request` are not automatically tracked unless tracking is configured.
- The OpenSSL CSR example did not include a Subject Alternative Name. Added `-addext "subjectAltName = DNS:web1.example.com"` so the resulting certificate contains the DNS SAN expected by modern TLS clients and reflected in Red Hat's IdM certificate examples.
- The certmonger request example omitted the key size option shown in Red Hat's current examples. Added `-g 2048`, which lets certmonger generate a 2048-bit key if one is not already present.
- The certificate lookup example used only `web1.example.com` as the subject filter. Updated it to the full subject DN `CN=web1.example.com,O=EXAMPLE.COM` to match the subject used in the CSR.

## Review Notes
The examples are otherwise consistent with Red Hat IdM documentation for requesting certificates with `ipa cert-request`, requesting and tracking service certificates with `ipa-getcert request`, checking tracked certificates with `ipa-getcert list` and `ipa-getcert status`, revoking certificates with `ipa cert-revoke`, and installing `/etc/ipa/ca.crt` into the RHEL system trust store. The `openssl req -addext` option requires OpenSSL 1.1.1 or later, which is available on current RHEL releases such as RHEL 8, 9, and 10.
