# Validation Summary: How to Secure Kafka with SASL and TLS on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Apache Kafka
- SASL authentication
- TLS encryption
- firewalld
- systemd
- SELinux

## Sources Consulted
- Apache Kafka Security documentation: https://kafka.apache.org/42/security/
- Apache Kafka Authentication using SASL documentation: https://kafka.apache.org/42/security/authentication-using-sasl/
- Apache Kafka SSL/TLS encryption and authentication documentation: https://kafka.apache.org/25/security/encryption-and-authentication-using-ssl/
- Apache Kafka Quickstart and CLI examples: https://kafka.apache.org/32/quickstart
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd

## Issues Found
- The post title and description promise a Kafka SASL and TLS setup, but the implementation uses generic placeholders such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>` instead of Kafka broker, client, SASL, TLS, keystore, truststore, listener, or JAAS configuration.
- The post does not configure Kafka SASL. Official Kafka documentation requires SASL-related broker/client properties such as `listeners` using `SASL_PLAINTEXT` or `SASL_SSL`, `security.inter.broker.protocol`, `sasl.enabled.mechanisms`, `sasl.mechanism.inter.broker.protocol`, and JAAS configuration for the chosen mechanism.
- The post does not configure Kafka TLS. Official Kafka documentation requires SSL/TLS properties such as keystore and truststore locations, passwords, types, and listener protocol mappings when TLS is enabled.
- The verification commands use `localhost:9092` without a client configuration file. That only works for an unsecured listener or a client that can connect without SASL/TLS; it does not verify the secured Kafka setup promised by the post.
- The claim that SASL and TLS are "mandatory for any production Kafka cluster" is too absolute. They are common production security controls, but Kafka deployments can use different production security models depending on environment and requirements.
- Because the post is mostly placeholder content and does not contain a salvageable Kafka SASL/TLS procedure, the README was not edited. Replacing it with a correct guide would require adding substantial new content and restructuring, which is outside the requested correction-only scope.

## Review Notes
This post should be removed or fully rewritten as a real Kafka security guide. A valid replacement should include Kafka version assumptions, broker configuration paths, certificate generation or certificate prerequisites, `SASL_SSL` listener configuration, JAAS or inline SASL configuration, client command configuration via `--command-config`, firewall ports matching the actual listener, and RHEL-specific service/package assumptions.
