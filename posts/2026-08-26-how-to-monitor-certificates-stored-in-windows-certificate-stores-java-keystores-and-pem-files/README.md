# How to Monitor Certificates Stored in Windows Certificate Stores, Java Keystores, and PEM Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, Windows, Java, Keystore, PEM

Description: Inventory and monitor certificate expiry and identity across Windows certificate stores, Java keystores, and PEM files while confirming what services actually serve.

---

Not every certificate is discoverable through a network probe. Services can be dormant, firewalled, activated only for particular SNI names, or waiting for a future deployment. Stored-certificate monitoring provides the control-plane view that black-box checks cannot.

The reverse is also true: a fresh file or keystore entry does not prove that a running process loaded it. A complete design always compares two views:

1. **stored state** — the certificate in a Windows store, Java keystore, PEM file, secret manager, or deployment artifact;
2. **served state** — the leaf and chain returned by the live TLS endpoint.

Inventory both by fingerprint, issuer plus serial, SANs, key identity, validity, location, and owner.

## Use a Common Inventory Schema

Normalize platform-specific results into fields such as:

- asset and service owner;
- host, store type, store path, and alias or thumbprint;
- certificate role: leaf, intermediate, trust anchor, client certificate, or signing certificate;
- subject and DNS SANs;
- issuer and serial number;
- SHA-256 certificate fingerprint;
- SPKI SHA-256 hash;
- `notBefore`, `notAfter`, and collection time in UTC;
- whether a private key is associated, without exporting that key;
- expected endpoint and SNI, when the certificate should be served.

Do not treat every trust anchor as an expiring service certificate. Root certificates in Windows `Root` or Java `cacerts` stores have a different lifecycle and ownership model from leaf entries with private keys.

## Windows Certificate Stores

On Windows, PowerShell exposes certificate stores through the `Cert:` provider. `CurrentUser` and `LocalMachine` are separate locations, and stores such as `My`, `WebHosting`, and `Root` have different roles.

Find server-authentication certificates in the common local-machine leaf stores:

```powershell
$stores = @(
    'Cert:\LocalMachine\My',
    'Cert:\LocalMachine\WebHosting'
)

Get-ChildItem -Path $stores -SSLServerAuthentication |
    Select-Object `
        PSParentPath,
        Thumbprint,
        Subject,
        Issuer,
        DnsNameList,
        NotBefore,
        NotAfter,
        HasPrivateKey,
        @{Name = 'DaysRemaining'; Expression = {
            [math]::Floor(
                ($_.NotAfter.ToUniversalTime() - [datetime]::UtcNow).TotalDays
            )
        }}
```

Find certificates expiring within 30 days:

```powershell
$expiringCertificateSplat = @{
    Path = @(
        'Cert:\LocalMachine\My',
        'Cert:\LocalMachine\WebHosting'
    )
    SSLServerAuthentication = $true
    ExpiringInDays = 30
}

Get-ChildItem @expiringCertificateSplat
```

The provider's `NotAfter` property contains the expiration date, and `Thumbprint` identifies the certificate in the Windows store. Thumbprints are commonly SHA-1 in Windows display and lookup workflows; keep them for store identity, but calculate or export a SHA-256 fingerprint for cross-platform inventory.

Querying `LocalMachine` remotely generally requires PowerShell Remoting permissions. Grant read-only monitoring access where possible and run the collector locally so private-key material never leaves the host. `HasPrivateKey` is metadata; do not attempt to export the key.

Also inspect the service binding. IIS, HTTP.sys, Remote Desktop, SQL Server, and custom services can reference different stores or thumbprints. A certificate sitting in `LocalMachine\My` is not proof that any listener uses it.

## Java Keystores

Java keystores can contain several entry types:

- `PrivateKeyEntry` normally holds a private key and its certificate chain for a server or client identity;
- `trustedCertEntry` is a certificate trusted by the application;
- a keystore can contain several aliases, only one of which the application selects.

List a PKCS#12 keystore verbosely without placing its password directly in the process arguments:

```bash
export KEYSTORE_PASS='replace-with-secret-injection'

keytool -list -v \
  -keystore /opt/app/config/server.p12 \
  -storetype PKCS12 \
  -storepass:env KEYSTORE_PASS
