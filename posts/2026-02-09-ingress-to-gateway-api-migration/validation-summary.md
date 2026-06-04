# Validation Summary: How to Migrate Kubernetes Ingress Resources to Gateway API HTTPRoute Resources

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes Gateway API
- Kubernetes Ingress
- GatewayClass, Gateway, and HTTPRoute resources
- NGINX Gateway Fabric
- Istio
- kubectl
- jq
- AWS Route 53

## Sources Consulted
- Kubernetes Gateway API concepts: https://kubernetes.io/docs/concepts/services-networking/gateway/
- Gateway API API overview: https://gateway-api.sigs.k8s.io/concepts/api-overview/
- Gateway API HTTPRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/httproute/
- Gateway API HTTP redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/
- Gateway API project repository and release status: https://github.com/kubernetes-sigs/gateway-api
- NGINX Gateway Fabric Helm install guide: https://docs.nginx.com/nginx-gateway-fabric/install/helm/
- NGINX Gateway Fabric CLI reference: https://docs.nginx.com/nginx-gateway-fabric/reference/cli-help/
- kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post claimed Gateway API CRDs are built into Kubernetes 1.29+. Upstream Kubernetes documents Gateway API as an add-on defined by CRDs, so I replaced that statement with installation guidance.
- The Gateway API CRD install command used the older v1.0.0 bundle. I updated it to the current v1.5.1 standard install URL and used server-side apply.
- The NGINX Gateway Fabric install example used an outdated raw manifest URL. I replaced it with the official Helm OCI install command from the NGINX documentation.
- The NGINX Gateway Fabric GatewayClass used `nginx.org/gateway-controller`. NGINX documents the controller domain as `gateway.nginx.org`, so I changed it to `gateway.nginx.org/gateway-controller`.
- The Gateway manifest referenced the `gateway-system` namespace without creating it. I added a Namespace resource.
- The TLS Secret example used placeholder base64 data that would not apply as valid Kubernetes Secret data. I replaced it with a `kubectl create secret tls` command.
- The Ingress-to-HTTPRoute example included NGINX-specific annotations that were not converted in the HTTPRoute. I removed the annotations from the source example and added a note that annotations need separate mapping to filters or implementation-specific policies.
- The migration script always emitted `hostnames:` even when no host was present and always converted paths to `PathPrefix`. I changed it to omit `hostnames` when empty and preserve `Exact` path matches.
- The migration script did not clarify its numeric Service port limitation. I updated the surrounding text to state that limitation.
- The DNS cutover example assumed the Gateway address was always an IP. I changed the variable name and added a note that hostname addresses require a CNAME or provider-specific alias.
- The advanced routing section described request/response modification but only showed request modification. I changed the wording to match the example.

## Review Notes
Gateway API feature support still varies by implementation and conformance profile. The examples use valid Gateway API shapes, but production migrations should also review controller-specific support for extended filters such as URLRewrite and any replacement for existing Ingress controller annotations.
