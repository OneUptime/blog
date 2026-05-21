# Validation Summary: How to Integrate Istio with NGINX Ingress Controller

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Kubernetes
- ingress-nginx
- Helm
- Istio sidecar injection
- Istio traffic capture annotations
- Istio mTLS, PeerAuthentication, DestinationRule, and AuthorizationPolicy
- Istio Gateway

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio authentication policy documentation: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- ingress-nginx installation documentation: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx project overview and retirement notice: https://kubernetes.github.io/ingress-nginx/
- ingress-nginx Helm chart values and helpers: https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Helm install command documentation: https://docs.helm.sh/docs/helm/helm_install/

## Issues Found
- The post used the deprecated Istio `sidecar.istio.io/inject` pod annotation in Helm examples. Updated the examples to use the current pod label via `controller.podLabels."sidecar\.istio\.io/inject"`.
- The namespace injection label was applied after the Helm install. Updated the install flow to create and label the namespace before the controller pods are created.
- The Helm examples used `--set` for annotation and label string values. Updated them to `--set-string` so values such as `"true"` and comma-separated port lists remain strings.
- The inbound port example set `traffic.sidecar.istio.io/includeInboundPorts: ""`, which disables all inbound redirection rather than just excluding ports 80 and 443. Removed that annotation and kept `traffic.sidecar.istio.io/excludeInboundPorts: "80,443"`.
- The post used the obsolete `istioctl authn tls-check` command. Replaced it with `istioctl proxy-config clusters` filtered to the backend service and instructed readers to inspect the cluster output for an Istio TLS transport socket.
- The troubleshooting section claimed missing inbound-port exclusions create routing loops. Adjusted the wording to the more accurate failure modes: health checks, source IP handling, or TLS assumptions can break in some setups.

## Review Notes
- The Kubernetes Ingress API example uses `networking.k8s.io/v1`, `ingressClassName`, `pathType`, and service backends correctly.
- Istio `PeerAuthentication`, `DestinationRule`, `AuthorizationPolicy`, and `Gateway` API versions and fields are current for the reviewed Istio documentation.
- ingress-nginx is now in retirement status: best-effort maintenance continued until March 2026, and after that there are no further releases or security fixes. Existing artifacts remain available, so the tutorial can still be technically valid for existing deployments, but future posts should call out that lifecycle status.