```

The Oracle `keytool` command supports `:env` and `:file` modifiers for password options. An environment variable can still be exposed by an overly privileged process inspector or diagnostic dump, so prefer the secret-delivery mechanism supported by the runtime and restrict collector permissions.

Export one alias's public certificate in PEM form for normalized inspection:

```bash
keytool -exportcert -rfc \
  -alias server \
  -keystore /opt/app/config/server.p12 \
  -storetype PKCS12 \
  -storepass:env KEYSTORE_PASS \
  | openssl x509 -noout \
      -subject -issuer -serial -dates -fingerprint -sha256 \
      -ext subjectAltName
```

Use `-cacerts` when intentionally auditing the JDK trust store. Do not assume the JVM running the service uses the `keytool` binary or `cacerts` file in your interactive shell. Containers, application servers, custom `javax.net.ssl.keyStore` settings, and embedded JREs can select a different Java installation and keystore.

Record alias and entry type. Alerting on every trusted root with the same urgency as a serving leaf creates noise; apply separate policies to identity keystores and trust stores.

## PEM Certificate Files

Inspect a leaf certificate file:

```bash
openssl x509 \
  -in /etc/tls/app/cert.pem \
  -noout \
  -subject -issuer -serial -dates \
  -fingerprint -sha256 \
  -ext subjectAltName
```

Use `-checkend` for a script-friendly threshold. This exits nonzero if the certificate expires within the next 30 days:

```bash
openssl x509 \
  -in /etc/tls/app/cert.pem \
  -noout \
  -checkend 2592000
```

Calculate the SPKI hash:

```bash
openssl x509 -in /etc/tls/app/cert.pem -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256
```

PEM is an encoding, not a semantic file type. A file can contain a leaf, a chain, many certificates, a CSR, or a private key. Traditional single-certificate `openssl x509` workflows may inspect only the first certificate in a bundle. Parse every PEM certificate object with a bounded certificate-aware collector and record its chain position.

Scan configured paths from an asset inventory instead of recursively reading an entire filesystem. Broad scans encounter backups, package CA bundles, unreadable secrets, and unrelated credentials. Never log PEM contents or pass a private-key file to a certificate parser.

## Export Safe Monitoring Data

Collectors should emit expiry timestamps and stable identifiers, not certificates or keys. For example, a custom metric can use fixed asset labels and place the expiry in the value:

```text
stored_certificate_not_after_seconds{asset="payments-api",store="java",alias="server"} 1798761600
stored_certificate_info{asset="payments-api",fingerprint_sha256="lowercase-hex"} 1
```

These are deliberately custom metric names, not built-in Prometheus or node exporter metrics. Keep changing certificate fingerprints out of high-volume labels unless rotation history is genuinely required, and constrain all free-form labels to trusted inventory inputs.

Alert on remaining time and collection freshness. A collector that silently stops must not leave the last stored expiry looking current.

## Compare Stored and Served State

After every renewal or deployment:

1. calculate the stored leaf's SHA-256 fingerprint;
2. make a new TLS connection with the production SNI;
3. calculate the served leaf's fingerprint;
4. compare every advertised IP, address family, region, and backend where convergence matters;
5. alert until served state matches the approved stored state;
6. retain the previous certificate during a bounded rollback period according to policy.

A mismatch commonly means the process was not reloaded, the wrong alias is selected, an old pod remains, a load balancer uses a separately managed certificate, or the probe reached a CDN instead of the origin.

## Official Documentation

- [Microsoft PowerShell Certificate provider](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/about/about_certificate_provider)
- [Oracle Java `keytool` command](https://docs.oracle.com/en/java/javase/25/docs/specs/man/keytool.html)
- [Java `KeyStore` API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/security/KeyStore.html)
- [OpenSSL `x509` command](https://docs.openssl.org/master/man1/openssl-x509/)
- [OpenSSL `pkey` command](https://docs.openssl.org/master/man1/openssl-pkey/)
- [OpenSSL `verify` command](https://docs.openssl.org/master/man1/openssl-verify/)

## Conclusion

Windows stores, Java keystores, and PEM files require different collection tools, but they can share one certificate inventory model. Monitor the correct store and entry role, protect all private-key material, normalize public certificate identities, and always compare stored state with a fresh handshake. That final comparison catches the certificate that renewed on disk but never reached clients.
