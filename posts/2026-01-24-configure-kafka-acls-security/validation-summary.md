# Validation Summary: How to Configure Kafka ACLs for Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka ACLs
- Kafka authorization
- SASL/SCRAM authentication
- SSL/mTLS authentication
- Kafka CLI tools (`kafka-acls.sh`, `kafka-configs.sh`)
- Kafka Java AdminClient API
- Kafka Streams security ACLs

## Sources Consulted
- Apache Kafka 4.3 Authorization and ACLs documentation: https://kafka.apache.org/43/security/authorization-and-acls/
- Apache Kafka SASL authentication documentation: https://kafka.apache.org/41/security/authentication-using-sasl/
- Confluent Kafka Streams secure deployment documentation: https://docs.confluent.io/platform/current/streams/developer-guide/security.html
- Apache Kafka Java API / AdminClient and ACL classes: https://kafka.apache.org/0110/javadoc/org/apache/kafka/clients/admin/AdminClient.html and https://kafka.apache.org/31/javadoc/org/apache/kafka/common/acl/package-summary.html

## Issues Found
- The broker snippets used the legacy `kafka.security.authorizer.AclAuthorizer` class. Updated both snippets to `org.apache.kafka.metadata.authorizer.StandardAuthorizer`, which is the default authorizer class documented for current KRaft-based Kafka clusters.
- The topic-admin ACL example put `Delete`, `Alter`, and `Describe` permissions on the cluster resource. Split the example so `Create` remains on the cluster resource while `Delete`, `Alter`, and `Describe` are granted on topic resources.
- The service-account ACL command combined `Write` and `Read` operations with two topic resources in one command, which would grant both operations to both topics. Split it into separate commands so `Write` applies to `orders` and `Read` applies to `inventory`.
- The sensitive-topic example used `--deny-principal User:'*'` and then attempted to allow a specific user. A blanket deny rule would also deny that specific user. Replaced it with a least-privilege allow-only example for the authorized principal.

## Review Notes
The post is broadly accurate after the fixes. For production deployments, prefer encrypted listeners such as `SASL_SSL` or `SSL` over `SASL_PLAINTEXT`; the examples use plaintext SASL for simplicity.
