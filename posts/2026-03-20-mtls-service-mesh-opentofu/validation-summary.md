# Validation Summary: How to Configure mTLS with Service Mesh Using OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Terraform `kubernetes` provider (`kubernetes_manifest`, `kubernetes_namespace`)
- Istio service mesh (PeerAuthentication, AuthorizationPolicy)
- Linkerd service mesh (Server, ServerAuthorization)
- Mutual TLS (mTLS) concepts
- Kubernetes CRDs
- `istioctl` and `linkerd` CLIs

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security concepts (cert lifetime/rotation): https://istio.io/latest/docs/concepts/security/
- istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Linkerd authorization-policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd automatic mTLS: https://linkerd.io/2-edge/features/automatic-mtls/
- Linkerd traffic validation: https://linkerd.io/2-edge/tasks/validating-your-traffic/
- Linkerd CRD definitions in linkerd/linkerd2 repo (`charts/linkerd-crds/templates/policy/server.yaml` and `server-authorization.yaml`)

## Issues Found

1. **Removed `istioctl authn tls-check` command.** The post used `istioctl authn tls-check api-service.apps.svc.cluster.local` to verify mTLS, but this command was deprecated and removed from `istioctl` years ago (around Istio 1.5/1.6) and is not present in the current command reference. Replaced with `istioctl x describe pod <pod-name> -n apps`, which is the documented modern way to inspect a workload's mTLS / authentication policy state. Other valid alternatives include `istioctl proxy-config secret <pod>` and `istioctl analyze`.

2. **Incorrect Linkerd `ServerAuthorization` apiVersion.** The post used `policy.linkerd.io/v1beta3`, but the `ServerAuthorization` CRD only ships with versions `v1alpha1` and `v1beta1` (storage version `v1beta1`). Applying `v1beta3` would fail with `no matches for kind "ServerAuthorization" in version "policy.linkerd.io/v1beta3"`. Corrected to `policy.linkerd.io/v1beta1`. Note: the `Server` CRD does have a `v1beta3` storage version, so the `Server` resource was left unchanged.

## Review Notes
- `security.istio.io/v1beta1` for `PeerAuthentication` and `AuthorizationPolicy` is technically outdated (Istio promoted these APIs to `v1` in Istio 1.22, May 2024), but `v1beta1` is still served and continues to work as a CRD alias sharing the same schema. Left unchanged because the manifests are valid and widely deployed; future updates may want to switch to `security.istio.io/v1`.
- The cert-lifetime claim of "Default cert lifetime is 24 hours" with rotation at "80% of their lifetime" is consistent with Istio's documented default workload certificate behavior (controlled by `SECRET_GRACE_PERIOD_RATIO`). Linkerd's automatic-mTLS docs likewise state proxy certs expire after 24 hours and are auto-rotated.
- `linkerd viz edges deployment -n secure-apps` is a valid command per Linkerd's traffic-validation docs.
- The empty-spec `AuthorizationPolicy` deny-all pattern is documented as the canonical "allow-nothing" example in Istio's reference docs.
- `proxyProtocol = "HTTP/2"` is one of the valid values (`unknown`, `HTTP/1`, `HTTP/2`, `gRPC`, `opaque`, `TLS`).
- The Linkerd `kubernetes_namespace` block uses the legacy injection annotation `linkerd.io/inject = "enabled"`, which is correct.
