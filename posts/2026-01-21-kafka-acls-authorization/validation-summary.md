# Validation Summary: How to Set Up Kafka ACLs for Authorization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka ACLs
- Kafka authorization
- Kafka ACL CLI (`kafka-acls.sh`)
- Kafka AdminClient Java API
- Kafka Streams ACL patterns
- Kafka Connect ACL patterns

## Sources Consulted
- Apache Kafka 4.3 Authorization and ACLs: https://kafka.apache.org/43/security/authorization-and-acls/
- Apache Kafka 4.3 `DescribeAclsResult` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/admin/DescribeAclsResult.html
- Confluent Platform ACL management documentation: https://docs.confluent.io/platform/current/security/authorization/acls/manage-acls.html
- Confluent Platform Kafka Streams security documentation: https://docs.confluent.io/platform/current/streams/developer-guide/security.html
- Confluent Platform Kafka Connect security documentation: https://docs.confluent.io/platform/current/connect/security.html

## Issues Found
- The authorizer configuration used `kafka.security.authorizer.AclAuthorizer`, which is not the current default authorizer class for KRaft-based Kafka clusters. Changed it to `org.apache.kafka.metadata.authorizer.StandardAuthorizer`, matching current Apache Kafka documentation.
- The transactional producer ACL example used `--bootstrap-server admin:9092`, unlike the rest of the local examples, and granted only `Write` on the transactional ID. Changed the host to `localhost:9092` and added `Describe`, because transactional producers require `Describe` and `Write` on the configured `transactional.id`.
- The remove example claimed to remove all ACLs for a principal with `--remove --principal User:old-service`. Apache Kafka documents `--principal` for listing ACLs, while removal requires ACL filters such as resource, operation, and allowed or denied principal. Replaced it with a valid topic producer ACL removal example.
- The Kafka Streams examples granted only `Read` for the input topic and only `Write` for the output topic. Added `Describe` to both topic ACLs to align with Kafka's documented consumer and producer convenience ACL behavior.

## Review Notes
The Java AdminClient example uses current ACL classes and the documented `describeAcls(...).values()` result API. Some examples intentionally use broad `All` permissions for framework-managed resources such as Streams internal topics and Connect internal topics; these are common tutorial shortcuts, but production deployments should narrow them where possible.
