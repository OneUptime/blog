# Validation Summary: What odo deploy Actually Creates—and How to Find and Remove Stale Resources

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- odo v3, including `odo deploy`, `odo list`, `odo describe component`, and `odo delete component`
- Devfile 2.2.0 and Devfile 2.3.0
- Kubernetes and OpenShift resources
- `kubectl`, label selectors, owner references, garbage collection, and finalizers
- Kubernetes Jobs, retry behavior, and `ttlSecondsAfterFinished`
- Podman, Docker, OCI images, and container registries
- Helm and Kustomize

## Sources Consulted

- [odo deprecation announcement](https://odo.dev/blog/odo-deprecation-announcement/)
- [odo v3 deploy command reference](https://odo.dev/docs/command-reference/deploy/)
- [odo v3 component-deletion reference](https://odo.dev/docs/command-reference/delete-component/)
- [odo v3 list command reference](https://odo.dev/docs/command-reference/list/)
- [odo v3 describe-component reference](https://odo.dev/docs/command-reference/describe-component/)
- [odo Devfile reference](https://odo.dev/docs/development/devfile/)
- [odo resource labels and architecture](https://odo.dev/docs/development/architecture/how-odo-works/)
- [odo v3.16.1 source: exec Job creation and cleanup](https://github.com/redhat-developer/odo/blob/v3.16.1/pkg/component/execute_new_container.go)
- [odo v3.16.1 source: local image backend selection](https://github.com/redhat-developer/odo/blob/v3.16.1/pkg/devfile/image/image.go)
- [odo v3.16.1 source: Kubernetes component application](https://github.com/redhat-developer/odo/blob/v3.16.1/pkg/component/apply_kubernetes.go)
- [odo v3.16.1 source: component-aware deletion](https://github.com/redhat-developer/odo/blob/v3.16.1/pkg/component/delete/delete.go)
- [archived odo GitHub repository](https://github.com/redhat-developer/odo)
- [Devfile 2.2.0 apply-command documentation](https://devfile.io/docs/2.2.0/adding-an-apply-command)
- [Devfile 2.3.0 schema documentation](https://devfile.io/docs/2.3.0/devfile-schema)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl config view` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/)
- [Kubernetes `kubectl delete` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/)
- [Kubernetes labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes owners and dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)
- [Kubernetes finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Kubernetes automatic cleanup for finished Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/)

## Issues Found

- The introduction said odo could apply “arbitrary” manifests. The final v3 implementation applies resources through Kubernetes discovery and a namespaced server-side-apply path, so not every manifest or resource scope is supported. The wording now says odo applies resources defined by Kubernetes or OpenShift manifests without claiming universal support.
- The Devfile version was written as 2.3. The current schema version is 2.3.0, so the post now uses the complete version number.
- The exec Job cleanup description implied that odo configured a TTL only after immediate cleanup failed and only attempted deletion after success. In v3.16.1, odo sets `ttlSecondsAfterFinished: 60` when creating the Job, sets `backoffLimit: 1`, and defers explicit Job deletion after both success and failure. The paragraph now reflects that behavior and gives the documented Job naming pattern.
- The image section said build work could run in the cluster. Final odo v3 selects a locally available Podman or Docker CLI for Devfile image components. The post now describes this as local build work through Podman or Docker.

## Review Notes

- The article is intentionally version-specific to the archived odo v3 line; odo was deprecated on October 23, 2025, and the repository was archived on April 1, 2026.
- The Devfile example follows the 2.2.0 apply-command structure used by odo, and its component fields and command grouping are correct.
- The odo and `kubectl` commands, flags, namespaces, label selectors, and manual deletion examples are valid.
- The post correctly warns that `kubectl get all` is not an exhaustive inventory, that labels are not ownership, that dependent Pods should normally be handled through their controller, and that finalizers should not routinely be stripped.
- All external links in the post returned HTTP 200 during validation.
