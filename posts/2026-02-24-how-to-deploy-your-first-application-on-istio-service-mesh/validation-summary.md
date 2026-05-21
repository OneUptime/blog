# Validation Summary: How to Deploy Your First Application on Istio Service Mesh

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio sidecar injection
- Istio Gateway, VirtualService, and DestinationRule APIs
- Istio PeerAuthentication and mTLS
- istioctl proxy inspection and analysis commands
- Kubernetes Deployments, Services, probes, labels, namespaces, and kubectl commands
- NGINX container deployment
- HashiCorp http-echo container deployment

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ingress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy documentation: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

## Issues Found
- The frontend section said the NGINX frontend calls the backend, but the manifest only deploys a default NGINX server. Changed the wording to "frontend service" so the claim matches the configuration.
- The ingress test command only read `.status.loadBalancer.ingress[0].ip`, which fails on environments that expose a load balancer by hostname. Added a hostname fallback matching Istio's ingress guidance.
- The mTLS verification command attempted to run `curl` inside the `istio-proxy` container, which is not reliable for current proxy images. Replaced it with `istioctl proxy-config secret` and clarified Istio's default automatic mTLS behavior versus PERMISSIVE server acceptance.
- The v2 DestinationRule update omitted the earlier `trafficPolicy`, which would remove the circuit-breaking configuration. Added the traffic policy back to the updated DestinationRule example.
- The v2 traffic-splitting VirtualService omitted the timeout and retry settings from the earlier VirtualService. Added them back so the final configuration still matches the wrap-up claim that retries and traffic splitting are both configured.

## Review Notes
- The Istio manifests use current `networking.istio.io/v1` and `security.istio.io/v1` APIs.
- Short service host names such as `backend-api` are valid here because the Istio resources and Services are in the same namespace, though Istio recommends fully qualified service names to avoid namespace ambiguity in larger deployments.
- The gateway selector `istio: ingressgateway` matches the default Istio installation pattern; Helm-based gateway installs may use different labels.
- The access log section is accurate because it explicitly depends on access logging being enabled.
