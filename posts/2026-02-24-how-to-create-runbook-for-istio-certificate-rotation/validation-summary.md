# Validation Summary: How to Create Runbook for Istio Certificate Rotation

## Status
validated

## Post Type
Technical runbook / operational guide

## Technologies Covered
- Istio service mesh
- Kubernetes
- Envoy sidecar proxies
- OpenSSL
- Prometheus metrics
- mTLS certificate rotation

## Sources Consulted
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Managing In-Mesh Certificates: https://istio.io/latest/docs/ops/configuration/traffic-management/manage-mesh-certificates/
- Istio Security Problems, including `istioctl proxy-config secret` certificate inspection: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `pilot-discovery` command and metric reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio 1.20 release announcement for plugged root certificate rotation support: https://istio.io/latest/news/releases/1.20.x/announcing-1.20/
- Envoy statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics

## Issues Found
- The pre-rotation check used `istioctl proxy-config secret --all`, which is not a documented `istioctl proxy-config secret` invocation. Replaced it with `istioctl proxy-status` to verify connected proxy sync state.
- The workload certificate JSON examples selected `.dynamicActiveSecrets[0]`, which can extract the wrong secret if ordering changes. Updated the examples to select the `default` secret explicitly, matching Istio's documented debugging pattern.
- The OpenSSL CA generation examples omitted explicit CA extensions and SHA-256 signing options. Added critical `basicConstraints`, critical `keyUsage`, and `-sha256` so the generated root and intermediate certificates are valid CA certificates for this use case.
- The workload restart loops only selected namespaces labeled `istio-injection=enabled`, missing revision-based injection via `istio.io/rev`. Updated the loops to include both label styles.
- The live migration from Istio's self-signed CA to a custom CA implied a direct cutover could be zero-downtime. Added a note that live meshes must treat this as a root CA rotation with overlapping trust roots.
- The root CA rotation procedure updated istiod to the new signing CA at the same time as introducing the combined trust bundle. Split this into two phases: first distribute the combined old and new root bundle while keeping the old signing CA, then switch istiod to the new intermediate CA after proxies have synchronized.

## Review Notes
- The runbook remains version-neutral, but plugged root certificate rotation is only explicitly called out in Istio release notes starting with Istio 1.20. Older meshes should validate support and behavior before using this process.
- The commands focus on sidecar-injected workloads. Ambient mesh deployments may require additional validation steps for ztunnel certificates.
