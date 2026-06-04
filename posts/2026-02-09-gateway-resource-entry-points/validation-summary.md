# Validation Summary: How to implement Gateway resource for defining entry points

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Gateway API
- Gateway, GatewayClass, HTTPRoute, GRPCRoute, TCPRoute, UDPRoute, TLSRoute
- Gateway listeners, TLS termination, TLS passthrough, allowedRoutes, ReferenceGrant
- NGINX Gateway Fabric
- AWS Load Balancer Controller service annotations
- kubectl

## Sources Consulted
- Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Gateway API ReferenceGrant documentation: https://gateway-api.sigs.k8s.io/reference/api-types/referencegrant/
- Gateway API traffic matching documentation: https://gateway-api.sigs.k8s.io/docs/concepts/traffic-matching/
- Gateway API hostname documentation: https://gateway-api.sigs.k8s.io/docs/concepts/hostnames/
- Gateway API TLS guide: https://gateway-api.sigs.k8s.io/guides/tls/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- NGINX Gateway Fabric deploy data plane documentation: https://docs.nginx.com/nginx-gateway-fabric/install/deploy-data-plane/
- NGINX Gateway Fabric data plane configuration documentation: https://docs.nginx.com/nginx-gateway-fabric/how-to/data-plane-configuration/
- NGINX Gateway Fabric Gateway API compatibility documentation: https://docs.nginx.com/nginx-gateway-fabric/overview/gateway-api-compatibility/
- AWS Load Balancer Controller service annotations documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/

## Issues Found
- The post said the Gateway itself provisions a load balancer. Updated this to clarify that the Gateway controller provisions the underlying data plane, such as a load balancer or proxy.
- The cross-namespace Gateway example used ReferenceGrant to allow HTTPRoutes in another namespace to attach to a Gateway. Gateway API handles cross-namespace Route-to-Gateway attachment through listener `allowedRoutes`; ReferenceGrant is for other cross-namespace object references. Removed the incorrect ReferenceGrant manifest and updated the explanation.
- Gateway examples placed cloud Service annotations under `metadata.annotations`. Updated them to `spec.infrastructure.annotations`, which is the Gateway API field intended for annotations that should be applied to generated infrastructure resources when supported by the controller.
- The AWS load balancer example used deprecated individual access-log and cross-zone annotations. Replaced them with the current `service.beta.kubernetes.io/aws-load-balancer-attributes` format.
- The static IP section implied support was guaranteed by the load balancer provider. Updated the explanation to note that `spec.addresses` is a request whose support depends on the Gateway implementation and environment.
- The scaling example used non-standard `nginx.org/*` annotations and claimed traffic-based autoscaling. Replaced it with the NGINX Gateway Fabric `spec.infrastructure.parametersRef` pattern referencing an `NginxProxy` resource with a supported replica setting.
- The best-practices note said ReferenceGrants enable cross-namespace access generally. Updated it to specify cross-namespace object references such as backend Services or certificate Secrets.

## Review Notes
The examples remain controller-dependent where they configure infrastructure, cloud load balancer behavior, TCPRoute, UDPRoute, or static addresses. The post now calls out these implementation-specific areas, but a future improvement could identify the exact Gateway controller and supported Gateway API version used for all examples.
