# Validation Summary: How to Configure OpenSSL 3.0 Cryptographic Settings on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSL 3.0 providers
- OpenSSL legacy and FIPS providers
- RHEL system-wide cryptographic policies
- FIPS mode
- TLS cipher and protocol troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: Switching RHEL to FIPS mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Red Hat Enterprise Linux 9.0 Release Notes, OpenSSL provider changes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/new-features
- OpenSSL provider documentation: https://docs.openssl.org/3.3/man7/provider/
- OpenSSL legacy provider documentation: https://docs.openssl.org/master/man7/OSSL_PROVIDER-legacy/
- OpenSSL default provider documentation: https://docs.openssl.org/3.0/man7/OSSL_PROVIDER-default/
- OpenSSL FIPS provider documentation: https://docs.openssl.org/3.0/man7/OSSL_PROVIDER-FIPS/
- OpenSSL configuration documentation: https://docs.openssl.org/3.1/man5/config/
- OpenSSL migration guide: https://docs.openssl.org/3.5/man7/ossl-guide-migration/

## Issues Found
- The provider diagram listed MD5 under the legacy provider. MD5 is documented in the OpenSSL default provider, while legacy digests include MD2, MD4, MDC2, Whirlpool, and RIPEMD160 depending on version/build. Updated the diagram to avoid placing MD5 in the legacy provider.
- The post said the Engine API was removed in OpenSSL 3.0. OpenSSL 3.0 deprecates engines and related METHOD APIs, but builds can still include engine support. Updated the wording to "deprecated."
- The FIPS section implied that switching an existing system to FIPS mode guarantees compliance and that only FIPS-approved algorithms are globally available. Red Hat documents more specific behavior and recommends enabling FIPS during installation for compliance. Added those caveats.
- The MD5 FIPS restriction said MD5 remains usable in HMAC. That is misleading for RHEL FIPS mode and OpenSSL provider behavior, so it now says MD5 is restricted for general message digests.
- The crypto-policy listing command was described as listing available policies, but `update-crypto-policies --show` shows the active policy. Updated the comments and added the modules directory listing.
- The custom policy example used an unscoped cipher removal that did not match Red Hat's documented examples. Updated it to use a documented scoped `cipher@TLS` example.
- The upgrade troubleshooting section suggested checking `OPENSSL_API_COMPAT` through `openssl version -a`, which does not determine whether an application uses deprecated APIs. Replaced it with a symbol check for common deprecated ENGINE and custom METHOD APIs.
- The best-practices section said OpenSSL logs runtime warnings when deprecated functions are called. OpenSSL deprecation is primarily surfaced through compile-time warnings when rebuilding against OpenSSL 3 headers, so the text now points readers to build logs and compiler warnings.

## Review Notes
The commands and configuration snippets are generally accurate for RHEL 9 and OpenSSL 3.0 after the corrections above. Some behavior remains dependent on the exact RHEL minor release, installed OpenSSL package build, active crypto policy, and whether applications use the system OpenSSL configuration.
