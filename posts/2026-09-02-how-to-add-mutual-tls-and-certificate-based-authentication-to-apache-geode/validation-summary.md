# Validation Summary: How to Add Mutual TLS and Certificate-Based Authentication to Apache Geode

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Apache Geode 2.0
- Mutual TLS (mTLS) and JSSE
- Java PKCS#12 keystores and truststores
- Geode integrated security
- Geode `AuthInitialize` and `SecurityManager` APIs
- Geode `gfsh`
- Certificate-backed token authentication and authorization

## Sources Consulted

- [Apache Geode 2.0: Configuring SSL](https://geode.apache.org/docs/guide/20/security/implementing_ssl.html)
- [Apache Geode: SSL sample implementation](https://geode.apache.org/docs/guide/latest/managing/security/ssl_example.html)
- [Apache Geode: Geode properties reference](https://geode.apache.org/docs/guide/latest/reference/topics/gemfire_properties.html)
- [Apache Geode 2.0.0 `ConfigurationProperties` source](https://github.com/apache/geode/blob/ada321925c721b3514341c1ffba325ab162d1d0a/geode-core/src/main/java/org/apache/geode/distributed/ConfigurationProperties.java#L2194-L2203)
- [Apache Geode: Implementing authentication](https://geode.apache.org/docs/guide/latest/managing/security/implementing_authentication.html)
- [Apache Geode: Implementing authorization](https://geode.apache.org/docs/guide/latest/managing/security/implementing_authorization.html)
- [Apache Geode: Enabling integrated security](https://geode.apache.org/docs/guide/latest/managing/security/enable_security.html)
- [Apache Geode 2.0.0 `AuthInitialize` API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/security/AuthInitialize.html)
- [Apache Geode 2.0.0 `SecurityManager` API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/security/SecurityManager.html)
- [Apache Geode 2.0: `gfsh connect`](https://geode.apache.org/docs/guide/20/tools_modules/gfsh/command-pages/connect.html)
- [RFC 5280: Internet X.509 Public Key Infrastructure Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280)

## Issues Found

- The certificate guidance required both TLS server- and client-authentication usages for every process or workload certificate. This was too broad: Geode members generally need both because they accept and initiate TLS connections, while client-only workloads need client authentication. The text now distinguishes those roles.
- The truststore guidance said to distribute only CA certificates, while a later sentence correctly allowed trust of exact certificates. The text now consistently permits deliberately pinned public leaf certificates while continuing to prohibit private keys and broad public truststores.

## Review Notes

- The post correctly distinguishes TLS peer authentication from Geode integrated authentication and authorization.
- The `ssl-web-require-authentication` name is correct for the cited Geode 2.0.0 source. Some older generated property-reference pages still display `ssl-http-require-authentication`, so retaining the version-specific source link is important.
- The Java fragments are integration skeletons rather than standalone compilable classes; their shown Geode method signatures and constants match the current 2.0.0 API.
- The `gfsh` startup and connection flags, SSL component names, defaults, alias behavior, and first-locator propagation statement match the official Geode documentation.
