# How to Add Mutual TLS and Certificate-Based Authentication to Apache Geode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Mutual TLS, Certificate Authentication, SSL/TLS, Security

Description: Configure Geode components for mutual TLS, hostname verification, certificate rotation, and certificate-backed principals enforced by integrated security.

---

Securing Apache Geode with certificates involves two related layers:

1. **Mutual TLS (mTLS)** encrypts a socket and requires both endpoints to prove possession of a private key whose certificate is trusted.
2. **Geode integrated security** maps application credentials to a principal and authorizes that principal for data and cluster operations.

mTLS does not automatically grant a certificate subject Geode permissions. Conversely, a `SecurityManager` does not encrypt traffic. Use both when the requirement is “only approved certificate holders can connect, and each identity can perform only approved Geode operations.”

## Inventory Every Geode Communication Channel

`ssl-enabled-components` accepts `cluster`, `locator`, `server`, `gateway`, `jmx`, `web`, or `all`:

| Component | Protected traffic |
| --- | --- |
| `cluster` | Peer-to-peer member traffic |
| `locator` | Locator-to-locator and processes connecting to locators |
| `server` | Java/native client-to-server traffic |
| `gateway` | WAN gateway sender-to-receiver traffic |
| `jmx` | JMX and `gfsh` management traffic |
| `web` | Developer REST, Management REST, and hosted web applications |

Enabling a component affects both its listening and connecting side. If `locator` uses TLS, every server and client talking to that locator must also enable locator TLS and trust its certificate. A partial rollout that enables only the listener usually appears as an SSL/plaintext handshake failure, not a graceful compatibility mode.

For a fully secured cluster, start with `all`. If a deployment intentionally exposes only client/server TLS while peer traffic stays on a separately protected network, configure the exact component list and document the residual plaintext paths.

## Issue Certificates with the Correct Identities

Use an organizational CA or a dedicated internal CA, not one shared self-signed key copied to every process. Give each process or workload its own private key and certificate. At minimum:

- put every DNS name or IP address used to connect to the process in its subject alternative name (SAN);
- include both TLS server- and client-authentication usages for Geode members that accept and initiate TLS connections, and client-authentication usage for client-only workloads;
- use a currently approved key algorithm and size;
- keep the private key readable only by the Geode process owner; and
- put only intended public trust material, never private keys, in truststores.

Endpoint identification validates the hostname used by a client against the peer certificate. If clients connect to `locator-a.example.net`, a certificate containing only `CN=locator-a` is not sufficient for modern hostname verification; include `DNS:locator-a.example.net` in the SAN.

Store private key plus certificate chain in a Java-supported keystore such as PKCS#12. Store trusted issuer certificates in a truststore. Inspect them before deployment:

```text
keytool -list -v -storetype PKCS12 -keystore /etc/geode/tls/server-a.p12
keytool -list -v -storetype PKCS12 -keystore /etc/geode/tls/geode-trust.p12
```

Do not put a private key in a truststore, and do not use a public truststore as evidence that every publicly issued certificate should be allowed to join a private cluster. Put only the intended internal CA certificates or deliberately pinned public leaf certificates in it.

## Configure mTLS on Locators and Servers

Place provider-specific SSL settings in a restricted `gfsecurity.properties` file. A full-component configuration looks like:

```properties
ssl-enabled-components=all
ssl-require-authentication=true
ssl-web-require-authentication=true
ssl-endpoint-identification-enabled=true
ssl-protocols=TLSv1.3,TLSv1.2
ssl-ciphers=any

ssl-keystore=/etc/geode/tls/server-a.p12
ssl-keystore-type=PKCS12
ssl-keystore-password=replace-with-protected-value

ssl-truststore=/etc/geode/tls/geode-trust.p12
ssl-truststore-type=PKCS12
ssl-truststore-password=replace-with-protected-value
```

`ssl-require-authentication` requires two-way TLS for all enabled components except `web`; `ssl-web-require-authentication` controls web-client certificates separately. The latter is the current Geode 2.0 property name; `ssl-http-require-authentication` is not a Geode 2.0 configuration key. The non-web mTLS default is true, but set it explicitly so intent survives review. The web mTLS default is false.

The example shows literal password slots because Java property files do not automatically expand shell placeholders. Supply real secrets through a protected `gfsecurity.properties`, locked-down process injection, or Geode's `ssl-use-default-context` integration with a deliberately configured JSSE context. Never commit keystore passwords with application configuration.

Start the first locator with the TLS files:

```text
gfsh> start locator --name=locator-a \
  --properties-file=/etc/geode/gemfire.properties \
  --security-properties-file=/etc/geode/gfsecurity.properties
```

Start servers with their own keystore and the shared approved trust policy:

```text
gfsh> start server --name=server-a \
  --properties-file=/etc/geode/gemfire.properties \
  --security-properties-file=/etc/geode/gfsecurity.properties
```

