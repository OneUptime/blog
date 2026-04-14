# Validation Summary: How to Configure Kafka TLS for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (pub/sub component, sidecar architecture)
- Apache Kafka (broker SSL/TLS configuration)
- Kubernetes (secrets, component manifests)
- cert-manager (automated certificate lifecycle)
- OpenSSL (manual certificate generation)
- Java keytool (truststore/keystore management)
- SASL/SCRAM-SHA-512 (combined with TLS for defense-in-depth)

## Sources Consulted
- Dapr Kafka pub/sub component reference documentation (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/)
- Dapr secrets management and secretKeyRef documentation (https://docs.dapr.io/operations/components/component-secrets/)
- cert-manager Certificate resource documentation (https://cert-manager.io/docs/usage/certificate/)
- Apache Kafka SSL configuration documentation (https://kafka.apache.org/documentation/#security_ssl)
- OpenSSL command-line reference for certificate generation
- Cross-referenced with validated sibling posts: dapr-kafka-sasl-pubsub, dapr-secrets-tls-certificates, dapr-aiven-managed-services

## Issues Found
No technical issues found.

## Review Notes
- The Kafka broker `server.properties` example omits `advertised.listeners` and `security.inter.broker.protocol`, which would be needed in a multi-broker production setup. This is acceptable for a focused TLS tutorial but readers should be aware of the simplification.
- The `authType` field supports additional values beyond those shown (`oidc`, `certificate`, `awsiam`, `oidc_private_key_jwt`), but the post correctly covers the three most relevant to TLS: `none`, `mtls`, and `password`.
- The cert-manager `duration: 8760h` (1 year) and `renewBefore: 720h` (30 days) are reasonable defaults for client certificates.
- OpenSSL commands use RSA 4096-bit for the CA and 2048-bit for the client key, which are appropriate key sizes.
