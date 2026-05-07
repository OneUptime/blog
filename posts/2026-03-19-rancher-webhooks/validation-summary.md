# Validation Summary: How to Configure Rancher Webhooks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Webhook
- Kubernetes admission webhooks
- Kubernetes RBAC
- Pod Security Admission
- Prometheus Alertmanager
- Prometheus Operator (`PrometheusRule`)
- Go

## Sources Consulted
- Rancher Webhook docs: https://ranchermanager.docs.rancher.com/reference-guides/rancher-webhook
- Rancher Webhook hardening docs: https://ranchermanager.docs.rancher.com/reference-guides/rancher-security/rancher-webhook-hardening
- Rancher v3 API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher webhook source README: https://github.com/rancher/webhook
- Rancher webhook resource validation docs: https://github.com/rancher/webhook/blob/main/docs.md
- Rancher Manager source for managed webhook chart/config behavior: https://github.com/rancher/rancher
- Prometheus Alertmanager configuration docs: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator alerting docs: https://prometheus-operator.dev/docs/developer/alerting/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl scale` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- Kubernetes RBAC docs: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod Security namespace labels docs: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/

## Issues Found
- The post treated `rancher-webhook` as a generic event receiver and used unsupported `/v3/projects/.../receivers` and `scaleService` examples. I replaced that material with an external webhook pattern driven by Alertmanager because current Rancher docs and source document `rancher-webhook` as an admission webhook, not a project-level scaling receiver API.
- The Helm reinstall/upgrade command for `rancher-webhook` was misleading. I replaced it with Rancher's documented `rancher-config` customization flow, which is how Rancher manages webhook Helm values.
- The Alertmanager example had an undefined routing target and used legacy `match` syntax. I corrected it to a valid receiver definition with `matchers`, targeting the custom webhook service.
- The custom webhook deployment manifest would not work as written because it referenced a missing ServiceAccount and lacked RBAC permissions for `kubectl scale`. I added a `ServiceAccount`, `Role`, and `RoleBinding`, and clarified that the container image must include `kubectl`.
- The admission policy section incorrectly claimed Rancher would block a `ClusterRoleBinding` example directly through `rancher-webhook`. I replaced it with a documented namespace Pod Security Admission label example that Rancher webhook validates.
- The troubleshooting section attempted to curl a nonexistent Rancher `/hooks/...` endpoint. I replaced it with checks that match the documented admission-webhook deployment model: webhook service, endpoints, and webhook configuration objects.

## Review Notes
- The Alertmanager example assumes the route is dedicated to scaling alerts. In a shared Alertmanager configuration, the routing tree may need to be merged into existing routes carefully.
- The `PrometheusRule` manifest is structurally correct, but whether it is picked up depends on the Prometheus instance's rule selectors in that Rancher Monitoring deployment.
- The corrected Go example is technically valid for a tutorial, but a `client-go` implementation would be a more production-grade approach than shelling out to `kubectl`.
