# Cosign Keyless Signing Explained: What “Keyless” Means and Which Identity Gets Recorded

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Sigstore, Keyless Signing, OIDC, Supply Chain Security

Description: Understand Cosign keyless signing as short-lived identity-bound signing, including the roles of OIDC, Fulcio, Rekor, ephemeral keys, and verifier policy.

---

“Keyless” does not mean that no cryptographic key exists. A signature cannot be created without one. It means the signer does not provision, distribute, and retain a long-lived signing private key. Cosign generates an ephemeral key pair, obtains a short-lived certificate that binds the public key to an authenticated identity, signs the artifact, and discards the private key.

That removes a difficult key-management problem, but it does not remove trust decisions. A verifier must still decide which identity and OIDC issuer are authorized to sign a particular image.

## The keyless signing sequence

For the Sigstore public-good service, a typical Cosign signing operation follows this sequence:

1. Cosign generates a public/private key pair in memory.
2. The signer authenticates to an OpenID Connect provider, or a CI workload exposes an ambient OIDC token.
3. Cosign sends proof of possession and identity information to Fulcio.
4. Fulcio issues a short-lived code-signing certificate binding the ephemeral public key to claims derived from the OIDC token.
5. Cosign signs the artifact's digest with the ephemeral private key.
6. The certificate and signature transparency information are recorded through Sigstore's transparency infrastructure.
7. The signature and its verification material are stored alongside the OCI artifact in the registry.

The private key is not uploaded to Fulcio or Rekor. It exists only long enough to sign. The certificate, signature, log evidence, and artifact digest are public verification material, not secrets.

## What identity is recorded

The identity is derived from the OIDC token accepted by Fulcio; it is not an arbitrary label passed to `cosign sign`. The form depends on the identity provider and signing environment.

For an interactive identity provider, it may be an email address. For GitHub Actions, modern examples use a workflow identity URI such as:

```text
https://github.com/example/payments/.github/workflows/release.yml@refs/heads/main
```

The issuer is a separate trust dimension. For GitHub Actions, the issuer is:

```text
https://token.actions.githubusercontent.com
```

Two providers could assert similarly formatted subjects, so checking only the identity is insufficient. Cosign requires an expected identity and expected issuer for keyless verification.

## Sign by immutable digest

In CI, grant the signing job only the permissions it needs. GitHub requires `id-token: write` to request an OIDC token; this setting permits token minting and does not itself grant repository write access.

```yaml
jobs:
  sign:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write
    steps:
      - uses: sigstore/cosign-installer@v3
      - name: Sign the pushed manifest
        env:
          IMAGE: ghcr.io/example/payments
          DIGEST: ${{ needs.build.outputs.digest }}
        run: cosign sign --yes "$IMAGE@$DIGEST"
```

Pin third-party actions to reviewed commit SHAs in a hardened production workflow. The version tag above is readable documentation, not a substitute for action pinning.

The signer should receive the digest directly from the build-and-push job. Signing a tag allows the tag to move between registry lookups.

## Verify the signer, not merely “a Sigstore signature”

The verification policy must name the producer you trust:

```bash
IMAGE=ghcr.io/example/payments@sha256:REPLACE_WITH_DIGEST

cosign verify \
  --certificate-identity="https://github.com/example/payments/.github/workflows/release.yml@refs/heads/main" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  "$IMAGE"
```

This checks that at least one signature satisfies the cryptographic and identity constraints. An unbounded regular expression such as `.*` is useful only for diagnostics in a controlled environment; it is not an authorization policy. It would allow any identity from any matching issuer.

The expected identity should be owned by the artifact producer. A repository, workflow path, and protected branch are stronger than an organization-wide wildcard because they narrow who can create an acceptable signing event.

## Why the certificate may expire without invalidating the signature

Fulcio certificates are intentionally short-lived. Verification uses trusted time evidence to determine that signing occurred while the certificate was valid. A verifier does not simply compare the certificate's `NotAfter` value with today's date. If it did, every keyless release would become unverifiable soon after it was published.

The verification bundle and transparency-log evidence matter because they carry or support that signing-time proof. Preserve them when mirroring artifacts, and keep the trusted Sigstore root current for the verification environment.

## What keyless signing proves

After successful verification against a precise policy, keyless signing can establish that:

- the signed payload refers to the artifact digest being verified;
- the signature was produced by the private key corresponding to the certified public key;
- Fulcio bound that public key to the recorded OIDC identity;
- the expected OIDC issuer authenticated that identity;
- required transparency and trusted-time checks passed.

It does not establish that the source code was reviewed, the build was isolated, dependencies were safe, or the image was vulnerability-free. Those claims require separate controls and, where appropriate, signed attestations evaluated by policy.

## Operational trade-offs

Keyless signing eliminates storage and rotation of a long-lived private key, but it introduces dependencies at signing time: the OIDC provider, Fulcio, transparency services, and registry must be reachable. Verification can be designed for outages or disconnected environments by distributing complete Sigstore bundles and trusted roots in advance.

Identity lifecycle replaces key lifecycle as the central control. Protect the repository and workflow, restrict who can modify it, use protected environments for releases, minimize token permissions, and monitor transparency logs for unexpected uses of your identity.

## Keyless policy checklist

- [ ] Sign an immutable digest returned by the build system.
- [ ] Restrict OIDC token permission to the dedicated trusted signing job.
- [ ] Prevent untrusted pull-request code from reaching that job.
- [ ] Record the exact expected certificate identity and OIDC issuer.
- [ ] Anchor regular expressions if a workflow family genuinely requires them.
- [ ] Preserve OCI referrers and Sigstore verification material during promotion.
- [ ] Keep offline trusted roots updated through a controlled process.
- [ ] Monitor transparency logs for unexpected certificates or signatures.
- [ ] Add attestations and policy checks for facts beyond publisher identity.

## Official Documentation

- [Sigstore security model](https://docs.sigstore.dev/about/security/)
- [Sigstore keyless quickstart with Cosign](https://docs.sigstore.dev/quickstart/quickstart-cosign/)
- [Fulcio certificate issuing overview](https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/)
- [Rekor transparency log overview](https://docs.sigstore.dev/logging/overview/)
- [Cosign verification command reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)
- [GitHub Actions OIDC reference](https://docs.github.com/en/actions/reference/security/oidc)

## Conclusion

Cosign keyless signing uses a real but ephemeral private key and a short-lived certificate tied to an OIDC identity. Its security comes from verifying the artifact digest, certificate chain, trusted time, transparency evidence, exact identity, and issuer together. The key-management burden becomes smaller, while careful identity policy becomes essential.
