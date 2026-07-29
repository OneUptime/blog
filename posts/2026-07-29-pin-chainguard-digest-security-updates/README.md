# How to Pin Chainguard Images by Digest Without Missing Security Rebuilds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Container Image, Digest, Supply Chain Security, Image Management

Description: Combine immutable Chainguard digest pins with automated discovery, verification, testing, and promotion of frequent security rebuilds.

---

Digest pinning and security updates solve different problems:

- a digest makes one build reproducible and immutable;
- an update process moves the pin to a newer reviewed build.

Keeping a floating tag in production delegates the update moment to the next pull. Keeping one digest forever turns reproducibility into staleness. Use immutable deployments plus automated digest-update proposals.

## Pin with a readable tag hint

Resolve the desired tag:

```bash
docker pull cgr.dev/chainguard/python:latest
docker image inspect cgr.dev/chainguard/python:latest \
  --format '{{index .RepoDigests 0}}'
```

Then retain the tag as a human-readable hint and add the digest:

```dockerfile
FROM cgr.dev/chainguard/python:latest@sha256:REPLACE_WITH_DIGEST
```

For a Production version stream:

```dockerfile
FROM cgr.dev/example.com/python:3.13@sha256:REPLACE_WITH_DIGEST
```

At runtime, the digest wins. Container runtimes do not verify that the tag currently points to, or ever pointed to, that digest. Dependency-update tools can still use the tag as a hint for which stream to follow.

In Kubernetes:

```yaml
containers:
  - name: api
    image: cgr.dev/example.com/python:3.13@sha256:REPLACE_WITH_DIGEST
```

## Decide what the digest represents

A multi-platform tag resolves to an image-index digest. That index selects a platform manifest on each node. Pinning the index is useful for a deployment that supports both AMD64 and ARM64 while keeping one release identity.

A platform-manifest digest pins only one platform. Use it when the artifact policy is platform-specific and scheduling guarantees that architecture.

Record:

- repository and tag hint;
- index digest;
- expected platforms;
- platform-manifest digests;
- retrieval time.

This prevents an SBOM or signature for one architecture from being attached to another by mistake.

## Let automation discover new digests

Chainguard rebuilds Containers frequently to incorporate package and security updates. Configure Renovate, Dependabot where supported, or an internal registry job to:

1. resolve the tracked tag on a schedule;
2. compare it with the committed digest;
3. open a change containing the old and new digests;
4. attach tag history and package/CVE differences;
5. run the normal build and test suite;
6. stop before production promotion if policy fails.

Do not let the discovery job edit a running production object directly. A pull request or release candidate creates an auditable review point and allows rollback.

## Verify before testing

Verify that the candidate is signed by the expected Chainguard identity:

```bash
cosign verify \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --certificate-identity=https://github.com/chainguard-images/images/.github/workflows/release.yaml@refs/heads/main \
  cgr.dev/chainguard/python@sha256:NEW_DIGEST
```

Organization Production Containers use the organization's documented `catalog_syncer` or `apko_builder` identity instead.

Then retrieve the correct architecture-specific SBOM and check policy. Signature verification authenticates origin; it does not replace vulnerability or compatibility testing.

## Diff the old and new artifacts

Use immutable references:

```bash
chainctl images diff \
  cgr.dev/chainguard/python@sha256:OLD_DIGEST \
  cgr.dev/chainguard/python@sha256:NEW_DIGEST \
  --platform linux/amd64 \
  --output markdown
```

`chainctl images diff` compares SBOM packages and vulnerability scans and requires Grype on `PATH`. Repeat for every deployed platform.

Review:

- primary language or application version;
- added, removed, and upgraded APKs;
- libc, TLS, CA certificate, and timezone changes;
- entrypoint, user, environment, and port metadata;
- fixed and newly reported vulnerabilities;
- image size and platform coverage.

A changed digest proves that the referenced manifest or index bytes changed, but not necessarily that package or application contents changed. Unchanged application source does not prove a base rebuild is behaviorally identical.

## Test and promote

Use risk-proportionate gates:

```text
signature and attestation policy
        |
SBOM and vulnerability policy
        |
build plus unit and integration tests
        |
architecture-specific smoke tests
        |
staging and canary
        |
production digest promotion
```

Test TLS connections, DNS, native modules, file ownership, health probes, and graceful shutdown. These areas commonly reveal base-runtime changes that a unit test misses.

Promote the exact tested digest. Do not rebuild between staging and production and assume the new output is equivalent.

## Set an update objective

Track digest age and update latency. For example, policy can require:

- a daily check for new candidate digests;
- expedited review for a critical exploitable advisory;
- a normal update window for routine rebuilds;
- an explicit exception with owner and expiry when a candidate fails compatibility tests.

The exact timing depends on the workload and Chainguard support agreement. The key is that every pin has an active owner and update path.

Retain the previously deployed digest and its evidence for rollback. A rollback restores service, but it can also restore a vulnerability, so keep remediation work active.

## Avoid common mistakes

- `imagePullPolicy: Always` does not update a digest reference. It only pulls that same immutable content.
- Mirroring a digest into an internal registry does not make it receive later upstream fixes.
- Pinning only the builder but not the runtime leaves part of the supply chain mutable.
- Updating the tag text while leaving the digest unchanged does not change the artifact.
- Scanning only AMD64 is insufficient when ARM64 is also deployed.
- An old semantic version can still receive rebuilds if it is a supported stream, while an EOL stream may stop receiving them. Check current lifecycle data.

Digest pins provide the control point. Automation, evidence, and promotion policy provide the security-update flow.

## Official Documentation

- [Considerations for keeping Chainguard Containers up to date](https://edu.chainguard.dev/chainguard/chainguard-images/staying-secure/updating-images/considerations-for-image-updates/)
- [How to use Chainguard Containers by digest](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/how-to-use-chainguard-images/)
- [Unique tags and digest immutability](https://edu.chainguard.dev/chainguard/chainguard-images/features/unique-tags/)
- [Compare Chainguard Containers with chainctl](https://edu.chainguard.dev/chainguard/chainctl-usage/comparing-images/)
