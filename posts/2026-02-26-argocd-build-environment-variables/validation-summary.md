# Validation Summary: How to Use Build Environment Variables in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD build environment variables
- Argo CD Applications
- Helm
- Jsonnet
- Kustomize
- Config Management Plugins
- Kubernetes manifests
- Argo CD CLI

## Sources Consulted
- Argo CD Build Environment documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/build-environment/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Jsonnet documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/jsonnet/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/config-management-plugins/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/

## Issues Found
- The available build environment variable table was incomplete. Added `ARGOCD_APP_PROJECT_NAME`, `ARGOCD_APP_REVISION_SHORT`, and `ARGOCD_APP_REVISION_SHORT_8`, and corrected the `KUBE_VERSION` example to omit the leading `v`, matching current Argo CD documentation.
- The Helm section incorrectly implied Argo CD does not pass build environment variables to Helm by default. Updated the wording to clarify that Helm templates access these values through Argo CD parameter substitution, not direct shell environment reads.
- The CMP example manually truncated `ARGOCD_APP_REVISION` with Bash substring syntax. Updated it to use Argo CD's documented `ARGOCD_APP_REVISION_SHORT` variable.
- The Kustomize example described exec plugins and KRM functions in a way that did not match Argo CD's documented Kustomize build environment support. Replaced it with the documented `commonAnnotationsEnvsubst` pattern for using build variables in Kustomize Applications.
- The `KUBE_VERSION` / `KUBE_API_VERSIONS` section conflated build environment variables with Helm `.Capabilities`. Updated the wording to distinguish custom tooling/CMP environment variables from Helm's `.Capabilities` object.

## Review Notes
The remaining examples are illustrative and assume the referenced charts, helper templates, manifest files, and plugin sidecar setup exist. The CMP ConfigMap example is valid as plugin configuration content, but a production deployment must mount it into a CMP sidecar as described in the Argo CD documentation.
