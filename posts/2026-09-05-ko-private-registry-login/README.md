# How to Push ko-Built Go Images to a Private Registry with `KO_DOCKER_REPO` and `ko login`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Container Registry, Authentication, Supply Chain, OCI

Description: Configure a private registry destination, authenticate without exposing secrets, and verify digest-addressed Go images published by ko.

---

`ko` does not need a Docker daemon to build or push a Go application. It runs `go build`, assembles an OCI-compatible image, and talks directly to a registry. Two settings control the publishing path: `KO_DOCKER_REPO` says where images belong, while `ko login` supplies credentials when the registry is not public.

The important distinction is that `KO_DOCKER_REPO` is a repository prefix, not a login credential and usually not a complete image tag. Given this configuration:

```bash
export KO_DOCKER_REPO=registry.example.com/platform/go-images
ko build ./cmd/api
```

the default naming strategy appends the package name and an MD5 hash of its full import path. A result resembles:

```text
registry.example.com/platform/go-images/api-1a2b...@sha256:...
```

The default `latest` tag is pushed too, but `ko` 0.19.1 returns the canonical digest-only form for that default. The MD5 value is only a collision-avoiding name suffix; it is not the image's content digest or a security primitive. The final `sha256` digest identifies the published content.

## Prepare the Registry Namespace

Create the registry project or repository before the first push if your service does not create it automatically. Grant the CI or developer identity the narrow permission needed to upload artifacts. Pull-only workloads need separate read access.

Use the hostname and repository path expected by the registry:

```bash
export KO_DOCKER_REPO=registry.example.com/team-a/services
```

Do not include `https://`, and do not put a username or password in this variable. A registry may accept a nested repository prefix, but its product-specific naming and project rules still apply.

For repeatable releases, pin the base image used by `ko` to a digest in `.ko.yaml` as well. Private registries often require authentication for both pulling that base and pushing the result.

## Log In Without Leaking the Password

Prefer `--password-stdin` so a token is not exposed in the process list or shell history:

```bash
printf '%s' "$REGISTRY_TOKEN" |
  ko login registry.example.com \
    --username "$REGISTRY_USER" \
    --password-stdin
```

The login target is the registry server, not `registry.example.com/team-a/services`. `ko login` uses Docker-compatible registry credentials, and normal `ko` publishing also consults supported credential helpers and cloud keychains. In CI, inject the token through the platform's secret facility and mask it from logs. Avoid `set -x` around the login step.

A successful login does not prove authorization to the chosen repository. It only proves that credentials could be recorded. The first push can still fail because the repository is missing, the token lacks upload scope, or an organization policy denies the operation.

## Build and Capture the Immutable Reference

Run the build from the Go module that owns the command:

```bash
mkdir -p dist
image_ref=$(
  ko build ./cmd/api --image-refs dist/image-refs.txt
)
printf 'Published %s\n' "$image_ref"
```

`ko` prints progress on standard error and the resulting reference on standard output. `--image-refs` is useful in automation because it records all published references without fragile log scraping. Treat the digest-bearing standard-output value as the top-level deployment artifact for this one requested package.

When multiple import paths are built, the file contains multiple references. A multi-platform build also records the index and its platform-child references. Do not select the last line or assume file order is a service-to-reference mapping; give each build an explicit step and retain its standard-output result, or derive the mapping from a verified naming and platform policy.

`ko build` adds the default `latest` tag unless you choose other tags, but its returned reference includes a digest. Deploy the digest-bearing reference even when a human-friendly tag also exists. A tag can be moved; a digest cannot silently resolve to different bytes.

## Use Registry-Specific Credentials Correctly

Credential forms vary:

- A self-hosted registry may use a robot-account username and short-lived token.
- GHCR commonly accepts a GitHub identity plus an appropriately scoped token.
- Cloud registries may be handled by the cloud credential keychain available to `ko`, provided the runtime identity and IAM permissions are correct.

Prefer workload identity or a short-lived access token over a long-lived password. If a credential helper is configured, test in the same user account and environment as the `ko` process. A login performed as `root` will not help a later unprivileged step if they read different configuration directories.

## Diagnose Common Push Failures

Enable verbose logging only after ensuring credentials will remain redacted:

```bash
ko --verbose build ./cmd/api
```

Interpret failures by phase:

| Symptom | Likely cause | Check |
| --- | --- | --- |
| `KO_DOCKER_REPO environment variable is unset` | No remote destination | Export it in the same step that runs `ko` |
| `UNAUTHORIZED` | Missing or rejected credentials | Registry hostname, token expiry, credential config |
| `DENIED` | Authenticated identity lacks permission | Repository/project upload role and token scope |
| `NAME_UNKNOWN` | Repository or project does not exist | Provisioning and path spelling |
| TLS or x509 failure | Untrusted proxy/registry CA | Install the corporate CA; do not normalize insecure TLS |
| Base-image pull fails | Destination login does not cover the base registry | Authenticate to the base registry separately |

`--insecure-registry` disables TLS verification. It can help isolate a development-only TLS problem, but it also removes server authentication and should not become a production fix. Install the correct CA chain instead.

## Verify What Was Published

Use a registry-aware tool to inspect the exact digest returned by `ko`:

```bash
docker buildx imagetools inspect "$image_ref"
```

You can also deploy a small canary by digest and confirm the application reports the expected version. Registry UI tags are a convenience view; the digest in the deployment and release record is the authoritative identity.

For cleanup, understand the registry's retention rules before deleting tags. Removing `latest` need not remove the manifest, and garbage collection behavior differs by registry. Keep any digest referenced by a running environment or signed release.

## Conclusion

A reliable private-registry workflow separates destination, authentication, and artifact identity. Put only the repository prefix in `KO_DOCKER_REPO`, pass secrets to `ko login` over standard input, capture the digest returned by `ko`, and deploy that immutable reference. When a push fails, distinguish authentication, authorization, repository naming, base-image access, and TLS trust instead of repeatedly logging in with broader credentials.

## Official Documentation

- [ko: Get Started](https://ko.build/get-started/)
- [ko: Configuration and `KO_DOCKER_REPO`](https://ko.build/configuration/)
- [ko: `ko login` Reference](https://ko.build/reference/ko_login/)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
