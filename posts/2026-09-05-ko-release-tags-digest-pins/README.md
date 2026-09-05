# How to Tag ko Images for Releases While Keeping Digest-Pinned Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Container Image, Versioning, Deployment, OCI

Description: Publish useful release and commit tags with ko while rendering immutable digest references for every deployed workload.

---

Tags and digests solve different problems. A tag such as `v2.7.0` is easy for people, release tools, and retention policies to find. A digest such as `sha256:...` identifies exact content. `ko` can publish one image under useful tags while returning a reference that includes its digest.

The reliable pattern is: tag for discovery, deploy by digest.

## Validate the Release Inputs

Run the release commands in a Bash script that stops on failure, starting from a clean, known Git state:

```bash
set -euo pipefail

version=v2.7.0
commit=$(git rev-parse HEAD)
short_commit=$(git rev-parse --short=12 HEAD)

test "$(git status --porcelain)" = ""
test "$(git rev-parse --verify "refs/tags/$version^{commit}")" = "$commit"
```

The second check expects an existing lightweight or annotated Git tag whose peeled commit is `HEAD`. Verify an annotated tag's signature separately when that is part of release policy, and account for CI systems that check out synthetic merge commits. Validate that the version matches the project's version syntax before passing it to registry commands.

## Publish Multiple Tags in One Build

Set the repository prefix and repeat `--tags`:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/services
mkdir -p dist

ko build ./cmd/api \
  --tags="$version" \
  --tags="$short_commit" \
  --image-refs=dist/api-image.txt
```

The version and short commit tags point to the same image manifest or multi-platform index. Because this command supplies more than one tag, `ko` 0.19.1 returns an unambiguous digest-only reference:

```text
registry.example.com/acme/services/api-...@sha256:...
```

With exactly one explicit non-`latest` tag, the returned form includes both that tag and the digest. Keep `dist/api-image.txt` as a build artifact. Do not reconstruct the digest from console output or ask the registry what a tag means later; the tag may have moved by then.

## Resolve Kubernetes YAML with the Release Tag

Source manifests can keep `ko://` references:

```yaml
containers:
  - name: api
    image: ko://example.com/acme/api/cmd/api
```

Render a release artifact. `ko resolve` builds and publishes the referenced packages; it does not reuse `dist/api-image.txt`. Use it as an alternative to the standalone build above, and test the digest it emits. To deploy an already tested build, insert its recorded digest reference into the manifests instead of rebuilding with `ko resolve`:

```bash
ko resolve -f config/ \
  --tags="$version" \
  --tags="$short_commit" \
  --image-refs=dist/images.txt \
  > dist/release.yaml
```

Inspect the result:

```bash
rg 'image:' dist/release.yaml
kubectl apply --server-side --dry-run=server -f dist/release.yaml
```

The resolved reference should contain `@sha256:`. With both release and commit tags requested, version 0.19.1 omits a tag from the resolved canonical reference because neither tag is uniquely preferred; Kubernetes uses the explicit digest.

## Avoid `--tag-only` for Normal Deployments

`--tag-only` tells `ko` to emit tags without digests. It exists for systems that cannot preserve digest-qualified references, but it gives up immutability:

```bash
# Use only for a destination with a documented digest limitation.
ko resolve --tag-only --tags="$version" -f config/
```

If another tool strips `@sha256` during promotion, fix or configure that tool when possible. A deployment specification containing only a tag can select different content when Pods restart after the tag moves.

Current `ko` also requires tag-only publication to use exactly one non-`latest` tag. Supplying several tags or retaining the default `latest` is rejected rather than producing an ambiguous tag-only reference.

## Enforce Tag Immutability in the Registry

Enable immutable tags where the registry supports them, especially for semantic versions. Then a second push of different content to `v2.7.0` fails instead of silently rewriting release history.

Commit tags are useful but are not content identities. The same Git commit can produce different images when the Go version, base image, build flags, generated files, or build environment changes. A digest captures the resulting image; provenance explains how it was produced.

Avoid using `latest` as a release input. `ko` uses `latest` as its default tag, but an explicit release workflow should supply explicit tags and should not deploy by `latest`.

## Promote the Digest, Not a Rebuild

If staging and production use different registries, copy the already tested digest rather than rebuilding the same commit. Registry-aware copy tools can preserve a multi-platform index and all child manifests. Record the destination digest and verify whether the registry preserved it; transformations or media-type conversion can change digest values.

A promotion flow is:

```text
ko build -> staging digest -> tests -> registry copy -> production digest -> deploy
```

It is not:

```text
ko build staging -> tests -> ko build production again
```

The second flow tests one artifact and deploys another.

## Handle Multi-Platform Releases

For amd64 and arm64:

```bash
index_ref=$(
  ko build ./cmd/api \
    --platform=linux/amd64,linux/arm64 \
    --tags="$version" \
    --image-refs=dist/api-image.txt
)
printf '%s\n' "$index_ref" > dist/api-index.txt
```

The command's standard-output value is the top-level index reference. In 0.19.1, `--image-refs` records the index and its platform children, so the last line is not a safe way to choose the index. Ensure any copy, signing, or retention tool operates on `index_ref` recursively. Retagging only the amd64 child produces a release tag that fails on arm64 nodes.

## Roll Back with a Recorded Digest

Store the digest-bearing image reference with deployment metadata. A rollback then selects an earlier immutable artifact:

```bash
kubectl -n payments set image deployment/api \
  api=registry.example.com/acme/services/api-...:v2.6.4@sha256:OLD_DIGEST
```

Confirm the registry retention policy has not garbage-collected it. A tag list is not a rollback ledger; tags may be deleted or moved.

Kubernetes records rollout revisions of Pod templates, but external release records should retain image digests, configuration versions, and migration compatibility as well.

## Verify Before Deployment

At release time, assert all views agree:

1. `ko` completed successfully and wrote the image reference file.
2. Every reference includes `@sha256:`.
3. Registry inspection shows the release and commit tags on the expected digest.
4. If version and commit metadata are configured in the binary and OCI labels, they report the expected values. `--tags` does not set these; configure binary metadata through the application's build settings and labels through `--image-label`.
5. Multi-platform releases contain every supported architecture.
6. The resolved Kubernetes YAML passes policy and server-side dry-run.

Sign the digest or attach attestations according to the organization's supply-chain policy. A tag signature is meaningful only through the digest it resolves to at verification time.

## Conclusion

Use release and commit tags as convenient pointers, but make the digest emitted by `ko` the artifact that crosses approval, promotion, deployment, and rollback boundaries. Avoid `--tag-only`, enforce immutable release tags, and copy tested indexes rather than rebuilding them. This keeps readable releases without making runtime identity mutable.

## Official Documentation

- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [ko: `ko resolve` Reference](https://ko.build/reference/ko_resolve/)
- [ko: Kubernetes Integration](https://ko.build/features/k8s/)
- [Kubernetes: Image Names and Digests](https://kubernetes.io/docs/concepts/containers/images/#image-names)
- [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
