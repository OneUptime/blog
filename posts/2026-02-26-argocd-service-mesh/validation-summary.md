# Validation Summary: How to Configure ArgoCD with Service Mesh (Istio/Linkerd)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Istio
- Linkerd
- Service mesh mTLS
- Kubernetes ConfigMaps, Deployments, and Namespaces

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio mTLS authentication policy documentation: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Argo CD TLS configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD resource health customization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD argocd-cm example documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Linkerd automatic proxy injection documentation: https://linkerd.io/2/features/proxy-injection/
- Linkerd proxy configuration reference: https://linkerd.io/docs/reference/proxy-configuration/
- Linkerd protocol detection and opaque ports documentation: https://linkerd.io/2.15/features/protocol-detection/
- Linkerd dashboard and metrics documentation: https://linkerd.io/2.19/features/dashboard/
- Linkerd viz CLI reference: https://linkerd.io/2/reference/cli/viz/

## Issues Found
- Istio selective injection used `sidecar.istio.io/inject` as a pod annotation. Istio documents the annotation as deprecated and recommends the pod label, so the snippet now places it under `spec.template.metadata.labels`.
- Linkerd opaque port guidance configured Redis and gRPC ports on `argocd-server`. Linkerd documents opaque ports as destination-side configuration, and gRPC is detected as HTTP/2. The snippet now configures Redis port `6379` on the Redis destination workload or namespace.
- The Istio monitoring command `istioctl authn tls-check` is not present in the current Istio command reference. It was replaced with `istioctl proxy-config secret deployment/argocd-server -n argocd` to inspect proxy workload certificates, and the injection check comment was corrected.
- Linkerd metrics commands used older top-level forms (`linkerd dashboard`, `linkerd stat`, `linkerd top`). Current Linkerd documentation uses the `viz` extension commands, so these were updated to `linkerd viz dashboard`, `linkerd viz stat deploy -n argocd`, and `linkerd viz top deploy/argocd-server -n argocd`.

## Review Notes
- The Istio and Linkerd examples are intentionally partial manifests showing the relevant fields, not complete installable Deployment manifests.
- Linkerd's `config.linkerd.io/opaque-ports` value replaces the default opaque port list when set on a resource, so production users with additional server-speaks-first protocols should include all required opaque ports for that scope.
- Argo CD's TLS documentation notes that in service mesh mTLS scenarios, operators may choose to disable inter-component TLS and let sidecar proxies handle TLS. The post's broader discussion of TLS and mTLS is consistent with that caveat.
