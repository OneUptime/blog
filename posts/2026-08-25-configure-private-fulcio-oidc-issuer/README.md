# How to Configure a Private Fulcio Instance with Your Own OIDC Issuer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, Private PKI, Cosign, CI/CD, Supply Chain Security

Description: Configure and test a private Fulcio trust domain with an exact OIDC issuer, audience, identity type, CI claim templates, durable CA backend, and explicit client trust.

---

A private Fulcio deployment needs more than an OIDC issuer URL. You must decide which token claim becomes the certificate identity, constrain the token audience, configure Fulcio's issuer type, protect the CA signer, and distribute the private Fulcio and transparency-log trust material to every verifier.

The identity mapping is a security policy. Configure it before issuing production certificates because changing a SAN format later changes every verifier policy that names that identity.

## Start with the OIDC Contract

Fulcio uses OIDC discovery. Confirm that the issuer publishes a discovery document and that its declared issuer exactly matches the `iss` claim:

```bash
OIDC_ISSUER='https://id.example.com'

curl --fail --silent --show-error \
  "$OIDC_ISSUER/.well-known/openid-configuration" |
  jq '{issuer, jwks_uri, id_token_signing_alg_values_supported}'
```

Use TLS with a publicly trusted certificate or configure Fulcio's `ca-cert` for an internal issuer CA. Do not disable TLS verification. The discovery metadata's `issuer`, the token's effective issuer, and Fulcio's configured issuer must agree.

Register or configure the OIDC client so its ID tokens contain the audience Fulcio expects. Sigstore conventionally uses the client ID `sigstore`; an access token for an unrelated API is not a substitute for an ID token.

At minimum, tokens need `aud`, `iss`, `exp`, and `iat`, plus the identity claims required by the selected issuer type. An optional `nbf` is also enforced when present by the token verification path. Keep token lifetimes short and runner clocks synchronized.

## Configure a Verified Email Issuer

For an identity provider that emits a verified email, a minimal `config.yaml` is:

```yaml
oidc-issuers:
  https://id.example.com:
    issuer-url: https://id.example.com
    client-id: sigstore
    type: email
    contact: security@example.com
    description: Example workforce identity provider
```

The token must include:

```json
{
  "iss": "https://id.example.com",
  "aud": "sigstore",
  "email": "builder@example.com",
  "email_verified": true,
  "iat": 1787652000,
  "exp": 1787652300
}
```

Fulcio places `builder@example.com` in an email SAN. Current Fulcio source has a version-dependent `skip-email-verification` option for trusted internal providers that validate email ownership but cannot emit `email_verified`. Treat that as an exceptional migration control: verify your deployed release supports it, document the identity provider's equivalent guarantee, and never enable it merely to silence a malformed token.

If an email issuer is federated and the identity-provider issuer is carried in another claim, `issuer-claim` can select its JSON path. This is supported only for email issuers in current Fulcio. Test what issuer value is written to the certificate, because verifiers must pin that issuer as well as the SAN.

## Configure a Generic CI Provider

CI identities should normally name immutable or reviewable build instructions, not a human email. A current Fulcio configuration can map a CI provider's claims with templates:

```yaml
define:
  - &example-ci example-ci

oidc-issuers:
  https://oidc.ci.example.com:
    issuer-url: https://oidc.ci.example.com
    client-id: sigstore
    type: ci-provider
    ci-provider: *example-ci
    contact: ci-security@example.com
    description: Example hosted CI workload identities

ci-issuer-metadata:
  *example-ci:
    extension-templates:
      build-signer-uri: "{{ .workflow_uri }}"
      build-signer-digest: "workflow_digest"
      runner-environment: "runner_environment"
      source-repository-uri: "{{ .repository_uri }}"
      source-repository-digest: "source_digest"
      build-trigger: "event_name"
      run-invocation-uri: "{{ .run_uri }}"
    subject-alternative-name-template: "{{ .workflow_uri }}"
```

This example deliberately has no fallback for `runner_environment`. The issuer must always provide an authoritative value that distinguishes hosted from self-hosted execution. Current Fulcio template execution fails on a referenced claim that is absent from both the token and configured defaults, so an incomplete CI identity fails closed instead of becoming an ambiguous `unknown` runner.

The example also assumes the issuer guarantees absolute `https://` values for `workflow_uri`, `repository_uri`, and `run_uri`. If your claim values are relative, add a controlled URL prefix in `default-template-values` as Fulcio's GitHub mapping does. Do not let an untrusted token claim override a security-sensitive default unless the issuer contract explicitly makes that claim authoritative; claim values take precedence over defaults with the same name.

