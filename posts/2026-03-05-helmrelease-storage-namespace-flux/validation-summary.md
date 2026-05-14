# Validation Summary: How to Configure HelmRelease Storage Namespace in Flux

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux CD helm-controller
- Flux HelmRelease API (`helm.toolkit.fluxcd.io/v2`)
- Kubernetes Secrets, Namespaces, RBAC, Roles, and RoleBindings
- Helm CLI

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux `flux get helmreleases` command documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Helm `helm list` command documentation: https://helm.sh/docs/helm/helm_list/
- Helm `helm history` command documentation: https://helm.sh/docs/helm/helm_history/
- Helm 3 FAQ on release namespace storage and Secrets as the default storage driver: https://v3-1-0.helm.sh/docs/faq/
- Helm Secrets storage driver source for release Secret labels and type: https://raw.githubusercontent.com/helm/helm/v3.19.0/pkg/storage/driver/secrets.go

## Issues Found
- The post said that when `spec.storageNamespace` is not set, Helm release Secrets are stored in the target namespace. Flux documentation states that `spec.storageNamespace` defaults to the HelmRelease namespace, while `spec.targetNamespace` controls where the release is made. Updated the introduction, default behavior section, and example comment accordingly.
- The main examples later inspect the release as `my-app`, but Flux defaults `spec.releaseName` to `[<target namespace>-]<name>` when `spec.targetNamespace` is set. Added `releaseName: my-app` to the relevant examples and documented it in the configuration bullets so the Helm CLI and Secret label examples match the manifests.
- The namespace deletion explanation implied Helm could think a release exists while metadata was gone. Revised the wording to accurately state that a separate storage namespace keeps Helm release history and state separate from the application namespace lifecycle.

## Review Notes
- The Helm CLI examples using `-n` for the storage namespace are correct for inspecting Helm storage in a non-default namespace.
- The Kubernetes RBAC API snippets are syntactically valid. In locked-down Flux installations, the exact subject may need to match the service account configured through `spec.serviceAccountName` or controller policy.
- Helm Secrets are the default storage backend in Helm 3; alternate Helm storage drivers would change the underlying storage object type, but Flux's `storageNamespace` field still controls the Helm storage namespace.
