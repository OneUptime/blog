# Validation Summary: How to Pass Dynamic Values to Kubernetes YAML Manifests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes manifests and Deployments
- kubectl
- ConfigMaps and Secrets
- Helm templates and values
- Kustomize overlays and image transforms
- GNU envsubst
- sed and awk
- Mike Farah yq
- GitLab CI/CD

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes documentation: ConfigMaps, https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes documentation: Define Environment Variables for a Container, https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes documentation: Deployments, https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Helm documentation: Values Files, https://helm.sh/docs/chart_template_guide/values_files/
- Helm documentation: helm install, https://helm.sh/docs/helm/helm_install/
- Helm documentation: helm template, https://helm.sh/docs/helm/helm_template/
- Kustomize examples: image transformer / edit set image, https://github.com/kubernetes-sigs/kustomize/blob/master/examples/image.md
- yq documentation: Env Variable Operators, https://mikefarah.gitbook.io/yq/operators/env-variable-operators
- yq documentation: Add operator, https://mikefarah.gitbook.io/yq/operators/add
- yq documentation: Assign/Update operator, https://mikefarah.gitbook.io/yq/operators/assign-update
- GNU envsubst local help output from gettext-runtime 0.21

## Issues Found
- The Helm template used `include "myapp.labels" .`, which would fail unless the example chart also defined that helper template. Replaced it with an explicit `app` label to keep the standalone example valid.
- The yq example said "Add or update environment variable" but used `+=`, which appends a new item rather than updating an existing one. Changed the comment to "Add environment variable."
- The yq image-tag example used `env(NEW_TAG)`, which parses the environment variable as YAML. Changed it to `strenv(NEW_TAG)` so image tags are always handled as strings.
- The ConfigMap Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `selector.matchLabels` and `template.metadata.labels`.
- The comparison table said ConfigMaps require "No redeploy" while the example consumes the ConfigMap via environment variables, which require a pod restart to pick up changes. Changed this to "No manifest rebuild" and clarified the restart caveat.
- The GitLab CI Kustomize comment referred to "Method 2" even though Kustomize is Method 3 in the post. Corrected the numbering.
- The GitLab CI Kustomize image command used the shorter image syntax. Replaced it with the explicit `old=new` syntax shown in Kustomize examples to make the target image unambiguous.
- The summary said ConfigMaps and Secrets let values change at runtime without redeploying. Clarified that they avoid rebuilding manifests, but pods may need a restart depending on how the values are consumed.

## Review Notes
- The examples are general and do not pin specific Kubernetes, Helm, Kustomize, or yq versions. The reviewed commands and fields are current according to the official documentation consulted on 2026-06-20.
- `sed -i` is commonly used in Linux CI environments, but its exact syntax differs on BSD/macOS sed. This is acceptable for the CI/CD context shown, but could be mentioned in a future portability-focused revision.
