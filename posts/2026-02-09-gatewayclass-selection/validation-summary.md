# Validation Summary: How to configure GatewayClass for selecting gateway implementation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes Gateway API
- GatewayClass
- Gateway
- Kubernetes RBAC
- Kubernetes ValidatingAdmissionPolicy
- NGINX Gateway Fabric
- Envoy Gateway
- Istio Gateway API support
- AWS Network Load Balancer Service annotations

## Sources Consulted
- Gateway API GatewayClass reference: https://gateway-api.sigs.k8s.io/reference/api-types/gatewayclass/
- Gateway API v1 specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Validating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- NGINX Gateway Fabric Gateway API compatibility: https://docs.nginx.com/nginx-gateway-fabric/overview/gateway-api-compatibility/
- NGINX Gateway Fabric API reference: https://docs.nginx.com/nginx-gateway-fabric/reference/api/
- NGINX Gateway Fabric data plane configuration: https://docs.nginx.com/nginx-gateway-fabric/how-to/data-plane-configuration/
- Envoy Gateway GatewayClass documentation: https://gateway.envoyproxy.io/latest/api/gateway_api/gatewayclass/
- Envoy Gateway EnvoyProxy customization documentation: https://gateway.envoyproxy.io/latest/tasks/operations/customize-envoyproxy/
- Istio Kubernetes Gateway API documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- AWS Load Balancer Controller Service annotation documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/

## Issues Found
- The NGINX GatewayClass examples used `nginx.org/nginx-gateway-controller`; updated them to the documented NGINX Gateway Fabric controller name `gateway.nginx.org/nginx-gateway-controller`.
- The Istio `IstioGatewayConfig` example used a CRD and API group that are not part of Istio's documented Gateway API customization flow. Replaced it with an Envoy Gateway `EnvoyProxy` `parametersRef` example using documented fields.
- The NGINX examples used `NginxGatewayConfig` and unsupported `service`, `defaults`, timeout, buffer, and rate limit fields. Replaced them with the documented `gateway.nginx.org/v1alpha2` `NginxProxy` resource and supported fields such as `kubernetes.service`, `patches`, `workerConnections`, `logging`, and deployment replicas.
- The Envoy resource example used `EnvoyGatewayConfig` and the wrong controller name. Replaced it with `EnvoyProxy`, `gateway.envoyproxy.io/gatewayclass-controller`, and the documented `envoyDeployment.container.resources` structure.
- The RBAC example used a `use` verb for `gatewayclasses`, which Gateway API does not enforce for `spec.gatewayClassName`. Replaced it with RBAC for management and visibility plus a `ValidatingAdmissionPolicy` and binding to enforce allowed GatewayClass references.
- The AWS NLB annotations used older or unsupported values for the current AWS Load Balancer Controller guidance. Updated the example to use `aws-load-balancer-type: external`, `aws-load-balancer-nlb-target-type: instance`, and `aws-load-balancer-scheme: internet-facing`.
- The migration explanation implied guaranteed old-controller cleanup. Updated it to state that cleanup behavior is implementation-specific and should be tested before production migration.

## Review Notes
Some GatewayClass parameter behavior is implementation-specific. The corrected examples now use documented resources, but operators should still verify exact supported fields against the installed controller version and CRDs.