Each member both accepts and initiates connections, so each needs a private-key entry and a truststore when mTLS is enabled. If one PKCS#12 file contains several key aliases, configure the default or component-specific alias deliberately; relying on whichever entry the provider chooses first makes rotation unpredictable.

## Configure Java Clients and `gfsh`

A Java client that discovers servers through TLS-enabled locators needs TLS for both `locator` and `server`:

```java
Properties properties = new Properties();
properties.setProperty("ssl-enabled-components", "locator,server");
properties.setProperty("ssl-require-authentication", "true");
properties.setProperty("ssl-endpoint-identification-enabled", "true");
properties.setProperty("ssl-protocols", "TLSv1.3,TLSv1.2");
properties.setProperty("ssl-keystore", "/etc/app/tls/orders-client.p12");
properties.setProperty("ssl-keystore-type", "PKCS12");
properties.setProperty("ssl-keystore-password", keyStorePassword);
properties.setProperty("ssl-truststore", "/etc/app/tls/geode-trust.p12");
properties.setProperty("ssl-truststore-type", "PKCS12");
properties.setProperty("ssl-truststore-password", trustStorePassword);

ClientCache cache = new ClientCacheFactory(properties)
    .addPoolLocator("locator-a.example.net", 10334)
    .create();
```

Do not place passwords directly in source as the sample variable names might imply; retrieve them from the deployment's secret facility.

Connect `gfsh` with its own client certificate:

```text
gfsh> connect --locator=locator-a.example.net[10334] \
  --use-ssl \
  --security-properties-file=/etc/geode/gfsh-security.properties
```

For JMX manager connections, enable the `jmx` component and ensure the management client certificate is trusted. For WAN replication, enable `gateway` on sender and receiver members. For REST HTTPS, enable `web`; require client certificates with `ssl-web-require-authentication=true` if mTLS is intended.

## Understand What the TLS Certificate Authenticates

At the TLS layer, a truststore answers “may a certificate chained to this issuer establish this socket?” That may be enough for a small cluster-wide trust boundary, but it does not automatically create per-certificate Geode roles.

When a Geode `security-manager` is configured, the connector also submits Geode credentials. `SecurityManager.authenticate(Properties)` returns the application principal, and `authorize(principal, permission)` decides whether it can read a region, write a key, deploy code, or issue a management command.

The TLS peer certificate is not a documented implicit replacement for those credential properties. In particular:

- a Java client with a valid mTLS certificate may still need a Geode username/password or token;
- `gfsh` may still prompt for integrated-security credentials; and
- a REST request still needs the authentication header expected by the configured `SecurityManager`, even when HTTPS required a client certificate.

Keep those layers explicit in tests and runbooks.

## Build a Certificate-Backed Geode Principal Safely

Geode's `AuthInitialize` can produce arbitrary credential properties, including a token or certificate-oriented credential, and `SecurityManager.authenticate` validates them. A robust design uses a short-lived, certificate-backed assertion:

1. The workload authenticates to an internal identity issuer with its client certificate.
2. The issuer returns a short-lived signed token containing the certificate identity, audience, expiry, and roles or claims.
3. `AuthInitialize` places that token in `security-token` for client or peer connections.
4. `SecurityManager` verifies issuer, signature, audience, expiry, and revocation policy, then returns a minimal, serializable principal.
5. `authorize` maps that principal to Geode `ResourcePermission` values.

This avoids sending a private key through Geode and avoids treating possession of someone else's public certificate as authentication. It also gives practical expiry and revocation semantics.

The Geode integration seam is small:

```java
public final class CertificateTokenAuthInitialize implements AuthInitialize {
  private final CertificateTokenProvider tokens;

  private CertificateTokenAuthInitialize(CertificateTokenProvider tokens) {
    this.tokens = tokens;
  }

  public static CertificateTokenAuthInitialize create() {
    return new CertificateTokenAuthInitialize(
        CertificateTokenProvider.fromProtectedConfiguration());
  }

  @Override
  public Properties getCredentials(
      Properties securityProperties,
      DistributedMember target,
      boolean isPeer) {
    String audience = target == null ? "geode" : target.getId();

    Properties credentials = new Properties();
    credentials.setProperty(
        org.apache.geode.security.SecurityManager.TOKEN,
        tokens.issueFor(audience, isPeer));
    return credentials;
  }
}
```

And the server-side boundary:

```java
public final class CertificateSecurityManager
    implements org.apache.geode.security.SecurityManager {
  private CertificateTokenVerifier verifier;
  private PermissionPolicy permissions;

  @Override
  public void init(Properties securityProperties) {
    verifier = CertificateTokenVerifier.from(securityProperties);
    permissions = PermissionPolicy.from(securityProperties);
  }

  @Override
  public Object authenticate(Properties credentials) {
    String token = credentials.getProperty(TOKEN);
    return verifier.verifyAndCreatePrincipal(token);
  }

  @Override
  public boolean authorize(Object principal, ResourcePermission permission) {
    return permissions.allows((CertificatePrincipal) principal, permission);
  }
}
```

