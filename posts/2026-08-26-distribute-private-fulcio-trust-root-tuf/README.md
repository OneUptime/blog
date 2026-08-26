# How to Distribute a Private Fulcio Trust Root to Cosign Clients with TUF

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Cosign, Sigstore, TUF, TrustedRoot, Private PKI, Trust Distribution

Description: Package private Fulcio, CT, Rekor, and timestamp verification material into Sigstore trust targets, publish them through TUF, bootstrap Cosign out of band, and rotate safely.

---

The Update Framework (TUF) is the right place to distribute a private Fulcio root because it authenticates changes, detects rollback and freeze conditions through versioned expiring metadata, and separates the long-lived trust bootstrap from online target publication.

Do not publish only `fulcio-root.pem`. Modern keyless Cosign verification needs a Sigstore `TrustedRoot` containing the Fulcio certificate authority plus the CT, Rekor, and/or timestamp authority verification material used by your signing design. Cosign v3 also consumes a separate `SigningConfig` that identifies the private service endpoints used while signing.

## Separate the Three Trust Objects

Keep these concepts distinct:

| Object | Purpose | Secret? |
| --- | --- | --- |
| TUF `root.json` | bootstraps TUF role keys, thresholds, and consistent update rules | public, but must be delivered authentically |
| `trusted_root.json` target | Fulcio CA chains, CT/Rekor public keys, TSA chains, URLs, origins, validity intervals | public and security-critical |
| `signing_config.json` target | Fulcio, Rekor, TSA, and OIDC service endpoints plus selection thresholds | public configuration |

The TUF root does not contain the Fulcio root directly. It authorizes TUF metadata that authenticates the `trusted_root.json` target.

Sigstore's public-good instance uses the same pattern in the official `root-signing` repository. A private deployment needs its own TUF root keys and initial root; do not copy the public repository's signing keys or treat its embedded Cosign root as authorization for your private mirror.

## Inventory the Complete Private Trust Domain

Collect reviewed public material from each component:

- Fulcio signer-to-root chain, with the offline root last;
- CT log public key, exact log URL/origin, and the time interval in which that key is trusted;
- Rekor public key and service metadata for every log version in the signing design;
- RFC 3161 timestamp-authority chain if used; and
- planned service start and end times.

Verify each fingerprint out of band against its component ceremony or deployment record. The live Fulcio `/api/v2/trustBundle` endpoint is useful for comparison but is not a safe bootstrap source by itself: trusting whatever the service currently returns would let a compromised endpoint nominate its own root.

## Create the Sigstore `TrustedRoot`

Current Cosign can construct the protobuf JSON target. For a private stack using Fulcio, one CT log, and Rekor v1:

```bash
cosign trusted-root create \
  --no-default-fulcio \
  --no-default-ctfe \
  --no-default-rekor \
  --no-default-tsa \
  --fulcio='url=https://fulcio.example.com,certificate-chain=fulcio-ca-chain.pem,start-time=2026-08-01T00:00:00Z' \
  --ctfe='url=https://ct.example.com/acme-2026,public-key=ct-public-key.pem,start-time=2026-08-01T00:00:00Z,origin=acme-2026' \
  --rekor='url=https://rekor.example.com,public-key=rekor-public-key.pem,start-time=2026-08-01T00:00:00Z,origin=rekor.example.com' \
  --out trusted_root.json
```

Use values from the deployed services, not the placeholders. Add a `--tsa` entry when the signing configuration relies on an RFC 3161 authority. Rekor v2 uses a separate timestamp authority for time evidence; do not assume its log integration time has Rekor v1 semantics.

Validate the media type and structure:

```bash
jq -e '
  .mediaType == "application/vnd.dev.sigstore.trustedroot+json;version=0.1" and
  (.certificateAuthorities | length) > 0
' trusted_root.json
```

Inspect every base64-encoded certificate/key and validity interval through a Sigstore-aware parser or a pinned test client. Syntactically valid protobuf JSON can still contain the wrong root or CT key.

## Create the Signing Configuration

Signing hosts also need to know which private services to call. A current Cosign v3 example is:

```bash
cosign signing-config create \
  --no-default-fulcio \
  --no-default-rekor \
  --no-default-tsa \
  --no-default-oidc \
  --fulcio='url=https://fulcio.example.com,api-version=1,start-time=2026-08-01T00:00:00Z,operator=example.com' \
  --rekor='url=https://rekor.example.com,api-version=1,start-time=2026-08-01T00:00:00Z,operator=example.com' \
  --rekor-config=ANY \
  --out signing_config.json
```

Add a private OIDC provider entry if Cosign should perform an interactive flow, and add TSA service entries plus `--tsa-config` when applicable. Workload signers that supply an identity token directly may not need an interactive provider in this file.

`SigningConfig` endpoints are not trust anchors. The `TrustedRoot` supplies verification keys and certificates. Publish both targets so signers and verifiers agree on one versioned service design.

## Build a Real TUF Repository

Use a maintained TUF repository writer such as `go-tuf`, `python-tuf`, or Sigstore's `tuf-on-ci` workflow. The exact administration commands depend on that implementation, but the repository must publish at least:

