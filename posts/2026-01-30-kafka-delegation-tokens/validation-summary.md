# Validation Summary: How to Implement Kafka Delegation Tokens

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Kafka delegation tokens
- Kafka SASL/SCRAM authentication
- Kafka broker configuration
- Kafka command-line tools
- Kafka Java AdminClient, producer, and consumer APIs
- confluent-kafka Python client
- Kafka ACLs
- Micrometer metrics
- HashiCorp Vault-style secret storage
- Kubernetes Pod configuration

## Sources Consulted
- Apache Kafka 4.3 broker configuration reference: https://kafka.apache.org/43/generated/kafka_config.html
- Apache Kafka 4.3 Java client Javadocs for CreateDelegationTokenOptions: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/admin/CreateDelegationTokenOptions.html
- Apache Kafka 4.3 Java client Javadocs for ExpireDelegationTokenOptions: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/admin/ExpireDelegationTokenOptions.html
- Apache Kafka 3.5 authorization and ACLs reference: https://kafka.apache.org/35/security/authorization-and-acls/
- Confluent Platform delegation token documentation: https://docs.confluent.io/platform/current/security/authentication/delegation-tokens/overview.html
- Confluent Kafka CLI tools documentation for kafka-delegation-tokens.sh: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- confluent-kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html

## Issues Found
- The broker configuration used `delegation.token.master.key` as the main Kafka setting. Apache Kafka 4.x documents `delegation.token.secret.key`, so the post now uses that and notes that Confluent Platform uses `delegation.token.master.key`.
- The prerequisites implied SASL/PLAIN or Kerberos were sufficient for token authentication. Token management can use SASL or SSL, but token authentication piggybacks on SASL/SCRAM, so the prerequisite wording was corrected.
- The Java AdminClient example used deprecated `CreateDelegationTokenOptions.maxlifeTimeMs(...)`. It now uses `maxLifetimeMs(...)`.
- The Python example implied confluent-kafka could create delegation tokens. The public confluent-kafka AdminClient API does not expose delegation-token management methods, so the sample now raises `NotImplementedError` for token creation and clearly directs token management to the Java AdminClient or CLI.
- The Java token renewal snippet used `Properties` without importing it. Added `java.util.Properties`.
- The Java revocation snippets used `expiryTimePeriodMs(0)` for immediate expiration. Kafka documents negative values as immediate expiration, so the examples now use `-1`.
- The ACL examples granted token operations on the cluster resource. Kafka documents `CreateTokens` and `DescribeTokens` against user resources for delegation-token permissions, so the examples now use `--user-principal`.
- The Micrometer sample declared a final `activeTokenCount` field that was never initialized. Removed the unused field to avoid a Java compilation error.
- The troubleshooting table referenced only `delegation.token.master.key`; it now distinguishes Apache Kafka's `delegation.token.secret.key` from Confluent Platform's `delegation.token.master.key`.

## Review Notes
The post is technically relevant and salvageable. Some examples remain illustrative rather than complete standalone applications because helper interfaces such as `SecretsManager` are referenced but not defined in the post.
