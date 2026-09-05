# How to Use ko in Google Cloud Build Without a Docker Daemon or Missing-Shell Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Google Cloud Build, Artifact Registry, CI/CD, Container Image

Description: Run ko directly as a Cloud Build step, publish to Artifact Registry without Docker, and avoid incorrect shell entrypoints.

---

`ko` is a strong fit for Google Cloud Build because it builds a Go binary and publishes an image without talking to a Docker daemon. A Cloud Build step can run the official `ko` image directly, use the build's service-account credentials, and push to Artifact Registry.

The most common configuration mistake is to treat the `ko` builder like a general-purpose shell image. Cloud Build passes `args` to an image's configured entrypoint. The official `ko` image has `ko` as its entrypoint, so the first argument should be a `ko` subcommand such as `build` or `resolve`.

## Create the Artifact Registry Repository

Artifact Registry repositories are regional or multi-regional resources and normally must exist before the push. For example:

```bash
gcloud artifacts repositories create go-services \
  --repository-format=docker \
  --location=europe-west1 \
  --description='Go service images built by ko'
```

Choose the project and region deliberately. The repository prefix used by `ko` will be:

```text
europe-west1-docker.pkg.dev/PROJECT_ID/go-services
```

Grant the build's actual runtime service account `roles/artifactregistry.writer` on the repository or project. Cloud Build's default service-account behavior has changed over time, so do not infer the principal from an old project. Prefer an explicitly selected user-managed service account and least privilege.

## Use ko as the Build-Step Entrypoint

Pin the builder to a reviewed release instead of an unbounded `latest` tag. This configuration invokes the image's existing `ko` entrypoint:

```yaml
steps:
  - id: build-api
    name: ghcr.io/ko-build/ko:v0.19.1
    args:
      - build
      - ./cmd/api
      - --platform=linux/amd64
      - --image-refs
      - /workspace/image-refs.txt
    env:
      - KO_DOCKER_REPO=europe-west1-docker.pkg.dev/${PROJECT_ID}/go-services

artifacts:
  objects:
    location: gs://${PROJECT_ID}-build-artifacts/ko/${BUILD_ID}/
    paths:
      - image-refs.txt
```

The source is mounted at `/workspace`, and build steps start there unless the step sets a different `dir` or its entrypoint changes the working directory. The official `ko` release image contains the Go toolchain needed by `ko`. `ko` sends layers directly to Artifact Registry; there is no Docker socket, privileged daemon, `docker build`, or separate `docker push`.

For a hardened pipeline, replace the readable version tag with the reviewed platform-specific image digest. A version tag communicates intent but is still a registry tag and is not inherently immutable.

The explicit single platform makes `image-refs.txt` contain one digest-bearing reference. If you change this to a multi-platform build, `ko` 0.19.1 records the index followed by its platform children; run `ko build` in a shell-capable step and capture its standard output to a file in `/workspace` for the top-level index reference rather than selecting the file's last line. The Cloud Storage artifacts block is optional and requires a pre-existing bucket plus write access. If your release system consumes the file in a later step, the shared `/workspace` volume is enough.

## Why Shell-Shaped Configurations Fail

This is wrong for an image whose entrypoint is `ko`:

```yaml
steps:
  - name: ghcr.io/ko-build/ko:v0.19.1
    args: ['-c', 'ko build ./cmd/api']
```

Cloud Build effectively passes `-c` to `ko`; it does not automatically insert a shell. This example produces an unknown-flag error. An executable lookup failure or missing-shell error instead occurs when an overridden entrypoint names an executable absent from the image. The official v0.19.1 image uses a Go base image with a shell; the issue here is argument routing, not a missing shell in that release.

For one command, express every token as a separate argument. Do not quote the whole command:

```yaml
args: ['build', './cmd/api', '--platform=linux/amd64']
```

If orchestration genuinely requires pipes, conditionals, or command substitution, use a builder that intentionally provides a shell, install or invoke `ko` there, and set `entrypoint: bash` or `entrypoint: sh` explicitly. Never assume an arbitrary builder contains Bash. Keeping the `ko` step shell-free avoids quoting and secret-expansion surprises.

