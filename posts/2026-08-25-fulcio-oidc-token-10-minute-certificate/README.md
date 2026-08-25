# How Fulcio Issues a 10-Minute Certificate from an OIDC Token

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, Cosign, Code Signing, Certificate Transparency, Supply Chain Security

Description: Follow the complete Fulcio issuance path from a short-lived OIDC token and ephemeral key through proof of possession, a 10-minute certificate, transparency logging, and durable verification.

---

Fulcio does not turn an OIDC token into a long-lived signing credential. It uses the token to authenticate a certificate request, binds the authenticated identity to a client-generated public key, and returns a short-lived X.509 code-signing certificate. The Sigstore public Fulcio service currently issues certificates valid for exactly 10 minutes.

That distinction is the core of Sigstore's identity-based, or “keyless,” model. There is still a private key, but a client such as Cosign generates it ephemerally instead of asking an operator to distribute and rotate a long-lived signing key.

## The Issuance Path

The normal sequence is:

1. Cosign generates an ephemeral key pair in the signing process.
2. Cosign obtains an OIDC ID token whose audience contains `sigstore`.
3. The client sends Fulcio the token and either a public key plus a signed proof-of-possession challenge or a PKCS#10 certificate signing request.
4. Fulcio validates the token against the configured issuer, including its signature, audience, issuer, expiration, optional not-before time, and issuer-specific identity claims.
5. Fulcio verifies that the requester controls the private key corresponding to the submitted public key.
6. Fulcio maps trusted token claims to a Subject Alternative Name (SAN) and Sigstore-specific X.509 extensions.
7. Fulcio creates and signs a short-lived precertificate, submits it to the configured certificate-transparency (CT) log, and uses the returned Signed Certificate Timestamp (SCT) to issue the final leaf certificate with the SCT normally embedded.
8. Cosign signs the artifact with the ephemeral private key, obtains the configured RFC 3161 timestamp, records the signing event in Rekor, and discards the private key.

An OIDC token is authentication input, not the artifact signature and not the certificate itself. A stolen token can be replayed while it remains valid to obtain a certificate for an attacker-controlled key, but it does not reveal the ephemeral private key that signed a completed artifact.

## What Fulcio Validates

Every supported token needs at least these standard claims:

```json
{
  "aud": "sigstore",
  "iss": "https://issuer.example.com",
  "iat": 1787652000,
  "exp": 1787652300
}
```

The `iss` value must resolve to a configured issuer, and the token must verify with that issuer's published keys. `aud` must match the configured client ID, conventionally `sigstore`. Fulcio's provider-specific code then requires the claims used to identify the principal. By default, an email issuer requires `email` and `email_verified: true`; a trusted private deployment can explicitly skip the `email_verified` check. GitHub Actions requires workflow claims such as `job_workflow_ref`.

Fulcio also checks proof of possession. With the public-key request form, the client signs a Fulcio-configured challenge value-normally the token's `sub`, or `email` for an email identity. With a CSR, the CSR signature proves control of the private key. This prevents issuance for a public key whose corresponding private key the requester does not control. It does not prevent bearer-token replay with a newly generated key.

Never debug this flow by printing a complete bearer token into a CI log. Decode a redacted copy locally to inspect claim names, then verify the original only through the issuer and Fulcio.

## What Goes into the Certificate

Fulcio leaf certificates have an empty X.509 Subject. The authenticated signing identity is in a SAN:

- an email address is an `email` SAN;
- a CI workflow, URI identity, Kubernetes service account, or SPIFFE ID is a `URI` SAN; and
- a supported username identity uses an `otherName` SAN.

The OIDC issuer is recorded in Sigstore extension `1.3.6.1.4.1.57264.1.8`. CI certificates can contain additional extensions for the build signer, source repository, commit, ref, runner environment, run invocation, and other provenance metadata. Verifiers must compare both the expected identity and expected OIDC issuer. The same SAN asserted by two issuers is not the same trust decision.

The leaf also has critical digital-signature key usage and code-signing extended key usage. Its public key is the one supplied in the request; Fulcio never needs the client's private key.

## Why Ten Minutes Is Enough

The certificate's ten-minute lifetime limits the interval in which a signature under its key-to-identity binding must be shown to have existed. It does not make the private key cryptographically stop working at expiry, and it does **not** mean consumers have only ten minutes to verify a release.

