# Validation Summary: How to Configure Squid with SSL Bumping on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu 22.04 and 24.04
- Squid proxy
- Squid SSL bumping / HTTPS interception
- OpenSSL certificate generation
- iptables / netfilter-persistent
- curl proxy testing

## Sources Consulted
- Squid `ssl_bump` directive documentation: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid `http_port` directive documentation: https://www.squid-cache.org/Doc/config/http_port/
- Squid `https_port` directive documentation: https://www.squid-cache.org/Doc/config/https_port/
- Squid `sslcrtd_program` directive documentation: https://www.squid-cache.org/Doc/config/sslcrtd_program/
- Squid `acl` directive documentation: https://www.squid-cache.org/Doc/config/acl/
- Squid Peek and Splice feature documentation: https://wiki.squid-cache.org/Features/SslPeekAndSplice
- Ubuntu package search for `squid-openssl`: https://packages.ubuntu.com/search?keywords=squid-openssl
- OpenSSL `req` documentation: https://docs.openssl.org/3.2/man1/openssl-req/
- OpenSSL X.509 extension documentation: https://docs.openssl.org/4.0/man5/x509v3_config/
- Local Ubuntu package metadata and package contents for `squid`, `squid-openssl`, and `squid-common` on Ubuntu 24.04.

## Issues Found
- The generated CA certificate did not include CA X.509 extensions. I added `basicConstraints=critical,CA:TRUE`, `keyUsage=critical,keyCertSign,cRLSign`, and `subjectKeyIdentifier=hash` so the certificate is valid for signing generated Squid certificates.
- The sample used older `cert=` and `key=` port options. I changed them to Squid 6's documented `tls-cert=` and `tls-key=` options.
- The explicit proxy port `3128` was used for the HTTPS bumping test but was configured as a plain proxy port without `ssl-bump` or certificate options. I enabled SSL bumping on `http_port 3128` so explicit CONNECT requests can be bumped as described.
- The blocklist rule appeared after `http_access allow localnet`, so local clients would bypass the blocklist. I moved blocklist denies before the localnet allow.
- The no-bump ACL used `dstdomain`, which is unreliable for SSL bump decisions, especially with intercepted HTTPS. I changed the no-bump ACLs to `ssl::server_name`, which Squid documents for CONNECT/SNI/certificate based server-name matching.
- The single blocklist ACL could not reliably cover both plain HTTP domains and TLS server names. I split it into `dstdomain` and `ssl::server_name` ACLs using the same file and denied both.

## Review Notes
The guide is technically relevant and salvageable. The transparent interception example still assumes the Squid host is on the forwarding path and that `eth0` is the correct ingress interface; those are deployment-specific details administrators must adjust. Some modern clients and applications may reject HTTPS interception because of certificate pinning, ECH, QUIC/HTTP/3, or application-specific trust stores, even when Squid is configured correctly.
