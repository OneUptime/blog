# Validation Summary: How to Implement Kafka SASL Authentication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Kafka SASL authentication
- SASL/PLAIN
- SASL/SCRAM-SHA-256 and SCRAM-SHA-512
- SASL/GSSAPI with Kerberos
- Kafka Java producer, consumer, and AdminClient APIs
- Confluent Kafka Python client
- Kafka broker security configuration
- Kafka ACLs

## Sources Consulted
- Apache Kafka documentation: Authentication using SASL: https://kafka.apache.org/41/security/authentication-using-sasl/
- Apache Kafka AdminClient Javadocs: https://kafka.apache.org/32/javadoc/org/apache/kafka/clients/admin/KafkaAdminClient.html
- Apache Kafka UserScramCredentialUpsertion Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/admin/UserScramCredentialUpsertion.html
- Apache Kafka ScramCredentialInfo Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/admin/ScramCredentialInfo.html
- Apache Kafka ScramMechanism Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/admin/ScramMechanism.html
- Confluent Platform SASL/PLAIN documentation: https://docs.confluent.io/platform/current/security/authentication/sasl/plain/overview.html
- Confluent Platform SASL/GSSAPI documentation: https://docs.confluent.io/platform/current/security/authentication/sasl/gssapi/overview.html
- Confluent Kafka Python client documentation: https://docs.confluent.io/kafka-clients/python/current/overview.html
- Confluent Platform SASL/SCRAM documentation: https://docs.confluent.io/platform/7.3/kafka/authentication_sasl/authentication_sasl_scram.html

## Issues Found
- The Java user management utility attempted to create and delete SCRAM credentials through `incrementalAlterConfigs` with `ConfigResource.Type.USER`. Kafka exposes dedicated SCRAM credential APIs for this purpose. Updated the sample to use `ScramMechanism`, `ScramCredentialInfo`, `UserScramCredentialUpsertion`, `UserScramCredentialDeletion`, and `AdminClient.alterUserScramCredentials`.
- The ACL command targeted a `SASL_SSL` listener without showing how the CLI receives SASL/TLS settings. Added `--command-config admin.properties` so the command can use the required client security properties.

## Review Notes
- The examples intentionally use placeholder hostnames, passwords, keystore paths, and principals; these must be replaced for a real deployment.
- The Kerberos example uses `SASL_PLAINTEXT`, which is valid Kafka configuration, but production deployments should prefer `SASL_SSL` when encryption is required.