For long-term verification, the Sigstore bundle carries the certificate and signed verification metadata. A verifier checks that an accepted RFC 3161 timestamp-or, for Rekor v1 only, an `integratedTime` authenticated by a verified Signed Entry Timestamp (SET)-falls inside the validity interval of every certificate in the path. It also validates the artifact signature, the Fulcio chain from trusted Sigstore material, the identity and issuer policy, and the relevant transparency-log proof or promise.

Therefore, this is not equivalent to running `openssl verify` against an expired leaf at the current wall clock. Use a Sigstore verifier that understands the bundle and trusted log material. Do not disable transparency checks merely to make an expired certificate pass.

## Try the Flow with Cosign

With Cosign v3.1.3-the current patched release at publication-sign a local file into the standardized bundle format:

```bash
printf 'release payload\n' > artifact.txt
cosign sign-blob artifact.txt \
  --bundle artifact.sigstore.json \
  --yes
```

On a developer workstation, Cosign opens or prints an OIDC authentication flow. In a supported CI environment such as GitHub Actions, it can obtain a workload token automatically; GitHub Actions must grant the workflow or job `id-token: write`. The bundle contains the artifact signature, leaf certificate, and verification metadata; keep it beside the artifact.

Verify against an explicit identity and issuer rather than accepting any valid Fulcio identity:

```bash
cosign verify-blob artifact.txt \
  --bundle artifact.sigstore.json \
  --certificate-identity 'developer@example.com' \
  --certificate-oidc-issuer 'https://accounts.google.com'
```

For a GitHub Actions signature, the identity is normally a workflow URI such as:

```text
https://github.com/OWNER/REPOSITORY/.github/workflows/release.yml@refs/heads/main
```

Use the exact SAN actually issued and pin the workflow, tag, branch, or digest semantics that your release policy requires. A broad regular expression can turn identity verification into “any workflow in this organization,” which is often wider than intended.

## Separate Fulcio CT from Rekor

Two logs play different roles:

- Fulcio's CT log makes certificate issuance publicly auditable and returns an SCT for the certificate.
- Rekor records the artifact signing event and supplies verifiable inclusion evidence. Rekor v1 can additionally authenticate an `integratedTime` with an SET; Rekor v2 does not timestamp entries, so v2 signing relies on a trusted RFC 3161 timestamp authority.

An SCT is not an artifact timestamp, and a Fulcio certificate alone does not prove which artifact was signed. Conversely, a Rekor entry containing a certificate does not remove the need to validate the Fulcio chain, SAN, issuer extension, and certificate-transparency evidence according to the active trusted root.

## Operational Checks

When issuance or verification fails, check each boundary separately:

- confirm the token's `iss` matches a configured fixed issuer or an allowed meta-issuer pattern;
- confirm `aud` contains the expected client ID, usually `sigstore`;
- compare `iat`, optional `nbf`, and `exp` with an NTP-synchronized clock;
- verify required provider-specific claims are present;
- ensure the proof-of-possession key is the key in the request;
- obtain roots and log keys from Sigstore's TUF-distributed trusted root, not an arbitrary HTTPS response; and
- verify with a fully qualified expected identity and issuer.

The ten-minute value is the current Fulcio public deployment behavior documented by the project. Treat service URLs, roots, supported issuers, and client CLI details as versioned configuration and consume them through current trusted metadata.

## Official Documentation

- [Fulcio repository and public-instance certificate lifetime](https://github.com/sigstore/fulcio)
- [Fulcio architecture specification](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md)
- [How Fulcio certificate issuing works](https://github.com/sigstore/fulcio/blob/main/docs/how-certificate-issuing-works.md)
- [Fulcio OIDC requirements and identity mappings](https://github.com/sigstore/fulcio/blob/main/docs/oidc.md)
- [Fulcio certificate profile](https://github.com/sigstore/fulcio/blob/main/docs/certificate-specification.md)
- [Sigstore bundle format](https://docs.sigstore.dev/about/bundle/)
- [Cosign identity-based signing overview](https://docs.sigstore.dev/cosign/signing/overview/)

## Conclusion

Fulcio turns a verified, audience-bound OIDC identity into a narrowly scoped certificate for a client-controlled ephemeral key. The public certificate lasts ten minutes, while CT, Rekor, trusted roots, explicit identity policy, and signed time evidence make a correctly bundled signature verifiable long afterward.
