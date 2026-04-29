# Validation Summary: How to Configure Kafka SSL/TLS Listeners for IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka broker and client SSL/TLS configuration
- Java `keytool` keystores and truststores
- OpenSSL certificate generation and signing
- Java `.properties` configuration files

## Sources Consulted
- Apache Kafka 4.0 Listener Configuration — https://kafka.apache.org/40/security/listener-configuration/
- Apache Kafka 4.2 Broker Configs — https://kafka.apache.org/42/configuration/broker-configs/
- Apache Kafka 4.2 Consumer Configs — https://kafka.apache.org/42/configuration/consumer-configs/
- Apache Kafka 4.2 Upgrade Notes — https://kafka.apache.org/42/getting-started/upgrade/
- Apache Kafka 3.9 Encryption and Authentication using SSL — https://kafka.apache.org/39/security/encryption-and-authentication-using-ssl/
- Apache Kafka 2.5 Producer Configs — https://kafka.apache.org/25/generated/producer_config.html
- Oracle JDK `keytool` manual — https://docs.oracle.com/en/java/javase/25/docs/specs/man/keytool.html
- Java `java.util.Properties` documentation — https://docs.oracle.com/en/java/javase/20/docs/api/java.base/java/util/Properties.html
- OpenSSL `openssl-x509` manual — https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL `openssl-req` manual — https://docs.openssl.org/3.3/man1/openssl-req/

## Issues Found
1. **The broker certificate example was incomplete for IPv4 hostname verification.** Kafka enables server hostname verification by default for modern clients and broker-to-broker SSL, and an IP-based connection should be covered by a SAN IP entry rather than relying on CN alone. I added `-ext SAN=IP:10.0.0.1` to the keystore and CSR steps and updated the OpenSSL signing command to copy CSR extensions into the signed certificate.

2. **The keystore commands were not internally consistent on current Java versions.** The post used `.jks` filenames and Kafka’s JKS defaults, but the `keytool` commands did not explicitly set `-storetype JKS`, which can produce a different store type on modern JDKs. I added `-storetype JKS` to the relevant `keytool` commands and made the broker/client config explicitly declare `ssl.keystore.type=JKS` and `ssl.truststore.type=JKS`.

3. **The post used older `keytool` subcommands in examples.** I updated `-genkey` to `-genkeypair` and `-import` to `-importcert` to match current documented `keytool` usage while keeping the original workflow intact.

4. **Two `.properties` examples had inline `#` comments on the same line as property assignments.** In Java properties syntax, comment markers are only comments when they begin a logical line; otherwise the text becomes part of the property value. I moved those comments onto separate lines so the examples parse correctly.

5. **The console tool examples used deprecated config-file flags.** Kafka 4.2 deprecates `--producer.config` and `--consumer.config` in favor of `--command-config`. I updated both commands accordingly.

6. **The TLS 1.3 statement was too absolute.** Kafka can use TLS 1.3, but actual availability depends on the JVM. I adjusted the wording in the introduction and conclusion to reflect that dependency.

## Review Notes
- The post intentionally stays with JKS. That is technically valid, but Kafka also supports `PKCS12` and modern Java uses PKCS12 by default; PKCS12 would be a reasonable future improvement for a more current-by-default tutorial.
- `advertised.listeners` only advertises the SSL listener. That is fine for the SSL workflow shown here, but if readers expect plaintext clients to use broker metadata for subsequent connections, they would also need a matching advertised PLAINTEXT listener.
- The examples assume a single broker at `10.0.0.1`. In a real cluster, each broker should have its own certificate and SAN entries for the address clients and peer brokers actually use.
