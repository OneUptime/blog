# Validation Summary: How to Configure Certificate Rotation Intervals in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio workload certificates and mTLS
- IstioOperator configuration
- Kubernetes `kubectl`
- Prometheus and PromQL
- OpenSSL

## Sources Consulted
- Istio Security FAQ: https://istio.io/latest/about/faq/security/
- Istio `pilot-agent` command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio `pilot-discovery` command reference and exported metrics: https://preliminary.istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio 1.24 change notes: https://istio.io/latest/news/releases/1.24.x/announcing-1.24/change-notes/
- Istio Plug in CA Certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio source constants for workload certificate TTL defaults: https://raw.githubusercontent.com/istio/istio/master/security/pkg/cmd/constants.go
- Istio source certificate rotation scheduling logic: https://raw.githubusercontent.com/istio/istio/master/security/pkg/nodeagent/cache/secretcache.go

## Issues Found
- The post described the default certificate rotation point as 80% of the certificate lifetime. Current Istio documents `SECRET_GRACE_PERIOD_RATIO` as defaulting to `0.5`, with `SECRET_GRACE_PERIOD_RATIO_JITTER` defaulting to `0.01`, so a 24-hour certificate is renewed around 12 hours with jitter. Updated the default behavior, timeline, and grace-period explanation.
- The post said lowering `SECRET_GRACE_PERIOD_RATIO` gives more buffer time. Istio schedules rotation when the configured grace period remains before expiry, so increasing the ratio gives more retry buffer. Updated that explanation.
- Added a note that current Istio releases already apply small default jitter when discussing staggered rotations for scale.

## Review Notes
The `DEFAULT_WORKLOAD_CERT_TTL`, `MAX_WORKLOAD_CERT_TTL`, `SECRET_TTL`, `SECRET_GRACE_PERIOD_RATIO`, `SECRET_GRACE_PERIOD_RATIO_JITTER`, `citadel_server_*` Prometheus metrics, `istioctl proxy-config` commands, and `cacerts` secret file names were checked against Istio documentation and source. The `citadel_server_*` metric names remain current despite the historical Citadel naming.
