# Validation Summary: How to Implement ArgoCD Config Management Plugins

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Argo CD Config Management Plugins
- Kubernetes Deployments and NetworkPolicy
- Argo CD Application manifests
- Argo CD CLI
- Helm and the argo-cd Helm chart
- Jsonnet and jsonnet-bundler
- SOPS and Helm Secrets
- Kustomize and envsubst
- CUE
- Docker multi-stage builds

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD Build Environment documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/build-environment/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD repo-server deployment manifest: https://github.com/argoproj/argo-cd/blob/master/manifests/base/repo-server/argocd-repo-server-deployment.yaml
- argo-helm `argo-cd` chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- argo-helm `argocd-cmp-cm` template: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/templates/argocd-configs/argocd-cmp-cm.yaml
- Helm `template` command documentation: https://helm.sh/docs/helm/helm_template/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- CUE YAML export documentation: https://cuelang.org/docs/reference/command/cue-help-filetypes/

## Issues Found
- The post implied Jsonnet requires a CMP. Argo CD supports Jsonnet natively, so the introduction now frames the example as custom Jsonnet tooling rather than basic Jsonnet support.
- The post described `ConfigManagementPlugin` as a ConfigMap/CRD-like resource to apply. Updated it to clarify that sidecar CMP configuration is a file mounted or baked into the sidecar at `/home/argocd/cmp-server/config/plugin.yaml`.
- The Jsonnet examples used `jsonnet-bundler install`. The installed binary is `jb`, so the commands now use `jb install`.
- The sidecar Dockerfiles copied and used `/usr/local/bin/argocd-cmp-server`. Official sidecar setup uses `/var/run/argocd/argocd-cmp-server` from the repo-server pod, so the Dockerfiles and deployment snippets were corrected.
- The repo-server patch mounted a shared `/tmp` volume into the repo-server and sidecar. Argo CD documents that sidecars should not share the repo-server `/tmp`; the patch now only adds a dedicated CMP `/tmp` volume for the sidecar.
- The plugin config included legacy `lockRepo` and unsupported/legacy concurrency configuration for the sidecar model. These fields were removed from the sidecar plugin example.
- The Kustomize discovery example specified both `fileName` and `find.glob`, but Argo CD evaluates only one discovery mechanism in priority order. Replaced it with a `find.command` that checks both conditions.
- Static parameter examples used `default`, which is not the CMP parameter announcement field. Updated defaults to use `string`, matching Argo CD's parameter announcement schema.
- The Application example explicitly referenced `helm-secrets` even though the plugin has `version: v1.0`. Explicit sidecar plugin names must include the version suffix, so it now uses `helm-secrets-v1.0`.
- The generate-command logging example wrote log text to stdout, which would corrupt manifest output. Log lines now go to stderr.
- The Helm values example used ConfigMap names and subPaths that did not match the argo-helm chart's `configs.cmp.plugins` output. Updated it to mount `argocd-cmp-cm` with `jsonnet.yaml` and `helm-secrets.yaml` subPaths.

## Review Notes
The examples are now aligned with the current sidecar CMP model. A future improvement would be to harden shell examples further by avoiding `eval` and explicitly parsing `ARGOCD_APP_PARAMETERS`, but those are security/robustness improvements rather than correctness blockers for this tutorial.
