# Validation Summary: How to Fix Istiod Not Starting or Crashing

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Istiod
- Kubernetes
- kubectl
- istioctl
- IstioOperator
- Kubernetes admission webhooks
- Kubernetes RBAC and Lease API

## Sources Consulted
- Istio IstioOperator options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio installation customization: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio plug in CA certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio dynamic admission webhooks overview: https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes Leases documentation: https://kubernetes.io/docs/concepts/architecture/leases/

## Issues Found
- The command for listing keys in the custom CA `cacerts` secret piped Kubernetes JSONPath map output into `jq`, which is not valid JSON. Changed it to request full JSON output and use `jq -r '.data | keys[]'`.
- The leader-election RBAC check said to verify create and update access but only checked create access. It also used the unqualified `leases` resource name. Changed it to check both `create` and `update` on `leases.coordination.k8s.io`, matching the Kubernetes Lease API group used for leader election.

## Review Notes
- The post does not pin an Istio version. The reviewed commands and configuration fields are valid against current Istio and Kubernetes documentation as of 2026-05-21.
- Directly deleting webhook configurations is potentially disruptive in revisioned or multi-control-plane Istio installations, but the post frames it as a stale-webhook recovery action rather than routine maintenance.
