# Validation Summary: How to Deploy `ko://` Image References with `ko resolve` and `ko apply`

## Status

validated

## Post Type

Technical tutorial / deployment guide.

## Technologies Covered

- Go modules, import paths, main packages, and build/test commands
- ko v0.19.1: resolve, apply, delete, image publishing, and YAML substitution
- Kubernetes Deployments, Services, kubectl, and server-side dry runs
- OCI container images, registry tags, and immutable digests
- kind local clusters
- Bash and Git release-tag commands

## Sources Consulted

- ko Kubernetes Integration: https://ko.build/features/k8s/
- ko resolve CLI reference: https://ko.build/reference/ko_resolve/
- ko apply CLI reference: https://ko.build/reference/ko_apply/
- ko delete CLI reference: https://ko.build/reference/ko_delete/
- ko configuration, image naming, and kind publishing: https://ko.build/configuration/
- ko Go Packages: https://ko.build/advanced/go-packages/
- ko v0.19.1 resolver implementation: https://github.com/ko-build/ko/blob/v0.19.1/pkg/resolve/resolve.go
- ko v0.19.1 selector implementation: https://github.com/ko-build/ko/blob/v0.19.1/pkg/resolve/selector.go
- ko v0.19.1 registry publisher and tag validation: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/default.go
- ko v0.19.1 command implementation, caching, logging, and file processing: https://github.com/ko-build/ko/tree/v0.19.1/pkg/commands
- Go command documentation: https://pkg.go.dev/cmd/go
- Kubernetes container images: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl apply reference and local `kubectl apply --help`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl diff reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Git rev-parse reference: https://git-scm.com/docs/git-rev-parse
- Author profile link: https://github.com/nawazdhandala

## Issues Found

1. **YAML substitution scope was misleading.** The post implied that resolution depends on a supported image-reference position. The v0.19.1 resolver recursively scans YAML string nodes for the `ko://` prefix without restricting them to container image fields. Replaced that paragraph to explain that environment-variable and custom-resource values can also trigger resolution, while arbitrary embedded occurrences are not interpolated.
2. **The tag-only guidance omitted required tag constraints.** For registry publishing in v0.19.1, `--tag-only` rejects the default `latest` tag and rejects multiple tags. Added the requirement for exactly one explicit non-`latest` tag and an inline example, preserving the existing explanation of mutable tags.

## Review Notes

- Confirmed the version-specific default registry result is `repository/api-<hash>@sha256:<digest>` while publishing `latest`. One explicit non-latest tag is included alongside the digest; multiple release tags retain digest-bearing output. The article does not claim v0.19.1 is the latest release.
- Verified command names and flags, kubectl argument forwarding after `--`, recursive processing, object-label selection, process-local build caching, stderr logging, and deletion delegation against documentation and the tagged source.
- Confirmed `kind.local` and `KIND_CLUSTER_NAME` are documented. The example assumes an existing `dev` kind cluster and its `kind-dev` context; the namespaced example assumes the `payments` namespace exists.
- Parsed the Deployment and Service YAML and checked matching selectors, Pod labels, and the named Service target port. The application must actually listen on port 8080; declaring `containerPort` does not configure the application.
- All Bash code blocks passed `bash -n`. The validation JSON was parsed and checked for the exact requested status and date.
- All links in the post point to the intended documentation or author profile. The example module and registry are placeholders requiring real source and a writable destination.
- This was documentation/source review and local syntax validation, not an end-to-end deployment. No sample application source, registry credentials, or target cluster was supplied; no images were published or Kubernetes resources changed.
- `kubectl diff` returns status 1 when differences exist. Both diff and server dry-run require cluster access; plain `ko resolve` with registry publishing does not. Image-pull access must also be available to the cluster when deploying private images.
