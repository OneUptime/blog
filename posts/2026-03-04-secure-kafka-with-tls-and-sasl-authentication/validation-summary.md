# Validation Summary: How to Secure Kafka with TLS and SASL Authentication on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache Kafka
- TLS/SSL
- SASL/PLAIN
- Java keytool
- OpenSSL
- systemd

## Sources Consulted
- Apache Kafka 4.2 documentation, Encryption and Authentication using SSL: https://kafka.apache.org/42/security/encryption-and-authentication-using-ssl/
- Apache Kafka 4.2 documentation, Authentication using SASL: https://kafka.apache.org/42/security/authentication-using-sasl/
- Apache Kafka 4.2 documentation, Broker Configs: https://kafka.apache.org/42/configuration/broker-configs/
- systemd.exec manual, service environment configuration: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Local OpenSSL help output for `openssl x509 -copy_extensions`

## Issues Found
- The broker certificate used `CN=kafka-broker` while the test command connected to `localhost`. Kafka enables hostname verification for clients and inter-broker connections by default, so the test could fail. Changed the certificate subject to `CN=localhost`, added a `SAN=DNS:localhost` extension, and preserved CSR extensions when signing the certificate.
- The keystore and truststore examples used `.jks` paths without explicitly controlling the store type. Current Kafka documentation notes PKCS12 as the preferred/default Java keystore format. Updated the examples to use `.p12` files and set `ssl.keystore.type=PKCS12` and `ssl.truststore.type=PKCS12`.
- The TLS configuration set `ssl.client.auth=required`, but the SASL/PLAIN client configuration did not provide a client certificate. This would require mutual TLS in addition to SASL and make the provided client test fail. Changed the example to `ssl.client.auth=none`, matching the article's stated goal of TLS encryption with SASL client authentication.
- The post configured both an `SSL` listener and a `SASL_SSL` listener in separate snippets with conflicting `security.inter.broker.protocol` values. Updated the broker example to use a single `SASL_SSL` listener and removed the duplicate conflicting settings.
- The client truststore path referenced a file that was not created by the tutorial. Added a client truststore creation command and updated the client properties to point to it.
- The JAAS setup used an interactive `export KAFKA_OPTS=...` before restarting a systemd-managed service. That environment would not reliably apply to the restarted broker. Updated the instruction to set `KAFKA_OPTS` in a systemd service override.

## Review Notes
The tutorial remains a simplified local example. For production, SASL/PLAIN should only be used over TLS and secrets should be externalized or managed through a secure secret mechanism; SASL/SCRAM is a stronger default for password-based Kafka authentication.