The Sigstore CI identity guidance requires an issuer, a build-signer URI identifying the responsible build instructions, and a runner-environment distinction. It recommends immutable build-signer digests and repository metadata. The SAN should be specific enough to use directly in `cosign verify --certificate-identity`.

## Choose Other Built-In Identity Types Carefully

Current Fulcio supports additional built-in types:

- `spiffe` requires `spiffe-trust-domain`, and the URI host in the token's `sub` must match that trust domain exactly;
- `kubernetes` derives a URI SAN from the nested Kubernetes namespace and service-account claims;
- `uri` requires `subject-domain`, a URI `sub`, an exact subject hostname match, and related issuer/subject domains; and
- `username` appends `subject-domain` and encodes the result as an `otherName` SAN.

For a non-CI identity type not already implemented by Fulcio, configuration alone may not be sufficient. The official integration guide requires adding an identity implementation and tests. Do not label an arbitrary token `type: ci-provider` simply to bypass that work; the resulting certificate semantics would be misleading.

## Mount the Configuration and a Production CA

Fulcio's current server flag for the issuer YAML is `--config-path`; its default path is `/etc/fulcio-config/config.yaml`. A production launch might include:

```text
fulcio-server serve
  --host=0.0.0.0
  --port=5555
  --grpc-port=5554
  --config-path=/etc/fulcio-config/config.yaml
  --ca=kmsca
  --kms-resource=awskms://...
  --kms-cert-chain-path=/etc/fulcio/ca-chain.pem
  --ct-log-url=https://ct.example.com/example-log
  --ct-log-public-key-path=/etc/fulcio/ct-public-key.pem
```

Pin this configuration to the exact Fulcio release you deploy: flags and config fields can evolve. Supply credentials through the workload identity or secret mechanism for the chosen KMS, not in command-line arguments checked into source control.

An OIDC configuration does not make an ephemeral or repository-shipped CA suitable for production. Use a durable signing backend, ideally an intermediate CA beneath a protected root, and operate a monitored CT log or an explicitly documented private audit mechanism.

## Validate Before Issuing Real Certificates

After startup, inspect the public configuration endpoint rather than assuming the file was loaded:

```bash
curl --fail --silent --show-error \
  https://fulcio.example.com/api/v2/configuration | jq .
```

Then run positive and negative tests with synthetic identities:

| Test | Expected result |
| --- | --- |
| valid token, `aud: sigstore`, known issuer | certificate issued with the expected SAN and issuer extension |
| correct issuer, wrong audience | rejected |
| unconfigured issuer | rejected |
| expired or not-yet-valid token | rejected |
| missing required email or CI claim | rejected |
| valid token, proof signed by another key | rejected |
| valid token with unexpected SAN input | rejected or mapped to the configured value, never accepted unchecked |

Inspect the resulting certificate with OpenSSL and verify a signed test artifact using an exact SAN and issuer. Also confirm that a verifier using only the public Sigstore trusted root rejects your private certificate.

## Distribute the Whole Trust Domain

Private Cosign clients need more than `--fulcio-url`. They need authenticated Fulcio roots/intermediates, CT log public keys, Rekor keys, and service endpoints. The preferred design is a private TUF repository or current Sigstore trusted-root and signing-configuration documents distributed through a controlled channel.

Do not fetch a root from the same unauthenticated endpoint you are trying to trust during verification. Bootstrap it out of band. Keep production, staging, and developer roots separate so a test certificate cannot satisfy a production policy.

Finally, restrict who can obtain eligible ID tokens at the issuer. Fulcio authenticates what the issuer asserts; it is not a replacement for branch protection, protected environments, workflow review, or workload authorization at the identity provider.

## Official Documentation

- [Fulcio OIDC integration guide and identity types](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md)
- [Current Fulcio identity configuration example](https://github.com/sigstore/fulcio/blob/main/config/identity/config.yaml)
- [Fulcio configuration source and schema](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go)
- [Fulcio CI-provider template and missing-claim handling](https://github.com/sigstore/fulcio/blob/main/pkg/identity/ciprovider/principal.go)
- [Fulcio server flags](https://github.com/sigstore/fulcio/blob/main/cmd/app/serve.go)
- [Sigstore OID and CI claim requirements](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Setting up a Fulcio instance and production signing backends](https://github.com/sigstore/fulcio/blob/main/docs/setup.md)
- [Cosign custom infrastructure configuration](https://docs.sigstore.dev/cosign/signing/overview/#custom-infrastructure)

## Conclusion

A safe private Fulcio configuration makes the OIDC contract, SAN, issuer, CI metadata, CA backend, transparency service, and verifier trust explicit. Test rejection paths as carefully as successful issuance, and version the identity mapping because it is part of your software supply-chain policy.
