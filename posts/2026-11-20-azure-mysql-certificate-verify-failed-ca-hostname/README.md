# Fix Azure MySQL Certificate Verification Without Weakening TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Security, Troubleshooting

Description: Diagnose Azure MySQL certificate failures by checking CA bundles, certificate names, runtime trust configuration, and client verification modes.

`CERTIFICATE_VERIFY_FAILED` means the client could not complete its configured certificate verification. It is evidence to investigate, not a reason to disable verification. The same short message can hide different causes: a missing issuer, an expired certificate, a hostname mismatch, or a trust file that never reached the running container.

Start with the complete error from the actual failing process. Record the driver and runtime versions, configured database hostname, trust-file path, and verification mode. A successful connection from another tool may simply mean that tool trusts a different CA bundle or performs weaker checks.

This article uses MySQL 8.4 client options and Python 3.11 examples. Where Connector/Python behavior is discussed, the concrete version is **9.5.0**.

## Classify the failure before replacing certificates

| Error detail or symptom | First check |
| --- | --- |
| Unable to get issuer or local issuer certificate | Missing trust root, incomplete chain, or wrong bundle |
| Hostname mismatch | Connection hostname versus certificate identity |
| Certificate expired or not yet valid | Certificate dates and the client's clock |
| PEM or file-loading error | File format, contents, path, and runtime permissions |
| Works on laptop, fails in container | The container's actual trust configuration and deployed files |
| Works only with a weaker client mode | Whether the successful test verified the server at all |

In Python, `SSLCertVerificationError` exposes verification-specific information; preserve the diagnostic detail without logging credentials or full secret-bearing connection strings. The [Python 3.11 TLS documentation](https://docs.python.org/3.11/library/ssl.html) describes the exception and trust configuration.

Do not assume every TLS failure is a CA problem. Protocol negotiation failures and connection resets need different investigation. Changing a password cannot repair an issuer or hostname mismatch.

## Use provider-approved roots, not a captured leaf

A certificate chain connects the database's server certificate through intermediate issuers to a trusted root CA. A CA is a certificate authority. Trusting a captured server certificate directly can make the connection depend on a certificate that the provider routinely replaces.

Azure's current guidance lists **DigiCert Global Root G2** and **Microsoft RSA Root Certificate Authority 2017** for Azure MySQL, and advises against trusting individual server or intermediate certificates as roots. Check the guidance for your cloud and rollout context before changing trust. See the [Azure MySQL TLS overview](https://learn.microsoft.com/en-us/azure/mysql/security/security-tls).

Download certificates from the official links in that documentation. If a download is DER-encoded rather than PEM-encoded, convert it with a certificate-aware tool before building a PEM bundle. Renaming a `.crt` file to `.pem` does not change its encoding. Azure's [TLS connection procedure](https://learn.microsoft.com/en-us/azure/mysql/security/security-tls-how-to-connect) describes preparing the client trust material.

Inspect the complete proposed bundle rather than just its first certificate. With an OpenSSL build supporting `storeutl`, this read-only command displays its certificates:

```bash
openssl storeutl -noout -text /approved/path/azure-mysql-roots.pem
```

Replace the file path. Review the subjects, issuers, validity periods, and number of certificates. A text or HTML download error saved under a certificate filename is not a usable bundle. This command was exercised locally with OpenSSL 4.1.0; its options are documented in the [OpenSSL reference](https://docs.openssl.org/3.5/man1/openssl-storeutl/).

## Prove that the runtime can load the file

Run a file-loading check inside the same image or host environment as the application, under the appropriate service identity. Save this Python 3.11 script as `inspect_ca.py`:

```python
from pathlib import Path
import ssl
import sys

bundle = Path(sys.argv[1]).resolve(strict=True)
context = ssl.create_default_context(cafile=str(bundle))
stats = context.cert_store_stats()
if stats["x509_ca"] == 0:
    raise RuntimeError("The supplied file loaded no CA certificates")
print("Bundle:", bundle)
print("Store:", stats)
print("Hostname checking:", context.check_hostname)
print("Verification mode:", context.verify_mode.name)
```

Run it with the actual deployed path:

```bash
python3 inspect_ca.py /approved/path/azure-mysql-roots.pem
```

Expected results include a nonzero CA count, hostname checking enabled, and `CERT_REQUIRED`. A missing, unreadable, or malformed file should fail. This only proves that Python can load the bundle into a verifying TLS context. It does not establish that the database's presented chain terminates at one of those roots, or that your database driver uses this particular context.

If the script succeeds on the host but fails in the container, inspect the image contents or mounted file and its permissions. If it succeeds in both places, compare the application's configured path with the tested path. Avoid maintaining multiple identically named bundles whose contents drift.

## Verify the name the client actually uses

Use the normal Azure MySQL server FQDN, such as `SERVER_NAME.mysql.database.azure.com`, as the connection host. FQDN means fully qualified domain name. Private DNS should resolve that name through the intended private path while preserving the hostname presented to the driver.

An arbitrary alias such as `orders-db.internal` is not automatically covered by the server certificate. Connecting to an IP address is also different from connecting to the certificate's DNS name. Fix the hostname or supported endpoint configuration rather than disabling identity checks.

For the MySQL 8.4 command-line client, use an approved database account and this explicit configuration:

```bash
mysql --host=SERVER_NAME.mysql.database.azure.com \
  --port=3306 --protocol=TCP \
  --user=APP_USER --password \
  --ssl-mode=VERIFY_IDENTITY \
  --ssl-ca=/approved/path/azure-mysql-roots.pem
```

Replace the placeholders. `--password` prompts instead of including the password in the command. `VERIFY_IDENTITY` checks the chain and the hostname. A successful login with this configuration is stronger evidence than a successful connection using encryption alone. See the [MySQL 8.4 connection options](https://dev.mysql.com/doc/refman/8.4/en/connection-options.html).

## Compare equivalent verification modes

Do not treat all “SSL enabled” settings as equivalent. In MySQL, `REQUIRED` requires encryption, `VERIFY_CA` adds CA verification, and `VERIFY_IDENTITY` also verifies the server name. The [encrypted-connections guide](https://dev.mysql.com/doc/refman/8.4/en/using-encrypted-connections.html) explains this distinction.

For Connector/Python 9.5.0, inspect the effective `ssl_ca`, `ssl_verify_cert`, and `ssl_verify_identity` arguments. Both verification flags should be enabled for chain and hostname checking. If an application wraps the connector, verify what the wrapper actually passes rather than assuming its generic TLS toggle enables every check. See the [Connector/Python arguments](https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html).

A command-line success paired with an application failure is most useful when both use the same hostname, trust roots, and full verification. Otherwise, the comparison may conceal the defect.

## Confirm the repair on fresh connections

Deploy the corrected trust material or hostname configuration through your normal process. Reload or restart affected processes as their TLS configuration requires, then establish new physical database connections. A warm pool may continue using sessions created before the change.

Confirm cold startup, a fresh verified login, and an approved query from the application environment. Record the bundle source and update owner so future root changes reach every consumer. Avoid retaining obsolete trust indefinitely after the reviewed transition.

For this article, the two root certificates linked by Azure were downloaded, converted into a PEM bundle, inspected, and loaded locally. The Python check was also tested with malformed input. No live Azure MySQL handshake or database login was performed, and the MySQL CLI example was source-reviewed rather than executed.
