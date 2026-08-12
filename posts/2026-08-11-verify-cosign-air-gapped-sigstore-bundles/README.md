# Verify Cosign Signatures Offline with Sigstore Bundles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cosign, Sigstore Bundles, Air Gap, Offline Verification, Supply Chain Security

Description: Prepare signed images, complete transparency evidence, trusted roots, and identity policy in a connected staging zone for repeatable disconnected Cosign verification.

---

Air-gapped verification is possible only if everything the verifier needs crosses the boundary in advance. For the keyless policy shown here, that includes the immutable artifact, bundle verification material (the signature, certificate, and required RFC 3161 timestamp and/or transparency entries), a trusted Sigstore root, and the expected signer identity and issuer.

A Sigstore bundle packages verification material so a client can validate log evidence without a live Rekor query. For registry images, Cosign can also save the image and its associated signatures to a local directory and verify that saved representation with `--local-image`.

## Separate the connected and disconnected zones

Use a controlled transfer station in the connected zone. It should:

1. resolve an approved image by digest;
2. verify it online against the production policy;
3. export the signed image and the signature and bundle artifacts supported by the pinned Cosign release;
4. obtain current trusted-root material through Sigstore's TUF process;
5. create a manifest with hashes of every transferred file;
6. move the package through the organization's approved import channel.

The disconnected verifier should never infer trust from “the file came on approved media.” It verifies the cryptographic evidence and the transfer manifest again.

## Pin and verify online first

The commands in this guide were validated with Cosign v3.1.3. In the connected zone:

```bash
IMAGE_REPO=registry.example.com/team/api
IMAGE_DIGEST=sha256:REPLACE_WITH_APPROVED_DIGEST
IMAGE="$IMAGE_REPO@$IMAGE_DIGEST"

cosign verify \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  "$IMAGE"
```

