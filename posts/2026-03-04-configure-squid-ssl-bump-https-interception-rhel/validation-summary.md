# Validation Summary: How to Configure Squid SSL Bump for HTTPS Interception on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Squid proxy
- Squid SSL Bump
- OpenSSL
- Linux certificate trust stores
- systemd

## Sources Consulted
- Squid `ssl_bump` configuration directive: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid `http_port` configuration directive: https://www.squid-cache.org/Doc/config/http_port/
- Squid `https_port` configuration directive: https://www.squid-cache.org/Doc/config/https_port/
- Squid `sslcrtd_program` configuration directive: https://www.squid-cache.org/Doc/config/sslcrtd_program/
- Squid `sslcrtd_children` configuration directive: https://www.squid-cache.org/Doc/config/sslcrtd_children/
- Squid `tls_outgoing_options` configuration directive: https://www.squid-cache.org/Doc/config/tls_outgoing_options/
- Squid `acl` configuration directive, including `at_step` and `ssl::server_name`: https://www.squid-cache.org/Doc/config/acl/
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- Red Hat Enterprise Linux 9 shared system certificates documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/using-shared-system-certificates_securing-networks
- Local OpenSSL CLI help for `openssl s_client` and `openssl req`

## Issues Found
- The post checked only for `--with-openssl`, but Squid's certificate generation helper configuration requires SSL certificate daemon support as well. Added a `squid -v` check for `--enable-ssl-crtd`.
- The original configuration enabled `ssl-bump` only on an intercepted `https_port`, while the test configured clients to use Squid as an explicit proxy on port 3128. Squid requires the `http_port` to be configured with `ssl-bump` for HTTPS CONNECT bumping, so the primary example now uses `http_port 3128 ssl-bump` and leaves the transparent `https_port` form as a commented option requiring firewall/NAT redirection.
- The Squid port example used the older `cert=` option. Updated it to the current documented `tls-cert=` option.
- The combined CA certificate and private key file was not explicitly protected. Added `chmod 600` for `squid-ca.pem` because it contains the private key.
- The selective no-bump examples used `dstdomain`; Squid's SSL Bump documentation recommends matching TLS/server names with `ssl::server_name`. Updated the examples accordingly.
- The sensitive-site exclusion snippet did not say it must appear before `ssl_bump bump all`. Added that placement requirement because Squid applies the first matching possible SSL Bump action.
- The RHEL trust-store command used bare `update-ca-trust`. Updated it to `update-ca-trust extract`, matching Red Hat's documented procedure after copying anchors.
- The `openssl s_client` verification command did not set SNI and could remain interactive. Added `-servername www.example.com` and redirected stdin from `/dev/null`.

## Review Notes
- SSL Bump support depends on Squid build options and packaging. RHEL-derived environments can vary, so the added build-option checks are important before applying this configuration.
- The post remains focused on explicit proxy SSL Bump. True transparent HTTPS interception also requires network redirection rules, which are now noted but not expanded into a separate procedure.
- Squid's public configuration reference notes that these SSL Bump directives are available through Squid 7 and not in Squid 8. This is not a problem for the RHEL-oriented tutorial, but future updates should re-check the target Squid version.
