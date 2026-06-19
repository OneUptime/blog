# Validation Summary: How to Set Up Istio Service Mesh on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Istio
- Envoy sidecars
- Istio VirtualService
- Istio DestinationRule
- Istio Gateway
- Istio PeerAuthentication and mTLS
- Kiali, Prometheus, Grafana, and Jaeger

## Sources Consulted
- Istio Getting Started: https://istio.io/latest/docs/setup/getting-started/
- Istio Install with Istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway secure ingress task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Kiali observability task: https://istio.io/latest/docs/tasks/observability/kiali/

## Issues Found
- The installation example claimed to download the latest Istio release but then changed into `istio-1.20.0`. Updated it to `istio-1.30.1`, which matches the current Istio documentation checked during review.
- The Istio networking and security examples used `networking.istio.io/v1beta1` and `security.istio.io/v1beta1`. Updated them to the current `v1` APIs used in Istio documentation.
- The pod-specific sidecar injection example used the deprecated `sidecar.istio.io/inject` annotation. Moved it to a pod template label, which is the current documented approach.
- The VirtualService header route appeared after the `/api` prefix route, making canary header matches ineffective for `/api` requests. Reordered the header match before the prefix match.
- The Gateway TLS comment did not clarify where the referenced secret belongs when using the default ingress gateway. Updated the comment to indicate the TLS secret should be in the ingress gateway namespace.
- The mesh-wide mTLS example implied that `istio-system` always applies to all namespaces. Clarified that this applies cluster-wide when `istio-system` is the Istio root namespace.
- The observability addon URLs were pinned to `release-1.20`. Updated them to `release-1.30` and verified the referenced raw GitHub URLs return HTTP 200.
- The sidecar resource best-practice item called request-only annotations "limits". Updated it to show both request and limit annotations.
- The best-practice item for skipping injection said to use annotations. Updated it to use labels, matching current sidecar injection controls.

## Review Notes
- The examples use short Kubernetes service names such as `api-server`. Istio supports this, but the official DestinationRule reference recommends fully qualified service names to avoid namespace-related misconfiguration in larger deployments.
- The addon manifests are suitable for evaluation and demos; production observability deployments usually require more deliberate installation and retention choices.
