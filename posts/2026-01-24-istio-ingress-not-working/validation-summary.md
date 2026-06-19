# Validation Summary: How to Fix 'Istio Ingress' Not Working

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio DestinationRule
- Istio ingress gateway / Envoy
- Kubernetes Services, Pods, Secrets, Endpoints
- kubectl
- istioctl
- OpenSSL TLS testing

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Ingress Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The traffic-flow explanation implied that all ingress traffic always passes through a destination sidecar proxy. Istio ingress can route to workloads with or without sidecar injection, so the diagram and numbered list now say the sidecar hop applies only when the destination workload is sidecar-injected.
- The wildcard-host mismatch comment said the VirtualService wildcard "does not match exactly." Istio allows exact or suffix matches based on the Gateway host configuration, so the comment now states the actual issue: `*.example.com` is broader than a Gateway host of `myapp.example.com`.
- The TLS `credentialName` comment was too absolute about the secret namespace. It now says the referenced secret must be available to the selected gateway workload, and notes that the default ingress gateway usually uses `istio-system`.
- The complete example put the Gateway in the application namespace while selecting the default ingress gateway and referencing a TLS credential. To avoid namespace ambiguity and gateway selector scoping caveats, the Gateway is now in `istio-system` and the VirtualService references it as `istio-system/myapp-gateway`.

## Review Notes
The examples use `networking.istio.io/v1beta1`, which remains commonly supported, but Istio's current documentation now shows `networking.istio.io/v1` for these resources. A future refresh could update all examples to `v1` once the blog's target Istio version is defined.
