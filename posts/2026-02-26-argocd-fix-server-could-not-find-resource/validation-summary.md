# Validation Summary: How to Fix 'the server could not find the requested resource' in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Kubernetes Custom Resource Definitions
- Kubernetes API deprecations
- Kubernetes RBAC
- Kubernetes aggregated API servers

## Sources Consulted
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl reference for api-resources and api-versions: https://kubernetes.io/docs/reference/kubectl/generated/
- Kubernetes Custom Resources documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/
- Kubernetes API Aggregation Layer documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD cluster management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/

## Issues Found
- The Argo CD `Application` examples did not include `spec.destination`, so they were not complete enough to work as Application manifests. Added destination server and namespace fields to both examples.
- The post said `autoscaling/v2beta1` HorizontalPodAutoscaler was removed in Kubernetes 1.26. Kubernetes removed `autoscaling/v2beta1` in 1.25 and `autoscaling/v2beta2` in 1.26, so the list was corrected.
- The post used `kubectl version --short`, but current kubectl reference documentation no longer lists the `--short` flag. Changed the command to `kubectl version`.
- The post described `argocd app get --hard-refresh` as refreshing Argo CD's cluster API cache. Official command documentation says hard refresh refreshes application data and the target manifests cache, so the wording was corrected and the controller restart command was kept for suspected stale cluster API cache cases.

## Review Notes
- The RBAC section is useful as an adjacent diagnostic, but Kubernetes authorization failures usually produce forbidden errors rather than the exact not-found API-resource error. The post already frames this as a similar-looking case rather than the primary cause.
