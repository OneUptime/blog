# Validation Summary: How to Monitor Certificates Stored in Windows Certificate Stores, Java Keystores, and PEM Files

## Status

validated

## Post Type

Technical Guide / Operational Reference

## Technologies Covered

- Windows certificate stores (`CurrentUser`, `LocalMachine`, `My`, `WebHosting`, and `Root`)
- PowerShell Certificate provider and `Get-ChildItem`
- IIS, HTTP.sys, Remote Desktop, and SQL Server certificate bindings
- Java `KeyStore`, JSSE, `keytool`, PKCS#12, `cacerts`, and `jssecacerts`
- PEM textual encoding and X.509 certificates
- OpenSSL `x509`, `pkey`, and `dgst`
- TLS handshakes, SNI, certificate fingerprints, and SPKI hashes
- Prometheus custom metrics and label-cardinality practices

## Sources Consulted

- [Microsoft PowerShell Certificate provider](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/about/about_certificate_provider?view=powershell-7.6) — store paths, dynamic filters, `DnsNameList`, remote examples, and `NotAfter` semantics
- [Microsoft `Get-ChildItem` documentation](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem?view=powershell-7.6) — `Path` array and provider behavior
- [PowerShell `CertificateProvider.cs`](https://github.com/PowerShell/PowerShell/blob/80fdeb912a76e686149e5db898d0ac99d5236f53/src/Microsoft.PowerShell.Security/security/CertificateProvider.cs#L2661-L2665) and [`SecuritySupport.cs`](https://github.com/PowerShell/PowerShell/blob/80fdeb912a76e686149e5db898d0ac99d5236f53/src/System.Management.Automation/security/SecuritySupport.cs#L638-L641) — current `ExpiringInDays` threshold implementation
- [.NET `X509Certificate2` documentation](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.x509certificates.x509certificate2) — `NotAfter`, `HasPrivateKey`, and certificate metadata
- [.NET `X509Certificate2.Thumbprint` documentation](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.x509certificates.x509certificate2.thumbprint) — SHA-1 thumbprint behavior and alternate hash APIs
- [Microsoft `netsh http` documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-http) — HTTP.sys certificate hashes and store-name bindings
- [Oracle Java 25 `keytool` documentation](https://docs.oracle.com/en/java/javase/25/docs/specs/man/keytool.html) — `-list`, `-exportcert`, `-cacerts`, PKCS#12, and password `:env`/`:file` modifiers
- [Java 25 `KeyStore` API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/security/KeyStore.html) and [`TrustedCertificateEntry`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/security/KeyStore.TrustedCertificateEntry.html) — entry types and certificate-chain behavior
- [Java 25 `X509KeyManager` API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/javax/net/ssl/X509KeyManager.html) — connection-specific alias selection
- [Java 25 JSSE Reference Guide](https://docs.oracle.com/en/java/javase/25/security/java-secure-socket-extension-jsse-reference-guide.html) — default key/trust-store properties and `jssecacerts`/`cacerts` lookup order
- [OpenSSL 3.6 `x509` documentation](https://docs.openssl.org/3.6/man1/openssl-x509/), [`pkey` documentation](https://docs.openssl.org/3.6/man1/openssl-pkey/), and [`dgst` documentation](https://docs.openssl.org/3.6/man1/openssl-dgst/) — inspection flags, `-checkend`, fingerprints, public-key conversion, and SHA-256 digest output
- [OpenSSL `SSL_get_peer_cert_chain` documentation](https://docs.openssl.org/3.5/man3/SSL_get_peer_cert_chain/) — peer-sent versus verified chains and certificate absence during resumed sessions
- [RFC 5280](https://www.rfc-editor.org/rfc/rfc5280.html) — X.509 certificate fields, validity, SAN, EKU, and SubjectPublicKeyInfo
- [RFC 6066, Section 3](https://www.rfc-editor.org/rfc/rfc6066.html#section-3) — SNI-guided certificate selection
- [RFC 7468, Section 2](https://www.rfc-editor.org/rfc/rfc7468.html#section-2) — PEM textual objects and context-dependent ordering
- [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html) — TLS 1.3 certificate messages, PSK/session resumption, and certificate selection
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/) — seconds as the base time unit, metadata metrics, and label-cardinality guidance

## Issues Found

1. **PowerShell expiry-filter scope was too narrow.** The text said `-ExpiringInDays 30` finds certificates expiring within 30 days, but the current provider implementation compares only whether `NotAfter` is earlier than the future threshold, so already-expired certificates also match. Updated the description to include both already-expired certificates and certificates that will expire within 30 days.
2. **Java trust-entry and alias-selection descriptions were overgeneralized.** A `trustedCertEntry` does not affect every application merely because it exists, and an application is not limited to one alias globally. Clarified that the entry matters when the keystore is used as a trust store and that alias selection can vary by configuration or connection.
3. **`-cacerts` was described as the effective JDK trust store.** The option opens the `cacerts` associated with the invoked `keytool`, while the service JVM may use another Java installation, `javax.net.ssl.trustStore`, `jssecacerts`, an application-server configuration, or a custom trust manager. Updated the paragraph to distinguish the inspected file from the service's effective key/trust stores.
4. **OpenSSL `-checkend` omitted already-expired certificates.** The command returns nonzero when `notAfter` is before the threshold, including certificates that are already expired. Updated the description without changing the valid command.
5. **The PEM guidance assumed every object has a chain position.** RFC 7468 permits multiple textual objects whose ordering depends on context; a multi-certificate file may not be a chain. Changed the guidance to record file position and determine chain role only where applicable.
6. **A new TLS connection was not sufficient to guarantee certificate observation.** A resumed TLS session may send no certificate, so a collector could compare cached state rather than the currently served certificate. Updated the stored-versus-served procedure and conclusion to require a full, non-resumed handshake.

## Review Notes

- All shown PowerShell, `keytool`, OpenSSL, and Prometheus snippets are syntactically valid after the explanatory corrections; no command flags required replacement. The exact Java export/OpenSSL inspection and SPKI pipelines were also exercised successfully with OpenJDK 17 and OpenSSL 3.6.2, in addition to being checked against the Java 25 and OpenSSL 3.6 documentation.
- `keytool -exportcert` returns a single certificate: for a key entry with a chain, it returns the first certificate (normally the leaf). The post describes the export as singular, so no change was needed.
- `Cert:\LocalMachine\WebHosting` is common on IIS systems but may not exist on every Windows host. A fleet collector should existence-check configured stores. The post calls these stores common rather than universal, so the example was left unchanged.
- PowerShell exposes `NotBefore` and `NotAfter` in local time, while the common schema calls for UTC. The sample's `DaysRemaining` calculation correctly calls `ToUniversalTime()`; a production normalized exporter should also convert emitted timestamps. `DnsNameList` can fall back to the Subject when SAN is absent, so a collector requiring literal SAN entries should parse the SAN extension.
- OpenSSL `-checkend` also returns nonzero for command or parse errors; monitoring code should distinguish invalid input or collector failure from an expiry threshold breach. `openssl dgst -sha256` emits decorated output such as `SHA2-256(stdin)= ...`, which should be normalized before storing only the hex identifier.
- A server-sent certificate list is not automatically a verified or complete chain. Certificate selection can also vary by client signature algorithms and other ClientHello capabilities, so services intentionally serving multiple identities should probe each approved client profile.
- The Prometheus examples are valid custom metrics. `stored_certificate_not_after_timestamp_seconds` would be a more explicit conventional name for an epoch timestamp, but the shown `stored_certificate_not_after_seconds` name is valid and was not changed.
