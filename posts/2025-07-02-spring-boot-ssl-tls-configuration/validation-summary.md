# Validation Summary: How to Configure SSL/TLS in Spring Boot Applications

## Status
validated

## Post Type
Tutorial / technical how-to guide

## Technologies Covered
- Java (Spring Boot 3.x, embedded Tomcat)
- SSL/TLS, HTTPS, mutual TLS (mTLS)
- Java `keytool` and PKCS12 keystores/truststores
- OpenSSL / Let's Encrypt (certbot)
- Spring Boot `server.ssl.*` configuration (application.yml)
- Apache HttpClient 5 (RestTemplate) and Reactor Netty (WebClient)
- Spring Security 6 X.509 authentication
- Spring Boot Actuator `HealthIndicator`
- Docker and Kubernetes (Secrets, volume mounts, probes)

## Sources Consulted
- Spring Boot reference — Configure SSL / `server.ssl.*` properties (https://docs.spring.io/spring-boot/reference/web/servlet.html#web.servlet.embedded-container.customizing.ssl)
- Spring Boot `org.springframework.boot.web.server.Ssl` API (key-store, trust-store, client-auth, enabled-protocols, ciphers)
- Oracle `keytool` documentation (`-genkeypair`, `-certreq`, `-gencert`, `-importcert`, `-exportcert`, `-ext bc:c`)
- OpenSSL `pkcs12` and `s_client`/`x509`/`verify` man pages
- Let's Encrypt / certbot `certonly --standalone` docs
- Apache HttpClient 5.x API (`SSLConnectionSocketFactoryBuilder`, `PoolingHttpClientConnectionManagerBuilder`, `HttpClients`)
- Reactor Netty `HttpClient.secure(...)` and Netty `SslContextBuilder.forClient()` docs
- Spring Security 6 reference — X.509 authentication (`http.x509(...)`, `subjectPrincipalRegex`)
- Jakarta Servlet spec — `jakarta.servlet.request.X509Certificate` request attribute
- RFC 8446 (TLS 1.3) and RFC 5246 (TLS 1.2) for handshake behavior and cipher suite naming

## Issues Found
- **TLS handshake diagram inaccuracy (fixed):** The Mermaid sequence diagram showed the client making a live round-trip to the Certificate Authority (`Client->>CA: Verify Certificate` / `CA->>Client: Certificate Valid`) during the handshake. This is incorrect — during a TLS handshake the client validates the server certificate **locally** against the trusted CA certificates in its trust store (revocation is checked out-of-band via OCSP/CRL, not by contacting the issuing CA inline). Replaced those two messages with a note explaining local validation plus a `Client->>Client: Verify certificate chain & signature` step. Also changed `Key Exchange (encrypted with server public key)` to `Key Exchange (ECDHE key agreement)` to match the TLS 1.3 / ECDHE cipher suites the post actually recommends (RSA key transport is removed in TLS 1.3 and not used with the listed ECDHE suites).

## Review Notes
- **`DynamicSslContextReloader` (certificate rotation):** The code correctly watches keystore/truststore mtimes and rebuilds an `SSLContext` into an `AtomicReference`. Note for readers: swapping this reference does **not** by itself reload the certificate on a running embedded Tomcat connector — the rebuilt context is only consumed by outbound HTTP clients that call `getSslContext()`. True hot-reload of the server-side connector requires reconfiguring Tomcat's `SSLHostConfig` (e.g., `protocolHandler.reloadSslHostConfigs()`) or a graceful connector restart. The code as written is valid Java and works for the client-side use case; this is a design caveat, not a syntax error.
- **`ProgrammaticSslConfig` second customizer:** The direct SSL setters on `Http11NioProtocol` (`setKeystoreFile`, `setKeystorePass`, `setTruststoreFile`, `setClientAuth`, `setSslEnabledProtocols`, etc.) are deprecated in Tomcat 10.x in favor of `SSLHostConfig`/`SSLHostConfigCertificate`. They still function in current Tomcat releases, but readers on newer Tomcat may see deprecation warnings and should consider the `SSLHostConfig` API. The primary `Ssl`-based customizer is the recommended modern approach and is fully correct.
- All keytool, openssl, certbot, curl, and JVM debug (`-Djavax.net.debug=ssl:handshake:verbose`) commands are accurate and current.
- Spring Boot YAML properties, `client-auth` values (`need`/`want`/`none`), cipher suite names, and the Spring Security 6 `x509` lambda DSL are all correct for Spring Boot 3.x.
- Security best-practices checklist (TLS 1.2/1.3 only, AES-GCM, 2048/4096-bit RSA, HSTS, rotation, monitoring) aligns with current industry guidance.