## Authentication Without `docker login`

Current `ko` uses registry credential keychains that include Google credentials. In Cloud Build, Application Default Credentials represent the build's service account. With the correct Artifact Registry IAM role, no Docker credential file or Docker daemon is required.

An authentication failure should be debugged as IAM, not worked around with a static service-account key:

1. Identify the service account configured on the trigger or submitted build.
2. Confirm the destination project, region, and repository spelling.
3. Confirm that principal has Artifact Registry upload permission.
4. Check organization policies and VPC Service Controls when applicable.

Avoid printing access tokens. A successful token lookup cannot compensate for a repository writer role granted to the wrong principal.

## Resolve Kubernetes Manifests in the Same Way

To produce digest-pinned deployment YAML from manifests containing `ko://` Go import-path references, use `resolve` directly:

```yaml
steps:
  - id: resolve-release
    name: ghcr.io/ko-build/ko:v0.19.1
    args:
      - resolve
      - -f
      - config/
    env:
      - KO_DOCKER_REPO=europe-west1-docker.pkg.dev/${PROJECT_ID}/go-services
```

Because `ko resolve` writes YAML to standard output while progress goes to standard error, redirection would require a shell. A cleaner option is a tiny dedicated script builder, or `ko resolve` in a shell-providing Go image with an explicitly installed, pinned `ko`. Keep the direct builder form when only building images.

## Cache Go Inputs Across Builds

Within one build, `/workspace` is shared across steps. Across independent builds, the worker filesystem is not a durable cache. `ko` already benefits from Go's build cache and skips registry blobs that exist remotely, but persistent cross-build caching requires an intentional cache service or restore/save steps.

If you mount or restore cache directories, set them explicitly:

```yaml
env:
  - GOMODCACHE=/workspace/.cache/gomod
  - GOCACHE=/workspace/.cache/go-build
  - KOCACHE=/workspace/.cache/ko
```

Do not upload a writable cache containing credentials. Use a key that includes the Go version, `go.sum`, target platform, and relevant build configuration. For ordinary Go builds, cache keys account for source and compiler inputs, but cache reuse does not make untrusted cache contents safe. Restore caches only from trusted writers; changes to external C libraries used by cgo require explicit cache invalidation or a forced rebuild.

## Make Failures Actionable

Typical error boundaries are:

| Error | What to inspect |
| --- | --- |
| `KO_DOCKER_REPO ... unset` | The `env` entry is on the same build step |
| `permission denied` or `DENIED` | Runtime service account and Artifact Registry Writer role |
| `name unknown` | Repository exists in the named project and region |
| `unknown shorthand flag: c` | Shell syntax was passed to the `ko` entrypoint |
| `exec ... no such file` | The overridden `entrypoint` is absent from the builder image |
| Go module download failure | Network policy, proxy, `GOPRIVATE`, and private-module credentials |

Use `ko --verbose build ...` temporarily for registry diagnostics, but review logs for sensitive URLs or environment details. Pin both Go and `ko` versions so an upstream release does not change the builder during incident diagnosis.

## Conclusion

The daemonless Cloud Build pattern is deliberately small: run a pinned official `ko` image, pass `build` arguments directly to its entrypoint, set `KO_DOCKER_REPO` to an existing Artifact Registry repository, and authorize the build's service account. Add a shell only in a step designed to provide one. This preserves the simplicity and security benefit that motivated using `ko` in the first place.

## Official Documentation

- [ko: Introduction](https://ko.build/)
- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [Google Cloud Build: Create a Build Configuration](https://cloud.google.com/build/docs/configuring-builds/create-basic-configuration)
- [Google Cloud Build: Build Configuration Schema](https://cloud.google.com/build/docs/build-config-file-schema)
- [Google Cloud: Configure Access for a Cloud Build Service Account](https://cloud.google.com/build/docs/securing-builds/configure-access-for-cloud-build-service-account)
- [Google Cloud: Artifact Registry Roles and Permissions](https://cloud.google.com/iam/docs/roles-permissions/artifactregistry)
