# Validation Summary: How to Fix TLS Version Mismatch Between Client and Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- TLS
- OpenSSL
- curl
- Nginx
- Apache HTTP Server
- HAProxy
- Java JSSE / JVM TLS settings
- sslscan

## Sources Consulted
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL configuration documentation: https://docs.openssl.org/master/man5/config/
- OpenSSL `SSL_CONF_cmd` documentation: https://docs.openssl.org/3.0/man3/SSL_CONF_cmd/
- curl man page: https://curl.se/docs/manpage.html
- Nginx `ngx_http_ssl_module` documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Apache HTTP Server `mod_ssl` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- HAProxy configuration manual: https://docs.haproxy.org/2.1/configuration.html
- Oracle JSSE Reference Guide for Java SE 8: https://docs.oracle.com/javase/8/docs/technotes/guides/security/jsse/JSSERefGuide.html
- Oracle JCA provider documentation for Java SE 7: https://docs.oracle.com/javase/7/docs/technotes/guides/security/SunProviders.html
- Oracle `java` command documentation: https://docs.oracle.com/en/java/javase/22/docs/specs/man/java.html
- RFC 8996, Deprecating TLS 1.0 and TLS 1.1: https://www.rfc-editor.org/rfc/rfc8996.html
- sslscan project documentation: https://github.com/rbsec/sslscan

## Issues Found
- The `curl --tlsv1.2` example was described as forcing TLS 1.2, but current curl documents that `--tlsv1.2` means TLS 1.2 or later. I changed the command to `curl --tlsv1.2 --tls-max 1.2 https://example.com` so it actually forces TLS 1.2.
- The Java debug example put `-Djavax.net.debug=ssl:handshake` after `-jar`, which would pass it to the application instead of the JVM. I moved the `-D` option before `-jar`.
- The Java section mixed a Java 7 note with a `TLSv1.3` property example. Oracle documents that Java 7 supports TLS 1.2 but does not enable it by default for client connections. I changed the older-runtime example to `-Dhttps.protocols=TLSv1.2` and added a separate `-Djdk.tls.client.protocols=TLSv1.2,TLSv1.3` example for JDK 8+ JSSE clients.
- The standalone `-D...` property lines were not executable commands on their own. I converted them into full `java ... -jar TestSSL.jar` examples.
- The OpenSSL system-wide configuration snippet only showed the target section and omitted the `openssl_conf` and `ssl_conf` wiring needed for `system_default` to take effect. I added the required initialization sections from the OpenSSL configuration model.
- The `curl -v` example implied a backend-independent output format. I narrowed the wording to OpenSSL builds, where that verbose line is expected.

## Review Notes
- Nginx documents that `TLSv1.3` in `ssl_protocols` requires OpenSSL 1.1.1 or later, and Apache documents the same requirement for TLS 1.3 support in `mod_ssl`.
- Apache's `SSLProtocol all -SSLv3` example is technically valid for legacy compatibility, but it also re-enables deprecated TLS 1.0 and TLS 1.1 where the linked SSL library still permits them.
- `sslscan` is a third-party tool rather than a built-in platform utility; the command syntax in the post matches the project's documented usage.
