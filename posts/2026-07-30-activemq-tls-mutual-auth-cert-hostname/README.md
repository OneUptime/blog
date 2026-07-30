# Configuring ActiveMQ TLS and Mutual Authentication Without Certificate or Hostname Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, ActiveMQ Classic, TLS, Mutual TLS, Certificates

Description: Configure ActiveMQ Classic server and client key stores for TLS or mutual TLS, then diagnose trust, identity, hostname, and protocol failures separately.

---

ActiveMQ Classic TLS has four independent checks:

1. the client trusts the certificate chain presented by the broker;
2. the certificate identity matches the hostname in the broker URI;
3. when mutual TLS is enabled, the broker trusts the client's certificate chain;
4. authentication and authorization allow the resulting connection to use destinations.

Collapsing them into “an SSL error” leads to unsafe workarounds such as disabling hostname verification or importing arbitrary leaf certificates.

This article covers the Classic `ssl://` OpenWire transport. AMQP, MQTT, NIO, and Artemis use related but distinct connector syntax.

## Assign each store one job

| Store | Contains | Used to |
|---|---|---|
| Broker key store | Broker private key plus full certificate chain | Prove broker identity |
| Client trust store | CA certificates that issue broker certificates | Verify broker |
| Client key store | Client private key plus full certificate chain | Prove client identity for mTLS |
| Broker trust store | CA certificates that issue client certificates | Verify client for mTLS |

A key store entry needs the private key, not just a public certificate. A trust store normally contains issuing CA certificates rather than every individual peer certificate. Protect private keys and passwords with filesystem permissions and a secret manager; never commit them with `activemq.xml`.

## Issue a broker certificate for the URI hostname

If clients connect to:

```text
ssl://mq.internal.example:61617
```

the broker certificate must contain `mq.internal.example` in its Subject Alternative Name. A certificate for a node's short name, IP address, load-balancer backend, or unrelated wildcard will fail hostname verification.

Decide the stable client-facing names before requesting the certificate. Include every supported DNS name only when policy permits. Prefer a DNS name over connecting by changing IP addresses.

Inspect a store before deploying it:

```bash
keytool -list -v \
  -keystore broker.p12 \
  -storetype PKCS12
```

Confirm alias, entry type, expiry, SANs, key algorithm, and the complete leaf-to-intermediate chain.

## Configure the Classic broker TLS context

A broker-scoped Spring SSL context avoids applying global JVM settings to unrelated TLS clients in the same process:

```xml
<sslContext>
  <sslContext
      keyStore="file:${activemq.conf}/broker.p12"
      keyStorePassword="${broker.keystore.password}"
      trustStore="file:${activemq.conf}/broker-trust.p12"
      trustStorePassword="${broker.truststore.password}"/>
</sslContext>

<transportConnectors>
  <transportConnector
      name="openwire+ssl"
      uri="ssl://0.0.0.0:61617?transport.needClientAuth=true"/>
</transportConnectors>
```

The exact placeholder mechanism depends on the distribution and configuration loader. Verify secret expansion without printing passwords.

Set `transport.needClientAuth=true` only when every client is provisioned with a usable certificate and the broker trust store contains the issuing CA chain. For one-way TLS, clients still need a trust store, but not a client key store.

The Classic distribution ships dummy stores for examples. Replace or remove them so an example credential cannot be selected accidentally.

## Configure a native Classic client

```java
ActiveMQSslConnectionFactory factory =
    new ActiveMQSslConnectionFactory(
        "ssl://mq.internal.example:61617");

factory.setTrustStore("/run/secrets/client-trust.p12");
factory.setTrustStorePassword(System.getenv("CLIENT_TRUSTSTORE_PASSWORD"));

// Required only when the broker requests client authentication.
factory.setKeyStore("/run/secrets/client.p12");
factory.setKeyStorePassword(System.getenv("CLIENT_KEYSTORE_PASSWORD"));
```

Use the store types and methods supported by the deployed Classic client. Some applications instead set `javax.net.ssl.*` JVM properties, which affect the whole JVM. Avoid mixing both approaches unless precedence has been tested.

Keep hostname verification enabled. Classic documents client-side hostname verification as enabled by default from 5.15.6. Disabling it converts an identity check into encryption with an unverified peer and should be limited to a tightly controlled diagnostic, never a production fix.

## Diagnose by handshake stage

### The port is unreachable

Symptoms: timeout, connection refused, or immediate proxy reset.

Check listener binding, container port mapping, firewall, load balancer, DNS, and whether a non-TLS health check is speaking plain TCP/OpenWire to the TLS port.

### The client does not trust the broker

Typical Java errors include `PKIX path building failed` or `unable to find valid certification path`.

Check:

- client trust store actually loaded;
- correct password and store type;
- issuing root and intermediates present;
- broker sends the full certificate chain;
- certificate validity and system clock.

Do not import the certificate returned by an unverified connection blindly. Obtain the CA chain through a trusted channel and verify fingerprints.

### The hostname does not match

Errors mention hostname or subject alternative names. Connect using a SAN listed in the certificate or reissue the certificate for the intended service name. Do not “fix” this by connecting to a different untrusted alias or setting `verifyHostName=false`.

### The broker rejects the client certificate

With `needClientAuth=true`, check that:

- the client key store contains a `PrivateKeyEntry`;
- it includes the leaf and intermediate certificates;
- the broker trust store contains the client issuer;
- the client certificate is valid for client authentication;
- algorithms and TLS versions overlap;
- revocation policy is reachable and correct if enabled.

### TLS succeeds but JMS access fails

A trusted certificate does not automatically grant queue permissions. Inspect Classic authentication plugins, certificate-principal mapping, JAAS configuration, and authorization entries. A valid TLS peer can still receive a JMS security exception.

## Use diagnostics without leaking secrets

From a controlled host:

```bash
openssl s_client \
  -connect mq.internal.example:61617 \
  -servername mq.internal.example \
  -showcerts
```

This confirms the presented chain and SNI path; it does not complete an OpenWire protocol test. For mTLS, use a dedicated non-production diagnostic credential and protect its key.

Java can emit handshake detail with:

```text
-Djavax.net.debug=ssl,handshake
```

Enable it briefly. Debug logs can expose certificate details, peer names, and other sensitive metadata, and their volume can be substantial.

## Plan rotation as an overlap

A safe certificate rotation usually:

1. adds the new issuing CA to trust stores;
2. deploys and verifies updated trust stores;
3. rotates leaf certificates and private keys;
4. confirms clients use the new chain;
5. removes the old CA only after every peer has migrated.

Test broker reload or restart requirements for the exact Classic version. Alert on certificate expiry from the certificate source, not only after a broker handshake fails.

## Official Documentation

- [ActiveMQ Classic SSL transport reference](https://activemq.apache.org/components/classic/documentation/ssl-transport-reference)
- [How to use SSL with ActiveMQ Classic](https://activemq.apache.org/components/classic/documentation/how-do-i-use-ssl)
- [ActiveMQ Classic security](https://activemq.apache.org/components/classic/documentation/security)
- [Java Secure Socket Extension reference guide](https://docs.oracle.com/en/java/javase/21/security/java-secure-socket-extension-jsse-reference-guide.html)
- [Java `keytool` reference](https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html)
