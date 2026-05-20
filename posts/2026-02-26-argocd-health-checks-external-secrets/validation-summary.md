# Validation Summary: How to Configure Health Checks for External Secrets in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD custom resource health checks
- External Secrets Operator
- Kubernetes custom resources and conditions
- Lua health check scripts
- kubectl
- PrometheusRule and PromQL

## Sources Consulted
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator ClusterExternalSecret documentation: https://external-secrets.io/latest/api/clusterexternalsecret/
- External Secrets Operator metrics documentation: https://external-secrets.io/v0.14.4/api/metrics/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post claimed it covered all External Secrets Operator resource types, but the guide focuses on common health-checkable ESO resources rather than every ESO resource. Updated the wording to avoid overstating scope.
- The ClusterExternalSecret explanation and health check treated the resource as reporting downstream secret sync health. ESO documentation says ClusterExternalSecret status reports provisioning of ExternalSecret resources, and downstream ExternalSecret sync issues must be checked on the generated ExternalSecrets. Updated the explanation and health messages.
- The ClusterExternalSecret Lua example used non-existent `status.provisionedCount` and `status.failedCount` fields. Current ESO status uses `provisionedNamespaces` and `failedNamespaces`, with conditions such as `Ready`, `PartiallyReady`, and `NotReady`. Updated the Lua health check accordingly.
- The ExternalSecret example used `apiVersion: external-secrets.io/v1beta1`. Current ESO documentation uses the stable `external-secrets.io/v1` API. Updated the manifest.
- The refresh interval section implied all ExternalSecrets refresh on a schedule. Current ESO supports refresh policies; scheduled refresh is the default `Periodic` behavior. Updated the wording.
- The Prometheus alert used `externalsecret_sync_calls_total{status="error"}`, but ESO documents `externalsecret_sync_calls_error` as the error counter. Updated the alert expression to `increase(externalsecret_sync_calls_error[5m]) > 0` and removed the unsupported `$labels.name` summary reference.

## Review Notes
The Argo CD custom health check key format, health statuses, `argocd app get --hard-refresh`, and `kubectl events --for` examples are consistent with current official documentation. The SecretStore, ClusterSecretStore, ExternalSecret, and PushSecret condition-based checks are reasonable for current ESO status conditions, though production teams may want to tune messages to their exact ESO version and provider behavior.
