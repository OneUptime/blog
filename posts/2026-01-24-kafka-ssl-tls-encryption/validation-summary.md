# Validation Summary: How to Configure Kafka SSL/TLS Encryption

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Apache Kafka SSL/TLS broker configuration
- Kafka Java producer and consumer clients
- confluent-kafka Python client
- Java keytool and JKS keystores
- OpenSSL certificate and TLS diagnostics
- ZooKeeper TLS configuration

## Sources Consulted
- Apache Kafka SSL documentation: https://kafka.apache.org/41/security/encryption-and-authentication-using-ssl/
- Apache Kafka listener configuration documentation: https://kafka.apache.org/40/security/listener-configuration/
- Apache Kafka generated broker configuration reference: https://kafka.apache.org/31/generated/kafka_config.html
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- librdkafka configuration reference: https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md
- Apache ZooKeeper Administrator's Guide: https://zookeeper.apache.org/doc/r3.7.1/zookeeperAdmin.html
- Confluent ZooKeeper security documentation: https://docs.confluent.io/platform/7.5/security/zk-security.html
- Oracle keytool command documentation: https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html
- OpenSSL s_client documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/

## Issues Found
- The basic broker SSL example set both `security.inter.broker.protocol` and `inter.broker.listener.name`. Kafka's broker configuration treats setting both at the same time as an error. Removed `security.inter.broker.protocol=SSL` from that example and kept `inter.broker.listener.name=SSL`.
- The OpenSSL debug script did not support brokers configured with `ssl.client.auth=required`, so the handshake could fail before useful diagnostics were shown. Added optional `CLIENT_CERT`, `CLIENT_KEY`, and `CLIENT_CA` inputs and applied them to the `openssl s_client` commands.
- The certificate rotation example generated a second key alias and suggested `ssl.keystore.alias`, which is not a generally available Kafka broker configuration in the referenced Kafka docs. Reworked the script to build a fresh keystore using the configured broker alias, import the CA and signed certificate, replace the keystore file, and use a rolling restart.
- The rotation diagram still described keeping and removing an old certificate alias after the script was corrected. Updated it to describe backing up the old keystore and retaining the backup for rollback.

## Review Notes
- The post uses JKS throughout, which is still supported, but current Kafka documentation notes that PKCS12 is the default keystore format in Java 9 and later and is generally preferred for new deployments.
- The ZooKeeper section is relevant only for ZooKeeper-based Kafka clusters. KRaft-based deployments should secure controller and broker listeners instead.
