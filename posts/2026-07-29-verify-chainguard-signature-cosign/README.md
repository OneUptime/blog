# How to Verify a Chainguard Image Signature with Cosign

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Cosign, Image Signing, Supply Chain Security, Container Image

Description: Verify public and organization-specific Chainguard Container signatures by enforcing the expected OIDC issuer and signer identity.

---

Signature verification should answer two questions:

1. Does the signature bind to the image digest being used?
2. Was its short-lived certificate issued to the Chainguard identity expected for this repository?

Running `cosign verify` without an identity policy, or accepting any keyless signer, does not establish that the image came from Chainguard.

## Pin the artifact being verified

A tag such as `:latest` can move between resolution and deployment. Resolve it to a digest and use the digest through verification and promotion:

```bash
docker pull cgr.dev/chainguard/go:latest
docker image inspect cgr.dev/chainguard/go:latest \
  --format '{{index .RepoDigests 0}}'
```

Save the resulting `cgr.dev/chainguard/go@sha256:...` reference:

```bash
IMAGE=cgr.dev/chainguard/go@sha256:REPLACE_WITH_RESOLVED_DIGEST
```

For a multi-platform tag, be clear whether policy pins the image-index digest or an individual platform manifest. Verify the same reference the deployment will use.

## Verify a public Chainguard Container

Chainguard's current public verification policy uses GitHub Actions' token service as the OIDC issuer and the public image release workflow as the exact certificate identity:

```bash
cosign verify \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --certificate-identity=https://github.com/chainguard-images/images/.github/workflows/release.yaml@refs/heads/main \
  "$IMAGE"
```

Cosign exits nonzero if it cannot find at least one signature whose certificate chain, claims, transparency-log evidence, OIDC issuer, and identity satisfy the policy.

If formatting the output with `jq` in CI, preserve the verifier's exit status:

```bash
set -o pipefail

cosign verify \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --certificate-identity=https://github.com/chainguard-images/images/.github/workflows/release.yaml@refs/heads/main \
  "$IMAGE" \
  | jq .
```

Without `pipefail`, a successful `jq` invocation can mask a failed `cosign` process.

The signer identity is a policy value, not a string to guess permanently. Check Chainguard's current verification documentation when building a new policy.

## Verify an organization Production Container

Production Containers live under an organization's repository and use Chainguard-managed identities inside that organization. Chainguard documents two:

- `catalog_syncer` for images imported from the Chainguard catalog;
- `apko_builder` for organization customizations such as Custom Assembly.

Retrieve their UID paths:

```bash
PARENT=example.com

CATALOG_SYNCER="$(
  chainctl iam account-associations describe "$PARENT" -o json \
    | jq -r '.[].chainguard.service_bindings.CATALOG_SYNCER'
)"

APKO_BUILDER="$(
  chainctl iam account-associations describe "$PARENT" -o json \
    | jq -r '.[].chainguard.service_bindings.APKO_BUILDER'
)"
```

Authenticate to the private registry, resolve its digest, then verify:

```bash
IMAGE=cgr.dev/example.com/python@sha256:REPLACE_WITH_RESOLVED_DIGEST

cosign verify \
  --certificate-oidc-issuer=https://issuer.enforce.dev \
  --certificate-identity-regexp="^https://issuer\.enforce\.dev/(${CATALOG_SYNCER}|${APKO_BUILDER})$" \
  "$IMAGE"
```

Use the UID paths returned for the organization. Do not replace the anchored expression with `.*`, as that would trust unrelated identities issued by the same OIDC issuer.

## Read the verification result

Cosign returns one or more verified signature payloads. Confirm:

- the image digest in the claim matches the pinned reference;
- the certificate's OIDC issuer claim matches the policy;
- the certificate subject matches the expected public workflow or organization identity;
- transparency-log verification was performed as required by the policy;
- the command exited successfully.

Do not parse a human-readable success phrase while ignoring the exit code.

## Verify attestations separately

An image signature authenticates the referenced image index or manifest. An SBOM or provenance statement is a separate signed attestation and needs its own verification:

```bash
cosign verify-attestation \
  --type https://spdx.dev/Document \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --certificate-identity=https://github.com/chainguard-images/images/.github/workflows/release.yaml@refs/heads/main \
  "$IMAGE"
```

Select the correct platform when retrieving an architecture-specific SBOM. Do not assume that verifying an image signature automatically validates every attached attestation's predicate or contents.

## Enforce verification before deployment

A manual command is useful for diagnosis, but production control should be repeatable. Options include:

- verifying during artifact intake and mirroring only approved digests;
- using Sigstore Policy Controller in Kubernetes;
- using an admission policy in Kyverno or another supported policy engine;
- storing the verified digest in deployment configuration;
- rejecting mutable tag-only references.

Chainguard publishes Policy Controller examples for public images. Private images require the organization-specific signer identities.

## Know what a valid signature does not prove

A successful signature confirms origin and integrity under the specified identity policy. It does not prove:

- the image has no vulnerabilities;
- the application is correctly configured;
- the signer is authorized by your organization unless your policy says so;
- the tag still points to the verified digest;
- application layers added later are signed by Chainguard.

Verify the final artifact from the party responsible for it, then apply SBOM, vulnerability, configuration, and runtime policies separately.

## Official Documentation

- [Verify Chainguard Containers with Cosign](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/verifying-chainguard-images-and-metadata-signatures-with-cosign/)
- [Sigstore Cosign verification](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Verify signed Chainguard Containers with Policy Controller](https://edu.chainguard.dev/open-source/sigstore/policy-controller/policies/using-policy-controller-to-verify-signed-chainguard-images/)
- [Chainguard registry overview](https://edu.chainguard.dev/chainguard/chainguard-images/chainguard-registry/overview/)
