# Validation Summary: How to Migrate from Kubernetes Ingress to Istio Gateway

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes Ingress
- Istio Gateway
- Istio VirtualService
- Istio ingress gateway TLS termination
- nginx-ingress annotations
- kubectl and Helm commands
- DNS cutover and sidecar injection

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio InvalidGatewayCredential analyzer documentation: https://istio.io/latest/docs/reference/config/analysis/ist0161/
- ingress-nginx rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/

## Issues Found
- The protocol support table listed WebSocket as an Istio Gateway protocol. Istio supports WebSocket traffic over HTTP, but the documented Gateway protocol values include HTTP, HTTPS, HTTP2, GRPC, TCP, and TLS. Updated the table to use documented protocol names.
- The TLS secret copy command rewrote only the namespace field from an exported Secret manifest and could fail because exported Kubernetes objects include server-managed metadata such as resourceVersion and uid. Replaced it with commands that extract the existing TLS certificate/key data and create a new TLS Secret in the default ingress gateway namespace.
- The post stated that Istio TLS secrets must be in `istio-system`. That is true for the default ingress gateway, but the documented requirement is that the Secret exists in the same namespace as the Gateway workload. Updated the note to be precise.
- The nginx regex path example used `rewrite-target: /$2` but omitted the required `nginx.ingress.kubernetes.io/use-regex: "true"` annotation. Added the annotation.
- The Istio path rewrite example used simple prefix matches for `/api` and `/web`, which would also match paths such as `/apiary` and did not explicitly mirror nginx capture-group rewrite behavior. Updated the VirtualService to use `regex` matches and `uriRegexRewrite` with capture groups.

## Review Notes
- The Istio examples use short Kubernetes service names such as `my-app`; Istio accepts these and resolves them relative to the VirtualService namespace, though Istio documentation recommends fully qualified domain names to avoid namespace ambiguity.
- The sidecar injection section is accurate for default injection labels. In revision-based Istio installs, `istio.io/rev=<revision>` is often preferred over the legacy `istio-injection=enabled` label.