The digest should come from authenticated release metadata, ideally the build output. With Cosign v3.1.3, this local bundle workflow requires `$IMAGE_DIGEST` to identify a single image manifest, not a multi-platform OCI image index. Local verification of a saved image index is affected by [Cosign issue #4937](https://github.com/sigstore/cosign/issues/4937); for an index, sign and export each required platform manifest separately, or use a later release in which image-index support has been qualification-tested.

Online verification catches missing or malformed evidence before transfer and can provide an audit record when its output and exit status are retained. Offline verification remains required after transfer.

## Export the signed container image

Cosign's current command reference provides `cosign save` for saving a container image and associated signatures:

```bash
mkdir -p export/signed-image

cosign save \
  --dir export/signed-image \
  "$IMAGE"
```

If the source registry uses a private CA or credentials, give `cosign save` the documented registry options or authenticate first. In Cosign v3.1.3, `cosign save` cannot correctly fetch v3 bundle referrers redirected to a separate `COSIGN_REPOSITORY`; co-locate those referrers with the image, or use a later release in which that storage path has been qualification-tested.

Inspect the resulting directory and test local verification in a network-isolated container or host before approving export. Do not modify generated files; their digests and relationships matter.

## Export the trusted root

Cosign initializes Sigstore trust through TUF:

```bash
cosign initialize
```

The command uses an embedded initial root and retrieves current trusted certificate and key targets from the Sigstore TUF repository, writing updated material under the Cosign trust directory. Copy the current `trusted_root.json` target produced by this initialized environment into the export package:

```bash
cp "$TRUSTED_ROOT_PATH" export/trusted-root.json
```

Resolve `$TRUSTED_ROOT_PATH` from the pinned Cosign release and its initialized trust directory; avoid a fragile hard-coded user path in automation. For a private Sigstore deployment, initialize with its authenticated out-of-band root and mirror by using `--root` and `--mirror`. When `--root` is an HTTP(S) URL, also provide its independently obtained checksum with `--root-checksum`. Ensure that the private TUF repository publishes a `trusted_root.json` target; otherwise assemble one from independently trusted service material with `cosign trusted-root create` instead of assuming the file was produced.

The trusted root is a security-sensitive input. Record its source, the relevant TUF metadata versions, acquisition time, and file hash. A bare download over HTTPS is not equivalent to TUF's update and rollback protections.

## Transfer the policy, not only the evidence

Include a reviewed policy file outside attacker-controlled artifact metadata:

```text
imageRepository=registry.example.com/team/api
certificateIdentity=https://github.com/acme/api/.github/workflows/release.yml@refs/heads/main
certificateOidcIssuer=https://token.actions.githubusercontent.com
subjectDigest=sha256:REPLACE_WITH_APPROVED_DIGEST
```

Sign or otherwise authenticate the transfer manifest according to the organization's import procedure. The authenticated manifest must bind `imageRepository` and `subjectDigest` to the saved-image directory's file hashes; the v3 bundle subject contains the digest, but the source repository name remains an external authorization input. Include hashes for:

- every file in the saved image directory;
- `trusted-root.json`;
- identity and artifact policy;
- verifier and `jq` binaries and their version metadata, if transferred together;
- SBOMs and required attestations.

Do not derive the expected identity from the bundle being verified. That would let the producer choose its own authorization rule.

## Verify inside the air gap

Copy the export package into the disconnected environment, validate the transfer manifest, and run:

```bash
set -euo pipefail

# Load these values from the authenticated policy, not from the bundle.
EXPECTED_DIGEST=sha256:REPLACE_WITH_APPROVED_DIGEST

SAVED_DIGEST="$(
  jq -er '
    [.manifests[]
      | select(.annotations.kind == "dev.cosignproject.cosign/image")
      | .digest]
    | if length == 1 then .[0]
      else error("expected exactly one saved image manifest")
      end
  ' export/signed-image/index.json
)"

if [[ "$SAVED_DIGEST" != "$EXPECTED_DIGEST" ]]; then
  printf 'saved digest %s does not match approved digest %s\n' \
    "$SAVED_DIGEST" "$EXPECTED_DIGEST" >&2
  exit 1
fi

cosign verify \
  --local-image \
  --trusted-root export/trusted-root.json \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER" \
  export/signed-image
```

Load `$EXPECTED_IDENTITY` and `$EXPECTED_ISSUER` from the same authenticated policy. The `jq` check binds the saved OCI layout to its independently approved digest; Cosign then checks that the verified bundle subject matches that saved image. `--local-image` tells Cosign to interpret the positional target as the directory produced by `cosign save`. Confirm the syntax with `cosign verify --help` for the pinned release and test it in the qualification environment; air-gap procedures should never float across untested releases.

Cosign v3.1.3 does not require the deprecated `--offline` flag for this local-image form. Avoid copying commands from obsolete examples that combine deprecated or version-specific bundle switches.

For a standalone blob rather than a registry image, the bundle workflow is more direct:

```bash
# Connected signing
cosign sign-blob artifact.tar.gz \
  --bundle artifact.sigstore.json

# Disconnected verification
cosign verify-blob artifact.tar.gz \
  --bundle artifact.sigstore.json \
  --trusted-root trusted-root.json \
  --certificate-identity="$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer="$EXPECTED_ISSUER"
```

Do not present a blob signature over exported bytes as if it were the registry image signature; choose the verification model deliberately.

## Why expired Fulcio certificates can still verify

Fulcio certificates are short-lived. A verified RFC 3161 timestamp-or, for Rekor v1, a verified integrated time from the signed log entry-lets Cosign establish an observed time within the certificate chain's validity period. Rekor v2 entries do not provide an integrated time and therefore require signed timestamp material. Offline verification should not compare only the certificate expiration date with the current clock.

Keep the complete bundle/referrer and trusted root. A detached certificate and signature without acceptable trusted-time evidence may be insufficient after certificate expiry.

## Refresh trust without creating a back channel

Offline roots become stale as Sigstore authorities and log keys rotate. Establish a recurring, audited update procedure:

1. initialize trust on a patched connected verifier;
2. record TUF metadata and trusted-root hashes;
3. test old and new representative bundles;
4. approve and transfer the new root through the controlled channel;
5. retain prior roots and transfer records according to audit policy;
6. update the offline verifier only after validation.

The cadence should align with artifact imports and trust changes. Staleness may prevent verification of newer signatures, while an unauthenticated root update can compromise all verification.

## Air-gap checklist

- [ ] Use a pinned single-image-manifest digest, record its repository identity, and compare the imported layout with that approved digest.
- [ ] Verify online before export and offline after import.
- [ ] Export the image plus the supported signature and bundle artifacts with `cosign save`.
- [ ] Preserve complete Sigstore bundle/transparency material.
- [ ] Acquire trusted roots through TUF, not an unverified download.
- [ ] Transfer exact identity, issuer, repository, and subject-digest policy through a protected channel.
- [ ] Hash and authenticate every transferred file.
- [ ] Test commands with the exact pinned Cosign release.
- [ ] Never add transparency-ignore flags merely because the network is absent.
- [ ] Refresh trusted roots and verifier binaries through an audited process.

## Official Documentation

- [Cosign v3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [Cosign save command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_save.md)
- [Cosign verify command and local-image/trusted-root options](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md)
- [Cosign initialize and TUF trust bootstrap](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_initialize.md)
- [Cosign trusted-root creation](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_trusted-root_create.md)
- [Cosign sign-blob bundle reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign-blob.md)
- [Cosign verify-blob bundle reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify-blob.md)
- [Sigstore bundle protobuf specification](https://github.com/sigstore/protobuf-specs)
- [Sigstore client specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md)

## Conclusion

Air-gapped Cosign verification is a packaging and trust-distribution problem. Export the immutable signed single-image manifest, its complete bundle evidence, a current TUF-derived trusted root, and an independently protected identity and artifact policy; then verify the saved image locally. When every dependency and storage path is deliberate and release-tested, no live Rekor or registry connection is required for the decision.
