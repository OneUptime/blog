# Validation Summary: How to Configure Kafka Security (SASL/SSL)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka security
- SSL/TLS encryption
- SASL/PLAIN authentication
- SASL/SCRAM authentication
- Kafka ACL authorization
- Java Kafka clients
- kafka-python
- KafkaJS
- OpenSSL and Java keytool
- Docker Compose with the official Apache Kafka image

## Sources Consulted
- Apache Kafka 3.7 SASL authentication documentation: https://kafka.apache.org/37/security/authentication-using-sasl/
- Apache Kafka 3.7 authorization and ACL documentation: https://kafka.apache.org/37/security/authorization-and-acls/
- Apache Kafka broker configuration documentation: https://kafka.apache.org/40/configuration/broker-configs/
- Apache Kafka Docker image documentation: https://hub.docker.com/r/apache/kafka
- KafkaJS client configuration documentation: https://kafka.js.org/docs/configuration
- kafka-python producer configuration documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaProducer.html

## Issues Found
- The generated broker certificate did not include `broker1` in the Subject Alternative Name list even though multiple broker and client examples connect to `broker1:9093`. Added `DNS.3 = broker1` so hostname verification can succeed.
- The SASL/SCRAM broker SSL configuration omitted `ssl.key.password`, while the SSL and SASL/PLAIN snippets included it and the generated keystore uses `broker-password`. Added the setting to the SCRAM snippet.
- The ACL examples granted access to `orders` and `order-processor`, but the client examples use `secure-topic` and `secure-group`. Updated the ACL topic and group names to match the client code.
- The admin command configuration referenced an `admin.truststore.jks` file and password that were not generated elsewhere in the guide. Updated it to use the generated client truststore path and password.
- The Docker Compose SSL keystore and truststore paths used `kafka.keystore.jks` and `kafka.truststore.jks`, but the certificate generation script creates `kafka-broker.keystore.jks` and `kafka-broker.truststore.jks` by default. Updated the Docker environment variables to match the generated filenames.

## Review Notes
The Kafka examples are version-sensitive: the Docker snippet pins `apache/kafka:3.7.0`, while the latest Kafka documentation has moved further into KRaft-only operation. The post remains technically usable as a focused security guide, but a future refresh should decide whether to target Kafka 3.7 specifically or update all snippets to a current Kafka 4.x baseline.