The omitted issuer, cryptography, trust-chain validation, replay defense, and policy code are security-critical. Use an established token format and reviewed identity library rather than inventing a signature scheme from this skeleton.

Deploy the classes and configure:

```properties
security-manager=com.acme.geode.CertificateSecurityManager
security-client-auth-init=com.acme.geode.CertificateTokenAuthInitialize.create
security-peer-auth-init=com.acme.geode.CertificateTokenAuthInitialize.create
```

The first locator propagates the `security-manager` setting to later members when configured correctly. Keep peer credentials suitable for long-lived cluster operation; if the manager supports reauthentication of expiring client credentials, it must also support the non-expiring or appropriately renewable credentials used by cluster members.

An alternative is a custom `AuthInitialize` that sends a certificate plus a signed, short-lived challenge structure and a `SecurityManager` that verifies it. That design needs careful replay and audience handling and should be independently security-reviewed.

## Grant Permissions to Certificate Principals

Return a principal containing a stable identifier, such as an approved URI SAN or issuer-plus-serial mapping. Do not authorize from a display-name CN alone; names can collide and certificate reissuance can change representation.

Use least privilege. For example:

```text
spiffe://example.net/workload/orders-reader
  -> DATA:READ:orders

spiffe://example.net/workload/orders-writer
  -> DATA:READ:orders
  -> DATA:WRITE:orders

spiffe://example.net/admin/geode-operator
  -> reviewed CLUSTER and DATA management permissions
```

Make `authorize` deny by default and log principal, requested permission, decision, and trace identifier without logging credentials or tokens. Test client/server operations, CQ creation, functions, `gfsh`, REST, and WAN separately because they request different permissions.

## Rotate Certificates Without Breaking the Cluster

Use an overlap rollout:

1. Add the new CA or issuing chain to every truststore while retaining the old one.
2. Verify old certificates still connect and new test certificates now validate.
3. Roll out new private keys and certificates process by process.
4. Confirm SAN hostname verification, component aliases, and integrated-security principal mapping.
5. Remove the old CA only after no old certificate remains and rollback is no longer required.

If authorization keys principals by issuer and serial, certificate renewal changes identity unless policy maps both old and new certificates to the same workload identity during overlap. A stable URI SAN or issuer-managed subject claim simplifies rotation.

Geode processes generally read keystores during initialization; plan a controlled restart unless the deployed version and provider have a specifically tested reload mechanism. Monitor expiry well before the maintenance window.

## Troubleshoot Handshakes in Layers

Common failures map to distinct causes:

| Symptom | Check |
| --- | --- |
| `unknown_ca` or trust-path failure | Correct CA chain in the receiving side's truststore |
| `bad_certificate` / no suitable certificate | Client key entry, client-auth usage, alias, and `ssl-require-authentication` |
| Hostname verification failure | Connection hostname and certificate SAN |
| Protocol or cipher mismatch | Intersection of enabled JSSE protocols/ciphers on both ends |
| TLS succeeds, `AuthenticationRequiredException` follows | Geode `AuthInitialize` credentials or token missing |
| `NotAuthorizedException` | Principal authenticated but lacks the requested `ResourcePermission` |
| One server fails after client discovery | That server's certificate, advertised hostname, or truststore differs |
| REST works with a certificate but returns 401/403 | HTTP integrated-security header/token is still required or unauthorized |

Test each exposed endpoint with the intended hostname and both positive and negative certificates. A good negative suite proves that an untrusted CA, expired certificate, wrong SAN, revoked identity, wrong token audience, and underprivileged principal all fail at the expected layer.

## Conclusion

Use mTLS to authenticate sockets and encrypt every selected Geode channel, then use integrated security to authenticate a certificate-backed application principal and enforce least privilege. Correct SANs, endpoint identification, explicit web-client authentication, separate key and trust material, and an overlap rotation plan turn certificates into an operable security boundary instead of a one-time handshake setting.

## Official References

- [Configuring SSL in Apache Geode](https://geode.apache.org/docs/guide/latest/managing/security/implementing_ssl.html)
- [SSL sample implementation](https://geode.apache.org/docs/guide/latest/managing/security/ssl_example.html)
- [Geode security property reference](https://geode.apache.org/docs/guide/latest/reference/topics/gemfire_properties.html)
- [Geode 2.0.0 source: web mTLS configuration key](https://github.com/apache/geode/blob/ada321925c721b3514341c1ffba325ab162d1d0a/geode-core/src/main/java/org/apache/geode/distributed/ConfigurationProperties.java#L2194-L2203)
- [Implementing authentication](https://geode.apache.org/docs/guide/latest/managing/security/implementing_authentication.html)
- [Implementing authorization](https://geode.apache.org/docs/guide/latest/managing/security/implementing_authorization.html)
- [Enabling integrated security](https://geode.apache.org/docs/guide/latest/managing/security/enable_security.html)
- [`AuthInitialize` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/security/AuthInitialize.html)
- [`SecurityManager` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/security/SecurityManager.html)
