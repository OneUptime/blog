# Fix Trustee KBS Client Trust for Self-Signed TLS Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, TLS, Security, Kubernetes, Troubleshooting

Description: Resolve Trustee certificate failures by configuring the correct KBS client trust, matching certificate names, and preserving HTTPS verification.

---

A KBS server accepting its own TLS key pair does not mean its clients trust the certificate. The server needs the private key and certificate to present an identity. Each connecting client separately decides which certificate authorities or explicitly trusted certificates it accepts.

When a Trustee setup fails with an unknown issuer or self-signed certificate error, identify the client first. The administrator's `kbs-client`, the guest's Attestation Agent, and CDH are separate clients. Fixing one trust configuration does not automatically fix the others. [Trustee self-signed HTTPS guide](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/self-signed-https.md)

## Establish the Intended Server Identity

Record the exact URL used by the failing client, including the hostname. Inspect the certificate installed at the TLS endpoint:

```bash
openssl x509 -in kbs-server.pem \
  -noout -subject -issuer -dates -ext subjectAltName
```

For `https://kbs.example.com`, the certificate should have a DNS subject alternative name for `kbs.example.com`. For a literal IP address, it needs an IP-address SAN. A DNS SAN whose text looks like an IP address is not equivalent. A matching common name alone is not a reliable replacement for SAN validation.

If TLS terminates at an ingress or load balancer, inspect the certificate served there. Mounting a certificate into KBS will not change the certificate presented by an upstream TLS endpoint.

Test both chain trust and hostname explicitly:

```bash
openssl s_client \
  -connect kbs.example.com:443 \
  -servername kbs.example.com \
  -CAfile kbs-ca.pem \
  -verify_hostname kbs.example.com \
  -verify_return_error </dev/null
```

Use the approved trust anchor obtained through your deployment process. Do not make a newly observed, unauthenticated certificate trusted simply because it makes the command succeed. The command checks this connection; it does not install the CA for other clients. [OpenSSL TLS client reference](https://docs.openssl.org/3.5/man1/openssl-s_client/)

## Keep Server TLS Enabled

For TLS served directly by KBS, its configuration includes the private key and certificate paths:

```toml
[http_server]
sockets = ["0.0.0.0:8080"]
private_key = "/etc/kbs/tls.key"
certificate = "/etc/kbs/tls.crt"
insecure_http = false
```

Merge this into the complete deployment configuration. It is not a complete KBS configuration by itself. Mount the files at the paths visible to the KBS process and check their permissions. Preserve the existing administrator authorization, attestation service, and resource-policy settings. [KBS configuration reference](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/config.md)

A TLS fix does not require enabling anonymous administration or loosening token verification. Those options govern separate security checks. If an example configuration relaxes them for a local demonstration, do not carry that relaxation into an existing deployment.

## Configure the Administrator Client

The current Trustee CLI accepts `--cert-file` for a PEM trust certificate. With an already authorized administrator token and a harmless diagnostic resource, an example operation is:

```bash
printf '%s\n' 'tls-probe' > probe.txt
kbs-client --url https://kbs.example.com \
  --cert-file kbs-ca.pem \
  config --admin-token-file admin-token \
  set-resource --path default/test/tls-probe \
  --resource-file probe.txt
```

Use your actual port and authorized test resource. The syntax here is checked against Trustee commit `512fed65`. Confirm the installed version's help output before using older administrative examples. The client implementation adds the supplied certificate to its HTTP client's trusted roots while retaining verification. [KBS client source](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/tools/kbs-client/src/main.rs)

A request that now reaches an authorization error has passed the TLS stage. Fix its administrator permissions through the normal access-control mechanism rather than changing TLS again.

## Configure Guest KBS Trust

For guest-components commit `eae0bf63`, Attestation Agent's KBS token configuration accepts a PEM certificate in `cert`:

```toml
[token_configs.kbs]
url = "https://kbs.example.com"
# cert must contain the actual approved PEM certificate as a TOML string.
```

CDH's KBC configuration has a separate certificate field:

```toml
[kbc]
name = "cc_kbc"
url = "https://kbs.example.com"
# kbs_cert must contain the actual approved PEM certificate as a TOML string.
```

To produce the correctly escaped assignment for each file without copying a placeholder certificate, use Python:

```python
import json
from pathlib import Path

cert = Path('kbs-ca.pem').read_text()
Path('aa-cert-fragment.toml').write_text('cert = ' + json.dumps(cert) + '\n')
Path('cdh-cert-fragment.toml').write_text('kbs_cert = ' + json.dumps(cert) + '\n')
```

Insert the first assignment inside `[token_configs.kbs]` in `aa.toml` and the second inside `[kbc]` in `cdh.toml`. Preserve the rest of both files. These are PEM contents, not paths on the Kubernetes worker. [AA KBS configuration](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/attestation-agent/attestation-agent/src/config/kbs.rs), [CDH configuration](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)

Deliver the files through the version's supported Init-Data or guest image configuration workflow. Recreate the sandbox and account for the resulting measured-configuration change in the intended policy. The public certificate can be configuration data; the KBS private key belongs only at the TLS server.

## Verify Each Connection Independently

Retest the administrator request, guest attestation, and retrieval of a harmless guest resource. A successful administrator request proves neither guest trust nor guest authorization.

For certificate rotation, distribute the planned trust change before removing the old certificate or issuer. Test new sandboxes against the new server chain. Track server certificate expiry and the versions of guest configuration still using an older trust anchor.

## Conclusion

Fix self-signed KBS certificate errors at the client that rejects the connection. Verify the actual server hostname and chain, supply the approved PEM trust certificate to the administrator and guest clients, and keep HTTPS and the existing authorization policies enabled.

## Official Documentation

- [Trustee self-signed HTTPS](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/self-signed-https.md)
- [KBS configuration](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/config.md)
- [KBS client options](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/tools/kbs-client/src/main.rs)
- [AA KBS trust settings](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/attestation-agent/attestation-agent/src/config/kbs.rs)
- [CDH trust settings](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)
- [OpenSSL TLS diagnostics](https://docs.openssl.org/3.5/man1/openssl-s_client/)
