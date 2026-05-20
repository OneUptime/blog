# Validation Summary: How to Use kustomized-helm Plugin with ArgoCD

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Argo CD Config Management Plugins
- Argo CD Applications and multi-source Applications
- Kubernetes
- Helm
- Kustomize
- Docker

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Helm `helm template` command documentation: https://helm.sh/docs/helm/helm_template/
- Helm dependency commands documentation: https://helm.sh/docs/helm/helm_dependency_build/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize official repository and examples: https://github.com/kubernetes-sigs/kustomize
- Kustomize Helm chart inflation documentation: https://kubectl.docs.kubernetes.io/references/kustomize/builtins/#_helmchartinflationgenerator_

## Issues Found
- The Config Management Plugin generate script ignored the Application's `HELM_RELEASE_NAME` environment variable. Argo CD prefixes user-provided plugin environment variables with `ARGOCD_ENV_`, so the script now reads `ARGOCD_ENV_HELM_RELEASE_NAME` before falling back to `ARGOCD_APP_NAME`.
- The generate script wrote Helm output into `/tmp/helm-output` and copied only `kustomization.yaml`, which would break Kustomize overlays that reference local patch files, components, or other relative files. It now copies the source tree to a temporary directory, writes `all.yaml` there, and runs Kustomize from that copied source.
- The discovery rule matched any `kustomization.yaml`, which could incorrectly claim ordinary Kustomize applications. It now matches only directories with both `Chart.yaml` and `kustomization.yaml`, or kustomizations that use `helmCharts`.
- The sidecar image and repo-server patch used a custom copied `argocd-cmp-server` path instead of Argo CD's documented sidecar entrypoint. The Dockerfile no longer copies the CMP server, and the repo-server sidecar now runs `/var/run/argocd/argocd-cmp-server`.
- The repo-server patch mounted `cmp-tmp` but did not define the corresponding volume. Added the missing `cmp-tmp` `emptyDir` volume.
- The Application specified `plugin.name: kustomized-helm` even though the CMP has `spec.version: v1.0`. Argo CD requires the versioned plugin name, so this was changed to `kustomized-helm-v1.0`.
- The Kustomize example used deprecated `commonLabels`. It was updated to the current `labels` field with `includeSelectors: true` to preserve the previous selector-label behavior.
- The local troubleshooting command copied only `kustomization.yaml` to `/tmp`, which could fail with relative patch files. It now copies the whole source directory to a temporary directory before rendering Helm output and running Kustomize.

## Review Notes
The local environment did not include Helm, Kustomize, or the Argo CD CLI. I verified syntax with local YAML parsing and installed Kustomize 5.7.1 temporarily to validate the updated `labels` and inline `patches` example. Helm and Argo CD behavior was checked against official documentation.
