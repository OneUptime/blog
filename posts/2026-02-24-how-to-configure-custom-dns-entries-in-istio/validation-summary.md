# Validation Summary: How to Configure Custom DNS Entries in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio DNS proxying
- Istio DestinationRule
- Istio VirtualService
- Kubernetes Deployments
- kubectl and istioctl CLI commands

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DNS proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio Understanding DNS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio 1.25 change notes for DNS auto-allocation deprecation/default behavior: https://istio.io/latest/news/releases/1.25.x/announcing-1.25/change-notes/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Istio proxy-config diagnostic documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/

## Issues Found
- The Istio manifests used the older `networking.istio.io/v1alpha3` API version. Updated the examples to `networking.istio.io/v1`, which is the current API version used in the official Istio documentation.
- The static ServiceEntry examples implied that endpoint addresses alone are DNS answers. Added `spec.addresses` where the article describes a hostname resolving to a configured address, because Istio DNS proxy resolves ServiceEntry addresses directly and otherwise relies on auto-allocated virtual IPs for entries without explicit addresses.
- The DNS proxy annotation example included `ISTIO_META_DNS_AUTO_ALLOCATE`, which is deprecated in current Istio in favor of newer status-based auto-allocation. Removed that proxy metadata entry and updated the text to describe current auto-allocation behavior.
- The alias example used a bare hostname, `database`, which can be ambiguous with Kubernetes DNS search behavior. Updated it to `database.internal.company.com` while preserving the example's intent.
- The wildcard section said Istio cannot pre-resolve wildcard hostnames as an absolute statement. Adjusted the wording to keep the `resolution: NONE` explanation accurate and mention current `DYNAMIC_DNS` support for wildcard HTTP/TLS cases where the original host is available from Host or SNI.

## Review Notes
The verification commands are syntactically valid, but the `nslookup` command assumes the application image includes DNS troubleshooting tools. In minimal production images, reviewers may need to use a debug container or a separate test workload.
