# Validation Summary: How to Understand Istiod Internal Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- istiod
- Envoy xDS
- Kubernetes admission webhooks
- Istio workload certificates and mTLS
- Istio debug endpoints and metrics

## Sources Consulted
- Istio: Introducing istiod: simplifying the control plane - https://istio.io/latest/blog/2020/istiod/
- Istio: Debugging Envoy and Istiod - https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio: Security concepts - https://istio.io/latest/docs/concepts/security/
- Istio: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio: Dynamic Admission Webhooks Overview - https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Istio: pilot-discovery command reference - https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio: ServiceEntry reference - https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio: Performance and Scalability - https://istio.io/latest/docs/ops/deployment/performance-and-scalability/

## Issues Found
- The post said `istioctl proxy-status` shows the config loaded by the config controller. I changed this to say it shows whether connected proxies have acknowledged the latest config, matching the Istio diagnostic documentation.
- The post described SDS as if istiod directly sends workload certificates to Envoy over the SDS connection. I corrected the flow: the Istio agent sends the CSR to istiod's CA gRPC service, receives the certificate, and Envoy retrieves the certificate and key from the local Istio agent over SDS.
- The `SYNCED` and `STALE` explanations were imprecise. I changed them to match the official meanings: `SYNCED` means Envoy acknowledged the last configuration, while `STALE` means istiod sent an update but has not received an acknowledgement.
- The metric `citadel_server_csr_sign_error_count` was incorrect. I changed it to the current exported metric name, `citadel_server_csr_sign_err_count`.
- The injection webhook section said the handler runs on port 443. I corrected this to explain that service port 443 exposes the webhook, while istiod serves injection and validation HTTPS on port 15017 by default.

## Review Notes
The post remains a practical internal-architecture guide rather than a version-specific reference. The stated 1-5 second configuration propagation time is plausible for healthy deployments, but actual convergence depends on mesh size, configuration scope, control-plane sizing, and update volume.
