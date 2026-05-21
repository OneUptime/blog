# Validation Summary: How to Rotate Certificates Automatically in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy SDS
- X.509 certificates
- mTLS
- Prometheus
- OpenSSL
- jq

## Sources Consulted
- Istio security concepts: https://istio.io/latest/docs/concepts/security/
- Istio `istioctl proxy-config secret` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio security troubleshooting certificate inspection example: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio plug-in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio `pilot-discovery` environment variables and metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio agent certificate TTL and rotation grace period source: https://github.com/istio/istio/blob/master/pilot/cmd/pilot-agent/options/options.go
- Istio secret cache rotation timing source: https://github.com/istio/istio/blob/master/security/pkg/nodeagent/cache/secretcache.go
- Istio self-signed CA root rotation source: https://github.com/istio/istio/blob/master/security/pkg/pki/ca/selfsignedcarootcertrotator.go

## Issues Found
- The post said workload certificates rotate at about 80% of their lifetime. Current Istio agent defaults use `SECRET_GRACE_PERIOD_RATIO=0.5` with jitter, so I changed the timeline and diagram to show rotation at about 12 hours for a 24-hour certificate.
- The post said the workload rotation grace period was hardcoded and could only be influenced by changing certificate TTL. Istio exposes `SECRET_GRACE_PERIOD_RATIO`, so I updated the explanation and example.
- The post said a 1-hour workload certificate rotates at about 48 minutes. With the current default 0.5 grace period ratio, it rotates after about 30 minutes, plus or minus jitter. I corrected that statement.
- The self-signed root CA example used `CITADEL_SELF_SIGNED_CA_CERT_TTL: "8760h"`, while Istio's documented current default is `87600h0m0s`. I updated the example to `87600h`.
- The automatic self-signed root CA rotation explanation described distributing both old and new root CAs as the normal self-signed rotation behavior. Istio's self-signed root rotator refreshes the root certificate from the existing root key and updates the CA secret, key/cert bundle, and distributed root certificate. I rewrote that sequence and kept overlapping trust bundle guidance for external root transitions.
- The test command changed only `DEFAULT_WORKLOAD_CERT_TTL` on istiod. The Istio agent requests `SECRET_TTL` by default, so changing only the istiod default does not force sidecars to request shorter certificates. I replaced it with a workload annotation that sets `SECRET_TTL` and restarts the workload.

## Review Notes
The Prometheus metrics referenced in the post are present in the Istio `pilot-discovery` metrics reference. The manual external CA rotation section is directionally correct for a root transition, but production environments should also account for Istio version behavior around automatic `cacerts` reload and should test the transition in a staging mesh before applying it broadly.
