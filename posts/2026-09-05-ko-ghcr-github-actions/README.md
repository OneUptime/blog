# How to Build and Push a Go Image to GHCR with ko in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, GitHub, GitHub Container Registry, CI/CD, Container Registry

Description: Publish a Go application to GHCR with the official setup-ko action, minimal token permissions, release tags, and digest output.

---

The official `ko-build/setup-ko` action installs `ko`, sets `KO_DOCKER_REPO` to a GitHub Container Registry namespace, and authenticates with the workflow's `GITHUB_TOKEN` by default. Because `ko` talks directly to GHCR, the job does not need Docker Buildx or a Docker daemon.

The workflow still needs explicit package-write permission, a trusted event, and a recorded digest.

## Use a Push-Only Publishing Trigger

Do not give untrusted pull-request code a registry writer token. Publish from protected branch pushes and version tags. Configure branch protection for `main` and a tag ruleset that restricts creation of `v*` tags to trusted release actors. These trigger filters do not create those protections or require tagged commits to belong to `main`:

```yaml
name: Publish Go image

on:
  push:
    branches: [main]
    tags: ['v*']

permissions:
  contents: read
  packages: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Check out source
        uses: actions/checkout@v7

      - name: Set up Go
        uses: actions/setup-go@v7
        with:
          go-version-file: go.mod
          cache: true

      - name: Test
        run: go test ./...

      - name: Set up ko
        uses: ko-build/setup-ko@v0.10
        with:
          version: v0.19.1

      - name: Build and publish
        shell: bash
        run: |
          image_ref=$(ko build ./cmd/api \
            --image-refs=api-image-refs.txt)
          printf '%s\n' "$image_ref" > api-image.txt

      - name: Preserve image reference
        uses: actions/upload-artifact@v7
        with:
          name: api-image-reference
          path: |
            api-image.txt
            api-image-refs.txt
          if-no-files-found: error
```

Pin third-party actions to full reviewed commit SHAs for a hardened production workflow. Version labels are shown here for readability; an update service can keep immutable pins current.

By default, `setup-ko` chooses a repository under `ghcr.io/[owner]/[repo]`, authorizes pushes with `github.token`, and exports `KO_DOCKER_REPO` to later steps. `ko` appends its normal package-based image name.

## Publish a Release Tag and Commit Tag

Compute tag values as environment data rather than interpolating untrusted event text directly into a shell program:

```yaml
- name: Choose image tags
  id: tags
  shell: bash
  env:
    REF_TYPE: ${{ github.ref_type }}
    REF_NAME: ${{ github.ref_name }}
    COMMIT: ${{ github.sha }}
  run: |
    short_commit=${COMMIT:0:12}
    echo "commit_tag=$short_commit" >> "$GITHUB_OUTPUT"
    if [[ "$REF_TYPE" == "tag" && ${#REF_NAME} -le 128 && "$REF_NAME" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([.-][A-Za-z0-9.-]+)?$ ]]; then
      echo "release_tag=$REF_NAME" >> "$GITHUB_OUTPUT"
    else
      echo "release_tag=edge" >> "$GITHUB_OUTPUT"
    fi

- name: Build and publish
  shell: bash
  env:
    RELEASE_TAG: ${{ steps.tags.outputs.release_tag }}
    COMMIT_TAG: ${{ steps.tags.outputs.commit_tag }}
  run: |
    image_ref=$(ko build ./cmd/api \
      --tags="$RELEASE_TAG" \
      --tags="$COMMIT_TAG" \
      --image-refs=api-image-refs.txt)
    printf '%s\n' "$image_ref" > api-image.txt
```

`api-image.txt` contains the top-level digest-bearing value from standard output. `api-image-refs.txt` is the complete record; for a multi-platform build in version 0.19.1 it also contains child references. Use the top-level file for deployment and index attestations rather than resolving a tag again later.

## Override the Default GHCR Repository When Needed

Set `KO_DOCKER_REPO` before `setup-ko` if the default repository is not the desired layout. The action then does not perform its default GHCR login, so authenticate explicitly:

```yaml
- name: Set up ko
  uses: ko-build/setup-ko@v0.10
  with:
    version: v0.19.1
  env:
    KO_DOCKER_REPO: ghcr.io/acme/platform-images

- name: Log in and publish
  shell: bash
  env:
    KO_DOCKER_REPO: ghcr.io/acme/platform-images
    GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GHCR_USER: ${{ github.actor }}
  run: |
    printf '%s' "$GHCR_TOKEN" | ko login ghcr.io \
      --username "$GHCR_USER" --password-stdin
    image_ref=$(ko build ./cmd/api \
      --image-refs=api-image-refs.txt)
    printf '%s\n' "$image_ref" > api-image.txt
```

Repository and organization package policies can restrict where `GITHUB_TOKEN` may publish. A personal access token is not the first fix; confirm package linkage and workflow permissions first.

## Make Package Permissions Explicit

`packages: write` allows publication. `contents: read` allows checkout. Do not grant `contents: write`, administration, or broad repository permissions unless another release step genuinely needs them.

GitHub reduces token capabilities for workflows from forks, and secrets are normally withheld. Keep pull-request testing in a separate job that performs `go test` and perhaps a no-push build. Never switch to `pull_request_target` merely to obtain write credentials while executing untrusted checkout content.

If an organization requires a reusable workflow, use explicit `permissions` both in the caller and called workflow. Permissions can be reduced through the chain, not expanded beyond what the caller grants.

## Control Visibility and Pull Access

Pushing successfully does not guarantee that a Kubernetes cluster can pull the package. GHCR package visibility and repository inheritance determine read access. For a private package, configure the cluster's image pull credential or workload integration separately.

Do not make a package public as an authentication workaround. Verify package settings, token scopes, and organization policy.

## Resolve a Deployment Artifact

For Kubernetes manifests containing `ko://` references:

```yaml
- name: Render release YAML
  run: |
    ko resolve -f config/ \
      --tags=${{ steps.tags.outputs.release_tag }} \
      --image-refs=images.txt \
      > release.yaml
```

Upload `release.yaml` and `images.txt`, then deploy them from a separate protected environment job. This keeps registry publishing authority distinct from cluster credentials and lets reviewers see the digest that will run.

## Diagnose GHCR Failures

| Failure | Check |
| --- | --- |
| `permission_denied: write_package` | Job has `packages: write`; organization permits package creation |
| `unauthorized` | Login step, actor, token lifetime, and registry hostname |
| Package pushed under unexpected path | `KO_DOCKER_REPO` set before or by `setup-ko` |
| Pull fails after successful push | Package visibility and consumer's read credentials |
| No release tag | Trigger type and validated `github.ref_name` |
| Deployment changes after retry | It used a mutable tag instead of the recorded digest |

Temporarily enable `ko --verbose build` for transport detail, but do not echo the token or enable shell tracing around login.

## Conclusion

Use the official setup action on trusted push events, grant only `contents: read` and `packages: write`, test before publishing, and retain the digest reference emitted by `ko`. Tags make GHCR releases navigable; the digest is what should move into review, deployment, signing, and rollback.

## Official Documentation

- [setup-ko: Official GitHub Action](https://github.com/ko-build/setup-ko)
- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [GitHub: Publishing Docker Images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GitHub: Permissions for `GITHUB_TOKEN`](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
- [GitHub: Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub: Secure Use Reference](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
