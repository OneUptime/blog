# Email, URI, Kubernetes, and SPIFFE Identities in Fulcio: Which SAN Will Be Issued?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, X.509, Subject Alternative Name, Kubernetes, SPIFFE

Description: Choose and verify Fulcio SAN identities by understanding how verified email, URI, Kubernetes service-account, SPIFFE, username, and CI claims map into X.509 certificates.

---

Fulcio certificates have an empty X.509 Subject. The authenticated identity is carried in a critical Subject Alternative Name (SAN), and its representation depends on the configured OIDC issuer type.

Do not assume the OIDC `sub` claim is always copied into the SAN. Email uses a verified `email`; Kubernetes derives a service-account URI from nested claims; GitHub CI derives a workflow URI; and only some identity types use `sub` directly. The configured mapping, not the JWT field name alone, determines the certificate identity.

## Compare the Identity Types

| Fulcio issuer type | Required identity input | Issued SAN form |
| --- | --- | --- |
| `email` | `email` plus `email_verified: true` | `email:user@example.com` |
| `uri` | absolute URI in `sub`, constrained by `subject-domain` | the `sub` value as a URI SAN |
| `kubernetes` | namespace and service-account data under `kubernetes.io` | `URI:https://kubernetes.io/namespaces/NAMESPACE/serviceaccounts/SERVICE_ACCOUNT` |
| `spiffe` | SPIFFE ID in `sub`, constrained by `spiffe-trust-domain` | the `spiffe://...` value as a URI SAN |
| `username` | username in `sub`, plus `subject-domain` | an `otherName` SAN containing `sub!subject-domain` under Fulcio OID `.1.7` |
| `ci-provider` | provider claims and configured SAN template | normally a URI naming the responsible build instructions |

Every SAN must be verified together with the OIDC issuer extension. `developer@example.com` from one identity provider is not interchangeable with the same email string asserted by another provider.

## Email: A Verified Address Becomes an Email SAN

An email issuer token must include:

```json
{
  "aud": "sigstore",
  "iss": "https://id.example.com",
  "email": "developer@example.com",
  "email_verified": true,
  "iat": 1787652000,
  "exp": 1787652300
}
```

The certificate contains:

```text
X509v3 Subject Alternative Name: critical
    email:developer@example.com
```

The raw `sub` can be an opaque account identifier and does not replace the verified email for this issuer type. Fulcio's normal proof-of-possession challenge for email identities is the `email` claim.

Current Fulcio source includes a version-dependent `skip-email-verification` configuration for trusted internal providers that perform equivalent verification but do not emit the standard claim. That option weakens an explicit signal and should be used only after documenting the provider's guarantee and checking the deployed Fulcio version—not as a blanket fix for unverified email.

Email SANs in public Fulcio certificates are written to public transparency infrastructure. If a personal or internal address must not become public, do not use it with the public instance.

## URI: `sub` Is Accepted Only Within a Controlled Domain

A URI issuer can use a token such as:

```json
{
  "sub": "https://users.example.com/builders/release-bot"
}
```

with Fulcio configuration:

```yaml
oidc-issuers:
  https://accounts.example.com:
    issuer-url: https://accounts.example.com
    client-id: sigstore
    type: uri
    subject-domain: https://users.example.com
```

The SAN becomes:

```text
URI:https://users.example.com/builders/release-bot
```

Current Fulcio validates that the token subject's hostname exactly matches the configured subject hostname. It also requires the subject-domain and issuer schemes to match and constrains their domains. The operator adding this configuration is expected to prove control of both issuer and subject domains.

Do not configure a shared public domain you do not control or accept arbitrary URI hosts from the token. The SAN is a policy identifier, so choose a stable path structure and define normalization, case, escaping, and rename behavior in the issuer contract.

## Kubernetes: Namespace and Service Account Become a URI

For Kubernetes workload tokens, Fulcio reads the nested Kubernetes claims:

```json
{
  "sub": "system:serviceaccount:release:signer",
  "kubernetes.io": {
    "namespace": "release",
    "pod": {
      "name": "signer-7c8d9",
      "uid": "POD_UID"
    },
    "serviceaccount": {
      "name": "signer",
      "uid": "SERVICE_ACCOUNT_UID"
    }
  }
}
```

