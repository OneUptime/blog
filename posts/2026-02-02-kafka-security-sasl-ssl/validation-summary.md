# Validation Summary: How to Set Up Kafka Security (SASL/SSL)

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Apache Kafka (broker and client security)
- SASL authentication (PLAIN, SCRAM-SHA-256, SCRAM-SHA-512, GSSAPI/Kerberos)
- SSL/TLS encryption
- ACLs (Access Control Lists) via `AclAuthorizer`
- ZooKeeper (for SCRAM credential storage and SASL DIGEST-MD5 auth)
- JAAS (Java Authentication and Authorization Service)
- OpenSSL and Java `keytool` (for certificate/keystore generation)
- Java Kafka client API (producer and consumer)

## Sources Consulted
- Apache Kafka Documentation — Security: https://kafka.apache.org/documentation/#security
- Apache Kafka Documentation — SASL Configuration: https://kafka.apache.org/documentation/#security_sasl
- Apache Kafka Documentation — SSL: https://kafka.apache.org/documentation/#security_ssl
- Apache Kafka Documentation — Authorization and ACLs: https://kafka.apache.org/documentation/#security_authz
- Apache ZooKeeper — SASL DIGEST-MD5 authentication / `DigestLoginModule`: https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#sc_ZooKeeperAccessControl
- Apache Kafka `AclAuthorizer` class (`kafka.security.authorizer.AclAuthorizer`, KIP-504, introduced in Kafka 2.4)
- `kafka-configs.sh` reference for SCRAM credential creation
- `kafka-acls.sh` reference (`--bootstrap-server`, `--command-config`, `--allow-principal`, etc.)

## Issues Found

1. **JAAS `Client` section used the wrong login module for ZooKeeper authentication.**
   - **Original:** `org.apache.kafka.common.security.plain.PlainLoginModule`
   - **Problem:** `PlainLoginModule` is for SASL/PLAIN authentication against a Kafka broker — it is not valid for authenticating to ZooKeeper. ZooKeeper SASL authentication uses DIGEST-MD5 and expects ZooKeeper's own login module.
   - **Fix:** Replaced with `org.apache.zookeeper.server.auth.DigestLoginModule`, which is the correct module for the Kafka-side JAAS `Client` entry used when ZooKeeper requires authentication.

## Review Notes
- The `--zookeeper` flag on `kafka-configs.sh` is deprecated in newer Kafka releases (Kafka 2.5+ recommends `--bootstrap-server` for most operations). For initial SCRAM admin bootstrap on a ZooKeeper-based cluster it still works, and the post explicitly discusses ZooKeeper-stored SCRAM credentials, so the example is contextually valid but readers on Kafka 3.x should be aware that `--bootstrap-server` is the preferred path going forward.
- KRaft mode (ZooKeeper-less Kafka) is the default for newer Kafka releases. In KRaft mode, SCRAM credentials are stored in the metadata log rather than ZooKeeper. This guide is specifically for ZooKeeper-based deployments — that scope is implicit and could be made explicit in a future revision.
- `authorizer.class.name=kafka.security.authorizer.AclAuthorizer` is correct for Kafka 2.4+. The legacy `kafka.security.auth.SimpleAclAuthorizer` is removed in newer versions; the post uses the current class, which is good.
- The certificate-generation script uses interactive-style `keytool -genkey` with `-dname` and a single `-storepass` (no separate `-keypass`); modern `keytool` warns about the proprietary JKS format and recommends PKCS12 (`-storetype PKCS12`). Functional, but a PKCS12 keystore would be a nice modernization.
- `ssl.endpoint.identification.algorithm=https` enables hostname verification — recommended in production and correctly shown.
- The Java client examples use string literals for property keys (e.g. `"security.protocol"`). They could use `CommonClientConfigs`/`SaslConfigs`/`SslConfigs` constants instead, but the string form is valid and widely used.
