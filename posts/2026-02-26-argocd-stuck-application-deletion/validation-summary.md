# Validation Summary: How to Handle Stuck Application Deletion in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Kubernetes finalizers
- Kubernetes admission webhooks
- Kubernetes RBAC
- Prometheus alerting

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD ApplicationSet Application Pruning and Resource Deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Webhook Good Practices documentation: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/

## Issues Found
- The post used `--field-selector metadata.deletionTimestamp!=''` to find terminating resources. Kubernetes field selectors only support specific fields per resource type, and unsupported fields produce an error. Changed the examples to use `kubectl ... -o json` with `jq` to filter on `.metadata.deletionTimestamp`.
- The namespace troubleshooting command `kubectl get apiservices | grep -v Available` would print most APIService rows rather than only unavailable ones. Changed it to `grep False`.
- The webhook namespace exclusion JSON patch attempted to append to `/webhooks/0/namespaceSelector/matchExpressions/-`, which fails when `namespaceSelector` or `matchExpressions` does not already exist. Changed the example to add a complete `namespaceSelector` and noted that it applies when one is not already present.
- The "Set resource deletion timeouts" example used `timeout.reconciliation`, which is not an individual resource deletion timeout. Replaced it with Argo CD's documented `PrunePropagationPolicy=background` sync option.
- The Prometheus alert used a non-existent `deletion_timestamp` label on `argocd_app_info`. Replaced it with an alert based on recent failed Kubernetes delete requests from `argocd_app_k8s_request_total`.

## Review Notes
The finalizer removal commands are technically valid but should remain last-resort operations because bypassing finalizers can orphan resources or skip controller cleanup. The recovery script still intentionally targets common namespaced resources, so clusters with custom resources may need additional resource-specific checks.
