# Validation Summary: How to Fix TLS Version Mismatch Between Client and Server - Client Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- TLS
- SSL
- OpenSSL
- Nginx
- Apache HTTP Server
- Python
- Requests
- urllib3
- Java
- Node.js
- curl
- Nmap

## Sources Consulted
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL config file format: https://docs.openssl.org/3.6/man5/config/
- OpenSSL `SSL_CONF_cmd` documentation: https://docs.openssl.org/3.0/man3/SSL_CONF_cmd/
- RFC 8996, deprecating TLS 1.0 and TLS 1.1: https://www.rfc-editor.org/rfc/rfc8996.html
- curl man page: https://curl.se/docs/manpage.html
- Node.js CLI options: https://nodejs.org/dist/latest/docs/api/cli.html
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Python `ssl` module documentation: https://docs.python.org/3/library/ssl.html
- Requests advanced usage: https://docs.python-requests.org/en/latest/user/advanced/
- urllib3 advanced usage: https://urllib3.readthedocs.io/en/stable/advanced-usage.html
- Apache `mod_ssl` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Nginx `ngx_http_ssl_module` documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Java JSSE Reference Guide: https://docs.oracle.com/en/java/javase/25/security/java-secure-socket-extension-jsse-reference-guide.html
- Java `SSLContext` API: https://docs.oracle.com/en/java/javase/26/docs/api/java.base/javax/net/ssl/SSLContext.html
- Java `HttpsURLConnection` API: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/javax/net/ssl/HttpsURLConnection.html
- Java Security Standard Algorithm Names: https://docs.oracle.com/en/java/javase/21/docs/specs/security/standard-names.html
- Nmap `ssl-enum-ciphers` script docs: https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html

## Issues Found
- The Python client upgrade advice implied that upgrading `requests` and `urllib3` alone would resolve missing TLS 1.2 support. I changed this to verify the Python/OpenSSL runtime first and kept the package upgrade as a follow-up step, because TLS version support comes from the underlying Python/OpenSSL stack.
- The Java client command used `https.protocols` as if it were the general Java client TLS control. I changed it to `jdk.tls.client.protocols`, which is the broader JSSE client-side property.
- The Nginx example used `...` inside `ssl_ciphers`, which is not valid configuration syntax. I replaced it with a valid cipher list.
- The OpenSSL configuration snippet only showed `MinProtocol` and `CipherString` under a section name, but omitted the surrounding `openssl_conf` and `ssl_conf` wiring required for a `system_default` profile to apply. I replaced it with a complete working structure based on the OpenSSL config documentation.
- The Python Requests example created an `SSLContext` but never attached it to Requests, so it would not actually change the negotiated TLS version. It also disabled hostname verification and certificate validation for a protocol-version example. I replaced it with a working custom `HTTPAdapter` example that mounts a `PoolManager` with the requested `ssl_context`.
- The Java code snippet used `SSLContext` without calling `init(...)`, which makes the snippet incomplete. I added `ctx.init(null, null, null);` and adjusted the comment so it no longer overstates that the code strictly forces TLS 1.2.
- The `openssl s_client` one-liners were updated to read from `/dev/null` so they terminate cleanly in scripted usage instead of depending on interactive stdin behavior.

## Review Notes
- TLS 1.0 and TLS 1.1 are correctly treated as deprecated compatibility-only options. Keeping those examples is reasonable here because the post explicitly discusses temporary interoperability workarounds.
- The Nginx `ssl_ciphers` and Apache `SSLCipherSuite` examples apply to TLS 1.2 and below; TLS 1.3 cipher suite configuration is handled separately or left to defaults. The post is still acceptable as written because the main topic is version mismatch, not cipher-suite tuning.
- Local validation could syntax-check the Python example, but the workspace did not have `java` or `javac`, so Java verification was documentation-based rather than compiler-based.
