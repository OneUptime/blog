# Validation Summary: Configuring ActiveMQ TLS and Mutual Authentication Without Certificate or Hostname Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Apache ActiveMQ Classic
- OpenWire SSL transport
- TLS and mutual TLS (mTLS)
- Java Secure Socket Extension (JSSE)
- Java key stores and trust stores
- PKCS#12
- Java `keytool`
- OpenSSL `s_client`
- JAAS authentication and ActiveMQ authorization

## Sources Consulted

- [ActiveMQ Classic SSL transport reference](https://activemq.apache.org/components/classic/documentation/ssl-transport-reference)
- [How to use SSL with ActiveMQ Classic](https://activemq.apache.org/components/classic/documentation/how-do-i-use-ssl)
- [ActiveMQ Classic security](https://activemq.apache.org/components/classic/documentation/security)
- [ActiveMQ Classic `SpringSslContext` source](https://github.com/apache/activemq/blob/main/activemq-spring/src/main/java/org/apache/activemq/spring/SpringSslContext.java)
- [ActiveMQ Classic `ActiveMQSslConnectionFactory` source](https://github.com/apache/activemq/blob/main/activemq-client/src/main/java/org/apache/activemq/ActiveMQSslConnectionFactory.java)
- [Java Secure Socket Extension reference guide](https://docs.oracle.com/en/java/javase/21/security/java-secure-socket-extension-jsse-reference-guide.html)
- [Java `keytool` reference](https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html)
- [OpenSSL `s_client` reference](https://docs.openssl.org/3.6/man1/openssl-s_client/)
- [RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)
- [RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html)

## Issues Found

- The broker and client examples used `.p12` stores without explicitly selecting PKCS#12. ActiveMQ Classic's broker-side `SpringSslContext` defaults both store types to JKS, while `ActiveMQSslConnectionFactory` uses the JVM default. Added `keyStoreType="PKCS12"` and `trustStoreType="PKCS12"` to the broker configuration and the corresponding setter calls to the Java client so the examples do not depend on JVM-specific defaults or compatibility behavior.
- The certificate-chain guidance implied that trust stores should contain an entire issuing chain and that peers should send a complete chain including the trust anchor. Revised the wording to distinguish locally configured trust anchors from the leaf and required intermediate certificates supplied by the broker or client. TLS trust anchors are configured independently and may be omitted from the transmitted chain.
- The OpenSSL diagnostic description said the command confirmed the presented chain. OpenSSL documents that `-showcerts` displays the certificate list exactly as sent and that it is not a verified chain. Clarified that the command sends SNI and displays the list but does not by itself verify the chain or hostname.

## Review Notes

- The ActiveMQ Classic client-side hostname-verification statement is accurate: the feature is enabled by default starting with version 5.15.6.
- The `keytool` and JSSE debug command syntax is current and valid.
- The example intentionally leaves the application's JMS authentication method unspecified. Mutual TLS validates the TLS peer, but destination access still depends on the broker's configured authentication, certificate mapping, and authorization plugins.
