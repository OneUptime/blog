# Validation Summary: How to Set Up Auto mTLS in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Auto mTLS
- PeerAuthentication
- DestinationRule
- IstioOperator and MeshConfig
- Kubernetes kubectl
- Envoy / pilot-agent stats
- Prometheus metrics

## Sources Consulted
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio MeshConfig reference for enableAutoMtls: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The original explanation implied the source sidecar checks with istiod at connection time. Updated it to state that istiod pushes proxy configuration with the appropriate TLS settings, and that the decision is made from service, endpoint, and workload metadata.
- The `pilot-agent request` examples used `GET /stats`. Updated them to the documented `GET stats` form.
- The no-sidecar test labeled the Deployment object after creation, which does not reliably control pod injection. Updated the commands to patch `spec.template.metadata.labels.sidecar.istio.io/inject` and wait for the rollout.
- The command for adding a sidecar similarly labeled the Deployment object rather than the pod template. Updated it to patch the pod template label and wait for rollout completion.
- The headless service caveat was too broad. Reworded it to focus on service registry bypass and undeclared service ports, which are the cases where auto mTLS can fail to apply as expected.
- The Prometheus examples mixed source and destination reports and assumed `connection_security_policy="none"`. Updated the queries to use `reporter="destination"` consistently and match non-mTLS traffic with `connection_security_policy!="mutual_tls"`.
- Added a caveat that SSL counters may need to be enabled before `ssl.handshake` appears in Envoy stats, because Istio records a reduced set of proxy statistics by default.

## Review Notes
The post is technically relevant and valid after the corrections. The IstioOperator check may not return a resource in installations managed only by Helm or raw manifests, but the command is still valid for IstioOperator-managed installations.