The documented SAN is:

```text
URI:https://kubernetes.io/namespaces/release/serviceaccounts/signer
```

The pod name and UID do not appear in that SAN. Cluster separation comes from the OIDC issuer: managed clusters commonly have cluster-specific issuer URLs. This is why verifier policy must pair the Kubernetes SAN with the exact expected cluster issuer. Trusting only the generic `https://kubernetes.io/...` URI can accidentally trust a service account with the same namespace and name in another cluster.

The Kubernetes token presented to Fulcio must be audience-bound for the configured client ID, conventionally `aud: sigstore`. Restrict which pods can request that signing identity and which artifacts the resulting service-account SAN is authorized to sign.

## SPIFFE: Preserve the SPIFFE ID as a URI SAN

A SPIFFE issuer presents a subject such as:

```json
{
  "sub": "spiffe://build.example.com/release/signer"
}
```

and Fulcio is configured with the same trust domain:

```yaml
oidc-issuers:
  https://oidc.build.example.com:
    issuer-url: https://oidc.build.example.com
    client-id: sigstore
    type: spiffe
    spiffe-trust-domain: build.example.com
```

The SAN is:

```text
URI:spiffe://build.example.com/release/signer
```

Fulcio requires the host of the SPIFFE ID to match `spiffe-trust-domain` exactly. A subdomain, look-alike domain, or different trust domain is rejected. Define SPIFFE path ownership at the workload identity layer; Fulcio verifies the asserted ID and configured trust-domain boundary but does not decide which application team should control each path.

## CI Workflows Are URI Identities Too

Although CI is not one of the four generic types in the title, it is a common source of confusion. Current GitHub Actions certificates use:

```text
URI:https://github.com/OWNER/REPOSITORY/.github/workflows/WORKFLOW.yml@REF
```

This comes from `job_workflow_ref`, not the GitHub token's `sub`. Provider-generic OID extensions record the raw subject, repository, workflow digests, trigger, runner, and other metadata separately.

A private generic CI provider defines its SAN with `subject-alternative-name-template`. Choose the specific build instructions responsible for signing, and map Build Signer URI and Runner Environment as required by Fulcio's CI guidance.

## Choose a SAN by Policy Needs

Ask these questions before integrating an issuer:

- Is the identity a person, workload, service account, or set of build instructions?
- Can a verifier write one exact, durable identity rule for it?
- Does the value survive a display-name change or repository rename?
- Is it scoped narrowly enough that compromise of one workload does not authorize unrelated artifacts?
- Does it expose personal or internal information in public transparency logs?
- Can the issuer prevent another principal from claiming the same value?

Human email is understandable but exposes personal data and follows account lifecycle. A workflow URI is often better for automated releases. Kubernetes names are convenient but require issuer pinning for cluster separation. SPIFFE offers a strong workload namespace when the trust domain and path ownership are well governed.

## Inspect and Verify the Result

Inspect the SAN:

```bash
openssl x509 -in fulcio-leaf.pem -noout \
  -ext subjectAltName
```

Then verify an artifact with both the exact identity and issuer:

```bash
cosign verify-blob artifact.tar.gz \
  --bundle artifact.sigstore.json \
  --certificate-identity \
    'spiffe://build.example.com/release/signer' \
  --certificate-oidc-issuer \
    'https://oidc.build.example.com'
```

Anchor any required regular expression and test rejection for a neighboring namespace, workflow, SPIFFE path, email, and issuer. A policy that accepts `.*signer.*` defeats the careful SAN mapping.

## Official Documentation

- [Fulcio OIDC identity types and SAN mappings](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md)
- [Fulcio configuration types and domain validation](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go)
- [Fulcio certificate specification](https://github.com/sigstore/fulcio/blob/main/docs/certificate-specification.md)
- [Fulcio architecture specification](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md)
- [Fulcio OID directory](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
- [Cosign verification documentation](https://docs.sigstore.dev/cosign/verifying/verify/)

## Conclusion

Fulcio makes identity type explicit in the SAN: verified email, controlled URI, Kubernetes service-account URI, SPIFFE ID, username `otherName`, or a templated CI workflow URI. Choose the representation that matches the principal, keep it stable and non-sensitive, and always verify it together with the exact OIDC issuer.
