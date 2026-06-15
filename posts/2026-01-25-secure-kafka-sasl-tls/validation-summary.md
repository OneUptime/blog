# Validation Summary: How to Secure Kafka with SASL and TLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- TLS/SSL
- SASL/SCRAM
- Kafka ACLs
- Java Kafka producer and consumer clients
- OpenSSL
- Java keytool

## Sources Consulted
- Apache Kafka 4.3 Documentation: Encryption and Authentication using SSL: https://kafka.apache.org/43/security/encryption-and-authentication-using-ssl/
- Apache Kafka 4.3 Documentation: Authentication using SASL: https://kafka.apache.org/43/security/authentication-using-sasl/
- Apache Kafka 4.3 Documentation: Authorization and ACLs: https://kafka.apache.org/43/security/authorization-and-acls/
- Confluent Platform Documentation: TLS authentication and Kafka SSL settings: https://docs.confluent.io/platform/current/security/authentication/mutual-tls/overview.html

## Issues Found
- Broker certificates were generated without Subject Alternative Names, which breaks hostname verification for modern Kafka clients and brokers. Added SAN extensions to the key generation, CSR, and OpenSSL signing steps, and made CA and server certificate extensions explicit.
- `ssl.client.auth=required` was configured globally, but the SASL_SSL Java clients only configured a truststore and SCRAM credentials. Changed this to listener-specific client authentication: required for the SSL listener and none for the SASL_SSL listener.
- The SASL broker snippet included `sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512` even though the broker configuration used the SSL listener for inter-broker traffic. Removed the unused inter-broker SASL setting and clarified the JAAS listener comment.
- The ACL example for prefixed topics passed `--topic` twice, once as `'*'` and once as `analytics-`. Removed the wildcard topic so the command correctly creates a prefixed ACL for topics beginning with `analytics-`.
- The authorization snippet used the older ZooKeeper-era `kafka.security.authorizer.AclAuthorizer`. Updated it to `org.apache.kafka.metadata.authorizer.StandardAuthorizer`, which is the current documented authorizer for KRaft clusters.
- The certificate rotation example called `./generate-certs.sh --output certs-new/`, but the certificate script did not support that option. Added a positional output directory argument to the script and updated the rotation command to `./generate-certs.sh certs-new`.

## Review Notes
- The examples intentionally keep a PLAINTEXT listener for setup and demonstration, while the production checklist correctly says to disable PLAINTEXT in production.
- The TLS cipher suite list may need adjustment for the exact JVM and security provider in use, because Kafka only enables cipher suites supported by the runtime.