```text
metadata/
  N.root.json
  targets.json
  snapshot.json
  timestamp.json
targets/
  trusted_root.json
  signing_config.json
```

Use threshold/offline keys for the root role and a carefully scoped online key for timestamp metadata. Set expirations so timestamp and snapshot can be renewed operationally while a lost maintainer cannot freeze clients indefinitely. Enable consistent snapshots if supported, protect rollback state, publish atomically, and monitor metadata expiry.

The target filenames matter to current Cosign. During `cosign initialize`, it first tries to cache `signing_config.json`, then creates a live trusted root from `trusted_root.json`; it falls back to older individual target names only when the consolidated trusted root is missing.

Sigstore's `root-signing` repository is a production operational reference, not a template whose keys can be reused. Sigstore `scaffolding` can create a test stack and TUF root, but its repository describes itself as integration/e2e scaffolding. Build a reviewed key ceremony and publication process for production.

## Bootstrap Each Cosign Trust Domain Out of Band

Deliver the initial versioned TUF root through a controlled channel such as a managed machine image, configuration-management package, signed installer, or manually verified ceremony artifact. Then initialize:

```bash
export TUF_ROOT=/var/lib/sigstore/tuf/example-production

cosign initialize \
  --root /etc/sigstore/example-production/1.root.json \
  --mirror https://tuf.example.com
```

If `--root` is an HTTP(S) URL, current Cosign supports `--root-checksum`; deliver that checksum independently. Fetching both the root and checksum from the same unauthenticated location is not an out-of-band bootstrap.

`cosign initialize` clears the selected cache path before recreating it. Never point `TUF_ROOT` at a directory containing unrelated files. Use a dedicated cache for each environment:

```text
/var/lib/sigstore/tuf/example-production
/var/lib/sigstore/tuf/example-staging
/var/lib/sigstore/tuf/sigstore-public
```

This prevents `cosign initialize --staging`, a private initialization, or production initialization from overwriting another environment's cached metadata.

Passing a private `--mirror` without its private `--root` is not enough. Cosign otherwise starts with the root embedded for the public-good repository, which cannot authenticate an unrelated private repository.

## Verify a Private Bundle

Use Cosign v3's standardized bundle and exact identity policy:

```bash
export TUF_ROOT=/var/lib/sigstore/tuf/example-production

cosign verify \
  --certificate-identity='https://github.com/example/widget/.github/workflows/release.yml@refs/heads/main' \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com' \
  registry.example.com/widget@sha256:DIGEST
```

For an explicit, immutable verification job, retrieve the authenticated `trusted_root.json` target with the pinned TUF client and pass it as `--trusted-root` together with a Sigstore bundle. Do not replace TUF verification with `curl` from the mirror.

Test negative boundaries:

- public Cosign trust rejects the private certificate;
- private production trust rejects public and staging certificates unless intentionally combined;
- a wrong CT or Rekor key fails the corresponding proof;
- expired TUF metadata fails updates;
- rollback to an older snapshot is rejected; and
- an unapproved SAN or issuer fails even when the cryptography is valid.

Trust material answers “which infrastructure may attest”; identity policy still answers “which signer may release this artifact.”

## Rotate Service Material Through Targets

For a Fulcio intermediate or CT/Rekor key rotation:

1. add the new public material with a correct start time while retaining the old material and its historical interval;
2. generate a new `trusted_root.json`;
3. update and sign targets, snapshot, and timestamp metadata;
4. publish and confirm clients update before switching the signing service;
5. move signers to the new service key/certificate; and
6. set an end time for material that must no longer authorize new events while preserving historical verification.

Do not delete old public keys merely because their private signing key is disabled. Bundles created during an old key's trusted interval still need verification material.

TUF root-key rotation is different. Follow the TUF specification's sequential root update rules: the next root must satisfy the old root's threshold and the new root's threshold, versions must advance one at a time, and clients must be able to walk the chain. Rehearse recovery from an expired or unavailable online role before production.

## Official Documentation

- [Cosign custom components and private trust](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Cosign `initialize` command](https://github.com/sigstore/cosign/blob/main/doc/cosign_initialize.md)
- [Cosign `trusted-root create` command](https://github.com/sigstore/cosign/blob/main/doc/cosign_trusted-root_create.md)
- [Cosign `signing-config create` command](https://github.com/sigstore/cosign/blob/main/doc/cosign_signing-config_create.md)
- [Sigstore trusted-root and signing-config protobuf](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_trustroot.proto)
- [Sigstore root-signing TUF repository](https://github.com/sigstore/root-signing)
- [Sigstore security model and TUF trust root](https://docs.sigstore.dev/about/security/)
- [The Update Framework specification](https://theupdateframework.github.io/specification/latest/)
- [Sigstore scaffolding private TUF example](https://github.com/sigstore/scaffolding/blob/main/getting-started.md)

## Conclusion

Bootstrap a private TUF root out of band, publish consolidated `trusted_root.json` and `signing_config.json` targets, and keep environment caches separate. TUF then gives Cosign authenticated, rollback-resistant updates for the entire private Sigstore trust domain—not just one Fulcio PEM file.
