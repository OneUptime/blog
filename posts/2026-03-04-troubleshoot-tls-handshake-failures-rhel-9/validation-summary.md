# Validation Summary: How to Troubleshoot TLS Handshake Failures on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- TLS 1.2 and TLS 1.3
- OpenSSL `s_client` and `ciphers`
- GnuTLS `gnutls-cli`
- curl
- system-wide cryptographic policies
- tcpdump and Wireshark packet analysis
- SELinux audit logs and file contexts
- netcat TCP connectivity checks

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 Securing networks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/planning-and-implementing-tls_securing-networks
- Red Hat Developer, "Enhance security with system-wide crypto policies in RHEL 9": https://developers.redhat.com/articles/2024/10/09/enhance-security-system-wide-crypto-policies-rhel-9
- OpenSSL 3.0 `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL `ciphers` local help output from OpenSSL 3.0.13
- GnuTLS `gnutls-cli` manual: https://gnutls.org/manual/html_node/gnutls_002dcli-Invocation.html
- curl command-line documentation: https://curl.se/docs/manpage.html
- tcpdump manual page: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- ausearch manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- restorecon manual page: https://man7.org/linux/man-pages/man8/restorecon.8.html
- OpenBSD netcat-compatible local `nc -h` output

## Issues Found
- The post said switching RHEL 9 to the `LEGACY` crypto policy could allow older TLS versions. Red Hat's RHEL 9 documentation states that `DEFAULT`, `FUTURE`, and `LEGACY` allow only TLS 1.2 and 1.3. I changed the guidance to explain that `LEGACY` can help with some older algorithms, but does not re-enable TLS 1.0 or TLS 1.1 on RHEL 9.
- The TLS handshake diagram was presented as the generic TLS handshake, but it showed TLS 1.2-era messages such as `ServerHelloDone` and `ClientKeyExchange`, which do not describe TLS 1.3. I clarified that the diagram is a TLS 1.2-style handshake.
- The `openssl s_client` checklist implied that `Verify return code: 0` includes all certificate validation. I clarified that it means the chain validates against the local trust store and that hostname checking requires `-verify_hostname`.
- The certificate-chain description said the output shows the full chain from the server certificate to the root. Servers normally send the leaf and intermediates, not necessarily the root, so I changed the wording to "server certificate and any intermediate certificates the server sent."
- The cipher-suite command was described as listing the cipher suites a server accepts, but a plain `s_client` connection only shows the negotiated cipher for that connection. I corrected the description and comment.
- The missing-intermediate guidance said "depth 0" alone indicates a missing intermediate. I narrowed that to the more accurate case where only the leaf certificate is shown and verification fails with an issuer error.

## Review Notes
The remaining commands and options are technically valid for the covered tools. `gnutls-cli` was not installed in the local workspace, so its syntax was verified against upstream GnuTLS documentation rather than local execution.
