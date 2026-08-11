# Cosign vs Notation: Which Container Image Signing Workflow Fits Your Registry and Policy Engine?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Notation, Notary Project, Image Signing, OCI, Supply Chain Security

Description: Compare Cosign and Notation by identity model, signature format, registry behavior, key management, verification policy, and Kubernetes integration.

---

Cosign and Notation both sign OCI artifacts by digest and store signatures as separate registry artifacts. The important choice is not which tool has “stronger cryptography” in the abstract. It is which trust model, registry implementation, key service, verification policy, and admission engine your organization can operate consistently.

Cosign is the container-focused Sigstore client and supports public-key, KMS, hardware, bring-your-own-PKI, and identity-based keyless workflows. Notation is the Notary Project CLI and reference workflow, centered on X.509 trust stores and trust policies with extensible signing and verification plugins.

## Shared foundation

Both workflows should begin with an immutable OCI digest:

```text
registry.example.com/team/api@sha256:...
```

Both keep the signature separate so the subject manifest does not change. Both depend on compatible registry artifact/referrer behavior and must be included deliberately in mirroring, retention, backup, and garbage collection.

Neither signature proves an image is vulnerability-free. Both require a consumer policy that decides which signer is trusted for which repository or artifact.

## Cosign's trust models

Cosign's distinguishing workflow is Sigstore keyless signing:

```bash
cosign sign --yes "$IMAGE_BY_DIGEST"

cosign verify \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "$IMAGE_BY_DIGEST"
```

Cosign creates an ephemeral key, obtains a short-lived Fulcio certificate based on OIDC identity, and uses transparency evidence from Rekor. Consumers authorize an identity/issuer pair rather than distributing a publisher's long-lived public key.

Cosign also supports conventional keys and KMS URIs:

```bash
cosign sign --key="$KMS_URI" "$IMAGE_BY_DIGEST"
cosign verify --key=release.pub "$IMAGE_BY_DIGEST"
```

Its ecosystem includes in-toto attestations, Sigstore bundles for offline verification, public transparency infrastructure, and policy integrations that understand Cosign signatures and keyless identities.

## Notation's trust model

Notation signs with a configured key and X.509 certificate, either locally or through a plugin-backed key service:

```bash
notation sign "$IMAGE_BY_DIGEST"
notation verify "$IMAGE_BY_DIGEST"
```

The verifier imports certificates into a named trust store and defines a trust policy. A policy statement scopes registry repositories, verification level, trust stores, and trusted identities. Conceptually:

```json
{
  "version": "1.0",
  "trustPolicies": [
    {
      "name": "production-images",
      "registryScopes": ["registry.example.com/team/api"],
      "signatureVerification": {"level": "strict"},
      "trustStores": ["ca:production-signers"],
      "trustedIdentities": ["x509.subject: CN=Release Signing,O=Example Corp,C=GB"]
    }
  ]
}
```

Use the exact identity syntax and certificate subject produced by your approved Notation version. The Notary Project trust-policy specification is the source of truth; do not copy a wildcard-filled development quickstart into production.

The Notary Project specification supports JWS and COSE signature envelopes. The Notation CLI documentation describes JWS as the default and a flag for COSE, but pin and verify the current CLI behavior before standardizing.

## Compare the operational questions

| Question | Cosign | Notation |
| --- | --- | --- |
| Primary ecosystem | Sigstore | Notary Project |
| Keyless public workflow | Native OIDC + Fulcio + Rekor | Not the core Notation trust-store workflow |
| Managed keys | Built-in KMS URI support plus hardware/key files | Plugin model and configured signing keys |
| Consumer identity policy | Public key or certificate identity + issuer; external policy engines add scope/thresholds | Native trust policy scopes repositories, trust stores, identities, and verification level |
| Signed statements | Strong Cosign/in-toto attestation workflow | Signature metadata/specification; evaluate separate attestation needs and integrations |
| Offline evidence | Sigstore protobuf bundles and trusted roots | X.509 chain, signature, trust store/policy, and plugin requirements |
| Registry storage | OCI 1.1 referrers in current Cosign; legacy mode exists | OCI signature artifacts with referrers/fallback behavior per Notation version |

