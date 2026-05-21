# Validation Summary: How to Handle LoadBalancer Services with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services and LoadBalancer Services
- Istio Gateway, VirtualService, IstioOperator, and ingress gateways
- Envoy X-Forwarded-For and PROXY protocol handling
- AWS Network Load Balancer annotations
- GKE internal LoadBalancer annotations
- Azure LoadBalancer annotations

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes external LoadBalancer and source IP documentation: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Istio gateway network topology documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio ingress authorization and source IP documentation: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio AuthorizationPolicy conditions: https://istio.io/latest/docs/reference/config/security/conditions/
- IstioOperator options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Amazon EKS Network Load Balancer documentation: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- GKE LoadBalancer Service documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Azure AKS LoadBalancer annotations documentation: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- Envoy X-Forwarded-For documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers

## Issues Found
- Updated the general LoadBalancer explanation to avoid implying that every cloud load balancer routes directly to pods. Kubernetes LoadBalancer behavior can target nodes or pod IPs depending on the provider and controller.
- Replaced older AWS NLB examples using `aws-load-balancer-type: "nlb"` with current AWS Load Balancer Controller examples using `aws-load-balancer-type: "external"` and `aws-load-balancer-nlb-target-type: "instance"`.
- Replaced the deprecated AWS cross-zone load balancing annotation with `aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"`.
- Replaced the deprecated AWS internal load balancer annotation in the IstioOperator example with `aws-load-balancer-scheme: "internal"`.
- Corrected IstioOperator gateway Service annotations from `k8s.service.annotations` to `k8s.serviceAnnotations`.
- Replaced EnvoyFilter-based PROXY protocol configuration with Istio's documented `meshConfig.defaultConfig.gatewayTopology.proxyProtocol` configuration.
- Replaced EnvoyFilter-based XFF configuration with Istio's documented `meshConfig.defaultConfig.gatewayTopology.numTrustedProxies` configuration.
- Clarified that `X-Forwarded-For` only applies when an HTTP-aware load balancer or reverse proxy appends that header.
- Clarified Istio authorization policy source IP matching by distinguishing `ipBlocks` from `remoteIpBlocks`.
- Added the AWS NLB `aws-load-balancer-healthcheck-protocol: "HTTP"` annotation so the health check path annotation is meaningful.

## Review Notes
The guide is technically relevant and the overall recommendation to expose the Istio ingress gateway with a LoadBalancer Service remains sound. The exact load balancer annotations remain provider-controller-specific, so readers should still confirm their cloud controller version before applying production manifests.
