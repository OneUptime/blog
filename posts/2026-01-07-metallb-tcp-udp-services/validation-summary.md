# Validation Summary: How to Expose TCP and UDP Services with MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB
- Kubernetes Services of type LoadBalancer
- Kubernetes TCP and UDP Service ports
- Kubernetes mixed-protocol LoadBalancer Services
- Kubernetes readiness, liveness, and startup probes
- CoreDNS health and readiness plugins
- EndpointSlices
- TCP, UDP, DNS, TURN/STUN, SIP, RTP

## Sources Consulted
- MetalLB Usage documentation: https://metallb.io/usage/
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB Troubleshooting documentation: https://metallb.io/troubleshooting/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes MixedProtocolLBService KEP issue: https://github.com/kubernetes/enhancements/issues/1435
- CoreDNS health plugin documentation: https://coredns.io/plugins/health/
- CoreDNS ready plugin documentation: https://coredns.io/plugins/ready/
- RFC 7766, DNS Transport over TCP: https://datatracker.ietf.org/doc/html/rfc7766
- RFC 9210, DNS Transport over TCP operational requirements: https://www.rfc-editor.org/rfc/rfc9210.html

## Issues Found
- Updated MetalLB annotations from the legacy `metallb.universe.tf/...` prefix to the current `metallb.io/...` prefix used by official MetalLB documentation.
- Corrected Kubernetes mixed-protocol LoadBalancer version wording. `MixedProtocolLBService` was alpha in 1.20, enabled by default in 1.24, and stable in 1.26; the post previously described it as stable in 1.24+.
- Clarified the prerequisite Kubernetes version so the stable single-Service mixed protocol examples are tied to Kubernetes 1.26+.
- Corrected the DNS TCP explanation. DNS over TCP is required for zone transfers and retrying truncated UDP responses, not every response over 512 bytes in modern EDNS-capable deployments.
- Fixed the CoreDNS readiness probe example to use `/ready` on port 8181 and retained `/health` on port 8080 for liveness, matching CoreDNS plugin defaults.
- Narrowed the MySQL session-affinity explanation. Kubernetes `ClientIP` affinity influences backend selection for new connections from the same client IP; it does not preserve state from a closed TCP connection.
- Corrected health-check wording that implied MetalLB routes directly to ready pods. Kubernetes Services and EndpointSlices determine ready endpoints; MetalLB advertises the LoadBalancer IP.
- Corrected the TURN health-check comments so a TCP probe is not presented as validation of UDP availability.
- Replaced the deprecated Endpoints troubleshooting command with an EndpointSlice query.
- Updated the MetalLB documentation link from `https://metallb.universe.tf/` to `https://metallb.io/`.

## Review Notes
- All YAML code blocks in the post were parsed successfully after edits.
- Some application images and selectors, such as `asterisk:20`, `app: coredns`, and custom DNS/TURN deployments, are illustrative and may need adjustment for a specific cluster or image registry.
- MetalLB IP sharing requires the same sharing key, compatible ports, and either `Cluster` external traffic policy or identical pod selectors; the DNS shared-IP examples satisfy the selector requirement.
