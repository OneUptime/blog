# Validation Summary: How to Use Sidecar-Based Config Management Plugins in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Config Management Plugins
- Argo CD repo-server sidecars
- Kubernetes Deployments
- Kubernetes NetworkPolicy
- kubectl
- Docker
- YAML

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD v2.8 Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-2.8/operator-manual/config-management-plugins/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl patch task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
- The Dockerfile said the custom image must contain `argocd-cmp-server` and used `/usr/local/bin/argocd-cmp-server` as the entrypoint. Argo CD's sidecar documentation instructs operators to use `/var/run/argocd/argocd-cmp-server`, which is provided through the repo-server shared volume. Updated the Dockerfile and surrounding text accordingly.
- The repo-server patch mounted the sidecar `cmp-tmp` volume into the main repo-server container at `/tmp`. Argo CD documentation says sidecar plugins should not mount the same `/tmp` volume as repo-server starting with v2.4. Removed the repo-server `/tmp` mount and clarified that `cmp-tmp` is for the sidecar only.
- The Application example referenced `my-custom-plugin` even though the CMP spec declares `version: v1.0`. Argo CD requires explicit plugin names to be `<metadata.name>-<spec.version>` when a version is set. Updated the example to `my-custom-plugin-v1.0`.
- The architecture text said source files are passed through a shared volume. Argo CD sends repository contents to the plugin sidecar through the CMP communication path rather than relying on a shared source checkout. Updated the wording to say the repo-server streams the source files to the sidecar.
- The summary described sidecar plugins as independently scalable. Sidecars scale with the repo-server pod, although they do have independent container resources. Updated the wording to "independently resource-controlled."

## Review Notes
- The Application `env` fields are valid, but Argo CD prefixes user-supplied plugin environment variables with `ARGOCD_ENV_` before plugin commands receive them. The post does not show command-side environment variable usage, so no code change was required.
- `kubectl` was not installed in the local environment, so CLI validation was performed against official Kubernetes command reference documentation.
