# Validation Summary: How to Get Started with Linkerd for Service Mesh in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd (service mesh)
- Kubernetes
- mTLS / Linkerd identity
- Helm
- step CLI (certificate generation)
- SMI TrafficSplit
- Linkerd Viz (observability extension)
- Linkerd policy (Server, ServerAuthorization, AuthorizationPolicy)
- ServiceProfile (routes, retries, timeouts)
- emojivoto sample application

## Sources Consulted
- Linkerd official docs — Getting Started / Installation: https://linkerd.io/2-edge/getting-started/
- Linkerd Helm install: https://linkerd.io/2-edge/tasks/install-helm/
- Linkerd Traffic Split / Traffic Shifting: https://linkerd.io/2-edge/features/traffic-split/ and https://linkerd.io/2-edge/tasks/traffic-shifting/
- Linkerd SMI extension: https://linkerd.io/2-edge/tasks/linkerd-smi/
- Linkerd authorization policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd ServiceProfile reference: https://linkerd.io/2-edge/reference/service-profiles/
- Kubernetes `kubectl version --short` deprecation/removal (removed in v1.28): https://github.com/kubernetes/kubernetes/issues/115130 and https://kubernetes.io/docs/reference/using-api/deprecation-policy/

## Issues Found
- **`kubectl version --short` (Prerequisites section):** The `--short` flag was deprecated in Kubernetes v1.26 and removed entirely in kubectl v1.28, so this command now fails with `unknown flag: --short` on current clusters. Changed it to `kubectl version`, which already produces the same concise output by default.

All other commands and manifests were verified as correct:
- CLI install, `linkerd check --pre`, `linkerd install --crds`, `linkerd install`, and `linkerd upgrade --prune` commands are accurate.
- Helm chart names (`linkerd/linkerd-crds`, `linkerd/linkerd-control-plane`) and `--set-file` keys (`identityTrustAnchorsPEM`, `identity.issuer.tls.crtPEM`, `identity.issuer.tls.keyPEM`) are correct.
- `step certificate create` commands for root/intermediate CA are correct.
- Control-plane pod readiness counts (destination 4/4, identity 2/2, proxy-injector 2/2) match the container layout.
- API versions are correct: `linkerd.io/v1alpha2` (ServiceProfile), `split.smi-spec.io/v1alpha2` (TrafficSplit), `policy.linkerd.io/v1beta1` (Server / ServerAuthorization / AuthorizationPolicy).
- ServiceProfile structure (routes, conditions, responseClasses, retryBudget at spec level, isRetryable/timeout per route) is valid.
- AuthorizationPolicy with empty `requiredAuthenticationRefs: []` correctly denies all traffic.
- emojivoto manifest (image `docker.l5d.io/buoyantio/emojivoto-web:v11`, env vars `WEB_PORT`/`EMOJISVC_HOST`/`VOTINGSVC_HOST`) is accurate.
- `linkerd viz` subcommands (stat, tap, routes, edges, profile, dashboard) and `linkerd diagnostics proxy-metrics` are valid.

## Review Notes
- **SMI TrafficSplit is deprecated.** The `split.smi-spec.io/v1alpha2` TrafficSplit resource and the `linkerd-smi` extension are deprecated and will be removed in a future Linkerd release. In Linkerd 2.12+, TrafficSplit support is no longer built into core and requires installing the separate `linkerd-smi` extension; the recommended modern approach is dynamic request routing with the Gateway API `HTTPRoute` resource (parentRef + weighted backendRefs). The TrafficSplit example still works today with the SMI extension installed, so it was left in place, but a future revision should migrate this section to `HTTPRoute` and/or note that the `linkerd-smi` extension must be installed first.
- The comment `# Generate certificates (production: use your own CA)` above `linkerd check --pre` in the CLI install path is slightly mismatched (the command shown only runs the pre-check; the CLI auto-generates certs during `linkerd install`). Not a functional error — the CLI install does generate certificates automatically — so it was left unchanged.
- Protocol-support comparison table is broadly accurate; Linkerd also handles arbitrary TCP traffic (transparently, without L7 metrics), so "HTTP/1, HTTP/2, gRPC" understates raw TCP support, but as a feature-comparison summary it is acceptable.
