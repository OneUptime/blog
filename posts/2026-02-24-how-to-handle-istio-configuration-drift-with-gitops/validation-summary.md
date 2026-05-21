# Validation Summary: How to Handle Istio Configuration Drift with GitOps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- kubectl
- Kustomize
- Argo CD
- Argo CD Notifications
- Flux CD
- Kubernetes RBAC
- Kubernetes validating admission webhooks

## Sources Consulted
- Kubernetes kubectl diff reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/auto_sync/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Slack notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux reconcile kustomization command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The manual drift detection example compared `kubectl kustomize` output directly with `kubectl get ... -o yaml` output. That produces incompatible YAML because live objects include runtime metadata and list formatting. Replaced it with `kubectl diff -k`, which is the supported command for comparing live state with a Kustomize directory.
- The targeted `kubectl diff` example used `-f` with a Kustomize overlay path. Changed it to `-k`, which is the supported flag for a kustomization directory.
- The Argo CD notification example used the built-in-looking `trigger.on-sync-status-unknown` name while checking for `OutOfSync`, and placed a Slack channel under `service.slack`. Renamed the trigger to `on-drift-detected` and added a global subscription for `slack:istio-drift-alerts`, matching Argo CD notification subscription semantics.
- The Flux Alert example used `apiVersion: notification.toolkit.fluxcd.io/v1` and `eventSeverity: warning`. Current Flux notification examples and API documentation use `v1beta3`, and supported event severity values are `info` and `error`. Updated the snippet to `v1beta3` and `eventSeverity: info`.
- The orphaned-resource loop only checked one namespace named after the environment. Changed it to use `-A` so it can detect orphaned Istio resources across namespaces, consistent with the post's drift-detection scope.
- The CronJob used `bitnami/kubectl:latest` while the script also requires `bash`, `yq`, `curl`, and the drift-check script itself. Replaced it with a placeholder custom image name so the example does not imply the stock kubectl image is sufficient.
- The `ValidatingWebhookConfiguration` example omitted required `admissionregistration.k8s.io/v1` fields. Added `apiVersions`, `sideEffects`, and `admissionReviewVersions`.

## Review Notes
The examples remain illustrative and still assume the reader supplies real Argo CD Applications, Flux Providers, webhook server implementation, RBAC bindings, secrets, and a drift-check container image containing the script and required tools.
