# Validation Summary: How to Migrate from API Gateway to Istio Ingress

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Istio Gateway, VirtualService, EnvoyFilter, RequestAuthentication, and AuthorizationPolicy
- Kubernetes Ingress and kubectl
- NGINX Ingress Controller annotations
- Kong Ingress Controller annotations and plugins
- Ambassador / Emissary Mapping resources
- Helm uninstall commands
- curl `--resolve`

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio secure ingress task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio Envoy rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kong Ingress Controller annotation reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Kong IngressClass / GatewayClass documentation: https://developer.konghq.com/kubernetes-ingress-controller/class-annotations/
- Emissary-ingress retry policy documentation: https://www.getambassador.io/docs/emissary/latest/topics/using/retries
- Emissary-ingress timeout documentation: https://www.getambassador.io/docs/emissary/latest/topics/using/timeouts

## Issues Found
- The Istio Gateway, VirtualService, RequestAuthentication, and AuthorizationPolicy examples used older `v1beta1` API versions. Updated them to the current stable `networking.istio.io/v1` and `security.istio.io/v1` versions used in current Istio documentation.
- The NGINX and Kong Ingress examples omitted `spec.ingressClassName`. Added `nginx` and `kong` respectively so the examples are explicit for clusters that do not configure a default IngressClass.
- The Kong example used the deprecated `KongIngress` resource for `strip_path` and protocols. Replaced it with current Kong Ingress Controller annotations, `konghq.com/strip-path` and `konghq.com/protocols`, while keeping the plugin annotation.
- The TLS secret copy command changed only the namespace with `sed`, which can carry Kubernetes-generated metadata such as `resourceVersion`, `uid`, and `managedFields` into the target namespace. Updated the example to recreate the TLS secret from its certificate and key data with `kubectl create secret tls --dry-run=client -o yaml` before applying it.
- The first NGINX example included `rewrite-target` and `proxy-body-size` annotations even though the adjacent Istio "equivalent" did not model those behaviors. Removed them from that initial one-to-one routing example; URL rewriting remains covered later in the post.
- The post said Istio can handle API key checking and similar gateway functions without qualification. Clarified that some plugin-style behavior uses Envoy extensions or external authorization rather than only core Gateway and VirtualService fields.
- The Kong inventory command still focused on `KongIngress`, which is deprecated in current Kong Ingress Controller docs. Updated it to include current policy/plugin resources such as `KongClusterPlugin` and `KongUpstreamPolicy`.

## Review Notes
The EnvoyFilter local rate limiting example matches Istio's documented pattern, but EnvoyFilter patches expose Envoy internals and can require review during Istio or Envoy upgrades. The post correctly notes that gateway-specific plugin ecosystems do not map one-to-one to Istio resources.
