# Validation Summary: How to Pass Environment Variables to CMP Plugins in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Config Management Plugins
- Argo CD Application manifests
- Kubernetes Deployments, ConfigMaps, Secrets, and container environment variables
- Helm template rendering
- kubectl CLI
- POSIX shell scripting

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD Build Environment documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/build-environment/
- Kubernetes container environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes API reference for container `env` and `envFrom` precedence: https://kubernetes.io/docs/reference/generated/kubernetes-api/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/
- Helm `helm template` command documentation: https://helm.sh/docs/v3/helm/helm_template/

## Issues Found
- Application-level CMP environment variables were shown as directly available under their original names, such as `ENVIRONMENT`. Argo CD prefixes user-supplied Application `plugin.env` variables with `ARGOCD_ENV_` before plugin commands run. Updated the explanation and examples to use names such as `ARGOCD_ENV_ENVIRONMENT`.
- The post claimed Application-level variables override container-level variables. They do not directly override because Argo CD prefixes Application variables. Rewrote the precedence section to explain the prefix behavior and show an explicit fallback pattern that checks `ARGOCD_ENV_*` before container defaults.
- `ARGOCD_APP_NAMESPACE` was described as the namespace of the Argo CD Application resource. Official Argo CD build environment documentation defines it as the destination namespace of the application. Corrected the description.
- The built-in variable list included destination variables named `ARGOCD_ENV_APP_DESTINATION_SERVER` and `ARGOCD_ENV_APP_DESTINATION_NAMESPACE`, which are not standard Argo CD build environment variables. Replaced them with documented cluster build variables `KUBE_VERSION` and `KUBE_API_VERSIONS`.
- Shell examples used `set -euo pipefail` with `sh`. `pipefail` is not portable for `/bin/sh`, and these snippets did not require it. Updated the examples to use `set -eu`.
- The debugging example could fail the generate command if `grep` found no matching variables. Added `|| true` so the debug command remains safe.

## Review Notes
The corrected post is accurate for current sidecar-based Argo CD CMP behavior. Argo CD also supports CMP parameters, which are exposed through `ARGOCD_APP_PARAMETERS` and `PARAM_*` variables, but the post is focused on `plugin.env` and container environment injection.
