# Validation Summary: How to Test ArgoCD Application Manifests Locally

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Argo CD CLI and Application manifests
- Kubernetes manifests and kubectl dry-run validation
- kubeconform schema validation
- Argo CD CustomResourceDefinition schemas
- Helm template rendering
- Kustomize builds
- yamllint
- VS Code YAML validation
- pre-commit hooks

## Sources Consulted
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- kubeconform CRD support documentation: https://kubeconform.mandragor.org/docs/crd-support/
- kubeconform OpenAPI to JSON Schema conversion documentation: https://kubeconform.mandragor.org/docs/json-schema-conversion/
- kubeconform GitHub README / CRD catalog examples: https://github.com/yannh/kubeconform
- Datree CRDs-catalog Argo CD Application schema: https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/argoproj.io/application_v1alpha1.json
- Kubernetes `kubectl apply` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl kustomize` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Helm `helm template` command reference: https://helm.sh/docs/v3/helm/helm_template/
- Argo CD CRD manifests in the official repository: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/crds/application-crd.yaml
- Referenced OneUptime link checked: https://oneuptime.com/blog/post/2026-02-06-monitor-argocd-deployments-opentelemetry/view

## Issues Found
- The Argo CD CLI section described `argocd app manifests --source live|git` as local manifest generation. Those flags print live or Git-generated manifests for an application, while local generation uses `--local` and optionally `--local-repo-root`. Updated the example to generate `/tmp/local.yaml` from a local checkout, then compare it with the Git-generated desired manifests.
- The Argo CD CRD schema example only downloaded the Application CRD even though the text mentioned Application, AppProject, and ApplicationSet. Updated the example to download all three official CRD files.
- The kubeconform local CRD schema example used a filename template that did not match the default `openapi2jsonschema` output. Updated the conversion to set `FILENAME_FORMAT='{kind}_{version}'` and the kubeconform schema-location template to match.
- The Helm "type mismatch" example used `replicaCount: "3"`, which Helm would commonly render as `replicas: 3` and therefore not reliably fail Kubernetes integer validation. Changed the example to `replicaCount: "three"` so the rendered manifest demonstrates an actual schema type error.
- The validation script's dry-run branch would apply a raw Helm chart directory when `Chart.yaml` was present, instead of applying rendered manifests. Updated that branch to pipe `helm template` output into `kubectl apply --dry-run=server`.

## Review Notes
- The examples pin Kubernetes schema validation to version `1.28.0`. That remains syntactically valid for kubeconform, but teams should set this to the Kubernetes version they actually run.
- Server-side dry-run depends on access to a Kubernetes API server with the relevant CRDs and admission configuration installed, so kubeconform and server dry-run can catch different classes of errors.
