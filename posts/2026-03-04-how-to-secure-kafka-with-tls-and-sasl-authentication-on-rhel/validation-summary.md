# Validation Summary: How to Secure Kafka with TLS and SASL Authentication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Apache Kafka
- KRaft mode
- TLS/SSL
- SASL/SCRAM-SHA-512
- OpenSSL
- Java keytool

## Sources Consulted
- Apache Kafka Security Overview: https://kafka.apache.org/42/security/security-overview/
- Apache Kafka Encryption and Authentication using SSL: https://kafka.apache.org/42/security/encryption-and-authentication-using-ssl/
- Apache Kafka Authentication using SASL: https://kafka.apache.org/42/security/authentication-using-sasl/
- Apache Kafka KRaft operations documentation: https://kafka.apache.org/42/operations/kraft/
- Apache Kafka KIP-900 for KRaft SCRAM bootstrap support: https://cwiki.apache.org/confluence/display/KAFKA/KIP-900%3A%2BKRaft%2Bkafka-storage.sh%2BAPI%2Badditions%2Bto%2Bsupport%2BSCRAM%2Bfor%2BKafka%2BBrokers
- OpenSSL x509 command documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- Oracle keytool documentation: https://docs.oracle.com/en/java/javase/11/tools/keytool.html

## Issues Found
- The broker certificate generation used only a common name that did not match the advertised hostname. Kafka enables hostname verification by default in modern versions, and Apache Kafka recommends using SANs. Updated the `keytool` commands to include `-ext SAN=DNS:your-hostname`, set the CN to `your-hostname`, and updated the OpenSSL signing command to copy CSR extensions into the signed certificate.
- The broker configuration enabled `SASL_SSL` but did not select it for inter-broker traffic. Added `inter.broker.listener.name=SASL_SSL` so broker-to-broker communication uses the secured listener.
- The SCRAM admin user was created with `kafka-configs.sh` against `localhost:9092`, but the shown KRaft configuration exposes only the secured listener on port 9093 and the inter-broker credential must exist before the broker starts. Replaced that command with `kafka-storage.sh format --add-scram` for a new KRaft cluster.
- The application user creation command targeted an unsecured/nonexistent `localhost:9092` listener and omitted authenticated admin client properties. Updated it to use `your-hostname:9093` with `--command-config /opt/kafka/admin-client.properties`.

## Review Notes
The tutorial remains a compact example and does not cover production hardening items such as certificate rotation, private key protection, ACLs, separate controller listener security, or how to build the referenced admin client properties file. The remaining examples are technically consistent with current Apache Kafka KRaft, TLS, and SASL/SCRAM documentation.
