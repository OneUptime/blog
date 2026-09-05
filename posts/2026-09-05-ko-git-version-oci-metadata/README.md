# Stamp Git and OCI Metadata into ko Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Git, Versioning, OCI, Release Engineering

Description: Stamp version data into a Go binary and matching OCI labels into its ko-built image while keeping releases reproducible.

---

Release metadata has two audiences. The running Go process needs values it can return from `--version` or a diagnostic endpoint. Registries and deployment tooling need standard OCI labels they can inspect without starting the binary. With `ko`, linker flags populate the first surface and `--image-label` populates the second.

Set both from one validated source of truth. If a binary says `v2.4.1` while the image label says a different commit, incident response and provenance checks become harder.

## Define Settable Variables in Go

Linker `-X` can set a string variable by its full package import path. It cannot set a constant, non-string value, or a value whose initialization cannot be replaced. Create a small package:

```go
package version

var (
	Version = "dev"
	Commit  = "unknown"
	Date    = "unknown"
)
```

Expose it through a command flag or protected diagnostic endpoint:

```go
fmt.Printf("version=%s commit=%s date=%s\n",
	version.Version, version.Commit, version.Date)
```

Use the full path in linker flags, for example `example.com/acme/api/internal/version.Commit`. A package name alone can target the wrong symbol or no symbol.

## Use ko's Git Templates in `.ko.yaml`

`ko` supports template data for environment variables, build time, and Git state. A checked-in configuration can stamp each build consistently:

```yaml
builds:
  - id: api
    dir: .
    main: ./cmd/api
    ldflags:
      - -s
      - -w
      - -X=example.com/acme/api/internal/version.Version={{.Git.Tag}}
      - -X=example.com/acme/api/internal/version.Commit={{.Git.FullCommit}}
      - -X=example.com/acme/api/internal/version.Date={{.Git.CommitDate}}
```

Available Git fields include branch, tag, short and full commit, commit date and timestamp, and clean/dirty state. In `ko` 0.19.1, a Git repository with commits but no tags logs a warning and supplies `v0.0.0` for `Git.Tag`; a directory without usable Git metadata supplies empty tag and commit hashes, but its date and tree-state fields still have zero/default values. `Git.Tag` can also identify an ancestor tag rather than a tag on `HEAD`. Release CI should therefore fetch and validate the intended tag or provide an explicit version environment variable instead of treating `Git.Tag` as authoritative by itself.

A robust release often treats the signed release tag as an input:

```yaml
ldflags:
  - -X=example.com/acme/api/internal/version.Version={{.Env.VERSION}}
  - -X=example.com/acme/api/internal/version.Commit={{.Git.FullCommit}}
```

Then reject missing or inconsistent inputs before building:

```bash
test -n "${VERSION:-}" || exit 1
export VERSION
status=$(git status --porcelain) || exit 1
test "$status" = "" || exit 1
head_commit=$(git rev-parse --verify HEAD) || exit 1
tag_commit=$(git rev-parse --verify "refs/tags/$VERSION^{commit}") || exit 1
test "$tag_commit" = "$head_commit" || exit 1
git verify-tag "refs/tags/$VERSION" || exit 1
test "$head_commit" = "${GITHUB_SHA:-}" || exit 1
```

Run these checks in the release script, with the trusted release-signing keys configured for `git verify-tag`. Adapt the last comparison to the CI platform. Pull-request workflows may check out a synthetic merge commit, so decide whether the source or merge SHA is the artifact identity.

## Add Standard OCI Labels

Compute values once and pass them as individual arguments:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/api
version=$VERSION
commit=$(git rev-parse HEAD)
source_date=$(git show -s --format=%cI HEAD)

ko build ./cmd/api \
  --tags="$version" \
  --image-label "org.opencontainers.image.version=$version" \
  --image-label "org.opencontainers.image.revision=$commit" \
  --image-label "org.opencontainers.image.source=https://github.com/acme/api"
```

The OCI annotations specification defines these conventional keys. Labels live in the image configuration, while OCI annotations can be attached to manifests with `--image-annotation`. Registry UIs do not display every field consistently, so inspect the published manifest and its referenced image configuration directly.

Do not put secrets, private branch URLs, or access tokens in labels. Image metadata is normally readable by anyone who can pull or inspect the manifest.

## Keep Linker and Label Values Identical

If using dynamic shell values, pass the same variables to `--ldflags`:

```bash
ko build ./cmd/api \
  --tags="$version" \
  --ldflags "-X=example.com/acme/api/internal/version.Version=$version" \
  --ldflags "-X=example.com/acme/api/internal/version.Commit=$commit" \
  --ldflags "-X=example.com/acme/api/internal/version.Date=$source_date" \
  --image-label "org.opencontainers.image.version=$version" \
  --image-label "org.opencontainers.image.revision=$commit" \
  --image-label "org.opencontainers.image.source=https://github.com/acme/api"
