# Validation Summary: How to Learn from Common Istio Migration Mistakes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- IstioOperator
- PeerAuthentication and mTLS
- Kubernetes Service port protocol selection
- Istio canary upgrades and revision labels
- Prometheus, Grafana, and Kiali add-ons
- ServiceEntry
- VirtualService traffic mirroring

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio application requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio canary upgrade documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio 1.30 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/

## Issues Found
- The protocol-selection explanation said unnamed ports are always treated as opaque TCP. Current Istio can automatically detect HTTP and HTTP/2 traffic, while unsupported or ambiguous traffic falls back to TCP. Updated the text to mention automatic detection and the Kubernetes `appProtocol` field.
- The canary upgrade example used `istioctl install --set revision=canary --set tag=canary`. Current Istio canary upgrade documentation installs a revision with `istioctl install --set revision=canary`; revision tags are managed separately with `istioctl tag set`. Updated the command.
- The canary upgrade example labeled a namespace with `istio.io/rev=canary` without removing the earlier `istio-injection` label. Istio documents that `istio-injection` takes precedence over `istio.io/rev`, so the namespace migration command now removes `istio-injection` while adding `istio.io/rev=canary`.
- The command for finding pods without sidecars only selected pods with exactly one container, which would miss multi-container pods that still lacked `istio-proxy`. Updated it to check for the injected sidecar container name directly.
- The namespace injection-status command only displayed `istio-injection`, even though the post also uses revision-based injection. Updated it to display both `istio-injection` and `istio.io/rev`.
- The observability add-on URLs used the older `release-1.24` branch. Updated them to `release-1.30`, matching the current Istio release on the review date, and verified the Prometheus, Grafana, and Kiali raw URLs return HTTP 200.

## Review Notes
The add-on manifests are official Istio samples and are intended for quick starts or demos rather than hardened production monitoring. The post's resource numbers are reasonable planning examples, but actual sidecar requests and limits should be based on workload traffic and measured proxy usage.
