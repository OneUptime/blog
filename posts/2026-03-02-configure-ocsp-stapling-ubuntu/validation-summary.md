# Validation Summary: How to Configure OCSP Stapling on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- SSL/TLS
- OCSP and OCSP stapling
- Nginx
- Apache mod_ssl
- OpenSSL command-line tools

## Sources Consulted
- Nginx ngx_http_ssl_module official documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Apache HTTP Server 2.4 mod_ssl official documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- OpenSSL s_client official documentation: https://docs.openssl.org/3.6/man1/openssl-s_client/
- OpenSSL ocsp help output from the local OpenSSL CLI
- OpenSSL x509 help output from the local OpenSSL CLI
- RFC 6066, TLS Extensions / Certificate Status Request: https://www.ietf.org/rfc/rfc6066
- Let's Encrypt, "Ending OCSP Support in 2025": https://letsencrypt.org/2024/12/05/ending-ocsp
- Let's Encrypt community announcement, "Removing OCSP URLs from Certificates": https://community.letsencrypt.org/t/removing-ocsp-urls-from-certificates/236699

## Issues Found
- The post used Let's Encrypt's retired `r3.o.lencr.org` OCSP responder as a working example. Updated the examples to use a generic OCSP responder and added a note that current Let's Encrypt certificates do not support OCSP stapling because Let's Encrypt removed OCSP URLs in May 2025 and turned off responders in August 2025.
- The OCSP URL extraction command used text parsing of certificate output. Replaced it with `openssl x509 -noout -ocsp_uri`, which is the direct OpenSSL option for printing OCSP responder URLs.
- The Nginx `ssl_trusted_certificate` example used a certificate chain path that could be confused with the served certificate chain. Clarified that the file must contain the CA certificates needed to verify the OCSP response.
- The Apache `SSLStaplingStandardCacheTimeout` comment said the default was 300 seconds. Corrected it to 3600 seconds per Apache mod_ssl documentation.
- The Apache module note referenced an old version claim. Updated it to state that Apache 2.4 `mod_ssl` includes OCSP stapling support.

## Review Notes
The remaining examples are valid for certificates from CAs that still publish OCSP responder URLs in the certificate's Authority Information Access extension. For CAs that have moved away from OCSP, `openssl x509 -ocsp_uri` will return no URL and the stapling configuration will not produce a stapled response.
