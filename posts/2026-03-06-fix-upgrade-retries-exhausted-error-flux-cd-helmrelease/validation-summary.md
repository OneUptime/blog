# Validation Summary: How to Fix 'upgrade retries exhausted' Error in Flux CD HelmRelease

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux HelmRelease API v2
- Flux CLI
- Helm
- Kubernetes
- kubectl

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide and failure handling docs: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Helm `upgrade` command reference: https://helm.sh/docs/v3/helm/helm_upgrade/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Helm labels and annotations best practices: https://helm.sh/docs/chart_best_practices/labels/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post listed `spec.ports[*].nodePort` as a common immutable Service field. Kubernetes documents `spec.clusterIP` and `spec.clusterIPs` as fields that generally may not be changed through updates, while NodePort allocation is a different collision/range concern. Updated the immutable Service examples to `spec.clusterIP` and `spec.clusterIPs`.
- The hook cleanup command used `kubectl delete job -l "helm.sh/hook"`, but Helm hooks are identified by the `helm.sh/hook` annotation, not a Kubernetes label selector. Replaced it with explicit deletion of the failed hook Job identified during diagnosis.
- The resource adoption example described `upgrade.force: true` and `install.crds: CreateReplace` as ownership fixes. Flux documents `disableTakeOwnership` for controlling Helm ownership behavior, and CRD policy is unrelated to ordinary resource ownership. Replaced the example with `disableTakeOwnership: false` for install and upgrade.
- The manual ownership fix only added Helm release annotations. Helm-owned resources also use `app.kubernetes.io/managed-by=Helm`; added a `kubectl label` command for that metadata.
- The remediation example used invalid `spec.upgrade.retries`. Current HelmRelease v2 places remediation retry counts under `spec.upgrade.remediation.retries`; removed the top-level field and clarified the comment.
- The rollback `cleanupOnFail` comment said it kept rollback history. Flux documents this field as cleanup for new resources created during a failed rollback, so the comment was corrected.
- After retries are exhausted, Flux supports resetting failure counters with `flux reconcile helmrelease --reset`. Added this command to the suspend/fix/resume workflow for the case where the same release configuration should be retried.

## Review Notes
The post now uses valid HelmRelease v2 fields for the remediation, upgrade, install, and rollback snippets. The local environment did not have the `flux` or `helm` binaries installed, so CLI validation was performed against official command documentation instead of local `--help` output.
