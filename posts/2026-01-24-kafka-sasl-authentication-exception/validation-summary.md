# Validation Summary: How to Fix 'SaslAuthenticationException' in Kafka

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Java clients
- SASL/PLAIN
- SASL/SCRAM-SHA-256 and SASL/SCRAM-SHA-512
- SASL/GSSAPI with Kerberos
- SASL/OAUTHBEARER
- TLS/SSL for Kafka
- Java JAAS configuration
- Kafka command-line tools

## Sources Consulted
- Apache Kafka 4.1 documentation: Authentication using SASL - https://kafka.apache.org/41/security/authentication-using-sasl/
- Apache Kafka 4.1 Java API: org.apache.kafka.common.security.oauthbearer package - https://kafka.apache.org/41/javadoc/org/apache/kafka/common/security/oauthbearer/package-summary.html
- RFC 5802: Salted Challenge Response Authentication Mechanism (SCRAM) - https://www.rfc-editor.org/rfc/rfc5802
- RFC 7628: A Set of SASL Mechanisms for OAuth - https://www.rfc-editor.org/rfc/rfc7628
- RFC 6749: The OAuth 2.0 Authorization Framework - https://www.rfc-editor.org/rfc/rfc6749
- Java SE documentation: java.net.URLEncoder - https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/URLEncoder.html

## Issues Found
- The error table incorrectly mapped "No SASL mechanism provided" to a missing `security.protocol`. Changed it to a missing `sasl.mechanism`, which is the client property that selects PLAIN, SCRAM, GSSAPI, or OAUTHBEARER.
- The error table described "Unable to find LoginModule" as a missing JAAS config file. Changed it to an invalid login module class or missing Kafka client dependency, which better matches the Java JAAS/Kafka failure mode.
- The Kerberos JAAS example referred to a ZooKeeper client section without a version caveat. Updated the comment to clarify that this is only for older ZooKeeper-based clusters and should be omitted for KRaft clusters.
- The OAuth callback handler built an `application/x-www-form-urlencoded` request body without URL-encoding `client_id` and `client_secret`. Updated the sample to use `URLEncoder`.
- The OAuth token implementation recomputed `lifetimeMs()` and `startTimeMs()` on each call. Updated it to use stable per-token timestamps and to fail clearly if the token response lacks `access_token` or `expires_in`.
- The debug logging section used `-Dorg.apache.kafka.common.security.auth.DEBUG=true`, which is not a Kafka SASL debug switch. Replaced it with guidance to configure the Kafka security logger at DEBUG level and to use `-Dsun.security.krb5.debug=true` for Kerberos-specific debugging.
- The diagnostic script did not quote the config file and broker variables consistently and did not pass SNI to `openssl s_client`. Quoted those variables and added `-servername "$HOST"` for TLS certificate checks.

## Review Notes
The post remains a broad, version-neutral Kafka SASL troubleshooting guide. Kafka 4.x uses KRaft and no longer supports ZooKeeper mode, while some older deployments still use ZooKeeper-era configuration patterns; future updates could split examples by Kafka major version if the post needs to be more prescriptive.
