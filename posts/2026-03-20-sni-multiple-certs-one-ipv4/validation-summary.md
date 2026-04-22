# Validation Summary: How to Configure SNI for Multiple Certificates on One IPv4 Address

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Server Name Indication (SNI)
- TLS certificates and certificate chains
- Nginx HTTPS virtual hosts
- Apache HTTP Server mod_ssl virtual hosts
- Certbot with the Cloudflare DNS plugin
- OpenSSL certificate inspection commands

## Sources Consulted
- RFC 6066, "Transport Layer Security (TLS) Extensions: Extension Definitions": https://www.rfc-editor.org/rfc/rfc6066
- RFC 9525, "Service Identity in TLS": https://datatracker.ietf.org/doc/html/rfc9525
- Nginx ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx server names and virtual server selection documentation: https://nginx.org/en/docs/http/server_names.html
- Nginx ngx_http_rewrite_module `return` directive documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#return
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Apache HTTP Server 2.4 SSL/TLS FAQ on SNI virtual hosts: https://httpd.apache.org/docs/2.4/ssl/ssl_faq.html
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- certbot-dns-cloudflare documentation: https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- OpenSSL `s_client` documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL `x509` documentation: https://docs.openssl.org/master/man1/openssl-x509/

## Issues Found
- The post said that without SNI a server can only present one certificate per IP address. Updated this to say the server generally presents one default certificate per IP address and port, or uses one certificate that covers every hostname, because SAN and wildcard certificates can cover multiple names without SNI-based certificate selection.
- The Nginx examples set `ssl_protocols` in the SNI-specific server blocks. Moved it to the `default_server` block, matching Nginx's documentation that protocol selection happens before SNI-specific server configuration can be applied.
- The Apache example used `SSLCACertificateFile` for a server certificate chain. Removed that line and changed the example certificate files to full-chain certificate files, because Apache documents `SSLCACertificateFile` as a client-authentication CA directive and supports intermediate server certificates in `SSLCertificateFile` on Apache 2.4.8+.
- The wildcard certificate section implied all subdomains are covered. Clarified that `*.example.com` covers single-label subdomains, consistent with TLS service identity wildcard matching rules.
- The dual-certificate section said the client negotiates which certificate to use. Reworded it to say the server selects a compatible certificate based on the client's TLS capabilities and added the Nginx/OpenSSL 1.0.2+ caveat for separate certificate chains.
- Fixed the heading typo `ECDSAand` to `ECDSA and`.

## Review Notes
- The OpenSSL verification commands use valid `s_client -connect`, `s_client -servername`, `x509 -noout`, and `x509 -subject` options. Local OpenSSL 3.0.13 help also confirmed those flags.
- The Certbot Cloudflare command matches the plugin documentation, but the Cloudflare DNS plugin is not installed by default and Certbot was not installed in this workspace; validation used the official Certbot plugin documentation.
- The Nginx default server using `return 444` is valid for closing the connection without an HTTP response. For deployments that need to reject the TLS handshake itself for unmatched SNI, Nginx 1.19.4+ also provides `ssl_reject_handshake`.
