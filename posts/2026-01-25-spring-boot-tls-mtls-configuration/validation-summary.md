# Validation Summary: How to Configure TLS 1.3 and mTLS in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spring Boot
- Spring Security X.509 authentication
- Java JSSE and KeyStore APIs
- TLS 1.3 and mutual TLS
- OpenSSL
- keytool
- Apache HttpClient 5
- RestTemplate
- WebClient
- Reactor Netty / Netty
- Jakarta Servlet
- curl

## Sources Consulted
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Spring Boot SSL documentation: https://docs.spring.io/spring-boot/reference/features/ssl.html
- Spring Boot REST client SSL documentation: https://docs.spring.io/spring-boot/reference/io/rest-client.html
- Spring Security X.509 authentication documentation: https://docs.spring.io/spring-security/reference/servlet/authentication/x509.html
- Jakarta Servlet request attribute documentation: https://jakarta.ee/specifications/servlet/5.0/apidocs/jakarta/servlet/servletrequest
- Apache HttpClient 5 classic migration guide: https://hc.apache.org/httpcomponents-client-5.6.x/migration-guide/migration-to-classic.html
- Apache HttpClient 5 PoolingHttpClientConnectionManagerBuilder API: https://hc.apache.org/httpcomponents-client-5.6.x/5.6/httpclient5/apidocs/org/apache/hc/client5/http/impl/io/PoolingHttpClientConnectionManagerBuilder.html
- Netty SslContextBuilder API: https://netty.io/4.1/api/io/netty/handler/ssl/SslContextBuilder.html
- Oracle keytool documentation: https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html
- Oracle JSSE OCSP documentation: https://docs.oracle.com/javase/8/docs/technotes/guides/security/jsse/ocsp.html
- RFC 8446, The Transport Layer Security Protocol Version 1.3: https://datatracker.ietf.org/doc/html/rfc8446
- RFC 6125, service identity verification in TLS certificates: https://datatracker.ietf.org/doc/html/rfc6125
- Local OpenSSL 3.0.13 command smoke test for the updated certificate-generation sequence

## Issues Found
- The original development server certificate used only `CN=localhost`. Modern TLS clients validate hostnames with Subject Alternative Name entries, so the generated certificate could fail hostname verification for `https://localhost`. I added server certificate extensions with `subjectAltName=DNS:localhost,IP:127.0.0.1` and appropriate server key usage.
- The original generated CA and client/server certificates did not explicitly set CA, server authentication, or client authentication X.509 extensions. I added basic constraints and key usage / extended key usage extensions so the generated certificates match their intended roles more reliably.
- The RestTemplate example used `SSLConnectionSocketFactoryBuilder` and `setSSLSocketFactory`, which are deprecated in current Apache HttpClient 5.x. I changed the example to use `ClientTlsStrategyBuilder`, `setTlsSocketStrategy`, and `TLS.V_1_3`, matching current HttpClient 5 guidance.
- The production revocation note said to configure Spring Boot to verify revocation status, which implied a direct Spring Boot server property. I changed it to refer to JSSE, a custom trust manager, or TLS termination, which is more accurate for CRL/OCSP enforcement.

## Review Notes
- The Spring Boot `server.ssl.*` properties, `client-auth: need`, TLS 1.3 protocol setting, Jakarta Servlet certificate request attribute, Spring Security X.509 configuration style, Netty WebClient SSL context setup, keytool truststore imports, and curl mTLS test commands are technically valid.
- `RestTemplate` still works but is no longer the newest Spring client style; Spring Boot's current documentation emphasizes SSL bundles with RestClient and WebClient. This is a future modernization opportunity, not a correctness issue for the post.