This comparison describes workflow emphasis, not an interoperability promise. A Cosign verifier should not be expected to validate a Notation signature, or vice versa, unless the exact implementation explicitly supports that format.

## Choose based on producer identity

Cosign keyless is compelling when release authority naturally maps to an OIDC workload identity: a protected GitHub Actions workflow, cloud workload identity, or private identity provider. It removes long-lived signing-key custody from the pipeline and adds public auditability.

Notation is compelling when the organization already operates an X.509 signing hierarchy, needs trust policies expressed through named trust stores, or depends on a registry/KMS/admission product with first-class Notary Project support.

Cosign with a KMS can also fit a certificate/key-centric enterprise. Notation plugins can integrate remote keys. Run a proof of concept with the actual HSM/KMS, workload identity, and incident process rather than choosing from a feature checklist.

## Choose based on the verifier

The runtime gate is decisive. Ask:

- Does the Kubernetes policy engine support the chosen signature type and identity semantics?
- Can it authenticate to private image and signature repositories?
- Can it express multiple signers, thresholds, attestations, and exceptions?
- Does it resolve tags to digests safely?
- Can it verify during registry or transparency-service outages?
- How are trust roots and policy updates distributed?

Current Kyverno image-verification documentation lists Sigstore Cosign and Notary signature types. Ratify is closely associated with Notary Project workflows. Managed cloud registries and Kubernetes services may expose one format more naturally than another. Validate supported versions and limitations in the official documentation for the specific product.

## Registry compatibility is more than “OCI-compatible”

Test:

1. pushing the signature artifact and all media types;
2. discovering it through native referrers or required fallback;
3. copying the image and signature to every promotion registry;
4. retention and garbage collection;
5. repository-scoped permissions;
6. multi-architecture indexes and child manifests;
7. offline backup and restore.

A registry can pull ordinary images successfully while mishandling attached signatures. Use disposable artifacts to test the complete lifecycle.

## Avoid a permanent dual-signing accident

Dual-signing with both formats can help during migration or serve consumers with different verifiers. It also doubles policy, key/identity operations, referrer handling, and incident response.

If dual-signing is required, define whether policy accepts either signature or requires both. Those are very different guarantees. Set an end date, track consumer migration, and verify both paths at every destination.

## Decision checklist

- [ ] Identify the authoritative producer: OIDC workflow identity or managed certificate/key.
- [ ] Test the real registry's referrers, fallback, retention, and mirroring behavior.
- [ ] Confirm KMS/HSM/plugin support with pinned tool versions.
- [ ] Prove the admission engine can express repository scope and signer identity.
- [ ] Include attestations, SBOMs, and offline requirements in the evaluation.
- [ ] Document trust-root distribution and key/identity incident response.
- [ ] Benchmark verification latency and dependency availability.
- [ ] Test multi-platform and separate-signature-repository cases.
- [ ] If migrating, define exact either/both semantics and an end date.

## Official Documentation

- [Sigstore Cosign project](https://github.com/sigstore/cosign)
- [Sigstore security model](https://docs.sigstore.dev/about/security/)
- [Notary Project container-image signing quickstart](https://notaryproject.dev/docs/quickstart-guides/quickstart-sign-image-artifact/)
- [Notary Project trust store and trust policy specification](https://github.com/notaryproject/specifications/blob/main/specs/trust-store-trust-policy.md)
- [Notary Project signing and verification workflow specification](https://github.com/notaryproject/specifications/blob/main/specs/signing-and-verification-workflow.md)
- [Notary Project plugin extensibility specification](https://github.com/notaryproject/specifications/blob/main/specs/plugin-extensibility.md)
- [Kyverno image verification overview](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/)

## Conclusion

Choose Cosign when Sigstore identity, transparency, bundles, and attestations align with your producer and verifier. Choose Notation when X.509 trust stores, Notary Project policies, plugins, and product integrations fit your operating model. The winning workflow is the one your registry preserves and your policy engine can enforce precisely from build through every deployment destination.
