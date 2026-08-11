# Cosign Signature vs Attestation vs SBOM: What Does Each One Prove?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Attestations, SBOM, Sigstore, Supply Chain Security

Description: Separate artifact identity, signed statements, and software inventory so that Cosign verification policies demand the right evidence for each security question.

---

A signature, an attestation, and a software bill of materials are related supply-chain artifacts, but they answer different questions. Treating them as interchangeable creates policies that appear strict while proving much less than intended.

At a high level, a Cosign image signature binds a signer to an image digest, an attestation binds a signer to a structured statement about a subject, and an SBOM inventories components. An SBOM may be stored or signed in several ways; the inventory itself is not automatically trustworthy.

## Cosign image signature: who authorized this digest?

`cosign sign` creates a cryptographic signature over a payload tied to the container manifest digest:

```bash
IMAGE=registry.example.com/team/api@sha256:REPLACE_WITH_DIGEST
cosign sign --yes "$IMAGE"
```

Keyless verification checks the expected identity and OIDC issuer:

```bash
cosign verify \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "$IMAGE"
```

With an appropriate trust policy, success establishes that an authorized signer signed a payload bound to that digest and that the required certificate, trusted-time, and transparency checks passed. It detects content substitution because a different manifest has a different digest.

It does not describe how the image was built, which source commit it came from, which packages it contains, or whether a scanner found vulnerabilities. Optional signature annotations are signed key/value metadata, but they are not a general provenance schema and should not replace purpose-built attestations.

## Attestation: who made this structured claim?

Cosign attestations use the in-toto statement model and DSSE signing. A statement names one or more subjects by digest and contains a `predicateType` plus a predicate with domain-specific facts.

Examples include build provenance, vulnerability scan results, test results, and an SBOM reference. Create one from a reviewed predicate:

```bash
cosign attest \
  --yes \
  --predicate provenance.json \
  --type slsaprovenance1 \
  "$IMAGE"
```

Verification has two separate stages:

```bash
cosign verify-attestation \
  --certificate-identity="$EXPECTED_BUILDER_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  --type slsaprovenance1 \
  "$IMAGE" > verified-attestations.json
```

First, cryptographic verification establishes who signed the statement and that it targets the subject. Second, policy must evaluate the predicate: expected builder, source repository, commit, build parameters, completeness, scan time, or other requirements.

A validly signed statement can contain false or insufficient claims if the signer is compromised or the predicate is weak. Trust the relevant authority for that statement. The release signer, build service, and vulnerability scanner do not necessarily have the same authority.

## SBOM: what components are reported?

An SBOM is an inventory in a format such as SPDX or CycloneDX. It may list packages, versions, file hashes, licenses, and dependency relationships. The exact fields depend on format and generation method.

An SBOM answers “What did this generator report is present?” It does not inherently prove:

- that the inventory describes this exact image digest;
- that the generator examined all layers correctly;
- that every dependency was identified;
- that the listed components are vulnerability-free;
- that the document has not been modified.

Integrity and subject binding require a signature or signed attestation. Accuracy still depends on the trusted generator and process.

## Three ways to distribute an SBOM

### 1. Store the SBOM as its own OCI artifact

Attach an SBOM file as a referrer with an appropriate artifact/media type using an OCI tool, then sign the SBOM artifact itself. This keeps a large document separately retrievable and gives it its own digest.

Conceptually:

```text
image digest <- SBOM artifact digest <- SBOM signature
```

Policy must validate both the SBOM's association with the image and the signature on the SBOM artifact.

### 2. Attest a digest and location

Create a small predicate containing the SBOM artifact digest and location, then sign it with `cosign attest`. Sigstore's documentation recommends this style over placing an entire large SBOM in an attestation because verification otherwise downloads the complete SBOM whenever it verifies the attestation.

Example predicate:

```json
{
  "sbom": {
    "uri": "oci://registry.example.com/team/api-sbom@sha256:REPLACE",
    "digest": "sha256:REPLACE"
  },
  "format": "spdx-json"
}
```

Use an organization-defined predicate type URI and publish its schema. Verification must fetch the referenced document, compare its digest, and validate its signature if policy requires one.

### 3. Put the SBOM in an attestation predicate

Cosign supports SPDX and CycloneDX predicate types. This provides direct signed subject binding, but large predicates increase storage and verification transfer. Current Sigstore documentation says SBOM predicate types are not recommended when they force the entire SBOM to be downloaded for every verification. Use the documented approach suitable for your scale and verifier.

## Compare the evidence

| Evidence | Primary question | Cryptographically binds subject? | Contains component inventory? | Needs content policy? |
| --- | --- | --- | --- | --- |
| Image signature | Who signed/authorized this image digest? | Yes | No | Identity/key authorization |
| Attestation | Who asserted these structured facts about this digest? | Yes | Only if predicate contains or references one | Yes, predicate semantics |
| Unsigned SBOM | What components did the document report? | Not by itself | Yes | Integrity, subject, generator, completeness |
| Signed SBOM artifact | Who signed this exact SBOM document? | To the SBOM digest; image link must also be checked | Yes | Image association and inventory policy |

The table is a trust-model summary, not a claim that every storage representation behaves identically.

## A practical release evidence set

A mature release might require:

1. a release signature from the protected publishing workflow;
2. SLSA provenance signed by the trusted build platform;
3. an SBOM generated for the exact image digest and signed or digest-bound by an attestation;
4. a vulnerability assessment signed by the approved scanner;
5. policy checks on each predicate's contents and freshness.

Use different expected identities when different systems are authoritative. Requiring five artifacts all signed by a compromised release job is not the same as independent evidence from a builder, scanner, and release approver.

## Evidence-design checklist

- [ ] Pin every subject with an immutable digest.
- [ ] State the security question each artifact must answer.
- [ ] Authorize the signer appropriate for that question.
- [ ] Verify attestation predicate type and subject, then evaluate predicate contents.
- [ ] Give every external SBOM a digest and verify its image association.
- [ ] Choose SPDX or CycloneDX fields required by downstream tools.
- [ ] Do not treat an SBOM as a vulnerability scan or a signature as provenance.
- [ ] Copy the complete OCI referrer graph during promotion.
- [ ] Reevaluate time-sensitive scan claims as databases and policy change.
- [ ] Preserve bundles and trusted roots for required offline verification.

## Official Documentation

- [Cosign specifications for signatures, SBOMs, and predicates](https://docs.sigstore.dev/cosign/system_config/specifications/)
- [Sigstore in-toto attestation verification](https://docs.sigstore.dev/cosign/verifying/attestation/)
- [Sigstore guidance for signing SBOMs and other artifact types](https://docs.sigstore.dev/cosign/signing/other_types/)
- [in-toto Attestation Framework](https://github.com/in-toto/attestation)
- [SPDX specifications](https://spdx.dev/use/specifications/)
- [CycloneDX specification](https://cyclonedx.org/specification/overview/)

## Conclusion

A signature authorizes an artifact digest, an attestation signs a structured claim about a subject, and an SBOM reports an inventory. Secure policy composes them: verify the right signer for each artifact, validate subject binding, and evaluate the statement or inventory itself. No single one replaces the others.
