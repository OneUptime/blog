# Validation Summary: How to Use istioctl proxy-config secret for Debugging

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- Istio
- istioctl
- Envoy Secret Discovery Service (SDS)
- Kubernetes
- mTLS certificates
- SPIFFE workload identities
- OpenSSL
- Bash
- Python JSON/base64 parsing

## Sources Consulted
- Istio command reference for `istioctl proxy-config secret`, output formats, and `rootca-compare`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio security troubleshooting guide for `istioctl proxy-config secret` output and certificate decoding: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio debugging guide for verifying connectivity to istiod on port 15014 and proxy admin usage: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio `pilot-agent` command reference for `pilot-agent request` behavior and default Envoy admin port: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio certificate management and CA documentation: https://istio.io/latest/docs/tasks/security/cert-management/ and https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Security FAQ for default Kubernetes workload certificate lifetime: https://istio.io/latest/about/faq/security/

## Issues Found
- The istiod connectivity check used `https://istiod.istio-system.svc:15012/debug/endpointz`. Port 15012 is the TLS XDS/gRPC port; Istio's documented simple connectivity check uses the HTTP debug/monitoring port 15014. Changed the example to `curl -sS istiod.istio-system:15014/version`.
- The pilot-agent health check used `pilot-agent request GET /healthz/ready`, but `pilot-agent request` defaults to the Envoy admin port 15000 while readiness is served on port 15021. Changed the example to `curl -sS localhost:15021/healthz/ready`.
- The root CA mismatch section compared only the first 50 base64 characters of each root CA, which is an unreliable manual shortcut. Replaced it with the documented `istioctl proxy-config rootca-compare` command.
- The post claimed `pilot-agent request POST /debug/force_disconnect` could force SDS refresh. I could not verify this as a supported `pilot-agent` or Envoy admin endpoint in the official command reference, so I replaced it with a note that there is no supported `pilot-agent` command to force only SDS certificate refresh.

## Review Notes
The core `istioctl proxy-config secret` usage, output columns, JSON `dynamicActiveSecrets` decoding path, SPIFFE SAN explanation, and default 24-hour Kubernetes workload certificate lifetime were consistent with Istio documentation. The `rootca-compare` command is documented by Istio, but the command reference notes it is under active development.
