# Validation Summary: How to Configure Kafka SASL Authentication Over IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- SASL
- SASL/SCRAM
- IPv4 networking
- Kafka CLI tools

## Sources Consulted
- Apache Kafka documentation, "Authentication using SASL": https://kafka.apache.org/42/security/authentication-using-sasl/
- Apache Kafka documentation, "Security Overview": https://kafka.apache.org/42/security/security-overview/
- RFC 5802, "Salted Challenge Response Authentication Mechanism (SCRAM) SASL and GSS-API Mechanisms": https://datatracker.ietf.org/doc/html/rfc5802

## Issues Found
- The broker JAAS example included an extra `KafkaClient` section. For SCRAM broker configuration, the Apache Kafka docs use the `KafkaServer` section for the broker's inter-broker login context, so the unused extra section was removed to avoid implying it was required.
- The SASL mechanisms table omitted `OAUTHBEARER`, which is listed as a supported SASL mechanism in the current Apache Kafka security documentation. The table was updated so it matches the official mechanism list.
- The original SCRAM bootstrap sequence created the inter-broker `broker-admin` credential with `kafka-configs.sh --bootstrap-server`. Current Kafka docs require inter-broker SCRAM credentials to exist before brokers start, so this was corrected to use `kafka-storage.sh format --add-scram` for the initial broker credential.
- The `kafka-configs.sh` user-creation commands were missing `--command-config`, which is needed for the admin client to authenticate to a secured broker. The commands were updated to use an authenticated admin properties file.
- The post created separate `producer-user` and `consumer-user` accounts, but both test commands used the same client properties file with `producer-user` credentials. Separate producer and consumer properties were added so the examples match the users being created.
- The description claimed the post covered both SASL/PLAIN and SASL/SCRAM, but the implementation only documented SCRAM. The description was narrowed to SCRAM to match the actual content.

## Review Notes
- The examples use `SASL_PLAINTEXT`, which is valid for demonstration, but Apache Kafka recommends `SASL_SSL` when you need encrypted transport.
- Apache Kafka notes that SASL clients may perform reverse DNS lookups; hostnames are generally preferred over raw IPv4 addresses to avoid slow handshakes, although the IPv4 examples themselves are still valid.