```

When `--ldflags` is present, it takes precedence over linker flags in `.ko.yaml`. Avoid splitting the required three values between CLI and YAML unless that precedence is intentional.

Version strings containing whitespace or shell metacharacters complicate linker argument parsing. Restrict release versions and commits to validated formats, and pass each CLI argument with shell quoting.

## Preserve Reproducibility

`ko` omits timestamps from images by default to support reproducible output. Adding the wall-clock build time to either the binary or image config makes identical source builds differ.

If you want a stable nonzero image-configuration timestamp, `ko` 0.19.1 honors
`SOURCE_DATE_EPOCH`. A source commit time is a reproducible choice:

```bash
export SOURCE_DATE_EPOCH=$(git show -s --format=%ct HEAD)
```

This sets the image configuration's creation time to that epoch; it does not make the commit time the wall-clock build time. Do not also present the commit time as `org.opencontainers.image.created`: OCI defines that annotation as the date and time the image was built. For a reproducible image, omit that annotation. If policy requires the actual build time, calculate it at build time and accept that it deliberately changes the result:

```bash
created=$(date -u +%Y-%m-%dT%H:%M:%SZ)
ko build ./cmd/api \
  --image-label "org.opencontainers.image.created=$created"
```

Record that build timestamp in provenance as well. Keep the commit date in an application-specific field such as `version.Date` when it is useful, but name and document it as source metadata.

Go can also embed VCS settings in module-aware builds. Inspect them with:

```bash
go version -m /path/to/api
```

Custom version variables are still valuable for a stable application interface, but be aware that two metadata mechanisms exist. Test that they agree.

## Verify the Binary and Image

Build with the same release metadata and capture the immutable reference. Keep `dist/` ignored by Git so previous output does not make later builds dirty:

```bash
mkdir -p dist
image_ref=$(
  ko build ./cmd/api --image-refs=dist/image.txt \
    --tags="$version" \
    --ldflags "-X=example.com/acme/api/internal/version.Version=$version" \
    --ldflags "-X=example.com/acme/api/internal/version.Commit=$commit" \
    --ldflags "-X=example.com/acme/api/internal/version.Date=$source_date" \
    --image-label "org.opencontainers.image.version=$version" \
    --image-label "org.opencontainers.image.revision=$commit" \
    --image-label "org.opencontainers.image.source=https://github.com/acme/api"
)
```

The command's standard output is the top-level result for this one requested package. This is safer than taking the last line of `--image-refs`: for a multi-platform result, `ko` 0.19.1 records the index and its child-image references in that file.

Run the application's version command:

```bash
docker run --rm "$image_ref" --version
```

Inspect the image configuration:

```bash
docker image inspect "$image_ref" \
  --format '{{json .Config.Labels}}'
```

For a remotely published multi-platform image, use a registry tool that can select and inspect each platform child. Labels are stored on image configurations, so confirm both amd64 and arm64 children contain the same release values.

Verification should assert:

1. The binary reports the expected version and full commit.
2. OCI `version` and `revision` match those values.
3. The deployed reference contains the digest returned by `ko`.
4. The Git tree policy - normally clean for a release - was enforced.
5. The source URL identifies the canonical repository without credentials.

## Tag for Discovery, Deploy by Digest

The release tag makes the artifact discoverable:

```text
registry.example.com/acme/api/api-...:v2.4.1
```

The digest makes deployment immutable:

```text
registry.example.com/acme/api/api-...:v2.4.1@sha256:...
```

Preserve the second form in manifests and release records. Moving a tag later must not change what an existing deployment means.

## Conclusion

Use linker flags for the process-visible version and standard OCI keys for registry-visible metadata. Derive matching version and revision values from the same validated tag and commit, keep source and build timestamps semantically distinct, verify every platform, and retain the digest returned by `ko`. Metadata is useful only when its different surfaces agree.

## Official Documentation

- [ko: Configuration Templates and Linker Flags](https://ko.build/configuration/)
- [ko: Frequently Asked Questions](https://ko.build/advanced/faq/)
- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [Go Linker: `-X` Option](https://pkg.go.dev/cmd/link)
- [Go: Build Information](https://pkg.go.dev/runtime/debug#ReadBuildInfo)
- [OCI Image Annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)
