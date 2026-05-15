# Validation Summary: How to Manage TLS Certificates Using GnuTLS on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GnuTLS
- certtool
- gnutls-cli
- X.509 certificates, CSRs, CA certificates, CRLs, and PKCS#12 bundles
- TLS priority strings

## Sources Consulted
- GnuTLS certtool invocation manual: https://www.gnutls.org/manual/html_node/certtool-Invocation.html
- GnuTLS gnutls-cli invocation manual: https://gnutls.org/manual/html_node/gnutls_002dcli-Invocation.html
- GnuTLS priority strings manual: https://gnutls.org/manual/html_node/Priority-Strings.html
- Red Hat Enterprise Linux 9 Securing networks, creating and managing TLS keys and certificates: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/creating-and-managing-tls-keys-and-certificates_securing-networks
- Red Hat Enterprise Linux 9 Security hardening, system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening

## Issues Found
- The introduction described GnuTLS as the preferred TLS library on many Red Hat systems. I changed this to say it is widely used on Red Hat systems, which is accurate without overstating Red Hat's position.
- The CA template did not include `crl_signing_key`, but the post later uses that CA to generate CRLs. I added `crl_signing_key` so the CA certificate has the CRL signing key usage.
- The `--verify-chain` example did not mention that the input must be an ordered PEM chain ending in the trusted root certificate. I clarified the required chain shape.
- The `gnutls-cli --priority "NORMAL" example.com -p 443` example was introduced as checking all supported TLS versions and ciphersuites, but it displays the negotiated protocol and cipher for one connection. I corrected the wording.
- The PKCS#12 example described `certtool --p12-info` as extracting a certificate. I changed it to inspecting/displaying information from the PKCS#12 file, matching the documented command behavior.
- The priority string table described `SECURE256` as a 256-bit security level minimum and `PERFORMANCE` as generally prioritizing speed over security level. I corrected these descriptions to match GnuTLS documentation: `SECURE256` is equivalent to `SECURE192` overall while enabling 256-bit-key ciphers, and `PERFORMANCE` uses secure 128-bit ciphersuites sorted for speed.

## Review Notes
I could not run the GnuTLS commands locally because the shared Ubuntu environment does not have `certtool` installed and package installation requires privileges. Command syntax and behavior were validated against official GnuTLS and Red Hat documentation instead.
