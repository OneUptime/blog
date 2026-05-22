# Validation Summary: How to Handle Webhook Certificate Rotation in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes admission webhooks
- TLS certificates and CA bundles
- kubectl
- istioctl
- OpenSSL
- PrometheusRule

## Sources Consulted
- Istio Dynamic Admission Webhooks Overview: https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Istio Configuration Validation Problems: https://istio.io/latest/docs/ops/common-problems/validation/
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio pilot-discovery command reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio webhook patcher source/package documentation: https://pkg.go.dev/istio.io/istio/pkg/webhooks
- Istio self-signed CA defaults source/package documentation: https://pkg.go.dev/istio.io/istio/security/pkg/cmd
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes API reference for admissionregistration.k8s.io/v1: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/

## Issues Found
- The Prometheus alert used `pilot_webhook_cert_expiry_timestamp`, which is not listed in Istio's current exported metrics. Replaced it with an alert on `webhook_patch_failures_total`, which is emitted by Istio's webhook patcher and directly detects failures to keep webhook CA bundles updated.
- The expired-certificate troubleshooting section suggested deleting `istio-ca-secret` as a general fallback. Narrowed this to planned self-signed root rotation, because deleting the root CA secret can disrupt workload trust and is not appropriate for custom CA installations.
- The sidecar certificate check read `/var/run/secrets/istio/cert-chain.pem` from the proxy container. Current Istio sidecars commonly receive workload certificates through SDS, so this file path is not a reliable inspection method. Replaced it with `istioctl proxy-config secret deployment/my-service -n my-namespace`, which is the documented way to inspect Envoy secrets.

## Review Notes
The guide uses default webhook resource names such as `istio-sidecar-injector` and `istio-validator-istio-system`, which are valid for standard default-revision installs. Revisioned installs or Helm revision tags can use different webhook configuration names, so operators should adjust commands to their installation.
