# Validation Summary: How to Debug Comparison Result Issues in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Kustomize
- Jsonnet
- jq
- Prometheus metrics

## Sources Consulted
- Argo CD command reference for `argocd app diff`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD command reference for `argocd app manifests`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD diff strategies documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_tracking/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD command parameter ConfigMap documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Helm values documentation: https://helm.sh/docs/v3/intro/using_helm/
- RFC 6901 JSON Pointer specification: https://datatracker.ietf.org/doc/html/rfc6901

## Issues Found
- Corrected the normalization example from an invalid `replicas` integer-to-string scenario to the documented Kubernetes quantity formatting case (`cpu: 100m` versus `cpu: 0.1`) used by Argo CD diff customization guidance.
- Corrected controller log commands to use `statefulset/argocd-application-controller`, matching current Argo CD installs where the application controller is a StatefulSet.
- Replaced a fragile container command patch for debug logging with the documented `argocd-cmd-params-cm` setting `controller.log.level` plus a StatefulSet rollout restart.
- Adjusted the Kustomize patch failure description so it does not imply every unmatched patch creates an empty diff.
- Replaced the generic environment variable array-ordering example with the documented HPA `spec.metrics` reordering case.
- Changed the performance advice for server-side diff so it is framed around admission/defaulting-aware comparison rather than a general speed improvement for large applications.

## Review Notes
The post is technically relevant and most CLI examples align with current Argo CD documentation. Local `argocd` and `kubectl` binaries were not installed in the review environment, so command behavior was verified against official command references instead of local `--help` output.
