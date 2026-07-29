# How to Inspect Chainguard Tag History and See What Changed Between Rebuilds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Container Image, Image Management, SBOM, Debugging

Description: Trace a mutable Chainguard tag to earlier digests, view its changelog, and compare packages and vulnerabilities between two rebuilds.

---

Chainguard tags can move when a Container is rebuilt with updated packages. A digest identifies one immutable build, while tag history records the sequence of digests to which a tag pointed.

To answer why a rebuild changed behavior:

1. identify the old and new digests;
2. select the same platform for both;
3. verify both artifacts;
4. compare configuration, SBOM packages, and vulnerability results;
5. test the smallest plausible change.

## View history with `chainctl`

For an organization Production Container:

```bash
ORGANIZATION=example.com
IMAGE=python
TAG=3.13

chainctl images history \
  "$IMAGE:$TAG" \
  --parent="$ORGANIZATION"
```

The output is reverse chronological and can include:

- update time;
- image-index digest;
- architecture-specific manifest digests;
- platform image sizes.

If the repository is not multi-platform, architecture details may be absent.

Save two immutable references:

```bash
OLD=cgr.dev/example.com/python@sha256:OLD_DIGEST
NEW=cgr.dev/example.com/python@sha256:NEW_DIGEST
```

Do not run a comparison using the same mutable tag twice. It can resolve to the same current digest both times and lose the historical artifact you intended to inspect.

## Use the human-readable changelog

Current `chainctl` versions provide a changelog command:

```bash
chainctl images changelog \
  cgr.dev/chainguard/nginx:latest \
  --depth 5 \
  --platform linux/amd64 \
  --output table
```

It fetches tag history and summarizes changes between builds in a form similar to a source-control log. JSON output is useful for automation:

```bash
chainctl images changelog \
  cgr.dev/chainguard/nginx:latest \
  --depth 10 \
  --platform linux/arm64 \
  --output json \
  > nginx-arm64-changelog.json
```

Specify the platform. An index update can affect one architecture differently from another.

## Compare two builds

`chainctl images diff` compares SBOM packages by package URL and runs Grype vulnerability scans:

```bash
chainctl images diff \
  "$OLD" \
  "$NEW" \
  --platform linux/amd64 \
  --output markdown \
  > image-diff.md
```

Grype must be installed and available on `PATH`. By default, current `chainctl` focuses on APK package URLs; use the documented `--artifact-types` option when another ecosystem is relevant.

Review:

- packages added and removed;
- version changes;
- new and resolved findings;
- changes to core libraries such as glibc and OpenSSL;
- whether the primary application or language version moved.

Vulnerability results are time-sensitive because Grype's database changes. Store the tool and database versions with the diff.

## Compare image configuration

An SBOM diff does not show every behavioral setting. Inspect both manifests:

```bash
docker pull --platform linux/amd64 "$OLD"
docker image inspect "$OLD" > old-inspect.json

docker pull --platform linux/amd64 "$NEW"
docker image inspect "$NEW" > new-inspect.json

jq '.[0].Config | {
  User,
  Entrypoint,
  Cmd,
  Env,
  WorkingDir,
  ExposedPorts,
  Labels
}' old-inspect.json > old-config.json

jq '.[0].Config | {
  User,
  Entrypoint,
  Cmd,
  Env,
  WorkingDir,
  ExposedPorts,
  Labels
}' new-inspect.json > new-config.json

diff -u old-config.json new-config.json
```

Also compare layer sizes and manifests with `docker buildx imagetools inspect`. A digest changes whenever the manifest changes, even if the application-visible files appear equivalent.

## Query the Tag History API

For public images, obtain an anonymous repository-scoped registry token:

```bash
IMAGE=python

TOKEN="$(
  curl -fsSL \
    "https://cgr.dev/token?scope=repository:chainguard/${IMAGE}:pull" \
    | jq -r '.token'
)"
```

Query the history endpoint:

```bash
curl -fsSL \
  -H "Authorization: Bearer ${TOKEN}" \
  "https://cgr.dev/v2/chainguard/${IMAGE}/_chainguard/history/latest" \
  | jq .
```

Private repositories require authenticated registry credentials and use the organization's repository path. The API supports `start` and `end` timestamps in ISO 8601 form. Chainguard documents a maximum of 1,000 records per request, so use time ranges for long-lived, frequently rebuilt tags.

Treat registry tokens as secrets and do not print them in CI logs.

## Compare SBOMs manually when needed

Download the signed SPDX attestation for the same platform from each digest:

```bash
for ref in "$OLD" "$NEW"; do
  cosign download attestation \
    --platform linux/amd64 \
    --predicate-type https://spdx.dev/Document \
    "$ref"
done
```

Verify the attestation signer before relying on its contents. Then normalize package names, versions, and PURLs and compare them. Keep the original signed envelopes as evidence, not only the transformed TSV output.

## Turn history into an update gate

A useful automated flow is:

```text
poll tracked tag
      |
new digest?
      |
signature verification
      |
changelog plus image diff
      |
tests on every platform
      |
review and digest promotion
```

If a nightly rebuild breaks the application, pinning the previous digest restores reproducibility while the team diagnoses the difference. It should not end the investigation or freeze updates indefinitely.

## Official Documentation

- [Using the Chainguard Tag History API](https://edu.chainguard.dev/chainguard/chainguard-images/features/using-the-tag-history-api/)
- [`chainctl images history` reference](https://edu.chainguard.dev/platform/chainctl/chainctl-docs/chainctl_images_history/)
- [`chainctl images changelog` reference](https://edu.chainguard.dev/platform/chainctl/chainctl-docs/chainctl_images_changelog/)
- [`chainctl images diff` reference](https://edu.chainguard.dev/chainguard/chainctl/chainctl-docs/chainctl_images_diff/)
